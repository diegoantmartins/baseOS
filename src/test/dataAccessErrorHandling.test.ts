/**
 * DataAccess Error Handling & Legacy API Protection Test Suite — BaseOS Fase 8.3
 * 
 * Valida:
 * 1. assertSupabaseSuccess e assertSupabaseUpdateSuccess geram erros informativos com detalhes e códigos PostgREST.
 * 2. APIs legadas (createPerson, updatePerson, deletePerson) falham explicitamente e impedem uso silencioso.
 */

import { describe, expect, it } from 'vitest';
import {
  dataAccess,
  assertSupabaseSuccess,
  assertSupabaseUpdateSuccess,
} from '@/services/dataAccess';

describe('Tratamento Informativo de Erros Supabase / PostgREST (Fase 8.3)', () => {
  it('assertSupabaseSuccess devolve o dado quando a resposta é bem-sucedida', () => {
    const mockData = { id: 'comp-1', name: 'Superliga' };
    const result = assertSupabaseSuccess(
      mockData,
      null,
      { operation: 'createCompetition', table: 'competitions' },
    );
    expect(result).toEqual(mockData);
  });

  it('assertSupabaseSuccess lança erro com mensagem, código e detalhes do PostgREST', () => {
    const postgrestError = {
      message: 'column "groups_count" does not exist in relation "competitions"',
      code: 'PGRST204',
      details: 'Schema cache reload may be required',
      hint: 'Ensure columns match database schema',
    };

    expect(() =>
      assertSupabaseSuccess(
        null,
        postgrestError,
        { operation: 'createCompetition', table: 'competitions' },
      ),
    ).toThrowError(/PGRST204/);

    try {
      assertSupabaseSuccess(
        null,
        postgrestError,
        { operation: 'createCompetition', table: 'competitions' },
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      expect(msg).toContain('PGRST204');
      expect(msg).toContain('column "groups_count" does not exist');
      expect(msg).toContain('Schema cache reload may be required');
    }
  });

  it('assertSupabaseUpdateSuccess falha se houver erro retornado pelo Supabase', () => {
    const postgrestError = {
      message: 'permission denied for table competition_teams',
      code: '42501',
      details: 'RLS policy violation',
    };

    expect(() =>
      assertSupabaseUpdateSuccess(
        null,
        postgrestError,
        { operation: 'updateCompetitionTeam', table: 'competition_teams' },
      ),
    ).toThrowError(/42501/);
  });

  it('assertSupabaseSuccess trata e propaga erro 23502 (NOT NULL violation)', () => {
    const error = {
      code: '23502',
      message: 'null value in column "name" of relation "competitions" violates not-null constraint',
      details: 'Failing row contains (comp-1, null, ...)',
    };
    expect(() =>
      assertSupabaseSuccess(null, error, { operation: 'createCompetition', table: 'competitions' }),
    ).toThrowError(/\[23502\].*violates not-null constraint/);
  });

  it('assertSupabaseSuccess trata e propaga erro 23505 (unique violation)', () => {
    const error = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "uq_competition_teams_team"',
      details: 'Key (competition_id, team_id)=(comp-1, team-1) already exists.',
    };
    expect(() =>
      assertSupabaseSuccess(null, error, { operation: 'createCompetitionTeam', table: 'competition_teams' }),
    ).toThrowError(/\[23505\].*duplicate key value/);
  });

  it('assertSupabaseSuccess trata e propaga erro 22P02 (invalid enum input)', () => {
    const error = {
      code: '22P02',
      message: 'invalid input value for enum competition_status: "invalid-status"',
      hint: 'Valid values are draft, planning, registration-open, etc.',
    };
    expect(() =>
      assertSupabaseSuccess(null, error, { operation: 'updateCompetition', table: 'competitions' }),
    ).toThrowError(/\[22P02\].*invalid input value for enum/);
  });

  it('assertSupabaseSuccess trata e propaga erro 42703 (undefined column)', () => {
    const error = {
      code: '42703',
      message: 'column "groups_count" of relation "competitions" does not exist',
    };
    expect(() =>
      assertSupabaseSuccess(null, error, { operation: 'createCompetition', table: 'competitions' }),
    ).toThrowError(/\[42703\].*does not exist/);
  });

  it('assertSupabaseSuccess trata e propaga erro PGRST205 (table not found)', () => {
    const error = {
      code: 'PGRST205',
      message: 'relation "public.persons" does not exist',
      details: 'Table was not found in schema cache',
    };
    expect(() =>
      assertSupabaseSuccess(null, error, { operation: 'createPerson', table: 'persons' }),
    ).toThrowError(/\[PGRST205\].*does not exist/);
  });
});

describe('Proteção contra APIs Legadas (Fase 8.3 - createPerson)', () => {
  it('createPerson falha explicitamente informando a descontinuação e modelo correto de autenticação', async () => {
    await expect(
      dataAccess.createPerson({
        fullName: 'Atleta Invalido',
        roles: ['athlete'],
      }),
    ).rejects.toThrowError(/A API "createPerson" é legada e foi descontinuada na Fase 8.3/);
  });

  it('updatePerson falha explicitamente', async () => {
    await expect(
      dataAccess.updatePerson('person-1', {
        fullName: 'Novo Nome',
      }),
    ).rejects.toThrowError(/A API "updatePerson" é legada e foi descontinua/);
  });

  it('deletePerson falha explicitamente', async () => {
    await expect(dataAccess.deletePerson('person-1')).rejects.toThrowError(
      /A API "deletePerson" é legada e foi descontinua/,
    );
  });
});
