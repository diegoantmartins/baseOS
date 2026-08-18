// Testes do adaptador Supabase e do authService em modo Supabase (client mockado).

import { describe, expect, it, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => {
  const rows: Record<string, unknown> = {};
  let anonUser: unknown = null;
  return {
    rows,
    getAnon: () => anonUser,
    setAnon: (v: unknown) => {
      anonUser = v;
    },
  };
});

vi.mock('@/lib/supabaseClient', () => {
  function qb(table: string) {
    const chain: Record<string, unknown> = {
      select() {
        return chain;
      },
      eq() {
        return chain;
      },
      then(resolve: (value: unknown) => void) {
        resolve({ data: state.rows[table] ?? null });
      },
      async maybeSingle() {
        return { data: (state.rows[table] ?? null) as unknown };
      },
      async single() {
        const value = state.rows[table];
        return { data: Array.isArray(value) ? (value[0] ?? null) : (value ?? null) };
      },
      insert(payload: Record<string, unknown>) {
        state.rows[table] = { ...payload, id: `${table}-novo` };
        return chain;
      },
      update(payload: Record<string, unknown>) {
        const current = (state.rows[table] ?? {}) as Record<string, unknown>;
        state.rows[table] = { ...current, ...payload };
        return chain;
      },
    };
    return chain;
  }

  return {
    isSupabaseConfigured: () => true,
    getSupabaseClient: async () => ({
      from: (table: string) => qb(table),
      auth: {
        signInWithPassword: async () => ({
          data: { user: { id: 'u-1', email: 'novo@teste.app' }, session: null },
          error: null,
        }),
        getSession: async () => ({ data: { session: state.getAnon() } }),
      },
    }),
    SUPABASE_TABLES: {
      competitions: 'competitions',
      teams: 'teams',
      referees: 'referees',
      matches: 'matches',
      competitionTeams: 'competition_teams',
      competitionAthletes: 'competition_athletes',
    } as const,
  };
});

import { dataAccess } from '@/services/dataAccess';
import { authService, clearAuthSession } from '@/services/authService';

beforeEach(() => {
  for (const key of Object.keys(state.rows)) delete state.rows[key];
  state.setAnon(null);
  clearAuthSession();
});

describe('adaptador Supabase', () => {
  it('createMatch converte a linha devolvida para camelCase', async () => {
    const created = await dataAccess.createMatch({
      competitionId: 'comp-1',
      round: 1,
      matchNumber: 10,
      teamAId: 'ct-1',
      teamBId: 'ct-2',
      teamAName: 'Osasco',
      teamBName: 'Minas',
      teamAShortName: 'OSA',
      teamBShortName: 'MIN',
      venue: 'Ginásio A',
      scheduledTime: '2026-08-20T10:00:00Z',
      status: 'scheduled',
      sets: [],
      referees: [],
    });
    expect(created.teamAId).toBe('ct-1');
    expect(created.scheduledTime).toBe('2026-08-20T10:00:00Z');
    expect(created.id).toBe('matches-novo');
  });

  it('listMatches mapeia colunas snake_case para camelCase', async () => {
    state.rows.matches = [
      { id: 'm-1', competition_id: 'comp-1', team_a_id: 'ct-1', team_b_id: 'ct-2', scheduled_time: '2026-08-20T10:00:00Z', winner_id: null, sets: [], referees: [] },
    ];
    const matches = await dataAccess.listMatches('comp-1');
    expect(matches[0].competitionId).toBe('comp-1');
    expect(matches[0].teamBId).toBe('ct-2');
    expect(matches[0].scheduledTime).toBe('2026-08-20T10:00:00Z');
  });

  it('updateCompetitionTeam converte a linha devolvida', async () => {
    state.rows.competition_teams = { id: 'ct-1', competition_id: 'comp-1', team_id: 'team-1', access_token: 'tok', status: 'in_progress' };
    const updated = await dataAccess.updateCompetitionTeam('ct-1', { isLocked: true });
    expect(updated?.competitionId).toBe('comp-1');
    expect(updated?.status).toBe('in_progress');
    expect(updated?.isLocked).toBe(true);
  });
});

describe('authService (modo Supabase)', () => {
  it('getSession não reutiliza sessão local quando o servidor não tem sessão', async () => {
    localStorage.setItem('voleipro.auth.session.v1', JSON.stringify({ user: { id: 'u-1', email: 'x@y.z', name: 'X', role: 'organizer' } }));
    const session = await authService.getSession();
    expect(session).toBeNull();
  });

  it('signIn sem perfil usa papel conservador (team)', async () => {
    const result = await authService.signIn('novo@teste.app', 'senha');
    expect(result.ok).toBe(true);
    expect(result.session?.user.role).toBe('team');
  });
});