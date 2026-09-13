// Types padronizados para geração de PDFs de súmula e relatórios
// Garante consistência em todo o sistema BaseOS

import type { TeamStandingResult } from '@/services/standingsService';

// --- Dados da partida (formato unificado) ---

/** Informações de uma equipe no PDF */
export interface TeamInfo {
  name: string;
  shortName: string;
  logoUrl?: string;
  athletes: PdfAthlete[];
  coach?: string;
  assistantCoach?: string;
  physicalTrainer?: string;
  doctor?: string;
}

/** Atleta no formato PDF - padronizado */
export interface PdfAthlete {
  jerseyNumber?: number; // Opcional, confirmado no dia
  name: string;
  position?: string;
  captain?: boolean;
  libero?: boolean;
  documentNumber?: string; // RG/CPF
}

/** Resultado de um set */
export interface SetResult {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  duration?: string;
}

/** Dados completos da súmula - formato unificado */
export interface MatchSheetData {
  /** Nome do sistema/organizador */
  orgName?: string;
  /** Modo da súmula: 'pre' = em branco para mesa, 'post' = resultado final */
  sheetMode?: 'pre' | 'post';
  competition: string;
  category: string;
  genderCategory?: 'male' | 'female' | 'mixed';
  modality: 'indoor' | 'beach';
  format: '3-sets' | '5-sets' | '1-set' | '2-sets';
  playerFormat: '6x6' | '4x4' | '2x2' | '3x3';
  date: string;
  time: string;
  venue: string;
  court?: string;
  city?: string;
  phase?: string;
  groupName?: string;
  round: number;
  matchNumber: number;
  teamA: TeamInfo;
  teamB: TeamInfo;
  sets: SetResult[];
  finalScoreA: number;
  finalScoreB: number;
  winner?: 'A' | 'B';
  referees: { role: string; name: string }[];
  timeouts: PdfTimeout[];
  substitutions: PdfSubstitution[];
  sanctions: PdfSanction[];
  observations?: string;
  startTime?: string;
  endTime?: string;
}

/** Tempo técnico no PDF */
export interface PdfTimeout {
  set: number;
  team: 'A' | 'B';
  'B';
  score: string;
}

/** Substituição no PDF */
export interface PdfSubstitution {
  set: number;
  team: 'A' | 'B';
  playerIn: number;
  playerOut: number;
  score: string;
}

/** Sanção no PDF */
export interface PdfSanction {
  set: number;
  team: 'A' | 'B';
  player: string;
  type: string;
}

// --- Configurações de layout ---

/** Configurações de layout do PDF */
export interface PdfLayoutConfig {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}

/** Cores padronizadas (grayscale para impressão B&W) */
export const PDF_COLORS = {
  black: '#000000',
  darkGray: '#333333',
  mediumGray: '#666666',
  lightGray: '#999999',
  white: '#FFFFFF',
  headerBlue: '#1e3a5f',
  lightBlue: '#eaeaea',
  zebra: '#f8f8f8',
} as const;

// --- Types para relatórios ---

/** Linha do boletim de jogos */
export interface MatchBoletimRow {
  matchNumber: number;
  round: number;
  phase?: string;
  groupName?: string;
  date: string;
  time: string;
  venue: string;
  court?: string;
  teamAName: string;
  teamAShort?: string;
  teamALogo?: string;
  teamBName: string;
  teamBShort?: string;
  teamBLogo?: string;
  scoreA?: number;
  scoreB?: number;
  statusLabel: string;
  highlightAthleteName?: string;
  highlightTeamShort?: string;
}

/** Dados para relatório de classificação */
export interface StandingsReportGroup {
  groupName: string;
  standings: TeamStandingResult[];
}

/** Atleta no relatório de elenco */
export interface RosterReportAthlete {
  jerseyNumber?: number;
  name: string;
  position: string;
  documentNumber?: string;
  isCaptain: boolean;
  isLibero: boolean;
}

/** Equipe no relatório de elenco */
export interface RosterReportTeam {
  name: string;
  shortName: string;
  coach?: string;
  assistantCoach?: string;
  medicalStaff?: string;
  city?: string;
  state?: string;
  modality?: string;
  logoUrl?: string;
  athletes: RosterReportAthlete[];
}

/** Dados do pódio */
export interface PodiumReportData {
  competitionName: string;
  categoryName?: string;
  orgName?: string;
  champion?: { name: string; shortName?: string; logoUrl?: string };
  runnerUp?: { name: string; shortName?: string; logoUrl?: string };
  third?: { name: string; shortName?: string; logoUrl?: string };
  fourth?: { name: string; shortName?: string; logoUrl?: string };
}

// --- Types para fichas de posição ---

/** Ficha de posição individual */
export interface PositionCardData {
  team: MatchSheetData['teamA'];
  opponent: MatchSheetData['teamB'];
  setLabel: string;
  orgName: string;
}

/** Linha da Escala Oficial de Arbitragem e Oficiais de Mesa */
export interface RefereesScheduleRow {
  matchNumber: number;
  round: number;
  phase?: string;
  groupName?: string;
  date: string;
  time: string;
  venue: string;
  court?: string;
  teamAName: string;
  teamAShort?: string;
  teamALogo?: string;
  teamBName: string;
  teamBShort?: string;
  teamBLogo?: string;
  statusLabel: string;
  firstReferee: string;
  secondReferee: string;
  scorer: string;
  assistantScorer: string;
  lineJudges: string[];
  hasOfficials: boolean;
}

/** Linha da Programação Diária / Ordem dos Jogos */
export interface DailyScheduleRow {
  matchId: string;
  matchNumber: number;
  round: number;
  phase?: string;
  groupName?: string;
  date: string;
  time: string;
  scheduledTime: string;
  venue: string;
  court?: string;
  teamAName: string;
  teamAShort?: string;
  teamALogo?: string;
  teamBName: string;
  teamBShort?: string;
  teamBLogo?: string;
  status: string;
  statusLabel: string;
  scoreA?: number;
  scoreB?: number;
  hasConflict?: boolean;
  conflictMessage?: string;
}

/** Linha de confronto para o Relatório de Destaques / MVP */
export interface MvpMatchRow {
  matchId: string;
  matchNumber: number;
  round: number;
  phase?: string;
  groupName?: string;
  date: string;
  time: string;
  scheduledTime: string;
  venue: string;
  court?: string;
  teamAId: string;
  teamAName: string;
  teamAShort?: string;
  teamALogo?: string;
  teamBId: string;
  teamBName: string;
  teamBShort?: string;
  teamBLogo?: string;
  scoreA?: number;
  scoreB?: number;
  setsScoreLabel?: string;
  status: string;
  statusLabel: string;
  hasHighlight: boolean;
  athleteId?: string;
  athleteName?: string;
  jerseyNumber?: number;
  athleteTeamId?: string;
  athleteTeamName?: string;
  athleteTeamShort?: string;
  isUnresolvedAthlete?: boolean;
}

/** Linha do Ranking/Leaderboard de Destaques / MVP */
export interface MvpLeaderboardRow {
  position: number;
  athleteId: string;
  athleteName: string;
  jerseyNumber?: number;
  teamId?: string;
  teamName: string;
  teamShortName?: string;
  teamLogoUrl?: string;
  mvpCount: number;
  matchNumbers: number[];
}

/** Estrutura unificada de dados para o Relatório de Destaques / MVP */
export interface MvpReportData {
  competitionName: string;
  metrics: {
    totalMatches: number;
    matchesWithMvp: number;
    matchesWithoutMvp: number;
    distinctHighlightedAthletes: number;
    totalMvpAwards: number;
    leaderName?: string;
    leaderMvpCount?: number;
    leaderTeamName?: string;
  };
  leaderboard: MvpLeaderboardRow[];
  matches: MvpMatchRow[];
}

/** Atleta integrante da delegação da equipe na competição */
export interface DelegationAthleteRow {
  athleteId: string;
  name: string;
  jerseyNumber?: number;
  position: string;
  documentNumber?: string;
  birthDate?: string;
  isCaptain: boolean;
  isLibero: boolean;
}

/** Delegação oficial da equipe na competição com responsáveis e elenco */
export interface DelegationTeamRow {
  teamId: string;
  competitionTeamId: string;
  teamName: string;
  teamShortName?: string;
  teamLogoUrl?: string;
  city?: string;
  state?: string;
  modality?: string;
  registrationStatus: string; // 'Aprovada' | 'Pendente' | 'Rascunho' | 'Rejeitada'
  rawStatus: string;          // 'approved' | 'pending' | 'draft' | 'rejected'
  isLocked: boolean;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  coachName?: string;
  assistantCoach?: string;
  physicalTrainer?: string;
  doctor?: string;
  athleteCount: number;
  athletes: DelegationAthleteRow[];
}

/** Estrutura unificada de dados para a Relação Oficial de Delegações & Responsáveis */
export interface DelegationReportData {
  competitionId?: string;
  competitionName: string;
  competitionModality?: string;
  metrics: {
    totalTeams: number;
    approvedTeams: number;
    pendingTeams: number;
    totalAthletes: number;
    teamsWithManager: number;
    teamsWithCoach: number;
  };
  teams: DelegationTeamRow[];
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DO RELATÓRIO DE ESTATÍSTICAS DE PARTIDAS, SETS E DURAÇÃO (FASE 7.5)
// ═══════════════════════════════════════════════════════════════════════════

/** Detalhamento de um set específico na partida */
export interface MatchStatisticsSetRow {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  pointDifference: number;
  winnerSide: 'A' | 'B' | null;
}

/** Linha individual de partida com estatísticas derivadas */
export interface MatchStatisticsRow {
  matchId: string;
  matchNumber: number;
  date: string;
  time: string;
  scheduledTime: string;
  venue: string;
  court?: string;
  phase?: string;
  groupName?: string;
  round?: number;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamAShortName?: string;
  teamBShortName?: string;
  teamALogo?: string;
  teamBLogo?: string;
  setsPlayed: number;
  teamASetsWon: number;
  teamBSetsWon: number;
  teamAPoints: number;
  teamBPoints: number;
  pointDifference: number;
  winnerId?: string | null;
  winnerSide?: 'A' | 'B' | null;
  winnerName?: string;
  status: string;
  statusLabel: string;
  isWo: boolean;
  isCompleted: boolean;
  setsScoreLabel: string; // Ex: '3 x 1' ou '—'
  setsBreakdownLabel: string; // Ex: '25-21, 23-25, 25-18, 25-20'
  durationLabel: string; // 'Não registrada' (domínio não possui cronômetro persistido)
  sets: MatchStatisticsSetRow[];
}

/** Resumo consolidado de desempenho por equipe na competição */
export interface TeamStatisticsSummaryRow {
  teamId: string;
  teamName: string;
  teamShortName?: string;
  teamLogo?: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number; // Percentual 0 a 100
  setsWon: number;
  setsLost: number;
  setRatio: number | null; // Set average CBV
  pointsScored: number;
  pointsConceded: number;
  pointRatio: number | null; // Point average CBV
  pointBalance: number; // Saldo de pontos (+/-)
}

/** Estrutura unificada de dados para o Relatório Estatístico de Partidas e Sets */
export interface MatchStatisticsReportData {
  competitionId?: string;
  competitionName: string;
  competitionModality?: string;
  metrics: {
    totalMatches: number;
    completedMatches: number;
    inProgressMatches: number;
    scheduledMatches: number;
    woMatches: number;
    cancelledMatches: number;
    totalSetsPlayed: number;
    totalPointsScored: number;
    averageSetsPerMatch: number;
    averagePointsPerMatch: number;
    averagePointsPerSet: number;
    tiebreakMatchesCount: number;
    durationNotice: string; // Declaração de transparência estatística
  };
  matches: MatchStatisticsRow[];
  teamSummaries: TeamStatisticsSummaryRow[];
}