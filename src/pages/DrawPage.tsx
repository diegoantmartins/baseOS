import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Shuffle,
  Save,
  RefreshCw,
  Trophy,
  Users,
  ClipboardList,
  CheckCircle2,
  Dices,
  Calendar,
  ArrowRight,
  GripVertical,
  MonitorPlay,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CompetitionDrawEligibilityService } from '@/services/competitionDrawEligibilityService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StateContainer } from '@/components/ui/StateContainer';
import { LiveDrawModal } from '@/components/draw/LiveDrawModal';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { dataAccess } from '@/services/dataAccess';
import { CompetitionBracketService } from '@/services/competitionBracketService';
import { runDraw, roundRobinMatchCount, roundRobinRoundCount, generateDrawMatches } from '@/services/drawService';
import { validateDrawConfig, formatValidationErrors, getValidationSummary } from '@/services/drawValidator';
import { suggestGroupsCount } from '@/types/draw';
import type { DrawConfig, DrawGroup, DrawMatchProposal, DrawRecord, DrawResult } from '@/types/draw';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import { useAuth } from '@/components/auth/useAuth';
import { OperationalAuditService } from '@/services/operationalAuditService';
import { cn } from '@/lib/utils';

type DrawOperationState = 'idle' | 'running' | 'saving';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const DrawPage = () => {
  const { session } = useAuth();
  const { competitionId: routeCompetitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();

  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [competitionAthletes, setCompetitionAthletes] = useState<CompetitionAthlete[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [existingDraw, setExistingDraw] = useState<DrawRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isClosingRegs, setIsClosingRegs] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

  const [groupsCount, setGroupsCount] = useState(2);
  const [seedingMode, setSeedingMode] = useState<DrawConfig['seedingMode']>('seeded');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
  const [headSeeds, setHeadSeeds] = useState<string[]>([]);
  const [operationState, setOperationState] = useState<DrawOperationState>('idle');
  const [drawStatus, setDrawStatus] = useState<'preview' | 'official' | 'locked'>('preview');

  const [preview, setPreview] = useState<{ groups: DrawGroup[]; matches: DrawMatchProposal[] } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const currentGroups = preview?.groups ?? existingDraw?.groups ?? null;
    if (!over || !currentGroups) return;

    const teamId = String(active.id);
    const targetGroupName = String(over.id);

    const currentGroup = currentGroups.find(g => g.teams.some(t => t.teamId === teamId));
    if (!currentGroup || currentGroup.name === targetGroupName) return;

    const entryToMove = currentGroup.teams.find(t => t.teamId === teamId);
    if (!entryToMove) return;

    const newGroups = currentGroups.map(g => {
      if (g.name === currentGroup.name) {
        return { ...g, teams: g.teams.filter(t => t.teamId !== teamId) };
      }
      if (g.name === targetGroupName) {
        return { ...g, teams: [...g.teams, entryToMove] };
      }
      return g;
    });

    const newMatches = generateDrawMatches(newGroups);
    setPreview({ groups: newGroups, matches: newMatches });
    toast.info(`Equipe movida para o ${targetGroupName} e tabela recalculada!`);
  };

  const refresh = useCallback(async () => {
    const [comps, teams, cts, ms, draws, athletes] = await Promise.all([
      dataAccess.listCompetitions(),
      dataAccess.listTeams(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listMatches(),
      dataAccess.listDraws(),
      typeof dataAccess.listCompetitionAthletes === 'function'
        ? dataAccess.listCompetitionAthletes()
        : Promise.resolve([]),
    ]);
    setCompetitions(comps);
    setTeams(teams);
    setCompetitionTeams(cts);
    setMatches(ms);
    setCompetitionAthletes(athletes);
    const firstId = routeCompetitionId ?? comps[0]?.id ?? '';
    setSelectedId(firstId);
    const draw = draws.find(d => d.competitionId === firstId) ?? null;
    setExistingDraw(draw);
    setDrawStatus(draw?.status ?? 'preview');
    setLoading(false);
  }, [routeCompetitionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = competitions.find(c => c.id === selectedId) ?? null;
  const selectedCompetitionName = selected?.name ?? 'Nenhuma competição selecionada';

  // Avaliação Canônica de Elegibilidade Oficial para Sorteio (Fase 3)
  const eligibilityReport = useMemo(() => {
    if (!selected) return null;
    return CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
      competition: selected,
      competitionTeams,
      athletes: competitionAthletes,
      groupsCount,
    });
  }, [selected, competitionTeams, competitionAthletes, groupsCount]);

  // Apenas equipes oficialmente elegíveis chegam ao motor de sorteio
  const registeredTeams = useMemo(() => {
    if (!eligibilityReport) return [];
    const eligibleTeamIds = new Set(eligibilityReport.eligibleTeams.map(e => e.teamId));
    return teams.filter(t => eligibleTeamIds.has(t.id));
  }, [eligibilityReport, teams]);

  const registeredMatchCount = useMemo(() => {
    if (!selected || registeredTeams.length < 2) return 0;
    const perGroup = Math.ceil(registeredTeams.length / groupsCount);
    return roundRobinMatchCount(perGroup) * Math.min(groupsCount, registeredTeams.length);
  }, [selected, registeredTeams, groupsCount]);

  const canDraw = Boolean(
    eligibilityReport?.canExecuteDraw &&
    registeredTeams.length >= 2 &&
    groupsCount >= 1 &&
    groupsCount <= registeredTeams.length
  );

  const handleCloseRegistrations = async () => {
    if (!selected) return;
    setIsClosingRegs(true);
    try {
      const operator = session?.user?.name || session?.user?.email || 'Organizador';
      const result = await CompetitionLifecycleService.closeRegistrations(selected.id, operator);
      if (result.ok) {
        toast.success(`Inscrições da competição "${selected.name}" encerradas com sucesso!`);
        await refresh();
      } else {
        toast.error('Não foi possível encerrar as inscrições:', {
          description: result.errors.join(' • '),
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao encerrar inscrições.');
    } finally {
      setIsClosingRegs(false);
    }
  };

  const handleSelectCompetition = (id: string) => {
    setSelectedId(id);
    setExistingDraw(null);
    setPreview(null);
    void dataAccess.getDrawByCompetition(id).then(d => setExistingDraw(d));
    if (routeCompetitionId !== id) navigate(`/sorteio/${id}`, { replace: true });
  };

  const handleRunDraw = () => {
    if (operationState !== 'idle') return;
    if (!selected || !canDraw) return;

    const config: DrawConfig = {
      groupsCount,
      seedingMode,
      seed,
      headSeeds: seedingMode === 'seeded' ? headSeeds : [],
    };

    const validation = validateDrawConfig(config, registeredTeams);
    if (!validation.valid) {
      toast.error(formatValidationErrors(validation), {
        duration: 8000,
      });
      return;
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => toast.warning(w, { duration: 5000 }));
    }

    setOperationState('running');
    try {
      const result = runDraw(selected, registeredTeams, config);
      setPreview({ groups: result.groups, matches: result.matches });
      setIsLiveModalOpen(true);
    } finally {
      setOperationState('idle');
    }
  };

  const handleSaveDraw = async () => {
    if (operationState !== 'idle') return;
    if (!selected || !preview) return;

    setOperationState('saving');
    try {
      const config: DrawConfig = {
        groupsCount,
        seedingMode,
        seed,
        headSeeds: seedingMode === 'seeded' ? headSeeds : [],
      };

      const groupCheck = CompetitionBracketService.canModifyGroupStage(selected, matches);
      if (!groupCheck.ok) {
        groupCheck.errors.forEach((err) => toast.error(err, { duration: 6000 }));
        return;
      }

      const validation = validateDrawConfig(config, registeredTeams);
      if (!validation.valid) {
        toast.error(formatValidationErrors(validation), { duration: 8000 });
        return;
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(w => toast.warning(w, { duration: 5000 }));
      }

      const baseDate = selected.startDate ?? new Date().toISOString().slice(0, 10);
      const venueName = selected.venue ?? 'Ginásio Municipal';
      const savedMatches = preview.matches;

      const matchProposals = savedMatches.map((proposal) => {
        const teamA = teams.find(t => t.id === proposal.teamAId);
        const teamB = teams.find(t => t.id === proposal.teamBId);
        const idx = savedMatches.indexOf(proposal);
        const hour = 9 + (idx % 8);
        return {
          round: proposal.round,
          matchNumber: proposal.matchNumber,
          teamAId: proposal.teamAId,
          teamBId: proposal.teamBId,
          teamAName: teamA?.name ?? '',
          teamBName: teamB?.name ?? '',
          teamAShortName: teamA?.shortName ?? '',
          teamBShortName: teamB?.shortName ?? '',
          groupName: proposal.groupName,
          phase: proposal.phase,
          scheduledTime: `${baseDate}T${String(hour).padStart(2, '0')}:00:00`,
          venue: venueName,
        };
      });

      const saveResult = await dataAccess.saveDrawWithMatches(
        {
          competitionId: selected.id,
          config,
          groups: preview.groups,
          matches: preview.matches,
          status: 'preview',
        },
        matchProposals
      );

      // Guarda real de integridade: validar confirmação da persistência antes de avançar o lifecycle
      if (!saveResult || !saveResult.draw || !saveResult.matches || saveResult.matches.length === 0) {
        throw new Error('Falha na persistência do sorteio: nenhuma partida foi salva no banco de dados. O ciclo de vida não foi avançado.');
      }

      setDrawStatus('preview');
      await OperationalAuditService.recordDrawExecution({
        competition: selected,
        operator: session?.user?.name || session?.user?.email || 'Organizador',
        mode: seedingMode,
        groupsCount,
        matchesCount: saveResult.matches.length,
      });

      // Transição canônica de ciclo de vida para 'groups-defined' (Fase 3.2)
      const advanceResult = await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(
        selected.id,
        session?.user?.name || session?.user?.email || 'Organizador',
      );

      if (!advanceResult.ok) {
        throw new Error(advanceResult.errors.join(' '));
      }

      toast.success('Sorteio salvo e jogos gerados!', {
        description: `${saveResult.matches.length} jogos criados na fase classificatória.`,
      });
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar o sorteio.');
    } finally {
      setOperationState('idle');
    }
  };

  const groupsToShow = preview?.groups ?? existingDraw?.groups ?? null;
  const matchesToShow = preview?.matches ?? existingDraw?.matches ?? null;
  const drawnResultForModal: DrawRecord | DrawResult | null = preview
    ? {
        competitionId: selected?.id ?? '',
        config: {
          groupsCount: groupsCount,
          seedingMode,
          seed,
          headSeeds: seedingMode === 'seeded' ? headSeeds : [],
        },
        groups: preview.groups,
        matches: preview.matches,
        status: 'preview',
      }
    : existingDraw ?? null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" />
              Sorteio e Chaveamento
            </span>
          }
          description="Distribua as equipes inscritas em grupos e gere a tabela da fase classificatória"
          secondaryActions={
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ContextualHelpButton
                articles={[
                  { articleId: 'sorteio-grupos', label: 'Como sortear os grupos' },
                  { articleId: 'gerar-confrontos', label: 'Como gerar os confrontos' },
                  { articleId: 'regras-classificacao', label: 'Regras de classificação' },
                ]}
                label="Ajuda no sorteio"
              />
              <div className="w-full sm:w-72">
                <Select value={selectedId} onValueChange={handleSelectCompetition}>
                  <SelectTrigger className="w-full h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue placeholder="Selecione a competição" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {competitions.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />

        <StateContainer
          isLoading={loading}
          isEmpty={!selected}
          emptyTitle="Nenhuma competição selecionada"
          emptyDescription="Cadastre ou selecione uma competição para configurar o chaveamento e realizar o sorteio dos grupos."
        >
          <div className="space-y-5">
            {/* Painel de Diagnóstico de Elegibilidade para o Sorteio (Fase 3) */}
            {eligibilityReport && (
              <Card className="card-elevated shadow-none border border-border bg-card">
                <CardHeader className="p-3.5 pb-2 border-b border-border bg-zinc-900/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-primary" />
                      Preparação do Sorteio & Diagnóstico de Elegibilidade
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] py-0 px-2 h-5 font-mono">
                        Inscritas: {eligibilityReport.totalTeams}
                      </Badge>
                      <Badge variant="default" className="text-[10px] py-0 px-2 h-5 font-mono bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Elegíveis: {eligibilityReport.eligibleCount}
                      </Badge>
                      {eligibilityReport.blockedCount > 0 && (
                        <Badge variant="destructive" className="text-[10px] py-0 px-2 h-5 font-mono">
                          Bloqueadas: {eligibilityReport.blockedCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 space-y-3">
                  {/* Bloqueios impeditivos do torneio */}
                  {eligibilityReport.drawBlockers.length > 0 && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/25 text-red-300 p-3 rounded-md">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <AlertTitle className="text-xs font-semibold text-red-200">Sorteio Bloqueado</AlertTitle>
                      <AlertDescription className="text-xs text-red-300/90 mt-1 space-y-1.5">
                        {eligibilityReport.drawBlockers.map((blocker, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-1">
                            <span>•</span>
                            <span>{blocker}</span>
                          </div>
                        ))}
                        {(selected?.status === 'registration-open' || selected?.status === 'registration') && (
                          <div className="pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-red-500/40 text-red-200 hover:bg-red-500/20 gap-1.5"
                              onClick={handleCloseRegistrations}
                              disabled={isClosingRegs}
                            >
                              <Lock className="w-3 h-3" />
                              {isClosingRegs ? 'Encerrando...' : 'Encerrar Inscrições da Competição Agora'}
                            </Button>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Detalhamento das Equipes Inelegíveis */}
                  {eligibilityReport.ineligibleTeams.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Equipes Bloqueadas ({eligibilityReport.blockedCount}):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {eligibilityReport.ineligibleTeams.map(ineligible => (
                          <div
                            key={ineligible.competitionTeamId}
                            className="p-2.5 rounded-md border border-red-500/20 bg-red-950/20 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-semibold text-foreground">
                              <span>{ineligible.teamName}</span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-red-500/30 text-red-400">
                                {ineligible.athleteCount}/{ineligible.minAthletes} atletas
                              </Badge>
                            </div>
                            {ineligible.blockers.map((blocker, bIdx) => (
                              <p key={bIdx} className="text-[11px] text-red-400/90 leading-tight">
                                • {blocker}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-5 items-start">
            {/* Configuração do sorteio */}
            <Card className="card-elevated shadow-none border border-border bg-card">
              <CardHeader className="p-3.5 pb-2 border-b border-border bg-zinc-900/60">
                <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Dices className="w-3.5 h-3.5 text-primary" />
                  Configuração
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                  {registeredTeams.length} equipe(s) inscrita(s) · {selectedCompetitionName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 p-3.5">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Número de grupos</Label>
                  <Select
                    value={String(groupsCount)}
                    onValueChange={v => {
                      const count = Number(v);
                      setGroupsCount(count);
                      setHeadSeeds(prev => prev.slice(0, count));
                      setPreview(null);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {Array.from({ length: Math.max(1, Math.min(8, registeredTeams.length)) }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)} className="text-xs">
                          {n} {n === 1 ? 'grupo' : 'grupos'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {groupsCount > 1 && (
                    <p className="text-[10px] text-muted-foreground">
                      Sugerido: {suggestGroupsCount(registeredTeams.length)} grupo(s) para {registeredTeams.length} equipes.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Tipo de sorteio</Label>
                  <RadioGroup value={seedingMode} onValueChange={v => { setSeedingMode(v as DrawConfig['seedingMode']); setPreview(null); }} className="space-y-1.5">
<div className="flex items-start space-x-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
                        <RadioGroupItem value="seeded" id="mode-seeded" className="mt-0.5" />
                        <div>
                          <Label htmlFor="mode-seeded" className="font-medium text-xs text-foreground cursor-pointer">Sorteio Dirigido</Label>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            Cabeças de chave são distribuídas uma por grupo e as demais são sorteadas aleatoriamente (padrão FIVB/CBV).
                          </p>
                        </div>
                      </div>
<div className="flex items-start space-x-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
                        <RadioGroupItem value="random" id="mode-random" className="mt-0.5" />
                        <div>
                          <Label htmlFor="mode-random" className="font-medium text-xs text-foreground cursor-pointer">Sorteio Puro</Label>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            Todas as equipes participam do sorteio em condições iguais. Cabeças de chave não serão consideradas neste modo.
                          </p>
                        </div>
                      </div>
                  </RadioGroup>
                </div>

                {seedingMode === 'seeded' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Cabeças de chave (1 por grupo)</Label>
                    <div className="max-h-36 overflow-y-auto border border-zinc-800 rounded-md bg-zinc-900/40 divide-y divide-zinc-800/60">
                      {registeredTeams.map(team => (
                        <label
                          key={team.id}
                          className="flex items-center gap-2 p-2 text-xs hover:bg-zinc-800/40 cursor-pointer"
                        >
                          <Checkbox
                            checked={headSeeds.includes(team.id)}
                            disabled={headSeeds.includes(team.id) && headSeeds.indexOf(team.id) >= groupsCount}
                            onCheckedChange={checked => {
                              setHeadSeeds(prev => {
                                const next = checked
                                  ? [...prev, team.id]
                                  : prev.filter(id => id !== team.id);
                                return next.slice(0, groupsCount);
                              });
                              setPreview(null);
                            }}
                            className="rounded"
                          />
                          <span className="font-medium text-foreground truncate">{team.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{team.shortName}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Máximo {groupsCount} (1 por grupo).
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-end gap-1.5">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="draw-seed" className="text-[10px] uppercase font-semibold text-muted-foreground">Semente (Seed)</Label>
                      <Input
                        id="draw-seed"
                        type="number"
                        value={seed}
                        onChange={e => {
                          setSeed(Number(e.target.value) || 0);
                          setPreview(null);
                        }}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60 gap-1 shrink-0"
                      onClick={() => {
                        setSeed(Math.floor(Math.random() * 100000));
                        setPreview(null);
                      }}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Nova
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    A mesma semente reproduz exatamente o mesmo resultado (registro auditável).
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-1.5">
<Button size="sm" className="w-full gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={handleRunDraw} disabled={!canDraw || operationState !== 'idle'}>
                     <Shuffle className="w-3.5 h-3.5" />
                     Realizar Sorteio
                   </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60"
                    onClick={handleSaveDraw}
                    disabled={!preview || operationState !== 'idle'}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {operationState === 'saving' ? 'Salvando...' : 'Salvar Sorteio e Gerar Jogos'}
                  </Button>
                  {existingDraw && !preview && (
                    <p className="text-[10px] text-center text-muted-foreground pt-1">
                      Sorteio salvo em {new Date(existingDraw.updatedAt).toLocaleString('pt-BR')}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resultado do sorteio */}
            <div className="space-y-4">
              {!canDraw && (
                <Card className="card-elevated shadow-none border border-border bg-card">
                  <CardContent className="p-8 text-center text-xs text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Esta competição precisa de pelo menos 2 equipes inscritas para realizar o sorteio.
                  </CardContent>
                </Card>
              )}

              {canDraw && !groupsToShow && (
                <Card className="card-elevated shadow-none border border-border bg-card">
                  <CardContent className="p-8 text-center space-y-1.5 text-xs text-muted-foreground">
                    <Trophy className="w-8 h-8 mx-auto opacity-50 text-muted-foreground" />
                    <p>
                      Configure o sorteio ao lado e clique em <strong>Realizar Sorteio</strong>.
                    </p>
                    <p className="text-[11px]">
                      {registeredMatchCount > 0 && `${registeredMatchCount} jogos serão gerados na fase classificatória.`}
                    </p>
                  </CardContent>
                </Card>
              )}

              {groupsToShow && (
                <>
                  <DndContext sensors={sensors} onDragEnd={handleGroupDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {groupsToShow.map(group => (
                        <DroppableGroupCard
                          key={group.name}
                          group={group}
                          teams={teams}
                        />
                      ))}
                    </div>
                  </DndContext>

                  <Card className="card-elevated shadow-none border border-border bg-card overflow-hidden">
                    <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-primary" />
                          Tabela de Jogos ({matchesToShow?.length ?? 0} jogos)
                        </CardTitle>
                        {matchesToShow && (
                          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                            {roundRobinRoundCount(Math.ceil((registeredTeams.length ?? 0) / Math.max(groupsCount, 1)))} rodadas por grupo · turno único
                          </CardDescription>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsLiveModalOpen(true)} className="gap-1.5 text-xs h-7 rounded-md border-border hover:bg-zinc-800/60">
                        <MonitorPlay className="w-3 h-3" />
                        Modo Apresentação
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/60 text-left text-[10px] uppercase font-semibold text-muted-foreground bg-zinc-900/40">
                              <th className="p-2.5">Jogo</th>
                              <th className="p-2.5">Rodada</th>
                              <th className="p-2.5">Grupo</th>
                              <th className="p-2.5">Equipe A</th>
                              <th className="p-2.5">Equipe B</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {matchesToShow?.map(match => {
                              const teamA = teams.find(t => t.id === match.teamAId);
                              const teamB = teams.find(t => t.id === match.teamBId);
                              return (
                                <tr key={`${match.matchNumber}-${match.teamAId}-${match.teamBId}`} className="hover:bg-zinc-800/30 transition-colors">
                                  <td className="p-2.5 font-mono font-semibold text-foreground">{match.matchNumber}</td>
                                  <td className="p-2.5 text-muted-foreground">{match.round}ª</td>
                                  <td className="p-2.5"><Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-300">{match.groupName}</Badge></td>
                                  <td className="p-2.5 font-medium text-foreground">{teamA?.name ?? match.teamAId}</td>
                                  <td className="p-2.5 font-medium text-foreground">{teamB?.name ?? match.teamBId}</td>
                                </tr>
                              );
                            })}
                            {(!matchesToShow || matchesToShow.length === 0) && (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">
                                  Nenhum jogo gerado para este sorteio.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Deseja ajustar os horários e quadras?</p>
                      <p className="text-[11px] text-muted-foreground">Acesse a Central de Jogos para definir as datas, horários e quadras de cada confronto.</p>
                    </div>
                    <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none shrink-0" onClick={() => navigate('/jogos')}>
                      <Calendar className="w-3.5 h-3.5" />
                      Ir para Agenda
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {!preview && existingDraw && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Sorteio oficial salvo em {new Date(existingDraw.updatedAt).toLocaleString('pt-BR')}.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </StateContainer>
      </div>

      {selected && groupsToShow && (
        <LiveDrawModal
          isOpen={isLiveModalOpen}
          onClose={() => setIsLiveModalOpen(false)}
          result={drawnResultForModal}
          groups={groupsToShow}
          teams={teams}
          competition={selected}
          drawId={existingDraw?.id}
        />
      )}
    </MainLayout>
  );
};

function DroppableGroupCard({ group, teams }: { group: DrawGroup; teams: TeamRecord[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: group.name,
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'card-elevated shadow-none border border-border bg-card transition-all',
        isOver && 'border-primary ring-1 ring-primary/40 bg-zinc-900/80'
      )}
    >
      <CardHeader className="border-b border-border/60 py-2.5 px-3 bg-zinc-900/40">
        <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center justify-between">
          <span>{group.name}</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">{group.teams.length} equipes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2.5 space-y-1.5 min-h-[100px]">
        {group.teams.map((entry, idx) => {
          const team = teams.find(t => t.id === entry.teamId);
          return (
            <DraggableTeamRow
              key={entry.teamId}
              teamId={entry.teamId}
              idx={idx}
              team={team}
            />
          );
        })}
        {group.teams.length === 0 && (
          <div className="h-16 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-zinc-800 rounded-md">
            Arraste uma equipe para cá
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DraggableTeamRow({
  teamId,
  idx,
  team,
}: {
  teamId: string;
  idx: number;
  team?: TeamRecord;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: teamId,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-grab active:cursor-grabbing transition-all select-none text-xs',
        isDragging && 'opacity-40 shadow-none ring-1 ring-primary'
      )}
    >
      <GripVertical className="w-3 h-3 text-zinc-500 shrink-0" />
      <span className="w-4 h-4 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center text-[9px] font-mono font-bold shrink-0">
        {idx + 1}
      </span>
      {team?.logoUrl && (
        <img src={team.logoUrl} alt="" className="w-5 h-5 rounded object-contain bg-zinc-800 p-0.5" />
      )}
      <span className="font-medium text-foreground truncate">{team?.name ?? teamId}</span>
    </div>
  );
}

export default DrawPage;