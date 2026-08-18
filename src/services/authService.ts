// Serviço de autenticação do VolleyPro.
//
// Padrão "adapter" (igual ao dataAccess):
//  - Modo demo (LocalStorage): usuários de demonstração, sem backend.
//  - Modo Supabase: signIn/signOut via Supabase Auth + tabela `profiles`
//    (id -> auth.users.id, role, name, competition_team_id).
// Toda a aplicação consome apenas este módulo.

import type { AuthSession, SignInResult, UserProfile, UserRole } from '@/types/auth';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

const SESSION_KEY = 'voleipro.auth.session.v1';

type DemoUser = UserProfile & { password: string };

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'demo-organizer',
    email: 'organizador@voleipro.app',
    password: 'demo123',
    name: 'Ana Organizadora',
    role: 'organizer',
  },
  {
    id: 'demo-referee',
    email: 'arbitro@voleipro.app',
    password: 'demo123',
    name: 'Carlos Silva',
    role: 'referee',
  },
  {
    id: 'demo-team',
    email: 'equipe@voleipro.app',
    password: 'demo123',
    name: 'Minas Tênis Clube',
    role: 'team',
    competitionTeamId: 'ct-2',
  },
];

function publicProfile(user: DemoUser | UserProfile): UserProfile {
  const { password: _password, ...rest } = user as DemoUser;
  void _password;
  return rest;
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    return session?.user?.email ? session : null;
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null): void {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

async function localSignIn(email: string, password: string): Promise<SignInResult> {
  const user = DEMO_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) {
    return { ok: false, error: 'E-mail ou senha inválidos.' };
  }
  const session: AuthSession = { user: publicProfile(user) };
  storeSession(session);
  return { ok: true, session };
}

async function supabaseSignIn(email: string, password: string): Promise<SignInResult> {
  const { getSupabaseClient } = await import('@/lib/supabaseClient');
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: 'Supabase não configurado.' };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Falha ao autenticar.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, competition_team_id')
    .eq('id', data.user.id)
    .maybeSingle();

  const user: UserProfile = {
    id: data.user.id,
    email: data.user.email ?? email,
    name: profile?.name ?? data.user.email ?? 'Usuário',
    role: (profile?.role as UserRole | undefined) ?? 'team',
    competitionTeamId: profile?.competition_team_id ?? undefined,
  };
  const session: AuthSession = { user, expiresAt: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : undefined };
  storeSession(session);
  return { ok: true, session };
}

async function supabaseSession(): Promise<AuthSession | null> {
  const { getSupabaseClient } = await import('@/lib/supabaseClient');
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    storeSession(null);
    return null;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, competition_team_id')
    .eq('id', data.session.user.id)
    .maybeSingle();
  const session: AuthSession = {
    user: {
      id: data.session.user.id,
      email: data.session.user.email ?? '',
      name: profile?.name ?? data.session.user.email ?? 'Usuário',
      role: (profile?.role as UserRole | undefined) ?? 'team',
      competitionTeamId: profile?.competition_team_id ?? undefined,
    },
    expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : undefined,
  };
  storeSession(session);
  return session;
}

type SessionListener = (session: AuthSession | null) => void;

const listeners = new Set<SessionListener>();

function emit(session: AuthSession | null): void {
  for (const listener of listeners) listener(session);
}

export const authService = {
  /** Sessão persistida (leitura síncrona do storage local). */
  getStoredSession(): AuthSession | null {
    return readStoredSession();
  },

  /** Sessão atual; no modo Supabase revalida com o servidor (sem fallback para sessão local vencida). */
  async getSession(): Promise<AuthSession | null> {
    const stored = readStoredSession();
    if (!isSupabaseConfigured()) return stored;
    return supabaseSession().catch(() => stored);
  },

  async signIn(email: string, password: string): Promise<SignInResult> {
    const result = isSupabaseConfigured()
      ? await supabaseSignIn(email, password)
      : await localSignIn(email, password);
    if (result.ok) emit(result.session);
    return result;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      const { getSupabaseClient } = await import('@/lib/supabaseClient');
      const supabase = await getSupabaseClient();
      await supabase?.auth.signOut();
    }
    storeSession(null);
    emit(null);
  },

  subscribe(listener: SessionListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  hasRole(session: AuthSession | null, roles: UserRole[]): boolean {
    return !!session && roles.includes(session.user.role);
  },
};

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_KEY);
}