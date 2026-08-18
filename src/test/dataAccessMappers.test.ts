// Testes do mapeamento de colunas do adaptador Supabase (camelCase ↔ snake_case).

import { describe, expect, it } from 'vitest';
import { toCamel, toSnake } from '@/services/dataAccess';

describe('toSnake', () => {
  it('converte camelCase para snake_case', () => {
    expect(toSnake({ competitionId: 'x', teamShortName: 'OSA', isCaptain: true, accessToken: 't' })).toEqual({
      competition_id: 'x',
      team_short_name: 'OSA',
      is_captain: true,
      access_token: 't',
    });
  });

  it('preserva chaves já em snake_case e valores aninhados', () => {
    const input = { jerseyNumber: undefined, status: 'in_progress', sets: [{ setNumber: 1, scoreA: 25 }] };
    const out = toSnake(input);
    expect(out).toEqual({
      jersey_number: undefined,
      status: 'in_progress',
      sets: [{ setNumber: 1, scoreA: 25 }],
    });
  });
});

describe('toCamel', () => {
  it('converte snake_case para camelCase', () => {
    expect(toCamel({ competition_id: 'x', team_short_name: 'MIN', registration_deadline: '2026-08-20T10:00:00Z' })).toEqual({
      competitionId: 'x',
      teamShortName: 'MIN',
      registrationDeadline: '2026-08-20T10:00:00Z',
    });
  });

  it('preserva colunas sem underscore', () => {
    expect(toCamel({ id: 'a', name: 'B' })).toEqual({ id: 'a', name: 'B' });
  });
});

describe('round-trip', () => {
  it('toCamel(toSnake(x)) == x para entidade plana', () => {
    const athlete = {
      id: 'ath-1',
      competitionTeamId: 'ct-1',
      name: 'Ana',
      jerseyNumber: 7,
      position: 'Central',
      documentNumber: undefined,
      birthDate: '2000-01-01',
      isCaptain: false,
      isLibero: true,
      gender: 'female',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(toCamel(toSnake(athlete))).toEqual(athlete);
  });
});
