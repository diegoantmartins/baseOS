// =====================================================================
// BaseOS Document Engine - Testes de Integridade da Fase Súmula 3
// Validação Cirúrgica dos 8 Itens de Refinamento Visual
// =====================================================================

import { describe, expect, it } from 'vitest';
import React from 'react';
import { BaseosPointGrid } from '@/document-engine/baseos/components/BaseosPointGrid';
import { BaseosSignatures } from '@/document-engine/baseos/components/BaseosSignatures';
import { BaseosSanctions } from '@/document-engine/baseos/components/BaseosSanctions';
import { BaseosRosters } from '@/document-engine/baseos/components/BaseosRosters';
import { BaseosHeader } from '@/document-engine/baseos/components/BaseosHeader';
import { BASEOS_TOKENS } from '@/document-engine/baseos/theme/tokens';
import {
  THREE_SET_A4_LAYOUT,
  FIVE_SET_A4_LAYOUT,
  flattenLayoutRects,
  validateScoresheetLayout,
} from '@/document-engine/baseos';
import type { BaseosTeamData } from '@/document-engine/baseos/types/team';
import type { BaseosOfficialsData } from '@/document-engine/baseos/types/officials';
import type { BaseosCompetitionData, BaseosMatchInfo } from '@/document-engine/baseos/types/competition';

interface RenderedNode {
  props: {
    style?: Record<string, unknown> | Array<Record<string, unknown>>;
    children?: unknown;
    [key: string]: unknown;
  };
}

function asNode(element: unknown): RenderedNode {
  return element as unknown as RenderedNode;
}

function getChildren(node: RenderedNode): RenderedNode[] {
  const ch = node.props.children;
  if (Array.isArray(ch)) {
    return ch as RenderedNode[];
  }
  return ch ? [ch as RenderedNode] : [];
}

function getFlatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style);
  }
  if (style && typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return {};
}

describe('Fase Súmula 3 — Refinamentos Visuais e Integridade Canônica', () => {
  // -------------------------------------------------------------------
  // ITEM 1: Truncamento PON-... em BaseosPointGrid
  // -------------------------------------------------------------------
  describe('Item 1 — BaseosPointGrid (PONTOS e coluna única no Set 5)', () => {
    it('renderiza coluna única com largura 16pt, fonte 3.4pt e padding 0 para maxPoints=8', () => {
      const rendered = asNode(BaseosPointGrid({ pointGrid: { points: [], currentScore: 0 }, maxPoints: 8 }));
      expect(rendered).toBeDefined();

      const flatContainer = getFlatStyle(rendered.props.style);
      expect(flatContainer.width).toBe(16);

      const children = getChildren(rendered);
      const headerView = children[0];
      const flatHeaderView = getFlatStyle(headerView.props.style);
      expect(flatHeaderView.paddingHorizontal).toBe(0);

      const headerText = asNode(headerView.props.children);
      expect(headerText.props.children).toBe('PONTOS');
      expect(headerText.props.children).not.toContain('PON-');

      const flatHeaderText = getFlatStyle(headerText.props.style);
      expect(flatHeaderText.fontSize).toBe(3.4);
    });

    it('renderiza 3 colunas padrão para maxPoints=16 e maxPoints=32 com PONTOS legível', () => {
      const rendered16 = asNode(BaseosPointGrid({ pointGrid: { points: [], currentScore: 0 }, maxPoints: 16 }));
      const headerView16 = getChildren(rendered16)[0];
      const headerText16 = asNode(headerView16.props.children);
      expect(headerText16.props.children).toBe('PONTOS');
      expect(headerText16.props.children).not.toContain('PON-');

      const rendered32 = asNode(BaseosPointGrid({ pointGrid: { points: [], currentScore: 0 }, maxPoints: 32 }));
      const headerView32 = getChildren(rendered32)[0];
      const headerText32 = asNode(headerView32.props.children);
      expect(headerText32.props.children).toBe('PONTOS');
      expect(headerText32.props.children).not.toContain('PON-');
    });
  });

  // -------------------------------------------------------------------
  // ITEM 2 & 4: Assinaturas sem duplicidade e com altura flexível
  // -------------------------------------------------------------------
  describe('Itens 2 e 4 — BaseosSignatures (Capitães e layout flexível)', () => {
    const dummyOfficials: BaseosOfficialsData = {
      referee1: 'Árbitro Principal',
      referee2: 'Segundo Árbitro',
      scorer: 'Apontador Oficial',
      assistantScorer: 'Apontador Assistente',
      lineJudge1: 'Juiz 1',
      lineJudge2: 'Juiz 2',
    };

    it('não contém texto duplicado "CapitãoCapitão" nem "Capitães" redundante', () => {
      const rendered = asNode(BaseosSignatures({ officials: dummyOfficials, signatures: {}, height: 90 }));
      expect(rendered).toBeDefined();

      const jsonString = JSON.stringify(rendered);
      expect(jsonString).not.toContain('CapitãoCapitão');
      expect(jsonString).not.toContain('CapitãesCapitães');

      expect(jsonString).toContain('Capitão (A)');
      expect(jsonString).toContain('Capitão (B)');
    });

    it('utiliza captainLine com largura ampliada para preenchimento manual (72pt)', () => {
      const rendered = asNode(BaseosSignatures({ officials: dummyOfficials, signatures: {}, height: 107 }));
      const children = getChildren(rendered);
      const captainsFooter = children[2];
      const captainAView = getChildren(captainsFooter)[0];
      const lineA = getChildren(captainAView)[1];

      const flatLine = getFlatStyle(lineA.props.style);
      // Largura anterior era 56pt; com a Proposta A expande para 72pt (+28.6% de espaço de rubrica)
      expect(flatLine.width).toBeGreaterThanOrEqual(56);
      expect(flatLine.width).toBe(72);
    });

    it('utiliza officialsGrid com flex: 1 para adaptar alturas entre 89pt e 110pt', () => {
      const rendered = asNode(BaseosSignatures({ officials: dummyOfficials, signatures: {}, height: 90 }));
      const children = getChildren(rendered);
      const officialsGrid = children[1];
      const flatGrid = getFlatStyle(officialsGrid.props.style);
      expect(flatGrid.flex).toBe(1);
    });
  });

  // -------------------------------------------------------------------
  // ITEM 3: Rodapé e Geometria dos Cards
  // -------------------------------------------------------------------
  describe('Item 3 — Geometria e Rodapé', () => {
    it('cards inferiores de 3 sets respeitam a margem inferior de 20pt', () => {
      const signaturesBase = THREE_SET_A4_LAYOUT.cards.signatures.y + THREE_SET_A4_LAYOUT.cards.signatures.height;
      const resultBase = THREE_SET_A4_LAYOUT.cards.result.y + THREE_SET_A4_LAYOUT.cards.result.height;
      const rostersBase = THREE_SET_A4_LAYOUT.cards.rosters.y + THREE_SET_A4_LAYOUT.cards.rosters.height;
      const set3Base = THREE_SET_A4_LAYOUT.cards.sets[3]!.y + THREE_SET_A4_LAYOUT.cards.sets[3]!.height;

      expect(signaturesBase).toBe(575);
      expect(resultBase).toBe(575);
      expect(rostersBase).toBe(304);
      expect(set3Base).toBe(430);
      expect(THREE_SET_A4_LAYOUT.page.height - signaturesBase).toBeGreaterThanOrEqual(20);
    });

    it('cards inferiores de 5 sets terminam em y=585 com margem de segurança >= 10pt', () => {
      const resultBase = FIVE_SET_A4_LAYOUT.cards.result.y + FIVE_SET_A4_LAYOUT.cards.result.height;
      const signaturesBase = FIVE_SET_A4_LAYOUT.cards.signatures.y + FIVE_SET_A4_LAYOUT.cards.signatures.height;
      const sanctionsBase = FIVE_SET_A4_LAYOUT.cards.sanctions.y + FIVE_SET_A4_LAYOUT.cards.sanctions.height;
      const rostersBase = FIVE_SET_A4_LAYOUT.cards.rosters.y + FIVE_SET_A4_LAYOUT.cards.rosters.height;
      const set5Base = FIVE_SET_A4_LAYOUT.cards.sets[5]!.y + FIVE_SET_A4_LAYOUT.cards.sets[5]!.height;

      expect(resultBase).toBe(585);
      expect(signaturesBase).toBe(585);
      expect(sanctionsBase).toBe(585);
      expect(rostersBase).toBe(585);
      expect(set5Base).toBe(422);
      expect(FIVE_SET_A4_LAYOUT.page.height - signaturesBase).toBeGreaterThanOrEqual(10);
    });
  });

  // -------------------------------------------------------------------
  // ITEM 5: Sanções (footerNote flex: 1, fontes 3.4pt)
  // -------------------------------------------------------------------
  describe('Item 5 — BaseosSanctions (Legibilidade e adaptação de altura)', () => {
    it('utiliza flex: 1 em footerNote e fonte 3.4pt em footerNoteText e colSubText', () => {
      const rendered = asNode(BaseosSanctions({ sanctions: [], height: 92 }));
      expect(rendered).toBeDefined();

      const children = getChildren(rendered);
      const rowHeader = children[1];
      const colA = getChildren(rowHeader)[0];
      const subTextA = getChildren(colA)[1];
      const flatSubText = getFlatStyle(subTextA.props.style);
      expect(flatSubText.fontSize).toBe(3.4);

      const footerNote = children[4];
      const flatFooterNote = getFlatStyle(footerNote.props.style);
      expect(flatFooterNote.flex).toBe(1);

      const footerNoteText = asNode(footerNote.props.children);
      const flatFooterText = getFlatStyle(footerNoteText.props.style);
      expect(flatFooterText.fontSize).toBe(3.4);
    });
  });

  // -------------------------------------------------------------------
  // ITEM 6: Círculos de Equipe A/B visíveis no cabeçalho preto do Roster
  // -------------------------------------------------------------------
  describe('Item 6 — BaseosRosters (Círculos A/B com borda branca)', () => {
    const dummyTeamA: BaseosTeamData = {
      id: 'team-a',
      name: 'Equipe Alfa',
      shortName: 'ALF',
      athletes: [],
      liberos: [],
      staff: [],
    };
    const dummyTeamB: BaseosTeamData = {
      id: 'team-b',
      name: 'Equipe Beta',
      shortName: 'BET',
      athletes: [],
      liberos: [],
      staff: [],
    };

    it('utiliza borderColor branco para os círculos A/B e preenche a equipe correspondente', () => {
      const rendered = asNode(BaseosRosters({ teamA: dummyTeamA, teamB: dummyTeamB, height: 309 }));
      expect(rendered).toBeDefined();

      const children = getChildren(rendered);
      const columnsWrapper = children[1];
      const columnA = getChildren(columnsWrapper)[0];
      const subHeaderA = getChildren(columnA)[0];
      const nameHeaderA = getChildren(subHeaderA)[1];
      const nameHeaderAChildren = getChildren(nameHeaderA);

      const circleA = nameHeaderAChildren[1];
      const circleB = nameHeaderAChildren[3];

      const flatCircleA = getFlatStyle(circleA.props.style);
      const flatCircleB = getFlatStyle(circleB.props.style);

      expect(flatCircleA.borderColor).toBe(BASEOS_TOKENS.colors.WHITE);
      expect(flatCircleB.borderColor).toBe(BASEOS_TOKENS.colors.WHITE);

      expect(flatCircleA.backgroundColor).toBe(BASEOS_TOKENS.colors.WHITE);
      expect(flatCircleB.backgroundColor).toBe('transparent');

      const columnB = getChildren(columnsWrapper)[1];
      const subHeaderB = getChildren(columnB)[0];
      const nameHeaderB = getChildren(subHeaderB)[1];
      const nameHeaderBChildren = getChildren(nameHeaderB);

      const circleA_in_B = nameHeaderBChildren[1];
      const circleB_in_B = nameHeaderBChildren[3];

      const flatCircleA_in_B = getFlatStyle(circleA_in_B.props.style);
      const flatCircleB_in_B = getFlatStyle(circleB_in_B.props.style);

      expect(flatCircleA_in_B.backgroundColor).toBe('transparent');
      expect(flatCircleB_in_B.backgroundColor).toBe(BASEOS_TOKENS.colors.WHITE);
    });
  });

  // -------------------------------------------------------------------
  // ITEM 7: BaseosHeader adaptável a cards de 34pt e 42pt
  // -------------------------------------------------------------------
  describe('Item 7 — BaseosHeader (Responsividade por altura de card)', () => {
    const dummyComp: BaseosCompetitionData = {
      name: 'Copa Regional',
      location: 'Arena Central',
      date: '2026-10-15',
      phase: 'Final',
      round: 1,
      court: '1',
      city: 'Belo Horizonte',
    };
    const dummyMatch: BaseosMatchInfo = {
      id: 'm-1',
      number: 1,
      category: 'Adulto',
      gender: 'male',
      scheduledTime: '19:00',
    };

    it('utiliza height: 100% no container e não possui marginBottom hardcoded', () => {
      const rendered = asNode(
        BaseosHeader({
          competition: dummyComp,
          match: dummyMatch,
          teamAName: 'Time A',
          teamBName: 'Time B',
        }),
      );

      const flatContainer = getFlatStyle(rendered.props.style);
      expect(flatContainer.height).toBe('100%');
      expect(flatContainer.marginBottom).toBeUndefined();

      const children = getChildren(rendered);
      const topRow = children[0];
      const metaBar = children[1];

      const flatTopRow = getFlatStyle(topRow.props.style);
      const flatMetaBar = getFlatStyle(metaBar.props.style);

      expect(flatTopRow.flex).toBe(1.4);
      expect(flatMetaBar.flex).toBe(1);
    });
  });

  // -------------------------------------------------------------------
  // ITEM 8: remarks incluído no validador geométrico
  // -------------------------------------------------------------------
  describe('Item 8 — Validação Geométrica Completa com remarks', () => {
    it('inclui validação geométrica completa para 3 e 5 sets sem sobreposições', () => {
      const rects3 = flattenLayoutRects(THREE_SET_A4_LAYOUT);
      expect(rects3.some(r => r.id === 'remarks')).toBe(true);

      const val3 = validateScoresheetLayout(THREE_SET_A4_LAYOUT);
      expect(val3.valid).toBe(true);
      expect(val3.errors).toEqual([]);

      const val5 = validateScoresheetLayout(FIVE_SET_A4_LAYOUT);
      expect(val5.valid).toBe(true);
      expect(val5.errors).toEqual([]);
    });
  });
});
