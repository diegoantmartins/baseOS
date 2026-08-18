// Core Types for Volleyball Competition Management System

export type Modality = 'indoor' | 'beach';
export type IndoorFormat = '6x6' | '4x4';
export type BeachFormat = '2x2' | '3x3';
export type SetFormat = '1-set' | '2-sets' | '3-sets' | '5-sets';

export type CompetitionFormat = 
  | 'round-robin' 
  | 'single-elimination' 
  | 'double-elimination' 
  | 'olympic-bracket' 
  | 'swiss-system'
  | 'group-stage-knockout';

export type Category = {
  id: string;
  name: string;
  ageGroup?: string;
  gender: 'male' | 'female' | 'mixed';
  level?: 'amateur' | 'professional' | 'youth' | 'masters';
};

export type Athlete = {
  id: string;
  fullName: string;
  documentId?: string;
  dateOfBirth?: string;
  gender: 'male' | 'female';
  photoUrl?: string;
  jerseyNumber: number;
  position?: string;
  teamHistory: TeamHistory[];
  stats: AthleteStats;
};

export type TeamHistory = {
  teamId: string;
  teamName: string;
  startDate: string;
  endDate?: string;
};

export type AthleteStats = {
  matchesPlayed: number;
  setsWon: number;
  pointsScored: number;
  aces: number;
  blocks: number;
  kills: number;
};

export type Team = {
  id: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
  category: Category;
  athletes: Athlete[];
  coaches: Coach[];
  stats: TeamStats;
};

export type TeamStats = {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  pointsScored: number;
  pointsConceded: number;
};

export type Coach = {
  id: string;
  fullName: string;
  documentId?: string;
  photoUrl?: string;
  teams: string[];
  competitionHistory: string[];
};

export type Referee = {
  id: string;
  fullName: string;
  documentId?: string;
  photoUrl?: string;
  certificationLevel?: string;
  matchHistory: string[];
};

export type Competition = {
  id: string;
  name: string;
  description?: string;
  modality: Modality;
  format: CompetitionFormat;
  playerFormat: IndoorFormat | BeachFormat;
  setFormat: SetFormat;
  category: Category;
  genderCategory?: 'male' | 'female' | 'mixed';
  defaultDeadline?: string;
  groupName?: string;
  startDate: string;
  endDate?: string;
  venue?: string;
  teams: Team[];
  matches: Match[];
  standings: Standing[];
  status: 'draft' | 'registration' | 'in-progress' | 'completed' | 'cancelled';
  rules: CompetitionRules;
};

export type CompetitionRules = {
  pointsToWinSet: number;
  pointsToWinTiebreak: number;
  minAdvantage: number;
  maxPointsPerSet?: number;
  timeoutsPerSet: number;
  technicalTimeouts: boolean;
  substitutionsPerSet: number;
};

export type Match = {
  id: string;
  competitionId: string;
  round: number;
  matchNumber: number;
  teamA: Team;
  teamB: Team;
  venue?: string;
  court?: string;
  scheduledTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: MatchStatus;
  sets: Set[];
  currentSet: number;
  matchSheet: MatchSheet;
  referees: Referee[];
  winner?: string;
};

export type MatchStatus = 
  | 'scheduled' 
  | 'warmup' 
  | 'in-progress' 
  | 'timeout' 
  | 'set-break' 
  | 'completed' 
  | 'postponed' 
  | 'cancelled';

export type Set = {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  serveOrder: ServeOrder;
  points: Point[];
  timeouts: Timeout[];
  substitutions: Substitution[];
  winner?: 'A' | 'B';
  startTime?: string;
  endTime?: string;
};

export type ServeOrder = {
  teamA: ServeRotation;
  teamB: ServeRotation;
  currentServer: 'A' | 'B';
  currentPosition: number;
};

export type ServeRotation = {
  positions: number[]; // Jersey numbers in rotation order
  currentPosition: number;
};

export type Point = {
  pointNumber: number;
  scoringTeam: 'A' | 'B';
  scoreAfter: { A: number; B: number };
  server: { team: 'A' | 'B'; athleteId: string; jerseyNumber: number };
  type: PointType;
  timestamp: string;
};

export type PointType = 
  | 'kill' 
  | 'ace' 
  | 'block' 
  | 'opponent-error' 
  | 'tip' 
  | 'unknown';

export type Timeout = {
  team: 'A' | 'B';
  type: 'requested' | 'technical';
  scoreAt: { A: number; B: number };
  timestamp: string;
};

export type Substitution = {
  team: 'A' | 'B';
  playerIn: { athleteId: string; jerseyNumber: number };
  playerOut: { athleteId: string; jerseyNumber: number };
  scoreAt: { A: number; B: number };
  timestamp: string;
};

export type MatchSheet = {
  id: string;
  matchId: string;
  type: 'indoor-3-sets' | 'indoor-5-sets' | 'beach-1-set' | 'beach-2-sets';
  lineupA: Lineup;
  lineupB: Lineup;
  sanctions: Sanction[];
  observations?: string;
  signatures: Signature[];
  isLocked: boolean;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Lineup = {
  teamId: string;
  starters: { position: number; athleteId: string; jerseyNumber: number }[];
  substitutes: { athleteId: string; jerseyNumber: number }[];
  libero?: { athleteId: string; jerseyNumber: number };
  captain: { athleteId: string; jerseyNumber: number };
};

export type Sanction = {
  team: 'A' | 'B';
  targetType: 'player' | 'coach' | 'team';
  targetId: string;
  type: 'warning' | 'penalty' | 'expulsion' | 'disqualification';
  reason: string;
  setNumber: number;
  scoreAt: { A: number; B: number };
  timestamp: string;
};

export type Signature = {
  role: 'referee-1' | 'referee-2' | 'scorer' | 'coach-a' | 'coach-b' | 'captain-a' | 'captain-b';
  name: string;
  signatureData?: string;
  timestamp: string;
};

export type Standing = {
  position: number;
  team: Team;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  setsRatio: number;
  pointsWon: number;
  pointsLost: number;
  pointsRatio: number;
  competitionPoints: number;
};

export type BracketMatch = {
  id: string;
  round: number;
  position: number;
  match?: Match;
  teamA?: Team | 'TBD';
  teamB?: Team | 'TBD';
  winner?: Team;
  nextMatchId?: string;
};

export type Bracket = {
  type: 'single' | 'double' | 'olympic';
  rounds: BracketMatch[][];
  losersRounds?: BracketMatch[][];
  finalMatch?: BracketMatch;
};
