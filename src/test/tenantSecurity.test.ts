import { describe, it, expect } from 'vitest';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import type { UserProfile } from '@/types/auth';
import type { CompetitionTeam } from '@/types/registration';
import type { MatchRecord } from '@/types/entities';

describe('Fase 8 & 9 & Fase 1 — Multi-Tenancy, Proteção IDOR/BOLA e RBAC', () => {
  const adminUser: UserProfile = {
    id: 'user-admin',
    name: 'Admin Master',
    email: 'admin@baseos.com',
    role: 'admin',
  };

  const organizerUser: UserProfile = {
    id: 'user-org',
    name: 'Organizador Regional',
    email: 'org@baseos.com',
    role: 'organizer',
  };

  const teamAUser: UserProfile = {
    id: 'user-team-a',
    name: 'Capitão Time A',
    email: 'timeA@baseos.com',
    role: 'team',
    competitionTeamId: 'ct-team-a',
  };

  const teamBUser: UserProfile = {
    id: 'user-team-b',
    name: 'Técnico Time B',
    email: 'timeB@baseos.com',
    role: 'team',
    competitionTeamId: 'ct-team-b',
  };

  const refereeUser: UserProfile = {
    id: 'user-referee',
    name: 'Carlos Silva',
    email: 'arbitro@voleipro.app',
    role: 'referee',
  };

  const otherRefereeUser: UserProfile = {
    id: 'user-other-referee',
    name: 'Marcos Juiz',
    email: 'marcos@voleipro.app',
    role: 'referee',
  };

  const viewerUser: UserProfile = {
    id: 'user-viewer',
    name: 'Espectador',
    email: 'viewer@baseos.com',
    role: 'viewer',
  };

  const competitionTeamA: CompetitionTeam = {
    id: 'ct-team-a',
    competitionId: 'comp-1',
    teamId: 'team-1',
    teamName: 'Time A',
    teamShortName: 'TMA',
    registrationDeadline: '2026-12-31T23:59:59Z',
    status: 'in_progress',
    isLocked: false,
    accessToken: 'token-a-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const competitionTeamB: CompetitionTeam = {
    id: 'ct-team-b',
    competitionId: 'comp-1',
    teamId: 'team-2',
    teamName: 'Time B',
    teamShortName: 'TMB',
    registrationDeadline: '2026-12-31T23:59:59Z',
    status: 'in_progress',
    isLocked: false,
    accessToken: 'token-b-456',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseMatch: MatchRecord = {
    id: 'match-1',
    competitionId: 'comp-1',
    round: 1,
    matchNumber: 1,
    teamAId: 'team-1',
    teamBId: 'team-2',
    teamAName: 'Time A',
    teamBName: 'Time B',
    teamAShortName: 'TMA',
    teamBShortName: 'TMB',
    venue: 'Ginásio Principal',
    scheduledTime: new Date().toISOString(),
    status: 'scheduled',
    sets: [],
    referees: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('RBAC - Matriz de Capacidades', () => {
    it('admin e organizador possuem permissão para criar competições e partidas', () => {
      expect(TenantSecurityService.hasCapability(adminUser, 'competition:create')).toBe(true);
      expect(TenantSecurityService.hasCapability(organizerUser, 'competition:create')).toBe(true);
      expect(TenantSecurityService.hasCapability(teamAUser, 'competition:create')).toBe(false);
      expect(TenantSecurityService.hasCapability(viewerUser, 'competition:create')).toBe(false);
    });

    it('apenas perfis autorizados podem pontuar e finalizar partidas', () => {
      expect(TenantSecurityService.hasCapability(adminUser, 'match:score')).toBe(true);
      expect(TenantSecurityService.hasCapability(organizerUser, 'match:score')).toBe(true);
      expect(TenantSecurityService.hasCapability(refereeUser, 'match:score')).toBe(true);
      expect(TenantSecurityService.hasCapability(teamAUser, 'match:score')).toBe(false);
      expect(TenantSecurityService.hasCapability(viewerUser, 'match:score')).toBe(false);
    });

    it('deve validar combinacao com hasAllCapabilities e hasAnyCapability', () => {
      expect(TenantSecurityService.hasAllCapabilities(adminUser, ['competition:create', 'users:manage'])).toBe(true);
      expect(TenantSecurityService.hasAllCapabilities(organizerUser, ['competition:create', 'users:manage'])).toBe(false);
      expect(TenantSecurityService.hasAnyCapability(organizerUser, ['competition:create', 'users:manage'])).toBe(true);
    });
  });

  describe('Validação de Escalação de Arbitragem em canSubmitMatchScore', () => {
    it('permite que qualquer árbitro pontue se não houver arbitragem nominalmente escalada', () => {
      const matchWithoutReferees = { ...baseMatch, referees: [] };
      expect(TenantSecurityService.canSubmitMatchScore(refereeUser, matchWithoutReferees)).toBe(true);
      expect(TenantSecurityService.canSubmitMatchScore(otherRefereeUser, matchWithoutReferees)).toBe(true);
    });

    it('permite apenas o árbitro escalado na partida quando há escalação definida', () => {
      const matchWithCarlos = {
        ...baseMatch,
        referees: [{ role: '1º Árbitro', name: 'Carlos Silva' }],
      };

      // Carlos Silva está escalado -> Permitido
      expect(TenantSecurityService.canSubmitMatchScore(refereeUser, matchWithCarlos)).toBe(true);

      // Marcos Juiz NÃO está escalado -> Negado
      expect(TenantSecurityService.canSubmitMatchScore(otherRefereeUser, matchWithCarlos)).toBe(false);

      // Admin e Organizador sempre podem operar
      expect(TenantSecurityService.canSubmitMatchScore(adminUser, matchWithCarlos)).toBe(true);
      expect(TenantSecurityService.canSubmitMatchScore(organizerUser, matchWithCarlos)).toBe(true);
    });

    it('espectadores e times nunca podem pontuar', () => {
      expect(TenantSecurityService.canSubmitMatchScore(teamAUser, baseMatch)).toBe(false);
      expect(TenantSecurityService.canSubmitMatchScore(viewerUser, baseMatch)).toBe(false);
    });
  });

  describe('IDOR / BOLA - Proteção de Acesso a Elencos e Inscrições', () => {
    it('usuário de Time A NÃO pode editar elenco do Time B (Prevenção de IDOR)', () => {
      // Time A acessando seu próprio elenco -> Permitido
      expect(TenantSecurityService.canManageRoster(teamAUser, competitionTeamA)).toBe(true);

      // Time A tentando editar Time B -> Bloqueado com segurança
      expect(TenantSecurityService.canManageRoster(teamAUser, competitionTeamB)).toBe(false);

      // Time B tentando editar Time A -> Bloqueado com segurança
      expect(TenantSecurityService.canManageRoster(teamBUser, competitionTeamA)).toBe(false);
    });

    it('organizador e admin podem gerenciar ambos os elencos', () => {
      expect(TenantSecurityService.canManageRoster(adminUser, competitionTeamA)).toBe(true);
      expect(TenantSecurityService.canManageRoster(adminUser, competitionTeamB)).toBe(true);
      expect(TenantSecurityService.canManageRoster(organizerUser, competitionTeamA)).toBe(true);
      expect(TenantSecurityService.canManageRoster(organizerUser, competitionTeamB)).toBe(true);
    });
  });

  describe('Multi-Tenancy - Isolamento Organizacional', () => {
    it('deve isolar recursos entre Tenants (Organização A vs Organização B)', () => {
      const tenantA = { organizationId: 'org-fed-parana', organizationName: 'Federação Paranaense' };
      const tenantB = { organizationId: 'org-fed-paulista', organizationName: 'Federação Paulista' };

      const resourceOrgA = { id: 'comp-100', organizationId: 'org-fed-parana', name: 'Campeonato Estadual PR' };
      const resourceOrgB = { id: 'comp-200', organizationId: 'org-fed-paulista', name: 'Campeonato Estadual SP' };

      expect(TenantSecurityService.validateTenantAccess(tenantA, resourceOrgA)).toBe(true);
      expect(TenantSecurityService.validateTenantAccess(tenantA, resourceOrgB)).toBe(false);
      expect(TenantSecurityService.validateTenantAccess(tenantB, resourceOrgB)).toBe(true);
      expect(TenantSecurityService.validateTenantAccess(tenantB, resourceOrgA)).toBe(false);
    });
  });
});
