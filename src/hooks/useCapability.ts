import { useCallback } from 'react';
import { useAuth } from '@/components/auth/useAuth';
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

  const canHomologateMatch = useCallback((): boolean => {
    return TenantSecurityService.canHomologateMatch(user);
  }, [user]);

  const canDeleteResource = useCallback(
    (resourceType: 'competition' | 'team' | 'athlete' | 'match' | 'venue' | 'referee' | 'modality' | 'user'): boolean => {
      return TenantSecurityService.canDeleteResource(user, resourceType);
    },
    [user]
  );

  const canPerformDatabaseMaintenance = useCallback((): boolean => {
    return TenantSecurityService.canPerformDatabaseMaintenance(user);
  }, [user]);

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
    canHomologateMatch,
    canDeleteResource,
    canPerformDatabaseMaintenance,
  };
}
