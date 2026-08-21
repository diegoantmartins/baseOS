import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  CheckCircle,
  Volleyball,
  Search,
  FileText,
  Pencil,
  ListChecks,
  ClipboardList,
  Trophy,
  PenLine,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Filter,
  Plus,
  GitBranch,
  Dices,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dataAccess } from '@/services/dataAccess';
import { generateMatchesBoletimPdf, downloadReportsPdf } from '@/lib/pdf/reportsPdf';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import { BlankSheetEmitDialog } from '@/components/match/BlankSheetEmitDialog';
import { detectScheduleConflicts, type ScheduleConflict } from '@/services/scheduleConflictService';
import { validateMatchResult, DEFAULT_INDOOR_CONFIG, DEFAULT_BEACH_CONFIG } from '@/services/matchValidationService';
import { advancePlayoffMatches } from '@/services/playoffsService';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';
import { cn } from '@/lib/utils';

export type MatchesSubTab = 'todos' | 'grupos' | 'mata-mata' | 'agenda' | 'sumulas' | 'resultados';

interface MatchView {
  id: string;
  record: MatchRecord;
  teamA: { name: string; shortName: string; logoUrl?: string; score?: number };
  teamB: { name: string; shortName: string; logoUrl?: string; score?: number };
  date: string;
  time: string;
  venue: string;
  court?: string;
  modality: 'indoor' | 'beach';
  status: MatchRecord['status'];
  competition: string;
  phase?: string;
  groupName?: string;
  sets?: { a: number; b: number }[];
}

function toMatchView(match: MatchRecord, competition: CompetitionRecord | null, teamById: Map<string, TeamRecord>): MatchView {
  const scoreA = match.sets.filter(s => s.scoreA > s.scoreB).length;
  const scoreB = match.sets.filter(s => s.scoreB > s.scoreA).length;
  const hasResult = (match.status === 'completed' || match.status === 'homologated') && match.sets.length > 0;
  const teamA = teamById.get(match.teamAId);
  const teamB = teamById.get(match.teamBId);

  return {
    id: match.id,
    record: match,
    teamA: {
      name: match.teamAName,
      shortName: match.teamAShortName || match.teamAName.substring(0, 3).toUpperCase(),
      logoUrl: teamA?.logoUrl,
      score: hasResult ? scoreA : undefined,
    },
    teamB: {
      name: match.teamBName,
      shortName: match.teamBShortName || match.teamBName.substring(0, 3).toUpperCase(),
      logoUrl: teamB?.logoUrl,
      score: hasResult ? scoreB : undefined,
    },
    date: match.scheduledTime,
    time: new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    venue: match.venue,
    court: match.court,
    modality: competition?.modality ?? 'indoor',
    status: match.status,
    competition: competition?.name ?? match.competitionId,
    phase: match.phase,
    groupName: match.groupName,
    sets: match.sets.map(s => ({ a: s.scoreA, b: s.scoreB })),
  };
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export default function MatchesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-tabs navigation
  const [activeSubTab, setActiveSubTab] = useState<MatchesSubTab>('todos');
  const [query, setQuery] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialogs
  const [sheetMatch, setSheetMatch] = useState<MatchView | null>(null);
  const [blankSheetOpen, setBlankSheetOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<MatchRecord | null>(null);
  const [resultMatch, setResultMatch] = useState<MatchRecord | null>(null);

  const refresh = useCallback(async () => {
    const [rawMatches, rawComps, rawTeams, rawVenues] = await Promise.all([
      dataAccess.listMatches(),
      dataAccess.listCompetitions(),
      dataAccess.listTeams(),
      dataAccess.listVenues(),
    ]);
    setMatches(rawMatches);
    setCompetitions(rawComps);
    setTeams(rawTeams);
    setVenues(rawVenues);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const teamById = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const compById = useMemo(() => new Map(competitions.map(c => [c.id, c])), [competitions]);

  const matchViews = useMemo(() => {
    return matches.map(m => toMatchView(m, compById.get(m.competitionId) ?? null, teamById));
  }, [matches, compById, teamById]);

  // Filtered matches based on sub-tab and filters
  const filteredMatches = useMemo(() => {
    return matchViews.filter(m => {
      // Sub-tab constraints
      if (activeSubTab === 'grupos' && m.phase !== 'group-stage' && m.phase !== 'classificatória') return false;
      if (activeSubTab === 'mata-mata' && (m.phase === 'group-stage' || m.phase === 'classificatória')) return false;
      if (activeSubTab === 'sumulas' && (m.status === 'awaiting_schedule' || !m.court)) return false;
      if (activeSubTab === 'resultados' && m.status !== 'completed' && m.status !== 'homologated') return false;

      // Dropdown filters
      if (competitionFilter !== 'all' && m.record.competitionId !== competitionFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      // Text query
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${m.teamA.name} ${m.teamB.name} ${m.venue} ${m.court || ''} ${m.competition} ${m.phase || ''} ${m.groupName || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [matchViews, activeSubTab, competitionFilter, statusFilter, query]);

  // Homologar resultado
  const handleHomologate = async (matchId: string) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    await dataAccess.updateMatch(matchId, {
      status: 'homologated',
      homologatedAt: new Date().toISOString(),
    });

    // Auto-advance playoff brackets if it's an elimination match
    const compMatches = matches.map(m => (m.id === matchId ? { ...m, status: 'homologated' as const } : m));
    const advanceResult = advancePlayoffMatches(compMatches, teams);
    if (advanceResult.changed) {
      for (const updated of advanceResult.updatedMatches) {
        if (updated.id !== matchId) {
          await dataAccess.updateMatch(updated.id, {
            teamAId: updated.teamAId,
            teamBId: updated.teamBId,
            teamAName: updated.teamAName,
            teamBName: updated.teamBName,
            teamAShortName: updated.teamAShortName,
            teamBShortName: updated.teamBShortName,
          });
        }
      }
      toast.success('Resultado homologado e chaveamento atualizado automaticamente!');
    } else {
      toast.success('Resultado homologado com sucesso!');
    }

    // Register audit log
    await dataAccess.addAuditLog({
      user: 'Gestor',
      action: 'Homologação de Resultado',
      note: `Jogo #${targetMatch.matchNumber} homologado com sucesso`,
    });

    await refresh();
  };

  const handleExportBoletim = () => {
    const compName = competitionFilter !== 'all' ? compById.get(competitionFilter)?.name : 'VolleyPro';
    const rows = filteredMatches.map(m => {
      const setsA = m.record.sets.filter(s => s.scoreA > s.scoreB).length;
      const setsB = m.record.sets.filter(s => s.scoreB > s.scoreA).length;
      return {
        matchNumber: m.record.matchNumber,
        round: m.record.round,
        phase: m.record.phase,
        groupName: m.record.groupName,
        date: m.record.scheduledTime,
        time: new Date(m.record.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        venue: m.record.venue,
        court: m.record.court,
        teamAName: m.teamA.name,
        teamBName: m.teamB.name,
        scoreA: m.record.status === 'completed' || m.record.status === 'homologated' ? setsA : undefined,
        scoreB: m.record.status === 'completed' || m.record.status === 'homologated' ? setsB : undefined,
        statusLabel:
          m.record.status === 'homologated' ? 'Homologado' : m.record.status === 'completed' ? 'Finalizado' : 'Agendado',
      };
    });
    const doc = generateMatchesBoletimPdf(rows, compName || 'Boletim Geral');
    downloadReportsPdf(doc, 'boletim_confrontos.pdf');
    toast.success('Boletim de jogos gerado com sucesso!');
  };

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header Title & Actions */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
              <Calendar className="w-8 h-8 text-primary" />
              Central de Jogos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Escalação de confrontos, prevenção de conflitos de quadra, lançamento de parciais e homologação oficial.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
            <Button variant="outline" size="sm" onClick={() => setBlankSheetOpen(true)} className="gap-1.5 text-xs">
              <FileSpreadsheet className="w-4 h-4" />
              Súmula em Branco
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportBoletim} className="gap-1.5 text-xs">
              <FileText className="w-4 h-4" />
              Gerar Boletim
            </Button>
            <Button variant="accent" size="sm" onClick={() => navigate('/jogos/novo')} className="gap-1.5 text-xs">
              <Plus className="w-4 h-4" />
              Novo Confronto
            </Button>
          </div>
        </motion.div>

        {/* Sub-Tabs Navigation (Seção 30) */}
        <motion.div variants={item} className="border-b border-border flex items-center gap-1 overflow-x-auto scrollbar-none pb-px">
          {[
            { id: 'todos', label: 'Todos os Jogos', icon: Calendar },
            { id: 'grupos', label: 'Fase de Grupos', icon: Trophy },
            { id: 'mata-mata', label: 'Mata-mata', icon: GitBranch },
            { id: 'agenda', label: 'Agenda & Horários', icon: Clock },
            { id: 'sumulas', label: 'Súmulas Oficiais', icon: ClipboardList },
            { id: 'resultados', label: 'Resultados & Homologação', icon: CheckCircle2 },
          ].map(tab => {
            const active = activeSubTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as MatchesSubTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                  active
                    ? 'border-primary text-primary font-semibold bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-primary' : 'text-muted-foreground')} />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Filters Bar */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por equipe, ginásio, quadra, competição..."
              className="pl-9"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Competição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Competições</SelectItem>
                {competitions.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="awaiting_schedule">Sem Horário</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="in-progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Realizados</SelectItem>
                <SelectItem value="homologated">Homologados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Matches List Grid */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : filteredMatches.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Nenhum confronto encontrado para a seleção atual.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatches.map(m => {
              const isFinished = m.status === 'completed' || m.status === 'homologated';
              const isHomologated = m.status === 'homologated';

              return (
                <motion.div key={m.id} variants={item}>
                  <Card className="card-elevated hover:border-primary/40 transition-all flex flex-col justify-between h-full">
                    <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">Jogo #{m.record.matchNumber}</span>
                          <span>·</span>
                          <span className="truncate max-w-[120px]">{m.competition}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {m.phase && <Badge variant="outline" className="text-[10px] capitalize">{m.phase}</Badge>}
                          {isHomologated ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Homologado
                            </Badge>
                          ) : isFinished ? (
                            <Badge variant="secondary" className="text-[10px]">Realizado</Badge>
                          ) : m.status === 'in-progress' ? (
                            <Badge variant="default" className="text-[10px] bg-amber-500">Em Jogo</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Agendado</Badge>
                          )}
                        </div>
                      </div>

                      {/* Teams and Result Bar */}
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between gap-2">
                        {/* Team A */}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          {m.teamA.logoUrl ? (
                            <img src={m.teamA.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {m.teamA.shortName.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold text-sm text-foreground truncate">{m.teamA.name}</span>
                        </div>

                        {/* Score Display */}
                        <div className="px-3 py-1 rounded-lg bg-card border border-border/70 text-center shrink-0">
                          {isFinished ? (
                            <div className="text-base font-display font-extrabold text-foreground tracking-tight">
                              {m.teamA.score} <span className="text-muted-foreground text-xs">x</span> {m.teamB.score}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">VS</span>
                          )}
                        </div>

                        {/* Team B */}
                        <div className="flex-1 flex items-center justify-end gap-2 min-w-0 text-right">
                          <span className="font-bold text-sm text-foreground truncate">{m.teamB.name}</span>
                          {m.teamB.logoUrl ? (
                            <img src={m.teamB.logoUrl} alt="" className="w-7 h-7 rounded-full object-contain shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {m.teamB.shortName.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sets Parciais */}
                      {isFinished && m.sets && m.sets.length > 0 && (
                        <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-muted-foreground">
                          {m.sets.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-muted/60 font-mono font-medium">
                              {s.a}-{s.b}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardHeader>

                    {/* Footer Info & Actions */}
                    <CardContent className="px-4 sm:px-5 pb-4 pt-0 border-t border-border/50 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{m.venue} {m.court ? `· ${m.court}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{new Date(m.date).toLocaleDateString('pt-BR')} às {m.time}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => setSheetMatch(m)}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Súmula
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => setEditMatch(m.record)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Agendar
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold"
                          onClick={() => setResultMatch(m.record)}
                        >
                          <PenLine className="w-3.5 h-3.5 mr-1 text-primary" />
                          Placar
                        </Button>

                        {isFinished && !isHomologated && (
                          <Button
                            variant="accent"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleHomologate(m.id)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Homologar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Modal Edição & Prevenção de Conflitos de Agenda */}
      {editMatch && (
        <ScheduleMatchDialog
          match={editMatch}
          competition={compById.get(editMatch.competitionId) || null}
          allMatches={matches}
          venues={venues}
          onClose={() => setEditMatch(null)}
          onSaved={async (updates) => {
            await dataAccess.updateMatch(editMatch.id, updates);
            toast.success('Agendamento salvo com sucesso!');
            setEditMatch(null);
            await refresh();
          }}
        />
      )}

      {/* Modal Lançamento de Placar e Validação Matemática */}
      {resultMatch && (
        <ResultValidationDialog
          match={resultMatch}
          competition={compById.get(resultMatch.competitionId) || null}
          onClose={() => setResultMatch(null)}
          onSaved={async (sets, winnerId) => {
            await dataAccess.updateMatch(resultMatch.id, {
              sets,
              winnerId,
              status: 'completed',
            });
            toast.success('Resultado lançado com sucesso! Partida aguardando homologação.');
            setResultMatch(null);
            await refresh();
          }}
        />
      )}

      {/* Modal Emissão de Súmula e Ordem de Saque da Partida */}
      {sheetMatch && (
        <MatchSheetEmitDialog
          open={sheetMatch !== null}
          onOpenChange={(open) => !open && setSheetMatch(null)}
          match={sheetMatch.record}
          competition={compById.get(sheetMatch.record.competitionId) || null}
        />
      )}

      {/* Modal Emissão de Súmula em Branco Padrão */}
      <BlankSheetEmitDialog
        open={blankSheetOpen}
        onOpenChange={setBlankSheetOpen}
      />
    </MainLayout>
  );
}

// ============================================================================
// Modal de Agendamento com Verificação de Conflitos
// ============================================================================

interface ScheduleMatchDialogProps {
  match: MatchRecord;
  competition: CompetitionRecord | null;
  allMatches: MatchRecord[];
  venues: VenueRecord[];
  onClose: () => void;
  onSaved: (updates: Partial<MatchRecord>) => Promise<void>;
}

function ScheduleMatchDialog({ match, competition, allMatches, venues, onClose, onSaved }: ScheduleMatchDialogProps) {
  const [date, setDate] = useState(match.scheduledTime ? match.scheduledTime.split('T')[0] : '');
  const [time, setTime] = useState(
    match.scheduledTime ? new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
  );
  const [venue, setVenue] = useState(match.venue || venues[0]?.name || '');
  const [court, setCourt] = useState(match.court || '');
  const [phase, setPhase] = useState(match.phase || 'classificatória');
  const [groupName, setGroupName] = useState(match.groupName || '');
  const [saving, setSaving] = useState(false);

  const selectedVenueObj = venues.find(v => v.name === venue);
  const availableCourts = selectedVenueObj?.courts || [];

  // Live conflict detection
  const conflicts = useMemo(() => {
    if (!date || !time || !venue || !court || !competition) return [];
    const isoDateTime = `${date}T${time}:00`;
    return detectScheduleConflicts({
      matchId: match.id,
      scheduledTime: isoDateTime,
      venueName: venue,
      courtName: court,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      competition,
      allMatches,
      venues,
    });
  }, [date, time, venue, court, match, competition, allMatches, venues]);

  const hasBlockingError = conflicts.some(c => c.severity === 'error');

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const scheduledTime = date && time ? new Date(`${date}T${time}:00`).toISOString() : match.scheduledTime;
      await onSaved({
        scheduledTime,
        venue,
        court: court || undefined,
        phase: phase || undefined,
        groupName: groupName || undefined,
        status: court ? 'scheduled' : 'awaiting_schedule',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Confronto</DialogTitle>
          <DialogDescription>
            {match.teamAName} vs {match.teamBName} (Jogo #{match.matchNumber})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sched-date">Data da Partida</Label>
              <Input id="sched-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-time">Horário</Label>
              <Input id="sched-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ginásio / Local</Label>
              <Select value={venue} onValueChange={v => { setVenue(v); setCourt(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(v => (
                    <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quadra</Label>
              <Select value={court} onValueChange={setCourt}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a quadra" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourts.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  {availableCourts.length === 0 && <SelectItem value="Quadra Principal">Quadra Principal</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conflict Alerts Display */}
          {conflicts.length > 0 && (
            <div className="space-y-2 pt-1">
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${c.severity === 'error' ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-amber-500/10 border-amber-500/30 text-amber-700'}`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{c.severity === 'error' ? 'Conflito Crítico:' : 'Aviso Operacional:'}</span> {c.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="accent" disabled={saving || hasBlockingError} onClick={handleSave}>
            {saving ? 'Salvando...' : 'Salvar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Modal de Placar com Validação Matemática
// ============================================================================

interface ResultValidationDialogProps {
  match: MatchRecord;
  competition: CompetitionRecord | null;
  onClose: () => void;
  onSaved: (sets: MatchRecord['sets'], winnerId: string) => Promise<void>;
}

function ResultValidationDialog({ match, competition, onClose, onSaved }: ResultValidationDialogProps) {
  const isBeach = competition?.modality === 'beach';
  const setFormat = match.phase === 'semifinal' || match.phase === 'final'
    ? (competition?.phaseSetRules?.final || competition?.setFormat || '3-sets')
    : (competition?.setFormat || '3-sets');

  const maxSets = setFormat === '5-sets' ? 5 : setFormat === '1-set' ? 1 : 3;

  const [setScores, setSetScores] = useState<{ a: string; b: string }[]>(() => {
    const existing = match.sets.map(s => ({ a: String(s.scoreA), b: String(s.scoreB) }));
    return [...existing, ...Array.from({ length: maxSets - existing.length }, () => ({ a: '', b: '' }))].slice(0, maxSets);
  });
  const [saving, setSaving] = useState(false);

  const filledSets = setScores.filter(s => s.a !== '' && s.b !== '').map((s, idx) => ({
    setNumber: idx + 1,
    scoreA: Number(s.a),
    scoreB: Number(s.b),
  }));

  const validation = useMemo(() => {
    const config = isBeach ? DEFAULT_BEACH_CONFIG : DEFAULT_INDOOR_CONFIG;
    const typedFormat = setFormat === '5-sets' ? '5-sets' : setFormat === '1-set' ? '1-set' : '3-sets';
    return validateMatchResult(filledSets, { ...config, setFormat: typedFormat });
  }, [filledSets, isBeach, setFormat]);

  const handleSave = async () => {
    if (!validation.valid || !validation.winner) {
      toast.error(validation.errors[0] || 'Resultado incompleto ou matematicamente inválido.');
      return;
    }
    const winnerId = validation.winner === 'A' ? match.teamAId : match.teamBId;
    setSaving(true);
    try {
      await onSaved(filledSets, winnerId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Placar da Partida</DialogTitle>
          <DialogDescription>
            {match.teamAName} vs {match.teamBName} ({setFormat === '5-sets' ? 'Melhor de 5 sets' : 'Melhor de 3 sets'})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3 px-1 text-xs font-semibold text-muted-foreground uppercase">
            <span className="flex-1 truncate">{match.teamAShortName || match.teamAName}</span>
            <span className="w-16 text-center">SET</span>
            <span className="flex-1 text-right truncate">{match.teamBShortName || match.teamBName}</span>
          </div>

          {setScores.map((set, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={50}
                placeholder="--"
                className="flex-1 text-center font-bold font-mono text-base"
                value={set.a}
                onChange={e => setSetScores(prev => prev.map((s, i) => (i === idx ? { ...s, a: e.target.value } : s)))}
              />
              <span className="w-16 text-center text-xs font-bold bg-muted py-2 rounded-lg">
                Set {idx + 1}
              </span>
              <Input
                type="number"
                min={0}
                max={50}
                placeholder="--"
                className="flex-1 text-center font-bold font-mono text-base"
                value={set.b}
                onChange={e => setSetScores(prev => prev.map((s, i) => (i === idx ? { ...s, b: e.target.value } : s)))}
              />
            </div>
          ))}

          {/* Validation Feedback */}
          {validation.valid ? (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Resultado válido: {validation.scoreA} x {validation.scoreB}
              </p>
              <p>
                Vencedor confirmado: <strong>{validation.winner === 'A' ? match.teamAName : match.teamBName}</strong>
              </p>
            </div>
          ) : filledSets.length > 0 ? (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Validação de Placar:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="accent" disabled={saving || !validation.valid} onClick={handleSave}>
            {saving ? 'Salvando...' : 'Finalizar Partida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}