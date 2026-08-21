// =====================================================================
// Schemas do Motor de Documentos — Domínio da Partida
//
// Modelo conceitual consumido pelos geradores de documentos (súmula e
// ficha de posição/ordem de saque). É derivado dos registros persistidos
// (MatchRecord, CompetitionAthlete etc.) — NUNCA duplica o banco.
// =====================================================================

/** Situação da partida para fins de versão do documento (auditoria). */
export type MatchStatus = 'DRAFT' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

export type Gender = 'male' | 'female' | 'mixed';

/** Formato de disputa — define qual template de súmula é usado. */
export type MatchFormat = '3-sets' | '5-sets';

/** Posições regulamentares da ordem de saque (rotação). */
export type PlayerPosition = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export const PLAYER_POSITIONS: PlayerPosition[] = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Ordem de rotação regulamentar: quem ocupa a posição N passa a ocupar N-1
 *  após a perda de saque; a posição I (saque) é ocupada por quem estava em II. */
export const ROTATION_ORDER: Record<PlayerPosition, PlayerPosition> = {
  I: 'II',
  II: 'III',
  III: 'IV',
  IV: 'V',
  V: 'VI',
  VI: 'I',
};

export type Player = {
  id: string;
  name: string;
  /** Número da camisa (1-99). Opcional: pode ser confirmado no dia. */
  shirtNumber?: number;
  /** Posição de jogo (Levantador, Ponteiro, Central, Oposto, Líbero...). */
  position?: string;
  isCaptain?: boolean;
  active: boolean;
};

export type Team = {
  id: string;
  name: string;
  shortName: string;
  captainId?: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  players: Player[];
  liberoPlayers: Player[];
  coach?: string;
  assistantCoach?: string;
  medicalStaff?: string;
  technicalStaff?: string;
};

/**
 * Escalação de um set — a ordem de saque NÃO é uma lista solta de jogadores;
 * ela fica vinculada às posições I..VI da quadra.
 */
export type Lineup = {
  setNumber: number;
  teamId: string;
  /** playerId por posição de quadra (I = posição de saque). */
  positions: Record<PlayerPosition, string>;
  servingPosition: PlayerPosition;
  liberoPlayerId?: string;
};

export type Substitution = {
  setNumber: number;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  scoreA: number;
  scoreB: number;
  timestamp: string;
};

export type TimeoutEvent = {
  teamId: string;
  type: 'requested' | 'technical';
  scoreA: number;
  scoreB: number;
  timestamp: string;
};

export type SanctionType = 'warning' | 'penalty' | 'expulsion' | 'disqualification';

export type SanctionTarget = 'player' | 'coach' | 'assistant' | 'medical' | 'staff' | 'team';

export type Sanction = {
  setNumber: number;
  teamId: string;
  targetType: SanctionTarget;
  playerId?: string;
  type: SanctionType;
  scoreA: number;
  scoreB: number;
  timestamp: string;
};

/** Solicitação indevida (não é sanção — área própria do template). */
export type ImproperRequest = {
  setNumber: number;
  teamId: string;
  scoreA: number;
  scoreB: number;
  timestamp: string;
};

export type SetData = {
  number: number;
  pointsA: number;
  pointsB: number;
  lineupA?: Lineup;
  lineupB?: Lineup;
  servingTeam?: 'A' | 'B';
  startTime?: string;
  endTime?: string;
  substitutions: Substitution[];
  timeouts: TimeoutEvent[];
  sanctions: Sanction[];
  observations?: string;
};

export type MatchResult = {
  winnerTeamId?: string;
  teamASets: number;
  teamBSets: number;
  totalSets: number;
  /** Duração total em minutos. */
  totalDuration?: number;
};

export type Officials = {
  referee1?: string;
  referee2?: string;
  scorer?: string;
  assistantScorer?: string;
  lineJudge1?: string;
  lineJudge2?: string;
  lineJudge3?: string;
  lineJudge4?: string;
};

export type MatchEventType =
  | 'POINT'
  | 'ROTATION'
  | 'SUBSTITUTION'
  | 'TIMEOUT'
  | 'SANCTION'
  | 'REQUEST'
  | 'SET_START'
  | 'SET_END'
  | 'MATCH_START'
  | 'MATCH_END';

export type MatchEvent = {
  id: string;
  matchId: string;
  setNumber?: number;
  type: MatchEventType;
  teamId?: string;
  playerId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

/** Dados agregados de uma partida prontos para o motor de documentos. */
export type MatchDocument = {
  id: string;
  matchNumber: number;
  competitionId: string;
  competitionName: string;
  categoryName: string;
  gender: Gender;
  phase?: string;
  round: number;
  /** Data ISO (YYYY-MM-DD). */
  date: string;
  /** Horário previsto (HH:mm). */
  startTime: string;
  venue: string;
  court?: string;
  city?: string;
  format: MatchFormat;
  status: MatchStatus;
  teamA: Team;
  teamB: Team;
  lineups: Lineup[];
  sets: SetData[];
  officials: Officials;
  result?: MatchResult;
  observations?: string;
};

// ---------------------------------------------------------------------
// Controle de versão e auditoria dos documentos gerados
// ---------------------------------------------------------------------

export type DocumentType = 'SUMMULA_3' | 'SUMMULA_5' | 'ORDEM_SAQUE';

export type DocumentVersionStatus = 'draft' | 'final';

export type DocumentGeneration = {
  id: string;
  matchId: string;
  documentType: DocumentType;
  version: number;
  generatedAt: string;
  generatedBy?: string;
  /** Hash do conteúdo do PDF (SHA-256) para auditoria de integridade. */
  hash: string;
  filePath?: string;
  status: DocumentVersionStatus;
};