import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { TournamentBracket } from '@/components/competition/TournamentBracket';
import { StandingsTable } from '@/components/competition/StandingsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, GitBranch, ListOrdered, UserPlus, ChevronRight, Info, Plus, FileDown } from 'lucide-react';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup } from '@/services/standingsService';
import { GENDER_CATEGORY_LABELS } from '@/types/registration';
import { generateStandingsReportPdf, downloadReportsPdf } from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  registration: 'Inscrições',
  'in-progress': 'Em Andamento',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success'> = {
  draft: 'outline',
  registration: 'secondary',
  'in-progress': 'default',
  completed: 'success',
  cancelled: 'outline',
};

const CompetitionsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [comps, teams, cts, matches] = await Promise.all([
      dataAccess.listCompetitions(),
      dataAccess.listTeams(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listMatches(),
    ]);
    setCompetitions(comps);
    setTeams(teams);
    setCompetitionTeams(cts);
    setMatches(matches);
    setSelectedId(prev => prev ?? comps[0]?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const selected = competitions.find(c => c.id === selectedId) ?? null;

  const standings = useMemo(() => {
    if (!selected) return [];
    const competitionMatches = matches.filter(m => m.competitionId === selected.id);
    const cts = competitionTeams.filter(ct => ct.competitionId === selected.id);
    const registrations: { team: TeamRecord; groupName?: string }[] = [];
    for (const ct of cts) {
      const team = teams.find(t => t.id === ct.teamId);
      if (!team) continue;
      const groupMatch = competitionMatches.find(m => m.teamAId === team.id || m.teamBId === team.id);
      registrations.push({ team, groupName: groupMatch?.groupName ?? selected.groupName });
    }
    return computeStandingsByGroup(registrations, competitionMatches);
  }, [selected, teams, matches, competitionTeams]);

  const handleExportStandings = () => {
    if (!selected) return;
    const doc = generateStandingsReportPdf(
      standings.map(group => ({ groupName: group.groupName, standings: group.standings })),
      selected.name,
    );
    const safeName = selected.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    downloadReportsPdf(doc, `classificacao_${safeName}.pdf`);
    toast.success('Relatório de classificação gerado!');
  };

  const bracketMatches = useMemo(() => {
    if (!selected) return [];
    const rounds = new Map<number, MatchRecord[]>();
    for (const m of matches.filter(m => m.competitionId === selected.id)) {
      const r = m.round ?? 1;
      const list = rounds.get(r) ?? [];
      list.push(m);
      rounds.set(r, list);
    }
    const setsWon = (m: MatchRecord, team: 'A' | 'B') => m.sets.filter(s => (team === 'A' ? s.scoreA : s.scoreB) > (team === 'A' ? s.scoreB : s.scoreA)).length;
    return [...rounds.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, ms]) =>
        [...ms].sort((a, b) => a.matchNumber - b.matchNumber).map(m => ({
          id: m.id,
          round,
          position: m.matchNumber,
          teamA: { id: m.teamAId, name: m.teamAName, shortName: m.teamAShortName },
          teamB: { id: m.teamBId, name: m.teamBName, shortName: m.teamBShortName },
          scoreA: m.sets.length > 0 ? setsWon(m, 'A') : undefined,
          scoreB: m.sets.length > 0 ? setsWon(m, 'B') : undefined,
          winner: m.winnerId ? (m.winnerId === m.teamAId ? ('A' as const) : ('B' as const)) : undefined,
          scheduled: m.scheduledTime,
        })),
      );
  }, [selected, matches]);

  const handleCreate = async (input: Omit<CompetitionRecord, 'id'>) => {
    const created = await dataAccess.createCompetition(input);
    toast.success(`Competição "${created.name}" criada!`);
    setCreateOpen(false);
    await refresh();
    setSelectedId(created.id);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Campeonatos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie competições, inscrições por equipe, chaveamentos e classificações
            </p>
          </div>
          <Button variant="accent" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Nova Competição
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6 items-start">
          {/* Lista de competições */}
          <Card className="card-elevated">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                Competições
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {competitions.map(competition => (
                <button
                  key={competition.id}
                  type="button"
                  onClick={() => setSelectedId(competition.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between gap-2',
                    selectedId === competition.id ? 'bg-accent/10 border border-accent/30' : 'hover:bg-muted/50',
                  )}
                >
                  <div>
                    <p className="font-semibold">{competition.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {GENDER_CATEGORY_LABELS[competition.genderCategory]} · {competition.playerFormat} ·{' '}
                      {competition.modality === 'indoor' ? 'Quadra' : 'Praia'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
              {competitions.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  Nenhuma competição. Crie uma nova para começar.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Detalhe da competição */}
          {selected ? (
            <Card className="card-elevated">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl font-display">{selected.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                      <Badge variant="outline">{GENDER_CATEGORY_LABELS[selected.genderCategory]}</Badge>
                      <Badge variant="outline">{selected.format?.replace(/-/g, ' ')}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="accent"
                      className="gap-2"
                      onClick={() => navigate(`/jogos/novo?competition=${selected.id}`)}
                    >
                      <Plus className="w-4 h-4" />
                      Agendar Jogo
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate(`/competicoes/${selected.id}/inscricoes`)}
                    >
                      <UserPlus className="w-4 h-4" />
                      Inscrições por Equipe
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="standings" className="space-y-6">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="standings" className="gap-2">
                      <ListOrdered className="w-4 h-4" />
                      Classificação
                    </TabsTrigger>
                    <TabsTrigger value="bracket" className="gap-2">
                      <GitBranch className="w-4 h-4" />
                      Chaveamento
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="standings">
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <Button variant="outline" className="gap-2" onClick={handleExportStandings} disabled={standings.length === 0}>
                          <FileDown className="w-4 h-4" />
                          Relatório de Classificação (PDF)
                        </Button>
                      </div>
                      {standings.map(group => (
                        <div key={group.groupName} className="space-y-2">
                          <h3 className="text-sm font-semibold text-muted-foreground">{group.groupName}</h3>
                          <StandingsTable
                            standings={group.standings}
                            title={`Classificação - ${group.groupName}`}
                            logoUrlById={Object.fromEntries(teams.map(t => [t.id, t.logoUrl ?? '']))}
                          />
                        </div>
                      ))}
                      {standings.length === 0 && (
                        <Card>
                          <CardContent className="p-10 text-center text-muted-foreground">
                            Sem partidas finalizadas nesta competição.
                          </CardContent>
                        </Card>
                      )}
                      <ClassificationCriteriaCard />
                    </div>
                  </TabsContent>

                  <TabsContent value="bracket">
                    {bracketMatches.length > 0 ? (
                      <TournamentBracket matches={bracketMatches} title={`Chaveamento - ${selected.name}`} />
                    ) : (
                      <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                          Sem partidas nesta competição para montar o chaveamento.
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                Nenhuma competição cadastrada.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CompetitionFormDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
    </MainLayout>
  );
};

interface CompetitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<CompetitionRecord, 'id'>) => Promise<void>;
}

function CompetitionFormDialog({ open, onOpenChange, onSubmit }: CompetitionFormDialogProps) {
  const [name, setName] = useState('');
  const [modality, setModality] = useState<'indoor' | 'beach'>('indoor');
  const [genderCategory, setGenderCategory] = useState<'male' | 'female' | 'mixed'>('female');
  const [playerFormat, setPlayerFormat] = useState('6x6');
  const [setsFormat, setSetsFormat] = useState('3-sets');
  const [format, setFormat] = useState('round-robin');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [defaultDeadline, setDefaultDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setModality('indoor');
      setGenderCategory('female');
      setPlayerFormat('6x6');
      setSetsFormat('3-sets');
      setFormat('round-robin');
      setVenue('');
      setStartDate('');
      setEndDate('');
      setDefaultDeadline('');
    }
  }, [open]);

  const canSubmit = name.trim().length >= 3;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        modality,
        format,
        playerFormat,
        setFormat: setsFormat,
        genderCategory,
        status: 'registration',
        venue: venue.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        defaultDeadline: defaultDeadline || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Competição</DialogTitle>
          <DialogDescription>Configura os dados iniciais da competição.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="comp-name">Nome</Label>
            <Input id="comp-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Copa Cidade 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={modality} onValueChange={(v: 'indoor' | 'beach') => setModality(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">Quadra</SelectItem>
                  <SelectItem value="beach">Praia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={genderCategory} onValueChange={(v: 'male' | 'female' | 'mixed') => setGenderCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="mixed">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Formato de Jogo</Label>
              <Select value={playerFormat} onValueChange={setPlayerFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6x6">6x6 (Quadra)</SelectItem>
                  <SelectItem value="4x4">4x4</SelectItem>
                  <SelectItem value="2x2">2x2 (Praia)</SelectItem>
                  <SelectItem value="3x3">3x3 (Praia)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sets por Partida</Label>
              <Select value={setsFormat} onValueChange={setSetsFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-set">1 set</SelectItem>
                  <SelectItem value="2-sets">2 sets</SelectItem>
                  <SelectItem value="3-sets">3 sets</SelectItem>
                  <SelectItem value="5-sets">5 sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sistema de Disputa</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="round-robin">Todos contra todos</SelectItem>
                <SelectItem value="group-stage-knockout">Fases de grupos + mata-mata</SelectItem>
                <SelectItem value="single-elimination">Mata-mata simples</SelectItem>
                <SelectItem value="double-elimination">Mata-mata duplo</SelectItem>
                <SelectItem value="olympic-bracket">Chaveamento olímpico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-venue">Local (opcional)</Label>
            <Input id="comp-venue" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Ex.: Ginásio Municipal" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="comp-start">Início</Label>
              <Input id="comp-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-end">Fim</Label>
              <Input id="comp-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-deadline">Prazo de inscrição</Label>
              <Input id="comp-deadline" type="date" value={defaultDeadline} onChange={e => setDefaultDeadline(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="accent" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? 'Criando...' : 'Criar Competição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CRITERIA = [
  { order: '1º', title: 'Maior número de pontos', description: 'Soma de pontos conquistados (3 pts por vitória 3-0/3-1; 2 pts por vitória 3-2; 1 pt por derrota 2-3; 0 pt por derrota 0-3/1-3).' },
  { order: '2º', title: 'Confronto direto', description: 'Vence a equipe que venceu o jogo entre elas. Se 1x1 ou empate com 3+ equipes, segue o critério seguinte.' },
  { order: '3º', title: 'Set Average', description: 'Sets vencidos ÷ sets perdidos. Maior índice vence.' },
  { order: '4º', title: 'Pontos Average', description: 'Pontos marcados ÷ pontos sofridos. Maior índice vence.' },
  { order: '5º', title: 'Saldo de pontos', description: 'Pontos marcados − pontos sofridos. Maior saldo vence.' },
  { order: '6º', title: 'Maior número de pontos marcados', description: 'Maior total de pontos marcados na fase classificatória.' },
  { order: '7º', title: 'Sorteio', description: 'Igualdade absoluta após todos os critérios: sorteio pela organização.' },
];

function ClassificationCriteriaCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Info className="w-4 h-4 text-accent" />
            Critérios de Classificação e Desempate
          </CardTitle>
          <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {CRITERIA.map(criterion => (
            <div key={criterion.order} className="flex gap-3 text-sm">
              <span className="font-bold text-accent shrink-0">{criterion.order}</span>
              <div>
                <p className="font-semibold">{criterion.title}</p>
                <p className="text-muted-foreground text-xs">{criterion.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export default CompetitionsPage;