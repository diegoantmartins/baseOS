import { describe, it, expect, beforeEach } from 'vitest';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import { dataAccess } from '@/services/dataAccess';
import { TeamContextService } from '@/services/teamContextService';
import type { UserProfile } from '@/types/auth';
import type { UserMembership, OrganizationRecord } from '@/types/identity';
import type { CompetitionTeam } from '@/types/registration';

describe('BASEOS — GATE 2C: Homologação E2E da Camada Administrativa Multi-Tenant', () => {
  // Usuários de Teste com Perfis Canônicos
  const globalAdmin: UserProfile = {
    id: 'user-admin-global',
    name: 'Administrador Global',
    email: 'admin@baseos.app',
    role: 'admin',
  };

  const globalOrganizer: UserProfile = {
    id: 'user-organizer-global',
    name: 'Organizador Global',
    email: 'organizer@baseos.app',
    role: 'organizer',
  };

  const orgAdminA: UserProfile = {
    id: 'user-admin-org-a',
    name: 'Org Admin Alpha',
    email: 'admin.alpha@baseos.app',
    role: 'team',
  };

  const managerTeamAlpha: UserProfile = {
    id: 'user-manager-alpha',
    name: 'Gestor Team Alpha 1',
    email: 'manager.alpha1@baseos.app',
    role: 'team',
  };

  const multiTeamManager: UserProfile = {
    id: 'user-multi-manager',
    name: 'Gestor Duas Equipes',
    email: 'multi.manager@baseos.app',
    role: 'team',
  };

  const orgAdminB: UserProfile = {
    id: 'user-admin-org-b',
    name: 'Org Admin Beta',
    email: 'admin.beta@baseos.app',
    role: 'team',
  };

  const memberOrgB: UserProfile = {
    id: 'user-member-beta',
    name: 'Membro Org Beta',
    email: 'member.beta@baseos.app',
    role: 'team',
  };

  const unaffiliatedUser: UserProfile = {
    id: 'user-unaffiliated',
    name: 'Usuário Sem Organização',
    email: 'unaffiliated@baseos.app',
    role: 'team',
  };

  // Organizações
  const orgAlpha: OrganizationRecord = {
    id: 'org-alpha',
    name: 'Federação Alpha de Voleibol',
    legalName: 'Federação Alpha Sports Ltda',
    documentNumber: '11.222.333/0001-44',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const orgBeta: OrganizationRecord = {
    id: 'org-beta',
    name: 'Liga Beta de Vôlei',
    legalName: 'Liga Beta Esportes Ltda',
    documentNumber: '55.666.777/0001-88',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Equipes
  const teamsAlpha = [
    { id: 'team-alpha-1', name: 'Alpha Vôlei Clube', shortName: 'ALP1', organizationId: 'org-alpha' },
    { id: 'team-alpha-2', name: 'Alpha Academia', shortName: 'ALP2', organizationId: 'org-alpha' },
  ];

  const teamsBeta = [
    { id: 'team-beta-1', name: 'Beta Vôlei Esporte', shortName: 'BET1', organizationId: 'org-beta' },
  ];

  const allTeams = [...teamsAlpha, ...teamsBeta];

  // Inscrições em Competição
  const ctAlpha1: CompetitionTeam = {
    id: 'ct-alpha-1',
    competitionId: 'comp-estadual-2026',
    teamId: 'team-alpha-1',
    teamName: 'Alpha Vôlei Clube',
    teamShortName: 'ALP1',
    accessToken: 'tok-ct-alp1',
    registrationDeadline: '2099-12-31T23:59:59Z',
    isLocked: false,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ctAlpha2: CompetitionTeam = {
    id: 'ct-alpha-2',
    competitionId: 'comp-estadual-2026',
    teamId: 'team-alpha-2',
    teamName: 'Alpha Academia',
    teamShortName: 'ALP2',
    accessToken: 'tok-ct-alp2',
    registrationDeadline: '2099-12-31T23:59:59Z',
    isLocked: false,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ctBeta1: CompetitionTeam = {
    id: 'ct-beta-1',
    competitionId: 'comp-regional-2026',
    teamId: 'team-beta-1',
    teamName: 'Beta Vôlei Esporte',
    teamShortName: 'BET1',
    accessToken: 'tok-ct-bet1',
    registrationDeadline: '2099-12-31T23:59:59Z',
    isLocked: false,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Memberships
  const membershipsOrgA: UserMembership[] = [
    {
      id: 'mem-admin-alpha',
      userId: orgAdminA.id,
      organizationId: 'org-alpha',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-mgr-alpha1',
      userId: managerTeamAlpha.id,
      organizationId: 'org-alpha',
      teamId: 'team-alpha-1',
      competitionTeamId: 'ct-alpha-1',
      role: 'team_manager',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-multi-alpha1',
      userId: multiTeamManager.id,
      organizationId: 'org-alpha',
      teamId: 'team-alpha-1',
      competitionTeamId: 'ct-alpha-1',
      role: 'team_manager',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-multi-alpha2',
      userId: multiTeamManager.id,
      organizationId: 'org-alpha',
      teamId: 'team-alpha-2',
      competitionTeamId: 'ct-alpha-2',
      role: 'team_manager',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-suspended-alpha',
      userId: 'user-suspended-id',
      organizationId: 'org-alpha',
      teamId: 'team-alpha-1',
      competitionTeamId: 'ct-alpha-1',
      role: 'team_manager',
      status: 'blocked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-ended-alpha',
      userId: 'user-ended-id',
      organizationId: 'org-alpha',
      teamId: 'team-alpha-2',
      competitionTeamId: 'ct-alpha-2',
      role: 'team_manager',
      status: 'ended',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const membershipsOrgB: UserMembership[] = [
    {
      id: 'mem-admin-beta',
      userId: orgAdminB.id,
      organizationId: 'org-beta',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mem-member-beta',
      userId: memberOrgB.id,
      organizationId: 'org-beta',
      teamId: 'team-beta-1',
      competitionTeamId: 'ct-beta-1',
      role: 'viewer',
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
  // CENÁRIO 1: AUTENTICAÇÃO, PERSONAS E DIRECIONAMENTO (Section 8)
  // =========================================================================
  describe('Cenário 1: Autenticação, Personas e Roteamento', () => {
    it('1.1 Admin Global possui capacidade administrativa em todo o sistema', () => {
      expect(TenantSecurityService.hasCapability(globalAdmin, 'competition:create')).toBe(true);
      expect(TenantSecurityService.hasCapability(globalAdmin, 'settings:manage')).toBe(true);
      expect(TenantSecurityService.canViewOrganization(globalAdmin, 'org-alpha', [])).toBe(true);
      expect(TenantSecurityService.canViewOrganization(globalAdmin, 'org-beta', [])).toBe(true);
    });

    it('1.2 Organizador Global possui acesso conforme RBAC e exige membership para organização específica', () => {
      expect(TenantSecurityService.hasCapability(globalOrganizer, 'competition:create')).toBe(true);
      // Sem membership ativa no tenant alvo, acesso cross-tenant é negado
      expect(TenantSecurityService.canViewOrganization(globalOrganizer, 'org-alpha', [])).toBe(false);
      // Com membership ativa no tenant alvo, acesso é concedido
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

    it('1.3 Team Manager não possui capacidade de criar competições ou gerenciar configurações globais', () => {
      expect(TenantSecurityService.hasCapability(managerTeamAlpha, 'competition:create')).toBe(false);
      expect(TenantSecurityService.hasCapability(managerTeamAlpha, 'settings:manage')).toBe(false);
    });

    it('1.4 Usuário sem equipes ativas não possui contexto nem autorização de elenco', async () => {
      const available = await TeamContextService.getUserAvailableTeams(unaffiliatedUser, []);
      expect(available).toHaveLength(0);
      expect(TeamContextService.getActiveTeamContext(available)).toBeNull();
    });
  });

  // =========================================================================
  // CENÁRIO 2: ORGANIZAÇÕES E ISOLAMENTO MULTI-TENANT (Sections 9 e 10)
  // =========================================================================
  describe('Cenário 2: Gestão de Organizações e Isolamento Multi-Tenant', () => {
    it('2.1 Org Admin Alpha visualiza Org Alpha mas tem acesso categoricamente negado à Org Beta', () => {
      expect(TenantSecurityService.canViewOrganization(orgAdminA, 'org-alpha', membershipsOrgA)).toBe(true);
      expect(TenantSecurityService.canViewOrganization(orgAdminA, 'org-beta', membershipsOrgA)).toBe(false);
    });

    it('2.2 Org Admin Beta tem acesso negado à Org Alpha', () => {
      expect(TenantSecurityService.canViewOrganization(orgAdminB, 'org-alpha', membershipsOrgB)).toBe(false);
      expect(TenantSecurityService.canViewOrganization(orgAdminB, 'org-beta', membershipsOrgB)).toBe(true);
    });

    it('2.3 Membro comum sem papel admin não pode gerenciar membros da organização', () => {
      expect(TenantSecurityService.canManageOrganizationMembers(managerTeamAlpha, 'org-alpha', membershipsOrgA)).toBe(false);
      expect(TenantSecurityService.canManageOrganizationMembers(memberOrgB, 'org-beta', membershipsOrgB)).toBe(false);
    });
  });

  // =========================================================================
  // CENÁRIO 3: GESTÃO DE MEMBROS E PROTEÇÃO ANTI-ESCALADA (Sections 11 e 17)
  // =========================================================================
  describe('Cenário 3: Gestão de Membros e Proteção Anti-Escalada', () => {
    it('3.1 Org Admin pode atualizar papel de terceiros em sua própria organização', () => {
      const canUpdate = TenantSecurityService.canUpdateMemberRole(
        orgAdminA,
        'org-alpha',
        managerTeamAlpha.id,
        'viewer',
        membershipsOrgA,
      );
      expect(canUpdate).toBe(true);
    });

    it('3.2 Prevenção de Auto-Escalada: Usuário é estritamente impedido de alterar o próprio papel', () => {
      const selfChange = TenantSecurityService.canUpdateMemberRole(
        orgAdminA,
        'org-alpha',
        orgAdminA.id,
        'viewer',
        membershipsOrgA,
      );
      expect(selfChange).toBe(false);
    });

    it('3.3 Prevenção de Auto-Lockout: Usuário é impedido de suspender ou alterar o status da sua própria conta', () => {
      const selfSuspend = TenantSecurityService.canChangeMemberStatus(
        orgAdminA,
        'org-alpha',
        orgAdminA.id,
        membershipsOrgA,
      );
      expect(selfSuspend).toBe(false);
    });

    it('3.4 Membro suspenso (status blocked) perde todas as autorizações na organização', () => {
      const suspendedUser: UserProfile = {
        id: 'user-suspended-id',
        name: 'Suspenso',
        email: 'susp@test.com',
        role: 'team',
      };
      expect(TenantSecurityService.canViewOrganization(suspendedUser, 'org-alpha', membershipsOrgA)).toBe(false);
      expect(TenantSecurityService.canManageOrganizationMembers(suspendedUser, 'org-alpha', membershipsOrgA)).toBe(false);
    });

    it('3.5 Membro removido (status ended) perde acesso ao sistema', () => {
      const endedUser: UserProfile = {
        id: 'user-ended-id',
        name: 'Removido',
        email: 'ended@test.com',
        role: 'team',
      };
      expect(TenantSecurityService.canViewOrganization(endedUser, 'org-alpha', membershipsOrgA)).toBe(false);
    });
  });

  // =========================================================================
  // CENÁRIO 4: CICLO DE VIDA DE CONVITES E VALIDAÇÃO DE INTEGRIDADE (Section 12)
  // =========================================================================
  describe('Cenário 4: Convites de Organização e Defesas Multi-Tenant', () => {
    it('4.1 Convite válido cria membership com status active e role atribuído', async () => {
      const inv = await dataAccess.createOrganizationInvitation({
        organizationId: 'org-alpha',
        email: 'convidado.valido@baseos.app',
        role: 'team_manager',
        invitedBy: orgAdminA.id,
      });

      expect(inv.id).toBeDefined();
      expect(inv.status).toBe('pending');
      expect(inv.token.length).toBeGreaterThan(16);

      const acceptRes = await dataAccess.acceptOrganizationInvitation(inv.token, 'user-accepted-1');
      expect(acceptRes.ok).toBe(true);

      const members = await dataAccess.listOrganizationMembers('org-alpha');
      const found = members.find((m) => m.userId === 'user-accepted-1');
      expect(found).toBeDefined();
      expect(found?.status).toBe('active');
      expect(found?.role).toBe('team_manager');
    });

    it('4.2 Convite com data expirada é rejeitado na aceitação', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const expiredInv = await dataAccess.createOrganizationInvitation({
        organizationId: 'org-alpha',
        email: 'convidado.expirado@baseos.app',
        role: 'viewer',
        invitedBy: orgAdminA.id,
        expiresAt: pastDate,
      });

      const acceptRes = await dataAccess.acceptOrganizationInvitation(expiredInv.token, 'user-late');
      expect(acceptRes.ok).toBe(false);
      expect(acceptRes.error).toMatch(/expirou/i);
    });

    it('4.3 Convite já aceito não pode ser reutilizado (single-use defense)', async () => {
      const singleUseInv = await dataAccess.createOrganizationInvitation({
        organizationId: 'org-alpha',
        email: 'convidado.single@baseos.app',
        role: 'viewer',
        invitedBy: orgAdminA.id,
      });

      const firstTry = await dataAccess.acceptOrganizationInvitation(singleUseInv.token, 'user-first');
      expect(firstTry.ok).toBe(true);

      const secondTry = await dataAccess.acceptOrganizationInvitation(singleUseInv.token, 'user-second');
      expect(secondTry.ok).toBe(false);
      expect(secondTry.error).toMatch(/já foi utilizado/i);
    });

    it('4.4 Tentativa de associar equipe de outro inquilino no convite é bloqueada', () => {
      const crossTenantInvite = TenantSecurityService.canInviteMember(
        orgAdminA,
        'org-alpha',
        'team_manager',
        membershipsOrgA,
        'team-beta-1', // Equipe pertence à org-beta!
        allTeams,
      );
      expect(crossTenantInvite).toBe(false);
    });

    it('4.5 Team manager não pode emitir convite para papel admin ou organizer', () => {
      const canInviteAdmin = TenantSecurityService.canInviteMember(
        managerTeamAlpha,
        'org-alpha',
        'admin',
        membershipsOrgA,
      );
      expect(canInviteAdmin).toBe(false);

      const canInviteOrg = TenantSecurityService.canInviteMember(
        managerTeamAlpha,
        'org-alpha',
        'organizer',
        membershipsOrgA,
      );
      expect(canInviteOrg).toBe(false);
    });
  });

  // =========================================================================
  // CENÁRIO 5: CONTEXTO DE EQUIPE E TEAM PORTAL (Sections 14, 15 e 16)
  // =========================================================================
  describe('Cenário 5: Contexto de Equipe, Team Portal e Troca de Equipe', () => {
    it('5.1 Usuário com exatamente 1 equipe ativa adota-a automaticamente como contexto ativo', async () => {
      const available = await TeamContextService.getUserAvailableTeams(managerTeamAlpha, membershipsOrgA);
      expect(available).toHaveLength(1);
      expect(available[0].teamId).toBe('team-alpha-1');

      const active = TeamContextService.getActiveTeamContext(managerTeamAlpha.id, available);
      expect(active).not.toBeNull();
      expect(active?.teamId).toBe('team-alpha-1');
    });

    it('5.2 Usuário com múltiplas equipes lista todas as autorizadas e permite alternância', async () => {
      const available = await TeamContextService.getUserAvailableTeams(multiTeamManager, membershipsOrgA);
      expect(available).toHaveLength(2);

      const teamIds = available.map((t) => t.teamId);
      expect(teamIds).toContain('team-alpha-1');
      expect(teamIds).toContain('team-alpha-2');

      // Troca para o time 2
      expect(TeamContextService.canSwitchToTeam('ct-alpha-2', available)).toBe(true);
      const switched = TeamContextService.setActiveTeamContext(multiTeamManager.id, 'ct-alpha-2', available);
      expect(switched.teamId).toBe('team-alpha-2');

      const active = TeamContextService.getActiveTeamContext(multiTeamManager.id, available);
      expect(active?.teamId).toBe('team-alpha-2');
    });

    it('5.3 IDOR / Cross-Team: Tentativa de selecionar equipe de outro usuário ou organização é bloqueada', async () => {
      const available = await TeamContextService.getUserAvailableTeams(managerTeamAlpha, membershipsOrgA);
      
      // Tentativa de selecionar time Beta ou time 2 que não constam nas memberships
      expect(TeamContextService.canSwitchToTeam('ct-beta-1', available)).toBe(false);
      expect(TeamContextService.canSwitchToTeam('ct-alpha-2', available)).toBe(false);

      expect(() => {
        TeamContextService.setActiveTeamContext(managerTeamAlpha.id, 'ct-beta-1', available);
      }).toThrow(/não pertence às memberships ativas/i);
    });

    it('5.4 Gestão de Elenco: Gestor do Time Alpha-1 pode gerenciar apenas Time Alpha-1', () => {
      expect(TenantSecurityService.canManageRoster(managerTeamAlpha, ctAlpha1, membershipsOrgA)).toBe(true);
      expect(TenantSecurityService.canManageRoster(managerTeamAlpha, ctAlpha2, membershipsOrgA)).toBe(false);
      expect(TenantSecurityService.canManageRoster(managerTeamAlpha, ctBeta1, membershipsOrgA)).toBe(false);
    });

    it('5.5 Limpeza de Contexto no Logout remove tokens e identificadores do storage', () => {
      const sample = [
        {
          id: 'ct-sample',
          competitionTeamId: 'ct-sample',
          teamId: 'team-sample',
          teamName: 'Time Teste',
          teamShortName: 'TT',
          competitionId: 'comp-1',
          competitionName: 'Copa',
          role: 'team_manager',
          accessToken: 'tok-1',
        },
      ];

      TeamContextService.setActiveTeamContext('user-sample', 'ct-sample', sample);
      expect(sessionStorage.getItem('baseos_active_team_context_user-sample')).toBe('ct-sample');

      TeamContextService.clearActiveTeamContext('user-sample');
      expect(sessionStorage.getItem('baseos_active_team_context_user-sample')).toBeNull();
    });
  });

  // =========================================================================
  // CENÁRIO 6: RESILIÊNCIA E ROTEAMENTO SEGURO (Sections 22 e 23)
  // =========================================================================
  describe('Cenário 6: Resiliência a Refresh, Manipulação de Storage e Roteamento', () => {
    it('6.1 Manipulação maliciosa de sessionStorage não concede acesso a equipe não autorizada', async () => {
      const available = await TeamContextService.getUserAvailableTeams(managerTeamAlpha, membershipsOrgA);

      // Atacante injeta chave forjada diretamente no sessionStorage
      sessionStorage.setItem('baseos_active_team_context_user-manager-alpha', 'ct-beta-invasao');

      // getActiveTeamContext valida contra availableTeams e descarta o valor forjado
      const active = TeamContextService.getActiveTeamContext(managerTeamAlpha.id, available);
      expect(active?.competitionTeamId).toBe('ct-alpha-1'); // Não caiu no time forjado
      expect(active?.competitionTeamId).not.toBe('ct-beta-invasao');
    });

    it('6.2 Acesso direto por URL a organização não autorizada é interceptado por canViewOrganization', () => {
      // Usuário de Alpha tenta acessar diretamente a URL /organizacoes/org-beta
      const canAccessBeta = TenantSecurityService.canViewOrganization(managerTeamAlpha, 'org-beta', membershipsOrgA);
      expect(canAccessBeta).toBe(false);
    });
  });
});
