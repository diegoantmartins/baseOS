// =====================================================================
// BaseOS Geometry - Primitivas de Retângulo para Layout Documental Fixo
// =====================================================================

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageRect {
  width: number;
  height: number;
  margin: number;
  name: 'A4' | 'A3';
  orientation: 'landscape';
}

export function right(rect: Rect): number {
  return rect.x + rect.width;
}

export function bottom(rect: Rect): number {
  return rect.y + rect.height;
}

export function scaleRect(rect: Rect, scale: number): Rect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
