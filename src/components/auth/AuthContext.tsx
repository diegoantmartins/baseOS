// Contexto de autenticação: sessão reativa compartilhada pela aplicação.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthSession, SignInResult, UserProfile, UserRole } from '@/types/auth';
import { authService } from '@/services/authService';

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name'>>) => Promise<SignInResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authService.getSession().then(s => {
      if (!active) return;
      setSession(s);
      setLoading(false);
    });
    const unsubscribe = authService.subscribe(setSession);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback((email: string, password: string) => authService.signIn(email, password), []);
  const signOut = useCallback(() => authService.signOut(), []);
  const updateProfile = useCallback(
    (updates: Partial<Pick<UserProfile, 'name'>>) => authService.updateProfile(updates),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isAuthenticated: session !== null,
      hasRole: (roles: UserRole[]) => authService.hasRole(session, roles),
      signIn,
      signOut,
      updateProfile,
    }),
    [session, loading, signIn, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}