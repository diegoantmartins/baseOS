// =====================================================================
// Coordenadas do template ORDEM DE SAQUE (FPV de referência)
//
// Página: 841 × 595 pts (A4 paisagem) com 8 filipetas "FICHA DE
// POSIÇÃO" (4 colunas × 2 linhas). O template não possui branding FPV
// em texto — apenas títulos genéricos — portanto não há zonas de
// limpeza obrigatórias (verificar visualmente na Fase 2).
//
// Coordenadas em pts, origem no canto superior esquerdo.
// =====================================================================

import type { OrdemSaqueGeometry } from '../schemas/ordemSaque.schema';

export const ORDEM_SAQUE_PAGE = { width: 841, height: 595 } as const;

/** Slots das 8 filipetas (4 col × 2 linhas), canto superior esquerdo. */
export const ORDEM_SAQUE_CARD_SLOTS = [
  { x: 9, y: 13, width: 202.6, height: 283 },
  { x: 216, y: 13, width: 202.9, height: 283 },
  { x: 419, y: 13, width: 202.5, height: 283 },
  { x: 622, y: 13, width: 202, height: 283 },
  { x: 9, y: 302, width: 202.6, height: 277 },
  { x: 216, y: 302, width: 202.9, height: 277 },
  { x: 419, y: 302, width: 202.5, height: 277 },
  { x: 622, y: 302, width: 202, height: 277 },
];

/**
 * Campos por filipeta (coordenadas RELATIVAS ao canto da filipeta).
 * A filipeta já contém o título "FICHA DE POSIÇÃO" (y ~27.6-37.6);
 * o sistema preenche equipe, set, posições I..VI, técnico e assinatura.
 */
export const ORDEM_SAQUE_CARD_FIELDS = {
  title: { x: 43, y: 25.5, width: 120, height: 12, fontSize: 9, bold: true, align: 'center' as const },
  setNumber: { x: 4, y: 24, width: 30, height: 12, fontSize: 9, bold: true, align: 'center' as const },
  teamName: { x: 110, y: 24, width: 85, height: 12, fontSize: 9, bold: true, align: 'right' as const },

  // Posições I..VI: 6 linhas (relativas ao topo da filipeta)
  positionI: { x: 22, y: 48, width: 160, height: 14, fontSize: 8, align: 'left' as const },
  positionII: { x: 22, y: 66, width: 160, height: 14, fontSize: 8, align: 'left' as const },
  positionIII: { x: 22, y: 84, width: 160, height: 14, fontSize: 8, align: 'left' as const },
  positionIV: { x: 22, y: 102, width: 160, height: 14, fontSize: 8, align: 'left' as const },
  positionV: { x: 22, y: 120, width: 160, height: 14, fontSize: 8, align: 'left' as const },
  positionVI: { x: 22, y: 138, width: 160, height: 14, fontSize: 8, align: 'left' as const },

  libero: { x: 22, y: 158, width: 160, height: 14, fontSize: 8, align: 'left' as const },
  coach: { x: 22, y: 176, width: 160, height: 14, fontSize: 8, align: 'left' as const },

  // Assinatura do técnico (rodapé da filipeta)
  signature: { x: 22, y: 252, width: 160, height: 12, fontSize: 7, align: 'center' as const },
};

export const ORDEM_SAQUE_GEOMETRY: OrdemSaqueGeometry = {
  pageWidth: ORDEM_SAQUE_PAGE.width,
  pageHeight: ORDEM_SAQUE_PAGE.height,
  cols: 4,
  rows: 2,
  cleanZones: [],
  logoZone: { x: 0, y: 0, width: 0, height: 0 },
  cardSlots: ORDEM_SAQUE_CARD_SLOTS,
  cardFields: ORDEM_SAQUE_CARD_FIELDS,
};