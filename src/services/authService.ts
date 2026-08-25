// Serviço de autenticação do VolleyPro.
//
// Padrão "adapter" (igual ao dataAccess):
//  - Modo demo (LocalStorage): usuários de demonstração, sem backend, com persistência de senhas e perfis.
//  - Modo Supabase: signIn/signOut via Supabase Auth + tabela `profiles`
//    (id -> auth.users.id, role, name, competition_team_id).
// Toda a aplicação consome apenas este módulo.

import type { AuthSession, SignInResult, UserProfile, UserRole } from '@/types/auth';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  AuditService,
  LoginRateLimiter,
  validatePasswordStrength,
} from '@/lib/security';

const SESSION_KEY = 'voleipro.auth.session.v1';
const PASSWORDS_KEY = 'voleipro.auth.custom_passwords.v1';
const USERS_STORAGE_KEY = 'voleipro.system.users.v1';

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

function getCustomPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PASSWORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCustomPassword(email: string, pass: string): void {
  try {
    const map = getCustomPasswords();
    map[email.trim().toLowerCase()] = pass;
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(map));
  } catch {
    // fallback
  }
}

function getStoredPasswordForEmail(email: string): string | null {
  const norm = email.trim().toLowerCase();
  const custom = getCustomPasswords()[norm];
  if (custom) return custom;
  const demo = DEMO_USERS.find(u => u.email.toLowerCase() === norm);
  return demo ? demo.password : null;
}

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
  const normEmail = email.trim().toLowerCase();
  const lockout = LoginRateLimiter.isLockedOut(normEmail);
  if (lockout.locked) {
    AuditService.logEvent(
      'Tentativa em Conta Bloqueada',
      normEmail,
      'warning',
      `Tentativa de login enquanto a conta estava bloqueada por rate limit.`
    );
    return {
      ok: false,
      error: `Conta temporariamente bloqueada por segurança devido a excesso de tentativas. Tente novamente em ${lockout.remainingSeconds}s.`,
    };
  }

  // Verifica se existe nos usuários do sistema
  const users = readStoredUsers();
  const existingUser = users.find(u => u.email.toLowerCase() === normEmail);
  const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === normEmail);

  if (existingUser && existingUser.status === 'inactive') {
    return {
      ok: false,
      error: 'Esta conta está inativada. Entre em contato com um administrador.',
    };
  }

  const expectedPassword = getStoredPasswordForEmail(normEmail);

  if (!expectedPassword || expectedPassword !== password) {
    const fail = LoginRateLimiter.recordFailure(normEmail);
    AuditService.logEvent(
      'Falha de Login',
      normEmail,
      'error',
      `Senha incorreta digitada. Restam ${fail.attemptsLeft} tentativas.`
    );
    if (fail.locked) {
      return {
        ok: false,
        error: 'Limite de tentativas excedido (5). Sua conta foi bloqueada temporariamente por 5 minutos.',
      };
    }
    return { ok: false, error: `E-mail ou senha inválidos. Restam ${fail.attemptsLeft} tentativas.` };
  }

  LoginRateLimiter.recordSuccess(normEmail);

  const profile: UserProfile = existingUser
    ? {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        competitionTeamId: existingUser.competitionTeamId,
      }
    : demoUser
      ? publicProfile(demoUser)
      : {
          id: 'usr-' + Date.now(),
          email: normEmail,
          name: normEmail.split('@')[0],
          role: 'viewer',
        };

  const session: AuthSession = { user: profile };
  storeSession(session);

  // Atualizar lastLoginAt no registro do usuário
  if (existingUser) {
    existingUser.lastLoginAt = new Date().toISOString();
    writeStoredUsers(users);
  }

  AuditService.logEvent(
    'Login com Sucesso',
    profile.email,
    'success',
    `Usuário ${profile.name} (${profile.role}) autenticado com sucesso.`
  );

  return { ok: true, session };
}

async function supabaseSignIn(email: string, password: string): Promise<SignInResult> {
  const { getSupabaseClient } = await import('@/lib/supabaseClient');
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: 'Supabase não configurado.' };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    AuditService.logEvent('Falha de Login (Supabase)', email, 'error', error?.message ?? 'Credenciais inválidas');
    return { ok: false, error: error?.message ?? 'Falha ao autenticar.' };
  }

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

  AuditService.logEvent(
    'Login com Sucesso (Supabase)',
    user.email,
    'success',
    `Usuário ${user.name} autenticado via Supabase Auth.`
  );

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

  /** Sessão atual; no modo Supabase revalida com o servidor. */
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
    const session = readStoredSession();
    if (session) {
      AuditService.logEvent(
        'Logout Realizado',
        session.user.email,
        'info',
        `Sessão encerrada para ${session.user.name}.`
      );
    }
    if (isSupabaseConfigured()) {
      const { getSupabaseClient } = await import('@/lib/supabaseClient');
      const supabase = await getSupabaseClient();
      await supabase?.auth.signOut();
    }
    storeSession(null);
    emit(null);
  },

  /** Valida se a senha atual confere com a do usuário logado. */
  verifyCurrentPassword(password: string): boolean {
    const session = readStoredSession();
    if (!session) return false;
    const currentPass = getStoredPasswordForEmail(session.user.email);
    return currentPass !== null && currentPass === password;
  },

  /** Troca de senha da própria conta do usuário autenticado. */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
    const session = readStoredSession();
    if (!session) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    const val = validatePasswordStrength(newPassword);
    if (!val.valid) {
      return { ok: false, error: val.message ?? 'A nova senha não atende aos requisitos de segurança.' };
    }

    if (isSupabaseConfigured()) {
      const { getSupabaseClient } = await import('@/lib/supabaseClient');
      const supabase = await getSupabaseClient();
      if (!supabase) return { ok: false, error: 'Supabase não configurado.' };

      // Se possível re-autentica com a senha antiga
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (signInError) {
        AuditService.logEvent(
          'Tentativa Falha de Troca de Senha',
          session.user.email,
          'warning',
          'Senha atual informada estava incorreta.'
        );
        return { ok: false, error: 'A senha atual informada está incorreta.' };
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        return { ok: false, error: updateError.message };
      }

      AuditService.logEvent(
        'Alteração de Senha',
        session.user.email,
        'success',
        'Senha da própria conta alterada com sucesso via Supabase Auth.'
      );
      return { ok: true };
    }

    // Modo local / demo
    const expected = getStoredPasswordForEmail(session.user.email);
    if (expected && expected !== currentPassword) {
      AuditService.logEvent(
        'Tentativa Falha de Troca de Senha',
        session.user.email,
        'warning',
        'Senha atual informada estava incorreta.'
      );
      return { ok: false, error: 'A senha atual informada está incorreta.' };
    }

    setCustomPassword(session.user.email, newPassword);

    AuditService.logEvent(
      'Alteração de Senha',
      session.user.email,
      'success',
      'Senha da própria conta alterada com sucesso.'
    );

    return { ok: true };
  },

  /** Redefinição de senha de terceiros por um administrador / organizador. */
  async adminResetPassword(userId: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
    const session = readStoredSession();
    if (!session || !this.hasRole(session, ['admin', 'organizer'])) {
      return { ok: false, error: 'Permissão negada. Apenas administradores podem redefinir senhas.' };
    }

    const val = validatePasswordStrength(newPassword);
    if (!val.valid) {
      return { ok: false, error: val.message ?? 'A nova senha não atende aos requisitos mínimos.' };
    }

    const users = readStoredUsers();
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      return { ok: false, error: 'Usuário não encontrado.' };
    }

    setCustomPassword(targetUser.email, newPassword);

    AuditService.logEvent(
      'Redefinição Administrativa de Senha',
      session.user.email,
      'warning',
      `Senha do usuário ${targetUser.name} (${targetUser.email}) foi redefinida por ${session.user.name}.`
    );

    return { ok: true };
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

    // Sincroniza também no registro de usuários do sistema
    const users = readStoredUsers();
    const idx = users.findIndex(u => u.id === stored.user.id || u.email.toLowerCase() === stored.user.email.toLowerCase());
    if (idx !== -1 && updates.name) {
      users[idx].name = updates.name;
      writeStoredUsers(users);
    }

    AuditService.logEvent(
      'Atualização de Perfil',
      stored.user.email,
      'info',
      `Nome de perfil alterado para "${updates.name}".`
    );

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

  async createUser(
    input: Omit<import('@/types/auth').SystemUser, 'id' | 'createdAt'> & { initialPassword?: string }
  ): Promise<import('@/types/auth').SystemUser> {
    const session = readStoredSession();
    const users = readStoredUsers();

    if (users.some(u => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    const { initialPassword, ...userFields } = input;

    const newUser: import('@/types/auth').SystemUser = {
      ...userFields,
      id: 'usr-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    writeStoredUsers(users);

    const defaultPass = initialPassword || 'volei123';
    setCustomPassword(newUser.email, defaultPass);

    AuditService.logEvent(
      'Criação de Usuário',
      session?.user.email ?? 'Administrador',
      'success',
      `Novo usuário criado: ${newUser.name} (${newUser.email}) com perfil ${newUser.role}.`
    );

    return newUser;
  },

  async updateUser(id: string, updates: Partial<import('@/types/auth').SystemUser>): Promise<import('@/types/auth').SystemUser> {
    const session = readStoredSession();
    const users = readStoredUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuário não encontrado');
    users[idx] = { ...users[idx], ...updates };
    writeStoredUsers(users);

    AuditService.logEvent(
      'Atualização de Usuário',
      session?.user.email ?? 'Administrador',
      'info',
      `Usuário ${users[idx].name} (${users[idx].email}) atualizado. Status: ${users[idx].status}, Perfil: ${users[idx].role}.`
    );

    return users[idx];
  },

  async deleteUser(id: string): Promise<void> {
    const session = readStoredSession();
    const users = readStoredUsers();
    const target = users.find(u => u.id === id);
    const filtered = users.filter(u => u.id !== id);
    writeStoredUsers(filtered);

    AuditService.logEvent(
      'Exclusão de Usuário',
      session?.user.email ?? 'Administrador',
      'warning',
      `Usuário ${target?.name ?? id} foi removido do sistema.`
    );
  },
};

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