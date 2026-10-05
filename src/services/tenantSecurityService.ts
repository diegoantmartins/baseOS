/**
 * BaseOS - Multi-Tenancy, RBAC and Authorization Enforcement Engine (Fases 8, 9, 10, Fase 1 Hardening)
 *
 * Implements strict object-level access control (BOLA/IDOR protection),
 * tenant boundaries (Organization scoping), and role capability verification.
 */

import type { UserProfile, UserRole } from '@/types/auth';
import type { MatchRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import type { UserMembership } from '@/types/identity';

export type TenantContext = {
  organizationId: string;
  organizationName?: string;
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
    isPlatformAdmin?: boolean,
  ): boolean {
    if (isPlatformAdmin) {
      return true;
    }
    if (!resource || !resource.organizationId) {
      return false;
    }
    return resource.organizationId === tenant.organizationId;
  }

  /**
   * Proteção IDOR / BOLA (Broken Object Level Authorization):
   * Verifica se um usuário com perfil 'team' pode editar a inscrição ou elenco da equipe.
   * Suporta autorização via membership ativa (Fase 11) ou compatibilidade com vínculo legado (profiles.competition_team_id).
   */
  public static canManageRoster(
    user: UserProfile | null | undefined,
    targetCompetitionTeam: CompetitionTeam,
    activeMemberships?: UserMembership[],
  ): boolean {
    if (!user) return false;

    // Administradores e Organizadores podem gerenciar qualquer equipe
    if (user.role === 'admin' || user.role === 'organizer') return true;

    // Representante de Equipe
    if (user.role === 'team') {
      // 1. Vínculo legado direto
      if (user.competitionTeamId && user.competitionTeamId === targetCompetitionTeam.id) {
        return true;
      }

      // 2. Vínculo via memberships ativas da Fase 11
      if (activeMemberships && activeMemberships.length > 0) {
        return activeMemberships.some(
          (m) =>
            m.userId === user.id &&
            m.status === 'active' &&
            (m.competitionTeamId === targetCompetitionTeam.id ||
              (m.teamId === targetCompetitionTeam.teamId &&
                (!m.competitionId || m.competitionId === targetCompetitionTeam.competitionId))),
        );
      }
    }

    return false;
  }

  /**
   * Validação de chaveamento de equipe ativa (Fase 11):
   * Impede que o usuário assuma o contexto de uma equipe para a qual não possui membership ativa.
   */
  public static canSwitchToTeam(
    user: UserProfile | null | undefined,
    targetCompetitionTeamId: string,
    activeMemberships?: UserMembership[],
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'organizer') return true;

    if (user.role === 'team') {
      if (user.competitionTeamId === targetCompetitionTeamId) return true;
      if (activeMemberships && activeMemberships.length > 0) {
        return activeMemberships.some(
          (m) =>
            m.userId === user.id &&
            m.status === 'active' &&
            (m.competitionTeamId === targetCompetitionTeamId || m.teamId === targetCompetitionTeamId),
        );
      }
    }

    return false;
  }

  /**
   * Validação de fronteira de organização (Tenancy):
   * Impede acesso cross-organization a dados privados.
   */
  public static canAccessOrganization(
    user: UserProfile | null | undefined,
    targetOrgId: string,
    activeMemberships?: UserMembership[],
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'organizer') return true;

    if (activeMemberships && activeMemberships.length > 0) {
      return activeMemberships.some(
        (m) => m.userId === user.id && m.status === 'active' && m.organizationId === targetOrgId,
      );
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

  /**
   * Proteção para homologação definitiva de partidas.
   */
  public static canHomologateMatch(user: UserProfile | null | undefined): boolean {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'organizer';
  }

  /**
   * Proteção para exclusão de recursos esportivos e cadastrais.
   */
  public static canDeleteResource(
    user: UserProfile | null | undefined,
    resourceType: 'competition' | 'team' | 'athlete' | 'match' | 'venue' | 'referee' | 'modality' | 'user'
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'organizer') {
      // Organizadores podem excluir recursos esportivos, exceto outros usuários do sistema
      return resourceType !== 'user';
    }
    return false;
  }

  /**
   * Proteção para operações críticas de banco de dados e auditoria (Reset, Limpeza de Dados e Purge de Logs).
   */
  public static canPerformDatabaseMaintenance(user: UserProfile | null | undefined): boolean {
    if (!user) return false;
    return user.role === 'admin';
  }

  /**
   * Fase 12 — Permissão de visualização de Organização:
   * Apenas Platform Admins (role = 'admin' ou isPlatformAdmin = true) têm acesso global irrestrito.
   * Organizadores e demais usuários exigem membership ativa atrelada ao tenant alvo.
   */
  public static canViewOrganization(
    user: UserProfile | null | undefined,
    organizationId: string,
    memberships?: UserMembership[],
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin' || Boolean(user.isPlatformAdmin)) return true;

    if (memberships && memberships.length > 0) {
      return memberships.some(
        (m) => m.userId === user.id && m.status === 'active' && m.organizationId === organizationId,
      );
    }

    if (user.organizationId && user.organizationId === organizationId) {
      return true;
    }

    return false;
  }

  /**
   * Fase 12 — Permissão de Gestão de Membros de Organização:
   * Apenas Platform Admins (role = 'admin' ou isPlatformAdmin = true) têm acesso global irrestrito.
   * Organizadores e Org Admins exigem membership ativa com papel administrativo no tenant alvo.
   */
  public static canManageOrganizationMembers(
    user: UserProfile | null | undefined,
    organizationId: string,
    memberships?: UserMembership[],
  ): boolean {
    if (!user) return false;
    if (user.role === 'admin' || Boolean(user.isPlatformAdmin)) return true;

    if (memberships && memberships.length > 0) {
      return memberships.some(
        (m) =>
          m.userId === user.id &&
          m.organizationId === organizationId &&
          (m.role === 'admin' || m.role === 'organizer') &&
          m.status === 'active',
      );
    }

    return false;
  }

  /**
   * Fase 12 — Proteção contra Escalada de Privilégios em Convites:
   * - Não permite usuário comum convidar.
   * - Não permite team_manager convidar admin ou organizer.
   * - Garante que equipe vinculada pertence estritamente à mesma organização.
   */
  public static canInviteMember(
    user: UserProfile | null | undefined,
    organizationId: string,
    targetRole: string,
    memberships?: UserMembership[],
    targetTeamId?: string | null,
    teams?: Array<{ id: string; organizationId?: string }>,
  ): boolean {
    if (!user) return false;

    // Se fornecida equipe, ela deve pertencer à mesma organização
    if (targetTeamId && teams && teams.length > 0) {
      const team = teams.find((t) => t.id === targetTeamId);
      if (team && team.organizationId && team.organizationId !== organizationId) {
        return false;
      }
    }

    // Admin global / Platform Admin podem convidar em qualquer organização
    if (user.role === 'admin' || Boolean(user.isPlatformAdmin)) return true;

    if (!memberships || memberships.length === 0) return false;

    const userOrgMemberships = memberships.filter(
      (m) => m.userId === user.id && m.organizationId === organizationId && m.status === 'active',
    );

    const isOrgAdminOrOrganizer = userOrgMemberships.some((m) => m.role === 'admin' || m.role === 'organizer');
    if (isOrgAdminOrOrganizer) {
      return true;
    }

    const teamManagerMembership = userOrgMemberships.find((m) => m.role === 'team_manager');
    if (teamManagerMembership) {
      // team_manager não pode convidar para admin ou organizer
      if (targetRole === 'admin' || targetRole === 'organizer') {
        return false;
      }
      // team_manager só pode convidar para a sua própria equipe
      if (targetTeamId && teamManagerMembership.teamId && targetTeamId !== teamManagerMembership.teamId) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Fase 12 — Proteção contra alteração do próprio papel ou alteração não autorizada.
   */
  public static canUpdateMemberRole(
    user: UserProfile | null | undefined,
    organizationId: string,
    targetUserId: string,
    newRole: string,
    memberships?: UserMembership[],
  ): boolean {
    if (!user) return false;

    // Jamais permite alterar o próprio papel (prevenção de auto-escalada ou lockout)
    if (user.id === targetUserId) {
      return false;
    }

    if (user.role === 'admin' || Boolean(user.isPlatformAdmin)) {
      return true;
    }

    // Org Admin / Organizer local pode alterar papéis de membros da sua organização
    return this.canManageOrganizationMembers(user, organizationId, memberships);
  }

  /**
   * Fase 12 — Proteção para suspensão / bloqueio / reativação de membro.
   */
  public static canChangeMemberStatus(
    user: UserProfile | null | undefined,
    organizationId: string,
    targetUserId: string,
    memberships?: UserMembership[],
  ): boolean {
    if (!user) return false;

    // Jamais permite suspender a si próprio
    if (user.id === targetUserId) {
      return false;
    }

    if (user.role === 'admin' || Boolean(user.isPlatformAdmin)) {
      return true;
    }

    return this.canManageOrganizationMembers(user, organizationId, memberships);
  }
}
