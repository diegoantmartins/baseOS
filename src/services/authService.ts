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

import { LoginRateLimiter } from '@/lib/security';

async function localSignIn(email: string, password: string): Promise<SignInResult> {
  const lockout = LoginRateLimiter.isLockedOut(email);
  if (lockout.locked) {
    return {
      ok: false,
      error: `Conta temporariamente bloqueada por segurança devido a excesso de tentativas. Tente novamente em ${lockout.remainingSeconds}s.`,
    };
  }

  const user = DEMO_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) {
    const fail = LoginRateLimiter.recordFailure(email);
    if (fail.locked) {
      return {
        ok: false,
        error: 'Limite de tentativas excedido (5). Sua conta foi bloqueada temporariamente por 5 minutos.',
      };
    }
    return { ok: false, error: `E-mail ou senha inválidos. Restam ${fail.attemptsLeft} tentativas.` };
  }

  LoginRateLimiter.recordSuccess(email);
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

  /** Atualiza o perfil do usuário autenticado (nome) e propaga a nova sessão. */
  async updateProfile(updates: Partial<Pick<UserProfile, 'name'>>): Promise<SignInResult> {
    const stored = readStoredSession();
    if (!stored) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

    if (isSupabaseConfigured()) {
      const { getSupabaseClient } = await import('@/lib/supabaseClient');
      const supabase = await getSupabaseClient();
      if (!supabase) return { ok: false, error: 'Supabase não configurado.' };

      const { error: authError } = await supabase.auth.updateUser({ data: updates });
      if (authError) return { ok: false, error: authError.message };
      if (updates.name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ name: updates.name })
          .eq('id', stored.user.id);
        if (profileError) return { ok: false, error: profileError.message };
      }
      const refreshed = await supabaseSession();
      if (!refreshed) return { ok: false, error: 'Falha ao atualizar a sessão.' };
      return { ok: true, session: refreshed };
    }

    const next: AuthSession = { ...stored, user: { ...stored.user, ...updates } };
    storeSession(next);
    emit(next);
    return { ok: true, session: next };
  },

  subscribe(listener: SessionListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  hasRole(session: AuthSession | null, roles: UserRole[]): boolean {
    return !!session && (roles.includes(session.user.role) || session.user.role === 'admin');
  },

  // ── Gestão de Usuários do Sistema ──────────────────────────────────────────
  async listUsers(): Promise<import('@/types/auth').SystemUser[]> {
    return readStoredUsers();
  },

  async createUser(input: Omit<import('@/types/auth').SystemUser, 'id' | 'createdAt'>): Promise<import('@/types/auth').SystemUser> {
    const users = readStoredUsers();
    const newUser: import('@/types/auth').SystemUser = {
      ...input,
      id: 'usr-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    writeStoredUsers(users);
    return newUser;
  },

  async updateUser(id: string, updates: Partial<import('@/types/auth').SystemUser>): Promise<import('@/types/auth').SystemUser> {
    const users = readStoredUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuário não encontrado');
    users[idx] = { ...users[idx], ...updates };
    writeStoredUsers(users);
    return users[idx];
  },

  async deleteUser(id: string): Promise<void> {
    const users = readStoredUsers().filter(u => u.id !== id);
    writeStoredUsers(users);
  },
};

const USERS_STORAGE_KEY = 'voleipro.system.users.v1';

function readStoredUsers(): import('@/types/auth').SystemUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  const initial: import('@/types/auth').SystemUser[] = DEMO_USERS.map((u, i) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: 'active',
    competitionTeamId: u.competitionTeamId,
    createdAt: new Date(Date.now() - (i + 1) * 86400000 * 5).toISOString(),
    lastLoginAt: new Date(Date.now() - (i + 1) * 3600000 * 2).toISOString(),
  }));
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function writeStoredUsers(users: import('@/types/auth').SystemUser[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_KEY);
}