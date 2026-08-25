/**
 * BaseOS - Geometria e Calibração Padronizada de Súmulas Oficiais (A4 Paisagem - 297 × 210 mm)
 *
 * Garante aproveitamento máximo da área útil com margem de segurança de 4mm.
 * Centraliza as dimensões de todos os componentes das súmulas de 3 e 5 sets.
 */

import type jsPDF from 'jspdf';

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ScoresheetLayout = {
  page: {
    width: number;
    height: number;
    margin: number;
  };
  stroke: {
    hair: number;
    thin: number;
    normal: number;
    strong: number;
  };
  font: {
    title: number;
    sectionTitle: number;
    label: number;
    value: number;
    tiny: number;
  };
  header: Rect;
  matchInfo: Rect;
  sets: Rect[];
  sanctions: Rect;
  roster: Rect;
  result: Rect;
  sideChange: Rect;
  observations: Rect;
  signatures: Rect;
  approval?: Rect;
  footer: Rect;
};

export const PAGE_A4_LANDSCAPE = {
  width: 297,
  height: 210,
  margin: 4,
};

export const PRINT_MARGIN = 4;

export const USABLE_AREA = {
  w: PAGE_A4_LANDSCAPE.width - 2 * PRINT_MARGIN, // 289 mm
  h: PAGE_A4_LANDSCAPE.height - 2 * PRINT_MARGIN, // 202 mm
};

/**
 * Layout oficial calibrado para Súmula de 3 Sets em A4 Paisagem (Página Única)
 */
export const SHEET3_A4: ScoresheetLayout = {
  page: PAGE_A4_LANDSCAPE,
  stroke: {
    hair: 0.1,
    thin: 0.15,
    normal: 0.25,
    strong: 0.35,
  },
  font: {
    title: 9,
    sectionTitle: 6,
    label: 3.5,
    value: 5,
    tiny: 3,
  },
  header: { x: 4, y: 4, w: 289, h: 12 },
  matchInfo: { x: 4, y: 17, w: 289, h: 13 },
  sets: [
    { x: 4, y: 32, w: 188, h: 36 },
    { x: 4, y: 69.5, w: 188, h: 36 },
    { x: 4, y: 107, w: 188, h: 36 },
  ],
  sanctions: { x: 194, y: 32, w: 99, h: 30 },
  roster: { x: 194, y: 63.5, w: 99, h: 79 },
  result: { x: 4, y: 145, w: 94, h: 57 },
  sideChange: { x: 99.5, y: 145, w: 92.5, h: 57 },
  observations: { x: 194, y: 145, w: 99, h: 24 },
  signatures: { x: 194, y: 170.5, w: 99, h: 31.5 },
  footer: { x: 4, y: 204, w: 289, h: 2 },
};

/**
 * Layout oficial calibrado para Súmula de 5 Sets em A4 Paisagem (Página Única Redesenhada)
 */
export const SHEET5_A4: ScoresheetLayout = {
  page: PAGE_A4_LANDSCAPE,
  stroke: {
    hair: 0.08,
    thin: 0.12,
    normal: 0.2,
    strong: 0.3,
  },
  font: {
    title: 8,
    sectionTitle: 5,
    label: 3,
    value: 4.5,
    tiny: 2.7,
  },
  header: { x: 4, y: 4, w: 289, h: 10 },
  matchInfo: { x: 4, y: 15, w: 289, h: 11 },
  sets: [
    { x: 4, y: 28, w: 94, h: 34 },
    { x: 99.5, y: 28, w: 94, h: 34 },
    { x: 195, y: 28, w: 98, h: 34 },
    { x: 4, y: 63.5, w: 94, h: 34 },
    { x: 99.5, y: 63.5, w: 94, h: 34 },
  ],
  sideChange: { x: 195, y: 63.5, w: 98, h: 34 },
  roster: { x: 4, y: 100, w: 144, h: 54 },
  sanctions: { x: 150, y: 100, w: 70, h: 31 },
  result: { x: 222, y: 100, w: 71, h: 31 },
  observations: { x: 150, y: 133, w: 70, h: 21 },
  signatures: { x: 222, y: 133, w: 71, h: 21 },
  approval: { x: 4, y: 156, w: 289, h: 46 },
  footer: { x: 4, y: 204, w: 289, h: 2 },
};

/**
 * Valida se um retângulo está estritamente dentro da margem de segurança de impressão da página.
 */
export function assertRectInsidePage(
  rect: Rect,
  page: { width: number; height: number; margin: number }
): void {
  const minX = page.margin;
  const minY = page.margin;
  const maxX = page.width - page.margin;
  const maxY = page.height - page.margin;

  if (rect.x < minX - 0.01) throw new Error(`Rect x fora da margem esquerda: ${rect.x} < ${minX}`);
  if (rect.y < minY - 0.01) throw new Error(`Rect y fora da margem superior: ${rect.y} < ${minY}`);
  if (rect.x + rect.w > maxX + 0.01) throw new Error(`Rect largura estoura margem direita: ${rect.x + rect.w} > ${maxX}`);
  if (rect.y + rect.h > maxY + 0.01) throw new Error(`Rect altura estoura margem inferior: ${rect.y + rect.h} > ${maxY}`);
}

/**
 * Validação rigorosa de todos os blocos de um layout para prevenir overflow em A4.
 */
export function validateScoresheetLayout(layout: ScoresheetLayout): void {
  const rects: Rect[] = [
    layout.header,
    layout.matchInfo,
    ...layout.sets,
    layout.sanctions,
    layout.roster,
    layout.result,
    layout.sideChange,
    layout.observations,
    layout.signatures,
    layout.footer,
  ];

  if (layout.approval) {
    rects.push(layout.approval);
  }

  rects.forEach(rect => assertRectInsidePage(rect, layout.page));
}

/**
 * Modo de calibração visual milimétrica (grade de debug de 5mm).
 */
export function drawDebugGrid(d: jsPDF, width = 297, height = 210): void {
  d.setDrawColor(220);
  d.setLineWidth(0.05);

  for (let x = 0; x <= width; x += 5) {
    d.line(x, 0, x, height);
  }

  for (let y = 0; y <= height; y += 5) {
    d.line(0, y, width, y);
  }

  d.setTextColor(160);
  d.setFontSize(3);

  for (let x = 0; x <= width; x += 10) {
    d.text(String(x), x + 0.5, 3);
  }

  for (let y = 10; y <= height; y += 10) {
    d.text(String(y), 0.5, y);
  }
}
