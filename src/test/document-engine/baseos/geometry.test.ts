import { describe, expect, it } from 'vitest';
import {
  FIVE_SET_A3_MASTER_LAYOUT,
  FIVE_SET_A4_LAYOUT,
  THREE_SET_A4_LAYOUT,
  getScoresheetLayout,
  validateScoresheetLayout,
} from '@/document-engine/baseos';

describe('BaseOS Document Engine - geometria fixa da súmula', () => {
  it('mantém a súmula de 3 sets em uma página A4 paisagem sem overflow', () => {
    const result = validateScoresheetLayout(THREE_SET_A4_LAYOUT);

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(THREE_SET_A4_LAYOUT.page.name).toBe('A4');
    expect(THREE_SET_A4_LAYOUT.page.width).toBeCloseTo(841.89, 2);
    expect(THREE_SET_A4_LAYOUT.page.height).toBeCloseTo(595.28, 2);
  });

  it('mantém a súmula de 5 sets em uma página A4 paisagem sem overflow', () => {
    const result = validateScoresheetLayout(FIVE_SET_A4_LAYOUT);

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(FIVE_SET_A4_LAYOUT.page.name).toBe('A4');
    expect(FIVE_SET_A4_LAYOUT.cards.sets[5]).toBeDefined();
  });

  it('oferece master A3 para 5 sets preservando a mesma geometria proporcional', () => {
    const result = validateScoresheetLayout(FIVE_SET_A3_MASTER_LAYOUT);
    const set1A4 = FIVE_SET_A4_LAYOUT.cards.sets[1]!;
    const set1A3 = FIVE_SET_A3_MASTER_LAYOUT.cards.sets[1]!;
    const scale = FIVE_SET_A3_MASTER_LAYOUT.page.width / FIVE_SET_A4_LAYOUT.page.width;

    expect(result.valid).toBe(true);
    expect(FIVE_SET_A3_MASTER_LAYOUT.page.name).toBe('A3');
    expect(set1A3.width).toBeCloseTo(set1A4.width * scale, 2);
    expect(set1A3.height).toBeCloseTo(set1A4.height * scale, 2);
  });

  it('seleciona A4 por padrão e A3 somente quando solicitado como master de 5 sets', () => {
    expect(getScoresheetLayout('3-sets').page.name).toBe('A4');
    expect(getScoresheetLayout('5-sets').page.name).toBe('A4');
    expect(getScoresheetLayout('5-sets', 'master').page.name).toBe('A3');
  });
});
