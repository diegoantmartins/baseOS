// =====================================================================
// BaseOS Geometry - Layouts Oficiais de Súmula por Cards Fixos
// =====================================================================

import type { ScoresheetFormat, ScoresheetOutput } from '../types/scoresheet';
import type { PageRect, Rect } from './rect';
import { scaleRect } from './rect';

export interface ScoresheetCardLayout {
  header: Rect;
  sets: Record<1 | 2 | 3 | 4 | 5, Rect | undefined>;
  rosters: Rect;
  sanctions: Rect;
  signatures: Rect;
  result: Rect;
  remarks?: Rect;
}

export interface ScoresheetLayout {
  id: string;
  format: ScoresheetFormat;
  output: ScoresheetOutput;
  page: PageRect;
  cards: ScoresheetCardLayout;
}

export const A4_LANDSCAPE_PAGE: PageRect = {
  name: 'A4',
  orientation: 'landscape',
  width: 841.89,
  height: 595.28,
  margin: 6,
};

export const A3_LANDSCAPE_PAGE: PageRect = {
  name: 'A3',
  orientation: 'landscape',
  width: 1190.55,
  height: 841.89,
  margin: 8.48,
};

export const A3_FROM_A4_SCALE = A3_LANDSCAPE_PAGE.width / A4_LANDSCAPE_PAGE.width;

export const THREE_SET_A4_LAYOUT: ScoresheetLayout = {
  id: 'baseos-three-set-a4-print-v1',
  format: '3-sets',
  output: 'print-a4',
  page: A4_LANDSCAPE_PAGE,
  cards: {
    header: { x: 6, y: 6, width: 829.89, height: 42 },
    sets: {
      1: { x: 6, y: 51, width: 520, height: 138 },
      2: { x: 6, y: 192, width: 520, height: 138 },
      3: { x: 6, y: 333, width: 520, height: 138 },
      4: undefined,
      5: undefined,
    },
    rosters: { x: 529, y: 51, width: 306.89, height: 420 },
    sanctions: { x: 6, y: 478, width: 165, height: 107 },
    signatures: { x: 173.5, y: 478, width: 220, height: 107 },
    remarks: { x: 396, y: 478, width: 132.5, height: 107 },
    result: { x: 531, y: 478, width: 304.89, height: 107 },
  },
};

export const FIVE_SET_A4_LAYOUT: ScoresheetLayout = {
  id: 'baseos-five-set-a4-print-v1',
  format: '5-sets',
  output: 'print-a4',
  page: A4_LANDSCAPE_PAGE,
  cards: {
    header: { x: 6, y: 6, width: 829.89, height: 34 },
    sets: {
      1: { x: 6, y: 45, width: 411, height: 110 },
      2: { x: 425, y: 45, width: 410.89, height: 110 },
      3: { x: 6, y: 160, width: 411, height: 110 },
      4: { x: 425, y: 160, width: 410.89, height: 110 },
      5: { x: 6, y: 275, width: 520, height: 120 }, // Set 5 aumentado em largura e altura
    },
    // SANCTIONS e REMARKS na linha de cima (y=398)
    sanctions: { x: 6, y: 398, width: 220, height: 92 },
    remarks: { x: 231, y: 398, width: 295, height: 92 },
    // RESULT e SIGNATURES na linha de baixo (y=494)
    result: { x: 6, y: 494, width: 220, height: 90 },
    signatures: { x: 231, y: 494, width: 295, height: 90 },
    rosters: { x: 531, y: 275, width: 304.89, height: 309 },
  },
};

function scaleCardLayout(cards: ScoresheetCardLayout, scale: number): ScoresheetCardLayout {
  const scaled = {
    header: scaleRect(cards.header, scale),
    rosters: scaleRect(cards.rosters, scale),
    sanctions: scaleRect(cards.sanctions, scale),
    signatures: scaleRect(cards.signatures, scale),
    result: scaleRect(cards.result, scale),
    sets: {
      1: cards.sets[1] ? scaleRect(cards.sets[1], scale) : undefined,
      2: cards.sets[2] ? scaleRect(cards.sets[2], scale) : undefined,
      3: cards.sets[3] ? scaleRect(cards.sets[3], scale) : undefined,
      4: cards.sets[4] ? scaleRect(cards.sets[4], scale) : undefined,
      5: cards.sets[5] ? scaleRect(cards.sets[5], scale) : undefined,
    },
  } as ScoresheetCardLayout;
  
  if (cards.remarks) {
    scaled.remarks = scaleRect(cards.remarks, scale);
  }
  
  return scaled;
}

export const FIVE_SET_A3_MASTER_LAYOUT: ScoresheetLayout = {
  id: 'baseos-five-set-a3-master-v1',
  format: '5-sets',
  output: 'master',
  page: A3_LANDSCAPE_PAGE,
  cards: scaleCardLayout(FIVE_SET_A4_LAYOUT.cards, A3_FROM_A4_SCALE),
};

export function getScoresheetLayout(
  format: ScoresheetFormat,
  output: ScoresheetOutput = 'print-a4',
): ScoresheetLayout {
  if (format === '5-sets' && output === 'master') return FIVE_SET_A3_MASTER_LAYOUT;
  if (format === '5-sets') return FIVE_SET_A4_LAYOUT;
  return THREE_SET_A4_LAYOUT;
}
