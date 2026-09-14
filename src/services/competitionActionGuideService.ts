/**
 * BaseOS — Serviço de Guia de Ação e UX Operacional (Fase 8.4)
 *
 * Responsabilidade:
 * Função pura, determinística e somente-leitura que orienta o organizador por
 * AÇÕES DE NEGÓCIO reais, respondendo:
 *   1. Onde estou? (Status esportivo amigável, fase da jornada)
 *   2. O que já está resolvido? (Vagas preenchidas, quórum, sorteio)
 *   3. O que está pendente? (Análise de inscrições, capacidade, elencos)
 *   4. O que posso fazer agora? (Ações contextuais)
 *   5. Qual é o próximo passo recomendado? (Ação primária de destaque)
 *
 * Diretrizes:
 * - NUNCA expor enums técnicos brutos ao organizador como fluxo obrigatório
 * - NUNCA inferir capacidade (config.registration.maxTeams deve ser explícito)
 * - Equipe submitted NUNCA aparece como confirmada
 * - Equipe approved ocupa capacidade
 * - is_locked não impede elegibilidade para sorteio
 * - Reabertura de inscrições é contextual de exceção, nunca obrigatória
 */

import type {
  CompetitionRecord,
  CompetitionLifecycleStatus,
  MatchRecord,
} from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';
import type { DrawRecord } from '@/types/draw';
import {
  CompetitionRegistrationService,
} from '@/services/competitionRegistrationService';
import {
  CompetitionDrawEligibilityService,
} from '@/services/competitionDrawEligibilityService';
import {
  buildRegistrationsUrl,
  buildDrawUrl,
  buildMatchesUrl,
  buildPlayoffsUrl,
  buildReportsUrl,
  buildCompetitionUrl,
} from '@/services/competitionNavigationHelper';

export type ActionGuideScenario =
  | 'NO_TEAMS'
  | 'REGISTRATION_OPEN'
  | 'PENDING_REVIEWS'
  | 'CAPACITY_REACHED'
  | 'READY_FOR_DRAW'
  | 'DRAW_BLOCKED'
  | 'GROUPS_DEFINED'
  | 'IN_PROGRESS'
  | 'PLAYOFFS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ActionPendingItem {
  id: string;
  message: string;
  severity: 'blocker' | 'warning' | 'info';
  route?: string;
  actionLabel?: string;
}

export interface CompetitionActionGuide {
  scenario: ActionGuideScenario;

  // 1. Onde estou?
  stageLabel: string;
  statusBadge: {
    label: string;
    variant: 'default' | 'outline' | 'secondary' | 'destructive';
    className?: string;
  };

  // 2. Próximo passo recomendado
  title: string;
  subtitle: string;
  description: string;
  primaryAction: {
    label: string;
    route: string;
    actionType: 'navigate' | 'close_registrations' | 'reopen_registrations';
  };
  secondaryAction?: {
    label: string;
    route?: string;
    articleId?: string;
    guideLabel?: string;
  };

  // 3. O que já está resolvido?
  resolvedPoints: string[];

  // 4. O que está pendente?
  pendingPoints: ActionPendingItem[];

  // 5. Capacidade Operacional
  capacity: {
    isConfigured: boolean;
    maxTeams: number;
    confirmedCount: number;
    submittedCount: number;
    availableSpots: number;
    isFull: boolean;
    displayText: string;
  };

  // 6. Sorteio Oficial
  drawEligibility: {
    canExecuteDraw: boolean;
    eligibleCount: number;
    totalTeams: number;
    minRequired: number;
    blockers: string[];
  };

  // Ações de exceção / contextuais
  canReopenRegistrations: boolean;
  canCloseRegistrations: boolean;
}

export interface EvaluateCompetitionActionGuideData {
  competition: CompetitionRecord;
  competitionTeams: CompetitionTeam[];
  matches?: MatchRecord[];
  draws?: DrawRecord[];
  athletes?: CompetitionAthlete[];
  canEdit?: boolean;
}

/**
 * Traduz o status do ciclo de vida em rótulos amigáveis de negócio.
 */
export function getBusinessStatusLabel(status: CompetitionLifecycleStatus): string {
  switch (status) {
    case 'planning':
      return 'Em preparação';
    case 'registration-open':
    case 'registration':
      return 'Inscrições abertas';
    case 'registration-closed':
      return 'Inscrições encerradas';
    case 'draw-pending':
      return 'Sorteio pendente';
    case 'groups-defined':
      return 'Grupos definidos';
    case 'in-progress':
      return 'Em andamento';
    case 'playoffs':
      return 'Mata-mata';
    case 'completed':
      return 'Finalizado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Em preparação';
  }
}

/**
 * Avalia o guia de ação operacional da competição de forma pura e determinística.
 */
export function evaluateCompetitionActionGuide(
  data: EvaluateCompetitionActionGuideData,
): CompetitionActionGuide {
  const { competition, competitionTeams, matches = [], draws = [], athletes = [] } = data;

  const resolvedCapacity = CompetitionRegistrationService.getCapacity(competition);
  const confirmedTeams = competitionTeams.filter((t) => t.status === 'approved');
  const submittedTeams = competitionTeams.filter((t) => t.status === 'submitted');

  const confirmedCount = confirmedTeams.length;
  const submittedCount = submittedTeams.length;
  const maxTeams = resolvedCapacity.maxTeams;
  const isCapacityConfigured = resolvedCapacity.isConfigured;
  const availableSpots = isCapacityConfigured ? Math.max(0, maxTeams - confirmedCount) : 0;
  const isFull = isCapacityConfigured && confirmedCount >= maxTeams;

  const capacityDisplayText = isCapacityConfigured
    ? `${confirmedCount} / ${maxTeams} equipes confirmadas`
    : `${confirmedCount} equipes confirmadas (capacidade não configurada)`;

  // Avaliação de Sorteio
  const drawReport = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
    competition,
    competitionTeams,
    athletes,
  });

  const resolvedGroupsCount = competition.groupsCount || 1;
  const minRequiredForDraw = Math.max(2, resolvedGroupsCount * 2);

  // Partidas e Resultados
  const compMatches = matches.filter((m) => m.competitionId === competition.id);
  const totalMatches = compMatches.length;
  const completedMatches = compMatches.filter(
    (m) =>
      m.status === 'completed' ||
      m.status === 'homologated' ||
      m.status === 'awaiting_homologation' ||
      m.status === 'wo',
  ).length;

  const resolvedPoints: string[] = [];
  const pendingPoints: ActionPendingItem[] = [];

  // Avaliação de pendências e resoluções
  if (!isCapacityConfigured) {
    pendingPoints.push({
      id: 'pending-capacity-missing',
      message: 'Capacidade da competição não configurada. Configure o número máximo de equipes antes de confirmar inscrições.',
      severity: 'blocker',
      route: buildCompetitionUrl(competition.id, 'config'),
      actionLabel: 'Configurar Regras',
    });
  } else {
    resolvedPoints.push(`Capacidade regulamentar definida: ${maxTeams} equipes.`);
    if (isFull) {
      resolvedPoints.push(`Todas as ${maxTeams} vagas foram confirmadas.`);
    }
  }

  if (confirmedCount > 0) {
    resolvedPoints.push(`${confirmedCount} equipe(s) oficialmente confirmada(s).`);
  }

  if (submittedCount > 0) {
    pendingPoints.push({
      id: 'pending-submissions',
      message: `${submittedCount} inscrição(ões) aguardando análise e confirmação.`,
      severity: 'warning',
      route: buildRegistrationsUrl(competition.id),
      actionLabel: 'Revisar Inscrições',
    });
  }

  const teamsWithIncompleteRoster = competitionTeams.filter((t) => {
    const evalItem = drawReport.allEvaluations.find((e) => e.competitionTeamId === t.id);
    return evalItem && evalItem.athleteCount < evalItem.minAthletes;
  });

  if (teamsWithIncompleteRoster.length > 0 && competition.status !== 'completed' && competition.status !== 'cancelled') {
    pendingPoints.push({
      id: 'pending-incomplete-rosters',
      message: `${teamsWithIncompleteRoster.length} equipe(s) ainda não atingiram o elenco mínimo regulamentar.`,
      severity: 'info',
      route: buildRegistrationsUrl(competition.id),
      actionLabel: 'Ver Equipes',
    });
  }

  // Sorteio
  const hasDraw = draws.length > 0 || competition.status === 'groups-defined';
  if (hasDraw) {
    resolvedPoints.push('Sorteio oficial de grupos realizado.');
  }

  if (totalMatches > 0) {
    resolvedPoints.push(`Tabela de jogos gerada (${completedMatches}/${totalMatches} partidas finalizadas).`);
  }

  // Decisão de Cenário
  let scenario: ActionGuideScenario = 'REGISTRATION_OPEN';
  const status = competition.status;

  const canCloseRegistrations =
    (status === 'registration-open' || status === 'registration' || status === 'planning') &&
    confirmedCount >= 2;

  const canReopenRegistrations =
    status === 'registration-closed' || status === 'draw-pending';

  if (status === 'cancelled') {
    scenario = 'CANCELLED';
  } else if (status === 'completed') {
    scenario = 'COMPLETED';
  } else if (status === 'playoffs') {
    scenario = 'PLAYOFFS';
  } else if (status === 'in-progress') {
    scenario = 'IN_PROGRESS';
  } else if (status === 'groups-defined') {
    scenario = 'GROUPS_DEFINED';
  } else if (status === 'draw-pending' || status === 'registration-closed') {
    if (drawReport.canExecuteDraw) {
      scenario = 'READY_FOR_DRAW';
    } else {
      scenario = 'DRAW_BLOCKED';
    }
  } else {
    // Inscrições abertas / em planejamento
    if (submittedCount > 0) {
      scenario = 'PENDING_REVIEWS';
    } else if (isFull) {
      scenario = 'CAPACITY_REACHED';
    } else if (competitionTeams.length === 0) {
      scenario = 'NO_TEAMS';
    } else {
      scenario = 'REGISTRATION_OPEN';
    }
  }

  // Construção do Guia Conforme o Cenário
  switch (scenario) {
    case 'CANCELLED':
      return {
        scenario,
        stageLabel: 'Cancelada',
        statusBadge: {
          label: 'Cancelada',
          variant: 'destructive',
          className: 'bg-rose-950/40 text-rose-300 border-rose-900/60',
        },
        title: 'Competição Cancelada',
        subtitle: 'Este torneio foi encerrado administrativamente.',
        description: 'Não são permitidas novas operações para competições canceladas.',
        primaryAction: {
          label: 'Ver Relatório Geral',
          route: buildReportsUrl(competition.id),
          actionType: 'navigate',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: drawReport.drawBlockers,
        },
        canReopenRegistrations: false,
        canCloseRegistrations: false,
      };

    case 'COMPLETED':
      return {
        scenario,
        stageLabel: 'Finalizado',
        statusBadge: {
          label: 'Finalizado',
          variant: 'default',
          className: 'bg-emerald-950/40 text-emerald-300 border-emerald-900/60',
        },
        title: 'Torneio Concluído',
        subtitle: 'Classificação final homologada e pódio apurado.',
        description: 'Todas as partidas foram finalizadas e os resultados oficiais estão homologados.',
        primaryAction: {
          label: 'Visualizar Pódio e Relatórios',
          route: buildReportsUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Como funciona o encerramento?',
          articleId: 'relatorios-encerramento',
          guideLabel: 'Guia de Encerramento',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: [],
        },
        canReopenRegistrations: false,
        canCloseRegistrations: false,
      };

    case 'PLAYOFFS':
      return {
        scenario,
        stageLabel: 'Mata-mata',
        statusBadge: {
          label: 'Mata-mata',
          variant: 'default',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        title: 'Conduzir Fases Finais (Mata-mata)',
        subtitle: 'Partidas eliminatórias em andamento rumo à grande final.',
        description: 'Registre as súmulas dos confrontos eliminatórios até a definição do campeão.',
        primaryAction: {
          label: 'Acessar Central de Jogos',
          route: buildMatchesUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Ver Chaveamento dos Playoffs',
          route: buildPlayoffsUrl(competition.id),
          guideLabel: 'Ver Chaves',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: [],
        },
        canReopenRegistrations: false,
        canCloseRegistrations: false,
      };

    case 'IN_PROGRESS':
      return {
        scenario,
        stageLabel: 'Em andamento',
        statusBadge: {
          label: 'Em andamento',
          variant: 'default',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        title: 'Lançar Resultados e Súmulas',
        subtitle: `${totalMatches - completedMatches} partida(s) restante(s) na competição.`,
        description: 'Acompanhe as partidas em quadra, registre parciais de sets e valide as súmulas oficiais.',
        primaryAction: {
          label: 'Lançar Resultados na Central de Jogos',
          route: buildMatchesUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Como lançar resultados e sets?',
          articleId: 'lancar-resultado-sets',
          guideLabel: 'Como lançar',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: [],
        },
        canReopenRegistrations: false,
        canCloseRegistrations: false,
      };

    case 'GROUPS_DEFINED':
      return {
        scenario,
        stageLabel: 'Grupos definidos',
        statusBadge: {
          label: 'Grupos definidos',
          variant: 'secondary',
          className: 'bg-zinc-800 text-zinc-200 border-zinc-700',
        },
        title: 'Iniciar os Jogos da Competição',
        subtitle: 'Grupos e confrontos definidos pelo sorteio oficial.',
        description: 'A tabela e a ordem de jogos estão prontas. Inicie a rodada de abertura na Central de Jogos.',
        primaryAction: {
          label: 'Ir para a Central de Jogos',
          route: buildMatchesUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Ver Chaveamento e Grupos',
          route: buildDrawUrl(competition.id),
          guideLabel: 'Ver Grupos',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: [],
        },
        canReopenRegistrations: false,
        canCloseRegistrations: false,
      };

    case 'READY_FOR_DRAW':
      return {
        scenario,
        stageLabel: 'Pronta para Sorteio',
        statusBadge: {
          label: 'Sorteio pendente',
          variant: 'default',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        title: 'Realizar Sorteio Oficial',
        subtitle: `Tudo pronto: ${drawReport.eligibleCount} equipes confirmadas com elenco válido.`,
        description: 'As inscrições foram encerradas e o quórum regulamentar foi atingido para a composição das chaves.',
        primaryAction: {
          label: 'Realizar Sorteio Oficial',
          route: buildDrawUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Como funciona o sorteio de grupos?',
          articleId: 'sorteio-grupos',
          guideLabel: 'Guia do Sorteio',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: true,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: [],
        },
        canReopenRegistrations: true,
        canCloseRegistrations: false,
      };

    case 'DRAW_BLOCKED': {
      const primaryBlocker = drawReport.drawBlockers[0] || 'A competição ainda não atingiu o quórum para o sorteio.';
      return {
        scenario,
        stageLabel: 'Sorteio indisponível',
        statusBadge: {
          label: 'Sorteio pendente',
          variant: 'outline',
          className: 'bg-zinc-900 text-zinc-400 border-zinc-800',
        },
        title: 'Regularizar Equipes para o Sorteio',
        subtitle: primaryBlocker,
        description: `O sorteio exige no mínimo ${minRequiredForDraw} equipes confirmadas com elenco mínimo. Atualmente existem ${drawReport.eligibleCount} equipe(s) apta(s).`,
        primaryAction: {
          label: 'Revisar Inscrições e Elencos',
          route: buildRegistrationsUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Quando uma equipe fica apta?',
          articleId: 'sorteio-grupos',
          guideLabel: 'Critérios de Aptidão',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: drawReport.drawBlockers,
        },
        canReopenRegistrations: true,
        canCloseRegistrations: false,
      };
    }

    case 'PENDING_REVIEWS':
      return {
        scenario,
        stageLabel: 'Inscrições abertas',
        statusBadge: {
          label: 'Inscrições abertas',
          variant: 'default',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        title: 'Revisar Inscrições',
        subtitle: `${submittedCount} equipe(s) enviaram elenco e aguardam análise.`,
        description: 'Revise os elencos submetidos pelos responsáveis e confirme ou recuse a participação na competição.',
        primaryAction: {
          label: 'Revisar Inscrições',
          route: buildRegistrationsUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Como revisar e confirmar uma equipe?',
          articleId: 'portal-equipes-auto-inscricao',
          guideLabel: 'Como revisar',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: drawReport.drawBlockers,
        },
        canReopenRegistrations: false,
        canCloseRegistrations,
      };

    case 'CAPACITY_REACHED':
      return {
        scenario,
        stageLabel: 'Vagas Preenchidas',
        statusBadge: {
          label: 'Capacidade máxima atingida',
          variant: 'default',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        title: 'Encerrar Inscrições',
        subtitle: `${confirmedCount} de ${maxTeams} vagas foram confirmadas.`,
        description: 'A capacidade máxima de equipes foi atingida. Encerre formalmente as inscrições para habilitar o sorteio oficial.',
        primaryAction: {
          label: 'Encerrar Inscrições',
          route: buildRegistrationsUrl(competition.id),
          actionType: 'close_registrations',
        },
        secondaryAction: {
          label: 'Ver Gestão de Inscrições',
          route: buildRegistrationsUrl(competition.id),
          guideLabel: 'Ver Inscrições',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots: 0,
          isFull: true,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: drawReport.drawBlockers,
        },
        canReopenRegistrations: false,
        canCloseRegistrations: true,
      };

    case 'NO_TEAMS':
      return {
        scenario,
        stageLabel: 'Inscrições abertas',
        statusBadge: {
          label: 'Inscrições abertas',
          variant: 'outline',
          className: 'bg-zinc-900 text-zinc-300 border-zinc-800',
        },
        title: 'Convidar Equipes',
        subtitle: 'Sua competição está pronta para receber inscrições.',
        description: 'Compartilhe o link de auto-inscrição com os representantes ou cadastre as equipes participantes.',
        primaryAction: {
          label: 'Convidar Equipes',
          route: buildRegistrationsUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Como convidar equipes pelo WhatsApp?',
          articleId: 'portal-equipes-auto-inscricao',
          guideLabel: 'Como convidar',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount: 0,
          submittedCount: 0,
          availableSpots: isCapacityConfigured ? maxTeams : 0,
          isFull: false,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: 0,
          totalTeams: 0,
          minRequired: minRequiredForDraw,
          blockers: drawReport.drawBlockers,
        },
        canReopenRegistrations: false,
        canCloseRegistrations: false,
      };

    case 'REGISTRATION_OPEN':
    default:
      return {
        scenario: 'REGISTRATION_OPEN',
        stageLabel: 'Inscrições abertas',
        statusBadge: {
          label: 'Inscrições abertas',
          variant: 'outline',
          className: 'bg-zinc-900 text-zinc-300 border-zinc-800',
        },
        title: 'Acompanhar Inscrições',
        subtitle: isCapacityConfigured
          ? `${confirmedCount} de ${maxTeams} vagas confirmadas · ${competitionTeams.length} equipe(s) convidadas.`
          : `${competitionTeams.length} equipe(s) convidadas preenchendo elenco.`,
        description: 'As equipes participantes estão preenchendo seus elencos através dos links de auto-inscrição.',
        primaryAction: {
          label: 'Acompanhar Inscrições',
          route: buildRegistrationsUrl(competition.id),
          actionType: 'navigate',
        },
        secondaryAction: {
          label: 'Como funciona a auto-inscrição?',
          articleId: 'portal-equipes-auto-inscricao',
          guideLabel: 'Auto-inscrição',
        },
        resolvedPoints,
        pendingPoints,
        capacity: {
          isConfigured: isCapacityConfigured,
          maxTeams,
          confirmedCount,
          submittedCount,
          availableSpots,
          isFull,
          displayText: capacityDisplayText,
        },
        drawEligibility: {
          canExecuteDraw: false,
          eligibleCount: drawReport.eligibleCount,
          totalTeams: competitionTeams.length,
          minRequired: minRequiredForDraw,
          blockers: drawReport.drawBlockers,
        },
        canReopenRegistrations: false,
        canCloseRegistrations,
      };
  }
}

export const CompetitionActionGuideService = {
  evaluateCompetitionActionGuide,
  getBusinessStatusLabel,
};
