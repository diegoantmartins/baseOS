// =====================================================================
// Desenho de caixas de seleção (checkboxes) sobre o template.
// Coordenadas top-origin; x/y = canto superior esquerdo do quadrado.
// =====================================================================

import { rgb, type PDFPage } from 'pdf-lib';
import { toPdfY } from './pdfUtils';
import { drawLine } from './drawLine';

export type CheckboxDraw = {
  x: number;
  y: number;
  size: number;
  checked: boolean;
  thickness?: number;
};

export function drawCheckbox(page: PDFPage, box: CheckboxDraw): void {
  const t = box.thickness ?? 1;
  page.drawRectangle({
    x: box.x,
    y: toPdfY(page.getHeight(), box.y + box.size),
    width: box.size,
    height: box.size,
    borderColor: rgb(0, 0, 0),
    borderWidth: t,
  });
  if (box.checked) {
    const inset = box.size * 0.2;
    drawLine(page, {
      x1: box.x + inset,
      y1: box.y + inset,
      x2: box.x + box.size - inset,
      y2: box.y + box.size - inset,
      thickness: Math.max(1, t * 1.5),
    });
    drawLine(page, {
      x1: box.x + box.size - inset,
      y1: box.y + inset,
      x2: box.x + inset,
      y2: box.y + box.size - inset,
      thickness: Math.max(1, t * 1.5),
    });
  }
}