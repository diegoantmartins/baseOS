// =====================================================================
// Desenho de círculos (elipses) sobre o template (pdf-lib).
// Coordenadas top-origin; x/y indicam o CENTRO do círculo.
// =====================================================================

import { type PDFPage } from 'pdf-lib';
import { toPdfY } from './pdfUtils';
import { parseColor } from './drawLine';

export type CircleDraw = {
  /** Centro do círculo (top-origin). */
  x: number;
  y: number;
  /** Diâmetro em pts. */
  size: number;
  thickness?: number;
  color?: string;
  /** Preencher o interior com a cor (círculo sólido). */
  filled?: boolean;
};

export function drawCircle(page: PDFPage, circle: CircleDraw): void {
  const color = parseColor(circle.color ?? '#000000');
  page.drawEllipse({
    x: circle.x,
    y: toPdfY(page.getHeight(), circle.y),
    xScale: circle.size / 2,
    yScale: circle.size / 2,
    borderColor: color,
    borderWidth: circle.thickness ?? 1,
    color: circle.filled ? color : undefined,
  });
}