// Guarda de rota: exige sessão (e, opcionalmente, um perfil específico).

import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import type { UserRole } from '@/types/auth';

interface RequireAuthProps {
  children: ReactNode;
  roles?: UserRole[];
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { session, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !hasRole(roles)) {
    if (session?.user.role === 'team' || session?.user.role === 'team_manager') {
      return <Navigate to="/portal/equipe" replace />;
    }
    if (session?.user.role === 'referee' || session?.user.role === 'scorer') {
      return <Navigate to="/jogos" replace />;
    }
    return <Navigate to="/competicoes-ativas" replace />;
  }

  return <>{children}</>;
}