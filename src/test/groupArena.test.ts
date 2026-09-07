/**
 * Testes: groupArena
 *
 * Valida a derivação de apresentação dos grupos e das cabeças de chave a partir
 * dos dados reais do motor (sem decisão de resultado).
 */

import { describe, it, expect } from 'vitest';
import { buildGroupArena, headSeedOrdinalOf } from '@/components/draw/cinematic/groupArena';
import type { DrawGroup } from '@/types/draw';
import type { DrawRevealEvent } from '@/components/draw/drawRevealSequence';

describe('buildGroupArena', () => {
  const groups: DrawGroup[] = [
    { name: 'Grupo A', teams: [{ teamId: 'a1', seed: 1 }, { teamId: 'a2', seed: 2 }] },
    { name: 'Grupo B', teams: [{ teamId: 'b1', seed: 1 }] },
  ];

  const revealSequence: DrawRevealEvent[] = [
    { teamId: 'a1', groupName: 'Grupo A', order: 0 },
    { teamId: 'a2', groupName: 'Grupo A', order: 1 },
  ];

  it('marca equipes reveladas pela sequência real (último grupo revelado é o ativo)', () => {
    const cards = buildGroupArena(groups, revealSequence);
    const groupA = cards.find(c => c.name === 'Grupo A')!;
    expect(groupA.revealedCount).toBe(2);
    // A última revelação da sequência é do Grupo A → é o grupo ativo.
    expect(groupA.status).toBe('active');
    expect(groupA.teams.find(t => t.teamId === 'a1')?.revealed).toBe(true);
  });

  it('não marca equipes fora da sequência como reveladas', () => {
    const cards = buildGroupArena(groups, revealSequence);
    const groupB = cards.find(c => c.name === 'Grupo B')!;
    expect(groupB.revealedCount).toBe(0);
    expect(groupB.teams.find(t => t.teamId === 'b1')?.revealed).toBe(false);
  });

  it('marca o grupo ativo quando informado', () => {
    const cards = buildGroupArena(groups, revealSequence, 'Grupo B');
    const groupB = cards.find(c => c.name === 'Grupo B')!;
    expect(groupB.isCurrentGroup).toBe(true);
    expect(groupB.status).toBe('active');
  });

  it('inicia com 0 equipes reveladas em todos os grupos quando sequência estiver vazia', () => {
    const cards = buildGroupArena(groups, []);
    expect(cards[0].revealedCount).toBe(0);
    expect(cards[1].revealedCount).toBe(0);
    expect(cards.every(c => c.status === 'pending')).toBe(true);
    expect(cards[0].teams.every(t => !t.revealed)).toBe(true);
  });
});

describe('calculateProgress', () => {
  it('retorna 0 / N antes do início do sorteio (índice -1)', async () => {
    const { calculateProgress } = await import('@/types/drawCinematic');
    expect(calculateProgress(-1, 8)).toEqual({ progress: 0, count: '0 / 8' });
  });

  it('retorna 1 / N após a primeira equipe ser revelada (índice 0)', async () => {
    const { calculateProgress } = await import('@/types/drawCinematic');
    expect(calculateProgress(0, 8)).toEqual({ progress: 0.125, count: '1 / 8' });
  });

  it('retorna N / N no encerramento de todas as revelações', async () => {
    const { calculateProgress } = await import('@/types/drawCinematic');
    expect(calculateProgress(7, 8)).toEqual({ progress: 1, count: '8 / 8' });
  });
});

describe('headSeedOrdinalOf', () => {
  it('retorna 1..N para cabeças de chave no modo seeded', () => {
    expect(headSeedOrdinalOf('team-1', 'seeded', ['team-1', 'team-2'])).toBe(1);
    expect(headSeedOrdinalOf('team-2', 'seeded', ['team-1', 'team-2'])).toBe(2);
  });

  it('retorna undefined para equipe que não é cabeça de chave', () => {
    expect(headSeedOrdinalOf('team-3', 'seeded', ['team-1', 'team-2'])).toBeUndefined();
  });

  it('retorna undefined no modo random (cabeças ignoradas pelo motor)', () => {
    expect(headSeedOrdinalOf('team-1', 'random', ['team-1', 'team-2'])).toBeUndefined();
  });

  it('retorna undefined quando não há cabeças de chave', () => {
    expect(headSeedOrdinalOf('team-1', 'seeded', [])).toBeUndefined();
  });
});
