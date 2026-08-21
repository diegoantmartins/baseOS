// =====================================================================
// Gerador da FICHA DE POSIÇÃO / ORDEM DE SAQUE (template A4 paisagem).
//
// O template possui 8 filipetas "FICHA DE POSIÇÃO" (4 col × 2 linhas).
// Cada filipeta registra equipe, set e a ordem de saque (posições I..VI)
// usada no início do set.
//
// Fase 1: preenche as filipetas com equipe, set e posições; refinamento
// visual na Fase 2.
// =====================================================================

import type { PDFPage } from 'pdf-lib';
import type { OrdemSaqueData, OrdemSaqueGeometry } from '../schemas/ordemSaque.schema';
import { ORDEM_SAQUE_GEOMETRY } from '../coordinates/ordemSaque.coordinates';
import { openTemplate, savePdf } from '../utils/pdfUtils';
import { drawDynamicText } from '../utils/drawText';
import { cleanTemplate, drawSystemLogo, loadFonts, mergeFieldOverrides, resolveFieldValue, type LoadedFonts } from './render';
import type { GenerationOptions } from './sumula3.generator';

export async function generateServeOrderSheet(
  data: OrdemSaqueData,
  options: GenerationOptions = {},
): Promise<Uint8Array> {
  const doc = options.templateBytes
    ? await import('pdf-lib').then(m => m.PDFDocument.load(options.templateBytes as Uint8Array, { updateMetadata: false }))
    : await openTemplate('ordem-saque');
  const page = doc.getPage(0);
  const fonts = await loadFonts(doc);
  const cardFields = mergeFieldOverrides(ORDEM_SAQUE_GEOMETRY.cardFields, options.layoutOverrides);

  cleanTemplate(page, ORDEM_SAQUE_GEOMETRY);
  await drawSystemLogo(doc, page, ORDEM_SAQUE_GEOMETRY.logoZone, options.logoBytes);
  renderCards(page, fonts, ORDEM_SAQUE_GEOMETRY, data, options.valueOverrides, cardFields);

  return savePdf(doc);
}

/**
 * Preenche cada filipeta com os dados da equipe/set correspondente.
 * Valores manuais (DocumentEdit.values) usam chave `slot<slot>.<campo>`.
 */
export function renderCards(
  page: PDFPage,
  fonts: LoadedFonts,
  geometry: OrdemSaqueGeometry,
  data: OrdemSaqueData,
  values?: Record<string, string>,
  cardFields = geometry.cardFields,
): void {
  for (const card of data.cards) {
    const slot = geometry.cardSlots[card.slot];
    if (!slot) continue;
    const valueKey = (field: string) => `slot${card.slot}.${field}`;
    const rel = (coords: (typeof cardFields)[keyof typeof cardFields]) => ({
      ...coords,
      x: slot.x + coords.x,
      y: slot.y + coords.y,
      width: coords.width ?? slot.width,
      height: coords.height,
    });

    const setNumber = resolveFieldValue(values, valueKey('setNumber'), card.setNumber);
    const teamName = resolveFieldValue(values, valueKey('teamName'), card.teamName);
    if (setNumber !== '') drawDynamicText(page, fonts.font, fonts.boldFont, setNumber, rel(cardFields.setNumber));
    if (teamName !== '') drawDynamicText(page, fonts.font, fonts.boldFont, teamName, rel(cardFields.teamName));

    const positions = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
    positions.forEach(pos => {
      const field = cardFields[`position${pos}`];
      const entry = card.positions[pos];
      if (!field) return;
      const fallback = entry ? (entry.number !== undefined ? `#${entry.number} ${entry.name}` : entry.name) : '';
      const value = resolveFieldValue(values, valueKey(`position${pos}`), fallback);
      if (value === '') return;
      drawDynamicText(page, fonts.font, fonts.boldFont, value, rel(field));
    });

    const liberoFallback = card.libero
      ? `Líbero: ${card.libero.number !== undefined ? `#${card.libero.number} ` : ''}${card.libero.name}`
      : '';
    const liberoValue = resolveFieldValue(values, valueKey('libero'), liberoFallback);
    if (liberoValue !== '') {
      drawDynamicText(page, fonts.font, fonts.boldFont, liberoValue, rel(cardFields.libero));
    }
    const coachFallback = card.coach ? `Técnico: ${card.coach}` : '';
    const coachValue = resolveFieldValue(values, valueKey('coach'), coachFallback);
    if (coachValue !== '') {
      drawDynamicText(page, fonts.font, fonts.boldFont, coachValue, rel(cardFields.coach));
    }
  }
}