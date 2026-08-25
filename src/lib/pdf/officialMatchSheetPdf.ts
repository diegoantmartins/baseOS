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

// ── colors ──────────────────────────────────────────────────────────
const INK = '#000000';
const DARK = '#1a1a1a';
const GRAY = '#555555';
const LGRAY = '#999999';
const BG = '#f0f0f0';
const WHITE = '#ffffff';

// ── geometry constants for A4 landscape (297 × 210 mm) ──────────────
const W = 297, H = 210, M = 4;

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
    // Fallback silencioso
  }
}

// ── HEADER (title bar) ─────────────────────────────────────────────
function drawHeader(d: jsPDF, data: MatchSheetData, subtitle = '') {
  const y = M, w = W - 2 * M, h = 13;
  fbx(d, M, y, w, h, '#1e3a5f');

  // Emblem circle
  d.setDrawColor(WHITE); d.setLineWidth(0.4);
  d.circle(M + 7, y + h / 2, 4.2, 'S');
  tx(d, 'V', M + 7, y + h / 2 + 1.2, 5.5, { a: 'center', c: WHITE, b: true });

  // Org name
  const orgName = (data.orgName || 'VolleyPro').toUpperCase();
  tx(d, orgName, M + 14, y + 5, 7, { c: WHITE, b: true });

  // SÚMULA OFICIAL
  const mainTitle = subtitle ? `SÚMULA OFICIAL (${subtitle.toUpperCase()})` : 'SÚMULA OFICIAL';
  tx(d, mainTitle, W / 2, y + 5.5, 9, { a: 'center', c: WHITE, b: true });

  // Modalidade
  const modTxt = data.modality === 'indoor' ? 'VÔLEI DE QUADRA' : 'VÔLEI DE PRAIA';
  tx(d, modTxt, W / 2, y + 10.5, 5, { a: 'center', c: '#c0d0e0' });

  // Competição & Categoria
  tx(d, data.competition.toUpperCase().substring(0, 32), W - M - 2, y + 5.5, 6, { a: 'right', c: WHITE, b: true });
  const catText = data.category ? data.category.toUpperCase() : '';
  tx(d, catText, W - M - 2, y + 10.5, 4.5, { a: 'right', c: '#c0d0e0' });
}

// ── MATCH INFO strip ────────────────────────────────────────────────
function drawMatchInfo(d: jsPDF, data: MatchSheetData) {
  const y = M + 14, w = W - 2 * M, h = 14;
  bx(d, M, y, w, h, 0.35);

  const cols = [42, 42, 50, 38, 36, 40, 41];
  let cx = M;
  const xpos: number[] = [cx];
  cols.forEach(cw => { cx += cw; xpos.push(cx); ln(d, cx, y, cx, y + h, 0.2); });

  const lbl = (s: string, xi: number, yi: number) => tx(d, s, xi + 1.5, yi, 4.2, { c: GRAY });
  const val = (s: string, xi: number, yi: number) => tx(d, s, xi + 1.5, yi, 5.5, { b: true });
  ln(d, M, y + 6.5, M + w, y + 6.5, 0.15, LGRAY);

  // Row 1
  lbl('NOME DA COMPETIÇÃO', xpos[0], y + 3.2);
  lbl('CIDADE', xpos[1], y + 3.2);
  lbl('GINÁSIO / QUADRA', xpos[2], y + 3.2);
  lbl('FASE', xpos[3], y + 3.2);
  lbl('JOGO Nº', xpos[4], y + 3.2);
  lbl('SEXO', xpos[5], y + 3.2);
  lbl('CATEGORIA', xpos[6], y + 3.2);

  val(data.competition.substring(0, 22), xpos[0], y + 5.8);
  val((data.city || '').substring(0, 20), xpos[1], y + 5.8);
  const venueStr = data.venue + (data.court ? ` - ${data.court}` : '');
  val(venueStr.substring(0, 24), xpos[2], y + 5.8);
  val((data.phase || data.groupName || '').substring(0, 18), xpos[3], y + 5.8);
  val(data.matchNumber > 0 ? String(data.matchNumber) : '', xpos[4], y + 5.8);

  const sx = xpos[5] + 1.5;
  const sy = y + 4.0;
  const genderIs = (g: string) => data.genderCategory === g;
  chk(d, sx, sy, 2.2, genderIs('male')); tx(d, 'M', sx + 2.8, sy + 1.8, 4.2);
  chk(d, sx + 8.5, sy, 2.2, genderIs('female')); tx(d, 'F', sx + 11.3, sy + 1.8, 4.2);
  chk(d, sx + 17, sy, 2.2, genderIs('mixed')); tx(d, 'X', sx + 19.8, sy + 1.8, 4.2);
  val(data.category, xpos[6], y + 5.8);

  // Row 2
  lbl('DATA', xpos[0], y + 9.8);
  lbl('HORÁRIO', xpos[1], y + 9.8);
  lbl('EQUIPES', xpos[2], y + 9.8);

  val(data.date || '', xpos[0], y + 12.6);
  val(data.time || '', xpos[1], y + 12.6);

  const teamsX = xpos[2] + 1.5;
  tx(d, 'A', teamsX, y + 12.6, 5, { b: true });
  if (data.teamA.logoUrl) {
    drawTeamLogo(d, data.teamA.logoUrl, teamsX + 3.5, y + 8, 4.8);
    tx(d, data.teamA.name.toUpperCase().substring(0, 16), teamsX + 9, y + 12.6, 5, { b: true });
  } else {
    tx(d, data.teamA.name.toUpperCase().substring(0, 18), teamsX + 4, y + 12.6, 5, { b: true });
  }

  const vsX = xpos[2] + (w - xpos[2] + M) / 2;
  tx(d, 'VS', vsX, y + 12.6, 5, { a: 'center', c: GRAY, b: true });

  tx(d, 'B', W - M - 2, y + 12.6, 5, { a: 'right', b: true });
  if (data.teamB.logoUrl) {
    drawTeamLogo(d, data.teamB.logoUrl, W - M - 12, y + 8, 4.8);
    tx(d, data.teamB.name.toUpperCase().substring(0, 16), W - M - 14, y + 12.6, 5, { a: 'right', b: true });
  } else {
    tx(d, data.teamB.name.toUpperCase().substring(0, 18), W - M - 6, y + 12.6, 5, { a: 'right', b: true });
  }
}

// ── SET BLOCK ───────────────────────────────────────────────────────
function drawSetBlock(
  d: jsPDF,
  setNum: number,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  isTiebreak = false,
  isCompact = false
) {
  bx(d, x, y, w, h, 0.35);

  const stripW = isCompact ? 5 : 6;
  fbx(d, x, y, stripW, h, BG);
  bx(d, x, y, stripW, h, 0.25);
  tx(d, 'S', x + stripW / 2, y + h * 0.22, isCompact ? 4.5 : 5.5, { a: 'center', b: true });
  tx(d, 'E', x + stripW / 2, y + h * 0.40, isCompact ? 4.5 : 5.5, { a: 'center', b: true });
  tx(d, 'T', x + stripW / 2, y + h * 0.58, isCompact ? 4.5 : 5.5, { a: 'center', b: true });
  tx(d, String(setNum), x + stripW / 2, y + h * 0.82, isCompact ? 6 : 7, { a: 'center', b: true });

  const innerX = x + stripW;
  const innerW = w - stripW;

  const teamW = (innerW - 2) / 2;
  const pointColW = isCompact ? 10.5 : 13.5;
  const teamContentW = teamW - pointColW;

  drawTeamHalf(d, innerX, y, teamContentW, h, 'A', data.teamA, isCompact);
  drawPointColumns(d, innerX + teamContentW, y, pointColW, h, isTiebreak, isCompact);
  drawTeamHalf(d, innerX + teamW + 2, y, teamContentW, h, 'B', data.teamB, isCompact);
  drawPointColumns(d, innerX + teamW + 2 + teamContentW, y, pointColW, h, isTiebreak, isCompact);
}

function drawTeamHalf(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  team: MatchSheetData['teamA'],
  isCompact = false
) {
  const r1h = isCompact ? 4.8 : 5.5;
  fbx(d, x, y, w, r1h, '#eaeaea');
  bx(d, x, y, w, r1h, 0.2);
  tx(d, label === 'A' ? 'HORÁRIO INÍCIO' : 'HORÁRIO FIM', x + 1, y + (isCompact ? 1.8 : 2), isCompact ? 2.8 : 3.5, { c: GRAY });
  tx(d, `H___:___`, x + 1, y + (isCompact ? 3.8 : 4.5), isCompact ? 2.8 : 3.5, { c: LGRAY });
  tx(d, 'EQUIPE', x + (isCompact ? 18 : 24), y + (isCompact ? 1.8 : 2), isCompact ? 2.8 : 3.5, { c: GRAY });
  tx(d, team.name.toUpperCase().substring(0, isCompact ? 15 : 20), x + (isCompact ? 18 : 24), y + (isCompact ? 3.8 : 4.5), isCompact ? 3.8 : 4.5, { b: true });

  const srX = x + w - (isCompact ? 5.5 : 6.5);
  d.setDrawColor(INK); d.setLineWidth(0.25);
  d.circle(srX, y + 1.8, isCompact ? 1.0 : 1.2, 'S'); tx(d, 'S', srX, y + 2.2, isCompact ? 3.0 : 3.5, { a: 'center', b: true });
  d.circle(srX + (isCompact ? 3.0 : 3.5), y + 1.8, isCompact ? 1.0 : 1.2, 'S'); tx(d, 'R', srX + (isCompact ? 3.0 : 3.5), y + 2.2, isCompact ? 3.0 : 3.5, { a: 'center', b: true });

  // Ordem de saque
  const r2y = y + r1h;
  const r2h = isCompact ? 4.5 : 5.0;
  bx(d, x, r2y, w, r2h, 0.15);
  const posLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const labelMargin = isCompact ? 17 : 22;
  const posW = (w - labelMargin) / 6;
  const posX0 = x + labelMargin;
  tx(d, 'ORDEM SAQUE', x + 1, r2y + (isCompact ? 3.0 : 3.2), isCompact ? 2.8 : 3.5, { c: GRAY });
  posLabels.forEach((lbl, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r2y, posW, r2h, 0.15);
    tx(d, lbl, px + posW / 2, r2y + (isCompact ? 3.2 : 3.5), isCompact ? 4.0 : 4.5, { a: 'center', b: true });
  });

  // Iniciantes
  const r3y = r2y + r2h;
  const r3h = isCompact ? 4.5 : 5.0;
  bx(d, x, r3y, w, r3h, 0.15);
  tx(d, 'INICIANTES', x + 1, r3y + (isCompact ? 3.0 : 3.2), isCompact ? 2.6 : 3.0, { c: GRAY });
  posLabels.forEach((_, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r3y, posW, r3h, 0.15);
  });

  // Nº do Jogador
  const r4y = r3y + r3h;
  const r4h = isCompact ? 3.5 : 4.0;
  bx(d, x, r4y, w, r4h, 0.15);
  tx(d, 'Nº JOGADOR', x + 1, r4y + (isCompact ? 2.5 : 2.8), isCompact ? 2.6 : 3.0, { c: GRAY });
  posLabels.forEach((_, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r4y, posW, r4h, 0.15);
  });

  // Substituições
  const subY = r4y + r4h;
  const subRowH = isCompact ? 3.0 : 3.5;
  const subRows = 2;
  fbx(d, x, subY, labelMargin, subRowH * subRows, '#f8f8f8');
  tx(d, 'SUBSTITUIÇÃO', x + 1, subY + 2.2, isCompact ? 2.4 : 2.8, { c: GRAY });
  tx(d, 'PLACAR TROCA', x + 1, subY + subRowH + 2.2, isCompact ? 2.2 : 2.5, { c: GRAY });
  for (let r = 0; r < subRows; r++) {
    const ry = subY + r * subRowH;
    ln(d, x, ry, x + w, ry, 0.1, LGRAY);
    posLabels.forEach((_, i) => {
      const px = posX0 + i * posW;
      bx(d, px, ry, posW, subRowH, 0.1);
      tx(d, ':', px + posW / 2, ry + (isCompact ? 2.2 : 2.5), isCompact ? 3.5 : 4.0, { a: 'center', c: LGRAY });
    });
  }
  bx(d, x, subY, w, subRowH * subRows, 0.15);

  // Rodadas de Saque
  const srvY = subY + subRowH * subRows;
  const srvRowH = (h - (srvY - y)) / 4;
  const srvLabels = [['1º', '5º'], ['2º', '6º'], ['3º', '7º'], ['4º', '8º']];
  tx(d, 'SAQUES', x + 1, srvY + 2.2, isCompact ? 2.4 : 2.8, { c: GRAY });
  for (let r = 0; r < 4; r++) {
    const ry = srvY + r * srvRowH;
    ln(d, x, ry, x + w, ry, 0.1);
    tx(d, srvLabels[r][0], x + 1, ry + srvRowH * 0.6, isCompact ? 2.6 : 3.0);
    tx(d, srvLabels[r][1], x + (isCompact ? 7 : 8), ry + srvRowH * 0.6, isCompact ? 2.6 : 3.0);
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
  isCompact = false
) {
  bx(d, x, y, w, h, 0.2);
  const hdrH = isCompact ? 3.0 : 3.5;
  fbx(d, x, y, w, hdrH, '#eaeaea');
  tx(d, 'PONTOS', x + w / 2, y + (isCompact ? 2.2 : 2.5), isCompact ? 3.0 : 3.5, { a: 'center', b: true });

  const maxPts = isTiebreak ? 30 : 36;
  const cols = isTiebreak ? 2 : 3;
  const ptsPerCol = isTiebreak ? 15 : 12;
  const colW = w / cols;
  const tHeight = isCompact ? 2.6 : 3.0;
  const rowH = (h - hdrH - tHeight) / ptsPerCol;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < ptsPerCol; r++) {
      const num = c * ptsPerCol + r + 1;
      if (num > maxPts) break;
      const px = x + c * colW;
      const py = y + hdrH + r * rowH;
      bx(d, px, py, colW, rowH, 0.08);
      tx(d, String(num), px + colW / 2, py + rowH * 0.7, isCompact ? 2.8 : 3.5, { a: 'center' });
    }
  }

  const tY = y + h - tHeight;
  fbx(d, x, tY, w, tHeight, BG);
  bx(d, x, tY, w, tHeight, 0.15);
  tx(d, 'T', x + w / 2, tY + tHeight * 0.75, isCompact ? 3.2 : 4.0, { a: 'center', b: true });
}

// ── SANCTIONS PANEL ────────────────────────────────────────────────
function drawSanctionsPanel(d: jsPDF, x: number, y: number, w: number, h: number, isCompact = false) {
  bx(d, x, y, w, h, 0.35);
  const titleH = isCompact ? 4.5 : 5.0;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'SANÇÕES', x + w / 2, y + (isCompact ? 3.2 : 3.5), isCompact ? 4.5 : 5.0, { a: 'center', c: WHITE, b: true });

  const hy = y + titleH;
  const colHdrs = ['A', 'P', 'E', 'D', '⊗', 'SET', 'PLACAR'];
  const colW = w / colHdrs.length;
  colHdrs.forEach((hdr, i) => {
    const cx = x + i * colW;
    bx(d, cx, hy, colW, isCompact ? 3.5 : 4.0, 0.15);
    tx(d, hdr, cx + colW / 2, hy + (isCompact ? 2.6 : 3.0), isCompact ? 3.0 : 3.5, { a: 'center', b: true });
  });

  const bottomH = isCompact ? 5.5 : 7.0;
  const rowCount = isCompact ? 5 : 6;
  const rowH = (h - titleH - (isCompact ? 3.5 : 4.0) - bottomH) / rowCount;
  for (let r = 0; r < rowCount; r++) {
    const ry = hy + (isCompact ? 3.5 : 4.0) + r * rowH;
    colHdrs.forEach((_, i) => {
      bx(d, x + i * colW, ry, colW, rowH, 0.08);
    });
  }

  const siY = y + h - bottomH;
  fbx(d, x, siY, w, bottomH, BG);
  bx(d, x, siY, w, bottomH, 0.2);
  tx(d, 'Solicitações Indevidas', x + 2, siY + (isCompact ? 2.4 : 3.0), isCompact ? 3.0 : 3.5, { b: true });
  tx(d, 'Equipe A:', x + 2, siY + (isCompact ? 4.6 : 6.0), isCompact ? 2.6 : 3.0, { c: GRAY });
  tx(d, 'Equipe B:', x + w / 2, siY + (isCompact ? 4.6 : 6.0), isCompact ? 2.6 : 3.0, { c: GRAY });
}

// ── TEAM ROSTER PANEL ──────────────────────────────────────────────
function drawTeamRosterPanel(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  isCompact = false
) {
  bx(d, x, y, w, h, 0.35);
  const titleH = isCompact ? 4.5 : 5.0;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'EQUIPES E ELENCOS', x + w / 2, y + (isCompact ? 3.2 : 3.5), isCompact ? 4.5 : 5.0, { a: 'center', c: WHITE, b: true });

  const colW = w / 2;
  ln(d, x + colW, y + titleH, x + colW, y + h, 0.2);

  const chY = y + titleH;
  const chH = isCompact ? 3.8 : 4.5;
  fbx(d, x, chY, colW, chH, BG);
  bx(d, x, chY, colW, chH, 0.15);
  tx(d, 'A', x + 2, chY + (isCompact ? 2.8 : 3.2), 4, { b: true });
  tx(d, 'Nº', x + 7, chY + (isCompact ? 2.8 : 3.2), 3.5, { c: GRAY, b: true });
  tx(d, 'Nomes dos jogadores', x + 13, chY + (isCompact ? 2.8 : 3.2), 3.5, { c: GRAY });

  fbx(d, x + colW, chY, colW, chH, BG);
  bx(d, x + colW, chY, colW, chH, 0.15);
  tx(d, 'B', x + colW + 2, chY + (isCompact ? 2.8 : 3.2), 4, { b: true });
  tx(d, 'Nº', x + colW + 7, chY + (isCompact ? 2.8 : 3.2), 3.5, { c: GRAY, b: true });
  tx(d, 'Nomes dos jogadores', x + colW + 13, chY + (isCompact ? 2.8 : 3.2), 3.5, { c: GRAY });

  const startY = chY + chH;
  const maxRows = 14;
  const staffReservedH = isCompact ? 14 : 20;
  const rowH = Math.min(isCompact ? 3.1 : 3.8, (h - titleH - chH - staffReservedH) / maxRows);

  const renderAthletes = (athletes: MatchSheetData['teamA']['athletes'], cx: number) => {
    const list = athletes.slice(0, maxRows);
    list.forEach((ath, i) => {
      const ry = startY + i * rowH;
      if (i % 2 === 0) fbx(d, cx, ry, colW, rowH, '#f7f7f7');
      ln(d, cx, ry + rowH, cx + colW, ry + rowH, 0.06, LGRAY);
      const numStr = ath.jerseyNumber !== undefined ? String(ath.jerseyNumber).padStart(2, '0') : '';
      let nameStr = ath.name.toUpperCase().substring(0, isCompact ? 16 : 18);
      if (ath.captain) nameStr += ' (C)';
      if (ath.libero) nameStr += ' (L)';
      tx(d, numStr, cx + 7, ry + rowH * 0.75, isCompact ? 3.0 : 3.5, { a: 'center', b: true });
      tx(d, nameStr, cx + 13, ry + rowH * 0.75, isCompact ? 2.7 : 3.0);
    });
    for (let i = list.length; i < maxRows; i++) {
      const ry = startY + i * rowH;
      ln(d, cx, ry + rowH, cx + colW, ry + rowH, 0.06, LGRAY);
    }
  };

  renderAthletes(data.teamA.athletes, x);
  renderAthletes(data.teamB.athletes, x + colW);

  // Technical Staff
  const staffY = startY + maxRows * rowH + 0.5;
  const staffH = y + h - staffY;
  if (staffH > 4) {
    ln(d, x, staffY - 0.5, x + w, staffY - 0.5, 0.2);
    const staffLabels = isCompact
      ? ['L', 'L', 'T', 'AT', 'M/F']
      : ['L', 'L', 'T', 'AT₁', 'AT₂', 'PF', 'M/F', 'E'];
    const sRowH = Math.min(isCompact ? 2.6 : 3.2, staffH / staffLabels.length);

    staffLabels.forEach((lbl, i) => {
      const sy = staffY + i * sRowH;
      tx(d, lbl, x + 2, sy + sRowH * 0.7, 3, { b: true });
      ln(d, x + 7, sy + sRowH - 0.3, x + colW - 1, sy + sRowH - 0.3, 0.06, LGRAY);
      if (lbl === 'T' && data.teamA.coach) {
        tx(d, data.teamA.coach.toUpperCase().substring(0, isCompact ? 14 : 16), x + 8, sy + sRowH * 0.7, 2.8);
      }

      tx(d, lbl, x + colW + 2, sy + sRowH * 0.7, 3, { b: true });
      ln(d, x + colW + 7, sy + sRowH - 0.3, x + w - 1, sy + sRowH - 0.3, 0.06, LGRAY);
      if (lbl === 'T' && data.teamB.coach) {
        tx(d, data.teamB.coach.toUpperCase().substring(0, isCompact ? 14 : 16), x + colW + 8, sy + sRowH * 0.7, 2.8);
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
  isCompact = false
) {
  bx(d, x, y, w, h, 0.35);
  const titleH = isCompact ? 4.5 : 5.0;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'RESULTADO', x + w / 2, y + (isCompact ? 3.2 : 3.5), isCompact ? 4.5 : 5.0, { a: 'center', c: WHITE, b: true });

  const innerY = y + titleH + 1;
  tx(d, 'EQUIPE', x + 2, innerY + 3, 3, { c: GRAY });
  tx(d, 'A', x + 2, innerY + 7, 4, { b: true });
  tx(d, data.teamA.shortName, x + 7, innerY + 7, 3.5);

  tx(d, 'B', x + w - 28, innerY + 7, 4, { b: true });
  tx(d, data.teamB.shortName, x + w - 23, innerY + 7, 3.5);

  const tableY = innerY + (isCompact ? 8 : 10);
  const rH = isCompact ? 4.2 : 5.0;
  tx(d, 'Set', x + 2, tableY + 2.5, 3.2, { c: GRAY, b: true });
  tx(d, 'Placar', x + 12, tableY + 2.5, 3.2, { c: GRAY });

  for (let s = 0; s < maxSets; s++) {
    const sy = tableY + 4 + s * rH;
    tx(d, `${s + 1}º (`, x + 2, sy + 3.0, 3.2);
    if (data.sets[s]) {
      tx(d, `${data.sets[s].scoreA} x ${data.sets[s].scoreB}`, x + 12, sy + 3.0, 3.2, { b: true });
    }
    tx(d, ')', x + 26, sy + 3.0, 3.2);
    ln(d, x + 2, sy + rH, x + w - 2, sy + rH, 0.06, LGRAY);
  }

  // Durations & Timings
  const durY = tableY + 4 + maxSets * rH + 1;
  tx(d, 'Hora Início:', x + 2, durY + 3, 3, { c: GRAY });
  tx(d, data.time || '___:___', x + 18, durY + 3, 3.2, { b: true });

  tx(d, 'Hora Fim:', x + w / 2, durY + 3, 3, { c: GRAY });
  tx(d, '___:___', x + w / 2 + 14, durY + 3, 3.2);

  // Winner section
  const winY = y + h - (isCompact ? 6.5 : 8.0);
  fbx(d, x, winY, w, isCompact ? 6.5 : 8.0, '#f4f6f8');
  bx(d, x, winY, w, isCompact ? 6.5 : 8.0, 0.15);
  tx(d, 'VENCEDOR:', x + 2, winY + (isCompact ? 4.2 : 5.0), isCompact ? 4.0 : 5.0, { b: true });
  if (data.winner) {
    const winnerName = data.winner === 'A' ? data.teamA.name : data.teamB.name;
    tx(d, winnerName.toUpperCase().substring(0, 18), x + 22, winY + (isCompact ? 4.2 : 5.0), isCompact ? 4.0 : 5.0, { b: true });
  }
  const scoreStr = `${data.finalScoreA} : ${data.finalScoreB}`;
  tx(d, scoreStr, x + w - 4, winY + (isCompact ? 4.2 : 5.0), isCompact ? 5.0 : 6.0, { a: 'right', b: true });
}

// ── PONTOS NA TROCA (Tie-break) ─────────────────────────────────────
function drawPontosNaTroca(d: jsPDF, x: number, y: number, w: number, h: number, isCompact = false) {
  bx(d, x, y, w, h, 0.3);
  const titleH = isCompact ? 4.5 : 5.0;
  fbx(d, x, y, w, titleH, BG);
  bx(d, x, y, w, titleH, 0.15);
  tx(d, 'PONTOS NA TROCA', x + w / 2, y + (isCompact ? 3.2 : 3.5), 3.5, { a: 'center', b: true });

  const gridY = y + titleH;
  const gridH = (h - titleH) / 2;
  const posLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const colW = (w - 18) / 6;

  posLabels.forEach((lbl, i) => {
    tx(d, lbl, x + 18 + i * colW + colW / 2, gridY + 3, 3.5, { a: 'center', b: true });
  });

  for (let t = 0; t < 2; t++) {
    const gy = gridY + t * gridH;
    const label = t === 0 ? 'A' : 'B';
    fbx(d, x, gy, 8, gridH, '#f4f4f4');
    tx(d, label, x + 4, gy + gridH / 2 + 1, 5, { a: 'center', b: true });
    grid(d, x + 8, gy, w - 8, gridH, 6, 3, 0.08);
  }
}

// ── SIGNATURES & OBSERVATIONS ──────────────────────────────────────
function drawSignaturesPanel(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData) {
  bx(d, x, y, w, h, 0.35);

  const obsW = w * 0.55;
  const aprW = w * 0.45;

  // Observações
  fbx(d, x, y, obsW, 4.5, '#1e3a5f');
  tx(d, 'OBSERVAÇÕES', x + obsW / 2, y + 3.2, 4.5, { a: 'center', c: WHITE, b: true });
  for (let i = 1; i <= 4; i++) {
    ln(d, x + 2, y + 4.5 + i * 4, x + obsW - 2, y + 4.5 + i * 4, 0.08, LGRAY);
  }
  if (data.observations) {
    tx(d, data.observations.substring(0, 50), x + 2, y + 8, 3);
  }

  // Aprovação
  const ax = x + obsW;
  ln(d, ax, y, ax, y + h, 0.2);
  fbx(d, ax, y, aprW, 4.5, '#1e3a5f');
  tx(d, 'APROVAÇÃO', ax + aprW / 2, y + 3.2, 4.5, { a: 'center', c: WHITE, b: true });

  const aprY = y + 5.5;
  const aprLabels = ['FUNÇÃO', 'NOME', 'ASSINATURA'];
  const funcW = aprW * 0.28;
  const nomeW = aprW * 0.35;
  tx(d, aprLabels[0], ax + 2, aprY + 2.5, 3, { c: GRAY, b: true });
  tx(d, aprLabels[1], ax + funcW + 2, aprY + 2.5, 3, { c: GRAY, b: true });
  tx(d, aprLabels[2], ax + funcW + nomeW + 2, aprY + 2.5, 3, { c: GRAY, b: true });
  ln(d, ax, aprY + 3.5, ax + aprW, aprY + 3.5, 0.1);

  const refRoles = ['1º árbitro', '2º árbitro', 'Apontador'];
  const rH = Math.min(4.0, (h - 12) / 3);
  refRoles.forEach((role, i) => {
    const ry = aprY + 4 + i * rH;
    tx(d, role, ax + 2, ry + 3, 3);
    const ref = data.referees[i];
    if (ref) tx(d, ref.name, ax + funcW + 2, ry + 3, 3);
    ln(d, ax + funcW, ry + rH, ax + aprW, ry + rH, 0.06, LGRAY);
  });
}

function drawCaptainsAndCoachesSignatures(d: jsPDF, x: number, y: number, w: number, h: number) {
  bx(d, x, y, w, h, 0.3);
  fbx(d, x, y, w, 4.5, '#1e3a5f');
  tx(d, 'ASSINATURAS DOS CAPITÃES E TÉCNICOS', x + w / 2, y + 3.2, 4, { a: 'center', c: WHITE, b: true });
  const halfW = w / 2;
  ln(d, x + halfW, y + 4.5, x + halfW, y + h, 0.15);

  tx(d, 'EQUIPE A', x + halfW / 2, y + 7.5, 3.2, { a: 'center', b: true });
  tx(d, 'Capitão: ________________', x + 3, y + 12, 3, { c: GRAY });
  tx(d, 'Técnico: ________________', x + 3, y + 17, 3, { c: GRAY });

  tx(d, 'EQUIPE B', x + halfW + halfW / 2, y + 7.5, 3.2, { a: 'center', b: true });
  tx(d, 'Capitão: ________________', x + halfW + 3, y + 12, 3, { c: GRAY });
  tx(d, 'Técnico: ________________', x + halfW + 3, y + 17, 3, { c: GRAY });
}

// ══════════════════════════════════════════════════════════════════════
// ═ MAIN BUILDERS (3 SETS & 5 SETS AMBAS EM A4 PAISAGEM)
// ══════════════════════════════════════════════════════════════════════

function build3Sets(d: jsPDF, data: MatchSheetData) {
  drawHeader(d, data);
  drawMatchInfo(d, data);

  const setsX = M;
  const setsY = M + 30;
  const setsW = (W - 2 * M) * 0.65;
  const rightX = setsX + setsW + 2;
  const rightW = W - 2 * M - setsW - 2;

  // 3 Sets empilhados
  const setH = 37;
  const setGap = 1.5;
  for (let i = 0; i < 3; i++) {
    const sy = setsY + i * (setH + setGap);
    const isTiebreak = i === 2;
    drawSetBlock(d, i + 1, setsX, sy, setsW, setH, data, isTiebreak, false);
  }

  // Painel direito: Sanções e Elencos
  const rpY = setsY;
  const sanctionsH = 32;
  drawSanctionsPanel(d, rightX, rpY, rightW, sanctionsH, false);

  const rosterY = rpY + sanctionsH + 1.5;
  const rosterH = 78;
  drawTeamRosterPanel(d, rightX, rosterY, rightW, rosterH, data, false);

  // Parte inferior: Resultado e Pontos na Troca
  const bottomY = setsY + 3 * (setH + setGap) + 1;
  const resultW = setsW * 0.5;
  const resultH = H - bottomY - M - 1;
  drawResultPanel(d, M, bottomY, resultW, resultH, data, 3, false);
  drawPontosNaTroca(d, M + resultW + 1, bottomY, setsW - resultW - 1, bottomH(resultH), false);

  // Assinaturas e Observações no painel direito inferior
  const sigY = rosterY + rosterH + 1.5;
  const sigH = H - sigY - M;
  if (sigH > 10) {
    drawSignaturesPanel(d, rightX, sigY, rightW, sigH, data);
  }

  // Rodapé
  tx(d, 'VolleyPro · Súmula Oficial (3 Sets A4 Paisagem)', M, H - 2, 3.5, { c: LGRAY });
  tx(d, `Gerado: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, W - M, H - 2, 3.5, { a: 'right', c: LGRAY });
}

function bottomH(h: number): number {
  return h;
}

function build5Sets(d: jsPDF, data: MatchSheetData) {
  drawHeader(d, data, '5 Sets');
  drawMatchInfo(d, data);

  const setsX = M;
  const setsY = M + 30;
  const setsW = (W - 2 * M) * 0.65; // 187.8 mm
  const rightX = setsX + setsW + 2;
  const rightW = W - 2 * M - setsW - 2; // 99.2 mm

  // Distribuição harmoniosa dos 5 Sets no lado esquerdo:
  // Linha 1: Set 1 e Set 2 lado a lado
  const halfSetW = (setsW - 1.5) / 2;
  const setH = 34;
  const setGap = 1.5;

  drawSetBlock(d, 1, setsX, setsY, halfSetW, setH, data, false, true);
  drawSetBlock(d, 2, setsX + halfSetW + 1.5, setsY, halfSetW, setH, data, false, true);

  // Linha 2: Set 3 e Set 4 lado a lado
  const row2Y = setsY + setH + setGap;
  drawSetBlock(d, 3, setsX, row2Y, halfSetW, setH, data, false, true);
  drawSetBlock(d, 4, setsX + halfSetW + 1.5, row2Y, halfSetW, setH, data, false, true);

  // Linha 3: Set 5 (Tie-break decisivo) em largura total
  const row3Y = row2Y + setH + setGap;
  drawSetBlock(d, 5, setsX, row3Y, setsW, setH, data, true, false);

  // Painel direito: Sanções e Elencos
  const sanctionsH = 30;
  drawSanctionsPanel(d, rightX, setsY, rightW, sanctionsH, true);

  const rosterY = setsY + sanctionsH + 1.5;
  const rosterH = 74;
  drawTeamRosterPanel(d, rightX, rosterY, rightW, rosterH, data, true);

  // Parte inferior esquerda: Resultado (5 sets) e Pontos na Troca
  const bottomY = row3Y + setH + 1.5;
  const bottomHeight = H - bottomY - M - 1;
  const resultW = setsW * 0.5;

  drawResultPanel(d, M, bottomY, resultW, bottomHeight, data, 5, true);
  drawPontosNaTroca(d, M + resultW + 1, bottomY, setsW - resultW - 1, bottomHeight, true);

  // Parte inferior direita: Assinaturas e Aprovação
  const sigY = rosterY + rosterH + 1.5;
  const sigH = H - sigY - M;
  if (sigH > 8) {
    drawSignaturesPanel(d, rightX, sigY, rightW, sigH, data);
  }

  // Rodapé
  tx(d, 'VolleyPro · Súmula Oficial (5 Sets A4 Paisagem)', M, H - 2, 3.5, { c: LGRAY });
  tx(d, `Gerado: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, W - M, H - 2, 3.5, { a: 'right', c: LGRAY });
}

// ── FICHAS DE POSIÇÃO ──────────────────────────────────────────────
function buildPositionSheet(d: jsPDF, data: MatchSheetData) {
  const orgName = data.orgName || 'VolleyPro';
  const isFiveSets = data.format === '5-sets';

  const cardCols = 4;
  const cardRows = 2;
  const gapX = 3, gapY = 4;
  const cw = (W - 2 * M - (cardCols - 1) * gapX) / cardCols;
  const ch = (H - 2 * M - 8 - (cardRows - 1) * gapY) / cardRows;

  tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO`, W / 2, M + 3, 6, { a: 'center', b: true, c: DARK });
  tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, W / 2, M + 7, 4, { a: 'center', c: GRAY });

  for (let c = 0; c < 4; c++) {
    const setNum = c + 1;
    const setLabel = setNum <= (isFiveSets ? 5 : 3) ? `SET ${setNum}` : `SET EXTRA`;

    const cxA = M + c * (cw + gapX);
    const cyA = M + 8;
    drawPositionCard(d, cxA, cyA, cw, ch, data, data.teamA, data.teamB, `${setLabel} (A)`, orgName);

    const cxB = M + c * (cw + gapX);
    const cyB = M + 8 + (ch + gapY);
    drawPositionCard(d, cxB, cyB, cw, ch, data, data.teamB, data.teamA, `${setLabel} (B)`, orgName);
  }

  tx(d, `VolleyPro · Fichas de Posição / Ordem de Saque ${isFiveSets ? '(Página 1/2)' : ''}`, M, H - 2, 3.5, { c: LGRAY });

  if (isFiveSets) {
    d.addPage('a4', 'landscape');
    tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO (SETS DECISIVOS)`, W / 2, M + 3, 6, { a: 'center', b: true, c: DARK });
    tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, W / 2, M + 7, 4, { a: 'center', c: GRAY });

    for (let c = 0; c < 2; c++) {
      const setNum = c + 5;
      const setLabel = setNum === 5 ? `SET 5 (TB)` : `SET EXTRA`;

      const cxA = M + c * (cw + gapX);
      const cyA = M + 8;
      drawPositionCard(d, cxA, cyA, cw, ch, data, data.teamA, data.teamB, `${setLabel} (A)`, orgName);

      const cxB = M + c * (cw + gapX);
      const cyB = M + 8 + (ch + gapY);
      drawPositionCard(d, cxB, cyB, cw, ch, data, data.teamB, data.teamA, `${setLabel} (B)`, orgName);
    }

    tx(d, 'VolleyPro · Fichas de Posição / Ordem de Saque (Página 2/2)', M, H - 2, 3.5, { c: LGRAY });
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

export function generateOfficialMatchSheetPdf(data: MatchSheetData): jsPDF {
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
