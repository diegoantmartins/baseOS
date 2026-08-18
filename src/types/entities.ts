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
  scheduledTime: string;
  status: 'scheduled' | 'warmup' | 'in-progress' | 'timeout' | 'set-break' | 'completed' | 'postponed' | 'cancelled';
  sets: SetScoreRecord[];
  referees: MatchRefereeRecord[];
  observations?: string;
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
};
