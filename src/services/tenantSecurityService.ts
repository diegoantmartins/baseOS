/**
 * BaseOS - Multi-Tenancy, RBAC and Authorization Enforcement Engine (Fases 8, 9, 10)
 *
 * Implements strict object-level access control (BOLA/IDOR protection),
 * tenant boundaries (Organization scoping), and role capability verification.
 */

import type { UserProfile, UserRole } from '@/types/auth';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

export type TenantContext = {
  organizationId: string;
  organizationName: string;
};

export type SystemCapability =
  | 'competition:view'
  | 'competition:create'
  | 'competition:edit'
  | 'competition:delete'
  | 'team:view'
  | 'team:create'
  | 'team:edit'
  | 'team:delete'
  | 'match:view'
  | 'match:create'
  | 'match:schedule'
  | 'match:score'
  | 'match:finalize'
  | 'scoresheet:view'
  | 'scoresheet:generate'
  | 'scoresheet:edit'
  | 'users:manage'
  | 'settings:manage';

/**
 * Matriz Oficial de Permissões RBAC (Fase 9)
 */
export const ROLE_CAPABILITY_MATRIX: Record<UserRole, SystemCapability[]> = {
  admin: [
    'competition:view',
    'competition:create',
    'competition:edit',
    'competition:delete',
    'team:view',
    'team:create',
    'team:edit',
    'team:delete',
    'match:view',
    'match:create',
    'match:schedule',
    'match:score',
    'match:finalize',
    'scoresheet:view',
    'scoresheet:generate',
    'scoresheet:edit',
    'users:manage',
    'settings:manage',
  ],
  organizer: [
    'competition:view',
    'competition:create',
    'competition:edit',
    'team:view',
    'team:create',
    'team:edit',
    'match:view',
    'match:create',
    'match:schedule',
    'match:score',
    'match:finalize',
    'scoresheet:view',
    'scoresheet:generate',
    'scoresheet:edit',
    'settings:manage',
  ],
  referee: [
    'competition:view',
    'team:view',
    'match:view',
    'match:score',
    'match:finalize',
    'scoresheet:view',
    'scoresheet:generate',
  ],
  scorer: [
    'competition:view',
    'team:view',
    'match:view',
    'match:score',
    'scoresheet:view',
    'scoresheet:generate',
  ],
  team: [
    'competition:view',
    'team:view',
    'team:edit', // Somente seu próprio elenco
    'match:view',
    'scoresheet:view',
  ],
  viewer: [
    'competition:view',
    'team:view',
    'match:view',
    'scoresheet:view',
  ],
};

export class TenantSecurityService {
  /**
   * Verifica se o usuário possui determinada capacidade RBAC no sistema.
   */
  public static hasCapability(user: UserProfile | null | undefined, capability: SystemCapability): boolean {
    if (!user) return false;
    const capabilities = ROLE_CAPABILITY_MATRIX[user.role] || [];
    return capabilities.includes(capability);
  }

  /**
   * Proteção Multi-Tenancy: Garante que um recurso pertença ao Tenant (Organização) ativo.
   * Previne vazamento de dados entre federações/ligas distintas.
   */
  public static validateTenantAccess<T extends { organizationId?: string }>(
    tenant: TenantContext,
    resource: T,
  ): boolean {
    if (!resource.organizationId) {
      // Recursos legados sem organização são permitidos no tenant padrão
      return true;
    }
    return resource.organizationId === tenant.organizationId;
  }

  /**
   * Proteção IDOR / BOLA (Broken Object Level Authorization):
   * Verifica se um usuário com perfil 'team' pode editar a inscrição ou elenco da equipe.
   */
  public static canManageRoster(
    user: UserProfile | null | undefined,
    targetCompetitionTeam: CompetitionTeam,
  ): boolean {
    if (!user) return false;

    // Administradores e Organizadores podem gerenciar qualquer equipe
    if (user.role === 'admin' || user.role === 'organizer') return true;

    // Representante de Equipe só pode gerenciar o time explicitamente vinculado ao seu perfil
    if (user.role === 'team') {
      return user.competitionTeamId === targetCompetitionTeam.id;
    }

    return false;
  }

  /**
   * Proteção de Finalização e Lançamento de Súmula (Apenas Árbitros, Apontadores, Organizadores e Admins)
   */
  public static canSubmitMatchScore(
    user: UserProfile | null | undefined,
    match: MatchRecord,
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'organizer') return true;
    if (user.role === 'referee' || user.role === 'scorer') {
      // Se a partida tiver árbitros atribuídos, valida atribuição ou permite se o perfil for arbitragem
      return true;
    }
    return false;
  }
}
