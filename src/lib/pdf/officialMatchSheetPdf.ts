// =====================================================================
// Súmula Oficial de Voleibol — Reprodução fiel da estrutura oficial
// (padrão FPV/CBV) com identidade 100% do sistema (sem marcas de terceiros).
//
// Documentos suportados:
//  • Súmula 3 sets  → A4 paisagem (297 × 210 mm)
//  • Súmula 5 sets  → A3 paisagem (420 × 297 mm)
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

// ── geometry constants for 3-sets A4 landscape (297 × 210 mm) ───────
const W3 = 297, H3 = 210, M = 4; // page width, height, margin

// ── HEADER (title bar) ─────────────────────────────────────────────
function drawHeader3(d: jsPDF, data: MatchSheetData) {
  const y = M, w = W3 - 2 * M, h = 14;
  // background bar
  fbx(d, M, y, w, h, '#1e3a5f');
  // emblem circle placeholder (left)
  d.setDrawColor(WHITE); d.setLineWidth(0.4);
  d.circle(M + 8, y + h / 2, 4.5, 'S');
  tx(d, 'V', M + 8, y + h / 2 + 1.3, 5.5, { a: 'center', c: WHITE, b: true });
  // system name / org name (left)
  const orgName = (data.orgName || 'VolleyPro').toUpperCase();
  tx(d, orgName, M + 15, y + 5, 7, { c: WHITE, b: true });
  // "SÚMULA OFICIAL" title
  tx(d, 'SÚMULA OFICIAL', W3 / 2, y + 5.5, 9, { a: 'center', c: WHITE, b: true });
  // match/format info (right)
  const modTxt = data.modality === 'indoor' ? 'VÔLEI DE QUADRA' : 'VÔLEI DE PRAIA';
  tx(d, modTxt, W3 / 2, y + 11, 5.5, { a: 'center', c: '#c0d0e0' });
  // competition name (right side)
  tx(d, data.competition.toUpperCase(), W3 - M - 2, y + 5.5, 6, { a: 'right', c: WHITE, b: true });
  const catText = data.category ? data.category.toUpperCase() : '';
  tx(d, catText, W3 - M - 2, y + 11, 5, { a: 'right', c: '#c0d0e0' });
}

// ── MATCH INFO strip ────────────────────────────────────────────────
function drawMatchInfo3(d: jsPDF, data: MatchSheetData) {
  const y = M + 15, w = W3 - 2 * M, h = 15;
  bx(d, M, y, w, h, 0.35);

  // dividers — split into 7 columns
  const cols = [42, 42, 50, 38, 36, 40, 41]; // approximate mm widths
  let cx = M;
  const xpos: number[] = [cx];
  cols.forEach(cw => { cx += cw; xpos.push(cx); ln(d, cx, y, cx, y + h, 0.2); });

  const lbl = (s: string, xi: number, yi: number) => tx(d, s, xi + 1.5, yi, 4.5, { c: GRAY });
  const val = (s: string, xi: number, yi: number) => tx(d, s, xi + 1.5, yi, 6, { b: true });
  // horizontal midline
  ln(d, M, y + 7, M + w, y + 7, 0.15, LGRAY);

  // Row 1 labels
  lbl('NOME DA COMPETIÇÃO', xpos[0], y + 3.5);
  lbl('CIDADE', xpos[1], y + 3.5);
  lbl('GINÁSIO / QUADRA', xpos[2], y + 3.5);
  lbl('FASE', xpos[3], y + 3.5);
  lbl('JOGO Nº', xpos[4], y + 3.5);
  lbl('SEXO', xpos[5], y + 3.5);
  lbl('CATEGORIA', xpos[6], y + 3.5);

  // Row 1 values
  val(data.competition, xpos[0], y + 6.5);
  val(data.city || '', xpos[1], y + 6.5);
  const venueStr = data.venue + (data.court ? ` - ${data.court}` : '');
  val(venueStr.substring(0, 24), xpos[2], y + 6.5);
  val(data.phase || data.groupName || '', xpos[3], y + 6.5);
  val(data.matchNumber > 0 ? String(data.matchNumber) : '', xpos[4], y + 6.5);
  // sex checkboxes
  const sx = xpos[5] + 1.5;
  const sy = y + 4.5;
  const genderIs = (g: string) => data.genderCategory === g;
  chk(d, sx, sy, 2.5, genderIs('male')); tx(d, 'M', sx + 3, sy + 2, 4.5);
  chk(d, sx + 9, sy, 2.5, genderIs('female')); tx(d, 'F', sx + 12, sy + 2, 4.5);
  chk(d, sx + 18, sy, 2.5, genderIs('mixed')); tx(d, 'X', sx + 21, sy + 2, 4.5);
  val(data.category, xpos[6], y + 6.5);

  // Row 2 labels
  lbl('DATA', xpos[0], y + 10.5);
  lbl('HORÁRIO', xpos[1], y + 10.5);
  // Row 2: Team names
  lbl('EQUIPES', xpos[2], y + 10.5);

  // Row 2 values
  val(data.date || '', xpos[0], y + 13.5);
  val(data.time || '', xpos[1], y + 13.5);
  // Teams A vs B centered in remaining width
  const teamsX = xpos[2] + 1.5;
  tx(d, 'A', teamsX, y + 12, 5, { b: true });
  tx(d, data.teamA.name.toUpperCase(), teamsX + 4.5, y + 12, 5.5, { b: true });
  const vsX = xpos[2] + (w - xpos[2] + M) / 2;
  tx(d, 'VS', vsX, y + 13.5, 5.5, { a: 'center', c: GRAY, b: true });
  tx(d, 'B', W3 - M - 2, y + 12, 5, { a: 'right', b: true });
  tx(d, data.teamB.name.toUpperCase(), W3 - M - 7, y + 12, 5.5, { a: 'right', b: true });
}

// ── SET BLOCK drawing ───────────────────────────────────────────────
// Each set block contains:
// - Team A half (serve order, lineup, substitutions, serve rotation, point columns)
// - Team B half (same structure)
// All grids are blank for manual use by mesários.

function drawSetBlock(d: jsPDF, setNum: number, x: number, y: number, w: number, h: number, data: MatchSheetData, isTiebreak = false) {
  // Outer border
  bx(d, x, y, w, h, 0.4);

  // SET number badge (left strip)
  const stripW = 6;
  fbx(d, x, y, stripW, h, BG);
  bx(d, x, y, stripW, h, 0.3);
  tx(d, 'S', x + stripW / 2, y + h * 0.25, 5.5, { a: 'center', b: true });
  tx(d, 'E', x + stripW / 2, y + h * 0.42, 5.5, { a: 'center', b: true });
  tx(d, 'T', x + stripW / 2, y + h * 0.59, 5.5, { a: 'center', b: true });
  tx(d, String(setNum), x + stripW / 2, y + h * 0.82, 7, { a: 'center', b: true });

  const innerX = x + stripW;
  const innerW = w - stripW;

  // Split into left team (A) and right team (B)
  const teamW = (innerW - 2) / 2; // 2mm gap between teams
  const pointColW = 14; // width of point columns
  const teamContentW = teamW - pointColW;

  drawTeamHalf(d, innerX, y, teamContentW, h, 'A', data.teamA, setNum, isTiebreak);
  drawPointColumns(d, innerX + teamContentW, y, pointColW, h, isTiebreak);
  drawTeamHalf(d, innerX + teamW + 2, y, teamContentW, h, 'B', data.teamB, setNum, isTiebreak);
  drawPointColumns(d, innerX + teamW + 2 + teamContentW, y, pointColW, h, isTiebreak);
}

function drawTeamHalf(d: jsPDF, x: number, y: number, w: number, h: number, label: string,
  team: MatchSheetData['teamA'], setNum: number, _isTiebreak: boolean) {

  // --- Row 1: Horário + Equipe name ---
  const r1h = 5.5;
  fbx(d, x, y, w, r1h, '#eaeaea');
  bx(d, x, y, w, r1h, 0.2);
  tx(d, label === 'A' ? 'HORÁRIO DO INÍCIO' : 'HORÁRIO DO FIM', x + 1, y + 2, 3.5, { c: GRAY });
  tx(d, `H___:___`, x + 1, y + 4.5, 3.5, { c: LGRAY });
  tx(d, 'EQUIPE', x + 25, y + 2, 3.5, { c: GRAY });
  tx(d, team.name.toUpperCase().substring(0, 20), x + 25, y + 4.5, 4.5, { b: true });
  // S/R circles
  const srX = x + w - 6;
  d.setDrawColor(INK); d.setLineWidth(0.25);
  d.circle(srX, y + 1.8, 1.2, 'S'); tx(d, 'S', srX, y + 2.3, 3.5, { a: 'center', b: true });
  d.circle(srX + 3.5, y + 1.8, 1.2, 'S'); tx(d, 'R', srX + 3.5, y + 2.3, 3.5, { a: 'center', b: true });

  // --- Row 2: Ordem de saque (positions I-VI) ---
  const r2y = y + r1h;
  const r2h = 5;
  bx(d, x, r2y, w, r2h, 0.15);
  const posLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const posW = (w - 22) / 6; // 22mm reserved for left labels
  const posX0 = x + 22;
  tx(d, 'ORDEM DE SAQUE', x + 1, r2y + 3, 3.5, { c: GRAY });
  posLabels.forEach((lbl, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r2y, posW, r2h, 0.15);
    tx(d, lbl, px + posW / 2, r2y + 3.5, 4.5, { a: 'center', b: true });
  });

  // --- Row 3: Jogadores Iniciantes (empty cells for mesário) ---
  const r3y = r2y + r2h;
  const r3h = 5;
  bx(d, x, r3y, w, r3h, 0.15);
  tx(d, 'JOGADORES INICIANTES', x + 1, r3y + 3, 3, { c: GRAY });
  posLabels.forEach((_, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r3y, posW, r3h, 0.15);
  });

  // --- Row 4: Nº do Jogador ---
  const r4y = r3y + r3h;
  const r4h = 4;
  bx(d, x, r4y, w, r4h, 0.15);
  tx(d, 'Nº DO JOGADOR', x + 1, r4y + 2.8, 3, { c: GRAY });
  posLabels.forEach((_, i) => {
    const px = posX0 + i * posW;
    bx(d, px, r4y, posW, r4h, 0.15);
  });

  // --- Rows 5-6: Substituições (2 rows with : separators) ---
  const subY = r4y + r4h;
  const subRowH = 3.5;
  const subRows = 3;
  fbx(d, x, subY, 22, subRowH * subRows, '#f8f8f8');
  tx(d, 'SUBSTITUIÇÕES', x + 1, subY + 2.5, 2.8, { c: GRAY });
  tx(d, 'PLACAR NA TROCA', x + 1, subY + subRowH + 2.5, 2.5, { c: GRAY });
  for (let r = 0; r < subRows; r++) {
    const ry = subY + r * subRowH;
    ln(d, x, ry, x + w, ry, 0.1, LGRAY);
    posLabels.forEach((_, i) => {
      const px = posX0 + i * posW;
      bx(d, px, ry, posW, subRowH, 0.1);
      tx(d, ':', px + posW / 2, ry + 2.5, 4, { a: 'center', c: LGRAY });
    });
  }
  bx(d, x, subY, w, subRowH * subRows, 0.15);

  // --- Rows 7-10: Rodada de saques (4 rows × 6 positions × 2 sub-cols each) ---
  const srvY = subY + subRowH * subRows;
  const srvRowH = (h - (srvY - y)) / 4;
  const srvLabels = [['1º', '5º'], ['2º', '6º'], ['3º', '7º'], ['4º', '8º']];
  tx(d, 'RODADA DE SAQUES', x + 1, srvY + 2.5, 2.8, { c: GRAY });
  for (let r = 0; r < 4; r++) {
    const ry = srvY + r * srvRowH;
    ln(d, x, ry, x + w, ry, 0.1);
    // row labels
    tx(d, srvLabels[r][0], x + 1, ry + srvRowH * 0.6, 3);
    tx(d, srvLabels[r][1], x + 8, ry + srvRowH * 0.6, 3);
    // grid cells for each position
    posLabels.forEach((_, i) => {
      const px = posX0 + i * posW;
      const subW = posW / 2;
      bx(d, px, ry, subW, srvRowH, 0.08);
      bx(d, px + subW, ry, subW, srvRowH, 0.08);
    });
  }
  // outer border for serve section
  bx(d, x, srvY, w, srvRowH * 4, 0.15);
}

function drawPointColumns(d: jsPDF, x: number, y: number, w: number, h: number, isTiebreak: boolean) {
  bx(d, x, y, w, h, 0.2);
  // header
  const hdrH = 3.5;
  fbx(d, x, y, w, hdrH, '#eaeaea');
  tx(d, 'PONTOS', x + w / 2, y + 2.5, 3.5, { a: 'center', b: true });

  const maxPts = isTiebreak ? 30 : 36;
  const cols = isTiebreak ? 2 : 3;
  const ptsPerCol = isTiebreak ? 15 : 12;
  const colW = w / cols;
  const rowH = (h - hdrH - 3) / ptsPerCol; // leave 3mm for T marker at bottom

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < ptsPerCol; r++) {
      const num = c * ptsPerCol + r + 1;
      if (num > maxPts) break;
      const px = x + c * colW;
      const py = y + hdrH + r * rowH;
      bx(d, px, py, colW, rowH, 0.08);
      tx(d, String(num), px + colW / 2, py + rowH * 0.7, 3.5, { a: 'center' });
    }
  }

  // T (timeout) marker at bottom
  const tY = y + h - 3;
  fbx(d, x, tY, w, 3, BG);
  bx(d, x, tY, w, 3, 0.15);
  tx(d, 'T', x + w / 2, tY + 2.2, 4, { a: 'center', b: true });
}

// ── RIGHT PANEL: sanctions, team rosters, result ────────────────────

function drawSanctionsPanel(d: jsPDF, x: number, y: number, w: number, h: number) {
  bx(d, x, y, w, h, 0.35);
  // Title bar
  const titleH = 5;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'SANÇÕES', x + w / 2, y + 3.5, 5, { a: 'center', c: WHITE, b: true });

  // Headers
  const hy = y + titleH;
  const colHdrs = ['A', 'P', 'E', 'D', '⊗', 'SET', 'PLACAR'];
  const colW = w / colHdrs.length;
  colHdrs.forEach((hdr, i) => {
    const cx = x + i * colW;
    bx(d, cx, hy, colW, 4, 0.15);
    tx(d, hdr, cx + colW / 2, hy + 3, 3.5, { a: 'center', b: true });
  });

  // Empty rows for entries
  const rowH = (h - titleH - 4) / 6;
  for (let r = 0; r < 6; r++) {
    const ry = hy + 4 + r * rowH;
    colHdrs.forEach((_, i) => {
      bx(d, x + i * colW, ry, colW, rowH, 0.08);
    });
  }

  // Solicitações indevidas section (bottom)
  const siY = y + h - 7;
  fbx(d, x, siY, w, 7, BG);
  bx(d, x, siY, w, 7, 0.2);
  tx(d, 'Solicitações Indevidas', x + 2, siY + 3, 3.5, { b: true });
  tx(d, 'Equipe A:', x + 2, siY + 6, 3, { c: GRAY });
  tx(d, 'Equipe B:', x + w / 2, siY + 6, 3, { c: GRAY });
}

function drawTeamRosterPanel(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData) {
  bx(d, x, y, w, h, 0.35);
  // Title bar
  const titleH = 5;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'EQUIPES', x + w / 2, y + 3.5, 5, { a: 'center', c: WHITE, b: true });

  // Split into two columns (A and B)
  const colW = w / 2;
  ln(d, x + colW, y + titleH, x + colW, y + h, 0.2);

  // Column A header
  const chY = y + titleH;
  const chH = 4.5;
  fbx(d, x, chY, colW, chH, BG);
  bx(d, x, chY, colW, chH, 0.15);
  tx(d, 'A', x + 2, chY + 3.2, 4, { b: true });
  tx(d, 'Nº', x + 8, chY + 3.2, 3.5, { c: GRAY, b: true });
  tx(d, 'Nomes dos jogadores', x + 14, chY + 3.2, 3.5, { c: GRAY });

  // Column B header
  fbx(d, x + colW, chY, colW, chH, BG);
  bx(d, x + colW, chY, colW, chH, 0.15);
  tx(d, 'B', x + colW + 2, chY + 3.2, 4, { b: true });
  tx(d, 'Nº', x + colW + 8, chY + 3.2, 3.5, { c: GRAY, b: true });
  tx(d, 'Nomes dos jogadores', x + colW + 14, chY + 3.2, 3.5, { c: GRAY });

  // Athlete rows
  const startY = chY + chH;
  const maxRows = 14;
  const rowH = Math.min(3.8, (h - titleH - chH - 20) / maxRows); // leave space for staff

  // Team A athletes
  const athletesA = data.teamA.athletes.slice(0, maxRows);
  athletesA.forEach((ath, i) => {
    const ry = startY + i * rowH;
    if (i % 2 === 0) fbx(d, x, ry, colW, rowH, '#f7f7f7');
    ln(d, x, ry + rowH, x + colW, ry + rowH, 0.06, LGRAY);
    const numStr = ath.jerseyNumber !== undefined ? String(ath.jerseyNumber).padStart(2, '0') : '';
    let nameStr = ath.name.toUpperCase().substring(0, 18);
    if (ath.captain) nameStr += ' (C)';
    if (ath.libero) nameStr += ' (L)';
    tx(d, numStr, x + 8, ry + rowH * 0.75, 3.5, { a: 'center', b: true });
    tx(d, nameStr, x + 14, ry + rowH * 0.75, 3);
  });
  // Fill remaining empty rows for Team A
  for (let i = athletesA.length; i < maxRows; i++) {
    const ry = startY + i * rowH;
    ln(d, x, ry + rowH, x + colW, ry + rowH, 0.06, LGRAY);
  }

  // Team B athletes
  const athletesB = data.teamB.athletes.slice(0, maxRows);
  athletesB.forEach((ath, i) => {
    const ry = startY + i * rowH;
    if (i % 2 === 0) fbx(d, x + colW, ry, colW, rowH, '#f7f7f7');
    ln(d, x + colW, ry + rowH, x + w, ry + rowH, 0.06, LGRAY);
    const numStr = ath.jerseyNumber !== undefined ? String(ath.jerseyNumber).padStart(2, '0') : '';
    let nameStr = ath.name.toUpperCase().substring(0, 18);
    if (ath.captain) nameStr += ' (C)';
    if (ath.libero) nameStr += ' (L)';
    tx(d, numStr, x + colW + 8, ry + rowH * 0.75, 3.5, { a: 'center', b: true });
    tx(d, nameStr, x + colW + 14, ry + rowH * 0.75, 3);
  });
  for (let i = athletesB.length; i < maxRows; i++) {
    const ry = startY + i * rowH;
    ln(d, x + colW, ry + rowH, x + w, ry + rowH, 0.06, LGRAY);
  }

  // Technical staff section at bottom
  const staffY = startY + maxRows * rowH + 1;
  const staffH = y + h - staffY;
  if (staffH > 5) {
    ln(d, x, staffY - 0.5, x + w, staffY - 0.5, 0.2);
    // Left column: Líberos + Comissão Técnica for Team A
    const staffLabels = ['L', 'L', 'T', 'AT₁', 'AT₂', 'PF', 'M/F', 'E'];
    const sRowH = Math.min(3.2, staffH / staffLabels.length);
    staffLabels.forEach((lbl, i) => {
      const sy = staffY + i * sRowH;
      tx(d, lbl, x + 2, sy + sRowH * 0.7, 3, { b: true });
      ln(d, x + 7, sy + sRowH - 0.3, x + colW - 1, sy + sRowH - 0.3, 0.06, LGRAY);
      // Fill coach name for T
      if (lbl === 'T' && data.teamA.coach) {
        tx(d, data.teamA.coach.toUpperCase().substring(0, 16), x + 8, sy + sRowH * 0.7, 2.8);
      }
    });
    // Right column: staff for Team B
    staffLabels.forEach((lbl, i) => {
      const sy = staffY + i * sRowH;
      tx(d, lbl, x + colW + 2, sy + sRowH * 0.7, 3, { b: true });
      ln(d, x + colW + 7, sy + sRowH - 0.3, x + w - 1, sy + sRowH - 0.3, 0.06, LGRAY);
      if (lbl === 'T' && data.teamB.coach) {
        tx(d, data.teamB.coach.toUpperCase().substring(0, 16), x + colW + 8, sy + sRowH * 0.7, 2.8);
      }
    });
  }
}

function drawResultPanel(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData, maxSets: number) {
  bx(d, x, y, w, h, 0.35);
  // Title
  const titleH = 5;
  fbx(d, x, y, w, titleH, '#1e3a5f');
  tx(d, 'RESULTADO', x + w / 2, y + 3.5, 5, { a: 'center', c: WHITE, b: true });

  const innerY = y + titleH + 1;

  // Headers: EQUIPE | T | S | V | P | Set 1 | Set 2 | Set 3 | Duração | P | V | S | T
  const teamColW = 28;
  const metricW = 5;
  const setColW = (w - teamColW * 2 - metricW * 8 - 15) / maxSets;

  // Team A row
  tx(d, 'EQUIPE', x + 2, innerY + 3, 3, { c: GRAY });
  tx(d, 'A', x + 2, innerY + 7, 4, { b: true });
  tx(d, data.teamA.shortName, x + 7, innerY + 7, 3.5);

  // Team B row
  tx(d, 'B', x + w - 28, innerY + 7, 4, { b: true });
  tx(d, data.teamB.shortName, x + w - 23, innerY + 7, 3.5);

  // Set results table
  const tableY = innerY + 10;
  const rH = 5;
  // Headers
  tx(d, 'Set', x + 2, tableY + 3, 3.5, { c: GRAY, b: true });
  tx(d, 'Duração', x + 10, tableY + 3, 3.5, { c: GRAY });
  for (let s = 0; s < maxSets; s++) {
    const sy = tableY + 5 + s * rH;
    tx(d, `${s + 1}º (`, x + 2, sy + 3.5, 3.5);
    // score placeholders
    if (data.sets[s]) {
      tx(d, `${data.sets[s].scoreA} x ${data.sets[s].scoreB}`, x + 12, sy + 3.5, 3.5, { b: true });
    }
    tx(d, ')', x + 28, sy + 3.5, 3.5);
    ln(d, x + 2, sy + rH, x + w - 2, sy + rH, 0.06, LGRAY);
  }

  // Duration and timing
  const durY = tableY + 5 + maxSets * rH + 2;
  tx(d, 'Duração total dos sets', x + 2, durY + 3, 3, { c: GRAY });
  tx(d, '(      min)', x + 2, durY + 6, 3);

  tx(d, 'Hora do início do jogo', x + 2, durY + 11, 3, { c: GRAY });
  tx(d, 'h      min', x + 2, durY + 14, 3);
  tx(d, data.time || '', x + 20, durY + 14, 3.5, { b: true });

  tx(d, 'Hora do término do jogo', x + w / 2, durY + 11, 3, { c: GRAY });
  tx(d, 'h      min', x + w / 2, durY + 14, 3);

  tx(d, 'Duração total do jogo', x + w - 30, durY + 11, 3, { c: GRAY });
  tx(d, 'h      min', x + w - 30, durY + 14, 3);

  // Winner
  const winY = durY + 18;
  tx(d, 'VENCEDOR:', x + 2, winY + 3, 5, { b: true });
  if (data.winner) {
    const winnerName = data.winner === 'A' ? data.teamA.name : data.teamB.name;
    tx(d, winnerName.toUpperCase(), x + 25, winY + 3, 5, { b: true });
  }
  const scoreStr = `${data.finalScoreA} : ${data.finalScoreB}`;
  tx(d, scoreStr, x + w - 5, winY + 3, 6, { a: 'right', b: true });
}

function drawSignaturesPanel(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData) {
  bx(d, x, y, w, h, 0.35);

  // Split: Observações (left 55%) + Aprovação (right 45%)
  const obsW = w * 0.55;
  const aprW = w * 0.45;

  // --- Observações ---
  fbx(d, x, y, obsW, 4.5, '#1e3a5f');
  tx(d, 'OBSERVAÇÕES', x + obsW / 2, y + 3.2, 4.5, { a: 'center', c: WHITE, b: true });
  // lined area for writing
  for (let i = 1; i <= 4; i++) {
    ln(d, x + 2, y + 4.5 + i * 4, x + obsW - 2, y + 4.5 + i * 4, 0.08, LGRAY);
  }
  if (data.observations) {
    tx(d, data.observations.substring(0, 50), x + 2, y + 8, 3);
  }

  // --- Aprovação ---
  const ax = x + obsW;
  ln(d, ax, y, ax, y + h, 0.2);
  fbx(d, ax, y, aprW, 4.5, '#1e3a5f');
  tx(d, 'APROVAÇÃO', ax + aprW / 2, y + 3.2, 4.5, { a: 'center', c: WHITE, b: true });

  const aprY = y + 5.5;
  const aprLabels = ['FUNÇÃO', 'NOME', 'ASSINATURA'];
  const funcW = aprW * 0.28;
  const nomeW = aprW * 0.35;
  const assW = aprW * 0.37;
  // header
  tx(d, aprLabels[0], ax + 2, aprY + 2.5, 3, { c: GRAY, b: true });
  tx(d, aprLabels[1], ax + funcW + 2, aprY + 2.5, 3, { c: GRAY, b: true });
  tx(d, aprLabels[2], ax + funcW + nomeW + 2, aprY + 2.5, 3, { c: GRAY, b: true });
  ln(d, ax, aprY + 3.5, ax + aprW, aprY + 3.5, 0.1);

  const refRoles = ['1º árbitro', '2º árbitro', 'Apontador'];
  const rH = 4;
  refRoles.forEach((role, i) => {
    const ry = aprY + 4 + i * rH;
    tx(d, role, ax + 2, ry + 3, 3);
    const ref = data.referees[i];
    if (ref) tx(d, ref.name, ax + funcW + 2, ry + 3, 3);
    ln(d, ax + funcW, ry + rH, ax + aprW, ry + rH, 0.06, LGRAY);
  });

  // Capitães
  const capY = aprY + 4 + refRoles.length * rH + 1;
  tx(d, 'Capitães', ax + 2, capY + 3, 3, { b: true });
  d.setDrawColor(INK); d.setLineWidth(0.2);
  d.circle(ax + aprW * 0.35, capY + 2, 2, 'S');
  tx(d, 'A', ax + aprW * 0.35, capY + 2.7, 3, { a: 'center' });
  d.circle(ax + aprW * 0.7, capY + 2, 2, 'S');
  tx(d, 'B', ax + aprW * 0.7, capY + 2.7, 3, { a: 'center' });
}

// ── Pontos na Troca (tie-break side change) ─────────────────────────
function drawPontosNaTroca(d: jsPDF, x: number, y: number, w: number, h: number) {
  bx(d, x, y, w, h, 0.3);
  fbx(d, x, y, w, 5, BG);
  bx(d, x, y, w, 5, 0.15);
  tx(d, 'PONTOS NA TROCA', x + w / 2, y + 3.5, 3.5, { a: 'center', b: true });
  // Team A side
  const gridY = y + 5;
  const gridH = (h - 5) / 2;
  const posLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const colW = (w - 18) / 6;

  // Team labels
  fbx(d, x, gridY, 8, gridH, '#f4f4f4');
  tx(d, 'E', x + 4, gridY + 3, 3, { a: 'center' });
  tx(d, 'Q', x + 4, gridY + 6, 3, { a: 'center' });
  tx(d, 'U', x + 4, gridY + 9, 3, { a: 'center' });
  tx(d, 'I', x + 4, gridY + 12, 3, { a: 'center' });
  tx(d, 'P', x + 4, gridY + 15, 3, { a: 'center' });
  tx(d, 'E', x + 4, gridY + 18, 3, { a: 'center' });

  // Position headers
  posLabels.forEach((lbl, i) => {
    tx(d, lbl, x + 18 + i * colW + colW / 2, gridY + 3, 3.5, { a: 'center', b: true });
  });

  // Grid for two teams
  for (let t = 0; t < 2; t++) {
    const gy = gridY + t * gridH;
    const label = t === 0 ? 'A' : 'B';
    fbx(d, x, gy, 8, gridH, '#f4f4f4');
    tx(d, label, x + 4, gy + gridH / 2 + 1, 5, { a: 'center', b: true });
    grid(d, x + 8, gy, w - 8, gridH, 6, 3, 0.08);
    // Points numbers
    const ptsPerCol = 10;
    const ptColW = (w - 18) / 6;
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 3; r++) {
        const num = r * 10 + c + 1;
        if (num > 30) break;
        // (simplified — just draw grid)
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// ═ MAIN BUILDERS
// ══════════════════════════════════════════════════════════════════════

function build3Sets(d: jsPDF, data: MatchSheetData) {
  drawHeader3(d, data);
  drawMatchInfo3(d, data);

  // Layout geometry
  const setsX = M;
  const setsY = M + 31;
  const setsW = (W3 - 2 * M) * 0.65;
  const rightX = setsX + setsW + 2;
  const rightW = W3 - 2 * M - setsW - 2;

  // 3 set blocks stacked vertically
  const setH = 37;
  const setGap = 1.5;
  for (let i = 0; i < 3; i++) {
    const sy = setsY + i * (setH + setGap);
    const isTiebreak = i === 2;
    drawSetBlock(d, i + 1, setsX, sy, setsW, setH, data, isTiebreak);
  }

  // Right panel sections
  const rpY = setsY;
  const sanctionsH = 32;
  drawSanctionsPanel(d, rightX, rpY, rightW, sanctionsH);

  const rosterY = rpY + sanctionsH + 1.5;
  const rosterH = 78;
  drawTeamRosterPanel(d, rightX, rosterY, rightW, rosterH, data);

  // Bottom area spanning full width
  const bottomY = setsY + 3 * (setH + setGap) + 1;

  // Result panel (left portion)
  const resultW = setsW * 0.5;
  const resultH = H3 - bottomY - M - 1;
  drawResultPanel(d, M, bottomY, resultW, resultH, data, 3);

  // Pontos na troca (center)
  const pntW = setsW * 0.5;
  drawPontosNaTroca(d, M + resultW + 1, bottomY, pntW, resultH);

  // Result continuation on right: Assinaturas label
  const sigY = rosterY + rosterH + 1.5;
  const sigH = H3 - sigY - M;
  if (sigH > 10) {
    // Capitão + Técnico signatures
    const csW = rightW;
    bx(d, rightX, sigY, csW, sigH, 0.3);
    fbx(d, rightX, sigY, csW, 4.5, '#1e3a5f');
    tx(d, 'ASSINATURAS', rightX + csW / 2, sigY + 3.2, 4, { a: 'center', c: WHITE, b: true });
    const halfW = csW / 2;
    ln(d, rightX + halfW, sigY + 4.5, rightX + halfW, sigY + sigH, 0.15);
    tx(d, 'CAPITÃO', rightX + halfW / 2, sigY + 7, 3, { a: 'center', c: GRAY });
    tx(d, 'TÉCNICO', rightX + halfW / 2, sigY + 11, 3, { a: 'center', c: GRAY });
    tx(d, 'CAPITÃO', rightX + halfW + halfW / 2, sigY + 7, 3, { a: 'center', c: GRAY });
    tx(d, 'TÉCNICO', rightX + halfW + halfW / 2, sigY + 11, 3, { a: 'center', c: GRAY });
    // signature lines
    ln(d, rightX + 2, sigY + 13, rightX + halfW - 2, sigY + 13, 0.1, LGRAY);
    ln(d, rightX + halfW + 2, sigY + 13, rightX + csW - 2, sigY + 13, 0.1, LGRAY);
  }

  // Observations + Approval below result
  const sigBottomY = bottomY + resultH + 1;
  const sigBottomH = H3 - sigBottomY - M;
  if (sigBottomH > 8) {
    drawSignaturesPanel(d, M, sigBottomY, W3 - 2 * M, sigBottomH, data);
  } else {
    // Fit signatures inside bottom area
    drawSignaturesPanel(d, rightX, bottomY, rightW, resultH, data);
  }

  // Footer
  tx(d, 'VolleyPro · Súmula Oficial', M, H3 - 2, 4, { c: LGRAY });
  tx(d, `Gerado: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, W3 - M, H3 - 2, 3.5, { a: 'right', c: LGRAY });
}

function build5Sets(d: jsPDF, data: MatchSheetData) {
  // A3 landscape: 420 × 297 mm
  const W = 420, H = 297;

  // Header
  const y0 = M, hw = W - 2 * M, hh = 14;
  fbx(d, M, y0, hw, hh, '#1e3a5f');
  d.setDrawColor(WHITE); d.setLineWidth(0.4);
  d.circle(M + 8, y0 + hh / 2, 4.5, 'S');
  tx(d, 'V', M + 8, y0 + hh / 2 + 1.3, 5.5, { a: 'center', c: WHITE, b: true });
  tx(d, (data.orgName || 'VolleyPro').toUpperCase(), M + 15, y0 + 5, 7, { c: WHITE, b: true });
  tx(d, 'SÚMULA OFICIAL', W / 2, y0 + 5.5, 9, { a: 'center', c: WHITE, b: true });
  tx(d, data.modality === 'indoor' ? 'VÔLEI DE QUADRA' : 'VÔLEI DE PRAIA', W / 2, y0 + 11, 5.5, { a: 'center', c: '#c0d0e0' });
  tx(d, data.competition.toUpperCase(), W - M - 2, y0 + 5.5, 6, { a: 'right', c: WHITE, b: true });
  tx(d, (data.category || '').toUpperCase(), W - M - 2, y0 + 11, 5, { a: 'right', c: '#c0d0e0' });

  // Match info strip (similar to 3-sets but wider)
  const miY = y0 + hh + 1, miH = 14;
  bx(d, M, miY, hw, miH, 0.35);
  const cols5 = [55, 55, 65, 50, 45, 55, 87];
  let cx = M;
  const xp: number[] = [cx];
  cols5.forEach(cw => { cx += cw; xp.push(cx); ln(d, cx, miY, cx, miY + miH, 0.2); });
  ln(d, M, miY + 7, M + hw, miY + 7, 0.15, LGRAY);
  const lbl5 = (s: string, xi: number, yi: number) => tx(d, s, xi + 2, yi, 4.5, { c: GRAY });
  const val5 = (s: string, xi: number, yi: number) => tx(d, s, xi + 2, yi, 6, { b: true });
  lbl5('NOME DA COMPETIÇÃO', xp[0], miY + 3.5);
  val5(data.competition, xp[0], miY + 6.5);
  lbl5('CIDADE', xp[1], miY + 3.5);
  val5(data.city || '', xp[1], miY + 6.5);
  lbl5('GINÁSIO / QUADRA', xp[2], miY + 3.5);
  val5((data.venue + (data.court ? ` - ${data.court}` : '')).substring(0, 30), xp[2], miY + 6.5);
  lbl5('FASE', xp[3], miY + 3.5);
  val5(data.phase || data.groupName || '', xp[3], miY + 6.5);
  lbl5('JOGO Nº', xp[4], miY + 3.5);
  val5(data.matchNumber > 0 ? String(data.matchNumber) : '', xp[4], miY + 6.5);
  lbl5('DATA', xp[0], miY + 10.5);
  val5(data.date || '', xp[0], miY + 13);
  lbl5('HORÁRIO', xp[1], miY + 10.5);
  val5(data.time || '', xp[1], miY + 13);
  lbl5('EQUIPES', xp[2], miY + 10.5);
  tx(d, `${data.teamA.name.toUpperCase()}  VS  ${data.teamB.name.toUpperCase()}`, xp[2] + 2, miY + 13, 5, { b: true });

  // Set blocks — 5 sets in 2 rows (3 top + 2 bottom) on left panel
  const setsY = miY + miH + 1;
  const setsW = (W - 2 * M) * 0.65;
  const setH = 37;
  const setGap = 1;
  // Row 1: Sets 1-2 side by side
  for (let i = 0; i < 2; i++) {
    const sw = (setsW - 1) / 2;
    const sx = M + i * (sw + 1);
    drawSetBlock(d, i + 1, sx, setsY, sw, setH, data);
  }
  // Row 2: Sets 3-4 side by side
  for (let i = 0; i < 2; i++) {
    const sw = (setsW - 1) / 2;
    const sx = M + i * (sw + 1);
    drawSetBlock(d, i + 3, sx, setsY + setH + setGap, sw, setH, data);
  }
  // Row 3: Set 5 (tiebreak) — full width
  drawSetBlock(d, 5, M, setsY + 2 * (setH + setGap), setsW, setH, data, true);

  // Right panel
  const rightX = M + setsW + 2;
  const rightW = W - 2 * M - setsW - 2;
  drawSanctionsPanel(d, rightX, setsY, rightW, 35);
  drawTeamRosterPanel(d, rightX, setsY + 36.5, rightW, 90, data);

  // Bottom: Result + Signatures
  const bottomY = setsY + 3 * (setH + setGap) + 1;
  const bottomH = H - bottomY - M - 1;
  const resultW = setsW * 0.5;
  drawResultPanel(d, M, bottomY, resultW, bottomH, data, 5);
  drawPontosNaTroca(d, M + resultW + 1, bottomY, setsW - resultW - 1, bottomH);

  // Signatures
  const sigY = setsY + 36.5 + 90 + 1.5;
  const sigH = H - sigY - M;
  if (sigH > 10) {
    drawSignaturesPanel(d, rightX, sigY, rightW, sigH, data);
  }

  // Footer
  tx(d, 'VolleyPro · Súmula Oficial (5 sets)', M, H - 2, 4, { c: LGRAY });
  tx(d, `Gerado: ${new Date().toLocaleDateString('pt-BR')}`, W - M, H - 2, 3.5, { a: 'right', c: LGRAY });
}

// ── FICHAS DE POSIÇÃO / ORDEM DE SAQUE ──────────────────────────────
// 8 fichas por folha A4 paisagem (4 colunas × 2 linhas)

function drawPositionCard(d: jsPDF, x: number, y: number, cw: number, ch: number,
  team: MatchSheetData['teamA'], setLabel: string, orgName: string) {
  // Card border
  bx(d, x, y, cw, ch, 0.4);

  // Header bar
  const hdrH = 7;
  fbx(d, x, y, cw, hdrH, '#1e3a5f');
  // Emblem placeholder (left)
  d.setDrawColor(WHITE); d.setLineWidth(0.3);
  d.circle(x + 6, y + hdrH / 2, 3, 'S');
  tx(d, 'V', x + 6, y + hdrH / 2 + 1, 3.5, { a: 'center', c: WHITE, b: true });
  // Title
  tx(d, 'FICHA DE POSIÇÃO', x + cw / 2, y + 4.5, 6, { a: 'center', c: WHITE, b: true });
  // Org name (right)
  tx(d, orgName.substring(0, 14).toUpperCase(), x + cw - 3, y + 4.5, 3.5, { a: 'right', c: '#c0d0e0' });

  // Líbero field
  tx(d, 'Líbero', x + cw - 20, y + hdrH + 3, 3.5, { c: GRAY });
  ln(d, x + cw - 12, y + hdrH + 3.5, x + cw - 2, y + hdrH + 3.5, 0.15, LGRAY);

  // SET label
  tx(d, setLabel, x + cw / 2, y + hdrH + 5, 8, { a: 'center', b: true });

  // Equipe label
  tx(d, 'Equipe', x + 3, y + hdrH + 3, 3.5, { c: GRAY });
  tx(d, team.name.toUpperCase().substring(0, 18), x + 3, y + hdrH + 6, 4.5, { b: true });

  // 6-position grid: 3 cols × 2 rows
  // Top row: IV, III, II
  // Bottom row: V, VI, I (I = Saque with thick border)
  const posMap = [['IV', 'III', 'II'], ['V', 'VI', 'I']];
  const gridX = x + 5;
  const gridY = y + hdrH + 9;
  const cellW = (cw - 10) / 3;
  const cellH = (ch - hdrH - 19) / 2;

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const px = gridX + c * cellW;
      const py = gridY + r * cellH;
      const pos = posMap[r][c];
      const isSaque = pos === 'I';
      bx(d, px, py, cellW, cellH, isSaque ? 0.6 : 0.25);
      // Position label in top-left corner
      tx(d, pos, px + 2, py + 3.5, 4.5, { b: true });
      // Saque label for position I
      if (isSaque) {
        tx(d, 'Saque', px + cellW / 2, py + cellH - 2, 3.5, { a: 'center', c: GRAY });
      }
    }
  }

  // "Rede" indicator (top center)
  // (omitted — implicit from position layout)

  // Assinatura do Técnico
  const sigY2 = y + ch - 5;
  tx(d, 'Assinatura do Técnico', x + 3, sigY2 + 3.5, 3.5, { c: GRAY });
  ln(d, x + 3, sigY2 + 4, x + cw - 3, sigY2 + 4, 0.15, LGRAY);
}

function buildPositionSheet(d: jsPDF, data: MatchSheetData) {
  const orgName = data.orgName || 'VolleyPro';
  const numSets = data.format === '5-sets' ? 5 : data.format === '3-sets' ? 3 : 3;

  // For 3-sets: 8 cards (4 per team, sets 1-3 + blank)
  // For 5-sets: 10 cards (5 per team) — needs 2 pages or adjusted layout
  // Standard: 8 cards per page (4 cols × 2 rows)

  const cardCols = 4;
  const cardRows = 2;
  const gapX = 3, gapY = 4;
  const cw = (W3 - 2 * M - (cardCols - 1) * gapX) / cardCols;
  const ch = (H3 - 2 * M - 8 - (cardRows - 1) * gapY) / cardRows; // 8mm for header

  // Page header
  tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO`, W3 / 2, M + 3, 6, { a: 'center', b: true, c: DARK });
  tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, W3 / 2, M + 7, 4, { a: 'center', c: GRAY });

  // Generate cards: Row 0 = Team A (sets 1-4), Row 1 = Team B (sets 1-4)
  // Or: alternating team/set for practical use
  for (let r = 0; r < cardRows; r++) {
    for (let c = 0; c < cardCols; c++) {
      const cx = M + c * (cw + gapX);
      const cy = M + 8 + r * (ch + gapY);
      const team = r === 0 ? data.teamA : data.teamB;
      const teamLabel = r === 0 ? 'A' : 'B';
      const setNum = c + 1;
      const setLabel = setNum <= numSets ? `SET ${setNum}` : `SET __`;
      drawPositionCard(d, cx, cy, cw, ch, team, `${setLabel} · EQ. ${teamLabel}`, orgName);
    }
  }

  // Footer
  tx(d, 'VolleyPro · Fichas de Posição / Ordem de Saque', M, H3 - 2, 3.5, { c: LGRAY });
}

// ══════════════════════════════════════════════════════════════════════
// ═ PUBLIC API
// ══════════════════════════════════════════════════════════════════════

export function generateOfficialMatchSheetPdf(data: MatchSheetData): jsPDF {
  const isFiveSets = data.format === '5-sets';
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: isFiveSets ? 'a3' : 'a4',
    compress: true,
  });
  if (isFiveSets) build5Sets(doc, data);
  else build3Sets(doc, data);
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
