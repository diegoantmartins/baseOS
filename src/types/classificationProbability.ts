/**
 * classificationProbability.ts
 *
 * Contratos de tipos e View Models para o recurso de
 * Probabilidade de Classificação da Fase 5 do BaseOS.
 *
 * Isola completamente a camada analítica de probabilidades
 * dos tipos canônicos de classificação oficial.
 */

export type MathematicalStatus =
  | 'qualified'          // Garantido matematicamente (100%)
  | 'eliminated'         // Sem chances matemáticas (0%)
  | 'in_contention'      // Em disputa (0% < P < 100%)
  | 'insufficient_data'; // Dados estruturais insuficientes para o cálculo

export type ProofBasis =
  | 'deterministic_exhaustion' // Provado por exaustão de todos os cenários possíveis
  | 'points_bound'             // Provado por limite matemático estrito de pontos
  | 'none';                    // Sem prova determinística (estimativa amostral Monte Carlo)

export type FutureMatchOutcome = {
  winnerId: string;
  loserId: string;
  setsWonByWinner: number;
  setsWonByLoser: number;
  competitionPointsWinner: number;
  competitionPointsLoser: number;
  scoreLabel: string; // Ex: '3x0', '3x1', '3x2', '2x0', '2x1', etc.
};

export type TeamProbabilityResult = {
  teamId: string;
  teamName: string;
  teamShortName: string;
  currentPosition: number;
  currentPoints: number;
  remainingMatchesCount: number;
  minPossiblePoints: number;
  maxPossiblePoints: number;
  probabilityPercent: number; // 0 a 100, formatado com 1 casa decimal na exibição
  advancingCount: number;     // Quantidade de vagas classificatórias do grupo (ex: 2)
  targetPhaseDescription: string; // Ex: "Top 2 do Grupo A (Playoffs)"
  mathematicalStatus: MathematicalStatus;
  statusLabel: string;        // "Garantido matematicamente", "Sem chances matemáticas", "Em disputa"
  proofBasis: ProofBasis;     // Base comprobatória da garantia ou eliminação
  tieBreakUncertainty: boolean; // Indica se houve cenários dependentes de desempates finos não observáveis
  favorableScenarios: number;
  totalScenarios: number;
};

export type GroupProbabilityResult = {
  groupName: string;
  advancingCount: number;
  totalTeams: number;
  totalRemainingMatches: number;
  methodology: 'deterministic' | 'monte_carlo' | 'insufficient_data' | 'completed';
  scenariosEvaluated: number;
  executionTimeMs: number;
  methodologyExplanation: string;
  tieBreakUncertaintyDetected: boolean;
  teams: TeamProbabilityResult[];
};

export type CompetitionProbabilityResult = {
  competitionId: string;
  competitionName: string;
  isSufficientData: boolean;
  statusReason?: string;
  useBestThirdsWarning?: string;
  groups: GroupProbabilityResult[];
  generatedAt: string;
};

export type ProbabilityCalculationOptions = {
  maxDeterministicScenarios?: number; // Padrão: 10.000
  monteCarloSimulations?: number;     // Padrão: 10.000
  seed?: number;                      // Seed determinística para Mulberry32
};
