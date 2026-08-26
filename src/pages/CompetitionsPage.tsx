import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { CompetitionHeader, type CompetitionTab } from '@/components/competition/CompetitionHeader';
import { TournamentBracket } from '@/components/competition/TournamentBracket';
import { StandingsTable } from '@/components/competition/StandingsTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  GitBranch,
  ListOrdered,
  UserPlus,
  Plus,
  FileDown,
  Calendar,
  Settings,
  Users,
  UserCheck,
  Dices,
  Play,
  CheckCircle,
  Award,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup, computeBestThirds } from '@/services/standingsService';
import { computePodium } from '@/services/playoffsService';
import { GENDER_CATEGORY_LABELS } from '@/types/registration';
import { generateStandingsReportPdf, downloadReportsPdf } from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, MatchRecord, TeamRecord, ModalityRecord, VenueRecord, CompetitionLifecycleStatus } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import { useAuth } from '@/components/auth/AuthContext';
import { useCapability } from '@/hooks/useCapability';

const TIEBREAK_CRITERIA_LABELS_PT: Record<string, string> = {
  'points': 'Pontos',
  'victories': 'Vitórias',
  'head-to-head': 'Confronto Direto',
  'sets-ratio': 'Set Average',
  'points-ratio': 'Points Average',
  'sets-balance': 'Saldo de Sets',
  'points-balance': 'Saldo de Pontos',
  'draw': 'Sorteio',
};

import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { AuditService } from '@/lib/security';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { cn } from '@/lib/utils';

export default function CompetitionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const { can } = useCapability();
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [modalities, setModalities] = useState<ModalityRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [competitionAthletes, setCompetitionAthletes] = useState<CompetitionAthlete[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CompetitionTab>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [editConfigOpen, setEditConfigOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<CompetitionLifecycleStatus | null>(null);

  const refresh = useCallback(async () => {
    const [comps, mods, vns, tms, cts, aths, ms] = await Promise.all([
      dataAccess.listCompetitions(),
      dataAccess.listModalities(),
      dataAccess.listVenues(),
      dataAccess.listTeams(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listCompetitionAthletes(),
      dataAccess.listMatches(),
    ]);
    setCompetitions(comps);
    setModalities(mods);
    setVenues(vns);
    setTeams(tms);
    setCompetitionTeams(cts);
    setCompetitionAthletes(aths);
    setMatches(ms);
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

  // Selected competition data
  const selectedTeams = useMemo(() => {
    if (!selected) return [];
    return competitionTeams.filter(ct => ct.competitionId === selected.id);
  }, [selected, competitionTeams]);

  const selectedMatches = useMemo(() => {
    if (!selected) return [];
    return matches.filter(m => m.competitionId === selected.id);
  }, [selected, matches]);

  const selectedAthletes = useMemo(() => {
    if (!selected) return [];
    const teamIds = selectedTeams.map(t => t.id);
    return competitionAthletes.filter(a => teamIds.includes(a.competitionTeamId));
  }, [selected, selectedTeams, competitionAthletes]);

  // Standings
  const standings = useMemo(() => {
    if (!selected) return [];
    const registrations: { team: TeamRecord; groupName?: string }[] = [];
    for (const ct of selectedTeams) {
      const team = teams.find(t => t.id === ct.teamId);
      if (!team) continue;
      const groupMatch = selectedMatches.find(m => m.teamAId === team.id || m.teamBId === team.id);
      registrations.push({ team, groupName: groupMatch?.groupName ?? selected.groupName });
    }
    return computeStandingsByGroup(registrations, selectedMatches, {
      criteria: selected.tiebreakCriteriaOrder,
    });
  }, [selected, selectedTeams, teams, selectedMatches]);

  // Best thirds if enabled
  const bestThirds = useMemo(() => {
    if (!selected?.bestThirdsCount || selected.bestThirdsCount <= 0) return [];
    return computeBestThirds(standings, selected.bestThirdsCount);
  }, [selected, standings]);

  // Podium apuration if playoffs exist
  const podium = useMemo(() => {
    if (!selected) return null;
    return computePodium(selectedMatches);
  }, [selected, selectedMatches]);

  // Bracket matches
  const bracketMatches = useMemo(() => {
    if (!selected) return [];
    const rounds = new Map<number, MatchRecord[]>();
    for (const m of selectedMatches.filter(m => m.phase !== 'group-stage' && m.phase !== 'classificatoria')) {
      const r = m.round ?? 1;
      const list = rounds.get(r) ?? [];
      list.push(m);
      rounds.set(r, list);
    }
    const setsWon = (m: MatchRecord, team: 'A' | 'B') =>
      m.sets.filter(s => (team === 'A' ? s.scoreA : s.scoreB) > (team === 'A' ? s.scoreB : s.scoreA)).length;
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
  }, [selected, selectedMatches]);

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

  const handleUpdateStatus = async (newStatus: CompetitionLifecycleStatus) => {
    if (!can('competition:edit')) {
      toast.error('Você não possui permissão para alterar o status da competição.');
      return;
    }
    if (!selected) return;

    const operatorName = session?.user?.name || 'Organizador';

    await dataAccess.updateCompetition(selected.id, { status: newStatus });
    AuditService.logEvent(
      'Alteração de Ciclo de Competição',
      session?.user?.email || 'organizador',
      'info',
      `Competição "${selected.name}" avançou para status "${newStatus}" por ${operatorName}.`
    );
    toast.success(`Status da competição alterado para "${newStatus}".`);
    await refresh();
  };

  const requestStatusTransition = (targetStatus: CompetitionLifecycleStatus) => {
    if (!can('competition:edit')) {
      toast.error('Você não possui permissão para alterar o status da competição.');
      return;
    }
    if (!selected) return;

    const validation = CompetitionLifecycleService.validateTransition(selected, targetStatus, {
      teams: selectedTeams,
      matches: selectedMatches,
      championTeamId: selected.championTeamId,
      runnerUpTeamId: selected.runnerUpTeamId,
    });

    if (!validation.valid) {
      toast.error('Transição de fase não permitida:', {
        description: validation.errors.join(' • '),
      });
      return;
    }

    if (validation.warnings.length > 0) {
      toast.warning('Aviso sobre a fase:', {
        description: validation.warnings.join(' • '),
      });
    }

    setPendingStatus(targetStatus);
  };

  const handleCreate = async (input: Omit<CompetitionRecord, 'id'>) => {
    if (!can('competition:create')) {
      toast.error('Você não possui permissão para cadastrar competições.');
      return;
    }
    const created = await dataAccess.createCompetition(input);
    AuditService.logEvent(
      'Criação de Competição',
      session?.user?.email || 'organizador',
      'success',
      `Nova competição "${created.name}" criada por ${session?.user?.name || 'Organizador'}.`
    );
    toast.success(`Competição "${created.name}" criada com sucesso!`);
    setCreateOpen(false);
    await refresh();
    setSelectedId(created.id);
  };

  const handleUpdateConfig = async (updates: Partial<CompetitionRecord>) => {
    if (!can('competition:edit')) {
      toast.error('Você não possui permissão para editar configurações.');
      return;
    }
    if (!selected) return;

    await dataAccess.updateCompetition(selected.id, updates);
    toast.success('Configurações da competição atualizadas com sucesso!');
    setEditConfigOpen(false);
    await refresh();
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
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
              <Trophy className="w-8 h-8 text-primary" />
              Gestão de Competições
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ciclo completo: planejamento, inscrições, sorteio, confrontos, classificação e relatórios.
            </p>
          </div>
          {can('competition:create') && (
            <Button variant="accent" className="gap-2 self-start sm:self-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Nova Competição
            </Button>
          )}
        </div>

        {/* Layout: Sidebar de Competições + Contexto Detalhado */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start">
          {/* Seletor de Competições */}
          <Card className="card-elevated">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-sm font-display font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Torneios Cadastrados ({competitions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {competitions.map(comp => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedId(comp.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-all text-xs flex flex-col gap-1',
                    selectedId === comp.id
                      ? 'bg-primary/10 border border-primary/30 font-semibold text-primary shadow-xs'
                      : 'hover:bg-muted/50 text-foreground',
                  )}
                >
                  <span className="font-bold truncate">{comp.name}</span>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{comp.modality === 'beach' ? 'Praia' : 'Quadra'} · {comp.playerFormat}</span>
                    <Badge variant="outline" className="text-[9px] py-0">{comp.status}</Badge>
                  </div>
                </button>
              ))}
              {competitions.length === 0 && (
                <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma competição cadastrada.</p>
              )}
            </CardContent>
          </Card>

          {/* Área Principal da Competição Selecionada */}
          {selected ? (
            <div className="space-y-6">
              {/* Context Header with Tabs */}
              <CompetitionHeader
                competition={selected}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                extraStats={{
                  teamsCount: selectedTeams.length,
                  matchesCount: selectedMatches.length,
                  athletesCount: selectedAthletes.length,
                }}
              />

              {/* Tab 1: Visão Geral */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Status & Lifecycle Controls */}
                  <Card className="card-elevated">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-display flex items-center justify-between">
                        <span>Fluxo e Ciclo de Vida da Competição</span>
                        <Badge variant="default" className="capitalize">{selected.status}</Badge>
                      </CardTitle>
                      <CardDescription>Avance o status conforme o progresso do torneio.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 pt-0">
                      <Button
                        size="sm"
                        variant={selected.status === 'registration-open' ? 'default' : 'outline'}
                        disabled={!can('competition:edit')}
                        onClick={() => requestStatusTransition('registration-open')}
                      >
                        1. Abrir Inscrições
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.status === 'registration-closed' ? 'default' : 'outline'}
                        disabled={!can('competition:edit')}
                        onClick={() => requestStatusTransition('registration-closed')}
                      >
                        2. Encerrar Inscrições
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.status === 'draw-pending' ? 'default' : 'outline'}
                        disabled={!can('competition:edit')}
                        onClick={() => requestStatusTransition('draw-pending')}
                      >
                        3. Sorteio de Grupos
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.status === 'in-progress' ? 'default' : 'outline'}
                        disabled={!can('competition:edit')}
                        onClick={() => requestStatusTransition('in-progress')}
                      >
                        4. Iniciar Jogos
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.status === 'playoffs' ? 'default' : 'outline'}
                        disabled={!can('competition:edit')}
                        onClick={() => requestStatusTransition('playoffs')}
                      >
                        5. Fase Eliminatória (Playoffs)
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.status === 'completed' ? 'success' : 'outline'}
                        disabled={!can('competition:edit')}
                        onClick={() => requestStatusTransition('completed')}
                      >
                        6. Finalizar Torneio
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Pódio Final (se apurado) */}
                  {podium && (podium.championTeamId || podium.runnerUpTeamId) && (
                    <Card className="card-elevated border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-card to-amber-500/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-display flex items-center gap-2 text-amber-600">
                          <Award className="w-5 h-5" />
                          Pódio Oficial da Competição
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0 text-center">
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <span className="text-[11px] font-bold text-amber-600 uppercase block">1º Lugar (Campeão)</span>
                          <span className="font-display font-bold text-sm text-foreground mt-1 block">
                            {teams.find(t => t.id === podium.championTeamId)?.name || 'A definir'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-400/10 border border-slate-400/20">
                          <span className="text-[11px] font-bold text-slate-500 uppercase block">2º Lugar (Vice)</span>
                          <span className="font-display font-bold text-sm text-foreground mt-1 block">
                            {teams.find(t => t.id === podium.runnerUpTeamId)?.name || 'A definir'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-700/10 border border-amber-700/20">
                          <span className="text-[11px] font-bold text-amber-700 uppercase block">3º Lugar</span>
                          <span className="font-display font-bold text-sm text-foreground mt-1 block">
                            {teams.find(t => t.id === podium.thirdPlaceTeamId)?.name || 'A definir'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase block">4º Lugar</span>
                          <span className="font-display font-bold text-sm text-foreground mt-1 block">
                            {teams.find(t => t.id === podium.fourthPlaceTeamId)?.name || 'A definir'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Resumo de Equipes e Ações Rápidas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="card-elevated p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Equipes Inscritas</span>
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold font-display">{selectedTeams.length}</p>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab('teams')}>
                        Gerenciar Equipes
                      </Button>
                    </Card>

                    <Card className="card-elevated p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Total de Partidas</span>
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold font-display">{selectedMatches.length}</p>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate('/jogos')}>
                        Ver na Central de Jogos
                      </Button>
                    </Card>

                    <Card className="card-elevated p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Sorteio & Chaves</span>
                        <Dices className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold font-display">{selected.groupsCount || 1} Grupos</p>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate(`/sorteio/${selected.id}`)}>
                        Abrir Motor de Sorteio
                      </Button>
                    </Card>
                  </div>
                </div>
              )}

              {/* Tab 2: Configuração Completa */}
              {activeTab === 'config' && (
                <Card className="card-elevated">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-lg font-display">Configurações Regulamentares</CardTitle>
                      <CardDescription>Parâmetros de pontuação, desempate, sets por fase e tempos de descanso.</CardDescription>
                    </div>
                    {can('competition:edit') && (
                      <Button variant="outline" size="sm" onClick={() => setEditConfigOpen(true)}>
                        <Settings className="w-4 h-4 mr-1.5" />
                        Editar Configurações
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <span className="text-xs text-muted-foreground block font-semibold uppercase">Modalidade & Formato</span>
                        <p className="font-bold mt-1">{selected.modality === 'beach' ? 'Vôlei de Praia' : 'Vôlei de Quadra'} ({selected.playerFormat})</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <span className="text-xs text-muted-foreground block font-semibold uppercase">Sets Padrão</span>
                        <p className="font-bold mt-1">{selected.setFormat === '5-sets' ? 'Melhor de 5 sets' : 'Melhor de 3 sets'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <span className="text-xs text-muted-foreground block font-semibold uppercase">Tempo de Jogo / Descanso</span>
                        <p className="font-bold mt-1">{selected.defaultMatchIntervalMinutes || 75} min / {selected.minTeamRestMinutes || 30} min rest</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Sets Diferenciados por Fase</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded bg-muted/40 text-center">
                          <span className="text-muted-foreground block text-[10px]">Grupos</span>
                          <span className="font-semibold">{selected.phaseSetRules?.groupStage || selected.setFormat}</span>
                        </div>
                        <div className="p-2 rounded bg-muted/40 text-center">
                          <span className="text-muted-foreground block text-[10px]">Quartas</span>
                          <span className="font-semibold">{selected.phaseSetRules?.playoffs || selected.setFormat}</span>
                        </div>
                        <div className="p-2 rounded bg-muted/40 text-center">
                          <span className="text-muted-foreground block text-[10px]">Semifinais</span>
                          <span className="font-semibold">{selected.phaseSetRules?.semifinals || '5-sets'}</span>
                        </div>
                        <div className="p-2 rounded bg-muted/40 text-center">
                          <span className="text-muted-foreground block text-[10px]">Final</span>
                          <span className="font-semibold">{selected.phaseSetRules?.final || '5-sets'}</span>
                        </div>
                      </div>
                    </div>

                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Ordem de Critérios de Desempate</h4>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {(selected.tiebreakCriteriaOrder || ['points', 'victories', 'head-to-head', 'sets-ratio', 'points-ratio', 'sets-balance', 'points-balance']).map((crit, idx) => (
                            <Badge key={crit} variant="secondary" className="gap-1.5 py-1 px-2.5">
                              <span className="font-bold text-primary">{idx + 1}º</span>
                              <span className="capitalize">{TIEBREAK_CRITERIA_LABELS_PT[crit] || crit.replace(/-/g, ' ')}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                  </CardContent>
                </Card>
              )}

              {/* Tab 3: Equipes */}
              {activeTab === 'teams' && (
                <Card className="card-elevated">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-lg font-display">Equipes Participantes ({selectedTeams.length})</CardTitle>
                      <CardDescription>Inscrições homologadas e situação dos elencos.</CardDescription>
                    </div>
                    <Button variant="accent" size="sm" onClick={() => navigate(`/competicoes/${selected.id}/inscricoes`)}>
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      Gerenciar Inscrições
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedTeams.map(ct => {
                        const t = teams.find(team => team.id === ct.teamId);
                        const athCount = selectedAthletes.filter(a => a.competitionTeamId === ct.id).length;
                        return (
                          <div key={ct.id} className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{t?.name || 'Equipe'}</p>
                              <p className="text-xs text-muted-foreground">{athCount} atletas no elenco</p>
                            </div>
                            <Badge variant={ct.status === 'approved' ? 'success' : 'outline'} className="text-[10px]">
                              {ct.status === 'approved' ? 'Confirmada' : ct.status}
                            </Badge>
                          </div>
                        );
                      })}
                      {selectedTeams.length === 0 && (
                        <p className="text-xs text-muted-foreground col-span-3 py-6 text-center">
                          Nenhuma equipe inscrita nesta competição ainda.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tab 4: Atletas */}
              {activeTab === 'athletes' && (
                <Card className="card-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-display">Atletas Confirmados ({selectedAthletes.length})</CardTitle>
                    <CardDescription>Relação de atletas inscritos por equipe para esta competição.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {selectedAthletes.map(ath => (
                        <div key={ath.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/10 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-foreground">{ath.name}</span>
                            {ath.jerseyNumber && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
                                #{ath.jerseyNumber}
                              </span>
                            )}
                            <p className="text-[11px] text-muted-foreground capitalize">{ath.position || 'Geral'}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {ath.isCaptain && <Badge variant="secondary" className="text-[9px]">CAP</Badge>}
                            {ath.isLibero && <Badge variant="outline" className="text-[9px]">LIB</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tab 5: Sorteio */}
              {activeTab === 'draw' && (
                <Card className="card-elevated p-8 text-center space-y-4">
                  <Dices className="w-12 h-12 text-primary mx-auto" />
                  <div>
                    <h3 className="text-lg font-bold font-display">Motor de Sorteio de Grupos & Tabela de Berger</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                      Realize sorteio automático ou manual com potes, cabeças de chave e geração direta dos confrontos.
                    </p>
                  </div>
                  <Button variant="accent" onClick={() => navigate(`/sorteio/${selected.id}`)}>
                    Acessar Tela de Sorteio
                  </Button>
                </Card>
              )}

              {/* Tab 6: Jogos */}
              {activeTab === 'matches' && (
                <Card className="card-elevated">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-lg font-display">Confrontos ({selectedMatches.length})</CardTitle>
                      <CardDescription>Partidas agendadas e realizadas desta competição.</CardDescription>
                    </div>
                    <Button variant="accent" size="sm" onClick={() => navigate('/jogos')}>
                      Abrir Central de Jogos
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-2">
                      {selectedMatches.map(m => (
                        <div key={m.id} className="p-3 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold">Jogo #{m.matchNumber}</span>
                              <Badge variant="outline" className="text-[10px]">{m.phase || m.groupName || 'Geral'}</Badge>
                              <span>{m.court || m.venue || 'Local a definir'}</span>
                            </div>
                            <p className="font-bold text-sm text-foreground">
                              {m.teamAName} <span className="text-muted-foreground font-normal text-xs">vs</span> {m.teamBName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Badge variant={m.status === 'completed' || m.status === 'homologated' ? 'success' : 'outline'}>
                              {m.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tab 7: Classificação & Mata-mata */}
              {activeTab === 'standings' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Button variant="outline" className="gap-2" onClick={handleExportStandings} disabled={standings.length === 0}>
                      <FileDown className="w-4 h-4" />
                      Exportar Classificação Oficial (PDF)
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

                  {/* Melhores Terceiros (se houver) */}
                  {bestThirds.length > 0 && (
                    <Card className="card-elevated border-primary/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-display flex items-center gap-2 text-primary">
                          <Sparkles className="w-4 h-4" />
                          Ranking de Melhores Terceiros Colocados
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <StandingsTable
                          standings={bestThirds}
                          title="Ranking Comparativo dos Terceiros"
                          logoUrlById={Object.fromEntries(teams.map(t => [t.id, t.logoUrl ?? '']))}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Chaveamento Mata-mata */}
                  {bracketMatches.length > 0 && (
                    <div className="pt-4 border-t border-border/60">
                      <h3 className="text-base font-display font-bold mb-3 flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-primary" />
                        Chaveamento Eliminatório (Mata-mata)
                      </h3>
                      <TournamentBracket matches={bracketMatches} title={`Fase Final - ${selected.name}`} />
                    </div>
                  )}
                </div>
              )}

              {/* Tab 8: Relatórios */}
              {activeTab === 'reports' && (
                <Card className="card-elevated p-8 text-center space-y-4">
                  <FileSpreadsheet className="w-12 h-12 text-primary mx-auto" />
                  <div>
                    <h3 className="text-lg font-bold font-display">Central de Relatórios & Documentos</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                      Emita súmulas oficiais, ordens de saque, classificação detalhada e boletins da competição.
                    </p>
                  </div>
                  <Button variant="accent" onClick={() => navigate('/relatorios')}>
                    Abrir Central de Relatórios
                  </Button>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Selecione uma competição à esquerda para gerenciar.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Nova Competição */}
      <CompetitionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        modalities={modalities}
        venues={venues}
      />

      {/* Modal de Confirmação para Transições Críticas do Ciclo de Vida */}
      <ConfirmActionDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title="Avançar Fase da Competição"
        variant={pendingStatus === 'completed' ? 'destructive' : 'accent'}
        description={
          pendingStatus === 'completed'
            ? 'Deseja finalizar oficialmente a competição? Esta ação consolidará o quadro de honra e pódio final.'
            : pendingStatus === 'in-progress'
            ? 'Deseja iniciar oficialmente a fase de jogos? Certifique-se de que a tabela e as quadras estejam definidas.'
            : pendingStatus === 'playoffs'
            ? 'Deseja iniciar a fase eliminatória (Mata-mata)? Os confrontos da fase de grupos serão congelados.'
            : pendingStatus === 'registration-closed'
            ? 'Deseja encerrar o período de inscrições de novas equipes e atletas?'
            : `Deseja avançar o status da competição para "${pendingStatus}"?`
        }
        confirmText="Confirmar Alteração"
        onConfirm={async () => {
          if (pendingStatus) {
            await handleUpdateStatus(pendingStatus);
            setPendingStatus(null);
          }
        }}
      />

      {selected && (
        <CompetitionSettingsEditDialog
          open={editConfigOpen}
          onOpenChange={setEditConfigOpen}
          competition={selected}
          onSave={handleUpdateConfig}
        />
      )}
    </MainLayout>
  );
}

interface CompetitionSettingsEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: CompetitionRecord;
  onSave: (updates: Partial<CompetitionRecord>) => Promise<void>;
}

function CompetitionSettingsEditDialog({ open, onOpenChange, competition, onSave }: CompetitionSettingsEditDialogProps) {
  const [setFormat, setSetFormat] = useState(competition.setFormat || '3-sets');
  const [groupStage, setGroupStage] = useState(competition.phaseSetRules?.groupStage || competition.setFormat || '3-sets');
  const [playoffs, setPlayoffs] = useState(competition.phaseSetRules?.playoffs || competition.setFormat || '3-sets');
  const [semifinals, setSemifinals] = useState(competition.phaseSetRules?.semifinals || '5-sets');
  const [final, setFinal] = useState(competition.phaseSetRules?.final || '5-sets');

  useEffect(() => {
    if (open) {
      setSetFormat(competition.setFormat || '3-sets');
      setGroupStage(competition.phaseSetRules?.groupStage || competition.setFormat || '3-sets');
      setPlayoffs(competition.phaseSetRules?.playoffs || competition.setFormat || '3-sets');
      setSemifinals(competition.phaseSetRules?.semifinals || '5-sets');
      setFinal(competition.phaseSetRules?.final || '5-sets');
    }
  }, [open, competition]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      setFormat: setFormat as '3-sets' | '5-sets',
      phaseSetRules: {
        groupStage: groupStage as '3-sets' | '5-sets',
        playoffs: playoffs as '3-sets' | '5-sets',
        semifinals: semifinals as '3-sets' | '5-sets',
        final: final as '3-sets' | '5-sets',
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Configurações da Competição</DialogTitle>
          <DialogDescription>Ajuste o formato de sets por fase.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Formato de Sets Padrão</Label>
            <Select value={setFormat} onValueChange={(v: '3-sets' | '5-sets') => setSetFormat(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o formato padrão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3-sets">Melhor de 3 sets</SelectItem>
                <SelectItem value="5-sets">Melhor de 5 sets</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-muted-foreground uppercase text-xs font-bold">Formatos Específicos por Fase</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Grupos</Label>
                <Select value={groupStage} onValueChange={(v: '3-sets' | '5-sets') => setGroupStage(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-sets">3 Sets</SelectItem>
                    <SelectItem value="5-sets">5 Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Quartas de Final</Label>
                <Select value={playoffs} onValueChange={(v: '3-sets' | '5-sets') => setPlayoffs(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-sets">3 Sets</SelectItem>
                    <SelectItem value="5-sets">5 Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Semifinais</Label>
                <Select value={semifinals} onValueChange={(v: '3-sets' | '5-sets') => setSemifinals(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-sets">3 Sets</SelectItem>
                    <SelectItem value="5-sets">5 Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Finais</Label>
                <Select value={final} onValueChange={(v: '3-sets' | '5-sets') => setFinal(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-sets">3 Sets</SelectItem>
                    <SelectItem value="5-sets">5 Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="accent">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CompetitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<CompetitionRecord, 'id'>) => Promise<void>;
  modalities: ModalityRecord[];
  venues: VenueRecord[];
}

function CompetitionFormDialog({ open, onOpenChange, onSubmit, modalities, venues }: CompetitionFormDialogProps) {
  const [name, setName] = useState('');
  const [modality, setModality] = useState<'indoor' | 'beach'>('indoor');
  const [genderCategory, setGenderCategory] = useState<'male' | 'female' | 'mixed'>('female');
  const [playerFormat, setPlayerFormat] = useState('6x6');
  const [setsFormat, setSetsFormat] = useState('3-sets');
  const [format, setFormat] = useState('group-stage-knockout');
  const [groupsCount, setGroupsCount] = useState(2);
  const [advancingPerGroup, setAdvancingPerGroup] = useState(2);
  const [bestThirdsCount, setBestThirdsCount] = useState(0);
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
      setFormat('group-stage-knockout');
      setGroupsCount(2);
      setAdvancingPerGroup(2);
      setBestThirdsCount(0);
      setVenue(venues[0]?.name || '');
      setStartDate('');
      setEndDate('');
      setDefaultDeadline('');
    }
  }, [open, venues]);

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
        status: 'planning',
        groupsCount,
        advancingPerGroup,
        bestThirdsCount,
        venue: venue.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        defaultDeadline: defaultDeadline || undefined,
        defaultMatchIntervalMinutes: 75,
        minTeamRestMinutes: 30,
        tiebreakCriteriaOrder: ['points', 'victories', 'head-to-head', 'sets-ratio', 'points-ratio', 'sets-balance', 'points-balance'],
        phaseSetRules: {
          groupStage: setsFormat === '5-sets' ? '5-sets' : '3-sets',
          playoffs: setsFormat === '5-sets' ? '5-sets' : '3-sets',
          semifinals: '5-sets',
          final: '5-sets',
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Competição</DialogTitle>
          <DialogDescription>Defina os parâmetros técnicos e regulamentares da nova competição.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="comp-name">Nome da Competição</Label>
            <Input id="comp-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Superliga Regional 2026" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Modalidade</Label>
              <Select value={modality} onValueChange={(v: 'indoor' | 'beach') => setModality(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">Vôlei de Quadra</SelectItem>
                  <SelectItem value="beach">Vôlei de Praia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria / Naipe</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Formato de Atletas</Label>
              <Select value={playerFormat} onValueChange={setPlayerFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6x6">6x6 (Quadra)</SelectItem>
                  <SelectItem value="4x4">4x4 (Misto / Areia)</SelectItem>
                  <SelectItem value="2x2">2x2 (Dupla)</SelectItem>
                  <SelectItem value="3x3">3x3 (Trio)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sets Padrão</Label>
              <Select value={setsFormat} onValueChange={setSetsFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3-sets">Melhor de 3 sets</SelectItem>
                  <SelectItem value="5-sets">Melhor de 5 sets</SelectItem>
                  <SelectItem value="1-set">Set Único</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sistema de Disputa</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="group-stage-knockout">Fase de Grupos + Mata-mata (Recomendado)</SelectItem>
                <SelectItem value="round-robin">Todos contra Todos (Pontos Corridos)</SelectItem>
                <SelectItem value="single-elimination">Eliminatória Simples (Mata-mata direto)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format === 'group-stage-knockout' && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-1.5">
                <Label>Nº de Grupos</Label>
                <Input type="number" min={1} max={8} value={groupsCount} onChange={e => setGroupsCount(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Classif. por Grupo</Label>
                <Input type="number" min={1} max={4} value={advancingPerGroup} onChange={e => setAdvancingPerGroup(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Melhores 3ºs</Label>
                <Input type="number" min={0} max={4} value={bestThirdsCount} onChange={e => setBestThirdsCount(Number(e.target.value))} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="comp-venue">Local Principal / Ginásio</Label>
            <Input id="comp-venue" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Ex.: Ginásio UNIPAR Toledo" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="comp-start">Início</Label>
              <Input id="comp-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-end">Fim</Label>
              <Input id="comp-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-deadline">Prazo Inscrições</Label>
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