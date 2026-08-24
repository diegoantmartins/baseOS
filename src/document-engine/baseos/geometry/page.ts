// =====================================================================
// BaseOS Geometry - Dimensões e Margens de Página
// =====================================================================

export const A4_LANDSCAPE = {
  WIDTH: 841.89,
  HEIGHT: 595.28,
  MARGIN: {
    TOP: 14,
    BOTTOM: 14,
    LEFT: 14,
    RIGHT: 14,
  },
  CONTENT_WIDTH: 841.89 - 28, // 813.89
  CONTENT_HEIGHT: 595.28 - 28, // 567.28
} as const;

export const A3_LANDSCAPE = {
  WIDTH: 1190.55,
  HEIGHT: 841.89,
  MARGIN: {
    TOP: 18,
    BOTTOM: 18,
    LEFT: 18,
    RIGHT: 18,
  },
  CONTENT_WIDTH: 1190.55 - 36, // 1154.55
  CONTENT_HEIGHT: 841.89 - 36, // 805.89
} as const;
