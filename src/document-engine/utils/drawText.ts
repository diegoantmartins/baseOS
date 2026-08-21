// =====================================================================
// Desenho de texto sobre o template (pdf-lib).
//
// Coordenadas sempre top-origin (origem no canto superior esquerdo).
// drawDynamicText ajusta automaticamente o tamanho da fonte para caber
// no campo definido (redução progressiva até minSize, depois quebra de
// linha e truncamento com reticências).
// =====================================================================

import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { FieldCoords } from '../schemas/sumula.schema';
import { getFontForWeight, toPdfY } from './pdfUtils';

const DEFAULT_MIN_SIZE = 6;
const DEFAULT_MAX_LINES = 3;
const ELLIPSIS = '…';

/** Desenha uma única linha de texto (sem quebra automática). */
export function drawTextLine(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  text: string,
  coords: FieldCoords,
): void {
  if (!text) return;
  const size = coords.fontSize ?? 9;
  const y = toPdfY(page.getHeight(), coords.y + size * 0.85);
  const activeFont = getFontForWeight(font, boldFont, coords.bold ?? false);
  const textWidth = activeFont.widthOfTextAtSize(text, size);
  const x = alignX(page.getWidth(), coords, textWidth);
  page.drawText(text, {
    x,
    y,
    size,
    font: activeFont,
    color: rgb(0, 0, 0),
  });
}

/** Quebra o texto em linhas que caibam na largura do campo. */
export function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Desenha texto com ajuste automático:
 * 1. Reduz a fonte até caber na largura (nunca abaixo de minSize).
 * 2. Se ainda não couber em maxLines, quebra em linhas e trunca com '…'.
 * 3. Verticalmente centraliza dentro da altura do campo.
 */
export function drawDynamicText(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  text: string,
  coords: FieldCoords,
): void {
  if (!text) return;
  const maxWidth = coords.width;
  const maxLines = coords.maxLines ?? DEFAULT_MAX_LINES;
  const minSize = coords.minSize ?? DEFAULT_MIN_SIZE;
  let size = coords.fontSize ?? 9;
  const activeFont = getFontForWeight(font, boldFont, coords.bold ?? false);

  while (size > minSize && activeFont.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }

  let lines = wrapText(activeFont, text, size, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1];
    while (
      activeFont.widthOfTextAtSize(`${last}${ELLIPSIS}`, size) > maxWidth &&
      last.length > 1
    ) {
      lines[maxLines - 1] = last.slice(0, -1);
    }
    lines[maxLines - 1] += ELLIPSIS;
  }

  const lineHeight = size * 1.15;
  const totalHeight = lines.length * lineHeight;
  const startTop = coords.y + (coords.height - totalHeight) / 2 + lineHeight - size * 0.85;

  lines.forEach((line, i) => {
    const y = toPdfY(page.getHeight(), startTop - i * lineHeight);
    const textWidth = activeFont.widthOfTextAtSize(line, size);
    const x = alignX(page.getWidth(), coords, textWidth);
    page.drawText(line, { x, y, size, font: activeFont, color: rgb(0, 0, 0) });
  });
}

function alignX(pageWidth: number, coords: FieldCoords, textWidth: number): number {
  const align = coords.align ?? 'left';
  if (align === 'center') return coords.x + (coords.width - textWidth) / 2;
  if (align === 'right') return coords.x + coords.width - textWidth;
  return coords.x;
}