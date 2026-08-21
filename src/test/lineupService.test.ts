// Testes do Lineup Service — rotação regulamentar da ordem de saque.

import { describe, expect, it } from 'vitest';
import {
  createInitialLineup,
  isLineupComplete,
  rotateLineup,
} from '@/services/lineupService';

function lineup(ids: string[]) {
  return createInitialLineup(1, 'time', ids)!;
}

describe('rotateLineup', () => {
  it('rotaciona: quem está em I vai para VI e II passa a sacar', () => {
    const initial = lineup(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    const rotated = rotateLineup(initial);
    expect(rotated.positions).toEqual({
      I: 'p2',
      II: 'p3',
      III: 'p4',
      IV: 'p5',
      V: 'p6',
      VI: 'p1',
    });
  });

  it('mantém setNumber e teamId na rotação', () => {
    const rotated = rotateLineup(lineup(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']));
    expect(rotated.setNumber).toBe(1);
    expect(rotated.teamId).toBe('time');
  });

  it('rotação dupla preserva a ordem circular original', () => {
    const twice = rotateLineup(rotateLineup(lineup(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'])));
    expect(twice.positions).toEqual({
      I: 'p3',
      II: 'p4',
      III: 'p5',
      IV: 'p6',
      V: 'p1',
      VI: 'p2',
    });
  });

  it('seis rotações retornam à formação inicial', () => {
    const initial = lineup(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    let current = initial;
    for (let i = 0; i < 6; i++) current = rotateLineup(current);
    expect(current.positions).toEqual(initial.positions);
  });
});

describe('createInitialLineup', () => {
  it('cria escalação com 6 jogadores nas posições I..VI', () => {
    const l = createInitialLineup(3, 'timeA', ['a', 'b', 'c', 'd', 'e', 'f']);
    expect(l?.positions).toEqual({ I: 'a', II: 'b', III: 'c', IV: 'd', V: 'e', VI: 'f' });
    expect(l?.setNumber).toBe(3);
    expect(l?.servingPosition).toBe('I');
  });

  it('rejeita escalação com menos de 6 jogadores', () => {
    expect(createInitialLineup(1, 't', ['a', 'b', 'c'])).toBeUndefined();
  });
});

describe('isLineupComplete', () => {
  it('aceita escalação completa', () => {
    expect(isLineupComplete(lineup(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']))).toBe(true);
  });

  it('rejeita escalação incompleta ou com duplicidade', () => {
    expect(isLineupComplete(undefined)).toBe(false);
    const incomplete = lineup(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    (incomplete.positions as Record<string, string>).VI = '';
    expect(isLineupComplete(incomplete)).toBe(false);
    const dup = lineup(['p1', 'p1', 'p3', 'p4', 'p5', 'p6']);
    expect(isLineupComplete(dup)).toBe(false);
  });
});