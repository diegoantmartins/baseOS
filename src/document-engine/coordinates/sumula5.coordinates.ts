// =====================================================================
// Coordenadas do template SÚMULA 5 SETS (FPV de referência)
//
// Página: 1190 × 841 pts (A3 paisagem), tamanho fixo do PDF original.
// Todas as coordenadas em pts com origem no canto superior esquerdo.
//
// Estrutura medida no template de referência:
//   - Header (branding FPV): y 13-135.6 (emblema x 82-683 + títulos)
//   - Linha 1: SET 1 + SET 2 (y ~140-296)
//   - Linha 2: SET 3 + SET 4 (y ~304-456)
//   - SET 5: linha única (y ~458-603)
//   - Faixa inferior (y ~608-812): SANÇÕES | Solicitações Indevidas |
//     OBSERVAÇÕES | barra preta (y 677-691) | FUNÇÃO | VENCEDOR
//
// Blocos de set: cada box contém as grades de AMBAS as equipes
// (A = 6 colunas esquerdas, B = 6 colunas direitas + coluna extra).
// O número do set é PRÉ-IMPRESSO no template ("SET 1..5") — não desenhar.
// No header de cada box (y 143/307/461) ficam o placar do set e, abaixo
// (y 155/319/473), a ordem de saque (camisas I..VI). As células das
// grades ficam em branco (são para marcação ponto a ponto do apontador).
//
// Valores iniciais; o Editor de Template permite refiná-los.
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
 * Por box: A = 6 colunas esquerdas, B = 6 colunas direitas.
 * Colunas (medidas na linha 1): A x 252.9-401.2, B x 440.4-619.3.
 * Box direito (SET 2/4): A x 710.5-858.8, B x 898.3-1077.0.
 * SET 5 (linha 3): A x 255.6-403.3, B x 430.1-577.7.
 */
export const SUMULA5_TEAM_GRIDS = {
  A: { x: 252.9, y: 140, width: 148.3, height: 156 },
  B: { x: 440.4, y: 140, width: 178.9, height: 156 },
} as const;

/** Posição (x do grid de cada equipe) e y de placar/ordem de saque por set. */
const SUMULA5_SET_BOXES = [
  { set: 1, a: { x: 252.9, y: 143, lineupsY: 155 }, b: { x: 440.4, y: 143, lineupsY: 155 } },
  { set: 2, a: { x: 710.5, y: 143, lineupsY: 155 }, b: { x: 898.3, y: 143, lineupsY: 155 } },
  { set: 3, a: { x: 252.9, y: 307, lineupsY: 319 }, b: { x: 440.4, y: 307, lineupsY: 319 } },
  { set: 4, a: { x: 710.5, y: 307, lineupsY: 319 }, b: { x: 898.3, y: 307, lineupsY: 319 } },
  { set: 5, a: { x: 255.6, y: 461, lineupsY: 473 }, b: { x: 430.1, y: 461, lineupsY: 473 } },
] as const;

export const SUMULA5_FIELDS = {
  // ── Identificação (sobre o header limpo) ──────────────────────────
  orgName: { x: 82, y: 22, width: 400, height: 14, fontSize: 11, bold: true, align: 'left' as const },
  competitionName: { x: 82, y: 42, width: 500, height: 12, fontSize: 10, bold: true, align: 'left' as const },
  categoryName: { x: 82, y: 56, width: 220, height: 10, fontSize: 9, align: 'left' as const },
  gender: { x: 320, y: 56, width: 90, height: 10, fontSize: 9, align: 'left' as const },
  matchNumber: { x: 740, y: 88, width: 100, height: 12, fontSize: 10, bold: true, align: 'center' as const },
  round: { x: 740, y: 106, width: 100, height: 10, fontSize: 9, align: 'center' as const },
  phase: { x: 860, y: 88, width: 140, height: 10, fontSize: 9, align: 'center' as const },
  format: { x: 860, y: 106, width: 140, height: 12, fontSize: 10, bold: true, align: 'center' as const },
  date: { x: 740, y: 40, width: 100, height: 10, fontSize: 9, align: 'center' as const },
  time: { x: 850, y: 40, width: 70, height: 10, fontSize: 9, align: 'center' as const },
  venue: { x: 930, y: 40, width: 160, height: 10, fontSize: 9, align: 'center' as const },
  court: { x: 1095, y: 40, width: 80, height: 10, fontSize: 9, align: 'center' as const },

  teamAName: { x: 82, y: 72, width: 300, height: 10, fontSize: 9, bold: true, align: 'left' as const },
  teamBName: { x: 420, y: 72, width: 300, height: 10, fontSize: 9, bold: true, align: 'left' as const },

  // ── Logo do sistema (settings.documentLogo) ───────────────────────
  systemLogo: { x: 90, y: 20, width: 70, height: 55 },

  // ── SET (placar + ordem de saque) ─────────────────────────────────
  // Número do set: pré-impresso no template ("SET 1..5") — sem campo.
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

  // ── Sanções e solicitações (faixa inferior) ───────────────────────
  sanctionsHeader: { x: 86.7, y: 622, width: 60, height: 10, fontSize: 8, bold: true, align: 'center' as const },
  improperRequestsHeader: { x: 156.6, y: 617, width: 50, height: 8, fontSize: 8, bold: true, align: 'center' as const },
  observationsHeader: { x: 249, y: 617, width: 60, height: 8, fontSize: 8, bold: true, align: 'center' as const },
  observations: { x: 249, y: 631, width: 300, height: 40, fontSize: 7, align: 'left' as const, minSize: 5, maxLines: 5 },

  // ── Funções dos oficiais / assinaturas ────────────────────────────
  referee1: { x: 300, y: 696, width: 160, height: 10, fontSize: 7, align: 'center' as const },
  referee2: { x: 300, y: 706, width: 160, height: 10, fontSize: 7, align: 'center' as const },
  scorer: { x: 300, y: 716, width: 160, height: 10, fontSize: 7, align: 'center' as const },

  // ── Vencedor ──────────────────────────────────────────────────────
  winner: { x: 653.4, y: 800, width: 200, height: 11, fontSize: 9, bold: true, align: 'left' as const },
} satisfies SumulaGeometry['fields'];

export const SUMULA5_GEOMETRY: SumulaGeometry = {
  pageWidth: SUMULA5_PAGE.width,
  pageHeight: SUMULA5_PAGE.height,
  cleanZones: [
    // Header completo: emblema FPV + títulos arqueados + caixas decorativas
    { x: 82, y: 13, width: 1034, height: 122.6 },
  ],
  logoZone: { x: 90, y: 20, width: 70, height: 55 },
  fields: SUMULA5_FIELDS,
};