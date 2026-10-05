// =====================================================================
// BaseOS - Validação das Correções Geométricas e Ergonômicas P0
// =====================================================================

import { describe, it, expect } from 'vitest';
import {
  THREE_SET_A4_LAYOUT,
  FIVE_SET_A4_LAYOUT,
  SPLIT_VIEW_FIVE_SET_A4_LAYOUT,
  FIVE_SET_A4_LAYOUT_LEGACY,
  FIVE_SET_A3_MASTER_LAYOUT,
  validateScoresheetLayout,
  flattenLayoutRects,
} from '@/document-engine/baseos';
import { right, bottom } from '@/document-engine/baseos/geometry/rect';

describe('BaseOS Document Engine — Correções Geométricas P0', () => {
  describe('P0.1 — Geometria Forense Canônica da súmula de 3 sets', () => {
    it('valida as dimensões canônicas dos sets, roster e blocos inferiores', () => {
      const cards = THREE_SET_A4_LAYOUT.cards;

      // Sets 1 e 2 em linhas horizontais generosas (494x122 pt)
      expect(cards.sets[1]!.width).toBe(494);
      expect(cards.sets[1]!.height).toBe(122);
      expect(cards.sets[2]!.width).toBe(494);
      expect(cards.sets[2]!.height).toBe(122);

      // Set 3 estendido sob o elenco para preservar proporção do tie-break (645x122 pt)
      expect(cards.sets[3]!.width).toBe(645);
      expect(cards.sets[3]!.height).toBe(122);

      // Roster em 2 colunas ao lado dos Sets 1 e 2 (323.89x248 pt)
      expect(cards.rosters.width).toBeCloseTo(323.89, 2);
      expect(cards.rosters.height).toBe(248);

      // Bloco de assinaturas de capitães/técnicos ao lado do Set 3 (172.89x122 pt)
      expect(cards.remarks!.width).toBeCloseTo(172.89, 2);
      expect(cards.remarks!.height).toBe(122);

      // Blocos inferiores: Sanções (175x141 pt), Assinaturas/Obs (390x141 pt), Resultado (248.89x141 pt)
      expect(cards.sanctions.width).toBe(175);
      expect(cards.sanctions.height).toBe(141);
      expect(cards.signatures.width).toBe(390);
      expect(cards.signatures.height).toBe(141);
      expect(cards.result.width).toBeCloseTo(248.89, 2);
      expect(cards.result.height).toBe(141);
    });

    it('mantém relações geométricas exatas da referência comercial', () => {
      const cards = THREE_SET_A4_LAYOUT.cards;

      // Sets 1 & 2 + Roster = 494 + 4 + 323.89 = 821.89
      const topWidth = cards.sets[1]!.width + 4 + cards.rosters.width;
      expect(topWidth).toBeCloseTo(821.89, 2);

      // Set 3 + Assinaturas = 645 + 4 + 172.89 = 821.89
      const set3RowWidth = cards.sets[3]!.width + 4 + cards.remarks!.width;
      expect(set3RowWidth).toBeCloseTo(821.89, 2);

      // 175 + 4 + 390 + 4 + 248.89 = 821.89 (área útil horizontal dos blocos inferiores)
      const bottomWidth = cards.sanctions.width + 4 + cards.signatures.width + 4 + cards.result.width;
      expect(bottomWidth).toBeCloseTo(821.89, 2);

      // Altura dos Sets 1 e 2 com espaçamento = 122 + 4 + 122 = 248pt (igual ao Roster)
      const sets12Height = cards.sets[1]!.height * 2 + 4;
      expect(sets12Height).toBe(cards.rosters.height);
    });

    it('validação geométrica de 3 sets é estritamente válida e sem erros', () => {
      const result = validateScoresheetLayout(THREE_SET_A4_LAYOUT);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('P0.2 — Geometria Oficial da súmula de 5 sets', () => {
    it('valida proporções do modelo histórico preservado (FIVE_SET_A4_LAYOUT_LEGACY)', () => {
      const cards = FIVE_SET_A4_LAYOUT_LEGACY.cards;

      // Sets 1 a 4 com largura de 408.89 e 409 pt
      expect(cards.sets[1]!.width).toBeCloseTo(408.89, 2);
      expect(cards.sets[2]!.width).toBe(409);
      expect(cards.sets[3]!.width).toBeCloseTo(408.89, 2);
      expect(cards.sets[4]!.width).toBe(409);

      // Set 5 tie-break com 508 pt e Rosters vertical contínuo com 309.89 x 275 pt
      expect(cards.sets[5]!.width).toBe(508);
      expect(cards.rosters.width).toBeCloseTo(309.89, 2);
      expect(cards.sets[5]!.height).toBe(126);
      expect(cards.rosters.height).toBe(275);

      // Relações horizontais somam 821.89pt
      expect(cards.sets[1]!.width + 4 + cards.sets[2]!.width).toBeCloseTo(821.89, 2);
      expect(cards.sets[5]!.width + 4 + cards.rosters.width).toBeCloseTo(821.89, 2);
      expect(cards.sanctions.width + 4 + cards.signatures.width + 4 + cards.result.width + 4 + cards.rosters.width).toBeCloseTo(821.89, 2);

      // Validação sem colisão do modelo legado
      const result = validateScoresheetLayout(FIVE_SET_A4_LAYOUT_LEGACY);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('valida proporções canônicas de 5 sets no Split-View preservado', () => {
      const cards = SPLIT_VIEW_FIVE_SET_A4_LAYOUT.cards;

      // Coluna Esquerda: Sets 1 a 5 com largura uniforme de 498 pt
      expect(cards.sets[1]!.width).toBe(498);
      expect(cards.sets[2]!.width).toBe(498);
      expect(cards.sets[3]!.width).toBe(498);
      expect(cards.sets[4]!.width).toBe(498);
      expect(cards.sets[5]!.width).toBe(498);

      // Alturas dos sets: 85pt uniformes nos sets 1-5
      expect(cards.sets[1]!.height).toBe(85);
      expect(cards.sets[5]!.height).toBe(85);

      // Coluna Direita: Rosters contínuo de 539 pt ocupando altura total útil pós-cabeçalho
      expect(cards.rosters.x).toBe(513.89);
      expect(cards.rosters.y).toBe(46);
      expect(cards.rosters.width).toBeCloseTo(318, 2);
      expect(cards.rosters.height).toBe(539);

      // Relação horizontal coluna esquerda (498) + gap (5.89) + coluna direita (318) = 821.89 pt
      expect(cards.sets[1]!.width + 5.89 + cards.rosters.width).toBeCloseTo(821.89, 2);

      // Rodapé no quadrante esquerdo (105 + 4 + 110 + 4 + 120 + 4 + 151 = 498 pt)
      const footerWidth = cards.sanctions.width + 4 + cards.remarks!.width + 4 + cards.result.width + 4 + cards.signatures.width;
      expect(footerWidth).toBe(498);
    });

    it('valida proporções da Grade 2x2 + Base (Força Bruta para os Sets - Oficial v4)', () => {
      const cards = FIVE_SET_A4_LAYOUT.cards;

      // Grade 2x2: Sets 1 a 4 com 120 pt de altura e larguras 409 / 408.89 pt
      expect(cards.sets[1]!.width).toBe(409);
      expect(cards.sets[1]!.height).toBe(120);
      expect(cards.sets[2]!.width).toBeCloseTo(408.89, 2);
      expect(cards.sets[2]!.height).toBe(120);
      expect(cards.sets[3]!.width).toBe(409);
      expect(cards.sets[3]!.height).toBe(120);
      expect(cards.sets[4]!.width).toBeCloseTo(408.89, 2);
      expect(cards.sets[4]!.height).toBe(120);

      // Base: Set 5 com 508 x 126 pt (Tie-break largo)
      expect(cards.sets[5]!.width).toBe(508);
      expect(cards.sets[5]!.height).toBe(126);

      // Roster compactado no quadrante inferior direito (309.89 x 289 pt)
      expect(cards.rosters.x).toBe(522);
      expect(cards.rosters.y).toBe(296);
      expect(cards.rosters.width).toBeCloseTo(309.89, 2);
      expect(cards.rosters.height).toBe(289);

      // Rodapé sob o Set 5: Sanções (105) + Assinaturas/Obs (254) + Resultado (141) = 508 pt
      expect(cards.signatures.x).toBe(119);
      expect(cards.signatures.width).toBe(254);
      expect(cards.remarks).toBeUndefined();
      const footerWidth = cards.sanctions.width + 4 + cards.signatures.width + 4 + cards.result.width;
      expect(footerWidth).toBe(508);

      // Relações horizontais somam 821.89 pt
      expect(cards.sets[1]!.width + 4 + cards.sets[2]!.width).toBeCloseTo(821.89, 2);
      expect(cards.sets[3]!.width + 4 + cards.sets[4]!.width).toBeCloseTo(821.89, 2);
      expect(cards.sets[5]!.width + 4 + cards.rosters.width).toBeCloseTo(821.89, 2);
    });

    it('mantém alinhamento inferior perfeito em y=585 sem colisão', () => {
      const cards = FIVE_SET_A4_LAYOUT.cards;

      expect(bottom(cards.result)).toBe(585);
      expect(bottom(cards.signatures)).toBe(585);
      expect(bottom(cards.sanctions)).toBe(585);
      expect(bottom(cards.rosters)).toBe(585);
    });

    it('validação geométrica de 5 sets é estritamente válida e sem erros', () => {
      const result = validateScoresheetLayout(FIVE_SET_A4_LAYOUT);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('P0.3 — Contenção dentro da página A4 Paisagem (Zero Overflow)', () => {
    it('garante que nenhum card ultrapassa limites de folha em 3 sets', () => {
      const rects = flattenLayoutRects(THREE_SET_A4_LAYOUT);
      const page = THREE_SET_A4_LAYOUT.page;

      for (const { id, rect } of rects) {
        expect(rect.x, `${id} x fora da margem esquerda`).toBeGreaterThanOrEqual(page.margin);
        expect(rect.y, `${id} y fora da margem superior`).toBeGreaterThanOrEqual(page.margin);
        expect(right(rect), `${id} excede largura da página`).toBeLessThanOrEqual(page.width - page.margin);
        expect(bottom(rect), `${id} excede altura da página`).toBeLessThanOrEqual(page.height - page.margin);
      }
    });

    it('garante que nenhum card ultrapassa limites de folha em 5 sets', () => {
      const rects = flattenLayoutRects(FIVE_SET_A4_LAYOUT);
      const page = FIVE_SET_A4_LAYOUT.page;

      for (const { id, rect } of rects) {
        expect(rect.x, `${id} x fora da margem esquerda`).toBeGreaterThanOrEqual(page.margin);
        expect(rect.y, `${id} y fora da margem superior`).toBeGreaterThanOrEqual(page.margin);
        expect(right(rect), `${id} excede largura da página`).toBeLessThanOrEqual(page.width - page.margin);
        expect(bottom(rect), `${id} excede altura da página`).toBeLessThanOrEqual(page.height - page.margin);
      }
    });
  });
});
