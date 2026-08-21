// Tipos do módulo de autenticação e perfis de acesso.

export type UserRole = 'admin' | 'organizer' | 'referee' | 'scorer' | 'team' | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador(a)',
  organizer: 'Organizador(a)',
  referee: 'Árbitro(a)',
  scorer: 'Apontador(a) / Mesário',
  team: 'Representante de Equipe',
  viewer: 'Visualizador(a)',
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Obrigatório apenas para o perfil de equipe: vínculo com competition_team. */
  competitionTeamId?: string;
};

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  competitionTeamId?: string;
  createdAt: string;
  lastLoginAt?: string;
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