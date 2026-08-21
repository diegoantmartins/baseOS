// =====================================================================
// Desenho de linhas sobre o template (pdf-lib).
// Coordenadas top-origin; espessura em pts; cor em hex ou nome.
// =====================================================================

import { rgb, type Color, type PDFPage } from 'pdf-lib';
import { toPdfY } from './pdfUtils';

export type LineDraw = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness?: number;
  /** Cor em formato CSS (hex #RRGGBB ou nomes comuns). */
  color?: string;
};

export function drawLine(page: PDFPage, line: LineDraw): void {
  page.drawLine({
    start: { x: line.x1, y: toPdfY(page.getHeight(), line.y1) },
    end: { x: line.x2, y: toPdfY(page.getHeight(), line.y2) },
    thickness: line.thickness ?? 1,
    color: parseColor(line.color ?? '#000000'),
  });
}

export function parseColor(color: string): Color {
  const hex = color.replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return rgb(
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    );
  }
  const named: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    gray: '#808080',
    red: '#ff0000',
  };
  const hexColor = named[color.toLowerCase()] ?? '#000000';
  return rgb(
    parseInt(hexColor.slice(1, 3), 16) / 255,
    parseInt(hexColor.slice(3, 5), 16) / 255,
    parseInt(hexColor.slice(5, 7), 16) / 255,
  );
}

/** Retângulo preenchido (usado para limpar zonas do template). */
export function fillRect(
  page: PDFPage,
  rect: { x: number; y: number; width: number; height: number; color?: string },
): void {
  page.drawRectangle({
    x: rect.x,
    y: toPdfY(page.getHeight(), rect.y + rect.height),
    width: rect.width,
    height: rect.height,
    color: parseColor(rect.color ?? '#ffffff'),
  });
}