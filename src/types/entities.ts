// Entidades persistidas pela camada de dados (LocalStorage/Supabase)
// São formas "leves" usadas no repositório, com referências por id.

export type CompetitionLifecycleStatus =
  | 'planning'
  | 'registration-open'
  | 'registration-closed'
  | 'draw-pending'
  | 'groups-defined'
  | 'in-progress'
  | 'playoffs'
  | 'completed'
  | 'cancelled'
  | 'draft' // legados
  | 'registration';

export type TiebreakCriterionId =
  | 'victories'
  | 'points'
  | 'sets-balance'
  | 'points-balance'
  | 'head-to-head'
  | 'set-average'
  | 'sets-ratio'
  | 'points-average'
  | 'points-ratio'
  | 'draw';

export type PhaseSetRules = {
  groupStage?: '3-sets' | '5-sets';
  playoffs?: '3-sets' | '5-sets';
  semifinals?: '3-sets' | '5-sets';
  final?: '3-sets' | '5-sets';
};

export type ModalityRecord = {
  id: string;
  name: string;
  type: 'indoor' | 'beach';
  defaultPlayerFormat: string;
  defaultSetFormat: string;
  defaultSetPoints: number;
  defaultTiebreakPoints: number;
  description?: string;
};

export type CompetitionRecord = {
  id: string;
  name: string;
  modality: 'indoor' | 'beach';
  modalityId?: string;
  format: string;
  playerFormat: string;
  setFormat: string;
  genderCategory: 'male' | 'female' | 'mixed';
  defaultDeadline?: string;
  groupName?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  description?: string;
  /** Número de quadras disponíveis */
  courtsCount?: number;
  /** Quantidade de grupos */
  groupsCount?: number;
  /** Equipes por grupo */
  teamsPerGroup?: number;
  /** Quantidade de classificados por grupo */
  advancingPerGroup?: number;
  /** Utilização de melhores terceiros */
  useBestThirds?: boolean;
  /** Quantidade de melhores terceiros que avançam */
  bestThirdsCount?: number;
  /** Critérios de desempate ordenáveis */
  tiebreakCriteria?: TiebreakCriterionId[];
  tiebreakCriteriaOrder?: TiebreakCriterionId[];
  /** Configuração de sets específica por fase */
  phaseSetRules?: PhaseSetRules;
  /** Tempo padrão entre partidas (minutos) */
  defaultMatchIntervalMinutes?: number;
  /** Intervalo mínimo de descanso entre partidas da mesma equipe (minutos) */
  minTeamRestMinutes?: number;
  /** Regras de WO */
  woRules?: string;
  /** Status do ciclo de vida */
  status: CompetitionLifecycleStatus;
  /** Pódios finais */
  championTeamId?: string;
  runnerUpTeamId?: string;
  thirdPlaceTeamId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TeamRecord = {
  id: string;
  name: string;
  shortName: string;
  modality: 'indoor' | 'beach';
  city?: string;
  state?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  managerPassword?: string;
  registrationToken?: string;
  coachName?: string;
  /** Logo/escudo da equipe (data URI base64 ou URL Supabase Storage). */
  logoUrl?: string;
  status?: 'registered' | 'invited' | 'confirmed' | 'blocked';
  createdAt?: string;
  updatedAt?: string;
};

export type CourtStatus = 'active' | 'blocked' | 'maintenance' | 'unavailable';

export type CourtDetail = {
  id: string;
  name: string;
  status: CourtStatus;
  notes?: string;
};

/** Local/Ginásio com suas quadras. */
export type VenueRecord = {
  id: string;
  name: string;
  address?: string;
  responsible?: string;
  notes?: string;
  courts: string[]; // nomes ou IDs de quadras
  courtDetails?: CourtDetail[];
  createdAt: string;
  updatedAt: string;
};

export type PersonRole = 'manager' | 'coach' | 'athlete' | 'referee';

export type PersonRecord = {
  id: string;
  fullName: string;
  nickname?: string;
  documentId?: string;
  birthDate?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  roles: PersonRole[];
  teamIds?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type MatchAuditEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  note?: string;
};

export type MatchLifecycleStatus =
  | 'awaiting_schedule'
  | 'negotiating'
  | 'scheduled'
  | 'sheet_available'
  | 'warmup'
  | 'in-progress'
  | 'timeout'
  | 'set-break'
  | 'completed'
  | 'awaiting_homologation'
  | 'homologated'
  | 'cancelled'
  | 'postponed'
  | 'rescheduled'
  | 'wo';

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
  /** Fase do jogo: 'classificatória' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro_lugar' | 'final' | nome livre. */
  phase?: string;
  /** Grupo/chave na fase classificatória (ex.: 'Grupo A'). */
  groupName?: string;
  scheduledTime: string;
  status: MatchLifecycleStatus;
  sets: SetScoreRecord[];
  referees: MatchRefereeRecord[];
  lineups?: { teamA: MatchLineup; teamB: MatchLineup };
  observations?: string;
  winnerId?: string;
  isWo?: boolean;
  woReason?: string;
  customSetFormat?: '3-sets' | '5-sets';
  homologatedAt?: string;
  homologatedBy?: string;
  auditLog?: MatchAuditEntry[];
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
