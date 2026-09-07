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
      order() {
        return chain;
      },
      limit() {
        return chain;
      },
      delete() {
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
      rpc: async (fnName: string, args: Record<string, unknown>) => {
        if (fnName === 'save_stage_draw_and_slots') {
          return {
            data: {
              ok: true,
              stage_row_id: 'stage-rpc-1',
              rounds_count: Array.isArray(args.p_rounds) ? args.p_rounds.length : 0,
              slots_count: Array.isArray(args.p_slots) ? args.p_slots.length : 0,
            },
            error: null,
          };
        }
        if (fnName === 'rpc_propagate_slot_outcome') {
          return {
            data: {
              ok: true,
              source_slot_id: args.p_slot_id,
              idempotent: false,
              updated_count: 1,
            },
            error: null,
          };
        }
        return { data: null, error: new Error(`Unknown RPC ${fnName}`) };
      },
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
      competitionStages: 'competition_stages',
      competitionRounds: 'competition_rounds',
      competitionMatchSlots: 'competition_match_slots',
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

  it('createStage e listStages convertem snake_case e camelCase', async () => {
    state.rows.competition_stages = [
      { id: 'stage-1', competition_id: 'comp-1', stage_id: 'groups', name: 'Grupos', stage_order: 1, stage_type: 'groups', status: 'pending', is_locked: false },
    ];
    const stages = await dataAccess.listStages('comp-1');
    expect(stages[0].competitionId).toBe('comp-1');
    expect(stages[0].stageId).toBe('groups');
    expect(stages[0].stageOrder).toBe(1);
    expect(stages[0].isLocked).toBe(false);

    const created = await dataAccess.createStage({
      competitionId: 'comp-1',
      stageId: 'play-in',
      name: 'Play-In',
      stageOrder: 2,
      stageType: 'play-in',
      isLocked: false,
    });
    expect(created.stageId).toBe('play-in');
    expect(created.stageOrder).toBe(2);
  });

  it('createMatchSlot converte referências JSONB e campos para snake_case e camelCase', async () => {
    state.rows.competition_match_slots = [
      {
        id: 'slot-1',
        competition_id: 'comp-1',
        stage_row_id: 'stage-1',
        round_row_id: 'round-1',
        slot_id: 'SLOT-01',
        position: 1,
        participant_a_reference: { type: 'seed', seedNumber: 1 },
        participant_a_status: 'unresolved',
        resolved_team_a_id: null,
        participant_b_reference: { type: 'bye' },
        participant_b_status: 'bye',
        resolved_team_b_id: null,
        match_id: null,
      },
    ];

    const slots = await dataAccess.listMatchSlots('comp-1');
    expect(slots[0].competitionId).toBe('comp-1');
    expect(slots[0].slotId).toBe('SLOT-01');
    expect(slots[0].participantAReference).toEqual({ type: 'seed', seedNumber: 1 });
    expect(slots[0].participantBReference).toEqual({ type: 'bye' });
    expect(slots[0].resolvedTeamAId).toBeNull();
    expect(slots[0].matchId).toBeNull();

    const created = await dataAccess.createMatchSlot({
      competitionId: 'comp-1',
      stageRowId: 'stage-1',
      roundRowId: 'round-1',
      slotId: 'SLOT-02',
      position: 2,
      participantAReference: { type: 'match-winner', slotId: 'SLOT-01' },
      participantBReference: { type: 'seed', seedNumber: 2 },
    });
    expect(created.slotId).toBe('SLOT-02');
    expect(created.participantAStatus).toBe('unresolved');
    expect(created.resolvedTeamAId).toBeNull();
  });

  it('saveStageDrawAndSlots e propagateSlotOutcome executam via RPC no Supabase', async () => {
    const drawRes = await dataAccess.saveStageDrawAndSlots({
      competitionId: 'comp-1',
      stage: {
        stageId: 'playoffs',
        name: 'Playoffs Eliminatórios',
        stageOrder: 2,
        stageType: 'knockout',
      },
      rounds: [
        { roundId: 'semi', name: 'Semifinal', roundOrder: 1, slotsCount: 2 },
      ],
      slots: [
        {
          slotId: 'SLOT-SF-1',
          roundId: 'semi',
          position: 1,
          participantAReference: { type: 'seed', seedNumber: 1 },
          participantBReference: { type: 'seed', seedNumber: 4 },
        },
      ],
    });
    expect(drawRes.ok).toBe(true);
    expect(drawRes.stageRowId).toBe('stage-rpc-1');
    expect(drawRes.roundsCount).toBe(1);
    expect(drawRes.slotsCount).toBe(1);

    const propRes = await dataAccess.propagateSlotOutcome({
      competitionId: 'comp-1',
      slotId: 'SLOT-SF-1',
      winnerTeamId: 'team-1',
    });
    expect(propRes.ok).toBe(true);
    expect(propRes.sourceSlotId).toBe('SLOT-SF-1');
    expect(propRes.updatedCount).toBe(1);
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