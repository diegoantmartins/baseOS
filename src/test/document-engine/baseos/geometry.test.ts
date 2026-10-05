import { describe, expect, it } from 'vitest';
import {
  FIVE_SET_A3_MASTER_LAYOUT,
  FIVE_SET_A4_LAYOUT,
  THREE_SET_A4_LAYOUT,
  flattenLayoutRects,
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

  it('inclui remarks no flattenLayoutRects para 5 sets e valida contra sobreposições', () => {
    const layout3 = THREE_SET_A4_LAYOUT;
    const layout5 = FIVE_SET_A4_LAYOUT;

    const rects3 = flattenLayoutRects(layout3);
    const remarks3 = rects3.find(r => r.id === 'remarks');
    expect(remarks3).toBeDefined();
    expect(remarks3?.rect).toEqual(layout3.cards.remarks);

    const rects5 = flattenLayoutRects(layout5);
    const rosters5 = rects5.find(r => r.id === 'rosters');
    expect(rosters5).toBeDefined();
    expect(rosters5?.rect).toEqual(layout5.cards.rosters);

    // Valida que sobreposição em 3 sets é detectada se houver colisão
    const mutatedLayout = {
      ...layout3,
      cards: {
        ...layout3.cards,
        result: { ...layout3.cards.sanctions }, // colide diretamente com sanctions
      },
    };
    const invalidResult = validateScoresheetLayout(mutatedLayout);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.some(e => e.includes('result sobrepõe') || e.includes('sobrepõe result'))).toBe(true);
  });

  it('garante alinhamento inferior dos cards para respeitar o rodapé em bottom 3.5', () => {
    // 3 sets: cards inferiores terminam em y=575 (folha = 595.28, margem = 20pt)
    const base3Signatures = THREE_SET_A4_LAYOUT.cards.signatures.y + THREE_SET_A4_LAYOUT.cards.signatures.height;
    const base3Result = THREE_SET_A4_LAYOUT.cards.result.y + THREE_SET_A4_LAYOUT.cards.result.height;
    const base3Sanctions = THREE_SET_A4_LAYOUT.cards.sanctions.y + THREE_SET_A4_LAYOUT.cards.sanctions.height;
    const base3Rosters = THREE_SET_A4_LAYOUT.cards.rosters.y + THREE_SET_A4_LAYOUT.cards.rosters.height;

    const base3Set3 = THREE_SET_A4_LAYOUT.cards.sets[3]!.y + THREE_SET_A4_LAYOUT.cards.sets[3]!.height;
    const base3Remarks = THREE_SET_A4_LAYOUT.cards.remarks!.y + THREE_SET_A4_LAYOUT.cards.remarks!.height;

    expect(base3Signatures).toBeCloseTo(575, 1);
    expect(base3Result).toBeCloseTo(575, 1);
    expect(base3Sanctions).toBeCloseTo(575, 1);
    expect(base3Rosters).toBeCloseTo(304, 1);
    expect(base3Set3).toBeCloseTo(430, 1);
    expect(base3Remarks).toBeCloseTo(430, 1);
    expect(THREE_SET_A4_LAYOUT.page.height - base3Signatures).toBeGreaterThanOrEqual(20);

    // 5 sets: cards inferiores terminam em y=585 (folha = 595.28, margem >= 10pt)
    const base5Result = FIVE_SET_A4_LAYOUT.cards.result.y + FIVE_SET_A4_LAYOUT.cards.result.height;
    const base5Signatures = FIVE_SET_A4_LAYOUT.cards.signatures.y + FIVE_SET_A4_LAYOUT.cards.signatures.height;
    const base5Sanctions = FIVE_SET_A4_LAYOUT.cards.sanctions.y + FIVE_SET_A4_LAYOUT.cards.sanctions.height;
    const base5Rosters = FIVE_SET_A4_LAYOUT.cards.rosters.y + FIVE_SET_A4_LAYOUT.cards.rosters.height;
    const base5Set5 = FIVE_SET_A4_LAYOUT.cards.sets[5]!.y + FIVE_SET_A4_LAYOUT.cards.sets[5]!.height;

    expect(base5Result).toBeCloseTo(585, 1);
    expect(base5Signatures).toBeCloseTo(585, 1);
    expect(base5Sanctions).toBeCloseTo(585, 1);
    expect(base5Rosters).toBeCloseTo(585, 1);
    expect(base5Set5).toBeCloseTo(422, 1);
    expect(FIVE_SET_A4_LAYOUT.page.height - base5Signatures).toBeGreaterThanOrEqual(10);
  });
});
