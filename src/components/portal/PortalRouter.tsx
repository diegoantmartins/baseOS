// PortalRouter — Rota central de entrada /portal
// Direciona o usuário autenticado para seu portal exclusivo com base em seu perfil.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback';

export function PortalRouter() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoadingFallback />;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const role = session.user.role;

  if (role === 'team') {
    if (!session.user.competitionTeamId) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/portal/equipe" replace />;
  }

  if (role === 'admin' || role === 'organizer') {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === 'referee' || role === 'scorer') {
    return <Navigate to="/jogos" replace />;
  }

  // Perfis desconhecidos ou viewer são redirecionados para a tela inicial pública
  return <Navigate to="/" replace />;
}
