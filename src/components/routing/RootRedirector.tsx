import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { dataAccess } from '@/services/dataAccess';
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback';
import LandingPage from '@/pages/LandingPage';
import type { UserMembership } from '@/types/identity';

/**
 * RootRedirector — Gatekeeper Global de Roteamento SaaS (Frente 8)
 *
 * Atua na raiz '/' da aplicação:
 * 1. Sem sessão ativa: renderiza o Portal Público de Jogos.
 * 2. Com sessão ativa: consulta user_memberships (status = 'active')
 *    - Se possuir membership 'admin' ou 'organizer': redireciona para '/dashboard'.
 *    - Se possuir apenas roles 'team_manager' ou 'athlete': redireciona para '/portal/equipe'.
 *    - Se autenticado sem vínculos (ex: fã): renderiza o Portal Público.
 */
export function RootRedirector() {
  const { session, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserMemberships(userId: string) {
      setLoadingMemberships(true);
      try {
        const userMemberships = await dataAccess.listUserMemberships(userId);
        if (isMounted) {
          setMemberships(userMemberships || []);
        }
      } catch (err) {
        console.error('[RootRedirector] Erro ao carregar vínculos de usuário:', err);
        if (isMounted) {
          setMemberships([]);
        }
      } finally {
        if (isMounted) {
          setLoadingMemberships(false);
          setHasResolved(true);
        }
      }
    }

    if (!authLoading) {
      if (session?.user?.id) {
        fetchUserMemberships(session.user.id);
      } else {
        setHasResolved(true);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, session?.user?.id]);

  // Enquanto valida sessão ou carrega memberships do usuário autenticado
  if (authLoading || (session?.user && (!hasResolved || loadingMemberships))) {
    return <RouteLoadingFallback />;
  }

  // 1. Sem sessão ativa -> Renderiza rota '/' (Portal Público / Landing)
  if (!session) {
    return <LandingPage />;
  }

  // 1.5. Platform Admin → sempre para /master (camada de controle global)
  if (session.user.isPlatformAdmin) {
    return <Navigate to="/master" replace />;
  }

  // Filtra apenas memberships ativas
  const activeMemberships = memberships.filter((m) => m.status === 'active');

  // 2. Se o usuário tiver membership com role 'admin' na organização → dashboard
  const hasAdminOrOrganizer =
    activeMemberships.some((m) => m.role === 'admin' || m.role === 'organizer') ||
    session.user.role === 'admin' ||
    session.user.role === 'organizer';

  if (hasAdminOrOrganizer) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Se possuir apenas roles 'team_manager' ou 'athlete' (ou legado 'team')
  const hasOnlyTeamOrAthleteMemberships =
    activeMemberships.length > 0 &&
    activeMemberships.every(
      (m) =>
        m.role === 'team_manager' ||
        m.role === 'athlete' ||
        (m.role as string) === 'team'
    );

  const isLegacyTeamOnly = activeMemberships.length === 0 && session.user.role === 'team';

  if (hasOnlyTeamOrAthleteMemberships || isLegacyTeamOnly) {
    return <Navigate to="/portal/equipe" replace />;
  }

  // Árbitros e apontadores
  const isRefereeOrScorer =
    activeMemberships.some((m) => m.role === 'referee' || m.role === 'scorer') ||
    session.user.role === 'referee' ||
    session.user.role === 'scorer';

  if (isRefereeOrScorer) {
    return <Navigate to="/jogos" replace />;
  }

  // 4. Se autenticado, mas sem vínculos (ex: fã logado ou viewer) -> Renderiza Landing
  return <LandingPage />;
}

export default RootRedirector;
