import { describe, it, expect, beforeEach } from 'vitest';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import { dataAccess } from '@/services/dataAccess';
import { TeamContextService } from '@/services/teamContextService';
import type { UserProfile } from '@/types/auth';
import type { UserMembership, OrganizationRecord, OrganizationInvitation } from '@/types/identity';

describe('BASEOS — FASE 12: Gestão de Organizações, Membros, Convites e Vínculos Multi-Tenant', () => {
  const globalAdmin: UserProfile = {
    id: 'user-admin-global',
    name: 'Admin Global',
    email: 'admin@baseos.com',
    role: 'admin',
  };

  const globalOrganizer: UserProfile = {
    id: 'user-organizer-global',
    name: 'Organizador Global',
    email: 'organizer@baseos.com',
    role: 'organizer',
  };

  const orgAdminA: UserProfile = {
    id: 'user-org-admin-a',
    name: 'Org Admin A',
    email: 'admin.orga@example.com',
    role: 'team',
  };

  const managerA: UserProfile = {
    id: 'user-manager-a',
    name: 'Manager Team 1',
    email: 'manager.a@example.com',
    role: 'team',
  };

  const userOrgB: UserProfile = {
    id: 'user-org-b',
    name: 'User Org B',
    email: 'user.b@example.com',
    role: 'team',
  };

  const unaffiliatedUser: UserProfile = {
    id: 'user-unaffiliated',
    name: 'Usuário Sem Vínculo',
    email: 'unaffiliated@example.com',
    role: 'team',
  };

  const orgA: OrganizationRecord = {
    id: 'org-alpha',
    name: 'Organização Alpha',
    legalName: 'Alpha Sports Ltda',
    documentNumber: '11.111.111/0001-11',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const orgB: OrganizationRecord = {
    id: 'org-beta',
    name: 'Organização Beta',
    legalName: 'Beta Sports Ltda',
    documentNumber: '22.222.222/0001-22',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const teams = [
    { id: 'team-alpha-1', name: 'Alpha Masculino', organizationId: 'org-alpha' },
    { id: 'team-alpha-2', name: 'Alpha Feminino', organizationId: 'org-alpha' },
    { id: 'team-beta-1', name: 'Beta Vôlei', organizationId: 'org-beta' },
  ];

  const membershipsOrgA: UserMembership[] = [
    {
      id: 'mem-admin-a',
      userId: orgAdminA.id,
      organizationId: 'org-alpha',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-mgr-a',
      userId: managerA.id,
      organizationId: 'org-alpha',
      teamId: 'team-alpha-1',
      role: 'team_manager',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-suspended-a',
      userId: 'user-suspended-id',
      organizationId: 'org-alpha',
      teamId: 'team-alpha-2',
      role: 'viewer',
      status: 'blocked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-ended-a',
      userId: 'user-ended-id',
      organizationId: 'org-alpha',
      role: 'viewer',
      status: 'ended',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const membershipsOrgB: UserMembership[] = [
    {
      id: 'mem-b-1',
      userId: userOrgB.id,
      organizationId: 'org-beta',
      teamId: 'team-beta-1',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TeamContextService.clearActiveTeamContext();
  });

  // =========================================================================
  // GRUPO 1: ORGANIZAÇÃO E ISOLAMENTO MULTI-TENANT (Itens 1 a 4)
  // =========================================================================
  describe('1. Organização e Isolamento Multi-Tenant', () => {
    it('1. Membro ativo acessa a própria organização', () => {
      const canAccess = TenantSecurityService.canViewOrganization(orgAdminA, 'org-alpha', membershipsOrgA);
      expect(canAccess).toBe(true);
    });

    it('2. Usuário sem membership na organização tem acesso negado', () => {
      const canAccess = TenantSecurityService.canViewOrganization(unaffiliatedUser, 'org-alpha', []);
      expect(canAccess).toBe(false);
    });

    it('3. Organização Alpha não vaza dados nem permite acesso para membro da Organização Beta', () => {
      const canAccessAFromB = TenantSecurityService.canViewOrganization(userOrgB, 'org-alpha', membershipsOrgB);
      expect(canAccessAFromB).toBe(false);

      const canAccessBFromA = TenantSecurityService.canViewOrganization(orgAdminA, 'org-beta', membershipsOrgA);
      expect(canAccessBFromA).toBe(false);
    });

    it('4. Administrador global acessa qualquer organização, mas organizador exige membership ativa atrelada ao tenant', () => {
      expect(TenantSecurityService.canViewOrganization(globalAdmin, 'org-alpha', [])).toBe(true);
      expect(TenantSecurityService.canViewOrganization(globalAdmin, 'org-beta', [])).toBe(true);
      // Organizador sem membership no tenant é bloqueado (sanitização de RBAC Fase C)
      expect(TenantSecurityService.canViewOrganization(globalOrganizer, 'org-alpha', [])).toBe(false);
      expect(TenantSecurityService.canViewOrganization(globalOrganizer, 'org-beta', [])).toBe(false);
      // Organizador com membership ativa no tenant alvo possui acesso
      const organizerMembershipAlpha: UserMembership[] = [
        {
          id: 'mem-org-alpha',
          userId: globalOrganizer.id,
          organizationId: 'org-alpha',
          role: 'organizer',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      expect(TenantSecurityService.canViewOrganization(globalOrganizer, 'org-alpha', organizerMembershipAlpha)).toBe(true);
    });
  });

  // =========================================================================
  // GRUPO 2: MEMBERSHIPS E PROTEÇÃO CONTRA ESCALADA (Itens 5 a 10)
  // =========================================================================
  describe('2. Memberships e Proteção contra Escalada de Papéis', () => {
    it('5. Membership com status "active" autoriza gestão de membros se for Org Admin', () => {
      const canManage = TenantSecurityService.canManageOrganizationMembers(orgAdminA, 'org-alpha', membershipsOrgA);
      expect(canManage).toBe(true);
    });

    it('6. Membership com status "blocked" (suspensa) bloqueia qualquer autorização', () => {
      const suspendedUser: UserProfile = { id: 'user-suspended-id', name: 'Suspenso', email: 's@test.com', role: 'team' };
      const canManage = TenantSecurityService.canManageOrganizationMembers(suspendedUser, 'org-alpha', membershipsOrgA);
      expect(canManage).toBe(false);

      const canView = TenantSecurityService.canViewOrganization(suspendedUser, 'org-alpha', membershipsOrgA);
      expect(canView).toBe(false);
    });

    it('7. Membership com status "ended" (removida) bloqueia acesso', () => {
      const endedUser: UserProfile = { id: 'user-ended-id', name: 'Finalizado', email: 'e@test.com', role: 'team' };
      const canView = TenantSecurityService.canViewOrganization(endedUser, 'org-alpha', membershipsOrgA);
      expect(canView).toBe(false);
    });

    it('8. Usuário comum/não-admin não pode gerenciar ou criar memberships arbitrárias', () => {
      const canManage = TenantSecurityService.canManageOrganizationMembers(managerA, 'org-alpha', membershipsOrgA);
      expect(canManage).toBe(false);
    });

    it('9. Usuário é expressamente impedido de alterar o próprio papel (anti-escalada/lockout)', () => {
      // Mesmo sendo Org Admin, ele não pode mudar seu próprio papel
      const canChangeSelf = TenantSecurityService.canUpdateMemberRole(orgAdminA, 'org-alpha', orgAdminA.id, 'admin', membershipsOrgA);
      expect(canChangeSelf).toBe(false);

      // Mas pode mudar o de outro membro
      const canChangeOther = TenantSecurityService.canUpdateMemberRole(orgAdminA, 'org-alpha', managerA.id, 'viewer', membershipsOrgA);
      expect(canChangeOther).toBe(true);
    });

    it('10. Org Admin da Organização Alpha não consegue alterar membros da Organização Beta', () => {
      const canChangeBeta = TenantSecurityService.canUpdateMemberRole(orgAdminA, 'org-beta', userOrgB.id, 'viewer', membershipsOrgA);
      expect(canChangeBeta).toBe(false);

      const canChangeStatusBeta = TenantSecurityService.canChangeMemberStatus(orgAdminA, 'org-beta', userOrgB.id, membershipsOrgA);
      expect(canChangeStatusBeta).toBe(false);
    });
  });

  // =========================================================================
  // GRUPO 3: EQUIPES E INTEGRIDADE DE VÍNCULOS (Itens 11 a 15)
  // =========================================================================
  describe('3. Equipes e Integridade Multi-Tenant de Vínculos', () => {
    it('11. Equipe vinculada deve pertencer estritamente à organização correta', () => {
      const validInvite = TenantSecurityService.canInviteMember(
        orgAdminA,
        'org-alpha',
        'team_manager',
        membershipsOrgA,
        'team-alpha-1',
        teams,
      );
      expect(validInvite).toBe(true);
    });

    it('12. Tentativa de associar equipe de outra organização (cross-tenant) é bloqueada', () => {
      const crossTenantInvite = TenantSecurityService.canInviteMember(
        orgAdminA,
        'org-alpha',
        'team_manager',
        membershipsOrgA,
        'team-beta-1', // Equipe pertence à org-beta!
        teams,
      );
      expect(crossTenantInvite).toBe(false);
    });

    it('13. Team ID forjado ou inexistente na organização é bloqueado na autorização de troca', () => {
      const availableTeams = [
        { id: 'team-alpha-1', name: 'Alpha Masculino', competitionId: 'comp-1' },
      ];
      expect(TeamContextService.canSwitchToTeam('forged-team-id', availableTeams)).toBe(false);
    });

    it('14. Troca de equipe autorizada para membro com membership ativa', () => {
      const availableTeams = [
        { id: 'team-alpha-1', name: 'Alpha Masculino', competitionId: 'comp-1' },
        { id: 'team-alpha-2', name: 'Alpha Feminino', competitionId: 'comp-1' },
      ];
      expect(TeamContextService.canSwitchToTeam('team-alpha-2', availableTeams)).toBe(true);
      const switched = TeamContextService.setActiveTeamContext(availableTeams[1], availableTeams);
      expect(switched).not.toBeNull();
      expect(switched?.id).toBe('team-alpha-2');
    });

    it('15. Troca de equipe para time de outra organização não vinculada é bloqueada', () => {
      const availableTeams = [
        { id: 'team-alpha-1', name: 'Alpha Masculino', competitionId: 'comp-1' },
      ];
      expect(() => {
        TeamContextService.setActiveTeamContext({ id: 'team-beta-1', name: 'Beta Vôlei' }, availableTeams);
      }).toThrow(/não autorizada/i);
    });
  });

  // =========================================================================
  // GRUPO 4: CONVITES DE ORGANIZAÇÃO (Itens 16 a 21)
  // =========================================================================
  describe('4. Convites de Organização, Validade e Defesa contra Escalada', () => {
    it('16. Criação e aceitação de convite válido cria vínculo com status "active"', async () => {
      const inv = await dataAccess.createOrganizationInvitation({
        organizationId: 'org-alpha',
        email: 'novo.membro@example.com',
        role: 'viewer',
        invitedBy: orgAdminA.id,
      });

      expect(inv.id).toBeDefined();
      expect(inv.status).toBe('pending');
      expect(inv.token).toBeDefined();

      const acceptRes = await dataAccess.acceptOrganizationInvitation(inv.token, 'user-new-id');
      expect(acceptRes.ok).toBe(true);
      expect(acceptRes.membershipId).toBeDefined();

      // Confirma que membro foi criado na organização com status active
      const orgMembers = await dataAccess.listOrganizationMembers('org-alpha');
      const found = orgMembers.find((m) => m.userId === 'user-new-id');
      expect(found).toBeDefined();
      expect(found?.status).toBe('active');
      expect(found?.role).toBe('viewer');
    });

    it('17. Convite com data expirada é rejeitado na aceitação', async () => {
      const expiredInv = await dataAccess.createOrganizationInvitation({
        organizationId: 'org-alpha',
        email: 'expirado@example.com',
        role: 'viewer',
        invitedBy: orgAdminA.id,
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
      });

      const res = await dataAccess.acceptOrganizationInvitation(expiredInv.token, 'user-late-id');
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/expirou/i);
    });

    it('18. Convite já utilizado não pode ser aceito uma segunda vez (single-use)', async () => {
      const singleUseInv = await dataAccess.createOrganizationInvitation({
        organizationId: 'org-alpha',
        email: 'single@example.com',
        role: 'viewer',
        invitedBy: orgAdminA.id,
      });

      const firstAccept = await dataAccess.acceptOrganizationInvitation(singleUseInv.token, 'user-first-id');
      expect(firstAccept.ok).toBe(true);

      const secondAccept = await dataAccess.acceptOrganizationInvitation(singleUseInv.token, 'user-second-id');
      expect(secondAccept.ok).toBe(false);
      expect(secondAccept.error).toMatch(/já foi utilizado/i);
    });

    it('19. Convite emitido para Org Alpha não concede acesso nem membership na Org Beta', async () => {
      const invAlpha = await dataAccess.createOrganizationInvitation({
        organizationId: 'org-alpha',
        email: 'teste.alpha@example.com',
        role: 'team_manager',
        invitedBy: orgAdminA.id,
      });

      const acceptRes = await dataAccess.acceptOrganizationInvitation(invAlpha.token, 'user-in-alpha');
      expect(acceptRes.ok).toBe(true);

      // Verifica que na Org Beta esse membro NÃO existe
      const membersBeta = await dataAccess.listOrganizationMembers('org-beta');
      expect(membersBeta.some((m) => m.userId === 'user-in-alpha')).toBe(false);
    });

    it('20. Gerente de equipe (team_manager) não pode convidar administradores ou organizadores', () => {
      // team_manager tentando convidar admin
      const canInviteAdmin = TenantSecurityService.canInviteMember(
        managerA,
        'org-alpha',
        'admin',
        membershipsOrgA,
      );
      expect(canInviteAdmin).toBe(false);

      // team_manager tentando convidar organizer
      const canInviteOrg = TenantSecurityService.canInviteMember(
        managerA,
        'org-alpha',
        'organizer',
        membershipsOrgA,
      );
      expect(canInviteOrg).toBe(false);
    });

    it('21. Tentativa de escalada: usuário sem papel administrativo tentando convidar é bloqueado', () => {
      const canInvite = TenantSecurityService.canInviteMember(
        unaffiliatedUser,
        'org-alpha',
        'viewer',
        [],
      );
      expect(canInvite).toBe(false);
    });
  });

  // =========================================================================
  // GRUPO 5: INTEGRAÇÃO COM CONTEXTO E PORTAL (Itens 22 a 26)
  // =========================================================================
  describe('5. Integração com Contexto de Equipe e Team Portal', () => {
    it('22. Usuário com exatamente uma equipe ativa resolve equipe diretamente sem ambiguidade', async () => {
      const profile: UserProfile = { id: 'user-single', name: 'User Single', email: 'single@test.com', role: 'team' };
      // Simula uma membership ativa
      await dataAccess.createUserMembership({
        userId: 'user-single',
        organizationId: 'org-alpha',
        teamId: 'team-alpha-1',
        role: 'team_manager',
        status: 'active',
      });

      const available = await TeamContextService.getUserAvailableTeams(profile);
      expect(available.length).toBe(1);
      expect(available[0].id).toBe('team-alpha-1');

      const active = TeamContextService.getActiveTeamContext(available);
      expect(active?.id).toBe('team-alpha-1');
    });

    it('23. Usuário com múltiplas equipes lista todas as equipes ativas e permite seleção explícita', async () => {
      const profile: UserProfile = { id: 'user-multi', name: 'User Multi', email: 'multi@test.com', role: 'team' };
      await dataAccess.createUserMembership({
        userId: 'user-multi',
        organizationId: 'org-alpha',
        teamId: 'team-alpha-1',
        role: 'team_manager',
        status: 'active',
      });
      await dataAccess.createUserMembership({
        userId: 'user-multi',
        organizationId: 'org-alpha',
        teamId: 'team-alpha-2',
        role: 'team_manager',
        status: 'active',
      });

      const available = await TeamContextService.getUserAvailableTeams(profile);
      expect(available.length).toBe(2);

      const switched = TeamContextService.setActiveTeamContext(available[1], available);
      expect(switched?.id).toBe('team-alpha-2');
    });

    it('24. Usuário sem nenhuma equipe retorna lista vazia', async () => {
      const profile: UserProfile = { id: 'user-none', name: 'User None', email: 'none@test.com', role: 'team' };
      const available = await TeamContextService.getUserAvailableTeams(profile);
      expect(available.length).toBe(0);
      expect(TeamContextService.getActiveTeamContext(available)).toBeNull();
    });

    it('25. Usuário com membership suspensa não tem acesso à equipe no portal', async () => {
      const profile: UserProfile = { id: 'user-suspended-portal', name: 'Suspended', email: 'susp@test.com', role: 'team' };
      await dataAccess.createUserMembership({
        userId: 'user-suspended-portal',
        organizationId: 'org-alpha',
        teamId: 'team-alpha-1',
        role: 'team_manager',
        status: 'blocked', // suspensa
      });

      const available = await TeamContextService.getUserAvailableTeams(profile);
      expect(available.length).toBe(0);
    });

    it('26. Limpeza de contexto (clearActiveTeamContext) remove o contexto ativo e exige nova seleção', () => {
      const sampleTeams = [{ id: 'team-1', name: 'Equipe 1', competitionTeamId: 'team-1', teamId: 'team-1', teamName: 'Equipe 1', teamShortName: 'EQ1', competitionId: '', competitionName: 'Geral', role: 'team_manager', accessToken: '' }];
      TeamContextService.setActiveTeamContext(sampleTeams[0], sampleTeams);
      expect(TeamContextService.getActiveTeamContext(sampleTeams)?.id).toBe('team-1');

      TeamContextService.clearActiveTeamContext();
      // Sem seleção prévia no storage
      expect(sessionStorage.getItem('baseos_active_team_id')).toBeNull();
    });
  });
});
