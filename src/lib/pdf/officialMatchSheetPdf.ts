// =====================================================================
// Súmula Oficial de Voleibol — Reprodução fiel da estrutura oficial
// (padrão FPV/CBV) com identidade 100% nativa em A4 Paisagem (297 × 210 mm).
//
// Documentos suportados:
//  • Súmula 3 sets  → A4 paisagem (297 × 210 mm)
//  • Súmula 5 sets  → A4 paisagem (297 × 210 mm)
//  • Fichas de Posição / Ordem de Saque → A4 paisagem (8 filipetas/folha)
//
// Todas as coordenadas estão em milímetros (mm).
// =====================================================================

import jsPDF from 'jspdf';
import type { MatchSheetData } from './matchSheetPdf';
import {
  SHEET3_A4,
  SHEET5_A4,
  PAGE_A4_LANDSCAPE,
  PRINT_MARGIN,
  drawDebugGrid,
  type Rect,
} from './scoresheetLayout';

// ── colors ──────────────────────────────────────────────────────────
const INK = '#000000';
const DARK = '#1a1a1a';
const GRAY = '#555555';
const LGRAY = '#999999';
const BG = '#f0f0f0';
const WHITE = '#ffffff';

// ── helpers ─────────────────────────────────────────────────────────
function ln(d: jsPDF, x1: number, y1: number, x2: number, y2: number, w = 0.25, c = INK) {
  d.setDrawColor(c); d.setLineWidth(w); d.line(x1, y1, x2, y2);
}
function bx(d: jsPDF, x: number, y: number, w: number, h: number, lw = 0.3) {
  d.setDrawColor(INK); d.setLineWidth(lw); d.rect(x, y, w, h, 'S');
}
function fbx(d: jsPDF, x: number, y: number, w: number, h: number, c: string) {
  d.setFillColor(c); d.rect(x, y, w, h, 'F');
}
function tx(d: jsPDF, s: string, x: number, y: number, sz: number,
  o: { a?: 'left' | 'center' | 'right'; c?: string; b?: boolean } = {}) {
  d.setFont('helvetica', o.b ? 'bold' : 'normal');
  d.setFontSize(sz);
  d.setTextColor(o.c ?? INK);
  d.text(s, x, y, { align: o.a ?? 'left' });
}
function grid(d: jsPDF, x: number, y: number, w: number, h: number, cols: number, rows: number, lw = 0.2) {
  const cw = w / cols, rh = h / rows;
  for (let c = 0; c <= cols; c++) ln(d, x + c * cw, y, x + c * cw, y + h, lw);
  for (let r = 0; r <= rows; r++) ln(d, x, y + r * rh, x + w, y + r * rh, lw);
}
function chk(d: jsPDF, x: number, y: number, sz: number, checked: boolean) {
  bx(d, x, y, sz, sz, 0.25);
  if (checked) {
    ln(d, x + 0.6, y + sz * 0.55, x + sz * 0.4, y + sz - 0.6, 0.4);
    ln(d, x + sz * 0.4, y + sz - 0.6, x + sz - 0.6, y + 0.6, 0.4);
  }
}

function drawTeamLogo(d: jsPDF, logoUrl: string | undefined, x: number, y: number, size: number): void {
  if (!logoUrl) return;
  try {
    if (logoUrl.startsWith('data:image/svg+xml')) {
      const svg = decodeURIComponent(logoUrl.replace(/^data:image\/svg\+xml;utf8,?/, ''));
      d.addSvgAsImage(svg, x, y, size, size);
      return;
    }
    const format = logoUrl.startsWith('data:image/png') ? 'PNG' : logoUrl.startsWith('data:image/jpeg') ? 'JPEG' : undefined;
    d.addImage(logoUrl, format, x, y, size, size);
  } catch {
    // Silently fallback if logo is not renderable in current context
  }
}

// ── HEADER (title bar) ─────────────────────────────────────────────
function drawHeader(d: jsPDF, data: MatchSheetData, rect: Rect, compact = false) {
  const { x, y, w, h } = rect;
  // background bar
  fbx(d, x, y, w, h, '#1e3a5f');
  // emblem circle placeholder (left)
  const circleRadius = compact ? 3.5 : 4.5;
  d.setDrawColor(WHITE); d.setLineWidth(0.3);
  d.circle(x + circleRadius + 3, y + h / 2, circleRadius, 'S');
  tx(d, 'V', x + circleRadius + 3, y + h / 2 + (compact ? 1.0 : 1.3), compact ? 4.5 : 5.5, { a: 'center', c: WHITE, b: true });
  // system name / org name (left)
  const orgName = (data.orgName || 'VolleyPro').toUpperCase();
  tx(d, orgName, x + circleRadius * 2 + 6, y + (compact ? 4.2 : 5), compact ? 6 : 7, { c: WHITE, b: true });
  // "SÚMULA OFICIAL" title
  tx(d, compact ? 'SÚMULA OFICIAL (5 SETS)' : 'SÚMULA OFICIAL', x + w / 2, y + (compact ? 4.5 : 5.5), compact ? 7.5 : 9, { a: 'center', c: WHITE, b: true });
  // match/format info (center sub)
  const modTxt = data.modality === 'indoor' ? 'VÔLEI DE QUADRA' : 'VÔLEI DE PRAIA';
  tx(d, modTxt, x + w / 2, y + (compact ? 8.2 : 11), compact ? 4.5 : 5.5, { a: 'center', c: '#c0d0e0' });
  // competition name (right side)
  tx(d, data.competition.toUpperCase(), x + w - 2, y + (compact ? 4.5 : 5.5), compact ? 5 : 6, { a: 'right', c: WHITE, b: true });
  const catText = data.category ? data.category.toUpperCase() : '';
  tx(d, catText, x + w - 2, y + (compact ? 8.2 : 11), compact ? 4 : 5, { a: 'right', c: '#c0d0e0' });
}

// ── MATCH INFO strip ────────────────────────────────────────────────
function drawMatchInfo(d: jsPDF, data: MatchSheetData, rect: Rect, compact = false) {
  const { x, y, w, h } = rect;
  bx(d, x, y, w, h, 0.35);

  // dividers — split into 7 columns
  const cols = compact
    ? [40, 40, 52, 38, 35, 42, 42]
    : [42, 42, 50, 38, 36, 40, 41];
  let cx = x;
  const xpos: number[] = [cx];
  cols.forEach(cw => { cx += cw; xpos.push(cx); ln(d, cx, y, cx, y + h, 0.2); });

  const lbl = (s: string, xi: number, yi: number) => tx(d, s, xi + 1.5, yi, compact ? 3.8 : 4.5, { c: GRAY });
  const val = (s: string, xi: number, yi: number) => tx(d, s, xi + 1.5, yi, compact ? 5.0 : 6.0, { b: true });
  // horizontal midline
  const midY = y + (compact ? 5.5 : 7.0);
  ln(d, x, midY, x + w, midY, 0.15, LGRAY);

  // Row 1 labels
  lbl('NOME DA COMPETIÇÃO', xpos[0], y + (compact ? 2.8 : 3.5));
  lbl('CIDADE', xpos[1], y + (compact ? 2.8 : 3.5));
  lbl('GINÁSIO / QUADRA', xpos[2], y + (compact ? 2.8 : 3.5));
  lbl('FASE', xpos[3], y + (compact ? 2.8 : 3.5));
  lbl('JOGO Nº', xpos[4], y + (compact ? 2.8 : 3.5));
  lbl('SEXO', xpos[5], y + (compact ? 2.8 : 3.5));
  lbl('CATEGORIA', xpos[6], y + (compact ? 2.8 : 3.5));

  // Row 1 values
  val(data.competition.substring(0, 22), xpos[0], y + (compact ? 5.0 : 6.5));
  val((data.city || '').substring(0, 20), xpos[1], y + (compact ? 5.0 : 6.5));
  const venueStr = data.venue + (data.court ? ` - ${data.court}` : '');
  val(venueStr.substring(0, 24), xpos[2], y + (compact ? 5.0 : 6.5));
  val((data.phase || data.groupName || '').substring(0, 18), xpos[3], y + (compact ? 5.0 : 6.5));
  val(data.matchNumber > 0 ? String(data.matchNumber) : '', xpos[4], y + (compact ? 5.0 : 6.5));
  // sex checkboxes
  const sx = xpos[5] + 1.5;
  const sy = y + (compact ? 3.5 : 4.5);
  const genderIs = (g: string) => data.genderCategory === g;
  chk(d, sx, sy, 2.2, genderIs('male')); tx(d, 'M', sx + 2.8, sy + 1.8, compact ? 3.8 : 4.5);
  chk(d, sx + 8.5, sy, 2.2, genderIs('female')); tx(d, 'F', sx + 11.3, sy + 1.8, compact ? 3.8 : 4.5);
  chk(d, sx + 17, sy, 2.2, genderIs('mixed')); tx(d, 'X', sx + 19.8, sy + 1.8, compact ? 3.8 : 4.5);
  val(data.category, xpos[6], y + (compact ? 5.0 : 6.5));

  // Row 2 labels
  lbl('DATA', xpos[0], midY + (compact ? 2.5 : 3.5));
  lbl('HORÁRIO', xpos[1], midY + (compact ? 2.5 : 3.5));
  lbl('EQUIPES', xpos[2], midY + (compact ? 2.5 : 3.5));

  // Row 2 values
  val(data.date || '', xpos[0], midY + (compact ? 4.8 : 6.5));
  val(data.time || '', xpos[1], midY + (compact ? 4.8 : 6.5));
  // Teams A vs B
  const teamsX = xpos[2] + 1.5;
  tx(d, 'A', teamsX, midY + (compact ? 4.8 : 5.5), compact ? 4.5 : 5, { b: true });
  if (data.teamA.logoUrl) {
    drawTeamLogo(d, data.teamA.logoUrl, teamsX + 3.5, midY + 1.5, 4.5);
    tx(d, data.teamA.name.toUpperCase().substring(0, 16), teamsX + 9, midY + (compact ? 4.8 : 5.5), compact ? 4.5 : 5.5, { b: true });
  } else {
    tx(d, data.teamA.name.toUpperCase().substring(0, 18), teamsX + 4, midY + (compact ? 4.8 : 5.5), compact ? 4.5 : 5.5, { b: true });
  }

  const vsX = xpos[2] + (w - xpos[2] + PRINT_MARGIN) / 2;
  tx(d, 'VS', vsX, midY + (compact ? 4.8 : 6.5), compact ? 4.5 : 5.5, { a: 'center', c: GRAY, b: true });

  tx(d, 'B', x + w - 2, midY + (compact ? 4.8 : 5.5), compact ? 4.5 : 5, { a: 'right', b: true });
  if (data.teamB.logoUrl) {
    drawTeamLogo(d, data.teamB.logoUrl, x + w - 12, midY + 1.5, 4.5);
    tx(d, data.teamB.name.toUpperCase().substring(0, 16), x + w - 14, midY + (compact ? 4.8 : 5.5), compact ? 4.5 : 5.5, { a: 'right', b: true });
  } else {
    tx(d, data.teamB.name.toUpperCase().substring(0, 18), x + w - 6, midY + (compact ? 4.8 : 5.5), compact ? 4.5 : 5.5, { a: 'right', b: true });
  }
}

// ── SET BLOCK drawing ───────────────────────────────────────────────
function drawSetBlock(
  d: jsPDF,
  setNum: number,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  isTiebreak = false,
  compact = false
) {
  // Outer border
  bx(d, x, y, w, h, 0.4);

  // SET number badge (left strip)
  const stripW = compact ? 5 : 6;
  fbx(d, x, y, stripW, h, BG);
  bx(d, x, y, stripW, h, 0.3);
  tx(d, 'S', x + stripW / 2, y + h * 0.25, compact ? 4.5 : 5.5, { a: 'center', b: true });
  tx(d, 'E', x + stripW / 2, y + h * 0.42, compact ? 4.5 : 5.5, { a: 'center', b: true });
  tx(d, 'T', x + stripW / 2, y + h * 0.59, compact ? 4.5 : 5.5, { a: 'center', b: true });
  tx(d, String(setNum), x + stripW / 2, y + h * 0.82, compact ? 6 : 7, { a: 'center', b: true });

  const innerX = x + stripW;
  const innerW = w - stripW;

  // Split into left team (A) and right team (B)
  const teamW = (innerW - 2) / 2;
  const pointColW = compact ? 10 : 14;
  const teamContentW = teamW - pointColW;

  drawTeamHalf(d, innerX, y, teamContentW, h, 'A', data.teamA, setNum, isTiebreak, compact);
  drawPointColumns(d, innerX + teamContentW, y, pointColW, h, isTiebreak, compact);
  drawTeamHalf(d, innerX + teamW + 2, y, teamContentW, h, 'B', data.teamB, setNum, isTiebreak, compact);
  drawPointColumns(d, innerX + teamW + 2 + teamContentW, y, pointColW, h, isTiebreak, compact);
}

function drawTeamHalf(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  team: MatchSheetData['teamA'],
  _setNum: number,
  _isTiebreak: boolean,
  compact = false
) {
  // Row 1: Horário + Equipe name
  const r1h = compact ? 4.5 : 5.5;
  fbx(d, x, y, w, r1h, '#eaeaea');
  bx(d, x, y, w, r1h, 0.2);
  tx(d, label === 'A' ? 'HORÁRIO INÍCIO' : 'HORÁRIO FIM', x + 1, y + (compact ? 1.6 : 2), compact ? 2.8 : 3.5, { c: GRAY });
  tx(d, `H___:___`, x + 1, y + (compact ? 3.6 : 4.5), compact ? 2.8 : 3.5, { c: LGRAY });
  tx(d, 'EQUIPE', x + (compact ? 18 : 25), y + (compact ? 1.6 : 2), compact ? 2.8 : 3.5, { c: GRAY });
  tx(d, team.name.toUpperCase().substring(0, compact ? 14 : 20), x + (compact ? 18 : 25), y + (compact ? 3.6 : 4.5), compact ? 3.8 : 4.5, { b: true });
  // S/R circles
  const srX = x + w - (compact ? 5 : 6);
  d.setDrawColor(INK); d.setLineWidth(0.25);
  d.circle(srX, y + 1.6, compact ? 1.0 : 1.2, 'S'); tx(d, 'S', srX, y + 2.0, compact ? 3.0 : 3.5, { a: 'center', b: true });
  d.circle(srX + (compact ? 2.8 : 3.5), y + 1.6, compact ? 1.0 : 1.2, 'S'); tx(d, 'R', srX + (compact ? 2.8 : 3.5), y + 2.0, compact ? 3.0 : 3.5, { a: 'center', b: true });

  // Row 2: Ordem de saque (positions I-VI)
  const r2y = y + r1h;
  const r2h = compact ? 4.2 : 5;
  bx(d, x, r2y, w, r2h, 0.15);
  const posLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const labelMargin = compact ? 16 : 22;
  const posW = (w - labelMargin) / 6;
  const posX0 = x + labelMargin;
  tx(d, 'ORDEM SAQUE', x + 1, r2y + (compact ? 2.8 : 3), compact ? 2.8 : 3.5, { c: GRAY });
  posLabels.forEach((lbl, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r2y, posW, r2h, 0.15);
    tx(d, lbl, px + posW / 2, r2y + (compact ? 3.0 : 3.5), compact ? 3.8 : 4.5, { a: 'center', b: true });
  });

  // Row 3: Jogadores Iniciantes
  const r3y = r2y + r2h;
  const r3h = compact ? 4.2 : 5;
  bx(d, x, r3y, w, r3h, 0.15);
  tx(d, 'INICIANTES', x + 1, r3y + (compact ? 2.8 : 3), compact ? 2.5 : 3, { c: GRAY });
  posLabels.forEach((_, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r3y, posW, r3h, 0.15);
  });

  // Row 4: Nº do Jogador
  const r4y = r3y + r3h;
  const r4h = compact ? 3.5 : 4;
  bx(d, x, r4y, w, r4h, 0.15);
  tx(d, 'Nº JOGADOR', x + 1, r4y + (compact ? 2.5 : 2.8), compact ? 2.5 : 3, { c: GRAY });
  posLabels.forEach((_, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r4y, posW, r4h, 0.15);
  });

  // Rows 5-6: Substituições
  const subY = r4y + r4h;
  const subRowH = compact ? 2.8 : 3.5;
  const subRows = compact ? 2 : 3;
  fbx(d, x, subY, labelMargin, subRowH * subRows, '#f8f8f8');
  tx(d, 'SUBSTITUIÇÃO', x + 1, subY + 2.2, compact ? 2.4 : 2.8, { c: GRAY });
  for (let r = 0; r < subRows; r++) {
    const ry = subY + r * subRowH;
    ln(d, x, ry, x + w, ry, 0.1, LGRAY);
    posLabels.forEach((_, i) => {
      const px = posX0 + i * posW;
      bx(d, px, ry, posW, subRowH, 0.1);
      tx(d, ':', px + posW / 2, ry + (compact ? 2.0 : 2.5), compact ? 3.0 : 4, { a: 'center', c: LGRAY });
    });
  }
  bx(d, x, subY, w, subRowH * subRows, 0.15);

  // Rows 7+: Rodada de saques
  const srvY = subY + subRowH * subRows;
  const srvRowH = (h - (srvY - y)) / 4;
  const srvLabels = [['1º', '5º'], ['2º', '6º'], ['3º', '7º'], ['4º', '8º']];
  tx(d, 'SAQUES', x + 1, srvY + 2.2, compact ? 2.4 : 2.8, { c: GRAY });
  for (let r = 0; r < 4; r++) {
    const ry = srvY + r * srvRowH;
    ln(d, x, ry, x + w, ry, 0.1);
    tx(d, srvLabels[r][0], x + 1, ry + srvRowH * 0.6, compact ? 2.5 : 3);
    tx(d, srvLabels[r][1], x + (compact ? 6 : 8), ry + srvRowH * 0.6, compact ? 2.5 : 3);
    posLabels.forEach((_, i) => {
      const px = posX0 + i * posW;
      const subW = posW / 2;
      bx(d, px, ry, subW, srvRowH, 0.08);
      bx(d, px + subW, ry, subW, srvRowH, 0.08);
    });
  }
  bx(d, x, srvY, w, srvRowH * 4, 0.15);
}

function drawPointColumns(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  isTiebreak: boolean,
  compact = false
) {
  bx(d, x, y, w, h, 0.2);
  const hdrH = compact ? 2.8 : 3.5;
  fbx(d, x, y, w, hdrH, '#eaeaea');
  tx(d, 'PTS', x + w / 2, y + (compact ? 2.0 : 2.5), compact ? 2.8 : 3.5, { a: 'center', b: true });

  const maxPts = compact ? (isTiebreak ? 25 : 30) : (isTiebreak ? 30 : 36);
  const cols = compact ? (isTiebreak ? 2 : 3) : (isTiebreak ? 2 : 3);
  const ptsPerCol = compact ? (isTiebreak ? 13 : 10) : (isTiebreak ? 15 : 12);
  const colW = w / cols;
  const tHeight = compact ? 2.5 : 3.0;
  const rowH = (h - hdrH - tHeight) / ptsPerCol;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < ptsPerCol; r++) {
      const num = c * ptsPerCol + r + 1;
      if (num > maxPts) break;
      const px = x + c * colW;
      const py = y + hdrH + r * rowH;
      bx(d, px, py, colW, rowH, 0.08);
      tx(d, String(num), px + colW / 2, py + rowH * 0.7, compact ? 2.8 : 3.5, { a: 'center' });
    }
  }

  // T (timeout) marker at bottom
  const tY = y + h - tHeight;
  fbx(d, x, tY, w, tHeight, BG);
  bx(d, x, tY, w, tHeight, 0.15);
  tx(d, 'T', x + w / 2, tY + tHeight * 0.75, compact ? 3.0 : 4.0, { a: 'center', b: true });
}

// ── SANCTIONS PANEL ────────────────────────────────────────────────
function drawSanctionsPanel(d: jsPDF, x: number, y: number, w: number, h: number, compact = false) {
  bx(d, x, y, w, h, 0.35);
  const titleH = compact ? 4 : 5;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'SANÇÕES', x + w / 2, y + (compact ? 2.8 : 3.5), compact ? 4 : 5, { a: 'center', c: WHITE, b: true });

  const hy = y + titleH;
  const colHdrs = ['A', 'P', 'E', 'D', '⊗', 'SET', 'PLACAR'];
  const colW = w / colHdrs.length;
  colHdrs.forEach((hdr, i) => {
    const cx = x + i * colW;
    bx(d, cx, hy, colW, compact ? 3.2 : 4, 0.15);
    tx(d, hdr, cx + colW / 2, hy + (compact ? 2.4 : 3), compact ? 2.8 : 3.5, { a: 'center', b: true });
  });

  const rowCount = compact ? 4 : 6;
  const bottomH = compact ? 5 : 7;
  const rowH = (h - titleH - (compact ? 3.2 : 4) - bottomH) / rowCount;
  for (let r = 0; r < rowCount; r++) {
    const ry = hy + (compact ? 3.2 : 4) + r * rowH;
    colHdrs.forEach((_, i) => {
      bx(d, x + i * colW, ry, colW, rowH, 0.08);
    });
  }

  // Solicitações indevidas section (bottom)
  const siY = y + h - bottomH;
  fbx(d, x, siY, w, bottomH, BG);
  bx(d, x, siY, w, bottomH, 0.2);
  tx(d, 'Solicitações Indevidas', x + 2, siY + (compact ? 2.2 : 3), compact ? 2.8 : 3.5, { b: true });
  tx(d, 'Equipe A:', x + 2, siY + (compact ? 4.2 : 6), compact ? 2.5 : 3, { c: GRAY });
  tx(d, 'Equipe B:', x + w / 2, siY + (compact ? 4.2 : 6), compact ? 2.5 : 3, { c: GRAY });
}

// ── TEAM ROSTER PANEL ──────────────────────────────────────────────
function drawTeamRosterPanel(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  compact = false
) {
  bx(d, x, y, w, h, 0.35);
  const titleH = compact ? 4 : 5;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'EQUIPES E ELENCOS', x + w / 2, y + (compact ? 2.8 : 3.5), compact ? 4 : 5, { a: 'center', c: WHITE, b: true });

  const colW = w / 2;
  ln(d, x + colW, y + titleH, x + colW, y + h, 0.2);

  // Column A & B headers
  const chY = y + titleH;
  const chH = compact ? 3.5 : 4.5;
  fbx(d, x, chY, colW, chH, BG);
  bx(d, x, chY, colW, chH, 0.15);
  tx(d, 'A', x + 2, chY + (compact ? 2.5 : 3.2), compact ? 3.5 : 4, { b: true });
  tx(d, 'Nº', x + (compact ? 6 : 8), chY + (compact ? 2.5 : 3.2), compact ? 2.8 : 3.5, { c: GRAY, b: true });
  tx(d, 'Nomes dos jogadores', x + (compact ? 12 : 14), chY + (compact ? 2.5 : 3.2), compact ? 2.8 : 3.5, { c: GRAY });

  fbx(d, x + colW, chY, colW, chH, BG);
  bx(d, x + colW, chY, colW, chH, 0.15);
  tx(d, 'B', x + colW + 2, chY + (compact ? 2.5 : 3.2), compact ? 3.5 : 4, { b: true });
  tx(d, 'Nº', x + colW + (compact ? 6 : 8), chY + (compact ? 2.5 : 3.2), compact ? 2.8 : 3.5, { c: GRAY, b: true });
  tx(d, 'Nomes dos jogadores', x + colW + (compact ? 12 : 14), chY + (compact ? 2.5 : 3.2), compact ? 2.8 : 3.5, { c: GRAY });

  // Athlete rows (14 atletas)
  const startY = chY + chH;
  const maxRows = 14;
  const staffReservedH = compact ? 10 : 20;
  const rowH = Math.min(compact ? 2.6 : 3.8, (h - titleH - chH - staffReservedH) / maxRows);

  const renderAthletes = (athletes: MatchSheetData['teamA']['athletes'], cx: number) => {
    const list = athletes.slice(0, maxRows);
    list.forEach((ath, i) => {
      const ry = startY + i * rowH;
      if (i % 2 === 0) fbx(d, cx, ry, colW, rowH, '#f7f7f7');
      ln(d, cx, ry + rowH, cx + colW, ry + rowH, 0.06, LGRAY);
      const numStr = ath.jerseyNumber !== undefined ? String(ath.jerseyNumber).padStart(2, '0') : '';
      let nameStr = ath.name.toUpperCase().substring(0, compact ? 15 : 18);
      if (ath.captain) nameStr += ' (C)';
      if (ath.libero) nameStr += ' (L)';
      tx(d, numStr, cx + (compact ? 6 : 8), ry + rowH * 0.75, compact ? 2.8 : 3.5, { a: 'center', b: true });
      tx(d, nameStr, cx + (compact ? 11 : 14), ry + rowH * 0.75, compact ? 2.4 : 3);
    });
    for (let i = list.length; i < maxRows; i++) {
      const ry = startY + i * rowH;
      ln(d, cx, ry + rowH, cx + colW, ry + rowH, 0.06, LGRAY);
    }
  };

  renderAthletes(data.teamA.athletes, x);
  renderAthletes(data.teamB.athletes, x + colW);

  // Technical staff section at bottom
  const staffY = startY + maxRows * rowH + 0.5;
  const staffH = y + h - staffY;
  if (staffH > 4) {
    ln(d, x, staffY - 0.5, x + w, staffY - 0.5, 0.2);
    const staffLabels = compact ? ['L', 'T', 'AT', 'M/F'] : ['L', 'L', 'T', 'AT₁', 'AT₂', 'PF', 'M/F', 'E'];
    const sRowH = Math.min(compact ? 2.2 : 3.2, staffH / staffLabels.length);

    staffLabels.forEach((lbl, i) => {
      const sy = staffY + i * sRowH;
      tx(d, lbl, x + 2, sy + sRowH * 0.7, compact ? 2.4 : 3, { b: true });
      ln(d, x + (compact ? 5 : 7), sy + sRowH - 0.3, x + colW - 1, sy + sRowH - 0.3, 0.06, LGRAY);
      if (lbl === 'T' && data.teamA.coach) {
        tx(d, data.teamA.coach.toUpperCase().substring(0, compact ? 12 : 16), x + (compact ? 6 : 8), sy + sRowH * 0.7, compact ? 2.2 : 2.8);
      }

      tx(d, lbl, x + colW + 2, sy + sRowH * 0.7, compact ? 2.4 : 3, { b: true });
      ln(d, x + colW + (compact ? 5 : 7), sy + sRowH - 0.3, x + w - 1, sy + sRowH - 0.3, 0.06, LGRAY);
      if (lbl === 'T' && data.teamB.coach) {
        tx(d, data.teamB.coach.toUpperCase().substring(0, compact ? 12 : 16), x + colW + (compact ? 6 : 8), sy + sRowH * 0.7, compact ? 2.2 : 2.8);
      }
    });
  }
}

// ── RESULT PANEL ───────────────────────────────────────────────────
function drawResultPanel(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  maxSets: number,
  compact = false
) {
  bx(d, x, y, w, h, 0.35);
  const titleH = compact ? 4 : 5;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'RESULTADO FINAL', x + w / 2, y + (compact ? 2.8 : 3.5), compact ? 4 : 5, { a: 'center', c: WHITE, b: true });

  const innerY = y + titleH + 1;

  // Header Teams
  tx(d, `A: ${data.teamA.shortName}`, x + 2, innerY + (compact ? 2.5 : 4), compact ? 3.0 : 3.5, { b: true });
  tx(d, `B: ${data.teamB.shortName}`, x + w - 2, innerY + (compact ? 2.5 : 4), compact ? 3.0 : 3.5, { a: 'right', b: true });

  // Set results table
  const tableY = innerY + (compact ? 3.5 : 7);
  const rH = compact ? 3.5 : 5;
  for (let s = 0; s < maxSets; s++) {
    const sy = tableY + s * rH;
    tx(d, `Set ${s + 1}:`, x + 2, sy + (compact ? 2.5 : 3.5), compact ? 2.8 : 3.5);
    if (data.sets[s]) {
      tx(d, `${data.sets[s].scoreA} x ${data.sets[s].scoreB}`, x + (compact ? 14 : 20), sy + (compact ? 2.5 : 3.5), compact ? 3.0 : 3.5, { b: true });
    } else {
      tx(d, `___ x ___`, x + (compact ? 14 : 20), sy + (compact ? 2.5 : 3.5), compact ? 2.8 : 3.5, { c: LGRAY });
    }
    ln(d, x + 2, sy + rH, x + w - 2, sy + rH, 0.06, LGRAY);
  }

  // Winner section at bottom
  const winY = y + h - (compact ? 5 : 7);
  fbx(d, x, winY, w, compact ? 5 : 7, '#f4f6f8');
  bx(d, x, winY, w, compact ? 5 : 7, 0.15);
  tx(d, 'VENC:', x + 2, winY + (compact ? 3.5 : 4.5), compact ? 3.5 : 4.5, { b: true });
  if (data.winner) {
    const winnerName = data.winner === 'A' ? data.teamA.name : data.teamB.name;
    tx(d, winnerName.toUpperCase().substring(0, compact ? 12 : 20), x + (compact ? 14 : 22), winY + (compact ? 3.5 : 4.5), compact ? 3.5 : 4.5, { b: true });
  }
  const scoreStr = `${data.finalScoreA} : ${data.finalScoreB}`;
  tx(d, scoreStr, x + w - 2, winY + (compact ? 3.5 : 4.5), compact ? 4.5 : 6, { a: 'right', b: true });
}

// ── PONTOS NA TROCA (Tie-break) ─────────────────────────────────────
function drawPontosNaTroca(d: jsPDF, x: number, y: number, w: number, h: number, compact = false) {
  bx(d, x, y, w, h, 0.3);
  const titleH = compact ? 4 : 5;
  fbx(d, x, y, w, titleH, BG);
  bx(d, x, y, w, titleH, 0.15);
  tx(d, 'PONTOS NA TROCA', x + w / 2, y + (compact ? 2.8 : 3.5), compact ? 3.0 : 3.5, { a: 'center', b: true });

  const gridY = y + titleH;
  const gridH = (h - titleH) / 2;
  const posLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const colW = (w - (compact ? 12 : 18)) / 6;

  for (let t = 0; t < 2; t++) {
    const gy = gridY + t * gridH;
    const label = t === 0 ? 'A' : 'B';
    fbx(d, x, gy, compact ? 6 : 8, gridH, '#f4f4f4');
    tx(d, label, x + (compact ? 3 : 4), gy + gridH / 2 + 1, compact ? 4 : 5, { a: 'center', b: true });
    grid(d, x + (compact ? 6 : 8), gy, w - (compact ? 6 : 8), gridH, 6, 2, 0.08);

    posLabels.forEach((lbl, i) => {
      tx(d, lbl, x + (compact ? 12 : 18) + i * colW + colW / 2, gy + (compact ? 2.5 : 3), compact ? 2.8 : 3.5, { a: 'center', b: true });
    });
  }
}

// ── SIGNATURES & APPROVAL ──────────────────────────────────────────
function drawSignaturesPanel(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  compact = false
) {
  bx(d, x, y, w, h, 0.35);
  const titleH = compact ? 4 : 4.5;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'ASSINATURAS', x + w / 2, y + (compact ? 2.8 : 3.2), compact ? 4 : 4.5, { a: 'center', c: WHITE, b: true });

  const halfW = w / 2;
  ln(d, x + halfW, y + titleH, x + halfW, y + h, 0.15);

  // Left: Equipe A
  tx(d, 'EQUIPE A', x + halfW / 2, y + titleH + (compact ? 2.5 : 3.5), compact ? 2.8 : 3.2, { a: 'center', b: true });
  tx(d, 'Capitão: ________________', x + 2, y + titleH + (compact ? 6.5 : 8.5), compact ? 2.4 : 3);
  tx(d, 'Técnico: ________________', x + 2, y + titleH + (compact ? 11.5 : 14.5), compact ? 2.4 : 3);

  // Right: Equipe B
  tx(d, 'EQUIPE B', x + halfW + halfW / 2, y + titleH + (compact ? 2.5 : 3.5), compact ? 2.8 : 3.2, { a: 'center', b: true });
  tx(d, 'Capitão: ________________', x + halfW + 2, y + titleH + (compact ? 6.5 : 8.5), compact ? 2.4 : 3);
  tx(d, 'Técnico: ________________', x + halfW + 2, y + titleH + (compact ? 11.5 : 14.5), compact ? 2.4 : 3);
}

function drawObservationsBox(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData, compact = false) {
  bx(d, x, y, w, h, 0.3);
  const titleH = compact ? 4 : 4.5;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'OBSERVAÇÕES', x + w / 2, y + (compact ? 2.8 : 3.2), compact ? 4 : 4.5, { a: 'center', c: WHITE, b: true });

  for (let i = 1; i <= 3; i++) {
    ln(d, x + 2, y + titleH + i * (compact ? 3.5 : 4.5), x + w - 2, y + titleH + i * (compact ? 3.5 : 4.5), 0.08, LGRAY);
  }
  if (data.observations) {
    tx(d, data.observations.substring(0, 80), x + 2, y + titleH + 3, compact ? 2.5 : 3);
  }
}

function drawApprovalPanel(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData) {
  bx(d, x, y, w, h, 0.35);
  fbx(d, x, y, w, 4.5, '#1e3a5f');
  tx(d, 'EQUIPE DE ARBITRAGEM & APROVAÇÃO', x + w / 2, y + 3.2, 4.5, { a: 'center', c: WHITE, b: true });

  const refRoles = ['1º Árbitro', '2º Árbitro', 'Apontador', 'Apontador Assistente'];
  const colW = w / refRoles.length;
  refRoles.forEach((role, i) => {
    const rx = x + i * colW;
    bx(d, rx, y + 4.5, colW, h - 4.5, 0.15);
    tx(d, role, rx + colW / 2, y + 8, 3.2, { a: 'center', b: true, c: GRAY });
    const ref = data.referees[i];
    if (ref && ref.name) {
      tx(d, ref.name.toUpperCase().substring(0, 18), rx + colW / 2, y + 13, 3.5, { a: 'center', b: true });
    }
    tx(d, 'Assinatura: ___________________', rx + colW / 2, y + h - 3, 2.8, { a: 'center', c: GRAY });
  });
}

// ══════════════════════════════════════════════════════════════════════
// ═ MAIN BUILDERS (A4 LANDSCAPE)
// ══════════════════════════════════════════════════════════════════════

function build3Sets(d: jsPDF, data: MatchSheetData) {
  const layout = SHEET3_A4;

  // Header & Match Info
  drawHeader(d, data, layout.header, false);
  drawMatchInfo(d, data, layout.matchInfo, false);

  // 3 Sets
  layout.sets.forEach((rect, idx) => {
    drawSetBlock(d, idx + 1, rect.x, rect.y, rect.w, rect.h, data, idx === 2, false);
  });

  // Right Panel: Sanctions & Rosters
  drawSanctionsPanel(d, layout.sanctions.x, layout.sanctions.y, layout.sanctions.w, layout.sanctions.h, false);
  drawTeamRosterPanel(d, layout.roster.x, layout.roster.y, layout.roster.w, layout.roster.h, data, false);

  // Bottom Panels: Result, Side Change, Observations, Signatures
  drawResultPanel(d, layout.result.x, layout.result.y, layout.result.w, layout.result.h, data, 3, false);
  drawPontosNaTroca(d, layout.sideChange.x, layout.sideChange.y, layout.sideChange.w, layout.sideChange.h, false);
  drawObservationsBox(d, layout.observations.x, layout.observations.y, layout.observations.w, layout.observations.h, data, false);
  drawSignaturesPanel(d, layout.signatures.x, layout.signatures.y, layout.signatures.w, layout.signatures.h, data, false);

  // Footer
  tx(d, 'VolleyPro · Súmula Oficial (3 Sets A4 Paisagem)', layout.footer.x, layout.footer.y + 1.5, 3.5, { c: LGRAY });
  tx(d, `Gerado: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, layout.footer.x + layout.footer.w, layout.footer.y + 1.5, 3.5, { a: 'right', c: LGRAY });
}

function build5Sets(d: jsPDF, data: MatchSheetData) {
  const layout = SHEET5_A4;

  // Header & Match Info
  drawHeader(d, data, layout.header, true);
  drawMatchInfo(d, data, layout.matchInfo, true);

  // 5 Sets
  layout.sets.forEach((rect, idx) => {
    drawSetBlock(d, idx + 1, rect.x, rect.y, rect.w, rect.h, data, idx === 4, true);
  });

  // Side Change in Tiebreak
  drawPontosNaTroca(d, layout.sideChange.x, layout.sideChange.y, layout.sideChange.w, layout.sideChange.h, true);

  // Rosters, Sanctions, Result, Observations, Signatures
  drawTeamRosterPanel(d, layout.roster.x, layout.roster.y, layout.roster.w, layout.roster.h, data, true);
  drawSanctionsPanel(d, layout.sanctions.x, layout.sanctions.y, layout.sanctions.w, layout.sanctions.h, true);
  drawResultPanel(d, layout.result.x, layout.result.y, layout.result.w, layout.result.h, data, 5, true);
  drawObservationsBox(d, layout.observations.x, layout.observations.y, layout.observations.w, layout.observations.h, data, true);
  drawSignaturesPanel(d, layout.signatures.x, layout.signatures.y, layout.signatures.w, layout.signatures.h, data, true);

  // Approval (Bottom Bar)
  if (layout.approval) {
    drawApprovalPanel(d, layout.approval.x, layout.approval.y, layout.approval.w, layout.approval.h, data);
  }

  // Footer
  tx(d, 'VolleyPro · Súmula Oficial (5 Sets A4 Paisagem)', layout.footer.x, layout.footer.y + 1.5, 3.5, { c: LGRAY });
  tx(d, `Gerado: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, layout.footer.x + layout.footer.w, layout.footer.y + 1.5, 3.5, { a: 'right', c: LGRAY });
}

function buildPositionSheet(d: jsPDF, data: MatchSheetData) {
  const orgName = data.orgName || 'VolleyPro';
  const isFiveSets = data.format === '5-sets';

  const cardCols = 4;
  const cardRows = 2;
  const gapX = 3, gapY = 4;
  const cw = (PAGE_A4_LANDSCAPE.width - 2 * PRINT_MARGIN - (cardCols - 1) * gapX) / cardCols;
  const ch = (PAGE_A4_LANDSCAPE.height - 2 * PRINT_MARGIN - 8 - (cardRows - 1) * gapY) / cardRows;

  // Página 1 (Sets 1 a 4 para cada equipe)
  tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO`, PAGE_A4_LANDSCAPE.width / 2, PRINT_MARGIN + 3, 6, { a: 'center', b: true, c: DARK });
  tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, PAGE_A4_LANDSCAPE.width / 2, PRINT_MARGIN + 7, 4, { a: 'center', c: GRAY });

  for (let c = 0; c < 4; c++) {
    const setNum = c + 1;
    const setLabel = setNum <= (isFiveSets ? 5 : 3) ? `SET ${setNum}` : `SET EXTRA`;

    // Team A
    const cxA = PRINT_MARGIN + c * (cw + gapX);
    const cyA = PRINT_MARGIN + 8;
    drawPositionCard(d, cxA, cyA, cw, ch, data, data.teamA, data.teamB, `${setLabel} (A)`, orgName);

    // Team B
    const cxB = PRINT_MARGIN + c * (cw + gapX);
    const cyB = PRINT_MARGIN + 8 + (ch + gapY);
    drawPositionCard(d, cxB, cyB, cw, ch, data, data.teamB, data.teamA, `${setLabel} (B)`, orgName);
  }

  tx(d, `VolleyPro · Fichas de Posição / Ordem de Saque ${isFiveSets ? '(Página 1/2)' : ''}`, PRINT_MARGIN, PAGE_A4_LANDSCAPE.height - 2, 3.5, { c: LGRAY });

  // Página 2 para 5 sets (Sets 5 e Extra)
  if (isFiveSets) {
    d.addPage('a4', 'landscape');
    tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO (SETS DECISIVOS)`, PAGE_A4_LANDSCAPE.width / 2, PRINT_MARGIN + 3, 6, { a: 'center', b: true, c: DARK });
    tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, PAGE_A4_LANDSCAPE.width / 2, PRINT_MARGIN + 7, 4, { a: 'center', c: GRAY });

    for (let c = 0; c < 2; c++) {
      const setNum = c + 5;
      const setLabel = setNum === 5 ? `SET 5 (TB)` : `SET EXTRA`;

      // Team A
      const cxA = PRINT_MARGIN + c * (cw + gapX);
      const cyA = PRINT_MARGIN + 8;
      drawPositionCard(d, cxA, cyA, cw, ch, data, data.teamA, data.teamB, `${setLabel} (A)`, orgName);

      // Team B
      const cxB = PRINT_MARGIN + c * (cw + gapX);
      const cyB = PRINT_MARGIN + 8 + (ch + gapY);
      drawPositionCard(d, cxB, cyB, cw, ch, data, data.teamB, data.teamA, `${setLabel} (B)`, orgName);
    }

    tx(d, 'VolleyPro · Fichas de Posição / Ordem de Saque (Página 2/2)', PRINT_MARGIN, PAGE_A4_LANDSCAPE.height - 2, 3.5, { c: LGRAY });
  }
}

function drawPositionCard(
  d: jsPDF,
  x: number,
  y: number,
  cw: number,
  ch: number,
  data: MatchSheetData,
  team: MatchSheetData['teamA'],
  opponent: MatchSheetData['teamB'],
  setLabel: string,
  orgName: string,
) {
  bx(d, x, y, cw, ch, 0.4);

  const hdrH = 7;
  fbx(d, x, y, cw, hdrH, '#1e3a5f');

  if (team.logoUrl) {
    drawTeamLogo(d, team.logoUrl, x + 1.5, y + 1, 5);
  } else {
    d.setDrawColor(WHITE); d.setLineWidth(0.3);
    d.circle(x + 4, y + hdrH / 2, 2.5, 'S');
    tx(d, 'V', x + 4, y + hdrH / 2 + 0.8, 3, { a: 'center', c: WHITE, b: true });
  }

  tx(d, 'FICHA DE POSIÇÃO', x + cw / 2, y + 4.5, 5.5, { a: 'center', c: WHITE, b: true });
  tx(d, orgName.substring(0, 12).toUpperCase(), x + cw - 2, y + 4.5, 3.5, { a: 'right', c: '#c0d0e0' });

  const subH = 5.5;
  fbx(d, x, y + hdrH, cw, subH, '#f4f6f8');
  ln(d, x, y + hdrH + subH, x + cw, y + hdrH + subH, 0.2, LGRAY);

  const matchInfoLine = `J#${data.matchNumber || '-'} · ${data.court || data.venue || ''} · Adv: ${(opponent.shortName || opponent.name).substring(0, 10)}`;
  tx(d, matchInfoLine, x + 2, y + hdrH + 3.8, 3, { c: GRAY });

  const teamY = y + hdrH + subH + 1;
  tx(d, team.name.toUpperCase().substring(0, 14), x + 2, teamY + 3.5, 4.5, { b: true });
  tx(d, setLabel, x + cw - 2, teamY + 3.5, 6, { a: 'right', b: true });

  const libY = teamY + 5;
  tx(d, 'Líbero:', x + 2, libY + 2.5, 3.5, { c: GRAY });
  ln(d, x + 12, libY + 3, x + 28, libY + 3, 0.15, LGRAY);
  tx(d, 'Capitão:', x + 32, libY + 2.5, 3.5, { c: GRAY });
  ln(d, x + 43, libY + 3, x + cw - 2, libY + 3, 0.15, LGRAY);

  const posMap = [['IV', 'III', 'II'], ['V', 'VI', 'I']];
  const gridX = x + 3;
  const gridY = libY + 5;
  const cellW = (cw - 6) / 3;
  const cellH = (ch - (gridY - y) - 8) / 2;

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const px = gridX + c * cellW;
      const py = gridY + r * cellH;
      const pos = posMap[r][c];
      const isSaque = pos === 'I';
      bx(d, px, py, cellW, cellH, isSaque ? 0.5 : 0.2);
      tx(d, pos, px + 1.5, py + 3, 4, { b: true });
      if (isSaque) {
        tx(d, 'Saque', px + cellW / 2, py + cellH - 1.5, 3, { a: 'center', c: GRAY });
      }
    }
  }

  const sigY2 = y + ch - 5;
  tx(d, 'Assinatura do Técnico:', x + 3, sigY2 + 3.5, 3, { c: GRAY });
  ln(d, x + 32, sigY2 + 3.5, x + cw - 3, sigY2 + 3.5, 0.15, LGRAY);
}

// ══════════════════════════════════════════════════════════════════════
// ═ PUBLIC API (SEMPRE A4 PAISAGEM)
// ══════════════════════════════════════════════════════════════════════

export function generateOfficialMatchSheetPdf(data: MatchSheetData, debugLayout = false): jsPDF {
  const isFiveSets = data.format === '5-sets';
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  if (isFiveSets) {
    build5Sets(doc, data);
  } else {
    build3Sets(doc, data);
  }

  if (debugLayout) {
    drawDebugGrid(doc, PAGE_A4_LANDSCAPE.width, PAGE_A4_LANDSCAPE.height);
  }

  return doc;
}

export function generatePositionOrderSheetPdf(data: MatchSheetData): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  buildPositionSheet(doc, data);
  return doc;
}

export function generateBlankOfficialMatchSheetPdf(
  format: '3-sets' | '5-sets' = '3-sets',
  orgName = 'VolleyPro',
): jsPDF {
  const blankData: MatchSheetData = {
    orgName,
    competition: '___________________________',
    category: 'Geral',
    genderCategory: 'mixed',
    modality: 'indoor',
    format,
    playerFormat: '6x6',
    date: '____/____/________',
    time: '____:____',
    venue: '___________________________',
    court: '___',
    city: '___________________________',
    phase: '_______________',
    groupName: '_____',
    round: 0,
    matchNumber: 0,
    teamA: { name: 'EQUIPE A', shortName: 'EQ. A', athletes: [] },
    teamB: { name: 'EQUIPE B', shortName: 'EQ. B', athletes: [] },
    sets: [],
    finalScoreA: 0,
    finalScoreB: 0,
    referees: [],
    timeouts: [],
    substitutions: [],
    sanctions: [],
  };
  return generateOfficialMatchSheetPdf(blankData);
}

export function generateBlankPositionSheetsPdf(
  format: '3-sets' | '5-sets' = '3-sets',
  orgName = 'VolleyPro',
): jsPDF {
  const blankData: MatchSheetData = {
    orgName,
    competition: '___________________________',
    category: 'Geral',
    genderCategory: 'mixed',
    modality: 'indoor',
    format,
    playerFormat: '6x6',
    date: '____/____/________',
    time: '____:____',
    venue: '___________________________',
    court: '___',
    city: '___________________________',
    phase: '_______________',
    groupName: '_____',
    round: 0,
    matchNumber: 0,
    teamA: { name: 'EQUIPE A', shortName: 'EQ. A', athletes: [] },
    teamB: { name: 'EQUIPE B', shortName: 'EQ. B', athletes: [] },
    sets: [],
    finalScoreA: 0,
    finalScoreB: 0,
    referees: [],
    timeouts: [],
    substitutions: [],
    sanctions: [],
  };
  return generatePositionOrderSheetPdf(blankData);
}

function openPdf(doc: jsPDF, autoPrint: boolean): void {
  if (autoPrint) doc.autoPrint();
  const url = doc.output('bloburl');
  const w = window.open(url as unknown as string, '_blank');
  if (!w) window.alert('Abra o PDF manualmente (bloqueador de pop-ups ativo).');
}

export function printOfficialPdf(doc: jsPDF): void { openPdf(doc, true); }
export function printPositionPdf(doc: jsPDF): void { openPdf(doc, true); }
export function previewOfficialPdf(doc: jsPDF): jsPDF { openPdf(doc, false); return doc; }
export function previewPositionPdf(doc: jsPDF): jsPDF { openPdf(doc, false); return doc; }

export function downloadOfficialPdf(doc: jsPDF, filename = 'sumula-oficial.pdf'): void {
  doc.save(filename);
}
export function downloadPositionPdf(doc: jsPDF, filename = 'ficha-posicao.pdf'): void {
  doc.save(filename);
}
