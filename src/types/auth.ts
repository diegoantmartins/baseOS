// Tipos do módulo de autenticação e perfis de acesso.

export type UserRole = 'organizer' | 'referee' | 'team';

export const ROLE_LABELS: Record<UserRole, string> = {
  organizer: 'Organizador(a)',
  referee: 'Árbitro(a)',
  team: 'Equipe',
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Obrigatório apenas para o perfil de equipe: vínculo com competition_team. */
  competitionTeamId?: string;
};

export type AuthSession = {
  user: UserProfile;
  expiresAt?: string; // ISO (apenas modo Supabase)
};

export type SignInResult = {
  ok: boolean;
  session?: AuthSession;
  error?: string;
};