// =====================================================================
// Renderização geométrica determinística dos documentos oficiais (FPV/CBV)
//
// Regras Fundamentais:
// 1. O layout do template é 100% IMUTÁVEL e preservado (sem caixas de fundo).
// 2. Os dados são aplicados diretamente sobre as linhas e caixas do formulário.
// 3. fitText garante que nenhum texto sobreponha ou ultrapasse suas células.
// =====================================================================

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { CleanZone, FieldCoords, SumulaFieldMap, SumulaGeometry } from '../schemas/sumula.schema';
import { fillRect, drawLine } from '../utils/drawLine';
import { drawDynamicText } from '../utils/drawText';
import type { MatchDocument, Officials } from '../schemas/match.schema';
import type { FieldLayoutOverride } from '../../types/documentEdit';

export type LoadedFonts = { font: PDFFont; boldFont: PDFFont };

/** Cria uma estrutura MatchDocument limpa para emissão de súmula oficial em branco. */
export function createEmptyMatchDocument(format: '3-sets' | '5-sets' = '3-sets'): MatchDocument {
  return {
    id: 'blank',
    matchNumber: 0,
    competitionId: '',
    competitionName: '',
    categoryName: '',
    gender: 'mixed',
    phase: '',
    round: 1,
    date: '',
    startTime: '',
    venue: '',
    format,
    status: 'DRAFT',
    teamA: {
      id: 'team-a',
      name: '',
      shortName: '',
      players: [],
      liberoPlayers: [],
    },
    teamB: {
      id: 'team-b',
      name: '',
      shortName: '',
      players: [],
      liberoPlayers: [],
    },
    lineups: [],
    sets: [],
    officials: {},
  };
}

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

/** Branqueia as zonas de limpeza do template se houver alguma definida. */
export function cleanTemplate(
  page: PDFPage,
  geometry: { cleanZones: CleanZone[] },
): void {
  for (const zone of geometry.cleanZones) {
    fillRect(page, zone);
  }
}

/** Desenha o logo do sistema na zona definida se configurado. */
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

/** Desenha a abreviação de 3 letras no quadro de equipes se aplicável. */
export function renderTeamBadges(
  page: PDFPage,
  fonts: LoadedFonts,
  match: MatchDocument,
): void {
  if (!match.teamA.name && !match.teamB.name) return;
  const abbrA = (match.teamA.shortName || match.teamA.name.slice(0, 3)).toUpperCase().slice(0, 3);
  const abbrB = (match.teamB.shortName || match.teamB.name.slice(0, 3)).toUpperCase().slice(0, 3);

  // Apenas renderiza no modelo de 3 sets (no topo da tabela EQUIPES em x: 762 e 872)
  if (page.getWidth() < 1100) {
    drawDynamicText(page, fonts.boldFont, fonts.boldFont, abbrA, {
      x: 762,
      y: 70.0,
      width: 80,
      height: 11,
      fontSize: 8.0,
      bold: true,
      align: 'center',
    });

    drawDynamicText(page, fonts.boldFont, fonts.boldFont, abbrB, {
      x: 872,
      y: 70.0,
      width: 80,
      height: 11,
      fontSize: 8.0,
      bold: true,
      align: 'center',
    });
  }
}

/**
 * Renderiza o novo cabeçalho oficial com identidade visual BaseOS,
 * logotipo vetorial, banner da competição e grid técnico de 5 colunas.
 */
export function renderHeaderFields(
  page: PDFPage,
  geometry: SumulaGeometry,
  fonts: LoadedFonts,
  match: MatchDocument,
  orgName?: string,
  values?: Record<string, string>,
): void {
  const is3Sets = page.getWidth() < 1100;
  const pageWidth = page.getWidth();
  const startX = 12;
  const startY = 8;
  const headerWidth = pageWidth - 24;
  const headerHeight = is3Sets ? 86 : 124;

  // 0. Limpeza completa da faixa do cabeçalho
  fillRect(page, { x: startX, y: startY, width: headerWidth, height: headerHeight, color: '#ffffff' });

  // Moldura Externa do Cabeçalho
  drawLine(page, { x1: startX, y1: startY, x2: startX + headerWidth, y2: startY, thickness: 0.8, color: '#000000' });
  drawLine(page, { x1: startX, y1: startY + headerHeight, x2: startX + headerWidth, y2: startY + headerHeight, thickness: 0.8, color: '#000000' });
  drawLine(page, { x1: startX, y1: startY, x2: startX, y2: startY + headerHeight, thickness: 0.8, color: '#000000' });
  drawLine(page, { x1: startX + headerWidth, y1: startY, x2: startX + headerWidth, y2: startY + headerHeight, thickness: 0.8, color: '#000000' });

  // 1. Linha Superior (Branding BaseOS + Título Oficial + Selo)
  const topBarHeight = is3Sets ? 34 : 48;
  const brandWidth = is3Sets ? 190 : 230;
  const sealWidth = is3Sets ? 160 : 190;
  const centerWidth = headerWidth - brandWidth - sealWidth;

  // ── BRANDING BASEOS (Esquerda) ──
  const logoX = startX + 8;
  const logoY = startY + (is3Sets ? 8 : 12);
  // Barras Vetoriais BaseOS Coloridas
  fillRect(page, { x: logoX, y: logoY, width: 14, height: 3.5, color: '#1e293b' });
  fillRect(page, { x: logoX + 4, y: logoY + 5.5, width: 18, height: 3.5, color: '#f59e0b' });
  fillRect(page, { x: logoX, y: logoY + 11, width: 14, height: 3.5, color: '#334155' });

  // Texto BaseOS
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, 'BaseOS', {
    x: logoX + 28,
    y: logoY + 1,
    width: 140,
    height: 14,
    fontSize: is3Sets ? 13 : 16,
    bold: true,
    align: 'left',
  });
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, 'SISTEMA OFICIAL DE COMPETIÇÕES', {
    x: logoX + 28,
    y: logoY + (is3Sets ? 12 : 15),
    width: 140,
    height: 10,
    fontSize: is3Sets ? 5.5 : 7,
    bold: true,
    align: 'left',
  });

  // Divisória vertical esquerda
  drawLine(page, {
    x1: startX + brandWidth,
    y1: startY,
    x2: startX + brandWidth,
    y2: startY + topBarHeight,
    thickness: 0.5,
    color: '#d4d4d8',
  });

  // ── CENTRO: ENTIDADE + TÍTULO DA SÚMULA ──
  const effectiveOrg = resolveFieldValue(values, 'orgName', orgName || 'FEDERAÇÃO / ENTIDADE ORGANIZADORA').toUpperCase();
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, effectiveOrg, {
    x: startX + brandWidth + 5,
    y: startY + (is3Sets ? 3 : 5),
    width: centerWidth - 10,
    height: 9,
    fontSize: is3Sets ? 7 : 8.5,
    bold: true,
    align: 'center',
  });

  drawDynamicText(page, fonts.boldFont, fonts.boldFont, 'SÚMULA OFICIAL DE VOLEIBOL', {
    x: startX + brandWidth + 5,
    y: startY + (is3Sets ? 11 : 16),
    width: centerWidth - 10,
    height: 14,
    fontSize: is3Sets ? 13 : 17,
    bold: true,
    align: 'center',
  });

  const formatSubtitle = `VÔLEI DE QUADRA • 6x6 • MELHOR DE ${match.format === '5-sets' ? '5' : '3'} SETS`;
  drawDynamicText(page, fonts.font, fonts.boldFont, formatSubtitle, {
    x: startX + brandWidth + 5,
    y: startY + (is3Sets ? 24 : 33),
    width: centerWidth - 10,
    height: 9,
    fontSize: is3Sets ? 6.5 : 8,
    align: 'center',
  });

  // Divisória vertical direita
  drawLine(page, {
    x1: startX + headerWidth - sealWidth,
    y1: startY,
    x2: startX + headerWidth - sealWidth,
    y2: startY + topBarHeight,
    thickness: 0.5,
    color: '#d4d4d8',
  });

  // ── SELO OFICIAL (Direita) ──
  const sealX = startX + headerWidth - sealWidth;
  fillRect(page, { x: sealX + 4, y: startY + 3, width: sealWidth - 8, height: topBarHeight - 6, color: '#f4f4f5' });
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, 'PADRÃO CBV / FIVB', {
    x: sealX + 6,
    y: startY + (is3Sets ? 5 : 7),
    width: sealWidth - 12,
    height: 8,
    fontSize: is3Sets ? 5.5 : 7,
    bold: true,
    align: 'center',
  });

  const matchNumVal = resolveFieldValue(values, 'matchNumber', match.matchNumber ? `JOGO Nº ${match.matchNumber}` : 'JOGO OFICIAL');
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, String(matchNumVal).startsWith('JOGO') ? String(matchNumVal) : `JOGO Nº ${matchNumVal}`, {
    x: sealX + 6,
    y: startY + (is3Sets ? 12 : 17),
    width: sealWidth - 12,
    height: 12,
    fontSize: is3Sets ? 10 : 13,
    bold: true,
    align: 'center',
  });

  drawDynamicText(page, fonts.boldFont, fonts.boldFont, 'DOCUMENTO HOMOLOGADO', {
    x: sealX + 6,
    y: startY + (is3Sets ? 23 : 32),
    width: sealWidth - 12,
    height: 8,
    fontSize: is3Sets ? 5 : 6.5,
    bold: true,
    align: 'center',
  });

  // Divisória horizontal abaixo do top bar
  drawLine(page, {
    x1: startX,
    y1: startY + topBarHeight,
    x2: startX + headerWidth,
    y2: startY + topBarHeight,
    thickness: 0.6,
    color: '#000000',
  });

  // 2. Banner da Competição e Categoria
  const bannerY = startY + topBarHeight;
  const bannerHeight = is3Sets ? 20 : 28;
  fillRect(page, { x: startX, y: bannerY, width: headerWidth, height: bannerHeight, color: '#ebebeb' });

  // Nome da Competição
  const compName = resolveFieldValue(values, 'competitionName', match.competitionName || 'COMPETIÇÃO OFICIAL').toUpperCase();
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, compName, {
    x: startX + 10,
    y: bannerY + (is3Sets ? 5 : 8),
    width: headerWidth * 0.55,
    height: 12,
    fontSize: is3Sets ? 9.5 : 12,
    bold: true,
    align: 'left',
  });

  // Categoria e Naipe
  const catName = resolveFieldValue(values, 'categoryName', match.categoryName || 'LIVRE').toUpperCase();
  const genderStr = match.gender === 'male' ? 'MASCULINO' : match.gender === 'female' ? 'FEMININO' : 'MISTO';
  const catNaipeText = `CATEGORIA: ${catName} • NAIPE: ${genderStr}`;
  drawDynamicText(page, fonts.boldFont, fonts.boldFont, catNaipeText, {
    x: startX + headerWidth * 0.55,
    y: bannerY + (is3Sets ? 5 : 8),
    width: headerWidth * 0.43,
    height: 12,
    fontSize: is3Sets ? 8 : 10,
    bold: true,
    align: 'right',
  });

  // Divisória horizontal abaixo do banner
  drawLine(page, {
    x1: startX,
    y1: bannerY + bannerHeight,
    x2: startX + headerWidth,
    y2: bannerY + bannerHeight,
    thickness: 0.6,
    color: '#000000',
  });

  // 3. Grid de Metadados Técnicos em 5 Colunas
  const metaY = bannerY + bannerHeight;
  const metaHeight = headerHeight - topBarHeight - bannerHeight;
  const colWidth = headerWidth / 5;

  fillRect(page, { x: startX, y: metaY, width: headerWidth, height: metaHeight, color: '#fbfbfb' });

  for (let i = 1; i < 5; i++) {
    drawLine(page, {
      x1: startX + colWidth * i,
      y1: metaY,
      x2: startX + colWidth * i,
      y2: metaY + metaHeight,
      thickness: 0.4,
      color: '#d4d4d8',
    });
  }

  const metaItems = [
    {
      label: 'FASE / CHAVE',
      val: resolveFieldValue(values, 'phase', match.phase || 'Classificatória') + (values?.groupName ? ` (${values.groupName})` : ''),
    },
    {
      label: 'DATA E HORÁRIO',
      val: `${resolveFieldValue(values, 'date', match.date || '--')} às ${resolveFieldValue(values, 'time', match.startTime || '--')}`,
    },
    {
      label: 'GINÁSIO / LOCAL',
      val: resolveFieldValue(values, 'venue', match.venue || 'Ginásio Oficial'),
    },
    {
      label: 'QUADRA',
      val: match.court || 'Principal',
    },
    {
      label: 'CIDADE / UF',
      val: resolveFieldValue(values, 'city', match.teamA?.city ? `${match.teamA.city}${match.teamA.state ? ' / ' + match.teamA.state : ''}` : (match.city || 'Sede')),
    },
  ];

  metaItems.forEach((item, idx) => {
    const colX = startX + colWidth * idx;
    // Label
    drawDynamicText(page, fonts.boldFont, fonts.boldFont, item.label, {
      x: colX + 4,
      y: metaY + (is3Sets ? 3 : 5),
      width: colWidth - 8,
      height: 8,
      fontSize: is3Sets ? 5.5 : 7,
      bold: true,
      align: 'left',
    });
    // Valor
    drawDynamicText(page, fonts.boldFont, fonts.boldFont, item.val, {
      x: colX + 4,
      y: metaY + (is3Sets ? 11 : 16),
      width: colWidth - 8,
      height: 12,
      fontSize: is3Sets ? 7.5 : 9.5,
      bold: true,
      align: 'left',
    });
  });
}

/**
 * Desenha a relação nominal completa de atletas e comissão técnica no quadro EQUIPES.
 * As assinaturas permanecem 100% em branco para aposição manual de assinaturas físicas.
 */
export function renderRostersAndStaff(
  page: PDFPage,
  fonts: LoadedFonts,
  match: MatchDocument,
  values?: Record<string, string>,
): void {
  const is3Sets = page.getWidth() < 1100;

  const regularPlayersA = match.teamA.players.filter(p => !match.teamA.liberoPlayers?.some(l => l.id === p.id)).slice(0, 12);
  const regularPlayersB = match.teamB.players.filter(p => !match.teamB.liberoPlayers?.some(l => l.id === p.id)).slice(0, 12);
  const liberosA = (match.teamA.liberoPlayers || []).slice(0, 2);
  const liberosB = (match.teamB.liberoPlayers || []).slice(0, 2);

  const captainAId = match.teamA.captainId || regularPlayersA.find(p => p.isCaptain)?.id || regularPlayersA[0]?.id;
  const captainBId = match.teamB.captainId || regularPlayersB.find(p => p.isCaptain)?.id || regularPlayersB[0]?.id;

  if (is3Sets) {
    // ── Modelo de 3 Sets (Tabela lateral superior direita) ─────────────
    const athleteRowYs = [
      92.0, 102.5, 113.0, 123.5, 134.0, 144.5,
      155.0, 165.5, 176.0, 186.5, 197.0, 207.5
    ];

    // Atletas Equipe A
    regularPlayersA.forEach((p, idx) => {
      const yTop = athleteRowYs[idx];
      const isCaptain = p.id === captainAId;
      const num = p.shirtNumber !== undefined ? String(p.shirtNumber).padStart(2, '0') : String(idx + 1).padStart(2, '0');
      const name = `${p.name}${isCaptain ? ' (C)' : ''}`;

      drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
        x: 752, y: yTop, width: 12, height: 9.5, fontSize: 6.5, bold: true, align: 'center',
      });
      drawDynamicText(page, fonts.font, fonts.boldFont, name, {
        x: 766, y: yTop, width: 98, height: 9.5, fontSize: 6.5, bold: isCaptain, align: 'left',
      });
    });

    // Atletas Equipe B
    regularPlayersB.forEach((p, idx) => {
      const yTop = athleteRowYs[idx];
      const isCaptain = p.id === captainBId;
      const num = p.shirtNumber !== undefined ? String(p.shirtNumber).padStart(2, '0') : String(idx + 1).padStart(2, '0');
      const name = `${p.name}${isCaptain ? ' (C)' : ''}`;

      drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
        x: 868, y: yTop, width: 12, height: 9.5, fontSize: 6.5, bold: true, align: 'center',
      });
      drawDynamicText(page, fonts.font, fonts.boldFont, name, {
        x: 882, y: yTop, width: 98, height: 9.5, fontSize: 6.5, bold: isCaptain, align: 'left',
      });
    });

    // Líberos
    const liberoRowYs = [218.0, 229.0];
    liberosA.forEach((l, idx) => {
      const yTop = liberoRowYs[idx];
      const num = l.shirtNumber !== undefined ? String(l.shirtNumber).padStart(2, '0') : '';
      drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
        x: 752, y: yTop, width: 12, height: 9.5, fontSize: 6.5, bold: true, align: 'center',
      });
      drawDynamicText(page, fonts.boldFont, fonts.boldFont, `${l.name} (L)`, {
        x: 766, y: yTop, width: 98, height: 9.5, fontSize: 6.5, bold: true, align: 'left',
      });
    });

    liberosB.forEach((l, idx) => {
      const yTop = liberoRowYs[idx];
      const num = l.shirtNumber !== undefined ? String(l.shirtNumber).padStart(2, '0') : '';
      drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
        x: 868, y: yTop, width: 12, height: 9.5, fontSize: 6.5, bold: true, align: 'center',
      });
      drawDynamicText(page, fonts.boldFont, fonts.boldFont, `${l.name} (L)`, {
        x: 882, y: yTop, width: 98, height: 9.5, fontSize: 6.5, bold: true, align: 'left',
      });
    });

    // Comissão Técnica
    if (match.teamA.coach) {
      drawDynamicText(page, fonts.font, fonts.boldFont, match.teamA.coach, {
        x: 748, y: 245.0, width: 114, height: 9.5, fontSize: 6.0, align: 'left',
      });
    }
    if (match.teamB.coach) {
      drawDynamicText(page, fonts.font, fonts.boldFont, match.teamB.coach, {
        x: 866, y: 245.0, width: 114, height: 9.5, fontSize: 6.0, align: 'left',
      });
    }
    if (match.teamA.assistantCoach) {
      drawDynamicText(page, fonts.font, fonts.boldFont, match.teamA.assistantCoach, {
        x: 748, y: 255.0, width: 114, height: 9.5, fontSize: 6.0, align: 'left',
      });
    }
    if (match.teamB.assistantCoach) {
      drawDynamicText(page, fonts.font, fonts.boldFont, match.teamB.assistantCoach, {
        x: 866, y: 255.0, width: 114, height: 9.5, fontSize: 6.0, align: 'left',
      });
    }
  } else {
    // ── Modelo de 5 Sets (Tabela EQUIPES na Linha 3 x: 740-1160, y: 470-600) ───
    const athleteRowYs5 = [
      480.0, 490.5, 501.0, 511.5, 522.0, 532.5,
      543.0, 553.5, 564.0, 574.5, 585.0, 595.5
    ];

    // Atletas Equipe A
    regularPlayersA.forEach((p, idx) => {
      const yTop = athleteRowYs5[idx];
      const isCaptain = p.id === captainAId;
      const num = p.shirtNumber !== undefined ? String(p.shirtNumber).padStart(2, '0') : String(idx + 1).padStart(2, '0');
      const name = `${p.name}${isCaptain ? ' (C)' : ''}`;

      drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
        x: 745, y: yTop, width: 16, height: 9.5, fontSize: 7.0, bold: true, align: 'center',
      });
      drawDynamicText(page, fonts.font, fonts.boldFont, name, {
        x: 763, y: yTop, width: 175, height: 9.5, fontSize: 7.0, bold: isCaptain, align: 'left',
      });
    });

    // Atletas Equipe B
    regularPlayersB.forEach((p, idx) => {
      const yTop = athleteRowYs5[idx];
      const isCaptain = p.id === captainBId;
      const num = p.shirtNumber !== undefined ? String(p.shirtNumber).padStart(2, '0') : String(idx + 1).padStart(2, '0');
      const name = `${p.name}${isCaptain ? ' (C)' : ''}`;

      drawDynamicText(page, fonts.boldFont, fonts.boldFont, num, {
        x: 953, y: yTop, width: 16, height: 9.5, fontSize: 7.0, bold: true, align: 'center',
      });
      drawDynamicText(page, fonts.font, fonts.boldFont, name, {
        x: 971, y: yTop, width: 175, height: 9.5, fontSize: 7.0, bold: isCaptain, align: 'left',
      });
    });

    // Comissão Técnica 5 Sets (Faixa inferior direita y: 645-740)
    if (match.teamA.coach) {
      drawDynamicText(page, fonts.font, fonts.boldFont, match.teamA.coach, {
        x: 875, y: 646.0, width: 130, height: 10, fontSize: 7.5, align: 'left',
      });
    }
    if (match.teamB.coach) {
      drawDynamicText(page, fonts.font, fonts.boldFont, match.teamB.coach, {
        x: 1025, y: 646.0, width: 130, height: 10, fontSize: 7.5, align: 'left',
      });
    }
  }
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