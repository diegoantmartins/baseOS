/**
 * BaseOS - Multi-Tenancy, RBAC and Authorization Enforcement Engine (Fases 8, 9, 10, Fase 1 Hardening)
 *
 * Implements strict object-level access control (BOLA/IDOR protection),
 * tenant boundaries (Organization scoping), and role capability verification.
 */

import type { UserProfile, UserRole } from '@/types/auth';
import type { MatchRecord } from '@/types/entities';
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
  | 'athlete:view'
  | 'athlete:create'
  | 'athlete:edit'
  | 'athlete:delete'
  | 'match:view'
  | 'match:create'
  | 'match:edit'
  | 'match:delete'
  | 'match:schedule'
  | 'match:score'
  | 'match:finalize'
  | 'match:reopen'
  | 'scoresheet:view'
  | 'scoresheet:generate'
  | 'scoresheet:edit'
  | 'users:manage'
  | 'settings:manage'
  | 'audit:view';

/**
 * Matriz Oficial de Permissões RBAC
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
    'athlete:view',
    'athlete:create',
    'athlete:edit',
    'athlete:delete',
    'match:view',
    'match:create',
    'match:edit',
    'match:delete',
    'match:schedule',
    'match:score',
    'match:finalize',
    'match:reopen',
    'scoresheet:view',
    'scoresheet:generate',
    'scoresheet:edit',
    'users:manage',
    'settings:manage',
    'audit:view',
  ],
  organizer: [
    'competition:view',
    'competition:create',
    'competition:edit',
    'team:view',
    'team:create',
    'team:edit',
    'athlete:view',
    'athlete:create',
    'athlete:edit',
    'match:view',
    'match:create',
    'match:edit',
    'match:schedule',
    'match:score',
    'match:finalize',
    'scoresheet:view',
    'scoresheet:generate',
    'scoresheet:edit',
    'settings:manage',
    'audit:view',
  ],
  referee: [
    'competition:view',
    'team:view',
    'athlete:view',
    'match:view',
    'match:score',
    'match:finalize',
    'scoresheet:view',
    'scoresheet:generate',
  ],
  scorer: [
    'competition:view',
    'team:view',
    'athlete:view',
    'match:view',
    'match:score',
    'scoresheet:view',
    'scoresheet:generate',
  ],
  team: [
    'competition:view',
    'team:view',
    'team:edit', // Somente seu próprio elenco
    'athlete:view',
    'match:view',
    'scoresheet:view',
  ],
  viewer: [
    'competition:view',
    'team:view',
    'athlete:view',
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
   * Verifica se o usuário possui TODAS as capacidades informadas.
   */
  public static hasAllCapabilities(user: UserProfile | null | undefined, capabilities: SystemCapability[]): boolean {
    if (!user) return false;
    return capabilities.every(cap => this.hasCapability(user, cap));
  }

  /**
   * Verifica se o usuário possui AO MENOS UMA das capacidades informadas.
   */
  public static hasAnyCapability(user: UserProfile | null | undefined, capabilities: SystemCapability[]): boolean {
    if (!user) return false;
    return capabilities.some(cap => this.hasCapability(user, cap));
  }

  /**
   * Proteção Multi-Tenancy: Garante que um recurso pertença ao Tenant (Organização) ativo.
   */
  public static validateTenantAccess<T extends { organizationId?: string }>(
    tenant: TenantContext,
    resource: T,
  ): boolean {
    if (!resource.organizationId) {
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
   * Proteção de Finalização e Lançamento de Súmula:
   * Administradores e Organizadores têm permissão global.
   * Árbitros e Apontadores precisam estar escalados na partida caso haja escalação registrada.
   */
  public static canSubmitMatchScore(
    user: UserProfile | null | undefined,
    match: MatchRecord,
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'organizer') return true;

    // Perfis que não operam jogo nunca podem pontuar
    if (user.role !== 'referee' && user.role !== 'scorer') {
      return false;
    }

    const matchReferees = match.referees || [];

    // Se nenhuma equipe de arbitragem foi designada nominalmente na súmula/partida,
    // qualquer árbitro ou apontador credenciado pode operar
    if (matchReferees.length === 0) {
      return true;
    }

    // Se há árbitros escalados na partida, verifica se o usuário logado está na lista
    const userNameNorm = user.name.trim().toLowerCase();
    const userEmailNorm = user.email.trim().toLowerCase();

    return matchReferees.some(r => {
      const rNameNorm = (r.name || '').trim().toLowerCase();
      return rNameNorm === userNameNorm || rNameNorm === userEmailNorm;
    });
  }

  /**
   * Proteção para reabertura de jogo homologado: apenas Admin ou Organizador autorizado.
   */
  public static canReopenMatch(user: UserProfile | null | undefined, match: MatchRecord): boolean {
    if (!user) return false;
    if (match.status !== 'completed') return true;
    return user.role === 'admin' || user.role === 'organizer';
  }
}
