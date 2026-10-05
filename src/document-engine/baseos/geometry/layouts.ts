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
  id: 'baseos-three-set-a4-official-v2',
  format: '3-sets',
  output: 'print-a4',
  page: {
    ...A4_LANDSCAPE_PAGE,
    margin: 10,
  },
  cards: {
    header: { x: 10, y: 10, width: 821.89, height: 42 },
    sets: {
      1: { x: 10, y: 56, width: 494, height: 122 },
      2: { x: 10, y: 182, width: 494, height: 122 },
      3: { x: 10, y: 308, width: 645, height: 122 },
      4: undefined,
      5: undefined,
    },
    rosters: { x: 508, y: 56, width: 323.89, height: 248 },
    remarks: { x: 659, y: 308, width: 172.89, height: 122 },
    sanctions: { x: 10, y: 434, width: 175, height: 141 },
    signatures: { x: 189, y: 434, width: 390, height: 141 },
    result: { x: 583, y: 434, width: 248.89, height: 141 },
  },
};

// =====================================================================
// Modelo Histórico Preservado (Backup de Engenharia - Grade Mista 2x2)
// =====================================================================
export const LEGACY_GRID_FIVE_SET_A4_LAYOUT: ScoresheetLayout = {
  id: 'baseos-five-set-a4-legacy-v1',
  format: '5-sets',
  output: 'print-a4',
  page: {
    ...A4_LANDSCAPE_PAGE,
    margin: 10,
  },
  cards: {
    header: { x: 10, y: 10, width: 821.89, height: 42 },
    sets: {
      1: { x: 10, y: 56, width: 408.89, height: 118 },
      2: { x: 422.89, y: 56, width: 409, height: 118 },
      3: { x: 10, y: 178, width: 408.89, height: 118 },
      4: { x: 422.89, y: 178, width: 409, height: 118 },
      5: { x: 10, y: 300, width: 508, height: 126 },
    },
    rosters: { x: 522, y: 300, width: 309.89, height: 275 },
    sanctions: { x: 10, y: 430, width: 118, height: 145 },
    signatures: { x: 132, y: 430, width: 220, height: 145 },
    result: { x: 356, y: 430, width: 162, height: 145 },
  },
};

// Alias de compatibilidade com importações anteriores
export const FIVE_SET_A4_LAYOUT_LEGACY: ScoresheetLayout = LEGACY_GRID_FIVE_SET_A4_LAYOUT;

// =====================================================================
// Modelo Alternativo Preservado: Split-View Geométrico (Cenário B)
// =====================================================================
export const SPLIT_VIEW_FIVE_SET_A4_LAYOUT: ScoresheetLayout = {
  id: 'baseos-five-set-a4-split-view-v2',
  format: '5-sets',
  output: 'print-a4',
  page: {
    ...A4_LANDSCAPE_PAGE,
    margin: 8,
  },
  cards: {
    header: { x: 10, y: 8, width: 821.89, height: 34 },
    rosters: { x: 513.89, y: 46, width: 318, height: 539 },
    sets: {
      1: { x: 10, y: 46, width: 498, height: 85 },
      2: { x: 10, y: 135, width: 498, height: 85 },
      3: { x: 10, y: 224, width: 498, height: 85 },
      4: { x: 10, y: 313, width: 498, height: 85 },
      5: { x: 10, y: 402, width: 498, height: 85 },
    },
    sanctions: { x: 10, y: 491, width: 105, height: 94 },
    remarks: { x: 119, y: 491, width: 110, height: 94 },
    result: { x: 233, y: 491, width: 120, height: 94 },
    signatures: { x: 357, y: 491, width: 151, height: 94 },
  },
};

// =====================================================================
// Modelo Principal Oficial: Grade 2x2 + Base (Força Bruta para os Sets)
// Sets 1 ao 4: 409 x 120 pt (Máximo espaço para rotações e pontos)
// Set 5: 508 x 126 pt (Tie-break largo para inversão de quadra)
// Roster: 309.89 x 289 pt (Compactado no quadrante inferior direito)
// Rodapé: 508 x 159 pt (4 blocos sob o Set 5 com base em y: 585 pt)
// =====================================================================
export const FIVE_SET_A4_LAYOUT: ScoresheetLayout = {
  id: 'baseos-five-set-a4-official-v4',
  format: '5-sets',
  output: 'print-a4',
  page: {
    ...A4_LANDSCAPE_PAGE,
    margin: 10,
  },
  cards: {
    header: { x: 10, y: 10, width: 821.89, height: 34 },
    
    // ÁREA DE JOGO PRIORIZADA (Sets com ~120pt de altura para caligrafia)
    sets: {
      1: { x: 10, y: 48, width: 409, height: 120 },
      2: { x: 423, y: 48, width: 408.89, height: 120 },
      3: { x: 10, y: 172, width: 409, height: 120 },
      4: { x: 423, y: 172, width: 408.89, height: 120 },
      5: { x: 10, y: 296, width: 508, height: 126 }, // Tie-break largo para inversão de quadra
    },
    
    // ROSTER COMPACTADO (O sistema pré-preenche, exige menos altura de caligrafia)
    rosters: { x: 522, y: 296, width: 309.89, height: 289 },
    
    // RODAPÉ OPERACIONAL (Compactado sob o Set 5: Sanções 105pt + Assinaturas/Obs 254pt + Resultado 141pt = 508pt)
    sanctions: { x: 10, y: 426, width: 105, height: 159 },
    signatures: { x: 119, y: 426, width: 254, height: 159 },
    result: { x: 377, y: 426, width: 141, height: 159 },
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
