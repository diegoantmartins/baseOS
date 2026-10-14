// Tipos do Módulo de Inscrição Online por Equipe (BaseOS)

export type GenderCategory = 'male' | 'female' | 'mixed';

export type RegistrationStatus = 'invited' | 'in_progress' | 'submitted' | 'approved' | 'rejected';

export const GENDER_CATEGORY_LABELS: Record<GenderCategory, string> = {
  male: 'Masculino',
  female: 'Feminino',
  mixed: 'Misto',
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  invited: 'Convidada',
  in_progress: 'Em Preenchimento',
  submitted: 'Aguardando análise',
  approved: 'Confirmada',
  rejected: 'Recusada',
};

/**
 * Limites de elenco por formato de jogo (vôlei de quadra).
 * Indoors: mínimo 6 e máximo 14 (configurável até 18) atletas.
 */
export const ROSTER_LIMITS: Record<string, { min: number; max: number }> = {
  '6x6': { min: 6, max: 14 },
  '4x4': { min: 6, max: 14 },
  '2x2': { min: 2, max: 4 },
  '3x3': { min: 2, max: 4 },
};

export const MAX_LIBEROS = 2;
export const MAX_CAPTAINS = 1;

export type CompetitionTeam = {
  id: string;
  competitionId: string;
  teamId: string;
  teamName: string;
  teamShortName: string;
  accessToken: string;
  registrationDeadline: string; // ISO 8601
  isLocked: boolean;
  status: RegistrationStatus;
  customNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CompetitionAthlete = {
  id: string;
  competitionTeamId: string;
  name: string;
  /** Opcional: o número pode ser confirmado no dia da competição. */
  jerseyNumber?: number;
  position: string;
  documentNumber?: string;
  birthDate?: string; // YYYY-MM-DD
  isCaptain: boolean;
  isLibero: boolean;
  gender: 'male' | 'female';
  /** FK aditiva para a identidade global de atleta (athletes.id). */
  athleteId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CompetitionAthleteInput = Omit<CompetitionAthlete, 'id' | 'competitionTeamId' | 'createdAt' | 'updatedAt'>;

export type RegistrationValidationResult = {
  valid: boolean;
  errors: string[];
};
