import { describe, expect, it } from 'vitest';
import { sortScheduleMatches } from '@/services/scheduleService';
import type { MatchRecord } from '@/types/entities';

function createDummyMatch(partial: Partial<MatchRecord>): MatchRecord {
  return {
    id: partial.id ?? 'm-default',
    competitionId: partial.competitionId ?? 'comp-1',
    round: partial.round ?? 1,
    matchNumber: partial.matchNumber ?? 1,
    teamAId: partial.teamAId ?? 'team-a',
    teamBId: partial.teamBId ?? 'team-b',
    teamAName: partial.teamAName ?? 'Time A',
    teamBName: partial.teamBName ?? 'Time B',
    teamAShortName: partial.teamAShortName ?? 'TMA',
    teamBShortName: partial.teamBShortName ?? 'TMB',
    venue: partial.venue ?? 'Ginásio Principal',
    court: partial.court ?? 'Quadra 1',
    scheduledTime: partial.scheduledTime ?? '2026-09-22T10:00:00Z',
    status: partial.status ?? 'scheduled',
    sets: partial.sets ?? [],
    referees: partial.referees ?? [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...partial,
  };
}

describe('sortScheduleMatches (Schedule Engine Canônico)', () => {
  it('ordena primariamente por rodada (round ASC)', () => {
    const m1 = createDummyMatch({ id: 'm1', round: 2, scheduledTime: '2026-09-22T08:00:00Z', matchNumber: 1 });
    const m2 = createDummyMatch({ id: 'm2', round: 1, scheduledTime: '2026-09-22T14:00:00Z', matchNumber: 2 });
    const sorted = sortScheduleMatches([m1, m2]);
    expect(sorted.map(m => m.id)).toEqual(['m2', 'm1']);
  });

  it('ordena secundariamente por horário agendado (scheduledTime ASC)', () => {
    const m1 = createDummyMatch({ id: 'm1', round: 1, scheduledTime: '2026-09-22T14:00:00Z', matchNumber: 1 });
    const m2 = createDummyMatch({ id: 'm2', round: 1, scheduledTime: '2026-09-22T09:00:00Z', matchNumber: 2 });
    const sorted = sortScheduleMatches([m1, m2]);
    expect(sorted.map(m => m.id)).toEqual(['m2', 'm1']);
  });

  it('ordena terciariamente por quadra com ordenação natural alfanumérica (Quadra 2 antes de Quadra 10)', () => {
    const m1 = createDummyMatch({ id: 'm1', round: 1, scheduledTime: '2026-09-22T10:00:00Z', court: 'Quadra 10', matchNumber: 1 });
    const m2 = createDummyMatch({ id: 'm2', round: 1, scheduledTime: '2026-09-22T10:00:00Z', court: 'Quadra 2', matchNumber: 2 });
    const m3 = createDummyMatch({ id: 'm3', round: 1, scheduledTime: '2026-09-22T10:00:00Z', court: 'Quadra 1', matchNumber: 3 });
    const sorted = sortScheduleMatches([m1, m2, m3]);
    expect(sorted.map(m => m.id)).toEqual(['m3', 'm2', 'm1']);
  });

  it('aloca partidas com quadra preenchida antes de partidas com quadra vazia ou nula no mesmo horário', () => {
    const m1 = createDummyMatch({ id: 'm1', round: 1, scheduledTime: '2026-09-22T10:00:00Z', court: undefined, matchNumber: 1 });
    const m2 = createDummyMatch({ id: 'm2', round: 1, scheduledTime: '2026-09-22T10:00:00Z', court: 'Quadra 1', matchNumber: 2 });
    const sorted = sortScheduleMatches([m1, m2]);
    expect(sorted.map(m => m.id)).toEqual(['m2', 'm1']);
  });

  it('ordena quaternariamente por matchNumber ASC para desempate final determinístico', () => {
    const m1 = createDummyMatch({ id: 'm1', round: 1, scheduledTime: '2026-09-22T10:00:00Z', court: 'Quadra 1', matchNumber: 15 });
    const m2 = createDummyMatch({ id: 'm2', round: 1, scheduledTime: '2026-09-22T10:00:00Z', court: 'Quadra 1', matchNumber: 3 });
    const sorted = sortScheduleMatches([m1, m2]);
    expect(sorted.map(m => m.id)).toEqual(['m2', 'm1']);
  });

  it('posiciona partidas sem horário (null, vazio ou inválido) no fim da respectiva rodada', () => {
    const m1 = createDummyMatch({ id: 'm1', round: 1, scheduledTime: '', matchNumber: 1 });
    const m2 = createDummyMatch({ id: 'm2', round: 1, scheduledTime: '2026-09-22T08:00:00Z', matchNumber: 2 });
    const m3 = createDummyMatch({ id: 'm3', round: 1, scheduledTime: 'data-invalida', matchNumber: 3 });
    const sorted = sortScheduleMatches([m1, m2, m3]);
    expect(sorted[0].id).toBe('m2');
    expect(sorted.slice(1).map(m => m.id)).toContain('m1');
    expect(sorted.slice(1).map(m => m.id)).toContain('m3');
  });

  it('trata round ausente com fallback para round 1', () => {
    const m1 = createDummyMatch({ id: 'm1', round: undefined, scheduledTime: '2026-09-22T10:00:00Z', matchNumber: 2 });
    const m2 = createDummyMatch({ id: 'm2', round: 2, scheduledTime: '2026-09-22T10:00:00Z', matchNumber: 1 });
    const sorted = sortScheduleMatches([m2, m1]);
    expect(sorted.map(m => m.id)).toEqual(['m1', 'm2']);
  });

  it('é uma função pura e NÃO muta o array original recebido', () => {
    const m1 = createDummyMatch({ id: 'm1', round: 2, matchNumber: 10 });
    const m2 = createDummyMatch({ id: 'm2', round: 1, matchNumber: 5 });
    const original = [m1, m2];
    const originalCopy = [...original];

    const sorted = sortScheduleMatches(original);

    expect(sorted).not.toBe(original);
    expect(original).toEqual(originalCopy);
    expect(original[0].id).toBe('m1');
    expect(sorted[0].id).toBe('m2');
  });

  it('preserva os matchNumbers oficiais originais de cada partida sem renumerá-los', () => {
    const m1 = createDummyMatch({ id: 'm1', round: 1, matchNumber: 99, scheduledTime: '2026-09-22T08:00:00Z' });
    const m2 = createDummyMatch({ id: 'm2', round: 1, matchNumber: 1, scheduledTime: '2026-09-22T12:00:00Z' });

    const sorted = sortScheduleMatches([m2, m1]);

    expect(sorted[0].id).toBe('m1');
    expect(sorted[0].matchNumber).toBe(99);
    expect(sorted[1].id).toBe('m2');
    expect(sorted[1].matchNumber).toBe(1);
  });
});
