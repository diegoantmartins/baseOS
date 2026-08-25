import { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import {
  TenantSecurityService,
  type SystemCapability,
} from '@/services/tenantSecurityService';
import type { MatchRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

export function useCapability() {
  const { session } = useAuth();
  const user = session?.user;

  const hasCapability = useCallback(
    (capability: SystemCapability): boolean => {
      return TenantSecurityService.hasCapability(user, capability);
    },
    [user]
  );

  const hasAllCapabilities = useCallback(
    (capabilities: SystemCapability[]): boolean => {
      return TenantSecurityService.hasAllCapabilities(user, capabilities);
    },
    [user]
  );

  const hasAnyCapability = useCallback(
    (capabilities: SystemCapability[]): boolean => {
      return TenantSecurityService.hasAnyCapability(user, capabilities);
    },
    [user]
  );

  const canManageRoster = useCallback(
    (targetTeam: CompetitionTeam): boolean => {
      return TenantSecurityService.canManageRoster(user, targetTeam);
    },
    [user]
  );

  const canSubmitMatchScore = useCallback(
    (match: MatchRecord): boolean => {
      return TenantSecurityService.canSubmitMatchScore(user, match);
    },
    [user]
  );

  const canReopenMatch = useCallback(
    (match: MatchRecord): boolean => {
      return TenantSecurityService.canReopenMatch(user, match);
    },
    [user]
  );

  return {
    user,
    role: user?.role,
    can: hasCapability,
    hasCapability,
    hasAllCapabilities,
    hasAnyCapability,
    canManageRoster,
    canSubmitMatchScore,
    canReopenMatch,
  };
}
