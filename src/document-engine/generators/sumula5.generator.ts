// =====================================================================
// Gerador da SÚMULA 5 SETS (template FPV 1190×841 pts fixo).
//
// Fase 1: carrega o template, limpa o branding, desenha o cabeçalho,
// os 5 blocos de set (número, placar, ordem de saque) e o rodapé.
// =====================================================================

import type { PDFDocument, PDFPage } from 'pdf-lib';
import type { SumulaData, SumulaFieldMap } from '../schemas/sumula.schema';
import {
  SUMULA5_GEOMETRY,
  SUMULA5_SET_LABELS,
  SUMULA5_TEAM_GRIDS,
} from '../coordinates/sumula5.coordinates';
import { openTemplate, savePdf } from '../utils/pdfUtils';
import { drawDynamicText } from '../utils/drawText';
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
import type { GenerationOptions } from './sumula3.generator';

export async function generateFiveSetScoresheet(
  data: SumulaData,
  options: GenerationOptions = {},
): Promise<Uint8Array> {
  const doc = options.templateBytes
    ? await import('pdf-lib').then(m => m.PDFDocument.load(options.templateBytes as Uint8Array, { updateMetadata: false }))
    : await openTemplate('sumula5');
  const page = doc.getPage(0);
  const fonts = await loadFonts(doc);
  const values = options.valueOverrides;
  const fields = mergeFieldOverrides(SUMULA5_GEOMETRY.fields, options.layoutOverrides);
  const geometry = { ...SUMULA5_GEOMETRY, fields };

  cleanTemplate(page, SUMULA5_GEOMETRY);
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

/** Desenha os 5 blocos de set (número, placar e ordem de saque). */
export function renderSetBlocks(
  page: PDFPage,
  fonts: LoadedFonts,
  data: SumulaData,
  values?: Record<string, string>,
  fields: SumulaFieldMap = SUMULA5_GEOMETRY.fields,
): void {
  for (const label of SUMULA5_SET_LABELS) {
    const setData = data.match.sets.find(s => s.number === label.set);
    const setSection = data.sets.find(s => s.number === label.set);
    if (!setData || !setSection) continue;

    const pointsACoords = fields[`pointsA${label.set}`];
    const pointsBCoords = fields[`pointsB${label.set}`];
    if (pointsACoords) {
      const v = resolveFieldValue(values, `pointsA${label.set}`, setData.pointsA);
      if (v !== '') drawDynamicText(page, fonts.font, fonts.boldFont, v, pointsACoords);
    }
    if (pointsBCoords) {
      const v = resolveFieldValue(values, `pointsB${label.set}`, setData.pointsB);
      if (v !== '') drawDynamicText(page, fonts.font, fonts.boldFont, v, pointsBCoords);
    }

    renderLineupCells(page, fonts, data, label.set, setData.lineupA, 'A', values, fields);
    renderLineupCells(page, fonts, data, label.set, setData.lineupB, 'B', values, fields);
  }
}

/** Desenha o número da camisa em cada posição I..VI da equipe. */
function renderLineupCells(
  page: PDFPage,
  fonts: LoadedFonts,
  data: SumulaData,
  setNumber: number,
  lineup: SumulaData['match']['sets'][number]['lineupA'],
  side: 'A' | 'B',
  values?: Record<string, string>,
  fields: SumulaFieldMap = SUMULA5_GEOMETRY.fields,
): void {
  if (!lineup) return;
  const team = side === 'A' ? data.match.teamA : data.match.teamB;
  const grid = side === 'A' ? SUMULA5_TEAM_GRIDS.A : SUMULA5_TEAM_GRIDS.B;
  const positions = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
  positions.forEach((pos, i) => {
    const key = `lineup${side}${setNumber}${pos}`;
    const coords = fields[key] ?? {
      x: grid.x + 2 + i * 29.8,
      y: grid.y + 3,
      width: 28,
      height: 12,
      fontSize: 8,
      align: 'center' as const,
      bold: true,
    };
    const value = resolveFieldValue(values, key, playerLabel(team.players, lineup.positions[pos]));
    if (value === '') return;
    drawDynamicText(page, fonts.font, fonts.boldFont, value, coords);
  });
}