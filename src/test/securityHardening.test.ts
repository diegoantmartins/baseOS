import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService, DEMO_USERS } from '@/services/authService';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import type { UserProfile } from '@/types/auth';
import type { MatchRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

describe('Security Hardening & RBAC Enforcement (Fase 9.1)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Privilege Escalation Protection', () => {
    it('impede que Organizador crie uma conta com perfil Administrador', async () => {
      // Simula sessão de Organizador
      await authService.signIn('organizador@voleipro.app', 'demo123');

      await expect(
        authService.createUser({
          name: 'Hacker Admin',
          email: 'hacker@admin.com',
          role: 'admin',
          status: 'active',
        })
      ).rejects.toThrow(/Organizadores não possuem permissão para criar contas de Administrador/i);
    });

    it('impede que Organizador promova um usuário para Administrador', async () => {
      // Admin cria um usuário comum
      await authService.signIn('diegoantmartins89@gmail.com', 'Au15022020...');
      const created = await authService.createUser({
        name: 'Membro Comum',
        email: 'membro@voleipro.app',
        role: 'scorer',
        status: 'active',
      });

      // Troca para sessão de Organizador
      await authService.signIn('organizador@voleipro.app', 'demo123');

      // Tenta promover
      await expect(
        authService.updateUser(created.id, { role: 'admin' })
      ).rejects.toThrow(/Organizadores não podem modificar ou promover administradores/i);
    });

    it('impede que Organizador altere dados de um Administrador existente', async () => {
      await authService.signIn('organizador@voleipro.app', 'demo123');
      const adminUser = DEMO_USERS.find(u => u.role === 'admin')!;

      await expect(
        authService.updateUser(adminUser.id, { name: 'Nome Alterado' })
      ).rejects.toThrow(/Organizadores não podem modificar ou promover administradores/i);
    });

    it('impede que Organizador exclua um Administrador', async () => {
      await authService.signIn('organizador@voleipro.app', 'demo123');
      const adminUser = DEMO_USERS.find(u => u.role === 'admin')!;

      await expect(
        authService.deleteUser(adminUser.id)
      ).rejects.toThrow(/Organizadores não possuem autorização para excluir administradores/i);
    });

    it('impede que Organizador redefina administrativamente a senha de um Administrador', async () => {
      await authService.signIn('organizador@voleipro.app', 'demo123');
      const adminUser = DEMO_USERS.find(u => u.role === 'admin')!;

      const result = await authService.adminResetPassword(adminUser.id, 'NovaSenha@123');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Organizadores não podem redefinir a senha de administradores/i);
    });

    it('permite que Administrador crie outro Administrador', async () => {
      await authService.signIn('diegoantmartins89@gmail.com', 'Au15022020...');

      const newAdmin = await authService.createUser({
        name: 'Segundo Admin',
        email: 'segundo.admin@voleipro.app',
        role: 'admin',
        status: 'active',
      });

      expect(newAdmin.id).toBeDefined();
      expect(newAdmin.role).toBe('admin');
    });
  });

  describe('2. Protection of Last Active Administrator', () => {
    it('impede desativação do único Administrador ativo do sistema', async () => {
      await authService.signIn('diegoantmartins89@gmail.com', 'Au15022020...');
      const adminUser = DEMO_USERS.find(u => u.role === 'admin')!;

      await expect(
        authService.updateUser(adminUser.id, { status: 'inactive' })
      ).rejects.toThrow(/O sistema deve manter pelo menos um Administrador ativo/i);
    });

    it('impede rebaixamento de cargo do único Administrador ativo', async () => {
      await authService.signIn('diegoantmartins89@gmail.com', 'Au15022020...');
      const adminUser = DEMO_USERS.find(u => u.role === 'admin')!;

      await expect(
        authService.updateUser(adminUser.id, { role: 'organizer' })
      ).rejects.toThrow(/O sistema deve manter pelo menos um Administrador ativo/i);
    });

    it('impede exclusão do único Administrador ativo', async () => {
      await authService.signIn('diegoantmartins89@gmail.com', 'Au15022020...');
      const adminUser = DEMO_USERS.find(u => u.role === 'admin')!;

      await expect(
        authService.deleteUser(adminUser.id)
      ).rejects.toThrow(/Não é permitido excluir o único Administrador ativo/i);
    });
  });

  describe('3. Unauthorized User Mutation Prevention', () => {
    it('impede que usuário não autenticado crie usuários', async () => {
      await expect(
        authService.createUser({
          name: 'Anônimo',
          email: 'anon@teste.com',
          role: 'viewer',
          status: 'active',
        })
      ).rejects.toThrow(/Permissão negada/i);
    });

    it('impede que perfis de Árbitro, Equipe ou Visualizador executem mutações de usuários', async () => {
      // Árbitro
      await authService.signIn('arbitro@voleipro.app', 'demo123');
      await expect(
        authService.createUser({
          name: 'Tentativa Árbitro',
          email: 'arb.user@teste.com',
          role: 'scorer',
          status: 'active',
        })
      ).rejects.toThrow(/Permissão negada/i);

      // Equipe
      await authService.signIn('equipe@voleipro.app', 'demo123');
      await expect(
        authService.deleteUser('demo-referee')
      ).rejects.toThrow(/Permissão negada/i);
    });
  });

  describe('4. TenantSecurityService Engine Enforcement', () => {
    const adminUser: UserProfile = { id: 'u-admin', name: 'Admin', email: 'admin@app.com', role: 'admin' };
    const organizerUser: UserProfile = { id: 'u-org', name: 'Org', email: 'org@app.com', role: 'organizer' };
    const refereeUser: UserProfile = { id: 'u-ref', name: 'Carlos Arbitro', email: 'carlos@app.com', role: 'referee' };
    const teamUser: UserProfile = { id: 'u-team', name: 'Time', email: 'time@app.com', role: 'team', competitionTeamId: 'ct-10' };
    const viewerUser: UserProfile = { id: 'u-view', name: 'Viewer', email: 'view@app.com', role: 'viewer' };

    it('valida permissões de exclusão de recursos esportivos vs administrativos', () => {
      expect(TenantSecurityService.canDeleteResource(adminUser, 'competition')).toBe(true);
      expect(TenantSecurityService.canDeleteResource(adminUser, 'user')).toBe(true);

      expect(TenantSecurityService.canDeleteResource(organizerUser, 'competition')).toBe(true);
      expect(TenantSecurityService.canDeleteResource(organizerUser, 'user')).toBe(false);

      expect(TenantSecurityService.canDeleteResource(refereeUser, 'match')).toBe(false);
      expect(TenantSecurityService.canDeleteResource(teamUser, 'team')).toBe(false);
      expect(TenantSecurityService.canDeleteResource(viewerUser, 'athlete')).toBe(false);
    });

    it('restringe manutenção crítica de banco exclusivamente a Administradores', () => {
      expect(TenantSecurityService.canPerformDatabaseMaintenance(adminUser)).toBe(true);
      expect(TenantSecurityService.canPerformDatabaseMaintenance(organizerUser)).toBe(false);
      expect(TenantSecurityService.canPerformDatabaseMaintenance(refereeUser)).toBe(false);
      expect(TenantSecurityService.canPerformDatabaseMaintenance(teamUser)).toBe(false);
    });

    it('valida autorização de homologação de partidas', () => {
      expect(TenantSecurityService.canHomologateMatch(adminUser)).toBe(true);
      expect(TenantSecurityService.canHomologateMatch(organizerUser)).toBe(true);
      expect(TenantSecurityService.canHomologateMatch(refereeUser)).toBe(false);
      expect(TenantSecurityService.canHomologateMatch(teamUser)).toBe(false);
    });

    it('assegura proteção BOLA / IDOR para representação de equipes', () => {
      const myTeam: CompetitionTeam = {
        id: 'ct-10',
        competitionId: 'comp-1',
        teamId: 't-10',
        teamName: 'Meu Time',
        teamShortName: 'MT',
        accessToken: 'tok-10',
        registrationDeadline: '2026-12-31T23:59:59Z',
        isLocked: false,
        status: 'approved',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      const otherTeam: CompetitionTeam = {
        id: 'ct-20',
        competitionId: 'comp-1',
        teamId: 't-20',
        teamName: 'Outro Time',
        teamShortName: 'OT',
        accessToken: 'tok-20',
        registrationDeadline: '2026-12-31T23:59:59Z',
        isLocked: false,
        status: 'approved',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      // Usuário da equipe gerencia o seu time mas não o de terceiros
      expect(TenantSecurityService.canManageRoster(teamUser, myTeam)).toBe(true);
      expect(TenantSecurityService.canManageRoster(teamUser, otherTeam)).toBe(false);

      // Admin e Organizador gerenciam qualquer equipe
      expect(TenantSecurityService.canManageRoster(adminUser, otherTeam)).toBe(true);
      expect(TenantSecurityService.canManageRoster(organizerUser, otherTeam)).toBe(true);
    });

    it('restringe lançamento de súmula ao árbitro/apontador nominalmente escalado', () => {
      const matchWithEscalation: MatchRecord = {
        id: 'match-100',
        competitionId: 'comp-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'ct-1',
        teamBId: 'ct-2',
        teamAName: 'Time A',
        teamBName: 'Time B',
        teamAShortName: 'TA',
        teamBShortName: 'TB',
        scheduledTime: '2026-09-01T14:00:00Z',
        venue: 'Ginásio Central',
        status: 'in-progress',
        sets: [],
        referees: [{ role: '1st', name: 'Carlos Arbitro' }],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const matchWithoutEscalation: MatchRecord = {
        ...matchWithEscalation,
        referees: [],
      };

      // Carlos está escalado nominalmente
      expect(TenantSecurityService.canSubmitMatchScore(refereeUser, matchWithEscalation)).toBe(true);

      // Outro árbitro não escalado não pode pontuar se há escala nominal
      const otherReferee: UserProfile = { id: 'u-ref2', name: 'Marcos Outro', email: 'marcos@app.com', role: 'referee' };
      expect(TenantSecurityService.canSubmitMatchScore(otherReferee, matchWithEscalation)).toBe(false);

      // Sem escala nominal registrada, qualquer árbitro credenciado pode operar
      expect(TenantSecurityService.canSubmitMatchScore(otherReferee, matchWithoutEscalation)).toBe(true);

      // Visualizador nunca pode pontuar
      expect(TenantSecurityService.canSubmitMatchScore(viewerUser, matchWithoutEscalation)).toBe(false);
    });
  });
});
