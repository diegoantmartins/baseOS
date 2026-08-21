// =====================================================================
// Renderização compartilhada dos documentos oficiais (FPV/CBV)
//
// Regra: O template fixo é a base regulamentar oficial; o cabeçalho
// superior é desenhado em vetor de alta definição VolleyPro e todos
// os dados de atletas, líberos e comissão técnica são encaixados
// cirurgicamente em suas respectivas células.
//
// CONDIÇÕES OFICIAIS:
// 1. As designações A e B e campos de abreviação NÃO são pré-fixados.
// 2. Os campos de assinatura permanecem 100% EM BRANCO para assinatura física.
// 3. Apenas a comissão técnica (T e AT1) é pré-preenchida do cadastro.
// =====================================================================

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { CleanZone, FieldCoords, SumulaFieldMap, SumulaGeometry } from '../schemas/sumula.schema';
import { fillRect } from '../utils/drawLine';
import { drawDynamicText } from '../utils/drawText';
import type { MatchDocument, Officials } from '../schemas/match.schema';
import type { FieldLayoutOverride } from '../../types/documentEdit';

export type LoadedFonts = { font: PDFFont; boldFont: PDFFont };

const NAVY = rgb(0.06, 0.16, 0.28);
const LIGHT_BG = rgb(0.97, 0.98, 1);
const BORDER_GRAY = rgb(0.72, 0.78, 0.86);
const TEXT_DARK = rgb(0.1, 0.15, 0.2);
const TEXT_MUTED = rgb(0.4, 0.5, 0.6);
const WHITE = rgb(1, 1, 1);

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

/** Branqueia as zonas de limpeza do template. */
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

/** Desenha a abreviação oficial de 3 letras de cada equipe dentro das caixas dedicadas no quadro EQUIPES. */
export function renderTeamBadges(
  page: PDFPage,
  fonts: LoadedFonts,
  match: MatchDocument,
): void {
  const abbrA = (match.teamA.shortName || match.teamA.name.slice(0, 3)).toUpperCase().slice(0, 3);
  const abbrB = (match.teamB.shortName || match.teamB.name.slice(0, 3)).toUpperCase().slice(0, 3);

  // Sigla Equipe 1 (centralizada na caixa da equipe A)
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, abbrA, {
    x: 765,
    y: 120.5,
    width: 82,
    height: 12,
    fontSize: 10,
    bold: true,
    align: 'center',
  });

  // Sigla Equipe 2 (centralizada na caixa da equipe B)
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, abbrB, {
    x: 875,
    y: 120.5,
    width: 82,
    height: 12,
    fontSize: 10,
    bold: true,
    align: 'center',
  });
}

/**
 * Desenha o cabeçalho superior completo de alta resolução vetorial VolleyPro.
 */
export function renderHeaderFields(
  page: PDFPage,
  geometry: SumulaGeometry,
  fonts: LoadedFonts,
  match: MatchDocument,
  orgName?: string,
  values?: Record<string, string>,
): void {
  const toPdfY = (yTop: number) => 566 - yTop;

  // 1. Top Bar Dark Navy (y: 10 a 36)
  page.drawRectangle({
    x: 18,
    y: toPdfY(36),
    width: 966,
    height: 26,
    color: NAVY,
  });
  page.drawText('VOLLEYPRO', { x: 30, y: toPdfY(29), size: 14, font: fonts.boldFont, color: WHITE });
  page.drawText('SÚMULA OFICIAL DE VOLEIBOL DE QUADRA', { x: 130, y: toPdfY(28), size: 9, font: fonts.boldFont, color: rgb(0.7, 0.85, 1) });
  
  const formatText = match.format === '5-sets' ? '3 DE 5 SETS' : '2 DE 3 SETS';
  const formatWidth = fonts.boldFont.widthOfTextAtSize(formatText, 8.5);
  page.drawText(formatText, { x: 964 - formatWidth, y: toPdfY(28), size: 8.5, font: fonts.boldFont, color: rgb(0.7, 0.85, 1) });

  // 2. Grid de Dados da Partida (y: 40 a 66)
  // Box 1: Competição
  page.drawRectangle({ x: 18, y: toPdfY(66), width: 270, height: 26, color: LIGHT_BG, borderColor: BORDER_GRAY, borderWidth: 0.8 });
  page.drawText('COMPETIÇÃO', { x: 24, y: toPdfY(49), size: 6, font: fonts.boldFont, color: TEXT_MUTED });
  page.drawText(match.competitionName, { x: 24, y: toPdfY(60), size: 8.5, font: fonts.boldFont, color: TEXT_DARK });

  // Box 2: Local e Cidade
  const venueText = match.court ? `${match.venue} (${match.court})` : match.venue;
  const defaultCity = match.teamA?.city
    ? `${match.teamA.city}${match.teamA.state ? ' / ' + match.teamA.state : ''}`
    : 'Toledo / PR';
  const cityText = resolveFieldValue(values, 'city', defaultCity);
  page.drawRectangle({ x: 292, y: toPdfY(66), width: 273, height: 26, color: LIGHT_BG, borderColor: BORDER_GRAY, borderWidth: 0.8 });
  page.drawText('GINÁSIO / CIDADE', { x: 298, y: toPdfY(49), size: 6, font: fonts.boldFont, color: TEXT_MUTED });
  page.drawText(`${venueText} - ${cityText}`, { x: 298, y: toPdfY(60), size: 8, font: fonts.boldFont, color: TEXT_DARK });

  // Box 3: Metadados Jogo (x: 570 a 984) com 4 colunas estritamente separadas
  page.drawRectangle({ x: 570, y: toPdfY(66), width: 414, height: 26, color: LIGHT_BG, borderColor: BORDER_GRAY, borderWidth: 0.8 });
  page.drawLine({ start: { x: 618, y: toPdfY(66) }, end: { x: 618, y: toPdfY(40) }, thickness: 0.5, color: rgb(0.85, 0.88, 0.92) });
  page.drawLine({ start: { x: 718, y: toPdfY(66) }, end: { x: 718, y: toPdfY(40) }, thickness: 0.5, color: rgb(0.85, 0.88, 0.92) });
  page.drawLine({ start: { x: 840, y: toPdfY(66) }, end: { x: 840, y: toPdfY(40) }, thickness: 0.5, color: rgb(0.85, 0.88, 0.92) });

  // Sub 1: JOGO
  page.drawText('JOGO', { x: 576, y: toPdfY(49), size: 6, font: fonts.boldFont, color: TEXT_MUTED });
  page.drawText(`Nº ${match.matchNumber ? String(match.matchNumber).padStart(2, '0') : '01'}`, { x: 576, y: toPdfY(60), size: 8.5, font: fonts.boldFont, color: NAVY });

  // Sub 2: FASE
  const phaseClean = (match.phase || 'Fase de Grupos').slice(0, 16);
  page.drawText('FASE', { x: 624, y: toPdfY(49), size: 6, font: fonts.boldFont, color: TEXT_MUTED });
  page.drawText(phaseClean, { x: 624, y: toPdfY(60), size: 7.5, font: fonts.boldFont, color: TEXT_DARK });

  // Sub 3: DATA / HORA
  page.drawText('DATA / HORA', { x: 724, y: toPdfY(49), size: 6, font: fonts.boldFont, color: TEXT_MUTED });
  page.drawText(`${match.date} ${match.startTime ? '- ' + match.startTime : ''}`, { x: 724, y: toPdfY(60), size: 7.5, font: fonts.boldFont, color: TEXT_DARK });

  // Sub 4: CATEGORIA / SEXO
  const genderName = match.gender === 'female' ? 'Feminino' : match.gender === 'male' ? 'Masculino' : 'Misto';
  const catText = `${match.categoryName || 'Adulto'} | ${genderName}`.slice(0, 22);
  page.drawText('CATEGORIA / SEXO', { x: 846, y: toPdfY(49), size: 6, font: fonts.boldFont, color: TEXT_MUTED });
  page.drawText(catText, { x: 846, y: toPdfY(60), size: 7.5, font: fonts.boldFont, color: TEXT_DARK });

  // 3. Linha de Confronto (y: 69 a 96, x: 18 a 984) — Limpa com nomes completos das equipes
  page.drawRectangle({ x: 18, y: toPdfY(96), width: 966, height: 27, color: rgb(0.92, 0.96, 1), borderColor: BORDER_GRAY, borderWidth: 0.8 });

  // Nome Equipe 1
  page.drawText(match.teamA.name, { x: 35, y: toPdfY(86), size: 12, font: fonts.boldFont, color: NAVY });

  // VS Central
  page.drawText('VS', { x: 490, y: toPdfY(86), size: 10, font: fonts.boldFont, color: rgb(0.3, 0.4, 0.6) });

  // Nome Equipe 2
  const nameBWidth = fonts.boldFont.widthOfTextAtSize(match.teamB.name, 12);
  page.drawText(match.teamB.name, { x: 966 - 17 - nameBWidth, y: toPdfY(86), size: 12, font: fonts.boldFont, color: NAVY });
}

/**
 * Desenha a relação nominal completa de atletas e comissão técnica no quadro EQUIPES (linhas 143 a 360).
 * As assinaturas permanecem 100% em branco para assinatura física dos envolvidos.
 */
export function renderRostersAndStaff(
  page: PDFPage,
  fonts: LoadedFonts,
  match: MatchDocument,
  values?: Record<string, string>,
): void {
  const regularPlayersA = match.teamA.players.filter(p => !match.teamA.liberoPlayers?.some(l => l.id === p.id)).slice(0, 12);
  const regularPlayersB = match.teamB.players.filter(p => !match.teamB.liberoPlayers?.some(l => l.id === p.id)).slice(0, 12);
  const liberosA = (match.teamA.liberoPlayers || []).slice(0, 2);
  const liberosB = (match.teamB.liberoPlayers || []).slice(0, 2);

  const captainAId = match.teamA.captainId || regularPlayersA.find(p => p.isCaptain)?.id || regularPlayersA[0]?.id;
  const captainBId = match.teamB.captainId || regularPlayersB.find(p => p.isCaptain)?.id || regularPlayersB[0]?.id;

  // Y exato de cada uma das 12 linhas da tabela de atletas (centrado em cada célula)
  const athleteRowYs = [
    143.5, 154.0, 164.5, 175.5, 186.0, 196.5,
    207.5, 218.0, 228.5, 239.5, 250.0, 260.5,
  ];

  // Atletas Regulares Equipe 1
  regularPlayersA.forEach((p, idx) => {
    const yTop = athleteRowYs[idx];
    const isCaptain = p.id === captainAId;
    const num = p.shirtNumber !== undefined ? String(p.shirtNumber).padStart(2, '0') : String(idx + 1).padStart(2, '0');
    const name = `${p.name}${isCaptain ? ' (C)' : ''}`;

    drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
      x: 751, y: yTop, width: 13, height: 9, fontSize: 7, bold: true, align: 'center',
    });
    drawDynamicText(page, fonts.font, fonts.boldFont, name, {
      x: 765, y: yTop, width: 98, height: 9, fontSize: 6.8, bold: isCaptain, align: 'left',
    });
  });

  // Atletas Regulares Equipe 2
  regularPlayersB.forEach((p, idx) => {
    const yTop = athleteRowYs[idx];
    const isCaptain = p.id === captainBId;
    const num = p.shirtNumber !== undefined ? String(p.shirtNumber).padStart(2, '0') : String(idx + 1).padStart(2, '0');
    const name = `${p.name}${isCaptain ? ' (C)' : ''}`;

    drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
      x: 869, y: yTop, width: 13, height: 9, fontSize: 7, bold: true, align: 'center',
    });
    drawDynamicText(page, fonts.font, fonts.boldFont, name, {
      x: 883, y: yTop, width: 98, height: 9, fontSize: 6.8, bold: isCaptain, align: 'left',
    });
  });

  // Líberos (L1 em 271.5, L2 em 282.5)
  const liberoRowYs = [271.5, 282.5];
  liberosA.forEach((l, idx) => {
    const yTop = liberoRowYs[idx];
    const num = l.shirtNumber !== undefined ? String(l.shirtNumber).padStart(2, '0') : '';
    drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
      x: 751, y: yTop, width: 13, height: 9, fontSize: 7, bold: true, align: 'center',
    });
    drawDynamicText(page, fonts.boldFont, fonts.boldFont, `${l.name} (L)`, {
      x: 765, y: yTop, width: 98, height: 9, fontSize: 6.8, bold: true, align: 'left',
    });
  });

  liberosB.forEach((l, idx) => {
    const yTop = liberoRowYs[idx];
    const num = l.shirtNumber !== undefined ? String(l.shirtNumber).padStart(2, '0') : '';
    drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
      x: 869, y: yTop, width: 13, height: 9, fontSize: 7, bold: true, align: 'center',
    });
    drawDynamicText(page, fonts.boldFont, fonts.boldFont, `${l.name} (L)`, {
      x: 883, y: yTop, width: 98, height: 9, fontSize: 6.8, bold: true, align: 'left',
    });
  });

  // Comissão Técnica (T: 299.0, AT1: 309.0) — preenchida diretamente do cadastro da equipe
  if (match.teamA.coach) {
    drawDynamicText(page, fonts.font, fonts.boldFont, match.teamA.coach, {
      x: 750, y: 299.0, width: 114, height: 9, fontSize: 6.5, align: 'left',
    });
  }
  if (match.teamB.coach) {
    drawDynamicText(page, fonts.font, fonts.boldFont, match.teamB.coach, {
      x: 868, y: 299.0, width: 114, height: 9, fontSize: 6.5, align: 'left',
    });
  }

  if (match.teamA.assistantCoach) {
    drawDynamicText(page, fonts.font, fonts.boldFont, match.teamA.assistantCoach, {
      x: 750, y: 309.0, width: 114, height: 9, fontSize: 6.5, align: 'left',
    });
  }
  if (match.teamB.assistantCoach) {
    drawDynamicText(page, fonts.font, fonts.boldFont, match.teamB.assistantCoach, {
      x: 868, y: 309.0, width: 114, height: 9, fontSize: 6.5, align: 'left',
    });
  }

  // NOTA: Os campos de assinatura (Capitão e Técnico) são intencionalmente
  // mantidos em branco para a assinatura física dos envolvidos no jogo.
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
  return 'X';
}

export function formatLabel(format: MatchDocument['format']): string {
  return '';
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