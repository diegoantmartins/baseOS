// Tipos do módulo de autenticação e perfis de acesso.

export type UserRole = 'admin' | 'organizer' | 'referee' | 'scorer' | 'team' | 'team_manager' | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador(a)',
  organizer: 'Organizador(a)',
  referee: 'Árbitro(a)',
  scorer: 'Apontador(a) / Mesário',
  team: 'Representante de Equipe',
  team_manager: 'Gestor(a) de Equipe',
  viewer: 'Visualizador(a)',
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Obrigatório apenas para o perfil de equipe: vínculo com competition_team. */
  competitionTeamId?: string;
  /** Identificador da organização primária do usuário */
  organizationId?: string;
  /** Chave-mestra: Platform Admin (Master Control) */
  isPlatformAdmin?: boolean;
};

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  competitionTeamId?: string;
  organizationId?: string;
  isPlatformAdmin?: boolean;
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