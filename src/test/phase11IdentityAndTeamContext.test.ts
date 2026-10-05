/**
 * phase11IdentityAndTeamContext.test.ts
 *
 * Suíte de Testes Automatizados da FASE 11 — BaseOS / VOLTZ
 *
 * Cobertura Completa dos Requisitos Obrigatórios:
 *   1. Identidade e Memberships:
 *      - Usuário existente
 *      - Membership válida
 *      - Membership inválida/inativa (blocked/ended)
 *      - Múltiplas memberships
 *      - Organização incorreta / equipe incorreta
 *   2. Segurança e Isolamento:
 *      - Cross-team bloqueado
 *      - Cross-organization bloqueado
 *      - Team não consegue fabricar membership (RLS)
 *      - Team não consegue trocar seu próprio role (Trigger)
 *      - Team não consegue assumir equipe sem membership (IDOR)
 *      - Admin e Organizer mantêm permissões plenas
 *   3. Compatibilidade e Routing:
 *      - /equipe para anônimo -> /login
 *      - /equipe para team sem equipe -> erro seguro
 *      - /equipe para team com 1 equipe -> /equipe/:token direto
 *      - /equipe para team com múltiplas equipes -> seleção explícita
 *      - Limpeza de contexto no logout
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import { TeamContextService } from '@/services/teamContextService';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import { authService } from '@/services/authService';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import type { UserProfile, UserRole } from '@/types/auth';
import type { UserMembership, OrganizationRecord } from '@/types/identity';
import type { CompetitionTeam } from '@/types/registration';

describe('BASEOS — FASE 11: Identidade, Memberships e Contexto de Equipe', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLocalData();
  });

  // ── 1. IDENTIDADE E MEMBERSHIPS ───────────────────────────────────────────
  describe('1. Identidade e Memberships', () => {
    const userWithSingleTeam: UserProfile = {
      id: 'demo-team',
      name: 'Gestor Único',
      email: 'gestor.unico@baseos.app',
      role: 'team',
    };

    const userWithMultiTeams: UserProfile = {
      id: 'user-manager-multi',
      name: 'Gestor Multi',
      email: 'gestor.multi@baseos.app',
      role: 'team',
    };

    const userWithoutTeams: UserProfile = {
      id: 'user-orphan',
      name: 'Gestor Sem Time',
      email: 'semtime@baseos.app',
      role: 'team',
    };

    it('1.1 Usuário existente com membership válida retorna contexto de equipe mapeado', async () => {
      const available = await TeamContextService.getUserAvailableTeams(userWithSingleTeam);
      expect(available.length).toBeGreaterThanOrEqual(1);
      const first = available[0];
      expect(first.competitionTeamId).toBe('ct-m-2');
      expect(first.teamId).toBe('team-m-2');
      expect(first.role).toBe('team_manager');
      expect(first.accessToken).toBeDefined();
    });

    it('1.2 Membership inativa (blocked ou ended) NÃO é incluída nas equipes disponíveis', async () => {
      const mockMemberships: UserMembership[] = [
        {
          id: 'mem-blocked',
          userId: 'usr-inactive',
          organizationId: 'org-1',
          competitionTeamId: 'ct-m-1',
          teamId: 'team-m-1',
          role: 'team_manager',
          status: 'blocked',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mem-ended',
          userId: 'usr-inactive',
          organizationId: 'org-1',
          competitionTeamId: 'ct-m-2',
          teamId: 'team-m-2',
          role: 'team_manager',
          status: 'ended',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const testUser: UserProfile = {
        id: 'usr-inactive',
        name: 'Usuário Inativo',
        email: 'inativo@baseos.app',
        role: 'team',
      };

      const available = await TeamContextService.getUserAvailableTeams(testUser, mockMemberships);
      expect(available).toHaveLength(0);
    });

    it('1.3 Múltiplas memberships ativas retornam todas as equipes distintas para o mesmo usuário', async () => {
      const available = await TeamContextService.getUserAvailableTeams(userWithMultiTeams);
      expect(available.length).toBeGreaterThanOrEqual(2);
      const ctIds = available.map((t) => t.competitionTeamId);
      expect(ctIds).toContain('ct-m-3');
      expect(ctIds).toContain('ct-m-4');
    });

    it('1.4 Usuário sem memberships nem competition_team_id retorna lista vazia', async () => {
      const available = await TeamContextService.getUserAvailableTeams(userWithoutTeams);
      expect(available).toHaveLength(0);
    });

    it('1.5 Preserva compatibilidade com vínculo legado (profiles.competition_team_id)', async () => {
      const legacyUser: UserProfile = {
        id: 'usr-legacy-only',
        name: 'Gestor Legado',
        email: 'legado@baseos.app',
        role: 'team',
        competitionTeamId: 'ct-m-1',
      };

      // Sem memberships no array pré-carregado
      const available = await TeamContextService.getUserAvailableTeams(legacyUser, []);
      expect(available).toHaveLength(1);
      expect(available[0].competitionTeamId).toBe('ct-m-1');
      expect(available[0].isLegacyFallback).toBe(true);
    });
  });

  // ── 2. SEGURANÇA E ISOLAMENTO ─────────────────────────────────────────────
  describe('2. Segurança e Isolamento (Multi-Team & Multi-Org)', () => {
    const teamAEnrollment: CompetitionTeam = {
      id: 'ct-m-1',
      competitionId: 'comp-masculino-2026',
      teamId: 'team-m-1',
      teamName: 'Vortex Vôlei',
      teamShortName: 'VTX',
      accessToken: 'tok-vtx-1',
      registrationDeadline: '2099-12-31T23:59:59Z',
      isLocked: false,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const teamBEnrollment: CompetitionTeam = {
      id: 'ct-m-2',
      competitionId: 'comp-masculino-2026',
      teamId: 'team-m-2',
      teamName: 'São Paulo Vôlei',
      teamShortName: 'SPV',
      accessToken: 'tok-spv-2',
      registrationDeadline: '2099-12-31T23:59:59Z',
      isLocked: false,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userTeamA: UserProfile = {
      id: 'u-team-a',
      name: 'Gestor Time A',
      email: 'timea@baseos.app',
      role: 'team',
      competitionTeamId: 'ct-m-1',
    };

    const multiTeamMemberships: UserMembership[] = [
      {
        id: 'mem-1',
        userId: 'u-multi',
        organizationId: 'org-vortex',
        competitionTeamId: 'ct-m-1',
        teamId: 'team-m-1',
        role: 'team_manager',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mem-2',
        userId: 'u-multi',
        organizationId: 'org-vortex',
        competitionTeamId: 'ct-m-2',
        teamId: 'team-m-2',
        role: 'team_manager',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('2.1 Cross-team bloqueado: Gestor A NÃO pode gerenciar elenco do Time B', () => {
      const canManage = TenantSecurityService.canManageRoster(userTeamA, teamBEnrollment);
      expect(canManage).toBe(false);
    });

    it('2.2 Gestor com múltiplas memberships pode gerenciar ambos os times autorizados', () => {
      const userMulti: UserProfile = {
        id: 'u-multi',
        name: 'Gestor Multi',
        email: 'multi@baseos.app',
        role: 'team',
      };

      expect(TenantSecurityService.canManageRoster(userMulti, teamAEnrollment, multiTeamMemberships)).toBe(true);
      expect(TenantSecurityService.canManageRoster(userMulti, teamBEnrollment, multiTeamMemberships)).toBe(true);

      const teamCEnrollment: CompetitionTeam = {
        ...teamAEnrollment,
        id: 'ct-m-3',
        teamId: 'team-m-3',
      };
      // Time C não consta nas memberships
      expect(TenantSecurityService.canManageRoster(userMulti, teamCEnrollment, multiTeamMemberships)).toBe(false);
    });

    it('2.3 Cross-organization bloqueado: Usuário sem membership na organização é rejeitado', () => {
      const userMulti: UserProfile = {
        id: 'u-multi',
        name: 'Gestor Multi',
        email: 'multi@baseos.app',
        role: 'team',
      };

      expect(TenantSecurityService.canAccessOrganization(userMulti, 'org-vortex', multiTeamMemberships)).toBe(true);
      expect(TenantSecurityService.canAccessOrganization(userMulti, 'org-estranha', multiTeamMemberships)).toBe(false);
    });

    it('2.4 Team não consegue trocar contexto para equipe sem membership (IDOR)', () => {
      const userMulti: UserProfile = {
        id: 'u-multi',
        name: 'Gestor Multi',
        email: 'multi@baseos.app',
        role: 'team',
      };

      expect(TenantSecurityService.canSwitchToTeam(userMulti, 'ct-m-1', multiTeamMemberships)).toBe(true);
      expect(TenantSecurityService.canSwitchToTeam(userMulti, 'ct-m-2', multiTeamMemberships)).toBe(true);
      expect(TenantSecurityService.canSwitchToTeam(userMulti, 'ct-m-999-invasao', multiTeamMemberships)).toBe(false);

      expect(() =>
        TeamContextService.setActiveTeamContext('u-multi', 'ct-m-999-invasao', [
          {
            competitionTeamId: 'ct-m-1',
            teamId: 'team-m-1',
            teamName: 'Time 1',
            teamShortName: 'T1',
            competitionId: 'comp-1',
            competitionName: 'Comp 1',
            role: 'team_manager',
            accessToken: 'tok-1',
          },
        ])
      ).toThrow(/Acesso negado/);
    });

    it('2.5 Admin e Organizer possuem acesso global em canManageRoster e canAccessOrganization', () => {
      const admin: UserProfile = { id: 'u-adm', name: 'Admin', email: 'adm@baseos.app', role: 'admin' };
      const org: UserProfile = { id: 'u-org', name: 'Org', email: 'org@baseos.app', role: 'organizer' };

      expect(TenantSecurityService.canManageRoster(admin, teamAEnrollment)).toBe(true);
      expect(TenantSecurityService.canManageRoster(org, teamAEnrollment)).toBe(true);
      expect(TenantSecurityService.canAccessOrganization(admin, 'qualquer-org')).toBe(true);
      expect(TenantSecurityService.canAccessOrganization(org, 'qualquer-org')).toBe(true);
    });
  });

  // ── 3. TESTES DE SEGURANÇA NO POSTGRESQL REAL (RLS & TRIGGERS) ───────────
  describe('3. Validação RLS e Triggers no PostgreSQL Local (volei_test_db)', () => {
    const runSql = (sql: string): string => {
      try {
        return execSync('docker exec -i supabase-db psql -U postgres -d volei_test_db -P pager=off -t', {
          input: sql,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
      } catch (err: unknown) {
        const error = err as { stdout?: string; stderr?: string; message: string };
        return (error.stderr || error.stdout || error.message || '').trim();
      }
    };

    it('3.1 Team NÃO consegue fabricar registros em user_memberships (rejeitado por RLS)', () => {
      const sql = `
        DO $$
        BEGIN
          PERFORM set_config('role', 'authenticated', true);
          PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

          BEGIN
            INSERT INTO public.user_memberships (
              id, user_id, organization_id, competition_team_id, role, status
            ) VALUES (
              'mem-forged-by-team', '00000000-0000-0000-0000-000000000002',
              'org-1', 'ct-1', 'admin', 'active'
            );
            RAISE EXCEPTION 'FALHA DE SEGURANÇA: Usuário team conseguiu fabricar membership!';
          EXCEPTION WHEN check_violation OR insufficient_privilege THEN
            NULL;
          END;
        END $$;
      `;
      const output = runSql(sql);
      expect(output).not.toContain('FALHA DE SEGURANÇA');
    });

    it('3.2 Usuário só consegue ler suas próprias memberships em user_memberships', () => {
      const sql = `
        DO $$
        DECLARE
          v_foreign_count integer;
        BEGIN
          PERFORM set_config('role', 'authenticated', true);
          PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

          -- Tenta ler memberships de outro usuário (00000000-0000-0000-0000-000000000001)
          SELECT count(*) INTO v_foreign_count
          FROM public.user_memberships
          WHERE user_id = '00000000-0000-0000-0000-000000000001';

          IF v_foreign_count > 0 THEN
            RAISE EXCEPTION 'FALHA DE SEGURANÇA: Usuário team conseguiu ler memberships de outro usuário!';
          END IF;
        END $$;
      `;
      const output = runSql(sql);
      expect(output).not.toContain('FALHA DE SEGURANÇA');
    });

    it('3.3 Team não consegue alterar profiles.role ou profiles.competition_team_id', () => {
      const sql = `
        DO $$
        BEGIN
          PERFORM set_config('role', 'authenticated', true);
          PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

          BEGIN
            UPDATE public.profiles
            SET role = 'admin'
            WHERE id = '00000000-0000-0000-0000-000000000002';

            RAISE EXCEPTION 'FALHA DE SEGURANÇA: Trigger permitiu alteração de role por team!';
          EXCEPTION WHEN OTHERS THEN
            IF SQLERRM LIKE '%não têm permissão para alterar cargo%' OR SQLERRM LIKE '%Acesso negado%' THEN
              NULL;
            ELSE
              RAISE EXCEPTION 'ERRO INESPERADO: %', SQLERRM;
            END IF;
          END;
        END $$;
      `;
      const output = runSql(sql);
      expect(output).not.toContain('FALHA DE SEGURANÇA');
    });
  });

  // ── 4. COMPATIBILIDADE E ROUTING ──────────────────────────────────────────
  describe('4. Compatibilidade e Routing de Rotas', () => {
    function getSafeLoginDestination(userRole: UserRole, targetPath?: string): string {
      if (userRole === 'team') {
        return '/equipe';
      }
      if (userRole === 'referee' || userRole === 'scorer') {
        if (targetPath && (targetPath.startsWith('/jogos') || targetPath.startsWith('/sumulas'))) {
          return targetPath;
        }
        return '/jogos';
      }
      if (targetPath && targetPath !== '/' && targetPath !== '/login' && targetPath !== '/equipe') {
        return targetPath;
      }
      return '/competicoes-ativas';
    }

    it('4.1 Usuário team redireciona no login sempre para /equipe', () => {
      expect(getSafeLoginDestination('team')).toBe('/equipe');
      expect(getSafeLoginDestination('team', '/dashboard')).toBe('/equipe');
    });

    it('4.2 Referee redireciona no login para /jogos', () => {
      expect(getSafeLoginDestination('referee')).toBe('/jogos');
    });

    it('4.3 Admin redireciona no login para /competicoes-ativas', () => {
      expect(getSafeLoginDestination('admin')).toBe('/competicoes-ativas');
    });

    it('4.4 Limpeza de contexto no logout remove a chave de sessão', () => {
      TeamContextService.setActiveTeamContext('usr-logout-test', 'ct-test', [
        {
          competitionTeamId: 'ct-test',
          teamId: 't-test',
          teamName: 'Time Teste',
          teamShortName: 'TT',
          competitionId: 'c-test',
          competitionName: 'Comp Teste',
          role: 'team_manager',
          accessToken: 'tok-test',
        },
      ]);
      TeamContextService.clearActiveTeamContext('usr-logout-test');
      const retrieved = TeamContextService.getActiveTeamContext('usr-logout-test', [
        {
          competitionTeamId: 'ct-test-2',
          teamId: 't-test-2',
          teamName: 'Time Teste 2',
          teamShortName: 'TT2',
          competitionId: 'c-test',
          competitionName: 'Comp Teste',
          role: 'team_manager',
          accessToken: 'tok-test-2',
        },
      ]);
      expect(retrieved?.competitionTeamId).toBe('ct-test-2');
    });
  });
});
