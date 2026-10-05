/**
 * BaseOS — TenantContext
 * 
 * Gerencia o contexto do Tenant ativo (Organização) na aplicação.
 * Permite que Platform Admins (Chave-Mestra) alternem entre bases de clientes
 * (Tenant Switcher), propagando o novo organization_id para todas as queries
 * do React Query / Supabase e persistindo a escolha em localStorage.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { dataAccess } from '@/services/dataAccess';
import type { OrganizationRecord } from '@/types/identity';
import { useAuth } from '@/components/auth/useAuth';
import { toast } from 'sonner';

export interface TenantContextValue {
  /** ID da organização atualmente ativa */
  currentOrganizationId: string | null;
  /** Objeto completo da organização ativa */
  currentOrganization: OrganizationRecord | null;
  /** Lista de todas as organizações acessíveis */
  organizations: OrganizationRecord[];
  /** Indica se está carregando as organizações */
  isLoading: boolean;
  /** Se o usuário atual é Platform Admin (Master Control) */
  isPlatformAdmin: boolean;
  /** Altera a organização ativa (exclusivo para Platform Admin ou seleção inicial) */
  setOrganizationId: (organizationId: string) => void;
  /** Recarrega a lista de organizações do backend */
  refreshOrganizations: () => Promise<void>;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { session, isPlatformAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [currentOrganizationId, setCurrentOrgIdState] = useState<string | null>(() => {
    return dataAccess.getActiveOrganizationId();
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await dataAccess.listOrganizations();
      setOrganizations(list);

      // Determina a organização inicial se ainda não selecionada
      const storedId = dataAccess.getActiveOrganizationId();
      if (storedId && list.some(o => o.id === storedId)) {
        setCurrentOrgIdState(storedId);
      } else if (session?.user.organizationId && list.some(o => o.id === session.user.organizationId)) {
        setCurrentOrgIdState(session.user.organizationId);
        dataAccess.setActiveOrganizationId(session.user.organizationId);
      } else if (list.length > 0) {
        setCurrentOrgIdState(list[0].id);
        dataAccess.setActiveOrganizationId(list[0].id);
      }
    } catch (err: unknown) {
      console.error('[TenantContext] Falha ao listar organizações:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user.organizationId]);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  // Listener para sincronização multi-abas ou eventos locais
  useEffect(() => {
    const handleTenantEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ organizationId: string }>;
      const nextId = customEvent.detail?.organizationId;
      if (nextId && nextId !== currentOrganizationId) {
        setCurrentOrgIdState(nextId);
      }
    };

    window.addEventListener('baseos:tenant-changed', handleTenantEvent);
    return () => {
      window.removeEventListener('baseos:tenant-changed', handleTenantEvent);
    };
  }, [currentOrganizationId]);

  const setOrganizationId = useCallback((newOrgId: string) => {
    const target = organizations.find(o => o.id === newOrgId);
    if (!target && organizations.length > 0) {
      console.warn(`[TenantContext] Organização ${newOrgId} não encontrada na lista carregada.`);
    }

    setCurrentOrgIdState(newOrgId);
    dataAccess.setActiveOrganizationId(newOrgId);

    // Invalida todo o cache do React Query para recarregar dados do novo tenant
    queryClient.invalidateQueries();

    // Dispara evento global
    window.dispatchEvent(
      new CustomEvent('baseos:tenant-changed', {
        detail: { organizationId: newOrgId },
      })
    );

    const displayName = target?.name || target?.legalName || newOrgId;
    toast.success(`Contexto ativo: ${displayName}`, {
      description: 'Dados recarregados com o isolamento da base selecionada.',
    });
  }, [organizations, queryClient]);

  const currentOrganization = useMemo(() => {
    if (!currentOrganizationId) return organizations[0] || null;
    return organizations.find(o => o.id === currentOrganizationId) || null;
  }, [currentOrganizationId, organizations]);

  const value = useMemo<TenantContextValue>(
    () => ({
      currentOrganizationId,
      currentOrganization,
      organizations,
      isLoading,
      isPlatformAdmin,
      setOrganizationId,
      refreshOrganizations,
    }),
    [
      currentOrganizationId,
      currentOrganization,
      organizations,
      isLoading,
      isPlatformAdmin,
      setOrganizationId,
      refreshOrganizations,
    ]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

const DEFAULT_TENANT_CONTEXT: TenantContextValue = {
  currentOrganizationId: null,
  currentOrganization: null,
  organizations: [],
  isLoading: false,
  isPlatformAdmin: false,
  setOrganizationId: async () => {},
  refreshOrganizations: async () => {},
};

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  return ctx || DEFAULT_TENANT_CONTEXT;
}
