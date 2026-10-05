/**
 * BaseOS — TenantRouteGuard
 *
 * Guard de Rota para Proteção contra IDOR / BOLA Multi-Tenant.
 * Intercepta parâmetros da rota (:competitionId, :id, :organizationId, :matchId)
 * e query string (?competitionId=...) em rotas de gestão administrativa.
 *
 * Valida rigorosamente se o recurso requisitado pertence ao organization_id
 * do tenant ativo do usuário logado via TenantSecurityService.validateTenantAccess.
 *
 * Em caso de divergência ou violação cross-tenant:
 * 1. Bloqueia a renderização do componente protegido.
 * 2. Emite log forense detalhado no console.
 * 3. Dispara toast de erro com mensagem de "Acesso Negado (403)".
 * 4. Redireciona o invasor imediatamente para /dashboard.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { dataAccess } from '@/services/dataAccess';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback';
import { toast } from 'sonner';

interface TenantRouteGuardProps {
  children?: React.ReactNode;
}

export function TenantRouteGuard({ children }: TenantRouteGuardProps) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { session, loading: authLoading, isPlatformAdmin } = useAuth();
  const { currentOrganizationId, isLoading: tenantLoading } = useTenant();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkTenantAuthorization() {
      // Aguarda carregamento de autenticação e tenant
      if (authLoading || tenantLoading) return;

      // 1. Bypass se for Platform Admin em modo global
      if (isPlatformAdmin) {
        if (isMounted) {
          setIsAuthorized(true);
          setIsVerifying(false);
        }
        return;
      }

      const activeOrgId =
        currentOrganizationId ||
        dataAccess.getActiveOrganizationId() ||
        session?.user?.organizationId;

      if (!activeOrgId) {
        console.warn('[TenantRouteGuard] Bloqueio 403: Usuário sem organização ativa identificada.');
        toast.error('Acesso Negado (403)', {
          description: 'Nenhum contexto de organização ativo foi identificado.',
        });
        if (isMounted) {
          setIsAuthorized(false);
          setIsVerifying(false);
          navigate('/dashboard', { replace: true });
        }
        return;
      }

      const tenantContext = { organizationId: activeOrgId };

      try {
        // 2. Validação por :organizationId
        const targetOrgId = params.organizationId;
        if (targetOrgId) {
          if (targetOrgId !== activeOrgId) {
            // Verifica se o usuário tem membership ativa na organização requisitada
            const userMemberships = session?.user?.id
              ? await dataAccess.listUserMemberships(session.user.id)
              : [];
            const canView = TenantSecurityService.canViewOrganization(
              session?.user,
              targetOrgId,
              userMemberships
            );
            if (!canView) {
              console.warn(
                `[TenantRouteGuard] Bloqueio 403: Tentativa de acesso cross-tenant à organização "${targetOrgId}".`
              );
              toast.error('Acesso Negado (403)', {
                description: 'Você não possui permissão para acessar recursos desta organização.',
              });
              if (isMounted) {
                setIsAuthorized(false);
                setIsVerifying(false);
                navigate('/dashboard', { replace: true });
              }
              return;
            }
          }
        }

        // 3. Validação por :competitionId ou :id ou query param ?competitionId= ou ?id=
        const targetCompId =
          params.competitionId || params.id || searchParams.get('competitionId') || searchParams.get('id');
        if (targetCompId) {
          const comp = await dataAccess.getCompetition(targetCompId);
          if (!comp) {
            console.warn(
              `[TenantRouteGuard] Bloqueio 403: Competição "${targetCompId}" não encontrada no escopo do tenant.`
            );
            toast.error('Acesso Negado (403)', {
              description: 'A competição solicitada não pertence à sua organização ativa.',
            });
            if (isMounted) {
              setIsAuthorized(false);
              setIsVerifying(false);
              navigate('/dashboard', { replace: true });
            }
            return;
          }

          const hasAccess = TenantSecurityService.validateTenantAccess(
            tenantContext,
            comp,
            isPlatformAdmin
          );
          if (!hasAccess) {
            console.warn(
              `[TenantRouteGuard] Bloqueio 403: Competição "${targetCompId}" pertence à organização "${comp.organizationId}", não ao tenant "${activeOrgId}".`
            );
            toast.error('Acesso Negado (403)', {
              description: 'A competição solicitada não pertence à sua organização ativa.',
            });
            if (isMounted) {
              setIsAuthorized(false);
              setIsVerifying(false);
              navigate('/dashboard', { replace: true });
            }
            return;
          }
        }

        // 4. Validação por :matchId
        const targetMatchId = params.matchId;
        if (targetMatchId) {
          const match = await dataAccess.getMatch(targetMatchId);
          if (!match) {
            console.warn(`[TenantRouteGuard] Bloqueio 403: Partida "${targetMatchId}" não encontrada.`);
            toast.error('Acesso Negado (403)', {
              description: 'A partida solicitada não foi localizada no seu tenant.',
            });
            if (isMounted) {
              setIsAuthorized(false);
              setIsVerifying(false);
              navigate('/dashboard', { replace: true });
            }
            return;
          }

          const comp = await dataAccess.getCompetition(match.competitionId);
          if (
            !comp ||
            !TenantSecurityService.validateTenantAccess(tenantContext, comp, isPlatformAdmin)
          ) {
            console.warn(
              `[TenantRouteGuard] Bloqueio 403: Partida "${targetMatchId}" pertence à competição de outro tenant.`
            );
            toast.error('Acesso Negado (403)', {
              description: 'A partida solicitada pertence a outra organização.',
            });
            if (isMounted) {
              setIsAuthorized(false);
              setIsVerifying(false);
              navigate('/dashboard', { replace: true });
            }
            return;
          }
        }

        // Tudo validado com sucesso
        if (isMounted) {
          setIsAuthorized(true);
          setIsVerifying(false);
        }
      } catch (err) {
        console.error('[TenantRouteGuard] Erro ao validar acesso multi-tenant:', err);
        toast.error('Erro de Autorização (403)', {
          description: 'Falha ao validar os privilégios de acesso do tenant.',
        });
        if (isMounted) {
          setIsAuthorized(false);
          setIsVerifying(false);
          navigate('/dashboard', { replace: true });
        }
      }
    }

    checkTenantAuthorization();

    return () => {
      isMounted = false;
    };
  }, [
    params.organizationId,
    params.competitionId,
    params.id,
    params.matchId,
    searchParams,
    currentOrganizationId,
    session?.user,
    authLoading,
    tenantLoading,
    isPlatformAdmin,
    navigate,
  ]);

  if (authLoading || tenantLoading || isVerifying) {
    return <RouteLoadingFallback />;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children || <Outlet />}</>;
}
