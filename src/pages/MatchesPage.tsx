/**
 * MatchesPage — Gestão Profissional de Partidas e Súmulas do BaseOS
 * Rota: /jogos
 *
 * Responsabilidades:
 * - Listagem tabular e grade de confrontos esportivos com filtragem em tempo real
 * - Resumo operacional com métricas consolidadas (Total, Agendadas, Ao Vivo, Encerradas)
 * - Navegação em abas operacionais (Todos, Grupos, Mata-mata, Agenda, Súmulas, Resultados)
 * - Acesso rápido à Mesa do Apontador eletrônica e telão ao vivo
 * - Lançamento de placar com validação matemática estrita por modalidade (Quadra/Praia)
 * - Homologação oficial de resultados e avanço automático de chaveamento de mata-mata
 * - Agendamento e detecção preditiva de conflitos de quadra e descanso
 * - Emissão e exportação de súmulas oficiais e boletins em PDF
 * - Tratamento dos 4 estados universais (Loading, Normal, Empty, Error com Retry) via StateContainer
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia tabular mono para placares, parciais e números de partidas
 * - Componentes universais: MainLayout, PageHeader, SectionCard, StatusBadge, DataTable, StateContainer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  CheckCircle,
  CheckCircle2,
  CheckCheck,
  RotateCcw,
  Award,
  Volleyball,
  FileText,
  Pencil,
  Plus,
  GitBranch,
  FileSpreadsheet,
  Sparkles,
  Maximize2,
  UserCheck,
  Shield,
  MoreHorizontal,
  Table,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { dataAccess } from '@/services/dataAccess';
import { generateMatchesBoletimPdf, downloadReportsPdf, type MatchBoletimRow } from '@/lib/pdf/reportsPdf';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import { BlankSheetEmitDialog } from '@/components/match/BlankSheetEmitDialog';
import { CompetitionBracketService } from '@/services/competitionBracketService';
import { GenericTournamentBracket } from '@/components/competition/bracket';
import { useCompetitionBracket } from '@/hooks/useCompetitionBracket';
import {
  advancePlayoffMatches,
  buildPlayoffMatches,
  type PlayoffMatchSlot,
} from '@/services/playoffsService';
import { computeStandingsByGroup } from '@/services/standingsService';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';
import { useCapability } from '@/hooks/useCapability';
import { useAuth } from '@/components/auth/useAuth';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { LiveScorerDeskModal } from '@/components/match/LiveScorerDeskModal';
import { LiveScoreboardModal } from '@/components/match/LiveScoreboardModal';
import { MatchCheckinModal } from '@/components/match/MatchCheckinModal';
import { RefereeAssignmentModal } from '@/components/match/RefereeAssignmentModal';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { cn } from '@/lib/utils';

// Componentes Modularizados (Fase 9.3)
import { MatchMetricsCards } from '@/components/match/MatchMetricsCards';
import { MatchFiltersBar } from '@/components/match/MatchFiltersBar';
import { MatchTabsNav, type MatchesSubTab } from '@/components/match/MatchTabsNav';
import { ScheduleMatchDialog } from '@/components/match/dialogs/ScheduleMatchDialog';
import { ResultValidationDialog } from '@/components/match/dialogs/ResultValidationDialog';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { OperationalAuditService } from '@/services/operationalAuditService';
import { CompetitionRuntimeService } from '@/services/competitionRuntimeService';

export interface MatchView {
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

function toMatchView(
  match: MatchRecord,
  competition: CompetitionRecord | null,
  teamById: Map<string, TeamRecord>,
): MatchView {
  const scoreA = match.sets.filter((s) => s.scoreA > s.scoreB).length;
  const scoreB = match.sets.filter((s) => s.scoreB > s.scoreA).length;
  const hasResult =
    (match.status === 'completed' || match.status === 'homologated') && match.sets.length > 0;
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
    sets: match.sets.map((s) => ({ a: s.scoreA, b: s.scoreB })),
  };
}

export function MatchesPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { can, canSubmitMatchScore } = useCapability();

  // Estados de dados
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);

  // Estados de controle e interface
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<MatchesSubTab>('todos');

  // Estados de filtros
  const [query, setQuery] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Estados de Modais
  const [editMatch, setEditMatch] = useState<MatchRecord | null>(null);
  const [resultMatch, setResultMatch] = useState<MatchRecord | null>(null);
  const [sheetMatch, setSheetMatch] = useState<MatchView | null>(null);
  const [blankSheetOpen, setBlankSheetOpen] = useState(false);
  const [pendingHomologateMatch, setPendingHomologateMatch] = useState<MatchRecord | null>(null);
  const [liveScorerMatch, setLiveScorerMatch] = useState<MatchRecord | null>(null);
  const [liveScoreboardMatch, setLiveScoreboardMatch] = useState<MatchRecord | null>(null);
  const [checkinMatch, setCheckinMatch] = useState<MatchRecord | null>(null);
  const [refereeMatch, setRefereeMatch] = useState<MatchRecord | null>(null);
  const [pendingSyncPlayoffs, setPendingSyncPlayoffs] = useState(false);
  const [playoffViewMode, setPlayoffViewMode] = useState<'bracket' | 'table'>('bracket');

  const activeCompId = competitionFilter !== 'all' ? competitionFilter : (competitions[0]?.id || null);
  const { viewModel: bracketViewModel, reprocessRuntime, refetch: refetchBracket } = useCompetitionBracket(activeCompId);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [rawMatches, rawCompetitions, rawTeams, rawVenues] = await Promise.all([
        dataAccess.listMatches(),
        dataAccess.listCompetitions(),
        dataAccess.listTeams(),
        dataAccess.listVenues(),
      ]);
      setMatches(rawMatches);
      setCompetitions(rawCompetitions);
      setTeams(rawTeams);
      setVenues(rawVenues);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar as partidas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const compById = useMemo(() => new Map(competitions.map((c) => [c.id, c])), [competitions]);

  const matchViews = useMemo(() => {
    return matches.map((m) => toMatchView(m, compById.get(m.competitionId) ?? null, teamById));
  }, [matches, compById, teamById]);

  // Filtragem de partidas
  const filteredMatches = useMemo(() => {
    return matchViews.filter((m) => {
      // Filtro por sub-aba
      if (activeSubTab === 'grupos' && m.phase !== 'group-stage' && m.phase !== 'classificatória') return false;
      if (activeSubTab === 'mata-mata' && (m.phase === 'group-stage' || m.phase === 'classificatória')) return false;
      if (activeSubTab === 'sumulas' && (m.status === 'awaiting_schedule' || !m.court)) return false;
      if (activeSubTab === 'resultados' && m.status !== 'completed' && m.status !== 'homologated') return false;

      // Filtros de seleção
      if (competitionFilter !== 'all' && m.record.competitionId !== competitionFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      // Filtro por texto em tempo real
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${m.teamA.name} ${m.teamB.name} ${m.teamA.shortName} ${m.teamB.shortName} ${m.venue} ${m.court || ''} ${m.competition} ${m.phase || ''} ${m.groupName || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [matchViews, activeSubTab, competitionFilter, statusFilter, query]);

  // Métricas do resumo operacional
  const scheduledCount = useMemo(
    () => matches.filter((m) => m.status === 'scheduled' || m.status === 'awaiting_schedule').length,
    [matches],
  );
  const liveCount = useMemo(() => matches.filter((m) => m.status === 'in-progress').length, [matches]);
  const completedCount = useMemo(
    () => matches.filter((m) => m.status === 'completed' || m.status === 'homologated').length,
    [matches],
  );
  const pendingHomologationCount = useMemo(
    () => matches.filter((m) => m.status === 'completed').length,
    [matches],
  );

  // Homologar resultado individual
  const handleHomologate = async (matchId: string) => {
    if (!can('match:finalize')) {
      toast.error('Você não possui permissão para homologar resultados de partidas.');
      return;
    }

    const currentMatch = matches.find((m) => m.id === matchId);
    if (!currentMatch) return;

    // Validação canônica do resultado antes de oficializar
    const comp = compById.get(currentMatch.competitionId);
    const canonical = CompetitionRulesService.getCanonicalMatchResult(comp, currentMatch);
    if (!canonical.isValid) {
      toast.error(canonical.inconsistencyReason || 'Não é possível homologar resultado matematicamente inválido ou incompleto.');
      return;
    }

    const now = new Date().toISOString();
    const operator = session?.user?.name || 'Administrador';

    await dataAccess.updateMatch(matchId, {
      status: 'homologated',
      homologatedAt: now,
      homologatedBy: operator,
      winnerId: canonical.winnerId ?? currentMatch.winnerId,
    });

    // Avançar chaveamento e progressão
    const compSlots = await dataAccess.listMatchSlots(currentMatch.competitionId);
    if (compSlots.length > 0) {
      // Motor novo: Single Progression Engine via CompetitionRuntimeService
      await CompetitionRuntimeService.handleMatchCompleted(currentMatch.competitionId, matchId);
    } else if (currentMatch.round && (canonical.winnerId || currentMatch.winnerId)) {
      // Fallback legado exclusivo para competições antigas sem MatchSlots relacionais
      const comp = competitions.find((c) => c.id === currentMatch.competitionId);
      const compMatches = matches.filter((m) => m.competitionId === currentMatch.competitionId);
      const updatedList = compMatches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              status: 'homologated' as const,
              winnerId: canonical.winnerId ?? currentMatch.winnerId,
            }
          : m,
      );
      const { updatedMatches, changed } = CompetitionBracketService.advancePlayoffBrackets(
        comp!,
        updatedList,
        teams,
      );
      if (changed) {
        for (const adv of updatedMatches) {
          if (adv.id !== currentMatch.id) {
            await dataAccess.updateMatch(adv.id, {
              teamAId: adv.teamAId,
              teamBId: adv.teamBId,
              teamAName: adv.teamAName,
              teamBName: adv.teamBName,
              teamAShortName: adv.teamAShortName,
              teamBShortName: adv.teamBShortName,
            });
          }
        }
      }
    }

    const winnerTeam = teams.find((t) => t.id === (canonical.winnerId ?? currentMatch.winnerId));
    await OperationalAuditService.recordMatchHomologation({
      match: currentMatch,
      competition: competitions.find((c) => c.id === currentMatch.competitionId),
      operator,
      winnerName: winnerTeam?.name,
    });

    toast.success('Resultado homologado com sucesso! Chaveamento e classificação oficializados.');
    await refresh();
    await refetchBracket();
  };

  // Reabrir partida homologada
  const handleReopenMatch = async (match: MatchRecord) => {
    if (!can('match:reopen') && !can('match:finalize')) {
      toast.error('Permissão insuficiente para reabrir partidas.');
      return;
    }
    const operator = session?.user?.name || session?.user?.email || 'Administrador';
    await dataAccess.updateMatch(match.id, {
      status: 'completed',
      homologatedAt: undefined,
      homologatedBy: undefined,
    });
    await OperationalAuditService.recordMatchReopen({
      match,
      competition: competitions.find((c) => c.id === match.competitionId),
      operator,
    });
    toast.info(`Jogo #${match.matchNumber} reaberto para status 'Realizado' (pendente de homologação).`);
    await refresh();
  };

  // Homologar todas as partidas pendentes da visão atual
  const handleHomologateAllCompleted = async () => {
    if (!can('match:finalize')) {
      toast.error('Permissão insuficiente para homologar partidas.');
      return;
    }
    const pending = matches.filter(
      (m) => m.status === 'completed' && (competitionFilter === 'all' || m.competitionId === competitionFilter),
    );
    if (pending.length === 0) {
      toast.info('Nenhuma partida aguardando homologação.');
      return;
    }
    for (const m of pending) {
      await handleHomologate(m.id);
    }
    toast.success(`${pending.length} partida(s) homologada(s) oficialmente com sucesso!`);
    await refresh();
  };

  // Sincronizar confrontos eliminatórios a partir da fase de grupos
  const handleSyncPlayoffsFromGroups = async () => {
    if (!can('competition:edit')) {
      toast.error('Permissão insuficiente para sincronizar playoffs.');
      return;
    }

    const targetCompId = competitionFilter !== 'all' ? competitionFilter : competitions[0]?.id;
    if (!targetCompId) {
      toast.error('Selecione uma competição específica para gerar o chaveamento.');
      return;
    }

    const comp = competitions.find((c) => c.id === targetCompId);
    if (!comp) return;

    try {
      const compMatches = matches.filter((m) => m.competitionId === targetCompId);
      const compTeams = await dataAccess.listCompetitionTeams();
      const currentCompTeams = compTeams.filter((ct) => ct.competitionId === targetCompId);

      const registrations = currentCompTeams
        .map((ct) => {
          const t = teams.find((team) => team.id === ct.teamId);
          if (!t) return null;
          const matchInGroup = compMatches.find((m) => m.teamAId === t.id || m.teamBId === t.id);
          return { team: t, groupName: matchInGroup?.groupName || 'A' };
        })
        .filter(Boolean) as { team: TeamRecord; groupName: string }[];

      const groupStandings = computeStandingsByGroup(registrations, compMatches, {
        competition: comp,
      });

      const check = CompetitionBracketService.canModifyPlayoffs(comp, compMatches);
      if (!check.ok) {
        check.errors.forEach((err) => toast.error(err));
        return;
      }

      const slots = CompetitionBracketService.generatePlayoffSlots(comp, groupStandings);
      if (slots.length === 0) {
        toast.info(`Geração automática disponível para 1, 2 ou 4 grupos. Torneio configurado com ${comp.groupsCount} grupos.`);
        return;
      }

      const generatedMatches = CompetitionBracketService.buildPlayoffMatchRecords(
        comp,
        slots,
        teams,
        compMatches.length + 1,
      );
      let createdCount = 0;

      for (const m of generatedMatches) {
        const existing = compMatches.find((em) => em.matchNumber === m.matchNumber && em.phase === m.phase);
        if (!existing) {
          await dataAccess.createMatch(m);
          createdCount++;
        } else {
          await dataAccess.updateMatch(existing.id, {
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            teamAName: m.teamAName,
            teamBName: m.teamBName,
            teamAShortName: m.teamAShortName,
            teamBShortName: m.teamBShortName,
          });
        }
      }

      await OperationalAuditService.recordPlayoffSync({
        competition: comp,
        operator: session?.user?.name || session?.user?.email || 'Administrador',
        createdCount,
        updatedCount: generatedMatches.length - createdCount,
      });

      toast.success(
        createdCount > 0
          ? `${createdCount} novos confrontos eliminatórios gerados com sucesso!`
          : 'Confrontos eliminatórios sincronizados com a classificação atual!',
      );
      await refresh();
    } catch (err: unknown) {
      toast.error('Erro ao sincronizar playoffs:', {
        description: err instanceof Error ? err.message : 'Falha no cálculo de chaveamento.',
      });
    }
  };

  const handleExportBoletim = () => {
    const targetComp = competitions.find((c) => c.id === competitionFilter) || competitions[0];
    const compName = targetComp ? targetComp.name : 'Geral';
    const boletimRows: MatchBoletimRow[] = filteredMatches.map((m) => ({
      matchNumber: m.record.matchNumber,
      round: m.record.round ?? 1,
      phase: m.phase,
      groupName: m.groupName,
      date: new Date(m.date).toLocaleDateString('pt-BR'),
      time: m.time,
      venue: m.venue,
      court: m.court,
      teamAName: m.teamA.name,
      teamAShort: m.teamA.shortName,
      teamALogo: m.teamA.logoUrl,
      teamBName: m.teamB.name,
      teamBShort: m.teamB.shortName,
      teamBLogo: m.teamB.logoUrl,
      scoreA: m.teamA.score,
      scoreB: m.teamB.score,
      statusLabel: m.status === 'completed' ? 'Encerrado' : m.status === 'in-progress' ? 'Ao Vivo' : 'Agendado',
    }));
    const doc = generateMatchesBoletimPdf(boletimRows, compName);
    downloadReportsPdf(doc, `boletim_jogos_${compName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
    toast.success('Boletim oficial de jogos gerado com sucesso!');
  };

  // Configuração das colunas da DataTable Oficial com larguras balanceadas
  const columns: DataTableColumn<MatchView>[] = [
    {
      id: 'matchNumber',
      header: 'Nº Jogo',
      isNumeric: true,
      headerClassName: 'w-14 text-center',
      className: 'w-14 text-center font-mono font-semibold text-foreground',
      cell: ({ row }) => (
        <span>#{row.record.matchNumber}</span>
      ),
    },
    {
      id: 'match',
      header: 'Confronto',
      className: 'min-w-[160px]',
      cell: ({ row }) => {
        const isWinnerA = row.record.winnerId === row.record.teamAId;
        const isWinnerB = row.record.winnerId === row.record.teamBId;

        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-xs font-semibold">
              <span className={cn('truncate max-w-[120px]', isWinnerA ? 'text-primary font-bold' : 'text-foreground')}>
                {row.teamA.name}
              </span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400 font-mono shrink-0">
                {row.teamA.shortName}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-normal px-0.5">vs</span>
              <span className={cn('truncate max-w-[120px]', isWinnerB ? 'text-primary font-bold' : 'text-foreground')}>
                {row.teamB.name}
              </span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400 font-mono shrink-0">
                {row.teamB.shortName}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {row.competition} {row.phase ? `· ${row.phase}` : ''} {row.groupName ? `(${row.groupName})` : ''}
            </p>
          </div>
        );
      },
    },
    {
      id: 'score',
      header: 'Placar',
      align: 'center',
      headerClassName: 'w-28 text-center',
      className: 'w-28 text-center',
      cell: ({ row }) => {
        const isFinished = row.status === 'completed' || row.status === 'homologated';
        if (isFinished && row.teamA.score !== undefined && row.teamB.score !== undefined) {
          return (
            <div className="inline-flex flex-col items-center">
              <span className="font-bold font-mono text-xs tabular-nums text-foreground bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {row.teamA.score} - {row.teamB.score}
              </span>
              {row.sets && row.sets.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[9px] text-muted-foreground font-mono tabular-nums">
                  {row.sets.map((s, idx) => (
                    <span key={idx} className="px-0.5 py-0.2 rounded bg-zinc-800/80">
                      {s.a}-{s.b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground font-mono">—</span>;
      },
    },
    {
      id: 'schedule',
      header: 'Data & Local',
      headerClassName: 'w-36',
      className: 'w-36',
      cell: ({ row }) => (
        <div className="text-xs min-w-0">
          <p className="font-medium text-foreground flex items-center gap-1 font-mono tabular-nums text-[11px]">
            <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
            {new Date(row.date).toLocaleDateString('pt-BR')} {row.time}
          </p>
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
            {row.court || row.venue}
          </p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      headerClassName: 'w-24 text-center',
      className: 'w-24 text-center',
      cell: ({ row }) => (
        <StatusBadge status={row.status} className="text-[10px] h-5" />
      ),
    },
    {
      id: 'actions',
      header: 'Ações / Homologar',
      align: 'right',
      headerClassName: 'w-44 text-right',
      className: 'w-44 text-right',
      cell: ({ row }) => {
        const isFinished = row.status === 'completed' || row.status === 'homologated';
        const isHomologated = row.status === 'homologated';

        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Ação Primária em Destaque */}
            {row.status === 'completed' && can('match:finalize') ? (
              <Button
                variant="default"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm border border-emerald-500/30 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingHomologateMatch(row.record);
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Homologar
              </Button>
            ) : isHomologated ? (
              <Badge variant="outline" className="h-6 px-1.5 text-[10px] font-medium border-emerald-800/60 bg-emerald-950/40 text-emerald-400 gap-1 shrink-0">
                <Award className="w-3 h-3 text-emerald-400" />
                Homologado
              </Badge>
            ) : canSubmitMatchScore(row.record) ? (
              <Button
                size="sm"
                className="h-7 px-2 text-xs gap-1 font-medium shadow-none shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setLiveScorerMatch(row.record);
                }}
              >
                <Volleyball className="w-3 h-3" />
                Mesa
              </Button>
            ) : null}

            {/* Menu Dropdown Completo */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-zinc-800 rounded-md shrink-0"
                  aria-label={`Ações para o jogo #${row.record.matchNumber}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-zinc-800 text-xs">
                {/* Opção de Homologação no Menu */}
                {row.status === 'completed' && can('match:finalize') && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-emerald-400 focus:text-emerald-300 font-semibold bg-emerald-950/30"
                    onClick={() => setPendingHomologateMatch(row.record)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Homologar Resultado Oficial
                  </DropdownMenuItem>
                )}

                {isHomologated && (can('match:reopen') || can('match:finalize')) && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-amber-400 focus:text-amber-300"
                    onClick={() => handleReopenMatch(row.record)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reabrir / Desomologar Jogo
                  </DropdownMenuItem>
                )}

                {canSubmitMatchScore(row.record) && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-primary focus:text-primary"
                    onClick={() => setLiveScorerMatch(row.record)}
                  >
                    <Volleyball className="w-3.5 h-3.5" />
                    Mesa do Apontador
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => setLiveScoreboardMatch(row.record)}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Telão ao Vivo
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => setSheetMatch(row)}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Emitir Súmula Oficial
                </DropdownMenuItem>

                {can('match:edit') && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => setCheckinMatch(row.record)}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Check-in de Atletas
                  </DropdownMenuItem>
                )}

                {can('match:edit') && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => setRefereeMatch(row.record)}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Escalar Arbitragem
                  </DropdownMenuItem>
                )}

                {can('match:edit') && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => setEditMatch(row.record)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar / Reagendar
                  </DropdownMenuItem>
                )}

                {canSubmitMatchScore(row.record) && !isHomologated && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-amber-400 focus:text-amber-300"
                    onClick={() => setResultMatch(row.record)}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Lançar Placar Rápido
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-3.5">
        {/* ── PageHeader Oficial ── */}
        <PageHeader
          title="Gestão de Partidas"
          description="Controle operacional, agendamento de quadras, mesa do apontador, placares e homologação de súmulas."
          primaryAction={
            can('match:create') && (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => navigate('/jogos/novo')}
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Confronto
              </Button>
            )
          }
          secondaryActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBlankSheetOpen(true)}
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                Súmula em Branco
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportBoletim}
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
                disabled={matches.length === 0}
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                Gerar Boletim
              </Button>
              <ContextualHelpButton
                articles={[
                  { articleId: 'abrir-partida', label: 'Check-in e início de partida' },
                  { articleId: 'lancar-resultado-sets', label: 'Como lançar placar e parciais' },
                  { articleId: 'gerar-sumula', label: 'Visualizar e emitir súmulas' },
                  { articleId: 'faq-correcao-placar', label: 'Como corrigir placar errado' },
                ]}
                label="Ajuda em jogos"
              />
            </div>
          }
        />

        {/* ── Gestão de Estados Universais ── */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar as partidas"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={matches.length === 0}
          emptyTitle="Nenhuma partida programada"
          emptyDescription="Cadastre o primeiro confronto esportivo ou gere os confrontos automáticos a partir do sorteio de grupos."
          emptyAction={
            can('match:create') ? (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => navigate('/jogos/novo')}
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Primeiro Confronto
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-3.5">
            {/* ── Resumo Operacional (Modularizado) ── */}
            <MatchMetricsCards
              totalCount={matches.length}
              scheduledCount={scheduledCount}
              liveCount={liveCount}
              completedCount={completedCount}
            />

            {/* ── Navegação em Abas Operacionais (Modularizado) ── */}
            <MatchTabsNav
              activeSubTab={activeSubTab}
              onTabChange={setActiveSubTab}
            />

            {/* Banners Contextuais e Seletor de Modo na Aba Mata-mata */}
            {activeSubTab === 'mata-mata' && (
              <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-semibold text-foreground text-xs">
                    <GitBranch className="w-3.5 h-3.5 text-primary" />
                    Chaveamento Eliminatório e Mata-mata
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Visualize a árvore estrutural do chaveamento ou opere as partidas em formato de tabela.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Segmented Control: Chaveamento Visual vs Tabela */}
                  <div className="inline-flex p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setPlayoffViewMode('bracket')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        playoffViewMode === 'bracket'
                          ? 'bg-zinc-800 text-foreground font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-foreground'
                      )}
                    >
                      <GitBranch className="w-3.5 h-3.5 text-primary" />
                      Chaveamento Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayoffViewMode('table')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        playoffViewMode === 'table'
                          ? 'bg-zinc-800 text-foreground font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-foreground'
                      )}
                    >
                      <Table className="w-3.5 h-3.5" />
                      Tabela de Jogos
                    </button>
                  </div>

                  {/* Fallback de sincronização se a competição não possuir MatchSlots relacionais */}
                  {(!bracketViewModel || !bracketViewModel.hasMatchSlots) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 text-xs h-8 rounded-md shrink-0 bg-zinc-800 hover:bg-zinc-700 text-foreground border border-zinc-700/60 font-medium"
                      onClick={handleSyncPlayoffsFromGroups}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Sincronizar Grupos
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Banner de Homologação Pendente */}
            {pendingHomologationCount > 0 && can('match:finalize') && (
              <div className="p-3 px-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-900/50 border border-emerald-700/50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-300">
                      {pendingHomologationCount} partida(s) finalizada(s) aguardando homologação oficial
                    </h4>
                    <p className="text-[11px] text-emerald-400/80 leading-tight">
                      A homologação confirma os resultados para a classificação e avança o chaveamento de mata-mata.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm shrink-0 border border-emerald-500/40"
                  onClick={handleHomologateAllCompleted}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Homologar Todos os Resultados ({pendingHomologationCount})
                </Button>
              </div>
            )}

            {/* ── Exibição em Chaveamento Visual ou Tabela Principal ── */}
            {activeSubTab === 'mata-mata' && playoffViewMode === 'bracket' && bracketViewModel && bracketViewModel.stages.length > 0 ? (
              <SectionCard density="default">
                <GenericTournamentBracket
                  viewModel={bracketViewModel}
                  onOpenMatch={(matchId) => {
                    const found = matches.find((m) => m.id === matchId);
                    if (found) setLiveScorerMatch(found);
                  }}
                  onReprocessRuntime={reprocessRuntime}
                />
              </SectionCard>
            ) : (
              <SectionCard density="dense">
                {/* Barra de Filtros (Modularizado) */}
                <MatchFiltersBar
                  query={query}
                  onQueryChange={setQuery}
                  competitionFilter={competitionFilter}
                  onCompetitionFilterChange={setCompetitionFilter}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  competitions={competitions}
                />

                {/* DataTable Oficial */}
                <DataTable
                  data={filteredMatches}
                  columns={columns}
                  emptyTitle="Nenhum confronto encontrado para os filtros selecionados"
                  emptyDescription="Tente alterar os termos de busca, selecionar outra competição ou alternar a aba operacional."
                />
              </SectionCard>
            )}
          </div>
        </StateContainer>
      </div>

      {/* ── Modais Auxiliares (Modularizados) ── */}
      {editMatch && (
        <ScheduleMatchDialog
          match={editMatch}
          competition={compById.get(editMatch.competitionId) || null}
          allMatches={matches}
          teams={teams}
          venues={venues}
          onClose={() => setEditMatch(null)}
          onSaved={async (updates) => {
            await dataAccess.updateMatch(editMatch.id, updates);
            await OperationalAuditService.recordMatchEdit({
              match: editMatch,
              competition: compById.get(editMatch.competitionId),
              operator: session?.user?.name || session?.user?.email || 'Administrador',
              updates,
            });
            toast.success('Confronto e agendamento salvos com sucesso!');
            setEditMatch(null);
            await refresh();
          }}
        />
      )}

      {resultMatch && (
        <ResultValidationDialog
          match={resultMatch}
          competition={compById.get(resultMatch.competitionId) || null}
          onClose={() => setResultMatch(null)}
          onSaved={async (sets, winnerId) => {
            const comp = compById.get(resultMatch.competitionId);
            if (comp && !CompetitionLifecycleService.canRecordResult(comp, resultMatch)) {
              toast.error('Não é possível registrar resultado em competição encerrada ou cancelada.');
              return;
            }
            await dataAccess.updateMatch(resultMatch.id, {
              sets,
              winnerId,
              status: 'completed',
            });
            const winnerTeam = teams.find((t) => t.id === winnerId);
            await OperationalAuditService.recordMatchResult({
              match: resultMatch,
              competition: comp,
              operator: session?.user?.name || session?.user?.email || 'Administrador',
              newSets: sets,
              winnerId,
              winnerName: winnerTeam?.name,
            });
            // Se a competição ainda não possui snapshot congelado, congela no primeiro resultado
            if (comp && !comp.rulesSnapshot) {
              const frozen = CompetitionLifecycleService.freezeRulesSnapshot(comp);
              if (frozen.rulesSnapshot) {
                await dataAccess.updateCompetition(comp.id, { rulesSnapshot: frozen.rulesSnapshot });
              }
            }
            toast.success('Resultado lançado com sucesso! Partida aguardando homologação.');
            setResultMatch(null);
            await refresh();
          }}
        />
      )}

      {sheetMatch && (
        <MatchSheetEmitDialog
          open={sheetMatch !== null}
          onOpenChange={(open) => !open && setSheetMatch(null)}
          match={sheetMatch.record}
          competition={compById.get(sheetMatch.record.competitionId) || null}
        />
      )}

      <BlankSheetEmitDialog open={blankSheetOpen} onOpenChange={setBlankSheetOpen} />

      <ConfirmActionDialog
        open={pendingHomologateMatch !== null}
        onOpenChange={(open) => !open && setPendingHomologateMatch(null)}
        title="Homologar Resultado da Partida"
        variant="accent"
        description={
          pendingHomologateMatch
            ? `Deseja homologar oficialmente o resultado do Jogo #${pendingHomologateMatch.matchNumber} (${pendingHomologateMatch.teamAName} vs ${pendingHomologateMatch.teamBName})? Esta ação oficializa a classificação e avança os chaveamentos eliminatórios.`
            : ''
        }
        confirmText="Confirmar Homologação"
        onConfirm={async () => {
          if (pendingHomologateMatch) {
            await handleHomologate(pendingHomologateMatch.id);
            setPendingHomologateMatch(null);
          }
        }}
      />

      <ConfirmActionDialog
        open={pendingSyncPlayoffs}
        onOpenChange={setPendingSyncPlayoffs}
        title="Gerar / Sincronizar Chaveamento Eliminatório"
        variant="accent"
        description="Esta ação processará a classificação da fase de grupos e preencherá automaticamente os confrontos de mata-mata com os classificados. Deseja prosseguir?"
        confirmText="Gerar Confrontos"
        onConfirm={async () => {
          await handleSyncPlayoffsFromGroups();
          setPendingSyncPlayoffs(false);
        }}
      />

      <LiveScorerDeskModal
        open={liveScorerMatch !== null}
        onOpenChange={(open) => !open && setLiveScorerMatch(null)}
        match={liveScorerMatch}
        competition={
          liveScorerMatch ? competitions.find((c) => c.id === liveScorerMatch.competitionId) || null : null
        }
        onMatchUpdated={async () => {
          await refresh();
          await refetchBracket();
        }}
      />

      <LiveScoreboardModal
        open={liveScoreboardMatch !== null}
        onOpenChange={(open) => !open && setLiveScoreboardMatch(null)}
        match={liveScoreboardMatch}
        competition={
          liveScoreboardMatch ? competitions.find((c) => c.id === liveScoreboardMatch.competitionId) || null : null
        }
      />

      <MatchCheckinModal
        open={checkinMatch !== null}
        onOpenChange={(open) => !open && setCheckinMatch(null)}
        match={checkinMatch}
        competition={
          checkinMatch ? competitions.find((c) => c.id === checkinMatch.competitionId) || null : null
        }
        onCheckinSaved={refresh}
      />

      <RefereeAssignmentModal
        open={refereeMatch !== null}
        onOpenChange={(open) => !open && setRefereeMatch(null)}
        match={refereeMatch}
        allMatches={matches}
        onAssignmentSaved={refresh}
      />
    </MainLayout>
  );
}

export default MatchesPage;