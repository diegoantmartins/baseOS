// Entidades persistidas pela camada de dados (LocalStorage/Supabase)
// São formas "leves" usadas no repositório, com referências por id.

export type CompetitionRecord = {
  id: string;
  name: string;
  modality: 'indoor' | 'beach';
  format: string;
  playerFormat: string;
  setFormat: string;
  genderCategory: 'male' | 'female' | 'mixed';
  defaultDeadline?: string;
  groupName?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  status: 'draft' | 'registration' | 'in-progress' | 'completed' | 'cancelled';
};

export type TeamRecord = {
  id: string;
  name: string;
  shortName: string;
  modality: 'indoor' | 'beach';
  coachName?: string;
  /** Logo/escudo da equipe (data URI base64 ou URL Supabase Storage). */
  logoUrl?: string;
};

/** Local/Ginásio com suas quadras. */
export type VenueRecord = {
  id: string;
  name: string;
  address?: string;
  courts: string[];
  createdAt: string;
  updatedAt: string;
};

export type RefereeRecord = {
  id: string;
  name: string;
  level?: string;
};

export type SetScoreRecord = {
  setNumber: number;
  scoreA: number;
  scoreB: number;
};

export type MatchRefereeRecord = {
  role: string;
  name: string;
};

export type MatchLineup = {
  starterIds: string[];
  captainId?: string;
  liberoId?: string;
};

export type MatchRecord = {
  id: string;
  competitionId: string;
  round: number;
  matchNumber: number;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamAShortName: string;
  teamBShortName: string;
  venue: string;
  court?: string;
  /** Fase do jogo: 'classificatória' | 'quartas' | 'semifinal' | 'final' | nome livre. */
  phase?: string;
  /** Grupo/chave na fase classificatória (ex.: 'Grupo A'). */
  groupName?: string;
  scheduledTime: string;
  status: 'scheduled' | 'warmup' | 'in-progress' | 'timeout' | 'set-break' | 'completed' | 'postponed' | 'cancelled';
  sets: SetScoreRecord[];
  referees: MatchRefereeRecord[];
  lineups?: { teamA: MatchLineup; teamB: MatchLineup };
  observations?: string;
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPrefs = {
  matchScheduled: boolean;
  rosterSubmitted: boolean;
  matchResult: boolean;
  marketing: boolean;
  liveGames: boolean;
  pendingSheets: boolean;
  dailyDigest: boolean;
};

export type ScoringRules = {
  pointsPerWin: number;
  pointsPerLoss: number;
  pointsPerSetWin: number;
  pointsPerSetLoss: number;
  tiebreakPoints: number;
  /** Pontos para vencer um set (ex.: 25 em quadra, 21 em praia). */
  setPoints: number;
  /** Tempos técnicos por set. */
  timeoutsPerSet: number;
};

export type SettingsRecord = {
  id: string;
  orgName: string;
  orgCode: string;
  cnpj: string;
  website: string;
  contactEmail: string;
  phone: string;
  address: string;
  /** Logotipo usado nos documentos gerados (data URL PNG/JPEG/SVG). */
  documentLogo?: string;
  notifications: NotificationPrefs;
  rules: ScoringRules;
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en' | 'es';
};
