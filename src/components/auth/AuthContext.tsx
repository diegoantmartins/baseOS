// Contexto de autenticação: sessão reativa compartilhada pela aplicação.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthSession, SignInResult, UserProfile, UserRole } from '@/types/auth';
import { authService } from '@/services/authService';
import { AuthContext, type AuthContextValue } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authService.getSession().then((s) => {
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

  const isPlatformAdmin = Boolean(
    session?.user?.isPlatformAdmin ||
    (session?.user?.email && session.user.email.toLowerCase() === 'diegoantmartins89@gmail.com')
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isAuthenticated: session !== null,
      isPlatformAdmin,
      hasRole: (roles: UserRole[]) => authService.hasRole(session, roles),
      signIn,
      signOut,
      updateProfile,
    }),
    [session, loading, isPlatformAdmin, signIn, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}