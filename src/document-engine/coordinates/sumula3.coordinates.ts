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
  // ── Identificação do Cabeçalho Oficial (alinhado com as etiquetas) ───
  competitionName: { x: 105, y: 48, width: 145, height: 11, fontSize: 7.5, bold: true, align: 'left' as const },
  city: { x: 255, y: 48, width: 155, height: 11, fontSize: 7.5, align: 'left' as const },
  venue: { x: 440, y: 48, width: 130, height: 11, fontSize: 7.5, align: 'left' as const },
  date: { x: 375, y: 63, width: 90, height: 11, fontSize: 7.5, align: 'left' as const },
  time: { x: 495, y: 63, width: 75, height: 11, fontSize: 7.5, align: 'left' as const },
  phase: { x: 205, y: 76, width: 50, height: 11, fontSize: 7.5, align: 'left' as const },
  matchNumber: { x: 295, y: 76, width: 40, height: 11, fontSize: 8, bold: true, align: 'center' as const },
  gender: { x: 74, y: 90, width: 15, height: 11, fontSize: 8, bold: true, align: 'center' as const },
  categoryName: { x: 185, y: 90, width: 150, height: 11, fontSize: 7.5, align: 'left' as const },
  teamAName: { x: 365, y: 76, width: 100, height: 11, fontSize: 7.5, bold: true, align: 'left' as const },
  teamBName: { x: 475, y: 76, width: 100, height: 11, fontSize: 7.5, bold: true, align: 'left' as const },

  // ── Logo do sistema (settings.documentLogo) ───────────────────────
  systemLogo: { x: 22, y: 15, width: 50, height: 25 },

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
  observations: { x: 748.6, y: 455, width: 228, height: 70, fontSize: 7, align: 'left' as const, minSize: 5, maxLines: 5 },

  // ── Funções dos oficiais / assinaturas ────────────────────────────
  referee1: { x: 772.6, y: 501, width: 140, height: 10, fontSize: 7, align: 'center' as const },
  referee2: { x: 772.6, y: 510.5, width: 140, height: 10, fontSize: 7, align: 'center' as const },
  scorer: { x: 772.6, y: 521, width: 140, height: 10, fontSize: 7, align: 'center' as const },

  // ── Vencedor ──────────────────────────────────────────────────────
  winner: { x: 547.4, y: 394, width: 170, height: 11, fontSize: 9, bold: true, align: 'left' as const },
} satisfies SumulaGeometry['fields'];

export const SUMULA3_GEOMETRY: SumulaGeometry = {
  pageWidth: SUMULA3_PAGE.width,
  pageHeight: SUMULA3_PAGE.height,
  cleanZones: [
    // Branqueamento da área de cabeçalho para redesenho vetorial de alta definição
    { x: 18, y: 10, width: 966, height: 88 },
  ],
  logoZone: { x: 22, y: 12, width: 100, height: 22 },
  fields: SUMULA3_FIELDS,
};