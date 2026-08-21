// =====================================================================
// Utilitários do Motor de Documentos — núcleo PDF (pdf-lib)
//
// - Carregamento dos templates fixos (fetch no browser; node:fs em
//   testes via import.meta.url).
// - Conversão de coordenadas: os templates FPV usam origem no CANTO
//   SUPERIOR ESQUERDO (top-origin); pdf-lib usa origem no canto
//   INFERIOR ESQUERDO. Toda conversão é centralizada aqui.
// =====================================================================

import { PDFDocument } from 'pdf-lib';
import type { TemplateKind } from '../schemas/sumula.schema';

export const TEMPLATE_FILES: Record<TemplateKind, string> = {
  sumula3: 'sumula-3-sets.pdf',
  sumula5: 'sumula-5-sets.pdf',
  'ordem-saque': 'ordem-saque.pdf',
};

const TEMPLATE_URLS: Record<TemplateKind, string> = {
  sumula3: new URL('../templates/sumula-3-sets.pdf', import.meta.url).href,
  sumula5: new URL('../templates/sumula-5-sets.pdf', import.meta.url).href,
  'ordem-saque': new URL('../templates/ordem-saque.pdf', import.meta.url).href,
};

/** Dimensões esperadas das páginas dos templates (pts). */
export const TEMPLATE_PAGE_SIZES: Record<TemplateKind, { width: number; height: number }> = {
  sumula3: { width: 992, height: 566 },
  sumula5: { width: 1190, height: 841 },
  'ordem-saque': { width: 841, height: 595 },
};

/**
 * Lê os bytes brutos do template.
 * - Node (testes): node:fs a partir de import.meta.url.
 * - Browser: fetch pelo URL do asset (funciona em dev e no build).
 */
export async function loadTemplateBytes(kind: TemplateKind): Promise<Uint8Array> {
  const isNode =
    typeof process !== 'undefined' && typeof process.versions?.node === 'string';
  if (isNode) {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const fileUrl = join(process.cwd(), 'src/document-engine/templates', TEMPLATE_FILES[kind]);
    const data = await readFile(fileUrl);
    return Uint8Array.from(data);
  }
  const url = TEMPLATE_URLS[kind];
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao carregar template ${kind}: HTTP ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** Abre o template como PDFDocument editável (sem alterar metadados). */
export async function openTemplate(kind: TemplateKind): Promise<PDFDocument> {
  const bytes = await loadTemplateBytes(kind);
  return PDFDocument.load(bytes, { updateMetadata: false });
}

/** Serializa o documento editado de volta em bytes PDF. */
export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save();
}

/**
 * Converte coordenada Y top-origin (template FPV) para a origem
 * bottom-left usada pelo pdf-lib.
 */
export function toPdfY(pageHeight: number, topY: number): number {
  return pageHeight - topY;
}

/** Remove caracteres inválidos para nomes de arquivo gerados. */
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

/** Largura do texto em pts (usando a fonte padrão). */
export function measureTextWidth(font: import('pdf-lib').PDFFont, size: number, text: string): number {
  return font.widthOfTextAtSize(text, size);
}

/** Escolhe a fonte conforme o peso (negrito usa Helvetica-Bold). */
export function getFontForWeight(
  font: import('pdf-lib').PDFFont,
  boldFont: import('pdf-lib').PDFFont,
  bold: boolean,
): import('pdf-lib').PDFFont {
  return bold ? boldFont : font;
}