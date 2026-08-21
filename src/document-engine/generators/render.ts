// =====================================================================
// Renderização compartilhada dos documentos (fase 1: campos de
// identificação sobre o header limpo + logo + observações + funções).
//
// Regra do projeto: o template é a base FIXA; aqui apenas sobrepomos
// dados. Áreas de branding de terceiros (logotipos FPV) são branqueadas
// conforme as cleanZones da geometria e o cabeçalho é redesenhado com
// dados do sistema.
// =====================================================================

import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import type { CleanZone, FieldCoords, SumulaFieldMap, SumulaGeometry } from '../schemas/sumula.schema';
import { fillRect } from '../utils/drawLine';
import { drawDynamicText, drawTextLine } from '../utils/drawText';
import type { MatchDocument, Officials } from '../schemas/match.schema';
import type { FieldLayoutOverride } from '../../types/documentEdit';

export type LoadedFonts = { font: PDFFont; boldFont: PDFFont };

/** Valor efetivo de um campo: override manual tem precedência. */
export function resolveFieldValue(
  values: Record<string, string> | undefined,
  key: string,
  fallback?: string | number,
): string {
  if (values && values[key] !== undefined) return values[key];
  return fallback === undefined ? '' : String(fallback);
}

/** Mescla os ajustes de layout (TemplateLayout) sobre a geometria base. */
export function mergeFieldOverrides(
  fields: SumulaFieldMap,
  overrides?: Record<string, FieldLayoutOverride>,
): SumulaFieldMap {
  if (!overrides) return fields;
  const merged: SumulaFieldMap = { ...fields };
  for (const [key, ov] of Object.entries(overrides)) {
    if (!ov) continue;
    const base = merged[key] ?? { x: 0, y: 0, width: 100, height: 10, fontSize: 8, align: 'left' };
    merged[key] = { ...base, ...ov } as FieldCoords;
  }
  return merged;
}

export async function loadFonts(doc: PDFDocument): Promise<LoadedFonts> {
  const [font, boldFont] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  return { font, boldFont };
}

/** Branqueia as zonas de limpeza do template (logotipos de terceiros). */
export function cleanTemplate(
  page: PDFPage,
  geometry: { cleanZones: CleanZone[] },
): void {
  for (const zone of geometry.cleanZones) {
    fillRect(page, zone);
  }
}

/** Desenha o logo do sistema (settings.documentLogo) na zona definida. */
export async function drawSystemLogo(
  doc: PDFDocument,
  page: PDFPage,
  zone: { x: number; y: number; width: number; height: number },
  logoBytes?: Uint8Array,
): Promise<void> {
  if (!logoBytes || logoBytes.length === 0 || zone.width <= 0 || zone.height <= 0) {
    return;
  }
  let image;
  if (logoBytes[0] === 0x89) {
    image = await doc.embedPng(logoBytes);
  } else if (logoBytes[0] === 0xff && logoBytes[1] === 0xd8) {
    image = await doc.embedJpg(logoBytes);
  } else {
    return;
  }
  const scale = Math.min(zone.width / image.width, zone.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x: zone.x + (zone.width - width) / 2,
    y: zone.y + (zone.height - height) / 2,
    width,
    height,
  });
}

/**
 * Desenha os campos de identificação do cabeçalho (sobre a zona limpa):
 * orgName, competitionName, categoria, gênero, nº da partida, fase,
 * rodada, formato, data, horário, local, quadra e nomes das equipes.
 * `values` (edição manual) tem precedência sobre os dados da partida.
 */
export function renderHeaderFields(
  page: PDFPage,
  geometry: SumulaGeometry,
  fonts: LoadedFonts,
  match: MatchDocument,
  orgName?: string,
  values?: Record<string, string>,
): void {
  const f = geometry.fields;
  const draw = (key: keyof typeof f, value?: string | number) => {
    const coords = f[key];
    const resolved = resolveFieldValue(values, key as string, value);
    if (coords && resolved !== '') {
      drawDynamicText(page, fonts.font, fonts.boldFont, resolved, coords);
    }
  };
  draw('orgName', orgName);
  draw('competitionName', match.competitionName);
  draw('categoryName', match.categoryName);
  draw('gender', genderLabel(match.gender));
  draw('matchNumber', match.matchNumber);
  draw('round', match.round);
  draw('phase', match.phase);
  draw('format', formatLabel(match.format));
  draw('date', match.date);
  draw('time', match.startTime);
  draw('venue', match.venue);
  draw('court', match.court);
  draw('teamAName', match.teamA.name);
  draw('teamBName', match.teamB.name);
}

/** Desenha observações, funções dos oficiais e vencedor. */
export function renderFooterFields(
  page: PDFPage,
  geometry: SumulaGeometry,
  fonts: LoadedFonts,
  observations?: string,
  officials?: Officials,
  winnerName?: string,
  values?: Record<string, string>,
): void {
  const f = geometry.fields;
  const observationsValue = resolveFieldValue(values, 'observations', observations ?? '');
  if (f.observations && observationsValue) {
    drawDynamicText(page, fonts.font, fonts.boldFont, observationsValue, f.observations);
  }
  if (f.referee1) {
    const v = resolveFieldValue(values, 'referee1', officials?.referee1 ?? '');
    if (v) drawDynamicText(page, fonts.font, fonts.boldFont, v, f.referee1);
  }
  if (f.referee2) {
    const v = resolveFieldValue(values, 'referee2', officials?.referee2 ?? '');
    if (v) drawDynamicText(page, fonts.font, fonts.boldFont, v, f.referee2);
  }
  if (f.scorer) {
    const v = resolveFieldValue(values, 'scorer', officials?.scorer ?? '');
    if (v) drawDynamicText(page, fonts.font, fonts.boldFont, v, f.scorer);
  }
  if (f.winner) {
    const v = resolveFieldValue(values, 'winner', winnerName ?? '');
    if (v) drawDynamicText(page, fonts.font, fonts.boldFont, v, f.winner);
  }
}

/** Desenha o número do set na caixa lateral do bloco. */
export function renderSetNumber(
  page: PDFPage,
  geometry: SumulaGeometry,
  fonts: LoadedFonts,
  setNumber: number,
  fieldKey: string,
): void {
  const coords = geometry.fields[fieldKey];
  if (coords) {
    drawDynamicText(page, fonts.font, fonts.boldFont, String(setNumber), coords);
  }
}

export function genderLabel(gender: MatchDocument['gender']): string {
  if (gender === 'female') return 'FEMININO';
  if (gender === 'male') return 'MASCULINO';
  return 'MISTO';
}

export function formatLabel(format: MatchDocument['format']): string {
  return format === '3-sets' ? 'MELHOR DE 3' : 'MELHOR DE 5';
}

/** Nome do jogador a partir do ID (fallback: número da camisa). */
export function playerLabel(
  players: MatchDocument['teamA']['players'],
  playerId?: string,
): string {
  if (!playerId) return '';
  const player = players.find(p => p.id === playerId);
  if (!player) return playerId;
  return player.shirtNumber !== undefined
    ? String(player.shirtNumber)
    : player.name.split(' ')[0];
}