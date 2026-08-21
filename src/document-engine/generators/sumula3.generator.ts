// =====================================================================
// Gerador da SÚMULA 3 SETS (template FPV 992×566 pts fixo).
//
// Fase 1: carrega o template, limpa o branding de terceiros, desenha o
// cabeçalho, os 3 blocos de set (número, placar, ordem de saque das
// equipes) e o rodapé (observações, funções dos oficiais, vencedor).
// O alinhamento fino dos campos é refinado na Fase 2 (diff visual).
//
// Suporte a edição manual (Editor de Documentos): layoutOverrides
// ajusta posição/tamanho/fonte dos campos e valueOverrides sobrescreve
// o conteúdo renderizado — ambos persistidos via dataAccess.
// =====================================================================

import type { PDFDocument, PDFPage } from 'pdf-lib';
import type { SumulaData } from '../schemas/sumula.schema';
import { SET_BANDS, SUMULA3_GEOMETRY } from '../coordinates/sumula3.coordinates';
import { openTemplate, savePdf } from '../utils/pdfUtils';
import { drawDynamicText } from '../utils/drawText';
import type { FieldLayoutOverride } from '../../types/documentEdit';
import {
  cleanTemplate,
  drawSystemLogo,
  loadFonts,
  mergeFieldOverrides,
  playerLabel,
  renderFooterFields,
  renderHeaderFields,
  resolveFieldValue,
  type LoadedFonts,
} from './render';

export type GenerationOptions = {
  /** Bytes do template (útil em testes); se ausente, carrega do disco. */
  templateBytes?: Uint8Array;
  /** Logo do sistema (settings.documentLogo) — PNG/JPEG; opcional. */
  logoBytes?: Uint8Array;
  /** Ajustes de layout (TemplateLayout) aplicados à geometria base. */
  layoutOverrides?: Record<string, FieldLayoutOverride>;
  /** Sobrescrita manual de conteúdo por campo (DocumentEdit.values). */
  valueOverrides?: Record<string, string>;
};

export async function generateThreeSetScoresheet(
  data: SumulaData,
  options: GenerationOptions = {},
): Promise<Uint8Array> {
  const doc = options.templateBytes
    ? await import('pdf-lib').then(m => m.PDFDocument.load(options.templateBytes as Uint8Array, { updateMetadata: false }))
    : await openTemplate('sumula3');
  const page = doc.getPage(0);
  const fonts = await loadFonts(doc);
  const values = options.valueOverrides;
  const fields = mergeFieldOverrides(SUMULA3_GEOMETRY.fields, options.layoutOverrides);
  const geometry = { ...SUMULA3_GEOMETRY, fields };

  cleanTemplate(page, SUMULA3_GEOMETRY);
  await drawSystemLogo(doc, page, geometry.logoZone, options.logoBytes);
  renderHeaderFields(page, geometry, fonts, data.match, data.orgName, values);
  renderSetBlocks(page, fonts, data, values, fields);

  const winnerName = data.winnerTeamId
    ? data.winnerTeamId === data.match.teamA.id
      ? data.match.teamA.name
      : data.match.teamB.name
    : undefined;
  renderFooterFields(
    page,
    geometry,
    fonts,
    data.observations ?? data.match.observations,
    data.officials,
    winnerName,
    values,
  );

  return savePdf(doc);
}

/** Desenha número, placar e ordem de saque de cada bloco de set. */
export function renderSetBlocks(
  page: PDFPage,
  fonts: LoadedFonts,
  data: SumulaData,
  values?: Record<string, string>,
  fields = SUMULA3_GEOMETRY.fields,
): void {
  for (const band of SET_BANDS) {
    const setSection = data.sets.find(s => s.number === band.set);
    const setData = data.match.sets.find(s => s.number === band.set);
    if (!setSection || !setData) continue;

    const pointsACoords = fields[band.set === 1 ? 'pointsA' : band.set === 2 ? 'pointsA2' : 'pointsA3'];
    const pointsBCoords = fields[band.set === 1 ? 'pointsB' : band.set === 2 ? 'pointsB2' : 'pointsB3'];
    if (pointsACoords) {
      const v = resolveFieldValue(values, band.set === 1 ? 'pointsA' : band.set === 2 ? 'pointsA2' : 'pointsA3', setData.pointsA);
      if (v !== '') drawDynamicText(page, fonts.font, fonts.boldFont, v, pointsACoords);
    }
    if (pointsBCoords) {
      const v = resolveFieldValue(values, band.set === 1 ? 'pointsB' : band.set === 2 ? 'pointsB2' : 'pointsB3', setData.pointsB);
      if (v !== '') drawDynamicText(page, fonts.font, fonts.boldFont, v, pointsBCoords);
    }

    renderLineupCells(page, fonts, data, band.set, setData.lineupA, 'lineupA', values, fields);
    renderLineupCells(page, fonts, data, band.set, setData.lineupB, 'lineupB', values, fields);
  }
}

/** Desenha o número da camisa em cada posição I..VI da equipe. */
function renderLineupCells(
  page: PDFPage,
  fonts: LoadedFonts,
  data: SumulaData,
  setNumber: number,
  lineup: SumulaData['match']['sets'][number]['lineupA'],
  prefix: 'lineupA' | 'lineupB',
  values?: Record<string, string>,
  fields = SUMULA3_GEOMETRY.fields,
): void {
  if (!lineup) return;
  const team = prefix === 'lineupA' ? data.match.teamA : data.match.teamB;
  for (const pos of ['I', 'II', 'III', 'IV', 'V', 'VI'] as const) {
    const key = `${prefix}${setNumber}${pos}`;
    const coords = fields[key];
    if (!coords) continue;
    const value = resolveFieldValue(values, key, playerLabel(team.players, lineup.positions[pos]));
    if (value === '') continue;
    drawDynamicText(page, fonts.font, fonts.boldFont, value, coords);
  }
}