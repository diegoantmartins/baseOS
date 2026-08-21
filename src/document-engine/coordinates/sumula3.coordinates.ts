// =====================================================================
// Coordenadas do template SÚMULA 3 SETS (FPV de referência)
//
// Página: 992 × 566 pts (~350 × 200 mm) — retrato, tamanho fixo do PDF
// original. Todas as coordenadas em pts com origem no canto superior
// esquerdo (compatíveis com medições feitas no template de referência).
//
// Valores iniciais obtidos por análise estrutural do template; o Editor
// de Template (painel administrativo) permite refiná-los e salvá-los.
// =====================================================================

import type { SumulaGeometry } from '../schemas/sumula.schema';

export const SUMULA3_PAGE = { width: 992, height: 566 } as const;

const headerTop = 14;
const headerBottom = 96.8;

/**
 * Faixas horizontais dos blocos de set (pts do topo).
 * SET 1: y 104.1-253.7 | SET 2: y 258.2-407.8 | SET 3: y 410.8-547.1
 */
export const SET_BANDS = [
  { set: 1, top: 104.1, bottom: 253.7 },
  { set: 2, top: 258.2, bottom: 407.8 },
  { set: 3, top: 410.8, bottom: 547.1 },
] as const;

/** Colunas de quadra (posições I..VI) dentro do grid de cada equipe.
 *  x = borda esquerda da coluna (linhas verticais medidas no template). */
export const POSITION_COLS = [
  { position: 'I' as const, x: 109.4 },
  { position: 'II' as const, x: 138.5 },
  { position: 'III' as const, x: 166.5 },
  { position: 'IV' as const, x: 195.3 },
  { position: 'V' as const, x: 224.1 },
  { position: 'VI' as const, x: 253.0 },
];
const POSITION_COL_WIDTH = 29.0;
const TEAM_A_END = 283.0;

/** Grid da equipe A dentro de cada bloco de set. */
export const TEAM_A_GRID = { x: 109.4, y: 104.1, width: 173.6, height: 149.6 };
/** Grid da equipe B dentro de cada bloco de set. */
export const TEAM_B_GRID = { x: 308.0, y: 104.1, width: 173.6, height: 149.6 };

/** Área de SANÇÕES (bloco central direito de cada set). */
export const SANCTIONS_AREA = { x: 531.6, y: 104.1, width: 208.0, height: 149.6 };

/** Coluna direita (solicitações indevidas / observações / funções). */
export const RIGHT_COLUMN = { x: 746.0, y: 104.1, width: 238.0, height: 443.0 };

/** Quadro de SANÇÕES + Solicitações Indevidas (cabeçalho global). */
export const SANCTIONS_HEADER = { x: 531.6, y: 104.1, width: 208.0, height: 32.3 };

/**
 * Mapa inicial de campos. O Editor de Template pode sobrescrever qualquer
 * entrada (coordenadas persistidas nas configurações do sistema).
 */
export const SUMULA3_FIELDS = {
  // ── Identificação (desenhado sobre o header limpo) ────────────────
  orgName: { x: 30, y: 30, width: 300, height: 14, fontSize: 11, bold: true, align: 'left' as const },
  competitionName: { x: 30, y: 52, width: 420, height: 12, fontSize: 10, bold: true, align: 'left' as const },
  categoryName: { x: 30, y: 66, width: 200, height: 10, fontSize: 9, align: 'left' as const },
  gender: { x: 240, y: 66, width: 90, height: 10, fontSize: 9, align: 'left' as const },
  matchNumber: { x: 640, y: 44, width: 90, height: 12, fontSize: 10, bold: true, align: 'center' as const },
  round: { x: 640, y: 60, width: 90, height: 10, fontSize: 9, align: 'center' as const },
  phase: { x: 640, y: 74, width: 120, height: 10, fontSize: 9, align: 'center' as const },
  format: { x: 780, y: 44, width: 120, height: 12, fontSize: 10, bold: true, align: 'center' as const },

  // ── Data / horário / local ────────────────────────────────────────
  date: { x: 580, y: 30, width: 90, height: 10, fontSize: 9, align: 'center' as const },
  time: { x: 672, y: 30, width: 70, height: 10, fontSize: 9, align: 'center' as const },
  venue: { x: 748, y: 30, width: 150, height: 10, fontSize: 9, align: 'center' as const },
  court: { x: 900, y: 30, width: 70, height: 10, fontSize: 9, align: 'center' as const },

  // ── Equipes (nomes desenhados no cabeçalho limpo) ─────────────────
  teamAName: { x: 30, y: 82, width: 250, height: 10, fontSize: 9, bold: true, align: 'left' as const },
  teamBName: { x: 320, y: 82, width: 250, height: 10, fontSize: 9, bold: true, align: 'left' as const },

  // ── Logo do sistema (settings.documentLogo) ───────────────────────
  systemLogo: { x: 22, y: 20, width: 70, height: 55 },

  // ── SET (placar + ordem de saque) ─────────────────────────────────
  // Número do set: pré-impresso no template ("SET 1..3") — sem campo.
  pointsA: { x: 110, y: 108, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsB: { x: 308, y: 108, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsA2: { x: 110, y: 262, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsB2: { x: 308, y: 262, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsA3: { x: 110, y: 414, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },
  pointsB3: { x: 308, y: 414, width: 40, height: 14, fontSize: 12, bold: true, align: 'center' as const },

  // ── Ordem de saque (posições I..VI, equipe A e B, por set) ────────
  // Chave: lineupA<set><posicao> — ex.: lineupA1I, lineupB2V.
  // Renderizado na primeira linha útil do grid (topo do bloco + 4pts).
  ...Object.fromEntries(
    [1, 2, 3].flatMap(setNo =>
      POSITION_COLS.flatMap((col, i) => [
        [`lineupA${setNo}${col.position}`, { x: TEAM_A_GRID.x + i * POSITION_COL_WIDTH + 1.5, y: SET_BANDS[setNo - 1].top + 4, width: POSITION_COL_WIDTH - 3, height: 14, fontSize: 8, align: 'center' as const, bold: true }],
        [`lineupB${setNo}${col.position}`, { x: TEAM_B_GRID.x + i * POSITION_COL_WIDTH + 1.5, y: SET_BANDS[setNo - 1].top + 4, width: POSITION_COL_WIDTH - 3, height: 14, fontSize: 8, align: 'center' as const, bold: true }],
      ]),
    ),
  ) as Record<string, never>,

  // ── Sanções (cabeçalho + linhas por set) ──────────────────────────
  sanctionsHeader: { x: 531.6, y: 108, width: 90, height: 10, fontSize: 8, bold: true, align: 'center' as const },
  improperRequestsHeader: { x: 626, y: 112, width: 100, height: 10, fontSize: 8, bold: true, align: 'center' as const },

  // ── Observações ───────────────────────────────────────────────────
  observations: { x: 748.6, y: 426.6, width: 228, height: 40, fontSize: 7, align: 'left' as const, minSize: 5, maxLines: 5 },

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
    // Header completo: emblema FPV + "FEDERAÇÃO PARANAENSE DE VOLEIBOL" + "SÚMULA ESTADUAL"
    { x: 18.8, y: headerTop, width: 964.7, height: headerBottom - headerTop },
  ],
  logoZone: { x: 22, y: 20, width: 70, height: 55 },
  fields: SUMULA3_FIELDS,
};