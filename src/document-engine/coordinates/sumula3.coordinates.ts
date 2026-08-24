// =====================================================================
// Coordenadas do template SÚMULA 3 SETS (FPV/CBV Oficial)
//
// Página: 992 × 566 pts (~350 × 200 mm) — tamanho fixo do PDF oficial.
// Todas as coordenadas em pts com origem no canto superior esquerdo.
// =====================================================================

import type { SumulaGeometry } from '../schemas/sumula.schema';

export const SUMULA3_PAGE = { width: 992, height: 566 } as const;

/**
 * Faixas horizontais dos blocos de set (pts do topo).
 * SET 1: y 104.1-253.7 | SET 2: y 258.2-407.8 | SET 3: y 410.8-547.1
 */
export const SET_BANDS = [
  { set: 1, top: 104.1, bottom: 253.7 },
  { set: 2, top: 258.2, bottom: 407.8 },
  { set: 3, top: 410.8, bottom: 547.1 },
] as const;

/** Colunas de quadra (posições I..VI) dentro do grid de cada equipe. */
export const POSITION_COLS = [
  { position: 'I' as const, x: 109.4 },
  { position: 'II' as const, x: 138.5 },
  { position: 'III' as const, x: 166.5 },
  { position: 'IV' as const, x: 195.3 },
  { position: 'V' as const, x: 224.1 },
  { position: 'VI' as const, x: 253.0 },
];
const POSITION_COL_WIDTH = 29.0;

/** Grid da equipe A dentro de cada bloco de set. */
export const TEAM_A_GRID = { x: 109.4, y: 104.1, width: 173.6, height: 149.6 };
/** Grid da equipe B dentro de cada bloco de set. */
export const TEAM_B_GRID = { x: 308.0, y: 104.1, width: 173.6, height: 149.6 };

/** Área de SANÇÕES (bloco central direito de cada set). */
export const SANCTIONS_AREA = { x: 531.6, y: 104.1, width: 208.0, height: 149.6 };

/** Coluna direita (painel EQUIPES / observações / funções). */
export const RIGHT_COLUMN = { x: 746.0, y: 104.1, width: 238.0, height: 443.0 };

export const SUMULA3_FIELDS = {
  // ── Identificação do Cabeçalho Oficial (alinhado estritamente com as linhas originais) ───
  competitionName: { x: 105, y: 46.0, width: 230, height: 10, fontSize: 7.5, bold: true, align: 'left' as const },
  city: { x: 55, y: 59.0, width: 135, height: 10, fontSize: 7, align: 'left' as const },
  phase: { x: 230, y: 59.0, width: 50, height: 10, fontSize: 6.5, align: 'left' as const },
  matchNumber: { x: 332, y: 59.0, width: 35, height: 10, fontSize: 7.5, bold: true, align: 'center' as const },
  venue: { x: 60, y: 71.5, width: 275, height: 10, fontSize: 7, align: 'left' as const },
  genderMasc: { x: 86, y: 84.0, width: 12, height: 10, fontSize: 8, bold: true, align: 'center' as const },
  genderFem: { x: 130, y: 84.0, width: 12, height: 10, fontSize: 8, bold: true, align: 'center' as const },
  categoryName: { x: 190, y: 84.0, width: 145, height: 10, fontSize: 7, align: 'left' as const },
  
  // Data e Horário (box central superior)
  date: { x: 365, y: 50.0, width: 95, height: 10, fontSize: 7.5, bold: true, align: 'center' as const },
  time: { x: 505, y: 50.0, width: 75, height: 10, fontSize: 7.5, bold: true, align: 'center' as const },
  
  // Equipes (box central inferior de confronto)
  teamAName: { x: 362, y: 71.0, width: 100, height: 10, fontSize: 7.5, bold: true, align: 'left' as const },
  teamBName: { x: 485, y: 71.0, width: 100, height: 10, fontSize: 7.5, bold: true, align: 'left' as const },

  // ── SET (placar + ordem de saque) ─────────────────────────────────
  pointsA: { x: 110, y: 108, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsB: { x: 308, y: 108, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsA2: { x: 110, y: 262, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsB2: { x: 308, y: 262, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsA3: { x: 110, y: 414, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsB3: { x: 308, y: 414, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },

  // ── Ordem de saque (posições I..VI, equipe A e B, por set) ────────
  ...Object.fromEntries(
    [1, 2, 3].flatMap(setNo =>
      POSITION_COLS.flatMap((col, i) => [
        [`lineupA${setNo}${col.position}`, { x: TEAM_A_GRID.x + i * POSITION_COL_WIDTH + 1.5, y: SET_BANDS[setNo - 1].top + 4, width: POSITION_COL_WIDTH - 3, height: 14, fontSize: 8, align: 'center' as const, bold: true }],
        [`lineupB${setNo}${col.position}`, { x: TEAM_B_GRID.x + i * POSITION_COL_WIDTH + 1.5, y: SET_BANDS[setNo - 1].top + 4, width: POSITION_COL_WIDTH - 3, height: 14, fontSize: 8, align: 'center' as const, bold: true }],
      ]),
    ),
  ) as Record<string, never>,

  // ── Observações ───────────────────────────────────────────────────
  observations: { x: 755, y: 415, width: 225, height: 45, fontSize: 6.5, align: 'left' as const, minSize: 5, maxLines: 4 },

  // ── Funções dos oficiais / assinaturas ────────────────────────────
  referee1: { x: 775, y: 442.0, width: 140, height: 10, fontSize: 6.5, align: 'center' as const },
  referee2: { x: 775, y: 452.0, width: 140, height: 10, fontSize: 6.5, align: 'center' as const },
  scorer: { x: 775, y: 462.0, width: 140, height: 10, fontSize: 6.5, align: 'center' as const },

  // ── Vencedor ──────────────────────────────────────────────────────
  winner: { x: 547.4, y: 394, width: 170, height: 11, fontSize: 9, bold: true, align: 'left' as const },
} satisfies SumulaGeometry['fields'];

export const SUMULA3_GEOMETRY: SumulaGeometry = {
  pageWidth: SUMULA3_PAGE.width,
  pageHeight: SUMULA3_PAGE.height,
  cleanZones: [], // Layout 100% imutável e original preservado
  logoZone: { x: 22, y: 12, width: 100, height: 22 },
  fields: SUMULA3_FIELDS,
};