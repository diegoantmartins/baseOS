// =====================================================================
// BaseOS Geometry - Validação de Layout Documental Fixo
// =====================================================================

import type { PageRect, Rect } from './rect';
import { bottom, right } from './rect';
import type { ScoresheetLayout } from './layouts';

export interface LayoutValidationResult {
  valid: boolean;
  errors: string[];
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;
}

export function assertRectInsidePage(id: string, rect: Rect, page: PageRect): string[] {
  const errors: string[] = [];
  const maxX = page.width - page.margin;
  const maxY = page.height - page.margin;

  if (rect.width <= 0) errors.push(`${id}: largura deve ser positiva.`);
  if (rect.height <= 0) errors.push(`${id}: altura deve ser positiva.`);
  if (rect.x < page.margin) errors.push(`${id}: x ${rect.x} está fora da margem ${page.margin}.`);
  if (rect.y < page.margin) errors.push(`${id}: y ${rect.y} está fora da margem ${page.margin}.`);
  if (right(rect) > maxX) errors.push(`${id}: direita ${right(rect)} excede limite ${maxX}.`);
  if (bottom(rect) > maxY) errors.push(`${id}: base ${bottom(rect)} excede limite ${maxY}.`);

  return errors;
}

export function flattenLayoutRects(layout: ScoresheetLayout): Array<{ id: string; rect: Rect }> {
  const rects: Array<{ id: string; rect: Rect }> = [
    { id: 'header', rect: layout.cards.header },
    { id: 'rosters', rect: layout.cards.rosters },
    { id: 'sanctions', rect: layout.cards.sanctions },
    { id: 'signatures', rect: layout.cards.signatures },
    { id: 'result', rect: layout.cards.result },
  ];

  if (layout.cards.remarks) {
    rects.push({ id: 'remarks', rect: layout.cards.remarks });
  }

  ([1, 2, 3, 4, 5] as const).forEach(setNumber => {
    const rect = layout.cards.sets[setNumber];
    if (rect) rects.push({ id: `set${setNumber}`, rect });
  });

  return rects;
}

export function validateScoresheetLayout(layout: ScoresheetLayout): LayoutValidationResult {
  const rects = flattenLayoutRects(layout);
  const errors = rects.flatMap(({ id, rect }) => assertRectInsidePage(id, rect, layout.page));

  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (rectsOverlap(rects[i].rect, rects[j].rect)) {
        errors.push(`${rects[i].id} sobrepõe ${rects[j].id}.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
