/**
 * BaseOS — RequirePlatformAdmin Guard
 *
 * Guarda de rota exclusiva para a camada Master (Platform Admin).
 * Usuários sem a flag is_platform_admin são redirecionados para /dashboard.
 */

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface RequirePlatformAdminProps {
  children: React.ReactNode;
}

export function RequirePlatformAdmin({ children }: RequirePlatformAdminProps) {
  const { session, loading, isPlatformAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && session && !isPlatformAdmin) {
      toast.error('Acesso restrito: Requer privilégios de Platform Admin (Master Control).');
    }
  }, [loading, session, isPlatformAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400">Verificando autorização master...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
