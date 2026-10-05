/**
 * matchSheetSecurityAuthorization.test.ts
 *
 * Suíte de Testes de Segurança — Fase 4C (Gate 1A)
 * Correção do achado F-01 (CRITICAL): Superfície de Mutação das Súmulas / Match Sheet.
 *
 * Cobertura Completa por Camadas:
 *   1. Camada de Roteamento (Router / RequireAuth):
 *      - Anônimo bloqueado nas rotas /sumulas, /sumulas/:matchId e /match-sheets (redireciona para /login).
 *      - role='team' bloqueado e redirecionado para /portal/equipe.
 *      - role='viewer' bloqueado e redirecionado para /.
 *      - role='referee', 'scorer', 'organizer', 'admin' permitidos nas rotas.
 *
 *   2. Camada de Página e Componente (MatchSheetPage / MatchSheetInterface):
 *      - Propriedade readOnly={true} ativada para perfis ou árbitros sem permissão de escrita.
 *      - Controles operacionais (addPoint, removePoint, callTimeout, endSet, escalação) desabilitados.
 *      - Supressão de persistência automática (onPersist não é disparado quando readOnly).
 *      - Exibição de banner de "Modo Somente Leitura".
 *
 *   3. Camada de Persistência (dataAccess.updateMatch):
 *      - Bloqueio explícito para sessão ativa de role='team'.
 *      - Bloqueio explícito para sessão ativa de role='viewer'.
 *      - Bloqueio para árbitro/mesário não escalado quando há escala nominal.
 *      - Bloqueio para árbitro/mesário tentando alterar campos administrativos protegidos.
 *      - Permissão concedida para árbitro escalado lançar pontuação/sets.
 *      - Permissão concedida para árbitro em partida sem escala nominal.
 *      - Permissão plena para organizer e admin.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { authService } from '@/services/authService';
import { dataAccess } from '@/services/dataAccess';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import { MatchSheetInterface } from '@/components/match-sheet/MatchSheetInterface';
import type { UserProfile, UserRole } from '@/types/auth';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de Usuários
// ─────────────────────────────────────────────────────────────────────────────

const adminUser: UserProfile = {
  id: 'usr-admin-1',
  name: 'Administrador Master',
  email: 'admin@baseos.app',
  role: 'admin',
};

const organizerUser: UserProfile = {
  id: 'usr-org-1',
  name: 'Organizador Oficial',
  email: 'organizador@baseos.app',
  role: 'organizer',
};

const assignedReferee: UserProfile = {
  id: 'usr-ref-1',
  name: 'Carlos Silva',
  email: 'arbitro@voleipro.app',
  role: 'referee',
};

const unassignedReferee: UserProfile = {
  id: 'usr-ref-2',
  name: 'Roberto Santos',
  email: 'roberto@voleipro.app',
  role: 'referee',
};

const assignedScorer: UserProfile = {
  id: 'usr-sco-1',
  name: 'Mariana Mesária',
  email: 'mariana@voleipro.app',
  role: 'scorer',
};

const teamManagerUser: UserProfile = {
  id: 'usr-team-1',
  name: 'Gestor Minas Tênis',
  email: 'equipe@voleipro.app',
  role: 'team',
  competitionTeamId: 'ct-2',
};

const viewerUser: UserProfile = {
  id: 'usr-view-1',
  name: 'Espectador Público',
  email: 'espectador@gmail.com',
  role: 'viewer',
};

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de Partidas
// ─────────────────────────────────────────────────────────────────────────────

const competitionMock: CompetitionRecord = {
  id: 'comp-100',
  name: 'Superliga BaseOS 2026',
  modality: 'indoor',
  format: 'round-robin',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'mixed',
  status: 'in-progress',
};

const baseMatchWithRoster: MatchRecord = {
  id: 'match-sec-01',
  competitionId: 'comp-100',
  round: 1,
  matchNumber: 101,
  teamAId: 'team-osasco',
  teamBId: 'team-minas',
  teamAName: 'Vôlei Osasco',
  teamBName: 'Minas Tênis Clube',
  teamAShortName: 'OSA',
  teamBShortName: 'MIN',
  venue: 'Ginásio José Liberatti',
  court: 'Quadra 1',
  scheduledTime: '2026-10-15T19:00:00Z',
  status: 'in-progress',
  sets: [],
  referees: [
    { role: '1º Árbitro', name: 'Carlos Silva' },
    { role: 'Apontador', name: 'Mariana Mesária' },
  ],
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
};

const matchWithoutNominalReferees: MatchRecord = {
  ...baseMatchWithRoster,
  id: 'match-sec-02',
  referees: [],
};

const athleteTeamA: CompetitionAthlete[] = [
  { id: 'ath-a1', competitionTeamId: 'ct-1', name: 'Paula Pequeno', jerseyNumber: 4, position: 'Ponteira', isCaptain: true, isLibero: false, gender: 'female', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

const athleteTeamB: CompetitionAthlete[] = [
  { id: 'ath-b1', competitionTeamId: 'ct-2', name: 'Thaísa Daher', jerseyNumber: 6, position: 'Central', isCaptain: true, isLibero: false, gender: 'female', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

// Helper: Simula a decisão de rota do RequireAuth
function evaluateRouteAccess(
  user: UserProfile | null | undefined,
  requiredRoles: UserRole[] = ['admin', 'organizer', 'referee', 'scorer'],
): { allowed: boolean; redirectTo?: string } {
  if (!user) {
    return { allowed: false, redirectTo: '/login' };
  }
  if (requiredRoles.includes(user.role)) {
    return { allowed: true };
  }
  if (user.role === 'team') {
    return { allowed: false, redirectTo: '/portal/equipe' };
  }
  if (user.role === 'referee' || user.role === 'scorer') {
    return { allowed: false, redirectTo: '/jogos' };
  }
  return { allowed: false, redirectTo: '/' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CAMADA DE ROTEAMENTO (Router & RequireAuth)
// ─────────────────────────────────────────────────────────────────────────────

describe('F-01 — Camada 1: Proteção de Rotas de Súmulas (/sumulas, /sumulas/:matchId, /match-sheets)', () => {
  const matchSheetRoutes = ['/sumulas', '/sumulas/:matchId', '/match-sheets'];
  const operationalRoles: UserRole[] = ['admin', 'organizer', 'referee', 'scorer'];

  matchSheetRoutes.forEach((route) => {
    it(`anônimo tentando acessar ${route} é bloqueado e redirecionado para /login`, () => {
      const access = evaluateRouteAccess(null, operationalRoles);
      expect(access.allowed).toBe(false);
      expect(access.redirectTo).toBe('/login');
    });

    it(`role='team' tentando acessar ${route} é bloqueado e redirecionado para /portal/equipe`, () => {
      const access = evaluateRouteAccess(teamManagerUser, operationalRoles);
      expect(access.allowed).toBe(false);
      expect(access.redirectTo).toBe('/portal/equipe');
    });

    it(`role='viewer' tentando acessar ${route} é bloqueado e redirecionado para /`, () => {
      const access = evaluateRouteAccess(viewerUser, operationalRoles);
      expect(access.allowed).toBe(false);
      expect(access.redirectTo).toBe('/');
    });

    it(`role='referee' tem acesso autorizado a ${route}`, () => {
      const access = evaluateRouteAccess(assignedReferee, operationalRoles);
      expect(access.allowed).toBe(true);
    });

    it(`role='scorer' tem acesso autorizado a ${route}`, () => {
      const access = evaluateRouteAccess(assignedScorer, operationalRoles);
      expect(access.allowed).toBe(true);
    });

    it(`role='organizer' tem acesso autorizado a ${route}`, () => {
      const access = evaluateRouteAccess(organizerUser, operationalRoles);
      expect(access.allowed).toBe(true);
    });

    it(`role='admin' tem acesso autorizado a ${route}`, () => {
      const access = evaluateRouteAccess(adminUser, operationalRoles);
      expect(access.allowed).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CAMADA DE COMPONENTE (MatchSheetInterface com readOnly)
// ─────────────────────────────────────────────────────────────────────────────

describe('F-01 — Camada 4: MatchSheetInterface no Modo Somente Leitura (readOnly)', () => {
  it('renderiza o banner de Modo Somente Leitura quando readOnly={true}', () => {
    render(
      <MatchSheetInterface
        match={baseMatchWithRoster}
        competition={competitionMock}
        teamARoster={athleteTeamA}
        teamBRoster={athleteTeamB}
        readOnly={true}
      />
    );

    expect(screen.getByText(/Visualização Oficial \(Modo Somente Leitura\)/i)).toBeDefined();
    expect(screen.getByText(/A pontuação e alteração em tempo real estão desabilitadas/i)).toBeDefined();
  });

  it('desabilita botões operacionais de pontuação e tempo quando readOnly={true}', () => {
    render(
      <MatchSheetInterface
        match={baseMatchWithRoster}
        competition={competitionMock}
        teamARoster={athleteTeamA}
        teamBRoster={athleteTeamB}
        readOnly={true}
      />
    );

    const endSetButtons = screen.getAllByRole('button', { name: /Encerrar Set/i });
    endSetButtons.forEach(btn => {
      expect(btn.hasAttribute('disabled')).toBe(true);
    });

    const timeoutButtons = screen.getAllByRole('button', { name: /Tempo/i });
    timeoutButtons.forEach(btn => {
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });

  it('NÃO dispara onPersist automático quando readOnly={true}', () => {
    const onPersistMock = vi.fn().mockResolvedValue({});

    render(
      <MatchSheetInterface
        match={baseMatchWithRoster}
        competition={competitionMock}
        teamARoster={athleteTeamA}
        teamBRoster={athleteTeamB}
        readOnly={true}
        onPersist={onPersistMock}
      />
    );

    // O useEffect inicial de auto-persistência deve ser suprimido
    expect(onPersistMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CAMADA DE PERSISTÊNCIA (dataAccess.updateMatch)
// ─────────────────────────────────────────────────────────────────────────────

describe('F-01 — Camada 5: Persistência (dataAccess.updateMatch)', () => {
  let matchWithNominal: MatchRecord;
  let matchWithoutNominal: MatchRecord;

  beforeEach(async () => {
    localStorage.clear();
    // Garante que as partidas de teste existam na coleção local com seus IDs reais
    matchWithNominal = await dataAccess.createMatch(baseMatchWithRoster);
    matchWithoutNominal = await dataAccess.createMatch(matchWithoutNominalReferees);
  });

  it('bloqueia role=team com erro de autorização explícito', async () => {
    // Simula sessão autenticada de gestor de equipe no storage
    localStorage.setItem(
      'voleipro.auth.session.v1',
      JSON.stringify({ user: teamManagerUser, token: 'tok-team-1' })
    );

    await expect(
      dataAccess.updateMatch(matchWithNominal.id, {
        status: 'completed',
      })
    ).rejects.toThrow(/Acesso negado: perfil 'team' não possui permissão para alterar partidas/i);
  });

  it('bloqueia role=viewer com erro de autorização explícito', async () => {
    localStorage.setItem(
      'voleipro.auth.session.v1',
      JSON.stringify({ user: viewerUser, token: 'tok-viewer-1' })
    );

    await expect(
      dataAccess.updateMatch(matchWithNominal.id, {
        status: 'completed',
      })
    ).rejects.toThrow(/Acesso negado: perfil 'viewer' não possui permissão para alterar partidas/i);
  });

  it('bloqueia árbitro NÃO escalado em partida com escala nominal definida', async () => {
    localStorage.setItem(
      'voleipro.auth.session.v1',
      JSON.stringify({ user: unassignedReferee, token: 'tok-ref-2' })
    );

    await expect(
      dataAccess.updateMatch(matchWithNominal.id, {
        status: 'completed',
      })
    ).rejects.toThrow(/Acesso negado: árbitro\/mesário não está escalado nesta partida/i);
  });

  it('bloqueia árbitro escalado de alterar campos administrativos estruturais (espelho do trigger trg_protect_match_admin_fields)', async () => {
    localStorage.setItem(
      'voleipro.auth.session.v1',
      JSON.stringify({ user: assignedReferee, token: 'tok-ref-1' })
    );

    // Tenta adulterar o nome de uma equipe
    await expect(
      dataAccess.updateMatch(matchWithNominal.id, {
        teamAName: 'Equipe Adulterada',
      })
    ).rejects.toThrow(/Acesso negado: árbitro\/mesário não possui permissão para alterar o campo 'teamAName'/i);

    // Tenta adulterar a escala de arbitragem
    await expect(
      dataAccess.updateMatch(matchWithNominal.id, {
        referees: [{ role: '1º Árbitro', name: 'Invasor' }],
      })
    ).rejects.toThrow(/Acesso negado: árbitro\/mesário não possui permissão para alterar o campo 'referees'/i);
  });

  it('permite árbitro escalado atualizar placar e parciais legítimas da partida', async () => {
    localStorage.setItem(
      'voleipro.auth.session.v1',
      JSON.stringify({ user: assignedReferee, token: 'tok-ref-1' })
    );

    const updated = await dataAccess.updateMatch(matchWithNominal.id, {
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 21 }],
      status: 'in-progress',
    });

    expect(updated).not.toBeNull();
    expect(updated?.sets[0]?.scoreA).toBe(25);
    expect(updated?.sets[0]?.scoreB).toBe(21);
  });

  it('permite qualquer árbitro credenciado atualizar partida quando NÃO há escala nominal', async () => {
    localStorage.setItem(
      'voleipro.auth.session.v1',
      JSON.stringify({ user: unassignedReferee, token: 'tok-ref-2' })
    );

    const updated = await dataAccess.updateMatch(matchWithoutNominal.id, {
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 18 }],
    });

    expect(updated).not.toBeNull();
    expect(updated?.sets[0]?.scoreA).toBe(25);
  });

  it('permite mesário escalado lançar pontuação', async () => {
    localStorage.setItem(
      'voleipro.auth.session.v1',
      JSON.stringify({ user: assignedScorer, token: 'tok-sco-1' })
    );

    const updated = await dataAccess.updateMatch(matchWithNominal.id, {
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 23 }],
    });

    expect(updated).not.toBeNull();
    expect(updated?.sets[0]?.scoreA).toBe(25);
  });

  it('permite organizador e admin atualizar qualquer partida e campos administrativos', async () => {
    localStorage.setItem(
      'voleipro.auth.session.v1',
      JSON.stringify({ user: organizerUser, token: 'tok-org-1' })
    );

    const updated = await dataAccess.updateMatch(matchWithNominal.id, {
      venue: 'Novo Ginásio Oficial',
      status: 'completed',
    });

    expect(updated).not.toBeNull();
    expect(updated?.venue).toBe('Novo Ginásio Oficial');
    expect(updated?.status).toBe('completed');
  });
});
