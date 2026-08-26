// =====================================================================
// Súmula Oficial de Voleibol — Reprodução Fiel e Idêntica ao Padrão
// Oficial da Federação (CBV / FPV) em A4 Paisagem (297 × 210 mm).
// VISUAL PREMIUM
// =====================================================================

import jsPDF from 'jspdf';
import type { MatchSheetData } from './matchSheetPdf';

// ── Cores Oficiais ──────────────────────────────────────────────────
const INK = '#000000';
const GRAY_DARK = '#222222';
const GRAY_MED = '#666666';
const GRAY_LIGHT = '#aaaaaa';
const BG_HEADER = '#000000';
const BG_SUBHEADER = '#dcdcdc';
const BG_ZEBRA = '#f4f4f4';
const WHITE = '#ffffff';

// ── Dimensões A4 Paisagem (mm) ──────────────────────────────────────
const W = 297, H = 210, M = 3.5;

// ── Helpers Gráficos ────────────────────────────────────────────────
function ln(d: jsPDF, x1: number, y1: number, x2: number, y2: number, w = 0.2, c = INK) {
  d.setDrawColor(c); d.setLineWidth(w); d.line(x1, y1, x2, y2);
}
function bx(d: jsPDF, x: number, y: number, w: number, h: number, lw = 0.35) {
  d.setDrawColor(INK); d.setLineWidth(lw); d.rect(x, y, w, h, 'S');
}
function fbx(d: jsPDF, x: number, y: number, w: number, h: number, c = BG_HEADER) {
  d.setFillColor(c); d.rect(x, y, w, h, 'F');
}
function tx(
  d: jsPDF,
  s: string,
  x: number,
  y: number,
  sz: number,
  o: { a?: 'left' | 'center' | 'right'; c?: string; b?: boolean } = {}
) {
  d.setFont('helvetica', o.b ? 'bold' : 'normal');
  d.setFontSize(sz);
  d.setTextColor(o.c ?? INK);
  d.text(s, x, y, { align: o.a ?? 'left' });
}
function circle(d: jsPDF, x: number, y: number, r: number, lw = 0.25) {
  d.setDrawColor(INK); d.setLineWidth(lw); d.circle(x, y, r, 'S');
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
    // Silencioso
  }
}

// ══════════════════════════════════════════════════════════════════════
// 1. CABEÇALHO OFICIAL (PADRÃO FEDERAÇÃO)
// ══════════════════════════════════════════════════════════════════════
function drawFederationHeader(d: jsPDF, data: MatchSheetData, y: number, w: number, h: number) {
  bx(d, M, y, w, h, 0.8);

  // Bloco 1 (Esquerda): Informações do Jogo
  const wLeft = 95;
  bx(d, M, y, wLeft, h, 0.4);

  tx(d, 'NOME DA COMPETIÇÃO:', M + 1.5, y + 3.4, 4.2, { b: true });
  tx(d, (data.competition || '').toUpperCase().substring(0, 36), M + 36, y + 3.4, 4.5, { b: true });

  tx(d, 'CIDADE:', M + 1.5, y + 6.8, 4.2, { b: true });
  tx(d, (data.city || '').toUpperCase().substring(0, 36), M + 18, y + 6.8, 4.5);

  tx(d, 'GINÁSIO:', M + 1.5, y + 10.2, 4.2, { b: true });
  const venueStr = (data.venue + (data.court ? ` - ${data.court}` : '')).toUpperCase().substring(0, 20);
  tx(d, venueStr, M + 18, y + 10.2, 4.5);

  tx(d, 'FASE:', M + 55, y + 10.2, 4.2, { b: true });
  tx(d, (data.phase || data.groupName || '').toUpperCase().substring(0, 10), M + 66, y + 10.2, 4.5);

  tx(d, 'JOGO Nº:', M + 78, y + 10.2, 4.2, { b: true });
  tx(d, data.matchNumber > 0 ? String(data.matchNumber) : '', M + 92, y + 10.2, 4.5, { b: true });

  tx(d, 'SEXO: MASC', M + 1.5, y + 13.0, 4.2, { b: true });
  circle(d, M + 20, y + 12.0, 1.4, 0.3);
  if (data.genderCategory === 'male') tx(d, 'X', M + 20, y + 12.8, 3.8, { a: 'center', b: true });

  tx(d, 'FEM', M + 25, y + 13.0, 4.2, { b: true });
  circle(d, M + 32, y + 12.0, 1.4, 0.3);
  if (data.genderCategory === 'female') tx(d, 'X', M + 32, y + 12.8, 3.8, { a: 'center', b: true });

  tx(d, 'CATEGORIA:', M + 38, y + 13.0, 4.2, { b: true });
  tx(d, (data.category || 'LIVRE').toUpperCase().substring(0, 20), M + 58, y + 13.0, 4.5, { b: true });

  // Bloco 2 (Centro): DATA, HORÁRIO, EQUIPES A x B
  const xMid = M + wLeft;
  const wMid = 85;
  bx(d, xMid, y, wMid, h, 0.4);

  tx(d, 'DATA', xMid + 2, y + 3.4, 4.0, { b: true });
  tx(d, data.date || '___/___/______', xMid + 13, y + 3.4, 4.5);

  tx(d, 'HORÁRIO', xMid + 46, y + 3.4, 4.0, { b: true });
  tx(d, data.time || '___:___', xMid + 62, y + 3.4, 4.5);

  ln(d, xMid, y + 4.8, xMid + wMid, y + 4.8, 0.2, GRAY_LIGHT);

  tx(d, 'EQUIPES', xMid + wMid / 2, y + 7.6, 5.0, { a: 'center', b: true });

  const nameA = (data.teamA.shortName || data.teamA.name).toUpperCase().substring(0, 16);
  const nameB = (data.teamB.shortName || data.teamB.name).toUpperCase().substring(0, 16);

  circle(d, xMid + 6, y + 10.6, 2.2, 0.4); tx(d, 'A', xMid + 6, y + 11.5, 4.0, { a: 'center', b: true });
  tx(d, nameA, xMid + 11, y + 11.5, 4.8, { b: true });

  tx(d, 'VS', xMid + wMid / 2, y + 11.5, 4.0, { a: 'center', c: GRAY_MED, b: true });

  tx(d, nameB, xMid + wMid - 11, y + 11.5, 4.8, { a: 'right', b: true });
  circle(d, xMid + wMid - 6, y + 10.6, 2.2, 0.4); tx(d, 'B', xMid + wMid - 6, y + 11.5, 4.0, { a: 'center', b: true });

  // Bloco 3 (Direita): Brasão / Sistema BaseOS & SÚMULA OFICIAL
  const xRight = xMid + wMid;
  const wRight = w - (wLeft + wMid);
  bx(d, xRight, y, wRight, h, 0.4);

  // Logo Vetorial BaseOS
  d.setFillColor(60, 60, 60);
  d.roundedRect(xRight + 3.5, y + 3.0, 6, 1.8, 0.4, 0.4, 'F');
  d.setFillColor(0, 0, 0);
  d.roundedRect(xRight + 5.0, y + 5.4, 7.5, 1.8, 0.4, 0.4, 'F');
  d.setFillColor(100, 100, 100);
  d.roundedRect(xRight + 3.5, y + 7.8, 6, 1.8, 0.4, 0.4, 'F');

  const orgName = data.orgName || 'Federação de Voleibol';
  tx(d, orgName.toUpperCase(), xRight + 15, y + 4.2, 5.5, { b: true });
  tx(d, 'SISTEMA BaseOS', xRight + 15, y + 7.5, 4.2, { b: true, c: GRAY_MED });
  tx(d, 'SÚMULA OFICIAL', xRight + 15, y + 12.0, 7.5, { b: true });
}

// ══════════════════════════════════════════════════════════════════════
// 2. BLOCO DE SET REGULAR (PADRÃO EXATO FEDERAÇÃO COM 36 PONTOS)
// ══════════════════════════════════════════════════════════════════════
function drawFedSetBlock(
  d: jsPDF,
  setNum: number,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  teamLeft: 'A' | 'B',
  teamRight: 'A' | 'B',
  compact = false
) {
  bx(d, x, y, w, h, 0.8);

  // Faixa 1: SET N
  const stripW1 = compact ? 4.5 : 5.0;
  fbx(d, x, y, stripW1, h, BG_HEADER);
  bx(d, x, y, stripW1, h, 0.4);
  const titleColor = WHITE;
  tx(d, 'S', x + stripW1 / 2, y + h * 0.18, compact ? 4.5 : 5.0, { a: 'center', b: true, c: titleColor });
  tx(d, 'E', x + stripW1 / 2, y + h * 0.36, compact ? 4.5 : 5.0, { a: 'center', b: true, c: titleColor });
  tx(d, 'T', x + stripW1 / 2, y + h * 0.54, compact ? 4.5 : 5.0, { a: 'center', b: true, c: titleColor });
  tx(d, String(setNum), x + stripW1 / 2, y + h * 0.80, compact ? 7.0 : 8.0, { a: 'center', b: true, c: titleColor });

  // Faixa 2: Rótulos
  const stripW2 = compact ? 15.5 : 18.0;
  const sx2 = x + stripW1;
  bx(d, sx2, y, stripW2, h, 0.4);

  const r1h = compact ? 3.5 : 4.2;
  const r2h = compact ? 3.5 : 4.2;
  const r3h = compact ? 3.5 : 4.2;
  const r4h = compact ? 2.8 : 3.5;
  const r5h = compact ? 4.5 : 5.6;
  const r6h = h - (r1h + r2h + r3h + r4h + r5h);

  tx(d, 'FORMAÇÃO DA EQUIPE', sx2 + 0.8, y + (compact ? 2.4 : 2.8), compact ? 2.5 : 3.0, { b: true });
  tx(d, 'ORDEM DE SAQUE', sx2 + 0.8, y + r1h + (compact ? 2.4 : 2.8), compact ? 2.5 : 3.0, { b: true });
  tx(d, 'JOGADORES INICIANTES', sx2 + 0.8, y + r1h + r2h + (compact ? 2.4 : 2.8), compact ? 2.4 : 2.8, { b: true });
  tx(d, 'Nº DO JOGADOR', sx2 + 0.8, y + r1h + r2h + r3h + (compact ? 2.1 : 2.5), compact ? 2.4 : 2.8, { b: true });
  tx(d, 'SUBSTITUIÇÕES', sx2 + 0.8, y + r1h + r2h + r3h + r4h + (compact ? 1.8 : 2.2), compact ? 2.4 : 2.8, { b: true });
  tx(d, 'PLACAR NA TROCA', sx2 + 0.8, y + r1h + r2h + r3h + r4h + (compact ? 3.8 : 4.6), compact ? 2.2 : 2.5, { b: true, c: GRAY_MED });
  tx(d, 'RODADA DE SAQUES', sx2 + 0.8, y + h - r6h + (compact ? 2.4 : 2.8), compact ? 2.4 : 2.8, { b: true });

  const srvSubH = r6h / 4;
  const srvLabels = [['1º', '5º'], ['2º', '6º'], ['3º', '7º'], ['4º', '8º']];
  for (let r = 0; r < 4; r++) {
    const sry = y + h - r6h + r * srvSubH;
    ln(d, sx2, sry, sx2 + stripW2, sry, 0.15);
    tx(d, srvLabels[r][0], sx2 + stripW2 - 7, sry + srvSubH * 0.7, compact ? 2.5 : 3.0);
    tx(d, srvLabels[r][1], sx2 + stripW2 - 3.5, sry + srvSubH * 0.7, compact ? 2.5 : 3.0);
  }

  ln(d, sx2, y + r1h, x + w, y + r1h, 0.3);
  ln(d, sx2, y + r1h + r2h, x + w, y + r1h + r2h, 0.3);
  ln(d, sx2, y + r1h + r2h + r3h, x + w, y + r1h + r2h + r3h, 0.3);
  ln(d, sx2, y + r1h + r2h + r3h + r4h, x + w, y + r1h + r2h + r3h + r4h, 0.3);
  ln(d, sx2, y + r1h + r2h + r3h + r4h + r5h, x + w, y + r1h + r2h + r3h + r4h + r5h, 0.3);

  const remainingW = w - (stripW1 + stripW2);
  const halfW = (remainingW - 1) / 2;
  const ptColW = compact ? 10.0 : 12.0;
  const teamBoxW = halfW - ptColW;

  const leftTeamData = teamLeft === 'A' ? data.teamA : data.teamB;
  const rightTeamData = teamRight === 'A' ? data.teamA : data.teamB;

  const xLeft = x + stripW1 + stripW2;
  drawFedTeamHalf(d, xLeft, y, teamBoxW, h, r1h, r2h, r3h, r4h, r5h, r6h, teamLeft, leftTeamData, compact);
  drawFedPoints36(d, xLeft + teamBoxW, y, ptColW, h, compact);

  ln(d, xLeft + halfW, y, xLeft + halfW, y + h, 0.6);

  const xRight = xLeft + halfW + 1;
  drawFedTeamHalf(d, xRight, y, teamBoxW, h, r1h, r2h, r3h, r4h, r5h, r6h, teamRight, rightTeamData, compact);
  drawFedPoints36(d, xRight + teamBoxW, y, ptColW, h, compact);
}

function drawFedTeamHalf(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r1h: number,
  r2h: number,
  r3h: number,
  r4h: number,
  r5h: number,
  r6h: number,
  teamLabel: 'A' | 'B',
  team: MatchSheetData['teamA'],
  compact = false
) {
  fbx(d, x, y, w, r1h, BG_ZEBRA);
  tx(d, 'HORÁRIO DO INÍCIO', x + 1, y + (compact ? 1.5 : 1.8), compact ? 2.2 : 2.6, { b: true });
  tx(d, 'H ___ : ___ MIN', x + 1, y + (compact ? 3.0 : 3.5), compact ? 2.5 : 2.8, { b: true, c: GRAY_MED });

  tx(d, 'EQUIPE', x + (compact ? 16 : 20), y + (compact ? 2.5 : 2.8), compact ? 2.8 : 3.2, { b: true });
  circle(d, x + (compact ? 26 : 32), y + (compact ? 1.7 : 2.1), compact ? 1.8 : 2.0, 0.4);
  tx(d, teamLabel, x + (compact ? 26 : 32), y + (compact ? 2.4 : 2.8), compact ? 3.5 : 4.0, { a: 'center', b: true });

  const teamNameStr = (team.shortName || team.name).toUpperCase().substring(0, compact ? 11 : 14);
  tx(d, teamNameStr, x + (compact ? 30 : 36), y + (compact ? 2.5 : 2.8), compact ? 3.2 : 3.8, { b: true });

  const srX = x + w - (compact ? 6.5 : 7.5);
  circle(d, srX, y + (compact ? 1.7 : 2.1), compact ? 1.2 : 1.4, 0.3); tx(d, 'S', srX, y + (compact ? 2.2 : 2.6), compact ? 2.8 : 3.2, { a: 'center', b: true });
  circle(d, srX + (compact ? 3.5 : 4.0), y + (compact ? 1.7 : 2.1), compact ? 1.2 : 1.4, 0.3); tx(d, 'R', srX + (compact ? 3.5 : 4.0), y + (compact ? 2.2 : 2.6), compact ? 2.8 : 3.2, { a: 'center', b: true });

  const posLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const posW = w / 6;

  posLabels.forEach((lbl, i) => {
    const px = x + i * posW;
    ln(d, px, y + r1h, px, y + h, 0.25);
    tx(d, lbl, px + posW / 2, y + r1h + (compact ? 2.6 : 3.2), compact ? 3.8 : 4.5, { a: 'center', b: true });
  });

  const subY = y + r1h + r2h + r3h + r4h;
  const subRowH = r5h / 2;
  ln(d, x, subY + subRowH, x + w, subY + subRowH, 0.15, GRAY_LIGHT);
  for (let r = 0; r < 2; r++) {
    const sry = subY + r * subRowH;
    posLabels.forEach((_, i) => {
      const px = x + i * posW;
      tx(d, ':', px + posW / 2, sry + (compact ? 1.8 : 2.2), compact ? 3.5 : 4.0, { a: 'center', c: GRAY_LIGHT, b: true });
    });
  }

  const srvY = subY + r5h;
  const srvRowH = r6h / 4;
  for (let r = 0; r < 4; r++) {
    const sry = srvY + r * srvRowH;
    ln(d, x, sry, x + w, sry, 0.15);
    posLabels.forEach((_, i) => {
      const px = x + i * posW;
      const subW = posW / 2;
      ln(d, px + subW, sry, px + subW, sry + srvRowH, 0.1, GRAY_LIGHT);
    });
  }
}

function drawFedPoints36(d: jsPDF, x: number, y: number, w: number, h: number, compact = false) {
  bx(d, x, y, w, h, 0.4);

  const hdrH = compact ? 2.8 : 3.2;
  fbx(d, x, y, w, hdrH, BG_HEADER);
  tx(d, 'PONTOS', x + w / 2, y + (compact ? 2.0 : 2.3), compact ? 2.8 : 3.2, { a: 'center', b: true, c: WHITE });

  const cols = 3;
  const rows = 12;
  const tHeight = compact ? 3.8 : 4.5;
  const gridH = h - hdrH - tHeight;
  const colW = w / cols;
  const rowH = gridH / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const num = c * rows + r + 1;
      const px = x + c * colW;
      const py = y + hdrH + r * rowH;
      bx(d, px, py, colW, rowH, 0.1);
      tx(d, String(num), px + colW / 2, py + rowH * 0.75, compact ? 2.4 : 2.8, { a: 'center' });
    }
  }

  const tY = y + h - tHeight;
  fbx(d, x, tY, w, tHeight, BG_HEADER);
  bx(d, x, tY, w, tHeight, 0.4);
  tx(d, '"T"', x + 2.0, tY + (compact ? 2.6 : 3.0), compact ? 3.0 : 3.5, { b: true, c: WHITE });
  tx(d, ':', x + w / 2, tY + (compact ? 2.6 : 3.0), compact ? 3.5 : 4.0, { a: 'center', c: WHITE, b: true });
}

// ══════════════════════════════════════════════════════════════════════
// 3. BLOCO DECISIVO / TIE-BREAK (SET 3 OU SET 5 COM TROCA DE LADO)
// ══════════════════════════════════════════════════════════════════════
function drawFedDecidingSetBlock(
  d: jsPDF,
  setNum: number,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  compact = false
) {
  bx(d, x, y, w, h, 0.8);

  const stripW1 = compact ? 4.5 : 5.0;
  fbx(d, x, y, stripW1, h, BG_HEADER);
  bx(d, x, y, stripW1, h, 0.4);
  const titleColor = WHITE;
  tx(d, 'S', x + stripW1 / 2, y + h * 0.18, compact ? 4.5 : 5.0, { a: 'center', b: true, c: titleColor });
  tx(d, 'E', x + stripW1 / 2, y + h * 0.36, compact ? 4.5 : 5.0, { a: 'center', b: true, c: titleColor });
  tx(d, 'T', x + stripW1 / 2, y + h * 0.54, compact ? 4.5 : 5.0, { a: 'center', b: true, c: titleColor });
  tx(d, String(setNum), x + stripW1 / 2, y + h * 0.80, compact ? 7.0 : 8.0, { a: 'center', b: true, c: titleColor });

  const stripW2 = compact ? 15.5 : 18.0;
  const sx2 = x + stripW1;
  bx(d, sx2, y, stripW2, h, 0.4);

  const r1h = compact ? 3.5 : 4.2;
  const r2h = compact ? 3.5 : 4.2;
  const r3h = compact ? 3.5 : 4.2;
  const r4h = compact ? 2.8 : 3.5;
  const r5h = compact ? 4.5 : 5.6;
  const r6h = h - (r1h + r2h + r3h + r4h + r5h);

  tx(d, 'FORMAÇÃO DA EQUIPE', sx2 + 0.8, y + (compact ? 2.4 : 2.8), compact ? 2.5 : 3.0, { b: true });
  tx(d, 'ORDEM DE SAQUE', sx2 + 0.8, y + r1h + (compact ? 2.4 : 2.8), compact ? 2.5 : 3.0, { b: true });
  tx(d, 'JOGADORES INICIANTES', sx2 + 0.8, y + r1h + r2h + (compact ? 2.4 : 2.8), compact ? 2.4 : 2.8, { b: true });
  tx(d, 'Nº DO JOGADOR', sx2 + 0.8, y + r1h + r2h + r3h + (compact ? 2.1 : 2.5), compact ? 2.4 : 2.8, { b: true });
  tx(d, 'SUBSTITUIÇÕES', sx2 + 0.8, y + r1h + r2h + r3h + r4h + (compact ? 1.8 : 2.2), compact ? 2.4 : 2.8, { b: true });
  tx(d, 'PLACAR NA TROCA', sx2 + 0.8, y + r1h + r2h + r3h + r4h + (compact ? 3.8 : 4.6), compact ? 2.2 : 2.5, { b: true, c: GRAY_MED });
  tx(d, 'RODADA DE SAQUES', sx2 + 0.8, y + h - r6h + (compact ? 2.4 : 2.8), compact ? 2.4 : 2.8, { b: true });

  const srvSubH = r6h / 3;
  const srvLabels = [['1º', '4º'], ['2º', '5º'], ['3º', '6º']];
  for (let r = 0; r < 3; r++) {
    const sry = y + h - r6h + r * srvSubH;
    ln(d, sx2, sry, sx2 + stripW2, sry, 0.15);
    tx(d, srvLabels[r][0], sx2 + stripW2 - 7, sry + srvSubH * 0.7, compact ? 2.5 : 3.0);
    tx(d, srvLabels[r][1], sx2 + stripW2 - 3.5, sry + srvSubH * 0.7, compact ? 2.5 : 3.0);
  }

  ln(d, sx2, y + r1h, x + w, y + r1h, 0.3);
  ln(d, sx2, y + r1h + r2h, x + w, y + r1h + r2h, 0.3);
  ln(d, sx2, y + r1h + r2h + r3h, x + w, y + r1h + r2h + r3h, 0.3);
  ln(d, sx2, y + r1h + r2h + r3h + r4h, x + w, y + r1h + r2h + r3h + r4h, 0.3);
  ln(d, sx2, y + r1h + r2h + r3h + r4h + r5h, x + w, y + r1h + r2h + r3h + r4h + r5h, 0.3);

  const innerW = w - (stripW1 + stripW2);
  const trocaW = compact ? 4.5 : 5.0;
  const sectionW = (innerW - trocaW) / 3;
  const ptColW = compact ? 7.5 : 8.5;
  const boxW = sectionW - ptColW;

  // 1. Equipe A
  const xA = x + stripW1 + stripW2;
  drawFedTeamHalf(d, xA, y, boxW, h, r1h, r2h, r3h, r4h, r5h, r6h, 'A', data.teamA, compact);
  drawFedPoints30(d, xA + boxW, y, ptColW, h, compact);

  // 2. Faixa TROCA DE LADO
  const xTroca = xA + sectionW;
  fbx(d, xTroca, y, trocaW, h, BG_HEADER);
  bx(d, xTroca, y, trocaW, h, 0.4);
  const trocaLetters = ['T', 'R', 'O', 'C', 'A', 'D', 'E', 'L', 'A', 'D', 'O'];
  trocaLetters.forEach((letra, i) => {
    tx(d, letra, xTroca + trocaW / 2, y + (compact ? 3.0 : 3.5) + i * (compact ? 2.8 : 3.2), compact ? 2.8 : 3.2, { a: 'center', b: true, c: WHITE });
  });

  // 3. Equipe B
  const xB = xTroca + trocaW;
  drawFedTeamHalf(d, xB, y, boxW, h, r1h, r2h, r3h, r4h, r5h, r6h, 'B', data.teamB, compact);
  drawFedPoints30(d, xB + boxW, y, ptColW, h, compact);

  // 4. Pontos na Troca
  const xPnt = xB + sectionW;
  drawFedTeamHalf(d, xPnt, y, boxW, h, r1h, r2h, r3h, r4h, r5h, r6h, 'A', data.teamA, compact);
  fbx(d, xPnt, y, sectionW, r1h, BG_HEADER);
  bx(d, xPnt, y, sectionW, r1h, 0.4);
  tx(d, 'PONTOS NA TROCA', xPnt + sectionW / 2, y + (compact ? 2.4 : 2.8), compact ? 2.8 : 3.2, { a: 'center', b: true, c: WHITE });
  drawFedPoints30(d, xPnt + boxW, y, ptColW, h, compact);
}

function drawFedPoints30(d: jsPDF, x: number, y: number, w: number, h: number, compact = false) {
  bx(d, x, y, w, h, 0.4);
  const hdrH = compact ? 2.8 : 3.2;
  fbx(d, x, y, w, hdrH, BG_HEADER);
  tx(d, 'PONTOS', x + w / 2, y + (compact ? 2.0 : 2.3), compact ? 2.6 : 3.0, { a: 'center', b: true, c: WHITE });

  const cols = 2;
  const rows = 15;
  const tHeight = compact ? 3.8 : 4.5;
  const gridH = h - hdrH - tHeight;
  const colW = w / cols;
  const rowH = gridH / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const num = c * rows + r + 1;
      const px = x + c * colW;
      const py = y + hdrH + r * rowH;
      bx(d, px, py, colW, rowH, 0.1);
      tx(d, String(num), px + colW / 2, py + rowH * 0.75, compact ? 2.2 : 2.5, { a: 'center' });
    }
  }

  const tY = y + h - tHeight;
  fbx(d, x, tY, w, tHeight, BG_HEADER);
  bx(d, x, tY, w, tHeight, 0.4);
  tx(d, '"T"', x + 2.0, tY + (compact ? 2.6 : 3.0), compact ? 2.6 : 3.0, { b: true, c: WHITE });
  tx(d, ':', x + w / 2, tY + (compact ? 2.6 : 3.0), compact ? 3.5 : 4.0, { a: 'center', c: WHITE, b: true });
}

// ══════════════════════════════════════════════════════════════════════
// 4. PAINEL DE EQUIPES & ELENCOS (EXTREMA DIREITA)
// ══════════════════════════════════════════════════════════════════════
function drawFedRostersColumn(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  compact = false
) {
  bx(d, x, y, w, h, 0.8);

  // Header EQUIPES
  const hdrH = 5.0;
  fbx(d, x, y, w, hdrH, BG_HEADER);
  tx(d, 'EQUIPES', x + w / 2, y + 3.5, 5.0, { a: 'center', b: true, c: WHITE });
  circle(d, x + 6, y + 2.5, 2.0, 0.4); tx(d, 'A', x + 6, y + 3.3, 4.0, { a: 'center', b: true, c: WHITE });
  circle(d, x + w - 6, y + 2.5, 2.0, 0.4); tx(d, 'B', x + w - 6, y + 3.3, 4.0, { a: 'center', b: true, c: WHITE });

  // Subheaders
  const subH = 4.0;
  const subY = y + hdrH;
  fbx(d, x, subY, w, subH, BG_SUBHEADER);
  bx(d, x, subY, w, subH, 0.4);

  const numW = 6.5;
  const nameW = (w - 2 * numW) / 2;

  const colX = [
    x,
    x + numW,
    x + numW + nameW,
    x + 2 * numW + nameW,
  ];

  tx(d, 'Nº', colX[0] + numW / 2, subY + 2.8, 3.2, { a: 'center', b: true });
  tx(d, 'NOMES DOS JOGADORES', colX[1] + nameW / 2, subY + 2.8, 2.8, { a: 'center', b: true });
  tx(d, 'Nº', colX[2] + numW / 2, subY + 2.8, 3.2, { a: 'center', b: true });
  tx(d, 'NOMES DOS JOGADORES', colX[3] + nameW / 2, subY + 2.8, 2.8, { a: 'center', b: true });

  ln(d, colX[1], subY, colX[1], y + h, 0.3);
  ln(d, colX[2], subY, colX[2], y + h, 0.6);
  ln(d, colX[3], subY, colX[3], y + h, 0.3);

  // 14 Linhas de Atletas
  const startAthY = subY + subH;
  const maxRows = 14;
  const athRowH = compact ? 3.5 : 4.2;

  const athA = data.teamA.athletes.slice(0, maxRows);
  const athB = data.teamB.athletes.slice(0, maxRows);

  for (let r = 0; r < maxRows; r++) {
    const ry = startAthY + r * athRowH;
    ln(d, x, ry + athRowH, x + w, ry + athRowH, 0.1, GRAY_LIGHT);

    if (athA[r]) {
      const numStr = athA[r].jerseyNumber !== undefined ? String(athA[r].jerseyNumber).padStart(2, '0') : '';
      let nameStr = athA[r].name.toUpperCase().substring(0, 16);
      if (athA[r].captain) nameStr += ' (C)';
      tx(d, numStr, colX[0] + numW / 2, ry + athRowH * 0.75, 3.2, { a: 'center', b: true });
      tx(d, nameStr, colX[1] + 1.5, ry + athRowH * 0.75, 3.0, { b: true });
    }

    if (athB[r]) {
      const numStr = athB[r].jerseyNumber !== undefined ? String(athB[r].jerseyNumber).padStart(2, '0') : '';
      let nameStr = athB[r].name.toUpperCase().substring(0, 16);
      if (athB[r].captain) nameStr += ' (C)';
      tx(d, numStr, colX[2] + numW / 2, ry + athRowH * 0.75, 3.2, { a: 'center', b: true });
      tx(d, nameStr, colX[3] + 1.5, ry + athRowH * 0.75, 3.0, { b: true });
    }
  }

  // Linhas de Líbero (L)
  const libY = startAthY + maxRows * athRowH;
  const libRowH = compact ? 3.5 : 4.2;
  for (let i = 0; i < 2; i++) {
    const lry = libY + i * libRowH;
    ln(d, x, lry + libRowH, x + w, lry + libRowH, 0.2);
    bx(d, colX[0] + 1.5, lry + 0.8, numW - 3, libRowH - 1.6, 0.4);
    tx(d, 'L', colX[0] + numW / 2, lry + libRowH * 0.75, 3.2, { a: 'center', b: true });

    bx(d, colX[2] + 1.5, lry + 0.8, numW - 3, libRowH - 1.6, 0.4);
    tx(d, 'L', colX[2] + numW / 2, lry + libRowH * 0.75, 3.2, { a: 'center', b: true });

    const libA = data.teamA.athletes.filter(a => a.libero)[i];
    if (libA) {
      const numStr = libA.jerseyNumber !== undefined ? String(libA.jerseyNumber) : '';
      tx(d, `${numStr} ${libA.name.toUpperCase().substring(0, 14)}`, colX[1] + 1.5, lry + libRowH * 0.75, 3.0, { b: true });
    }
    const libB = data.teamB.athletes.filter(a => a.libero)[i];
    if (libB) {
      const numStr = libB.jerseyNumber !== undefined ? String(libB.jerseyNumber) : '';
      tx(d, `${numStr} ${libB.name.toUpperCase().substring(0, 14)}`, colX[3] + 1.5, lry + libRowH * 0.75, 3.0, { b: true });
    }
  }

  // Comissão Técnica
  const techH = 3.5;
  const techY = libY + 2 * libRowH;
  fbx(d, x, techY, w, techH, BG_HEADER);
  bx(d, x, techY, w, techH, 0.4);
  tx(d, 'COMISSÃO TÉCNICA', x + w / 2, techY + 2.5, 3.2, { a: 'center', b: true, c: WHITE });

  const techRoles = ['T', 'AT₁', 'AT₂', 'PF', 'M/F', 'E'];
  const techRowH = compact ? 2.8 : 3.4;
  techRoles.forEach((role, i) => {
    const try_ = techY + techH + i * techRowH;
    ln(d, x, try_ + techRowH, x + w, try_ + techRowH, 0.1, GRAY_LIGHT);
    tx(d, role, colX[0] + numW / 2, try_ + techRowH * 0.75, 2.8, { a: 'center', b: true });
    tx(d, role, colX[2] + numW / 2, try_ + techRowH * 0.75, 2.8, { a: 'center', b: true });

    if (role === 'T' && data.teamA.coach) {
      tx(d, data.teamA.coach.toUpperCase().substring(0, 16), colX[1] + 1.5, try_ + techRowH * 0.75, 2.8, { b: true });
    }
    if (role === 'T' && data.teamB.coach) {
      tx(d, data.teamB.coach.toUpperCase().substring(0, 16), colX[3] + 1.5, try_ + techRowH * 0.75, 2.8, { b: true });
    }
  });

  // Assinaturas
  const sigH = 3.5;
  const sigStartY = techY + techH + techRoles.length * techRowH;
  fbx(d, x, sigStartY, w, sigH, BG_HEADER);
  bx(d, x, sigStartY, w, sigH, 0.4);
  tx(d, 'ASSINATURAS', x + w / 2, sigStartY + 2.5, 3.2, { a: 'center', b: true, c: WHITE });

  const sigBlockH = (y + h - sigStartY - sigH) / 2;
  const sigs = ['CAPITÃO', 'TÉCNICO'];
  sigs.forEach((sLabel, i) => {
    const sry = sigStartY + sigH + i * sigBlockH;
    ln(d, x, sry + sigBlockH, x + w, sry + sigBlockH, 0.2);
    tx(d, sLabel, colX[1] + 1.5, sry + 3.5, 2.8, { c: GRAY_DARK, b: true });
    tx(d, sLabel, colX[3] + 1.5, sry + 3.5, 2.8, { c: GRAY_DARK, b: true });
  });
}

// ══════════════════════════════════════════════════════════════════════
// 5. SANÇÕES, RESULTADOS E APROVAÇÃO
// ══════════════════════════════════════════════════════════════════════
function drawFedSanctions(d: jsPDF, x: number, y: number, w: number, h: number) {
  bx(d, x, y, w, h, 0.8);

  const titleH = 4.5;
  fbx(d, x, y, w, titleH, BG_HEADER);
  tx(d, 'SANÇÕES', x + 15, y + 3.2, 4.5, { b: true, c: WHITE });

  const xSi = x + 30;
  const wSi = w - 30;
  fbx(d, xSi, y, wSi, titleH, GRAY_DARK);
  tx(d, 'SOLICITAÇÕES INDEVIDAS', xSi + wSi / 2, y + 3.0, 3.2, { a: 'center', c: WHITE, b: true });

  const subY = y + titleH;
  const subH = 4.0;
  fbx(d, x, subY, w, subH, BG_SUBHEADER);
  bx(d, x, subY, w, subH, 0.4);

  const colW = w / 7;
  const colHdrs = ['A', 'P', 'E', 'D', 'A/B', 'SET', 'PLACAR'];
  colHdrs.forEach((hdr, i) => {
    const cx = x + i * colW;
    ln(d, cx, subY, cx, y + h - 8, 0.2);
    tx(d, hdr, cx + colW / 2, subY + 2.8, 3.0, { a: 'center', b: true });
  });

  const rowCount = 5;
  const gridH = h - titleH - subH - 8;
  const rowH = gridH / rowCount;
  for (let r = 0; r < rowCount; r++) {
    const ry = subY + subH + r * rowH;
    ln(d, x, ry + rowH, x + w, ry + rowH, 0.1, GRAY_LIGHT);
    colHdrs.forEach((_, i) => {
      const cx = x + i * colW;
      tx(d, ':', cx + colW / 2, ry + rowH * 0.75, 3.5, { a: 'center', c: GRAY_LIGHT, b: true });
    });
  }

  const legY = y + h - 7.5;
  tx(d, 'A=Advert, P=Penalidade, E=Expulsão, D=Desqualif.', x + 1.5, legY + 2.8, 2.2, { c: GRAY_DARK, b: true });
  tx(d, 'Indicar número do atleta ou técnico e placar.', x + 1.5, legY + 6.0, 2.2, { c: GRAY_DARK });
}

function drawFedResults(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData, maxSets: 3 | 5) {
  bx(d, x, y, w, h, 0.8);

  const titleH = 4.5;
  fbx(d, x, y, w, titleH, BG_HEADER);
  tx(d, 'RESULTADO', x + w / 2, y + 3.2, 5.0, { a: 'center', b: true, c: WHITE });

  const subH = 4.0;
  const subY = y + titleH;
  fbx(d, x, subY, w, subH, BG_SUBHEADER);
  bx(d, x, subY, w, subH, 0.4);

  tx(d, 'EQUIPE', x + 6, subY + 2.8, 3.5, { b: true });
  circle(d, x + 19, subY + 2.0, 1.5, 0.3); tx(d, 'A', x + 19, subY + 2.8, 3.0, { a: 'center', b: true });
  circle(d, x + w - 19, subY + 2.0, 1.5, 0.3); tx(d, 'B', x + w - 19, subY + 2.8, 3.0, { a: 'center', b: true });
  tx(d, 'EQUIPE', x + w - 6, subY + 2.8, 3.5, { a: 'right', b: true });

  const colMetricW = 4.8;
  const setLabelW = 18;
  const halfMetricW = 4 * colMetricW;

  const cy2 = subY + subH;
  const metricsH = 3.8;
  fbx(d, x, cy2, w, metricsH, BG_HEADER);
  bx(d, x, cy2, w, metricsH, 0.4);

  const labelsLeft = ['T', 'S', 'V', 'P'];
  labelsLeft.forEach((lbl, i) => {
    tx(d, lbl, x + i * colMetricW + colMetricW / 2, cy2 + 2.8, 3.2, { a: 'center', b: true, c: WHITE });
  });

  tx(d, 'SET DURAÇÃO', x + halfMetricW + setLabelW / 2, cy2 + 2.8, 3.0, { a: 'center', b: true, c: WHITE });

  const labelsRight = ['P', 'V', 'S', 'T'];
  labelsRight.forEach((lbl, i) => {
    tx(d, lbl, x + halfMetricW + setLabelW + i * colMetricW + colMetricW / 2, cy2 + 2.8, 3.2, { a: 'center', b: true, c: WHITE });
  });

  const startSetY = cy2 + metricsH;
  const setRowH = maxSets === 5 ? 3.5 : 4.4;
  for (let s = 0; s < maxSets; s++) {
    const sry = startSetY + s * setRowH;
    ln(d, x, sry + setRowH, x + w, sry + setRowH, 0.1, GRAY_LIGHT);

    for (let c = 1; c <= 4; c++) ln(d, x + c * colMetricW, sry, x + c * colMetricW, sry + setRowH, 0.1, GRAY_LIGHT);
    for (let c = 0; c <= 4; c++) ln(d, x + halfMetricW + setLabelW + c * colMetricW, sry, x + halfMetricW + setLabelW + c * colMetricW, sry + setRowH, 0.1, GRAY_LIGHT);

    tx(d, `${s + 1}º (     )`, x + halfMetricW + setLabelW / 2, sry + setRowH * 0.75, 3.0, { a: 'center', b: true });

    if (data.sets[s]) {
      tx(d, String(data.sets[s].scoreA), x + 3 * colMetricW + colMetricW / 2, sry + setRowH * 0.75, 3.5, { a: 'center', b: true });
      tx(d, String(data.sets[s].scoreB), x + halfMetricW + setLabelW + colMetricW / 2, sry + setRowH * 0.75, 3.5, { a: 'center', b: true });
      if (data.sets[s].scoreA > data.sets[s].scoreB) {
        tx(d, '1', x + 2 * colMetricW + colMetricW / 2, sry + setRowH * 0.75, 3.5, { a: 'center', b: true });
      } else {
        tx(d, '1', x + halfMetricW + setLabelW + colMetricW + colMetricW / 2, sry + setRowH * 0.75, 3.5, { a: 'center', b: true });
      }
    }
  }

  const durSetsY = startSetY + maxSets * setRowH;
  fbx(d, x, durSetsY, w, 3.5, BG_ZEBRA);
  tx(d, 'Duração total dos sets (         min)', x + w / 2, durSetsY + 2.5, 3.0, { a: 'center', b: true });

  const timeY = durSetsY + 3.5;
  const timeH = 7.0;
  bx(d, x, timeY, w, timeH, 0.4);
  const thirdW = w / 3;
  ln(d, x + thirdW, timeY, x + thirdW, timeY + timeH, 0.2);
  ln(d, x + 2 * thirdW, timeY, x + 2 * thirdW, timeY + timeH, 0.2);

  tx(d, 'Hora do início do jogo', x + thirdW / 2, timeY + 2.5, 2.5, { a: 'center', c: GRAY_DARK, b: true });
  tx(d, data.time || '___ h ___ min', x + thirdW / 2, timeY + 5.5, 3.0, { a: 'center', b: true });

  tx(d, 'Hora do término do jogo', x + 1.5 * thirdW, timeY + 2.5, 2.5, { a: 'center', c: GRAY_DARK, b: true });
  tx(d, '___ h ___ min', x + 1.5 * thirdW, timeY + 5.5, 3.0, { a: 'center', b: true });

  tx(d, 'Duração total do jogo', x + 2.5 * thirdW, timeY + 2.5, 2.5, { a: 'center', c: GRAY_DARK, b: true });
  tx(d, '___ h ___ min', x + 2.5 * thirdW, timeY + 5.5, 3.0, { a: 'center', b: true });

  const winY = timeY + timeH;
  fbx(d, x, winY, w, h - (winY - y), BG_HEADER);
  bx(d, x, winY, w, h - (winY - y), 0.4);

  tx(d, 'VENCEDOR:', x + 2, winY + 4.5, 4.0, { b: true, c: WHITE });
  if (data.winner) {
    const winName = data.winner === 'A' ? data.teamA.name : data.teamB.name;
    tx(d, winName.toUpperCase().substring(0, 14), x + 22, winY + 4.5, 4.0, { b: true, c: WHITE });
  }
  const maxWinSets = maxSets === 5 ? 3 : 2;
  const finalStr = data.winner ? `${maxWinSets} : ${data.winner === 'A' ? data.finalScoreB : data.finalScoreA}` : `${maxWinSets} : _____`;
  tx(d, finalStr, x + w - 3, winY + 4.5, 5.0, { a: 'right', b: true, c: WHITE });
}

function drawFedApproval(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData) {
  bx(d, x, y, w, h, 0.8);

  const titleH = 4.5;
  fbx(d, x, y, w, titleH, BG_HEADER);
  tx(d, 'APROVAÇÃO', x + w / 2, y + 3.2, 4.5, { a: 'center', b: true, c: WHITE });

  const subH = 4.0;
  const subY = y + titleH;
  fbx(d, x, subY, w, subH, BG_SUBHEADER);
  bx(d, x, subY, w, subH, 0.4);

  const funcW = 22;
  const nameW = 38;
  ln(d, x + funcW, subY, x + funcW, y + h - 6.5, 0.3);
  ln(d, x + funcW + nameW, subY, x + funcW + nameW, y + h - 6.5, 0.3);

  tx(d, 'FUNÇÃO', x + funcW / 2, subY + 2.8, 3.0, { a: 'center', b: true });
  tx(d, 'NOME', x + funcW + nameW / 2, subY + 2.8, 3.0, { a: 'center', b: true });
  tx(d, 'ASSINATURA', x + funcW + nameW + (w - funcW - nameW) / 2, subY + 2.8, 3.0, { a: 'center', b: true });

  const lines = [
    { label: '1º árbitro', role: '1º Árbitro' },
    { label: '2º árbitro', role: '2º Árbitro' },
    { label: 'Apontador', role: 'Apontador' },
  ];

  const lineH = (h - titleH - subH - 6.5) / lines.length;
  lines.forEach((item, i) => {
    const ly = subY + subH + i * lineH;
    ln(d, x, ly + lineH, x + w, ly + lineH, 0.1, GRAY_LIGHT);
    tx(d, item.label, x + 2.0, ly + lineH * 0.7, 3.0, { b: true });

    const ref = data.referees.find(r => r.role === item.role);
    if (ref && ref.name) {
      tx(d, ref.name.toUpperCase().substring(0, 18), x + funcW + 2.0, ly + lineH * 0.7, 3.0, { b: true });
    }
  });

  const capY = y + h - 6.5;
  fbx(d, x, capY, w, 6.5, BG_HEADER);
  bx(d, x, capY, w, 6.5, 0.4);
  circle(d, x + w * 0.3, capY + 3.2, 2.2, 0.4); tx(d, 'A', x + w * 0.3, capY + 4.2, 4.0, { a: 'center', b: true, c: WHITE });
  tx(d, 'CAPITÃES', x + w / 2, capY + 4.2, 4.0, { a: 'center', b: true, c: WHITE });
  circle(d, x + w * 0.7, capY + 3.2, 2.2, 0.4); tx(d, 'B', x + w * 0.7, capY + 4.2, 4.0, { a: 'center', b: true, c: WHITE });
}

function drawFedObservations(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData) {
  bx(d, x, y, w, h, 0.8);
  const titleH = 4.5;
  fbx(d, x, y, w, titleH, BG_HEADER);
  tx(d, 'OBSERVAÇÕES:', x + 2.5, y + 3.2, 4.0, { b: true, c: WHITE });

  for (let i = 1; i <= 3; i++) {
    ln(d, x + 2, y + titleH + i * 3.8, x + w - 2, y + titleH + i * 3.8, 0.1, GRAY_LIGHT);
  }
  if (data.observations) {
    tx(d, data.observations.substring(0, 65), x + 2.5, y + titleH + 3.0, 3.2, { b: true });
  }
}

// ══════════════════════════════════════════════════════════════════════
// 6. SÚMULA OFICIAL 3 SETS (A4 PAISAGEM)
// ══════════════════════════════════════════════════════════════════════
function buildOfficial3SetsSheet(d: jsPDF, data: MatchSheetData) {
  const contentW = W - 2 * M; // 290 mm

  // Cabeçalho
  const headerH = 14.5;
  drawFederationHeader(d, data, M, contentW, headerH);

  // Corpo Principal
  const mainY = M + headerH + 1.5;
  const setsW = 160;
  const midW = 58;
  const rosterW = contentW - setsW - midW - 2; // ~70 mm

  const xSets = M;
  const xMid = M + setsW + 1;
  const xRoster = xMid + midW + 1;

  // 3 Sets na Esquerda
  const setH = 42.0;
  const setGap = 1.0;

  drawFedSetBlock(d, 1, xSets, mainY, setsW, setH, data, 'A', 'B', false);
  drawFedSetBlock(d, 2, xSets, mainY + setH + setGap, setsW, setH, data, 'B', 'A', false);
  drawFedDecidingSetBlock(d, 3, xSets, mainY + 2 * (setH + setGap), setsW, setH, data, false);

  // Painel Central: Sanções, Resultados, Observações & Aprovação
  const totalH = 3 * setH + 2 * setGap;
  const sancH = 33;
  const resH = 50;
  const obsH = 16;
  const apprH = totalH - sancH - resH - obsH - 3; 

  drawFedSanctions(d, xMid, mainY, midW, sancH);
  drawFedResults(d, xMid, mainY + sancH + 1, midW, resH, data, 3);
  drawFedObservations(d, xMid, mainY + sancH + resH + 2, midW, obsH, data);
  drawFedApproval(d, xMid, mainY + sancH + resH + obsH + 3, midW, apprH, data);

  // Coluna de Equipes na Extrema Direita
  drawFedRostersColumn(d, xRoster, mainY, rosterW, totalH, data, false);
}

// ══════════════════════════════════════════════════════════════════════
// 7. SÚMULA OFICIAL 5 SETS (A4 PAISAGEM)
// ══════════════════════════════════════════════════════════════════════
function buildOfficial5SetsSheet(d: jsPDF, data: MatchSheetData) {
  const contentW = W - 2 * M; // 290 mm

  // Cabeçalho
  const headerH = 14.5;
  drawFederationHeader(d, data, M, contentW, headerH);

  // Seção Superior: Sets 1 a 4 (grade 2×2) + Set 5 Tie-break
  const mainY = M + headerH + 1.5;
  const setsAreaW = 218;
  const rosterW = contentW - setsAreaW - 1; 
  const xRoster = M + setsAreaW + 1;

  const setRowH = 33.0;
  const halfSetW = (setsAreaW - 1) / 2; // 108.5 mm
  const setGap = 1.0;

  // Linha 1: Set 1 e Set 2
  drawFedSetBlock(d, 1, M, mainY, halfSetW, setRowH, data, 'A', 'B', true);
  drawFedSetBlock(d, 2, M + halfSetW + 1, mainY, halfSetW, setRowH, data, 'B', 'A', true);

  // Linha 2: Set 3 e Set 4
  const row2Y = mainY + setRowH + setGap;
  drawFedSetBlock(d, 3, M, row2Y, halfSetW, setRowH, data, 'A', 'B', true);
  drawFedSetBlock(d, 4, M + halfSetW + 1, row2Y, halfSetW, setRowH, data, 'B', 'A', true);

  // Linha 3: Set 5 Tie-break em largura total
  const row3Y = row2Y + setRowH + setGap;
  const tbH = 34.0;
  drawFedDecidingSetBlock(d, 5, M, row3Y, setsAreaW, tbH, data, true);

  // Coluna de Equipes Superior Direita
  const topSetsTotalH = 2 * setRowH + tbH + 2 * setGap; // 102 mm
  drawFedRostersColumn(d, xRoster, mainY, rosterW, topSetsTotalH, data, true);

  // Seção Inferior: Sanções, Observações & Aprovação, e Resultados (5 sets)
  const bottomY = mainY + topSetsTotalH + 1.2;
  const bottomH = H - bottomY - M; // ~89mm

  const sancW = 56;
  const appColW = 95;
  const resColW = contentW - sancW - appColW - 2;

  const xSanc = M;
  const xAppr = M + sancW + 1;
  const xRes = xAppr + appColW + 1;

  drawFedSanctions(d, xSanc, bottomY, sancW, bottomH);

  const obsH = 16;
  drawFedObservations(d, xAppr, bottomY, appColW, obsH, data);
  drawFedApproval(d, xAppr, bottomY + obsH + 1, appColW, bottomH - obsH - 1, data);

  drawFedResults(d, xRes, bottomY, resColW, bottomH, data, 5);
}

// ══════════════════════════════════════════════════════════════════════
// 8. FICHAS DE POSIÇÃO E API (MANTIDAS)
// ══════════════════════════════════════════════════════════════════════
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
  orgName: string
) {
  bx(d, x, y, cw, ch, 0.6);

  const hdrH = 7.5;
  fbx(d, x, y, cw, hdrH, BG_HEADER);
  bx(d, x, y, cw, hdrH, 0.4);

  if (team.logoUrl) {
    drawTeamLogo(d, team.logoUrl, x + 2.0, y + 1.5, 5.0);
  } else {
    circle(d, x + 4.5, y + hdrH / 2, 2.5, 0.3);
    tx(d, 'V', x + 4.5, y + hdrH / 2 + 1.2, 3.8, { a: 'center', b: true, c: WHITE });
  }

  tx(d, 'FICHA DE POSIÇÃO', x + cw / 2, y + 4.8, 5.5, { a: 'center', b: true, c: WHITE });
  tx(d, orgName.substring(0, 15).toUpperCase(), x + cw - 2, y + 4.8, 3.5, { a: 'right', c: WHITE, b: true });

  const subH = 5.5;
  fbx(d, x, y + hdrH, cw, subH, BG_ZEBRA);
  ln(d, x, y + hdrH + subH, x + cw, y + hdrH + subH, 0.2, GRAY_LIGHT);

  const matchInfoLine = `J#${data.matchNumber || '-'} · ${data.court || data.venue || ''} · Adv: ${(opponent.shortName || opponent.name).substring(0, 12)}`;
  tx(d, matchInfoLine, x + 2, y + hdrH + 3.8, 3.2, { c: GRAY_DARK, b: true });

  const teamY = y + hdrH + subH + 1.5;
  tx(d, team.name.toUpperCase().substring(0, 16), x + 2, teamY + 3.5, 4.8, { b: true });
  tx(d, setLabel, x + cw - 2, teamY + 3.5, 6.0, { a: 'right', b: true });

  const libY = teamY + 5.0;
  tx(d, 'Líbero:', x + 2, libY + 2.8, 3.5, { c: GRAY_DARK, b: true });
  ln(d, x + 14, libY + 3.2, x + 30, libY + 3.2, 0.2, GRAY_LIGHT);
  tx(d, 'Capitão:', x + 34, libY + 2.8, 3.5, { c: GRAY_DARK, b: true });
  ln(d, x + 47, libY + 3.2, x + cw - 2, libY + 3.2, 0.2, GRAY_LIGHT);

  const posMap = [['IV', 'III', 'II'], ['V', 'VI', 'I']];
  const gridX = x + 3;
  const gridY = libY + 5.0;
  const cellW = (cw - 6) / 3;
  const cellH = (ch - (gridY - y) - 8.5) / 2;

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const px = gridX + c * cellW;
      const py = gridY + r * cellH;
      const pos = posMap[r][c];
      const isSaque = pos === 'I';
      bx(d, px, py, cellW, cellH, isSaque ? 0.6 : 0.3);
      tx(d, pos, px + 2.0, py + 3.5, 4.5, { b: true });
      if (isSaque) {
        tx(d, 'Saque', px + cellW / 2, py + cellH - 1.5, 3.2, { a: 'center', c: GRAY_DARK, b: true });
      }
    }
  }

  const sigY2 = y + ch - 5.5;
  tx(d, 'Assinatura do Técnico:', x + 3, sigY2 + 3.5, 3.2, { c: GRAY_DARK, b: true });
  ln(d, x + 36, sigY2 + 3.5, x + cw - 3, sigY2 + 3.5, 0.2, GRAY_LIGHT);
}

function buildPositionSheet(d: jsPDF, data: MatchSheetData) {
  const orgName = data.orgName || 'VolleyPro';
  const isFiveSets = data.format === '5-sets';

  const cardCols = 4;
  const cardRows = 2;
  const gapX = 3, gapY = 4;
  const cw = (W - 2 * M - (cardCols - 1) * gapX) / cardCols;
  const ch = (H - 2 * M - 8 - (cardRows - 1) * gapY) / cardRows;

  tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO`, W / 2, M + 3, 6.5, { a: 'center', b: true });
  tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, W / 2, M + 7, 4.5, { a: 'center', c: GRAY_DARK, b: true });

  for (let c = 0; c < 4; c++) {
    const setNum = c + 1;
    const setLabel = setNum <= (isFiveSets ? 5 : 3) ? `SET ${setNum}` : `SET EXTRA`;

    const cxA = M + c * (cw + gapX);
    const cyA = M + 9;
    drawPositionCard(d, cxA, cyA, cw, ch, data, data.teamA, data.teamB, `${setLabel} (A)`, orgName);

    const cxB = M + c * (cw + gapX);
    const cyB = M + 9 + (ch + gapY);
    drawPositionCard(d, cxB, cyB, cw, ch, data, data.teamB, data.teamA, `${setLabel} (B)`, orgName);
  }

  tx(d, `VolleyPro · Fichas de Posição / Ordem de Saque ${isFiveSets ? '(Página 1/2)' : ''}`, M, H - 2, 3.8, { c: GRAY_DARK, b: true });

  if (isFiveSets) {
    d.addPage('a4', 'landscape');
    tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO (SETS DECISIVOS)`, W / 2, M + 3, 6.5, { a: 'center', b: true });
    tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, W / 2, M + 7, 4.5, { a: 'center', c: GRAY_DARK, b: true });

    for (let c = 0; c < 2; c++) {
      const setNum = c + 5;
      const setLabel = setNum === 5 ? `SET 5 (TB)` : `SET EXTRA`;

      const cxA = M + c * (cw + gapX);
      const cyA = M + 9;
      drawPositionCard(d, cxA, cyA, cw, ch, data, data.teamA, data.teamB, `${setLabel} (A)`, orgName);

      const cxB = M + c * (cw + gapX);
      const cyB = M + 9 + (ch + gapY);
      drawPositionCard(d, cxB, cyB, cw, ch, data, data.teamB, data.teamA, `${setLabel} (B)`, orgName);
    }

    tx(d, 'VolleyPro · Fichas de Posição / Ordem de Saque (Página 2/2)', M, H - 2, 3.8, { c: GRAY_DARK, b: true });
  }
}

export function generateOfficialMatchSheetPdf(data: MatchSheetData): jsPDF {
  const isFiveSets = data.format === '5-sets';
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  if (isFiveSets) {
    buildOfficial5SetsSheet(doc, data);
  } else {
    buildOfficial3SetsSheet(doc, data);
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
  orgName = 'Federação Paranaense de Voleibol',
): jsPDF {
  const blankData: MatchSheetData = {
    orgName,
    competition: 'TORNEIO DE VOLEIBOL',
    category: 'ADULTO',
    genderCategory: 'female',
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
