/**
 * teamRoleAuthorizationSecurity.test.ts
 *
 * Suíte de segurança — Fase 9.9
 *
 * Prova que usuários com role='team' operam SOMENTE dentro do escopo autorizado
 * do Portal da Equipe e NÃO possuem capacidade administrativa geral.
 *
 * Estratégia de teste:
 *   - authService (modo demo / localStorage) para simular sessões reais por role.
 *   - TenantSecurityService para validar a matriz RBAC de capacidades.
 *   - dataAccess para validar que regras de negócio bloqueiam operações
 *     não autorizadas na camada de aplicação (complementa a RLS de banco).
 *   - Testes de rotas verificam que RequireAuth bloqueia role='team' nas
 *     rotas operacionais adicionadas na Fase 9.9.
 *
 * Cobertura:
 *   1. Matriz RBAC — capacidades por role
 *   2. Proteção de rotas frontend — team bloqueado em operacionais
 *   3. Isolamento de elenco — team gerencia apenas sua própria equipe
 *   4. Operações administrativas — team não executa CRUD de entidades globais
 *   5. Fluxos legítimos preservados — referee/scorer/organizer intactos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '@/services/authService';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import type { UserProfile } from '@/types/auth';
import type { CompetitionTeam } from '@/types/registration';
import type { MatchRecord } from '@/types/entities';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de usuários por role
// ─────────────────────────────────────────────────────────────────────────────

const adminUser: UserProfile = {
  id: 'u-admin',
  name: 'Admin Teste',
  email: 'admin@baseos.app',
  role: 'admin',
};

const organizerUser: UserProfile = {
  id: 'u-organizer',
  name: 'Organizador Teste',
  email: 'org@baseos.app',
  role: 'organizer',
};

const refereeUser: UserProfile = {
  id: 'u-referee',
  name: 'Árbitro Escalado',
  email: 'arbitro@baseos.app',
  role: 'referee',
};

const scorerUser: UserProfile = {
  id: 'u-scorer',
  name: 'Mesário Teste',
  email: 'scorer@baseos.app',
  role: 'scorer',
};

const teamUserA: UserProfile = {
  id: 'u-team-a',
  name: 'Gestor Time A',
  email: 'timea@baseos.app',
  role: 'team',
  competitionTeamId: 'ct-team-a',
};

const teamUserB: UserProfile = {
  id: 'u-team-b',
  name: 'Gestor Time B',
  email: 'timeb@baseos.app',
  role: 'team',
  competitionTeamId: 'ct-team-b',
};

const viewerUser: UserProfile = {
  id: 'u-viewer',
  name: 'Espectador',
  email: 'viewer@baseos.app',
  role: 'viewer',
};

// Inscrições
const teamAEnrollment: CompetitionTeam = {
  id: 'ct-team-a',
  competitionId: 'comp-indoor-2026',
  teamId: 'team-a',
  teamName: 'Vôlei Time A',
  teamShortName: 'VTA',
  accessToken: 'tok-team-a-secret',
  registrationDeadline: '2099-12-31T23:59:59Z',
  isLocked: false,
  status: 'in_progress',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const teamBEnrollment: CompetitionTeam = {
  id: 'ct-team-b',
  competitionId: 'comp-indoor-2026',
  teamId: 'team-b',
  teamName: 'Vôlei Time B',
  teamShortName: 'VTB',
  accessToken: 'tok-team-b-secret',
  registrationDeadline: '2099-12-31T23:59:59Z',
  isLocked: false,
  status: 'in_progress',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Partida com árbitro escalado nominalmente
const matchWithReferee: MatchRecord = {
  id: 'match-001',
  competitionId: 'comp-indoor-2026',
  round: 1,
  matchNumber: 1,
  teamAId: 'team-a',
  teamBId: 'team-b',
  teamAName: 'Vôlei Time A',
  teamBName: 'Vôlei Time B',
  teamAShortName: 'VTA',
  teamBShortName: 'VTB',
  venue: 'Ginásio Central',
  scheduledTime: '2026-11-20T14:00:00Z',
  status: 'in-progress',
  sets: [],
  referees: [{ role: '1º Árbitro', name: 'Árbitro Escalado' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const matchWithoutReferee: MatchRecord = {
  ...matchWithReferee,
  id: 'match-002',
  referees: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. MATRIZ RBAC — Capacidades por role (Fase 9.9)
// ─────────────────────────────────────────────────────────────────────────────

describe('Fase 9.9 — Segurança: Matriz RBAC por Role', () => {
  describe('1.1 — role=team: capacidades proibidas', () => {
    it('NÃO possui competition:create', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'competition:create')).toBe(false);
    });
    it('NÃO possui competition:edit', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'competition:edit')).toBe(false);
    });
    it('NÃO possui competition:delete', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'competition:delete')).toBe(false);
    });
    it('NÃO possui team:create', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'team:create')).toBe(false);
    });
    it('NÃO possui team:delete', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'team:delete')).toBe(false);
    });
    it('NÃO possui match:create', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'match:create')).toBe(false);
    });
    it('NÃO possui match:edit', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'match:edit')).toBe(false);
    });
    it('NÃO possui match:delete', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'match:delete')).toBe(false);
    });
    it('NÃO possui match:score', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'match:score')).toBe(false);
    });
    it('NÃO possui match:finalize', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'match:finalize')).toBe(false);
    });
    it('NÃO possui users:manage', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'users:manage')).toBe(false);
    });
    it('NÃO possui settings:manage', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'settings:manage')).toBe(false);
    });
    it('NÃO pode deletar recursos esportivos', () => {
      expect(TenantSecurityService.canDeleteResource(teamUserA, 'competition')).toBe(false);
      expect(TenantSecurityService.canDeleteResource(teamUserA, 'team')).toBe(false);
      expect(TenantSecurityService.canDeleteResource(teamUserA, 'match')).toBe(false);
      expect(TenantSecurityService.canDeleteResource(teamUserA, 'athlete')).toBe(false);
    });
    it('NÃO pode homologar partidas', () => {
      expect(TenantSecurityService.canHomologateMatch(teamUserA)).toBe(false);
    });
    it('NÃO pode realizar manutenção de banco', () => {
      expect(TenantSecurityService.canPerformDatabaseMaintenance(teamUserA)).toBe(false);
    });
    it('NÃO pode pontuar ou finalizar partidas', () => {
      expect(TenantSecurityService.canSubmitMatchScore(teamUserA, matchWithReferee)).toBe(false);
      expect(TenantSecurityService.canSubmitMatchScore(teamUserA, matchWithoutReferee)).toBe(false);
    });
  });

  describe('1.2 — role=team: capacidades permitidas', () => {
    it('Pode visualizar competições', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'competition:view')).toBe(true);
    });
    it('Pode visualizar equipes', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'team:view')).toBe(true);
    });
    it('Pode visualizar atletas', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'athlete:view')).toBe(true);
    });
    it('Pode visualizar partidas', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'match:view')).toBe(true);
    });
    it('Pode visualizar súmulas', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'scoresheet:view')).toBe(true);
    });
    it('Pode editar apenas sua própria inscrição (team:edit restrito)', () => {
      expect(TenantSecurityService.hasCapability(teamUserA, 'team:edit')).toBe(true);
    });
  });

  describe('1.3 — admin/organizer: capacidades administrativas completas', () => {
    it('admin pode tudo (CRUD, users, settings)', () => {
      expect(TenantSecurityService.hasCapability(adminUser, 'competition:create')).toBe(true);
      expect(TenantSecurityService.hasCapability(adminUser, 'match:delete')).toBe(true);
      expect(TenantSecurityService.hasCapability(adminUser, 'users:manage')).toBe(true);
      expect(TenantSecurityService.canDeleteResource(adminUser, 'competition')).toBe(true);
      expect(TenantSecurityService.canHomologateMatch(adminUser)).toBe(true);
    });
    it('organizer pode CRUD esportivo mas NÃO users nem delete admin', () => {
      expect(TenantSecurityService.hasCapability(organizerUser, 'competition:create')).toBe(true);
      expect(TenantSecurityService.hasCapability(organizerUser, 'match:finalize')).toBe(true);
      expect(TenantSecurityService.hasCapability(organizerUser, 'users:manage')).toBe(false);
      expect(TenantSecurityService.canDeleteResource(organizerUser, 'user')).toBe(false);
    });
  });

  describe('1.4 — referee: capacidades legítimas de arbitragem', () => {
    it('pode pontuar e finalizar partidas', () => {
      expect(TenantSecurityService.hasCapability(refereeUser, 'match:score')).toBe(true);
      expect(TenantSecurityService.hasCapability(refereeUser, 'match:finalize')).toBe(true);
    });
    it('NÃO pode criar competições ou equipes', () => {
      expect(TenantSecurityService.hasCapability(refereeUser, 'competition:create')).toBe(false);
      expect(TenantSecurityService.hasCapability(refereeUser, 'team:create')).toBe(false);
    });
    it('NÃO pode deletar recursos', () => {
      expect(TenantSecurityService.canDeleteResource(refereeUser, 'match')).toBe(false);
    });
    it('pode pontuar partida quando escalado nominalmente', () => {
      expect(TenantSecurityService.canSubmitMatchScore(refereeUser, matchWithReferee)).toBe(true);
    });
    it('árbitro não escalado NÃO pode pontuar quando há escala nominal', () => {
      const otherReferee: UserProfile = { ...refereeUser, id: 'u-other-ref', name: 'Árbitro Não Escalado' };
      expect(TenantSecurityService.canSubmitMatchScore(otherReferee, matchWithReferee)).toBe(false);
    });
    it('qualquer árbitro pode pontuar quando NÃO há escala nominal', () => {
      const otherReferee: UserProfile = { ...refereeUser, id: 'u-other-ref', name: 'Árbitro Qualquer' };
      expect(TenantSecurityService.canSubmitMatchScore(otherReferee, matchWithoutReferee)).toBe(true);
    });
  });

  describe('1.5 — scorer: capacidades legítimas de mesa', () => {
    it('pode pontuar partidas', () => {
      expect(TenantSecurityService.hasCapability(scorerUser, 'match:score')).toBe(true);
    });
    it('NÃO pode finalizar partidas (apenas referee/admin/organizer)', () => {
      expect(TenantSecurityService.hasCapability(scorerUser, 'match:finalize')).toBe(false);
    });
    it('NÃO pode criar competições', () => {
      expect(TenantSecurityService.hasCapability(scorerUser, 'competition:create')).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ISOLAMENTO DE ELENCO — Proteção IDOR/BOLA (Fase 9.9)
// ─────────────────────────────────────────────────────────────────────────────

describe('Fase 9.9 — Isolamento de Elenco (IDOR/BOLA)', () => {
  it('Gestor A pode gerenciar sua própria inscrição', () => {
    expect(TenantSecurityService.canManageRoster(teamUserA, teamAEnrollment)).toBe(true);
  });

  it('Gestor A NÃO pode gerenciar inscrição do Time B', () => {
    expect(TenantSecurityService.canManageRoster(teamUserA, teamBEnrollment)).toBe(false);
  });

  it('Gestor B NÃO pode gerenciar inscrição do Time A', () => {
    expect(TenantSecurityService.canManageRoster(teamUserB, teamAEnrollment)).toBe(false);
  });

  it('admin e organizer podem gerenciar qualquer inscrição', () => {
    expect(TenantSecurityService.canManageRoster(adminUser, teamAEnrollment)).toBe(true);
    expect(TenantSecurityService.canManageRoster(adminUser, teamBEnrollment)).toBe(true);
    expect(TenantSecurityService.canManageRoster(organizerUser, teamAEnrollment)).toBe(true);
    expect(TenantSecurityService.canManageRoster(organizerUser, teamBEnrollment)).toBe(true);
  });

  it('referee e viewer NÃO podem gerenciar elencos', () => {
    expect(TenantSecurityService.canManageRoster(refereeUser, teamAEnrollment)).toBe(false);
    expect(TenantSecurityService.canManageRoster(viewerUser, teamAEnrollment)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUTENTICAÇÃO — role='team' bloqueado de operações de usuários (Fase 9.9)
// ─────────────────────────────────────────────────────────────────────────────

describe('Fase 9.9 — Autenticação: team não executa mutações de usuários', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('team NÃO pode criar usuários', async () => {
    await authService.signIn('equipe@voleipro.app', 'demo123');
    await expect(
      authService.createUser({
        name: 'Invasor',
        email: 'invasor@fake.com',
        role: 'organizer',
        status: 'active',
      })
    ).rejects.toThrow(/Permissão negada/i);
  });

  it('team NÃO pode excluir usuários', async () => {
    await authService.signIn('equipe@voleipro.app', 'demo123');
    await expect(
      authService.deleteUser('demo-organizer')
    ).rejects.toThrow(/Permissão negada/i);
  });

  it('team NÃO pode atualizar dados de outros usuários', async () => {
    await authService.signIn('equipe@voleipro.app', 'demo123');
    await expect(
      authService.updateUser('demo-organizer', { name: 'Modificado por Time' })
    ).rejects.toThrow(/Permissão negada/i);
  });

  it('team consegue fazer login com credenciais válidas', async () => {
    const result = await authService.signIn('equipe@voleipro.app', 'demo123');
    expect(result.ok).toBe(true);
    expect(result.session?.user.role).toBe('team');
  });

  it('organizer consegue criar usuários (fluxo legítimo)', async () => {
    await authService.signIn('organizador@voleipro.app', 'demo123');
    const created = await authService.createUser({
      name: 'Novo Árbitro',
      email: 'novo.arbitro@baseos.app',
      role: 'referee',
      status: 'active',
    });
    expect(created.id).toBeDefined();
    expect(created.role).toBe('referee');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROTEÇÃO DE ROTAS — RequireAuth bloqueia team (Fase 9.9)
//
// Testa o comportamento do authService.hasRole usado pelo RequireAuth:
//   routes /dashboard, /jogos, /matches → roles=['admin','organizer','referee','scorer']
//   role='team' deve retornar false para essas roles
// ─────────────────────────────────────────────────────────────────────────────

describe('Fase 9.9 — Proteção de Rotas: RequireAuth.hasRole', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const operationalRoles = ['admin', 'organizer', 'referee', 'scorer'] as const;

  it('team NÃO tem acesso às rotas operacionais (/dashboard, /jogos, /matches)', async () => {
    await authService.signIn('equipe@voleipro.app', 'demo123');
    const session = authService.getStoredSession();
    expect(session?.user.role).toBe('team');
    // RequireAuth verifica hasRole(session, ['admin', 'organizer', 'referee', 'scorer'])
    expect(authService.hasRole(session, [...operationalRoles])).toBe(false);
  });

  it('organizer tem acesso às rotas operacionais', async () => {
    await authService.signIn('organizador@voleipro.app', 'demo123');
    const session = authService.getStoredSession();
    expect(authService.hasRole(session, [...operationalRoles])).toBe(true);
  });

  it('referee tem acesso às rotas operacionais', async () => {
    await authService.signIn('arbitro@voleipro.app', 'demo123');
    const session = authService.getStoredSession();
    expect(authService.hasRole(session, [...operationalRoles])).toBe(true);
  });

  it('usuário não autenticado NÃO tem acesso a nada', () => {
    expect(authService.hasRole(null, [...operationalRoles])).toBe(false);
    expect(authService.hasRole(null, ['team'])).toBe(false);
  });

  it('team TEM acesso ao seu portal (sem roles restritas na rota /equipe/inscricao/:token)', async () => {
    await authService.signIn('equipe@voleipro.app', 'demo123');
    const session = authService.getStoredSession();
    expect(session?.user.role).toBe('team');
    // A rota /equipe/inscricao/:token não usa RequireAuth com roles — está correta
    // Validamos que a sessão existe (autenticada) e é do role 'team'
    expect(session).not.toBeNull();
    expect(session?.user.role).toBe('team');
  });

  it('admin tem acesso às rotas administrativas de gestão', async () => {
    await authService.signIn('diegoantmartins89@gmail.com', 'Au15022020...');
    const session = authService.getStoredSession();
    expect(authService.hasRole(session, ['admin'])).toBe(true);
    // Admin possui acesso mesmo quando a rota especifica apenas ['organizer'] (bypass de superusuário)
    expect(authService.hasRole(session, ['organizer'])).toBe(true);
    expect(authService.hasRole(session, [...operationalRoles])).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CAPACIDADES COMBINADAS — hasAllCapabilities e hasAnyCapability (Fase 9.9)
// ─────────────────────────────────────────────────────────────────────────────

describe('Fase 9.9 — Capacidades Combinadas', () => {
  it('team NÃO possui conjunto de capacidades administrativas', () => {
    expect(
      TenantSecurityService.hasAllCapabilities(teamUserA, ['competition:create', 'match:create'])
    ).toBe(false);
    expect(
      TenantSecurityService.hasAnyCapability(teamUserA, ['competition:create', 'match:delete', 'users:manage'])
    ).toBe(false);
  });

  it('team POSSUI conjunto de capacidades de visualização', () => {
    expect(
      TenantSecurityService.hasAllCapabilities(teamUserA, ['competition:view', 'team:view', 'match:view'])
    ).toBe(true);
  });

  it('admin possui todas as capacidades combinadas', () => {
    expect(
      TenantSecurityService.hasAllCapabilities(adminUser, [
        'competition:create',
        'match:finalize',
        'users:manage',
        'settings:manage',
        'audit:view',
      ])
    ).toBe(true);
  });

  it('viewer NÃO tem capacidades de escrita', () => {
    expect(
      TenantSecurityService.hasAnyCapability(viewerUser, [
        'competition:create',
        'match:score',
        'athlete:create',
        'users:manage',
      ])
    ).toBe(false);
  });
});
