/**
 * BaseOS — Contrato Canônico de Configuração e Regras Esportivas da Competição
 *
 * Este módulo é a FONTE ÚNICA DA VERDADE para todas as regras de disputa:
 *  - Formato de sets (setsToWin, maxSets, pontuações de set e tiebreak);
 *  - Sobrescrita de formato por fase (grupos, quartas, semis, final);
 *  - Sistema de pontuação na tabela de classificação;
 *  - Critérios de desempate ordenáveis;
 *  - Limites regulamentares de elenco (atletas, capitães, líberos).
 */

import type { MatchLifecycleStatus, SetScoreRecord, TiebreakCriterionId } from './entities';

/** Identificador canônico de sets para vitória: 1 (set único), 2 (melhor de 3) ou 3 (melhor de 5). */
export type SetsToWin = 1 | 2 | 3;

/**
 * Representação canônica e inequívoca do resultado esportivo oficial de uma partida.
 */
export interface CanonicalMatchResult {
  isValid: boolean;
  status: MatchLifecycleStatus;
  winnerId: string | null;
  loserId: string | null;
  winnerSide: 'A' | 'B' | null;
  setsWonA: number;
  setsWonB: number;
  pointsScoredA: number;
  pointsScoredB: number;
  setScores: SetScoreRecord[];
  isWo: boolean;
  isCompleted: boolean;
  isHomologated: boolean;
  isInconsistent: boolean;
  inconsistencyReason?: string;
  homologatedAt?: string;
  homologatedBy?: string;
}

/**
 * Configuração resolvida de sets para uma partida específica.
 */
export interface SetFormatConfig {
  /** Quantidade de sets necessários para vencer a partida (1, 2 ou 3). */
  setsToWin: SetsToWin;
  /** Quantidade máxima teórica de sets da partida: (setsToWin * 2) - 1. */
  maxSets: number;
  /** Pontos mínimos para vencer um set regular (ex: 25 na quadra, 21 na praia). */
  regularSetPoints: number;
  /** Pontos mínimos para vencer o set decisivo / tiebreak (ex: 15). */
  tiebreakPoints: number;
  /** Vantagem mínima de pontos necessária para fechar o set (padrão: 2). */
  minAdvantage: number;
}

/**
 * Sobrescritas opcionais de formato de sets por fase da competição.
 */
export interface PhaseFormatOverrides {
  groupStage?: SetsToWin;
  roundOf16?: SetsToWin;
  playoffs?: SetsToWin;
  quarterfinals?: SetsToWin;
  semifinals?: SetsToWin;
  thirdPlace?: SetsToWin;
  final?: SetsToWin;
}

/**
 * Parâmetros de pontuação concedidos para a tabela de classificação.
 */
export interface ScoringSystemConfig {
  /** Identificador do sistema de pontuação. */
  systemType: 'fivb-standard' | 'simple' | 'win-loss' | 'custom';
  /** Pontos por vitória sem tiebreak (ex: 3x0 ou 3x1 em melhor de 5; 2x0 em melhor de 3). */
  pointsWinClear: number;
  /** Pontos por vitória com tiebreak (ex: 3x2 em melhor de 5; 2x1 em melhor de 3). */
  pointsWinNarrow: number;
  /** Pontos por derrota no tiebreak (ex: 2x3 em melhor de 5; 1x2 em melhor de 3). */
  pointsLossNarrow: number;
  /** Pontos por derrota sem tiebreak (ex: 0x3 ou 1x3 em melhor de 5; 0x2 em melhor de 3). */
  pointsLossClear: number;
  /** Pontos concedidos ao vencedor por W.O. */
  pointsWoWin: number;
  /** Pontos concedidos ao perdedor por W.O. (geralmente 0). */
  pointsWoLoss: number;
}

/**
 * Tipo canônico que define o formato macro da competição.
 */
export type CompetitionFormatType =
  | 'round-robin'
  | 'groups-knockout'
  | 'groups-play-in-knockout'
  | 'knockout'
  | 'double-elimination'
  | 'custom';

/**
 * Tipo estrutural da fase esportiva.
 */
export type StageType =
  | 'group-stage'
  | 'round-robin'
  | 'play-in'
  | 'knockout'
  | 'third-place'
  | 'custom';

/**
 * Identificador do status da resolução de um participante em um slot.
 */
export type ParticipantResolutionStatus = 'resolved' | 'unresolved' | 'invalid' | 'bye';

/**
 * Contrato canônico e inequívoco de referência a um participante esportivo.
 * Suporta equipes conhecidas, colocações relativas, resultados de partidas anteriores, sementes e folgas (BYE).
 */
export type ParticipantReference =
  | {
      type: 'resolved-team';
      teamId: string;
      teamName?: string;
    }
  | {
      type: 'group-position';
      stageId: string;
      groupIndex: number;
      position: number;
    }
  | {
      type: 'overall-ranking';
      stageId: string;
      position: number;
      filter?: 'group-winners-only' | 'group-runners-up-only' | 'non-winners' | 'all';
    }
  | {
      type: 'stage-position';
      stageId: string;
      position: number;
    }
  | {
      type: 'match-winner';
      slotId: string;
    }
  | {
      type: 'match-loser';
      slotId: string;
    }
  | {
      type: 'seed';
      seedNumber: number;
    }
  | {
      type: 'bye';
    };

/**
 * Estado materializado de um participante em um dos lados (A ou B) de um MatchSlot.
 */
export interface ParticipantSlotState {
  side: 'A' | 'B';
  reference: ParticipantReference;
  status: ParticipantResolutionStatus;
  resolvedTeamId: string | null;
  resolvedTeamName?: string;
  displayPlaceholder: string;
  isBye: boolean;
}

/**
 * Alvo geográfico de progressão para onde o vencedor ou perdedor de uma partida deve ser roteado.
 */
export interface ProgressionTarget {
  targetStageId: string;
  targetRoundId: string;
  targetSlotId: string;
  targetSide: 'A' | 'B';
}

/**
 * Mapeamento determinístico de avanço de participantes a partir do desfecho de um slot.
 */
export interface ProgressionRoute {
  sourceSlotId: string;
  onWinner?: ProgressionTarget;
  onLoser?: ProgressionTarget;
}

/**
 * Regra genérica de progressão entre fases e slots.
 */
export type ProgressionRule =
  | {
      type: 'winner';
      sourceSlotId: string;
      target: ProgressionTarget;
    }
  | {
      type: 'loser';
      sourceSlotId: string;
      target: ProgressionTarget;
    }
  | {
      type: 'ranking-position';
      stageId: string;
      position: number;
      target: ProgressionTarget;
    }
  | {
      type: 'group-position';
      stageId: string;
      groupIndex: number;
      position: number;
      target: ProgressionTarget;
    }
  | {
      type: 'stage-position';
      stageId: string;
      position: number;
      target: ProgressionTarget;
    };

/**
 * Definição canônica de um Round (rodada/fase interna) com identidade estável.
 * Não depende da posição em array para identificação esportiva.
 */
export interface RoundDefinition {
  roundId: string;
  stageId: string;
  order: number;
  name: string;
  slotsCount?: number;
}

/**
 * Intenção esportiva pura de uma partida (MatchSlot).
 * Não depende de equipes já instanciadas ou de IDs de banco para existir.
 */
export interface MatchSlot {
  slotId: string;
  stageId: string;
  roundId: string;
  position: number;
  label?: string;
  participantA: ParticipantSlotState;
  participantB: ParticipantSlotState;
  progressionRoute?: ProgressionRoute;
  /** Identificador de registro de partida real no banco (null quando ainda não persistida) */
  matchRecordId?: string | null;
}

/**
 * Estratégias puras de emparelhamento suportadas pelo Pairing Engine.
 */
export type PairingStrategyType =
  | 'high-low'
  | 'same-position-cross'
  | 'seeded-bracket'
  | 'round-robin'
  | 'custom';

/**
 * Definição declarativa e pura de emparelhamento.
 */
export interface PairingDefinition {
  strategy: PairingStrategyType;
  rounds?: 'single' | 'home-and-away';
  bracketSize?: number;
  customCrossings?: Array<{
    homeIndex: number;
    awayIndex: number;
    label?: string;
  }>;
}

/**
 * Contrato de conector de origem para participantes de uma fase/slot.
 */
export type ParticipantFeedDefinition =
  | {
      type: 'all-teams';
      teamIds?: string[];
    }
  | {
      type: 'direct-team';
      teamId: string;
      teamName?: string;
    }
  | {
      type: 'group-winners';
      stageId: string;
    }
  | {
      type: 'group-position';
      stageId: string;
      groupIndex: number;
      position: number;
    }
  | {
      type: 'overall-ranking';
      stageId: string;
      position: number;
      filter?: 'group-winners-only' | 'group-runners-up-only' | 'non-winners' | 'all';
    }
  | {
      type: 'overall-ranking-range';
      stageId: string;
      startRank: number;
      endRank: number;
    }
  | {
      type: 'stage-winners';
      stageId: string;
      roundId?: string;
    }
  | {
      type: 'stage-losers';
      stageId: string;
      roundId?: string;
    }
  | {
      type: 'match-result';
      matchId: string;
      outcome: 'winner' | 'loser';
    }
  | {
      type: 'seed';
      seedNumber: number;
    }
  | {
      type: 'seed-range';
      startSeed: number;
      endSeed: number;
    }
  | {
      type: 'bye';
    }
  | {
      type: 'custom';
      customKey: string;
      parameters?: Record<string, unknown>;
    };

/**
 * Configuração de regras de emparelhamento dentro de uma fase.
 */
export type PairingConfig =
  | {
      type: 'round-robin';
      rounds?: 'single' | 'home-and-away';
    }
  | {
      type: 'bracket-by-seed';
      bracketSize?: number;
    }
  | {
      type: 'custom-pairing';
      pairings: Array<{
        matchId?: string;
        homeFeed: ParticipantFeedDefinition;
        awayFeed: ParticipantFeedDefinition;
      }>;
    }
  | PairingDefinition;

/**
 * Definição estrutural de uma fase da competição (Config-Time).
 */
export interface StageDefinition {
  /** Identificador estável da fase (ex: 'groups', 'repechage', 'knockout') */
  id: string;
  /** Identificador estável alternativo (sinônimo de id) */
  stageId?: string;
  /** Sequência ordinal da fase no torneio (1, 2, 3...) */
  order: number;
  /** Nome amigável de exibição (ex: 'Fase de Grupos', 'Play-In', 'Mata-Mata') */
  name: string;
  /** Tipo estrutural da fase */
  type: StageType;
  /** Lista de IDs de fases que precisam estar concluídas para esta fase iniciar */
  dependsOnStageIds?: string[];
  /** Configuração específica para fases baseadas em grupos */
  groupConfig?: {
    groupsCount: number;
    teamsPerGroup: number;
    rounds?: 'single' | 'home-and-away';
  };
  /** Configuração específica para fases eliminatórias */
  eliminationConfig?: {
    bracketSize: number;
    seriesType?: 'single-match' | 'two-legged';
    hasThirdPlaceMatch?: boolean;
  };
  /** Regras de emparelhamento configuradas */
  pairingConfig?: PairingConfig;
  pairing?: PairingDefinition;
  /** Lista de feeds de participantes que alimentam os slots desta fase */
  participantFeeds?: ParticipantFeedDefinition[];
  participantFeed?: ParticipantFeedDefinition[];
  /** Rodadas canônicas pertencentes a esta fase */
  rounds?: RoundDefinition[];
  /** Rotas ou regras de progressão saindo desta fase */
  progressionRoutes?: ProgressionRoute[];
  progression?: ProgressionRule[];
  /** Sobrescrita opcional de regras de partida para esta fase */
  matchRulesOverride?: Partial<SetFormatConfig>;
  /** Critérios de desempate específicos para esta fase */
  tieBreakCriteriaOverride?: TiebreakCriterionId[];
}

/**
 * Estratégia configurável de consolidação do ranking intergrupos.
 */
export type OverallRankingStrategy =
  | 'by-group-position-first'
  | 'pure-overall-stats'
  | 'custom';

/**
 * Regras de classificação e avanço por grupo.
 */
export interface StandingsConfig {
  /** Lista ordenada de critérios de desempate oficiais da competição. */
  tiebreakCriteriaOrder: TiebreakCriterionId[];
  /** Número de equipes que avançam diretamente por grupo para os playoffs. */
  advancingPerGroup: number;
  /** Configuração de repescagem por melhores terceiros colocados. */
  bestThirds?: {
    enabled: boolean;
    count: number;
  };
  /**
   * Estratégia de agregação para ranking intergrupos:
   * - 'by-group-position-first' (primeira estratégia suportada: compara 1ºs entre si, depois 2ºs, etc.)
   * - 'pure-overall-stats' (agregação pura baseada em estatísticas globais acumuladas)
   * - 'custom' (estratégia customizada)
   */
  aggregationStrategy?: OverallRankingStrategy;
}

/**
 * Regras de inscrição de elenco por equipe na competição.
 */
export interface RegistrationRulesConfig {
  /** Mínimo de atletas inscritos no elenco para validar inscrição. */
  minAthletes: number;
  /** Limite máximo de atletas inscritos por equipe. */
  maxAthletes: number;
  /** Quantidade máxima de capitães designados por equipe (padrão: 1). */
  maxCaptains: number;
  /** Quantidade máxima de líberos designados por equipe (padrão: 2 na quadra, 0 na praia). */
  maxLiberos: number;
  /** Se o número de camisa é obrigatório já na inscrição online pré-jogo. */
  requireJerseyNumberOnRegistration: boolean;
  /** Limite máximo explícito de equipes na competição (capacidade determinística). */
  maxTeams?: number;
}

/**
 * Configuração integral da competição (Contrato Central de Regras Esportivas).
 * Mantido como SSOT única do sistema.
 */
export interface CompetitionConfig {
  version: number;
  format: {
    /** Formato padrão de sets da competição (2 = melhor de 3; 3 = melhor de 5). */
    defaultSetsToWin: SetsToWin;
    /** Sobrescritas opcionais de sets por fase eliminatória. */
    phaseOverrides?: PhaseFormatOverrides;
    /** Parâmetros de pontuação e vantagem dos sets. */
    setRules: {
      regularSetPoints: number;
      tiebreakPoints: number;
      minAdvantage: number;
    };
    /** Formato macro da competição (opcional, retrocompatível) */
    formatType?: CompetitionFormatType;
    /** Fases sequenciais em Grafo (opcional, retrocompatível) */
    stages?: StageDefinition[];
  };
  scoring: ScoringSystemConfig;
  standings: StandingsConfig;
  registration: RegistrationRulesConfig;
}

// ============================================================================
// Funções Utilitárias Puras e Conversões
// ============================================================================

/**
 * Deriva a quantidade máxima teórica de sets a partir do número de vitórias necessárias:
 * setsToWin = 1 -> maxSets = 1
 * setsToWin = 2 -> maxSets = 3
 * setsToWin = 3 -> maxSets = 5
 */
export function deriveMaxSets(setsToWin: SetsToWin): number {
  return (setsToWin * 2) - 1;
}

/**
 * Converte strings legadas ('3-sets', '5-sets', 'best-of-3', 'best-of-5', '1-set') para SetsToWin.
 */
export function parseLegacySetFormat(raw?: string | null): SetsToWin {
  if (!raw) return 2; // Padrão: melhor de 3
  const normalized = raw.trim().toLowerCase();
  if (normalized === '5-sets' || normalized === 'best-of-5' || normalized === 'best_of_5' || normalized === '5') {
    return 3;
  }
  if (normalized === '1-set' || normalized === 'best-of-1' || normalized === 'best_of_1' || normalized === '1') {
    return 1;
  }
  return 2; // Padrão '3-sets', 'best-of-3', etc.
}

/**
 * Retorna o rótulo amigável em português para um SetsToWin.
 */
export function formatSetsToWinLabel(setsToWin: SetsToWin): string {
  switch (setsToWin) {
    case 1:
      return 'Set Único';
    case 2:
      return 'Melhor de 3 sets';
    case 3:
      return 'Melhor de 5 sets';
  }
}

/**
 * Configuração padrão para Vôlei de Quadra (FIVB / CBV).
 */
export const DEFAULT_INDOOR_COMPETITION_CONFIG: CompetitionConfig = {
  version: 1,
  format: {
    defaultSetsToWin: 2, // Melhor de 3 por padrão na fase inicial
    phaseOverrides: {
      groupStage: 2,
      quarterfinals: 2,
      semifinals: 3,    // Semis e final em melhor de 5
      final: 3,
    },
    setRules: {
      regularSetPoints: 25,
      tiebreakPoints: 15,
      minAdvantage: 2,
    },
  },
  scoring: {
    systemType: 'fivb-standard',
    pointsWinClear: 3,
    pointsWinNarrow: 2,
    pointsLossNarrow: 1,
    pointsLossClear: 0,
    pointsWoWin: 3,
    pointsWoLoss: 0,
  },
  standings: {
    tiebreakCriteriaOrder: [
      'points',
      'head-to-head',
      'set-average',
      'points-average',
      'sets-balance',
      'points-balance',
      'victories',
      'draw',
    ],
    advancingPerGroup: 2,
    bestThirds: {
      enabled: false,
      count: 0,
    },
  },
  registration: {
    minAthletes: 6,
    maxAthletes: 14,
    maxCaptains: 1,
    maxLiberos: 2,
    requireJerseyNumberOnRegistration: false,
  },
};

/**
 * Configuração padrão para Vôlei de Praia.
 */
export const DEFAULT_BEACH_COMPETITION_CONFIG: CompetitionConfig = {
  version: 1,
  format: {
    defaultSetsToWin: 2, // Melhor de 3 sets
    setRules: {
      regularSetPoints: 21,
      tiebreakPoints: 15,
      minAdvantage: 2,
    },
  },
  scoring: {
    systemType: 'fivb-standard',
    pointsWinClear: 3,
    pointsWinNarrow: 2,
    pointsLossNarrow: 1,
    pointsLossClear: 0,
    pointsWoWin: 3,
    pointsWoLoss: 0,
  },
  standings: {
    tiebreakCriteriaOrder: [
      'points',
      'head-to-head',
      'set-average',
      'points-average',
      'sets-balance',
      'points-balance',
      'victories',
      'draw',
    ],
    advancingPerGroup: 2,
  },
  registration: {
    minAthletes: 2,
    maxAthletes: 4,
    maxCaptains: 1,
    maxLiberos: 0,
    requireJerseyNumberOnRegistration: false,
  },
};

/**
 * Retorna o identificador canônico e estável de um StageDefinition.
 */
export function getStageId(stage: StageDefinition): string {
  return stage.stageId ?? stage.id;
}

/**
 * Cria um ParticipantSlotState com status 'bye' determinístico.
 */
export function createByeParticipantSlot(side: 'A' | 'B'): ParticipantSlotState {
  return {
    side,
    reference: { type: 'bye' },
    status: 'bye',
    resolvedTeamId: null,
    displayPlaceholder: 'BYE',
    isBye: true,
  };
}

/**
 * Cria um ParticipantSlotState com equipe resolvida conhecida.
 */
export function createResolvedParticipantSlot(
  side: 'A' | 'B',
  teamId: string,
  teamName?: string,
): ParticipantSlotState {
  return {
    side,
    reference: { type: 'resolved-team', teamId, teamName },
    status: 'resolved',
    resolvedTeamId: teamId,
    resolvedTeamName: teamName,
    displayPlaceholder: teamName ?? teamId,
    isBye: false,
  };
}

/**
 * Cria um ParticipantSlotState pendente/não-resolvido.
 */
export function createUnresolvedParticipantSlot(
  side: 'A' | 'B',
  reference: ParticipantReference,
  placeholder: string,
): ParticipantSlotState {
  return {
    side,
    reference,
    status: 'unresolved',
    resolvedTeamId: null,
    displayPlaceholder: placeholder,
    isBye: false,
  };
}

/**
 * Normaliza qualquer objeto bruto (parcial, legado ou vazio) para uma instância íntegra de CompetitionConfig.
 * Garante que format, scoring, standings e registration existam com valores válidos.
 */
export function normalizeCompetitionConfig(
  raw?: unknown,
  modality: 'indoor' | 'beach' = 'indoor',
): CompetitionConfig {
  const base = modality === 'beach' ? DEFAULT_BEACH_COMPETITION_CONFIG : DEFAULT_INDOOR_COMPETITION_CONFIG;
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(base));
  }
  const obj = raw as Partial<CompetitionConfig>;
  return {
    version: typeof obj.version === 'number' ? obj.version : base.version,
    format: {
      defaultSetsToWin: obj.format?.defaultSetsToWin ?? base.format.defaultSetsToWin,
      phaseOverrides: obj.format?.phaseOverrides ?? base.format.phaseOverrides,
      setRules: {
        regularSetPoints: obj.format?.setRules?.regularSetPoints ?? base.format.setRules.regularSetPoints,
        tiebreakPoints: obj.format?.setRules?.tiebreakPoints ?? base.format.setRules.tiebreakPoints,
        minAdvantage: obj.format?.setRules?.minAdvantage ?? base.format.setRules.minAdvantage,
      },
      formatType: obj.format?.formatType ?? base.format.formatType,
      stages: Array.isArray(obj.format?.stages) ? obj.format.stages : [],
    },
    scoring: {
      ...base.scoring,
      ...(obj.scoring && typeof obj.scoring === 'object' ? obj.scoring : {}),
    },
    standings: {
      ...base.standings,
      ...(obj.standings && typeof obj.standings === 'object' ? obj.standings : {}),
    },
    registration: {
      ...base.registration,
      ...(obj.registration && typeof obj.registration === 'object' ? obj.registration : {}),
    },
  };
}
