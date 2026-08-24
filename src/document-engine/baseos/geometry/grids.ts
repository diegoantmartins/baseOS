// =====================================================================
// BaseOS Geometry - Matrizes da Régua de Pontos Oficiais CBV / Federação
// =====================================================================

export interface PointRulerGrid {
  isSingleCol: boolean;
  col1: number[];
  col2?: number[];
  col3?: number[];
}

/**
 * Gera as matrizes oficiais para a régua de pontos:
 * - maxPoints = 8: 1 coluna única de 1 a 8 (Tie-Break Quadrante 1 antes da troca)
 * - maxPoints = 30: 3 colunas (1-10, 11-20, 21-30) (Tie-Break Quadrantes 2 e 3)
 * - maxPoints = 36: 3 colunas (1-12, 13-24, 25-36) (Sets 1 a 4 Regulares)
 */
export function generatePointRulerColumns(maxPoints = 36): PointRulerGrid {
  if (maxPoints <= 8) {
    return {
      isSingleCol: true,
      col1: Array.from({ length: 8 }, (_, i) => i + 1),
    };
  }

  if (maxPoints <= 30) {
    return {
      isSingleCol: false,
      col1: Array.from({ length: 10 }, (_, i) => i + 1),
      col2: Array.from({ length: 10 }, (_, i) => i + 11),
      col3: Array.from({ length: 10 }, (_, i) => i + 21),
    };
  }

  return {
    isSingleCol: false,
    col1: Array.from({ length: 12 }, (_, i) => i + 1),
    col2: Array.from({ length: 12 }, (_, i) => i + 13),
    col3: Array.from({ length: 12 }, (_, i) => i + 25),
  };
}
