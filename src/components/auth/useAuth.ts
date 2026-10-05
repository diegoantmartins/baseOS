import { createContext, useContext } from 'react';
import type { AuthSession, SignInResult, UserProfile, UserRole } from '@/types/auth';

export interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPlatformAdmin?: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name'>>) => Promise<SignInResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
