// =====================================================================
// Coordenadas do template SÚMULA 5 SETS (FPV/CBV Oficial)
//
// Página: 1190 × 841 pts (A3/A4 landscape oficial), tamanho fixo.
// Todas as coordenadas em pts com origem no canto superior esquerdo.
// =====================================================================

import type { SumulaGeometry } from '../schemas/sumula.schema';

export const SUMULA5_PAGE = { width: 1190, height: 841 } as const;

/** Linha de blocos de sets: SET1+SET2 | SET3+SET4 | SET5. */
export const SUMULA5_SET_ROWS = [
  { row: 1, sets: [1, 2], top: 140, bottom: 296 },
  { row: 2, sets: [3, 4], top: 304, bottom: 456 },
  { row: 3, sets: [5], top: 458, bottom: 603 },
] as const;

/** Rótulo "SET" por set (letreiro vertical na caixa da esquerda). */
export const SUMULA5_SET_LABELS = [
  { set: 1, x: 210.5, y: 179.8, numberY: 251.3 },
  { set: 2, x: 668.7, y: 179.8, numberY: 251.3 },
  { set: 3, x: 211.0, y: 345.7, numberY: 417.0 },
  { set: 4, x: 668.7, y: 345.7, numberY: 417.0 },
  { set: 5, x: 210.5, y: 511.0, numberY: 581.0 },
] as const;

/**
 * Grid de cada equipe dentro de um bloco de set (fallback do gerador).
 */
export const SUMULA5_TEAM_GRIDS = {
  A: { x: 252.9, y: 140, width: 148.3, height: 156 },
  B: { x: 440.4, y: 140, width: 178.9, height: 156 },
} as const;

/**
 * Posição (x do grid de cada equipe) e y de placar/ordem de saque por set.
 */
const SUMULA5_SET_BOXES = [
  { set: 1, a: { x: 252.9, y: 143, lineupsY: 155 }, b: { x: 440.4, y: 143, lineupsY: 155 } },
  { set: 2, a: { x: 710.5, y: 143, lineupsY: 155 }, b: { x: 898.3, y: 143, lineupsY: 155 } },
  { set: 3, a: { x: 252.9, y: 307, lineupsY: 319 }, b: { x: 440.4, y: 307, lineupsY: 319 } },
  { set: 4, a: { x: 710.5, y: 307, lineupsY: 319 }, b: { x: 898.3, y: 307, lineupsY: 319 } },
  { set: 5, a: { x: 255.6, y: 461, lineupsY: 473 }, b: { x: 430.1, y: 461, lineupsY: 473 } },
] as const;

export const SUMULA5_FIELDS = {
  // ── Identificação do Cabeçalho Oficial (alinhado estritamente com as linhas originais) ───
  competitionName: { x: 135, y: 68.0, width: 275, height: 13, fontSize: 9.5, bold: true, align: 'left' as const },
  city: { x: 75, y: 87.0, width: 155, height: 11, fontSize: 8.5, align: 'left' as const },
  phase: { x: 315, y: 87.0, width: 60, height: 11, fontSize: 8.5, align: 'left' as const },
  matchNumber: { x: 450, y: 87.0, width: 40, height: 11, fontSize: 9.5, bold: true, align: 'center' as const },
  venue: { x: 80, y: 105.0, width: 335, height: 11, fontSize: 8.5, align: 'left' as const },
  genderMasc: { x: 118, y: 124.0, width: 14, height: 11, fontSize: 9.5, bold: true, align: 'center' as const },
  genderFem: { x: 172, y: 124.0, width: 14, height: 11, fontSize: 9.5, bold: true, align: 'center' as const },
  categoryName: { x: 260, y: 124.0, width: 175, height: 11, fontSize: 8.5, align: 'left' as const },

  // Data e Horário (box central superior)
  date: { x: 485, y: 74.0, width: 115, height: 13, fontSize: 9.5, align: 'center' as const },
  time: { x: 675, y: 74.0, width: 90, height: 13, fontSize: 9.5, align: 'center' as const },

  // Equipes (box central inferior de confronto)
  teamAName: { x: 480, y: 105.0, width: 120, height: 13, fontSize: 9.5, bold: true, align: 'left' as const },
  teamBName: { x: 645, y: 105.0, width: 120, height: 13, fontSize: 9.5, bold: true, align: 'left' as const },

  // ── SET (placar + ordem de saque) ─────────────────────────────────
  ...Object.fromEntries(
    SUMULA5_SET_BOXES.flatMap(box => [
      [`pointsA${box.set}`, { x: box.a.x, y: box.a.y, width: 40, height: 13, fontSize: 12, bold: true, align: 'center' as const }],
      [`pointsB${box.set}`, { x: box.b.x, y: box.b.y, width: 40, height: 13, fontSize: 12, bold: true, align: 'center' as const }],
      ...(['I', 'II', 'III', 'IV', 'V', 'VI'] as const).flatMap((pos, i) => [
        [`lineupA${box.set}${pos}`, { x: box.a.x + 2 + i * 29.8, y: box.a.lineupsY, width: 28, height: 12, fontSize: 8, align: 'center' as const, bold: true }],
        [`lineupB${box.set}${pos}`, { x: box.b.x + 2 + i * 29.8, y: box.b.lineupsY, width: 28, height: 12, fontSize: 8, align: 'center' as const, bold: true }],
      ]),
    ]),
  ) as Record<string, never>,

  // ── Sanções e observações (faixa inferior) ─────────────────────────
  observations: { x: 249, y: 631, width: 300, height: 40, fontSize: 7, align: 'left' as const, minSize: 5, maxLines: 5 },

  // ── Funções dos oficiais / assinaturas ────────────────────────────
  referee1: { x: 300, y: 696, width: 160, height: 10, fontSize: 7.5, align: 'center' as const },
  referee2: { x: 300, y: 706, width: 160, height: 10, fontSize: 7.5, align: 'center' as const },
  scorer: { x: 300, y: 716, width: 160, height: 10, fontSize: 7.5, align: 'center' as const },

  // ── Vencedor ──────────────────────────────────────────────────────
  winner: { x: 653.4, y: 800, width: 200, height: 11, fontSize: 9, bold: true, align: 'left' as const },
} satisfies SumulaGeometry['fields'];

export const SUMULA5_GEOMETRY: SumulaGeometry = {
  pageWidth: SUMULA5_PAGE.width,
  pageHeight: SUMULA5_PAGE.height,
  cleanZones: [
    { x: 10, y: 8, width: 1170, height: 126 },
  ],
  logoZone: { x: 90, y: 20, width: 70, height: 55 },
  fields: SUMULA5_FIELDS,
};