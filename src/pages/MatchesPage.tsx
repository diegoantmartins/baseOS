import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  Pause,
  CheckCircle,
  Volleyball,
  Search,
  FileText,
  Pencil,
  ListChecks,
  ClipboardList,
  Trophy,
  PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dataAccess } from '@/services/dataAccess';
import { generateMatchesBoletimPdf, downloadReportsPdf } from '@/lib/pdf/reportsPdf';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';
import { cn } from '@/lib/utils';

const PHASE_OPTIONS = [
  { value: 'classificatória', label: 'Classificatória' },
  { value: 'quartas', label: 'Quartas de Final' },
  { value: 'semifinal', label: 'Semifinal' },
  { value: 'final', label: 'Final' },
] as const;

interface Match {
  id: string;
  record: MatchRecord;
  teamA: { name: string; shortName: string; logoUrl?: string; score?: number };
  teamB: { name: string; shortName: string; logoUrl?: string; score?: number };
  date: string;
  time: string;
  venue: string;
  court?: string;
  modality: 'indoor' | 'beach';
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
  competition: string;
  phase?: string;
  groupName?: string;
  sets?: { a: number; b: number }[];
}

function toLocalMatch(match: MatchRecord, competition: CompetitionRecord | null, teamById: Map<string, TeamRecord>): Match {
  const scoreA = match.sets.filter(s => s.scoreA > s.scoreB).length;
  const scoreB = match.sets.filter(s => s.scoreB > s.scoreA).length;
  const hasResult = match.status === 'completed' && match.sets.length > 0;
  const teamA = teamById.get(match.teamAId);
  const teamB = teamById.get(match.teamBId);
  return {
    id: match.id,
    record: match,
    teamA: {
      name: match.teamAName,
      shortName: match.teamAShortName,
      logoUrl: teamA?.logoUrl,
      score: hasResult ? scoreA : undefined,
    },
    teamB: {
      name: match.teamBName,
      shortName: match.teamBShortName,
      logoUrl: teamB?.logoUrl,
      score: hasResult ? scoreB : undefined,
    },
    date: match.scheduledTime,
    time: new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    venue: match.venue,
    court: match.court,
    modality: competition?.modality ?? 'indoor',
    status: (match.status === 'completed' ? 'completed' : match.status === 'scheduled' ? 'scheduled' : 'live') as Match['status'],
    competition: competition?.name ?? match.competitionId,
    phase: match.phase,
    groupName: match.groupName,
    sets: match.sets.map(s => ({ a: s.scoreA, b: s.scoreB })),
  };
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const MatchesPage = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const [sheetMatch, setSheetMatch] = useState<Match | null>(null);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);

  const refresh = useCallback(async () => {
    const [records, competitions, teams] = await Promise.all([
      dataAccess.listMatches(),
      dataAccess.listCompetitions(),
      dataAccess.listTeams(),
    ]);
    const teamById = new Map(teams.map(t => [t.id, t]));
    const compById = new Map(competitions.map(c => [c.id, c]));
    setCompetitions(competitions);
    setMatches(records.map(record => toLocalMatch(record, compById.get(record.competitionId) ?? null, teamById)));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const groupOptions = useMemo(() => {
    const groups = new Set(matches.map(m => m.groupName).filter(Boolean) as string[]);
    return [...groups].sort();
  }, [matches]);

  const filteredMatches = matches.filter(match => {
    if (filter !== 'all' && match.status !== filter) return false;
    if (phaseFilter !== 'all' && match.phase !== phaseFilter) return false;
    if (groupFilter !== 'all' && match.groupName !== groupFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const haystack = `${match.teamA.name} ${match.teamB.name} ${match.venue} ${match.competition} ${match.phase ?? ''} ${match.groupName ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const liveCount = matches.filter(m => m.status === 'live').length;
  const todayCount = matches.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
  const scheduledCount = matches.filter(m => m.status === 'scheduled').length;

  const handleEditSaved = async (updates: Partial<MatchRecord>) => {
    if (!editMatch) return;
    await dataAccess.updateMatch(editMatch.id, updates);
    toast.success('Partida atualizada!');
    setEditMatch(null);
    await refresh();
  };

  const handleResultSaved = async (updates: Partial<MatchRecord>) => {
    if (!resultMatch) return;
    await dataAccess.updateMatch(resultMatch.id, updates);
    toast.success('Resultado lançado! Classificação atualizada.');
    setResultMatch(null);
    await refresh();
  };

  const handleBoletim = () => {
    const rows = filteredMatches.map(m => ({
      matchNumber: m.record.matchNumber,
      round: m.record.round,
      phase: m.phase,
      groupName: m.groupName,
      date: new Date(m.date).toLocaleDateString('pt-BR'),
      time: m.time,
      venue: m.venue,
      court: m.court,
      teamAName: m.teamA.name,
      teamBName: m.teamB.name,
      scoreA: m.status === 'completed' ? m.teamA.score : undefined,
      scoreB: m.status === 'completed' ? m.teamB.score : undefined,
      statusLabel: m.status === 'completed' ? 'Finalizado' : m.status === 'live' ? 'Ao vivo' : m.status === 'postponed' ? 'Adiado' : 'Agendado',
    }));
    const doc = generateMatchesBoletimPdf(rows, 'Boletim de Jogos');
    downloadReportsPdf(doc, `boletim_jogos_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Boletim de jogos gerado!');
  };

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Jogos</h1>
            <p className="text-muted-foreground mt-1">Gerencie partidas, fases, grupos e resultados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleBoletim}>
              <ClipboardList className="w-4 h-4" />
              Boletim de Jogos
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Play className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{liveCount}</p>
                <p className="text-sm text-muted-foreground">Ao Vivo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{todayCount}</p>
                <p className="text-sm text-muted-foreground">Hoje</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{scheduledCount}</p>
                <p className="text-sm text-muted-foreground">Agendados</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar jogos, equipes, locais..." className="pl-10" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={(v: typeof filter) => setFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="live">Ao Vivo</SelectItem>
              <SelectItem value="scheduled">Agendados</SelectItem>
              <SelectItem value="completed">Finalizados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {PHASE_OPTIONS.map(phase => (
                <SelectItem key={phase.value} value={phase.value}>
                  {phase.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groupOptions.map(group => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Matches List */}
        <motion.div variants={item} className="space-y-4">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              {filteredMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onOpenSheet={() => setSheetMatch(match)}
                  onEdit={() => setEditMatch(match)}
                  onResult={() => setResultMatch(match)}
                  onEditDocument={() => navigate(`/documentos/editar/${match.id}`)}
                />
              ))}
              {filteredMatches.length === 0 && (
                <Card className="card-elevated">
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Nenhum jogo encontrado com os filtros selecionados.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </motion.div>

      <EditMatchDialog match={editMatch} onOpenChange={open => { if (!open) setEditMatch(null); }} onSaved={handleEditSaved} />
      <ResultMatchDialog match={resultMatch} onOpenChange={open => { if (!open) setResultMatch(null); }} onSaved={handleResultSaved} />
      <MatchSheetEmitDialog
        match={sheetMatch?.record ?? null}
        competition={sheetMatch ? competitions.find(c => c.id === sheetMatch.record.competitionId) ?? null : null}
        open={sheetMatch !== null}
        onOpenChange={open => { if (!open) setSheetMatch(null); }}
      />
    </MainLayout>
  );
};

function TeamBadge({ shortName, name, logoUrl, score, winner }: { shortName: string; name: string; logoUrl?: string; score?: number; winner?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={`Escudo ${name}`} className="w-12 h-12 rounded-xl object-contain bg-muted p-1" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-bold text-foreground">
            {shortName}
          </div>
        )}
        <span className={cn('font-semibold text-lg', winner && 'text-success')}>{name}</span>
      </div>
      {score !== undefined && (
        <span className={cn('text-3xl font-display font-bold', winner ? 'text-success' : 'text-foreground')}>
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match, onOpenSheet, onEdit, onResult, onEditDocument }: { match: Match; onOpenSheet: () => void; onEdit: () => void; onResult: () => void; onEditDocument: () => void }) {
  const statusConfig = {
    live: { label: 'AO VIVO', variant: 'destructive' as const, icon: Play },
    scheduled: { label: 'AGENDADO', variant: 'secondary' as const, icon: Clock },
    completed: { label: 'FINALIZADO', variant: 'outline' as const, icon: CheckCircle },
    postponed: { label: 'ADIADO', variant: 'secondary' as const, icon: Pause },
  };

  const status = statusConfig[match.status];
  const teamAWin = match.status === 'completed' && (match.teamA.score ?? 0) > (match.teamB.score ?? 0);
  const teamBWin = match.status === 'completed' && (match.teamB.score ?? 0) > (match.teamA.score ?? 0);

  return (
    <Card className="card-elevated hover:shadow-lg transition-all">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Left: Match Info */}
          <div className="flex-1 p-6">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="p-2 rounded-lg bg-indoor text-indoor-foreground">
                <Volleyball className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{match.competition}</span>
              {match.phase && (
                <Badge variant="outline">
                  <Trophy className="w-3 h-3 mr-1" />
                  {match.phase}
                </Badge>
              )}
              {match.groupName && <Badge variant="secondary">{match.groupName}</Badge>}
              <Badge variant={status.variant} className="gap-1">
                <status.icon className="w-3 h-3" />
                {status.label}
              </Badge>
            </div>

            {/* Teams */}
            <div className="space-y-4">
              <TeamBadge shortName={match.teamA.shortName} name={match.teamA.name} logoUrl={match.teamA.logoUrl} score={match.teamA.score} winner={teamAWin} />
              <TeamBadge shortName={match.teamB.shortName} name={match.teamB.name} logoUrl={match.teamB.logoUrl} score={match.teamB.score} winner={teamBWin} />
            </div>

            {/* Sets */}
            {match.sets && match.sets.length > 0 && (
              <div className="mt-4 flex gap-2">
                {match.sets.map((set, idx) => (
                  <div key={idx} className="px-3 py-1.5 rounded-lg bg-muted text-sm">
                    <span className={cn(set.a > set.b ? 'font-bold text-success' : 'text-muted-foreground')}>{set.a}</span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className={cn(set.b > set.a ? 'font-bold text-success' : 'text-muted-foreground')}>{set.b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Date/Venue + Actions */}
          <div className="w-full md:w-72 p-6 bg-muted/30 border-t md:border-t-0 md:border-l border-border flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{new Date(match.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{match.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">
                {match.venue}
                {match.court ? ` - ${match.court}` : ''}
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={onOpenSheet}>
                <FileText className="w-4 h-4" />
                Súmula do Jogo
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={onEditDocument}>
                <PenLine className="w-4 h-4" />
                Editor de Documentos
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
                  <Pencil className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  variant={match.status === 'completed' ? 'outline' : 'accent'}
                  size="sm"
                  className="gap-2"
                  onClick={onResult}
                  disabled={match.status === 'completed'}
                >
                  <ListChecks className="w-4 h-4" />
                  Resultado
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Modal de edição rápida da partida
// ============================================================================

function EditMatchDialog({
  match,
  onOpenChange,
  onSaved,
}: {
  match: Match | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updates: Partial<MatchRecord>) => Promise<void>;
}) {
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [court, setCourt] = useState('');
  const [phase, setPhase] = useState('');
  const [groupName, setGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (match) {
      const d = new Date(match.record.scheduledTime);
      setDate(d.toISOString().slice(0, 10));
      setTime(d.toTimeString().slice(0, 5));
      setVenue(match.record.venue ?? '');
      setCourt(match.record.court ?? '');
      setPhase(match.record.phase ?? '');
      setGroupName(match.record.groupName ?? '');
      dataAccess.listVenues().then(setVenues);
    }
  }, [match]);

  const venueCourts = venues.find(v => v.name === venue)?.courts ?? [];

  const handleSave = async () => {
    if (!match || saving) return;
    setSaving(true);
    try {
      const scheduledTime = date && time ? new Date(`${date}T${time}:00`).toISOString() : match.record.scheduledTime;
      await onSaved({
        scheduledTime,
        venue,
        court: court || undefined,
        phase: phase || undefined,
        groupName: groupName || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={match !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Partida</DialogTitle>
          <DialogDescription>
            {match ? `${match.teamA.name} vs ${match.teamB.name}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input id="edit-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Horário</Label>
              <Input id="edit-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Local</Label>
              <Select value={venue} onValueChange={v => { setVenue(v); setCourt(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(v => (
                    <SelectItem key={v.id} value={v.name}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quadra</Label>
              <Select value={court} onValueChange={setCourt}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a quadra" />
                </SelectTrigger>
                <SelectContent>
                  {(venueCourts.length > 0 ? venueCourts : [court]).map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  {venueCourts.length === 0 && <SelectItem value="Quadra Principal">Quadra Principal</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger>
                  <SelectValue placeholder="Fase do jogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classificatória">Classificatória</SelectItem>
                  <SelectItem value="quartas">Quartas de Final</SelectItem>
                  <SelectItem value="semifinal">Semifinal</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group">Grupo/Chave</Label>
              <Input
                id="edit-group"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Ex.: Grupo A"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="accent" disabled={saving} onClick={handleSave}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Modal de lançamento de resultado (parciais dos sets)
// ============================================================================

function ResultMatchDialog({
  match,
  onOpenChange,
  onSaved,
}: {
  match: Match | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updates: Partial<MatchRecord>) => Promise<void>;
}) {
  const [setScores, setSetScores] = useState<{ a: string; b: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const maxSets = 5;

  useEffect(() => {
    if (match) {
      const existing = match.record.sets.map(s => ({ a: String(s.scoreA), b: String(s.scoreB) }));
      setSetScores([...existing, ...Array.from({ length: maxSets - existing.length }, () => ({ a: '', b: '' }))].slice(0, maxSets));
    }
  }, [match]);

  if (!match) return null;

  const filledSets = setScores.filter(s => s.a !== '' && s.b !== '').map((s, idx) => ({
    setNumber: idx + 1,
    scoreA: Number(s.a),
    scoreB: Number(s.b),
  }));
  const setsWonA = filledSets.filter(s => s.scoreA > s.scoreB).length;
  const setsWonB = filledSets.filter(s => s.scoreB > s.scoreA).length;

  const handleSave = async (closeMatch: boolean) => {
    if (saving) return;
    if (filledSets.length === 0) {
      toast.error('Informe ao menos uma parcial de set.');
      return;
    }
    setSaving(true);
    try {
      const winnerId = setsWonA !== setsWonB ? (setsWonA > setsWonB ? match.record.teamAId : match.record.teamBId) : undefined;
      await onSaved({
        sets: filledSets,
        status: closeMatch ? 'completed' : match.record.status === 'scheduled' ? 'in-progress' : match.record.status,
        winnerId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Resultado</DialogTitle>
          <DialogDescription>
            {match.teamA.name} vs {match.teamB.name} — digite as parciais de cada set.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3 px-1 text-sm font-semibold text-muted-foreground">
            <span className="flex-1 truncate">{match.teamA.shortName}</span>
            <span className="w-16 text-center">SET</span>
            <span className="flex-1 text-right truncate">{match.teamB.shortName}</span>
          </div>
          {setScores.map((set, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={50}
                placeholder="--"
                className="flex-1 text-center"
                value={set.a}
                onChange={e => setSetScores(prev => prev.map((s, i) => (i === idx ? { ...s, a: e.target.value } : s)))}
                aria-label={`Pontos ${match.teamA.shortName} no set ${idx + 1}`}
              />
              <span className="w-16 text-center text-sm font-bold bg-muted py-2 rounded-lg">Set {idx + 1}</span>
              <Input
                type="number"
                min={0}
                max={50}
                placeholder="--"
                className="flex-1 text-center"
                value={set.b}
                onChange={e => setSetScores(prev => prev.map((s, i) => (i === idx ? { ...s, b: e.target.value } : s)))}
                aria-label={`Pontos ${match.teamB.shortName} no set ${idx + 1}`}
              />
            </div>
          ))}
          {filledSets.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              Parciais lançadas: <strong>{setsWonA} x {setsWonB}</strong>{' '}
              {setsWonA !== setsWonB && (
                <span>
                  — vencedor: <strong>{setsWonA > setsWonB ? match.teamA.name : match.teamB.name}</strong>
                </span>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" disabled={saving || filledSets.length === 0} onClick={() => handleSave(false)}>
            Salvar Parciais
          </Button>
          <Button variant="accent" disabled={saving || filledSets.length === 0} onClick={() => handleSave(true)}>
            {saving ? 'Salvando...' : 'Fechar Partida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MatchesPage;