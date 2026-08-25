// =====================================================================
// Súmula Oficial de Voleibol — Reprodução Fiel e Idêntica ao Padrão
// Oficial CBV / FPV em A4 Paisagem (297 × 210 mm).
// =====================================================================

import jsPDF from 'jspdf';
import type { MatchSheetData } from './matchSheetPdf';

// ── Cores Oficiais (Monocromático / Tons de Cinza Regulamentares) ───
const INK = '#000000';
const GRAY_DARK = '#222222';
const GRAY_MED = '#666666';
const GRAY_LIGHT = '#aaaaaa';
const BG_HEADER = '#f4f4f4';
const BG_ZEBRA = '#fafafa';
const WHITE = '#ffffff';

// ── Dimensões A4 Paisagem (mm) ──────────────────────────────────────
const W = 297, H = 210, M = 3.5;

// ── Helpers Gráficos de Alta Precisão ────────────────────────────────
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
function chk(d: jsPDF, x: number, y: number, sz: number, checked: boolean) {
  bx(d, x, y, sz, sz, 0.2);
  if (checked) {
    ln(d, x + 0.5, y + sz * 0.55, x + sz * 0.4, y + sz - 0.5, 0.35);
    ln(d, x + sz * 0.4, y + sz - 0.5, x + sz - 0.5, y + 0.5, 0.35);
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
    // Silencioso
  }
}

// ══════════════════════════════════════════════════════════════════════
// 1. CABEÇALHO OFICIAL (HEADER)
// ══════════════════════════════════════════════════════════════════════
function drawOfficialHeader(d: jsPDF, data: MatchSheetData, y: number, w: number, h: number) {
  bx(d, M, y, w, h, 0.4);

  // Logo 1 (Esquerda)
  if (data.teamA.logoUrl) {
    drawTeamLogo(d, data.teamA.logoUrl, M + 1.5, y + 1.5, 10);
  } else {
    circle(d, M + 6.5, y + h / 2, 4.5, 0.3);
    tx(d, 'TDT', M + 6.5, y + h / 2 + 1.2, 4.5, { a: 'center', b: true });
  }

  // Divisória Esquerda
  ln(d, M + 14, y, M + 14, y + h, 0.2);

  // Bloco Título do Torneio
  const orgName = data.orgName || 'TORNEIO DE VOLEIBOL';
  tx(d, orgName.toUpperCase(), M + 16, y + 4.2, 6.5, { b: true });
  tx(d, (data.competition || 'CAMPEONATO OFICIAL').toUpperCase(), M + 16, y + 8.5, 6, { b: true, c: '#b91c1c' });

  // Divisória Confronto (Centro-Esquerda)
  const xConfronto = M + 80;
  ln(d, xConfronto, y, xConfronto, y + h, 0.2);

  // Logo 2 (Centro)
  if (data.teamB.logoUrl) {
    drawTeamLogo(d, data.teamB.logoUrl, xConfronto + 1.5, y + 1.5, 10);
  } else {
    circle(d, xConfronto + 6.5, y + h / 2, 4.5, 0.3);
    tx(d, 'TDT', xConfronto + 6.5, y + h / 2 + 1.2, 4.5, { a: 'center', b: true });
  }
  ln(d, xConfronto + 14, y, xConfronto + 14, y + h, 0.2);

  // Confronto: EQUIPE A  X  EQUIPE B
  const xTeams = xConfronto + 15;
  const wTeams = 105;
  const nameA = (data.teamA.shortName || data.teamA.name).toUpperCase().substring(0, 18);
  const nameB = (data.teamB.shortName || data.teamB.name).toUpperCase().substring(0, 18);
  tx(d, nameA, xTeams + 22, y + 5.5, 6.5, { a: 'center', b: true });
  tx(d, 'X', xTeams + wTeams / 2, y + 5.5, 6.5, { a: 'center', b: true });
  tx(d, nameB, xTeams + wTeams - 22, y + 5.5, 6.5, { a: 'center', b: true });

  // Divisória Dados do Jogo (Direita)
  const xInfo = xTeams + wTeams;
  ln(d, xInfo, y, xInfo, y + h, 0.2);
  ln(d, xInfo, y + 6.5, M + w, y + 6.5, 0.15, GRAY_LIGHT);

  // Linha 1 de Informações
  const venueStr = (data.venue + (data.court ? ` - ${data.court}` : '')).toUpperCase().substring(0, 38);
  tx(d, venueStr, xInfo + 2, y + 4.5, 5, { b: true });

  // Linha 2 de Informações (Data, Horário, Naipe, Grupo, Categoria)
  const dateStr = data.date || '07/06/2026';
  const timeStr = data.time ? (data.time.length === 5 ? `${data.time}:00` : data.time) : '08:00:00';
  const naipeStr = data.genderCategory === 'female' ? 'F' : data.genderCategory === 'male' ? 'M' : 'MISTO';
  const groupStr = data.groupName || data.phase || 'A';
  const catStr = (data.category || 'LIVRE').toUpperCase();

  tx(d, dateStr, xInfo + 2, y + 10.5, 5);
  tx(d, timeStr, xInfo + 20, y + 10.5, 5);
  tx(d, `Naipe: ${naipeStr}`, xInfo + 40, y + 10.5, 5, { b: true });
  tx(d, `Grupo: ${groupStr}`, xInfo + 55, y + 10.5, 5, { b: true });
  tx(d, `Cat: ${catStr}`, xInfo + 70, y + 10.5, 5, { b: true });
}

// ══════════════════════════════════════════════════════════════════════
// 2. BLOCO DE SET REGULAR (SETS 1 E 2 COM 48 PONTOS)
// ══════════════════════════════════════════════════════════════════════
function drawRegularSetBlock(
  d: jsPDF,
  setNum: number,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData,
  teamLeft: 'A' | 'B',
  teamRight: 'A' | 'B'
) {
  bx(d, x, y, w, h, 0.35);

  // 1. Faixa Lateral 1: SET N
  const stripW1 = 5;
  fbx(d, x, y, stripW1, h, BG_HEADER);
  bx(d, x, y, stripW1, h, 0.2);
  tx(d, 'S', x + stripW1 / 2, y + h * 0.18, 4.5, { a: 'center', b: true });
  tx(d, 'E', x + stripW1 / 2, y + h * 0.36, 4.5, { a: 'center', b: true });
  tx(d, 'T', x + stripW1 / 2, y + h * 0.54, 4.5, { a: 'center', b: true });
  tx(d, String(setNum), x + stripW1 / 2, y + h * 0.78, 6, { a: 'center', b: true });

  // 2. Faixa Lateral 2: Rótulos das Linhas
  const stripW2 = 18;
  const sx2 = x + stripW1;
  bx(d, sx2, y, stripW2, h, 0.2);

  const r1h = 4.2; // Horário de Início / Equipe
  const r2h = 4.2; // Ordem de Saque
  const r3h = 4.2; // Jogadores Iniciantes
  const r4h = 3.5; // Nº do Jogador
  const r5h = 5.6; // Substituições (2 linhas de 2.8)
  const r6h = h - (r1h + r2h + r3h + r4h + r5h); // Rodada de Saques (4 linhas)

  // Textos da Faixa Lateral de Rótulos
  tx(d, 'Formação de Equipe', sx2 + 1, y + r1h + 2.8, 2.7, { c: GRAY_DARK });
  tx(d, 'Ordem de Saque', sx2 + 1, y + r1h + r2h + 2.8, 2.7, { c: GRAY_DARK });
  tx(d, 'Jogadores Iniciantes', sx2 + 1, y + r1h + r2h + r3h + 2.8, 2.5, { c: GRAY_DARK });
  tx(d, 'Nº do Jogador', sx2 + 1, y + r1h + r2h + r3h + r4h + 2.6, 2.5, { c: GRAY_DARK });

  tx(d, 'Substituições', sx2 + 1, y + r1h + r2h + r3h + r4h + 2.5, 2.5, { c: GRAY_DARK });
  tx(d, 'Placar na', sx2 + 1, y + r1h + r2h + r3h + r4h + 4.2, 2.3, { c: GRAY_MED });
  tx(d, 'Troca', sx2 + 1, y + r1h + r2h + r3h + r4h + 5.2, 2.3, { c: GRAY_MED });

  tx(d, 'Rodada', sx2 + 1, y + h - r6h + 2.8, 2.5, { c: GRAY_DARK });
  tx(d, 'de', sx2 + 1, y + h - r6h + 5.2, 2.5, { c: GRAY_DARK });
  tx(d, 'Saques', sx2 + 1, y + h - r6h + 7.6, 2.5, { c: GRAY_DARK });

  // Subdivisões 1º-5º, 2º-6º, 3º-7º, 4º-8º na faixa
  const srvSubH = r6h / 4;
  const srvLabels = [['1º', '5º'], ['2º', '6º'], ['3º', '7º'], ['4º', '8º']];
  for (let r = 0; r < 4; r++) {
    const sry = y + h - r6h + r * srvSubH;
    ln(d, sx2, sry, sx2 + stripW2, sry, 0.1);
    tx(d, srvLabels[r][0], sx2 + 11.5, sry + srvSubH * 0.7, 2.7);
    tx(d, srvLabels[r][1], sx2 + 15, sry + srvSubH * 0.7, 2.7);
  }

  // Linhas horizontais divisórias
  ln(d, sx2, y + r1h, x + w, y + r1h, 0.2);
  ln(d, sx2, y + r1h + r2h, x + w, y + r1h + r2h, 0.2);
  ln(d, sx2, y + r1h + r2h + r3h, x + w, y + r1h + r2h + r3h, 0.2);
  ln(d, sx2, y + r1h + r2h + r3h + r4h, x + w, y + r1h + r2h + r3h + r4h, 0.2);
  ln(d, sx2, y + r1h + r2h + r3h + r4h + r5h, x + w, y + r1h + r2h + r3h + r4h + r5h, 0.2);

  // 3. Duas Metades de Equipe (Esquerda e Direita)
  const remainingW = w - (stripW1 + stripW2);
  const halfW = (remainingW - 1) / 2;
  const ptColW = 12; // Coluna de 48 pontos
  const teamBoxW = halfW - ptColW;

  const leftTeamData = teamLeft === 'A' ? data.teamA : data.teamB;
  const rightTeamData = teamRight === 'A' ? data.teamA : data.teamB;

  // Renderiza Metade Esquerda
  const xLeft = x + stripW1 + stripW2;
  drawTeamSetHalf(d, xLeft, y, teamBoxW, h, r1h, r2h, r3h, r4h, r5h, r6h, teamLeft, leftTeamData);
  drawPointsColumn48(d, xLeft + teamBoxW, y, ptColW, h);

  // Divisória Central
  ln(d, xLeft + halfW, y, xLeft + halfW, y + h, 0.25);

  // Renderiza Metade Direita
  const xRight = xLeft + halfW + 1;
  drawTeamSetHalf(d, xRight, y, teamBoxW, h, r1h, r2h, r3h, r4h, r5h, r6h, teamRight, rightTeamData);
  drawPointsColumn48(d, xRight + teamBoxW, y, ptColW, h);
}

function drawTeamSetHalf(
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
  team: MatchSheetData['teamA']
) {
  // Row 1: HORÁRIO DE INÍCIO | EQUIPE (A/B) | S / R
  fbx(d, x, y, w, r1h, BG_ZEBRA);
  tx(d, 'HORÁRIO DE INÍCIO', x + 1, y + 1.8, 2.3, { c: GRAY_DARK });
  tx(d, 'H ___ : ___ MIN', x + 1, y + 3.4, 2.5, { c: GRAY_MED });

  tx(d, 'EQUIPE', x + 24, y + 2.8, 3, { c: GRAY_DARK });
  circle(d, x + 35, y + 2.1, 1.8, 0.3);
  tx(d, teamLabel, x + 35, y + 2.8, 3.5, { a: 'center', b: true });

  const teamNameStr = (team.shortName || team.name).toUpperCase().substring(0, 14);
  tx(d, teamNameStr, x + 38, y + 2.8, 3.2, { b: true });

  // S / R
  const srX = x + w - 7;
  circle(d, srX, y + 2.1, 1.3, 0.2); tx(d, 'S', srX, y + 2.6, 2.8, { a: 'center', b: true });
  circle(d, srX + 3.8, y + 2.1, 1.3, 0.2); tx(d, 'R', srX + 3.8, y + 2.6, 2.8, { a: 'center', b: true });

  // Colunas de Posição I a VI
  const posLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const posW = w / 6;

  // Row 2: Ordem de Saque I-VI
  posLabels.forEach((lbl, i) => {
    const px = x + i * posW;
    ln(d, px, y + r1h, px, y + h, 0.15);
    tx(d, lbl, px + posW / 2, y + r1h + 3.0, 3.8, { a: 'center', b: true });
  });

  // Row 5: Substituições (2 sub-linhas com ':')
  const subY = y + r1h + r2h + r3h + r4h;
  const subRowH = r5h / 2;
  ln(d, x, subY + subRowH, x + w, subY + subRowH, 0.1, GRAY_LIGHT);
  for (let r = 0; r < 2; r++) {
    const sry = subY + r * subRowH;
    posLabels.forEach((_, i) => {
      const px = x + i * posW;
      tx(d, ':', px + posW / 2, sry + 2.2, 3.5, { a: 'center', c: GRAY_LIGHT });
    });
  }

  // Row 6: Rodada de Saques (4 linhas × 2 sub-colunas por posição)
  const srvY = subY + r5h;
  const srvRowH = r6h / 4;
  for (let r = 0; r < 4; r++) {
    const sry = srvY + r * srvRowH;
    ln(d, x, sry, x + w, sry, 0.1);
    posLabels.forEach((_, i) => {
      const px = x + i * posW;
      const subW = posW / 2;
      ln(d, px + subW, sry, px + subW, sry + srvRowH, 0.08, GRAY_LIGHT);
    });
  }
}

function drawPointsColumn48(d: jsPDF, x: number, y: number, w: number, h: number) {
  bx(d, x, y, w, h, 0.25);

  // Header PONTOS
  const hdrH = 3.2;
  fbx(d, x, y, w, hdrH, BG_HEADER);
  tx(d, 'PONTOS', x + w / 2, y + 2.3, 3, { a: 'center', b: true });

  // Grid de 4 colunas × 12 linhas = 48 pontos
  const cols = 4;
  const rows = 12;
  const tHeight = 4.5;
  const gridH = h - hdrH - tHeight;
  const colW = w / cols;
  const rowH = gridH / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const num = c * rows + r + 1;
      const px = x + c * colW;
      const py = y + hdrH + r * rowH;
      bx(d, px, py, colW, rowH, 0.06);
      tx(d, String(num), px + colW / 2, py + rowH * 0.75, 2.5, { a: 'center' });
    }
  }

  // Caixa "T" no rodapé com 2 tempos
  const tY = y + h - tHeight;
  fbx(d, x, tY, w, tHeight, BG_HEADER);
  bx(d, x, tY, w, tHeight, 0.2);
  tx(d, '"T"', x + 2.5, tY + 3.0, 3, { b: true });
  tx(d, ':', x + 6, tY + 3.0, 3.5, { c: GRAY_LIGHT });
  tx(d, ':', x + 9.5, tY + 3.0, 3.5, { c: GRAY_LIGHT });
}

// ══════════════════════════════════════════════════════════════════════
// 3. BLOCO DECISIVO / TIE-BREAK (SET 3 COM TROCA DE LADO)
// ══════════════════════════════════════════════════════════════════════
function drawDecidingSetBlock(
  d: jsPDF,
  setNum: number,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData
) {
  bx(d, x, y, w, h, 0.35);

  // Faixa Lateral 1: SET N
  const stripW1 = 5;
  fbx(d, x, y, stripW1, h, BG_HEADER);
  bx(d, x, y, stripW1, h, 0.2);
  tx(d, 'S', x + stripW1 / 2, y + h * 0.18, 4.5, { a: 'center', b: true });
  tx(d, 'E', x + stripW1 / 2, y + h * 0.36, 4.5, { a: 'center', b: true });
  tx(d, 'T', x + stripW1 / 2, y + h * 0.54, 4.5, { a: 'center', b: true });
  tx(d, String(setNum), x + stripW1 / 2, y + h * 0.78, 6, { a: 'center', b: true });

  // Faixa Lateral 2: Rótulos
  const stripW2 = 18;
  const sx2 = x + stripW1;
  bx(d, sx2, y, stripW2, h, 0.2);

  const r1h = 4.2;
  const r2h = 4.2;
  const r3h = 4.2;
  const r4h = 3.5;
  const r5h = 5.6;
  const r6h = h - (r1h + r2h + r3h + r4h + r5h);

  tx(d, 'Formação de Equipe', sx2 + 1, y + r1h + 2.8, 2.7, { c: GRAY_DARK });
  tx(d, 'Ordem de Saque', sx2 + 1, y + r1h + r2h + 2.8, 2.7, { c: GRAY_DARK });
  tx(d, 'Jogadores Iniciantes', sx2 + 1, y + r1h + r2h + r3h + 2.8, 2.5, { c: GRAY_DARK });
  tx(d, 'Nº do Jogador', sx2 + 1, y + r1h + r2h + r3h + r4h + 2.6, 2.5, { c: GRAY_DARK });
  tx(d, 'Substituições', sx2 + 1, y + r1h + r2h + r3h + r4h + 2.5, 2.5, { c: GRAY_DARK });
  tx(d, 'Placar na Troca', sx2 + 1, y + r1h + r2h + r3h + r4h + 4.8, 2.3, { c: GRAY_MED });
  tx(d, 'Rodada de Saques', sx2 + 1, y + h - r6h + 3.0, 2.5, { c: GRAY_DARK });

  const srvSubH = r6h / 3; // 3 rodadas no tie-break
  const srvLabels = [['1º', '4º'], ['2º', '5º'], ['3º', '6º']];
  for (let r = 0; r < 3; r++) {
    const sry = y + h - r6h + r * srvSubH;
    ln(d, sx2, sry, sx2 + stripW2, sry, 0.1);
    tx(d, srvLabels[r][0], sx2 + 11.5, sry + srvSubH * 0.7, 2.7);
    tx(d, srvLabels[r][1], sx2 + 15, sry + srvSubH * 0.7, 2.7);
  }

  ln(d, sx2, y + r1h, x + w, y + r1h, 0.2);
  ln(d, sx2, y + r1h + r2h, x + w, y + r1h + r2h, 0.2);
  ln(d, sx2, y + r1h + r2h + r3h, x + w, y + r1h + r2h + r3h, 0.2);
  ln(d, sx2, y + r1h + r2h + r3h + r4h, x + w, y + r1h + r2h + r3h + r4h, 0.2);
  ln(d, sx2, y + r1h + r2h + r3h + r4h + r5h, x + w, y + r1h + r2h + r3h + r4h + r5h, 0.2);

  // 3 Seções: Equipe Esquerda (A), Faixa "TROCA DE LADO", Equipe Direita (B) e "PONTOS NA TROCA"
  const innerW = w - (stripW1 + stripW2);
  const trocaW = 4.5;
  const sectionW = (innerW - trocaW) / 3; // 3 seções iguais
  const ptColW = 8;
  const boxW = sectionW - ptColW;

  // 1. Seção Equipe A (Início)
  const xA = x + stripW1 + stripW2;
  drawTeamSetHalf(d, xA, y, boxW, h, r1h, r2h, r3h, r4h, r5h, r6h, 'A', data.teamA);
  drawPointsColumn30(d, xA + boxW, y, ptColW, h);

  // 2. Faixa Vertical Central: TROCA DE LADO
  const xTroca = xA + sectionW;
  fbx(d, xTroca, y, trocaW, h, BG_HEADER);
  bx(d, xTroca, y, trocaW, h, 0.25);
  const trocaLetters = ['T', 'R', 'O', 'C', 'A', 'D', 'E', 'L', 'A', 'D', 'O'];
  trocaLetters.forEach((letra, i) => {
    tx(d, letra, xTroca + trocaW / 2, y + 4 + i * 3.4, 2.7, { a: 'center', b: true });
  });

  // 3. Seção Equipe B
  const xB = xTroca + trocaW;
  drawTeamSetHalf(d, xB, y, boxW, h, r1h, r2h, r3h, r4h, r5h, r6h, 'B', data.teamB);
  drawPointsColumn30(d, xB + boxW, y, ptColW, h);

  // 4. Seção Pontos na Troca (Equipe que trocou de lado)
  const xPnt = xB + sectionW;
  drawTeamSetHalf(d, xPnt, y, boxW, h, r1h, r2h, r3h, r4h, r5h, r6h, 'A', data.teamA);
  // Header sobreposto "PONTOS NA TROCA"
  fbx(d, xPnt, y, sectionW, r1h, BG_HEADER);
  bx(d, xPnt, y, sectionW, r1h, 0.2);
  tx(d, 'PONTOS NA TROCA', xPnt + sectionW / 2, y + 2.8, 3, { a: 'center', b: true });
  drawPointsColumn30(d, xPnt + boxW, y, ptColW, h);
}

function drawPointsColumn30(d: jsPDF, x: number, y: number, w: number, h: number) {
  bx(d, x, y, w, h, 0.25);
  const hdrH = 3.2;
  fbx(d, x, y, w, hdrH, BG_HEADER);
  tx(d, 'PONTOS', x + w / 2, y + 2.3, 2.7, { a: 'center', b: true });

  const cols = 2;
  const rows = 15;
  const tHeight = 4.5;
  const gridH = h - hdrH - tHeight;
  const colW = w / cols;
  const rowH = gridH / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const num = c * rows + r + 1;
      const px = x + c * colW;
      const py = y + hdrH + r * rowH;
      bx(d, px, py, colW, rowH, 0.06);
      tx(d, String(num), px + colW / 2, py + rowH * 0.75, 2.3, { a: 'center' });
    }
  }

  const tY = y + h - tHeight;
  fbx(d, x, tY, w, tHeight, BG_HEADER);
  bx(d, x, tY, w, tHeight, 0.2);
  tx(d, '"T"', x + 2, tY + 3.0, 2.7, { b: true });
  tx(d, ':', x + 5, tY + 3.0, 3.5, { c: GRAY_LIGHT });
}

// ══════════════════════════════════════════════════════════════════════
// 4. TABELA DE EQUIPES & ELENCOS (PAINEL SUPERIOR DIREITO)
// ══════════════════════════════════════════════════════════════════════
function drawOfficialRostersAndSignatures(
  d: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: MatchSheetData
) {
  const sigW = 28;
  const rosterW = w - sigW;

  // ── Quadro de Elencos ─────────────────────────────────────────────
  bx(d, x, y, rosterW, h, 0.35);

  // Header EQUIPES
  const hdrH = 4.5;
  fbx(d, x, y, rosterW, hdrH, BG_HEADER);
  tx(d, 'EQUIPES', x + rosterW / 2, y + 3.2, 4.5, { a: 'center', b: true });
  circle(d, x + 4, y + 2.2, 1.8, 0.3); tx(d, 'A', x + 4, y + 2.9, 3.5, { a: 'center', b: true });
  circle(d, x + rosterW - 4, y + 2.2, 1.8, 0.3); tx(d, 'B', x + rosterW - 4, y + 2.9, 3.5, { a: 'center', b: true });

  // Subheader Colunas: Doc/RG | Nome A | Nº A | Nº B | Nome B | Doc/RG
  const subH = 3.5;
  const subY = y + hdrH;
  fbx(d, x, subY, rosterW, subH, BG_ZEBRA);
  bx(d, x, subY, rosterW, subH, 0.15);

  const docW = 19;
  const numW = 6;
  const nameW = (rosterW - 2 * docW - 2 * numW) / 2;

  const colX = [
    x,
    x + docW,
    x + docW + nameW,
    x + docW + nameW + numW,
    x + docW + nameW + 2 * numW,
    x + docW + 2 * nameW + 2 * numW,
  ];

  tx(d, 'Documento / RG', colX[0] + docW / 2, subY + 2.5, 2.5, { a: 'center', c: GRAY_DARK });
  tx(d, 'Nome do Atleta (A)', colX[1] + nameW / 2, subY + 2.5, 2.5, { a: 'center', c: GRAY_DARK });
  tx(d, 'Nº', colX[2] + numW / 2, subY + 2.5, 2.8, { a: 'center', b: true });
  tx(d, 'Nº', colX[3] + numW / 2, subY + 2.5, 2.8, { a: 'center', b: true });
  tx(d, 'Nome do Atleta (B)', colX[4] + nameW / 2, subY + 2.5, 2.5, { a: 'center', c: GRAY_DARK });
  tx(d, 'Documento / RG', colX[5] + docW / 2, subY + 2.5, 2.5, { a: 'center', c: GRAY_DARK });

  // Linhas verticais da tabela de atletas
  colX.slice(1).forEach(cx => ln(d, cx, subY, cx, y + h, 0.15));

  // 14 Linhas de Atletas
  const startAthY = subY + subH;
  const maxRows = 14;
  const rowH = 4.2;

  const athA = data.teamA.athletes.slice(0, maxRows);
  const athB = data.teamB.athletes.slice(0, maxRows);

  for (let r = 0; r < maxRows; r++) {
    const ry = startAthY + r * rowH;
    ln(d, x, ry + rowH, x + rosterW, ry + rowH, 0.08, GRAY_LIGHT);

    // Atleta A
    if (athA[r]) {
      const docStr = athA[r].documentNumber || `0${r + 1}.234.567-8`;
      let nameStr = athA[r].name.toUpperCase().substring(0, 18);
      if (athA[r].captain) nameStr += ' (C)';
      if (athA[r].libero) nameStr += ' (L)';
      const numStr = athA[r].jerseyNumber !== undefined ? String(athA[r].jerseyNumber).padStart(2, '0') : '';

      tx(d, docStr, colX[0] + 1, ry + rowH * 0.75, 2.4);
      tx(d, nameStr, colX[1] + 1, ry + rowH * 0.75, 2.6);
      tx(d, numStr, colX[2] + numW / 2, ry + rowH * 0.75, 2.8, { a: 'center', b: true });
    }

    // Atleta B
    if (athB[r]) {
      const docStr = athB[r].documentNumber || `0${r + 1}.987.654-3`;
      let nameStr = athB[r].name.toUpperCase().substring(0, 18);
      if (athB[r].captain) nameStr += ' (C)';
      if (athB[r].libero) nameStr += ' (L)';
      const numStr = athB[r].jerseyNumber !== undefined ? String(athB[r].jerseyNumber).padStart(2, '0') : '';

      tx(d, numStr, colX[3] + numW / 2, ry + rowH * 0.75, 2.8, { a: 'center', b: true });
      tx(d, nameStr, colX[4] + 1, ry + rowH * 0.75, 2.6);
      tx(d, docStr, colX[5] + 1, ry + rowH * 0.75, 2.4);
    }
  }

  // Seção: JOGADORES LÍBEROS ("L")
  const libY = startAthY + maxRows * rowH;
  const libH = 9.0;
  fbx(d, x, libY, rosterW, 3.2, BG_HEADER);
  bx(d, x, libY, rosterW, 3.2, 0.15);
  tx(d, 'JOGADORES LÍBEROS ("L")', x + rosterW / 2, libY + 2.3, 3, { a: 'center', b: true });
  ln(d, x, libY + libH, x + rosterW, libY + libH, 0.15);

  // Seção: COMISSÃO TÉCNICA
  const techY = libY + libH;
  fbx(d, x, techY, rosterW, 3.2, BG_HEADER);
  bx(d, x, techY, rosterW, 3.2, 0.15);
  tx(d, 'COMISSÃO TÉCNICA', x + rosterW / 2, techY + 2.3, 3, { a: 'center', b: true });

  const techRows = ['Técnico:', 'Assistente Técnico:', 'Prep. Físico:', 'Médico/Fisioterapeuta:'];
  const techRowH = (y + h - techY - 3.2) / techRows.length;
  techRows.forEach((role, i) => {
    const try_ = techY + 3.2 + i * techRowH;
    ln(d, x, try_ + techRowH, x + rosterW, try_ + techRowH, 0.08, GRAY_LIGHT);
    tx(d, role, colX[1] + 1, try_ + techRowH * 0.7, 2.3, { c: GRAY_DARK });
    if (role.startsWith('Técnico') && data.teamA.coach) {
      tx(d, data.teamA.coach.toUpperCase().substring(0, 16), colX[1] + 18, try_ + techRowH * 0.7, 2.5, { b: true });
    }

    tx(d, role, colX[4] + 1, try_ + techRowH * 0.7, 2.3, { c: GRAY_DARK });
    if (role.startsWith('Técnico') && data.teamB.coach) {
      tx(d, data.teamB.coach.toUpperCase().substring(0, 16), colX[4] + 18, try_ + techRowH * 0.7, 2.5, { b: true });
    }
  });

  // ── Quadro de Assinaturas (Direita) ───────────────────────────────
  const xSig = x + rosterW + 1;
  bx(d, xSig, y, sigW, h, 0.35);

  fbx(d, xSig, y, sigW, 4.5, BG_HEADER);
  tx(d, 'ASSINATURAS', xSig + sigW / 2, y + 3.2, 4, { a: 'center', b: true });

  const sigBlockH = (h - 4.5) / 4;
  const sigTitles = ['CAPITÃO A:', 'TÉCNICO A:', 'CAPITÃO B:', 'TÉCNICO B:'];
  sigTitles.forEach((tStr, i) => {
    const sy = y + 4.5 + i * sigBlockH;
    ln(d, xSig, sy + sigBlockH, xSig + sigW, sy + sigBlockH, 0.15);
    tx(d, tStr, xSig + 2, sy + 3.5, 3.2, { b: true });
    ln(d, xSig + 2, sy + sigBlockH - 2.5, xSig + sigW - 2, sy + sigBlockH - 2.5, 0.08, GRAY_LIGHT);
  });
}

// ══════════════════════════════════════════════════════════════════════
// 5. PAINEL INFERIOR ESQUERDO: SANÇÕES & SOLICITAÇÕES INDEVIDAS
// ══════════════════════════════════════════════════════════════════════
function drawOfficialSanctions(d: jsPDF, x: number, y: number, w: number, h: number) {
  bx(d, x, y, w, h, 0.35);

  const titleH = 4.5;
  fbx(d, x, y, w, titleH, BG_HEADER);
  tx(d, 'SANÇÕES', x + w / 2, y + 3.2, 4.5, { a: 'center', b: true });

  // Subheader: A | P | E | D | Equipe (A/B) | SET | PLACAR
  const subH = 3.5;
  const subY = y + titleH;
  fbx(d, x, subY, w, subH, BG_ZEBRA);
  bx(d, x, subY, w, subH, 0.15);

  const colW = w / 7;
  const colHdrs = ['A', 'P', 'E', 'D', 'A/B', 'SET', 'PLACAR'];
  colHdrs.forEach((hdr, i) => {
    const cx = x + i * colW;
    ln(d, cx, subY, cx, y + h - 14, 0.1);
    tx(d, hdr, cx + colW / 2, subY + 2.5, 2.7, { a: 'center', b: true });
  });

  // Linhas de Sanções com ':'
  const rowCount = 5;
  const gridH = h - titleH - subH - 14;
  const rowH = gridH / rowCount;
  for (let r = 0; r < rowCount; r++) {
    const ry = subY + subH + r * rowH;
    ln(d, x, ry + rowH, x + w, ry + rowH, 0.08, GRAY_LIGHT);
    colHdrs.forEach((_, i) => {
      const cx = x + i * colW;
      tx(d, ':', cx + colW / 2, ry + rowH * 0.7, 3, { a: 'center', c: GRAY_LIGHT });
    });
  }

  // Caixa SOLICITAÇÕES INDEVIDAS
  const siY = y + h - 14;
  fbx(d, x, siY, w, 5.5, BG_HEADER);
  bx(d, x, siY, w, 5.5, 0.2);
  tx(d, 'SOLICITAÇÕES INDEVIDAS', x + w / 2, siY + 2.5, 2.7, { a: 'center', b: true });
  circle(d, x + 4, siY + 4.0, 1.2, 0.2); tx(d, 'A', x + 4, siY + 4.4, 2.5, { a: 'center' });
  tx(d, 'EQUIPE A', x + 6, siY + 4.4, 2.5);
  circle(d, x + w / 2 + 4, siY + 4.0, 1.2, 0.2); tx(d, 'B', x + w / 2 + 4, siY + 4.4, 2.5, { a: 'center' });
  tx(d, 'EQUIPE B', x + w / 2 + 6, siY + 4.4, 2.5);

  // Legenda de Rodapé
  const legY = siY + 5.8;
  tx(d, 'A=Advert, P=Penalidade, E=Expulsão, D=Desqualif.', x + 1, legY + 2.2, 2.1, { c: GRAY_MED });
  tx(d, 'Escrever abreviação (Nº atleta, T, AT, PF, M) e placar.', x + 1, legY + 4.5, 2.0, { c: GRAY_MED });
}

// ══════════════════════════════════════════════════════════════════════
// 6. PAINEL INFERIOR CENTRAL: APROVAÇÃO (EQUIPE DE ARBITRAGEM)
// ══════════════════════════════════════════════════════════════════════
function drawOfficialApproval(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData) {
  bx(d, x, y, w, h, 0.35);

  const titleH = 4.5;
  fbx(d, x, y, w, titleH, BG_HEADER);
  tx(d, 'APROVAÇÃO (Equipe de Arbitragem)', x + w / 2, y + 3.2, 4.5, { a: 'center', b: true });

  const startY = y + titleH + 1.5;
  const lines = [
    { label: 'Árbitro Principal:', role: '1º Árbitro' },
    { label: 'Árbitro Auxiliar:', role: '2º Árbitro' },
    { label: 'Apontador:', role: 'Apontador' },
    { label: 'Apontador Assistente:', role: 'Apontador Assistente' },
  ];

  const lineH = 5.2;
  lines.forEach((item, i) => {
    const ly = startY + i * lineH;
    tx(d, item.label, x + 2, ly + 3.5, 3.2, { b: true });

    // Nome se houver
    const ref = data.referees.find(r => r.role === item.role);
    if (ref && ref.name) {
      tx(d, ref.name.toUpperCase(), x + 35, ly + 3.5, 3.2);
    }
    ln(d, x + 35, ly + 4.2, x + w - 2, ly + 4.2, 0.1, GRAY_LIGHT);
  });

  // Juízes de Linha 1 a 4 (2 colunas)
  const jlY = startY + 4 * lineH;
  const halfW = (w - 4) / 2;

  tx(d, 'Juiz de Linha 1:', x + 2, jlY + 3.2, 3, { b: true });
  ln(d, x + 24, jlY + 3.8, x + halfW, jlY + 3.8, 0.1, GRAY_LIGHT);

  tx(d, 'Juiz de Linha 2:', x + halfW + 4, jlY + 3.2, 3, { b: true });
  ln(d, x + halfW + 26, jlY + 3.8, x + w - 2, jlY + 3.8, 0.1, GRAY_LIGHT);

  const jlY2 = jlY + 4.8;
  tx(d, 'Juiz de Linha 3:', x + 2, jlY2 + 3.2, 3, { b: true });
  ln(d, x + 24, jlY2 + 3.8, x + halfW, jlY2 + 3.8, 0.1, GRAY_LIGHT);

  tx(d, 'Juiz de Linha 4:', x + halfW + 4, jlY2 + 3.2, 3, { b: true });
  ln(d, x + halfW + 26, jlY2 + 3.8, x + w - 2, jlY2 + 3.8, 0.1, GRAY_LIGHT);

  // Rodapé: Capitães A e B
  const capY = y + h - 5.5;
  fbx(d, x, capY, w, 5.5, BG_HEADER);
  bx(d, x, capY, w, 5.5, 0.2);
  circle(d, x + w * 0.35, capY + 2.8, 1.8, 0.25); tx(d, 'A', x + w * 0.35, capY + 3.5, 3.2, { a: 'center', b: true });
  tx(d, 'Capitães', x + w / 2, capY + 3.8, 3.5, { a: 'center', b: true });
  circle(d, x + w * 0.65, capY + 2.8, 1.8, 0.25); tx(d, 'B', x + w * 0.65, capY + 3.5, 3.2, { a: 'center', b: true });
}

// ══════════════════════════════════════════════════════════════════════
// 7. PAINEL INFERIOR DIREITO: RESULTADOS FINAIS
// ══════════════════════════════════════════════════════════════════════
function drawOfficialResults(d: jsPDF, x: number, y: number, w: number, h: number, data: MatchSheetData) {
  bx(d, x, y, w, h, 0.35);

  const titleH = 4.5;
  fbx(d, x, y, w, titleH, BG_HEADER);
  tx(d, 'RESULTADOS', x + w / 2, y + 3.2, 4.5, { a: 'center', b: true });

  // Subheader: EQUIPE A vs EQUIPE B
  const subH = 3.5;
  const subY = y + titleH;
  fbx(d, x, subY, w, subH, BG_ZEBRA);
  bx(d, x, subY, w, subH, 0.15);
  tx(d, 'EQUIPE', x + 10, subY + 2.5, 3, { b: true });
  circle(d, x + 24, subY + 1.8, 1.3, 0.2); tx(d, 'A', x + 24, y + 7.2, 2.8, { a: 'center', b: true });
  circle(d, x + w - 24, subY + 1.8, 1.3, 0.2); tx(d, 'B', x + w - 24, y + 7.2, 2.8, { a: 'center', b: true });
  tx(d, 'EQUIPE', x + w - 10, subY + 2.5, 3, { a: 'right', b: true });

  // Colunas: "T" | S | V | P | Set (1º a 5º) | P | V | S | "T"
  const colMetricW = 4.8;
  const setLabelW = 16;
  const halfMetricW = 4 * colMetricW;

  const cy2 = subY + subH;
  const metricsH = 3.2;
  fbx(d, x, cy2, w, metricsH, BG_HEADER);
  bx(d, x, cy2, w, metricsH, 0.1);

  const labelsLeft = ['"T"', 'S', 'V', 'P'];
  labelsLeft.forEach((lbl, i) => {
    tx(d, lbl, x + i * colMetricW + colMetricW / 2, cy2 + 2.3, 2.5, { a: 'center', b: true });
  });

  tx(d, 'Set', x + halfMetricW + setLabelW / 2, cy2 + 2.3, 2.8, { a: 'center', b: true });

  const labelsRight = ['P', 'V', 'S', '"T"'];
  labelsRight.forEach((lbl, i) => {
    tx(d, lbl, x + halfMetricW + setLabelW + i * colMetricW + colMetricW / 2, cy2 + 2.3, 2.5, { a: 'center', b: true });
  });

  // Linhas dos 5 Sets
  const startSetY = cy2 + metricsH;
  const setRowH = 4.0;
  for (let s = 0; s < 5; s++) {
    const sry = startSetY + s * setRowH;
    ln(d, x, sry + setRowH, x + w, sry + setRowH, 0.08, GRAY_LIGHT);

    // Divisórias de métricas
    for (let c = 1; c <= 4; c++) ln(d, x + c * colMetricW, sry, x + c * colMetricW, sry + setRowH, 0.08, GRAY_LIGHT);
    for (let c = 0; c <= 4; c++) ln(d, x + halfMetricW + setLabelW + c * colMetricW, sry, x + halfMetricW + setLabelW + c * colMetricW, sry + setRowH, 0.08, GRAY_LIGHT);

    // Set label
    tx(d, `${s + 1}º (   )`, x + halfMetricW + setLabelW / 2, sry + 3.0, 2.8, { a: 'center' });

    // Scores se existirem
    if (data.sets[s]) {
      tx(d, String(data.sets[s].scoreA), x + 3 * colMetricW + colMetricW / 2, sry + 3.0, 2.8, { a: 'center', b: true });
      tx(d, String(data.sets[s].scoreB), x + halfMetricW + setLabelW + colMetricW / 2, sry + 3.0, 2.8, { a: 'center', b: true });
      if (data.sets[s].scoreA > data.sets[s].scoreB) {
        tx(d, '1', x + 2 * colMetricW + colMetricW / 2, sry + 3.0, 2.8, { a: 'center', b: true });
      } else {
        tx(d, '1', x + halfMetricW + setLabelW + colMetricW + colMetricW / 2, sry + 3.0, 2.8, { a: 'center', b: true });
      }
    }
  }

  // Duração Total dos Sets
  const durSetsY = startSetY + 5 * setRowH;
  fbx(d, x, durSetsY, w, 3.5, BG_ZEBRA);
  tx(d, 'Duração Total dos Sets: ________ min', x + w / 2, durSetsY + 2.5, 2.7, { a: 'center' });

  // Timings: Início, Término, Duração Total
  const timeY = durSetsY + 3.5;
  const timeH = 7.5;
  bx(d, x, timeY, w, timeH, 0.15);
  const thirdW = w / 3;
  ln(d, x + thirdW, timeY, x + thirdW, timeY + timeH, 0.1);
  ln(d, x + 2 * thirdW, timeY, x + 2 * thirdW, timeY + timeH, 0.1);

  tx(d, 'Hora Início', x + thirdW / 2, timeY + 2.6, 2.3, { a: 'center', c: GRAY_MED });
  tx(d, data.time || '___h ___min', x + thirdW / 2, timeY + 5.6, 2.7, { a: 'center', b: true });

  tx(d, 'Hora Término', x + 1.5 * thirdW, timeY + 2.6, 2.3, { a: 'center', c: GRAY_MED });
  tx(d, '___h ___min', x + 1.5 * thirdW, timeY + 5.6, 2.7, { a: 'center' });

  tx(d, 'Duração Jogo', x + 2.5 * thirdW, timeY + 2.6, 2.3, { a: 'center', c: GRAY_MED });
  tx(d, '___h ___min', x + 2.5 * thirdW, timeY + 5.6, 2.7, { a: 'center' });

  // Vencedor
  const winY = timeY + timeH;
  fbx(d, x, winY, w, h - (winY - y), BG_HEADER);
  bx(d, x, winY, w, h - (winY - y), 0.2);

  tx(d, 'VENCEDOR:', x + 3, winY + 4.5, 3.8, { b: true });
  if (data.winner) {
    const winName = data.winner === 'A' ? data.teamA.name : data.teamB.name;
    tx(d, winName.toUpperCase().substring(0, 16), x + 26, winY + 4.5, 3.8, { b: true });
  }
  const finalStr = `${data.finalScoreA} : ${data.finalScoreB}`;
  tx(d, finalStr, x + w - 4, winY + 4.5, 5, { a: 'right', b: true });
}

// ══════════════════════════════════════════════════════════════════════
// 8. CONSTRUTOR COMPLETO DA SÚMULA DE 3 SETS (A4 PAISAGEM)
// ══════════════════════════════════════════════════════════════════════
function buildOfficial3SetsSheet(d: jsPDF, data: MatchSheetData) {
  const contentW = W - 2 * M; // 290 mm

  // 1. Cabeçalho
  const headerH = 13;
  drawOfficialHeader(d, data, M, contentW, headerH);

  // 2. Seção Central (y = 17 a y = 145 = 128mm)
  const mainY = M + headerH + 0.5;
  const setsW = 158;
  const rightW = contentW - setsW - 1; // 131 mm
  const rightX = M + setsW + 1;

  // 3 Sets empilhados na esquerda (Sets 1 e 2 regulares, Set 3 tie-break)
  const setH = 42;
  const setGap = 0.8;

  // Set 1 (Equipe A na esquerda, B na direita)
  drawRegularSetBlock(d, 1, M, mainY, setsW, setH, data, 'A', 'B');

  // Set 2 (Equipe B na esquerda, A na direita - inversão regulamentar de lado)
  drawRegularSetBlock(d, 2, M, mainY + setH + setGap, setsW, setH, data, 'B', 'A');

  // Set 3 (Tie-break decisivo com Troca de Lado e Pontos na Troca)
  drawDecidingSetBlock(d, 3, M, mainY + 2 * (setH + setGap), setsW, setH, data);

  // Painel Superior Direito: Tabela de Elencos e Assinaturas
  const rosterH = 3 * setH + 2 * setGap; // 127.6 mm
  drawOfficialRostersAndSignatures(d, rightX, mainY, rightW, rosterH, data);

  // 3. Seção Inferior (y = 146.5 a y = 205 = 58.5mm)
  const bottomY = mainY + rosterH + 1.2;
  const bottomH = H - bottomY - M;

  const sancW = 54;
  const resultsW = 86;
  const apprW = contentW - sancW - resultsW - 2;

  const xSanc = M;
  const xAppr = M + sancW + 1;
  const xResults = xAppr + apprW + 1;

  // Painel de Sanções
  drawOfficialSanctions(d, xSanc, bottomY, sancW, bottomH);

  // Painel de Aprovação (Arbitragem)
  drawOfficialApproval(d, xAppr, bottomY, apprW, bottomH, data);

  // Painel de Resultados Finais
  drawOfficialResults(d, xResults, bottomY, resultsW, bottomH, data);
}

// ══════════════════════════════════════════════════════════════════════
// 9. CONSTRUTOR COMPLETO DA SÚMULA DE 5 SETS (A4 PAISAGEM)
// ══════════════════════════════════════════════════════════════════════
function buildOfficial5SetsSheet(d: jsPDF, data: MatchSheetData) {
  const contentW = W - 2 * M;

  // 1. Cabeçalho
  const headerH = 13;
  drawOfficialHeader(d, data, M, contentW, headerH);

  // 2. Seção Central dos 5 Sets
  const mainY = M + headerH + 0.5;
  const setsW = 158;
  const rightW = contentW - setsW - 1;
  const rightX = M + setsW + 1;

  // 5 Sets distribuídos harmoniosamente na área esquerda:
  // Sets 1 a 4 com tamanho padronizado (24.5mm cada) + Set 5 Tie-break (26mm)
  const setH = 25;
  const setGap = 0.6;

  drawRegularSetBlock(d, 1, M, mainY, setsW, setH, data, 'A', 'B');
  drawRegularSetBlock(d, 2, M, mainY + setH + setGap, setsW, setH, data, 'B', 'A');
  drawRegularSetBlock(d, 3, M, mainY + 2 * (setH + setGap), setsW, setH, data, 'A', 'B');
  drawRegularSetBlock(d, 4, M, mainY + 3 * (setH + setGap), setsW, setH, data, 'B', 'A');
  drawDecidingSetBlock(d, 5, M, mainY + 4 * (setH + setGap), setsW, setH + 1.8, data);

  const rosterH = 5 * setH + 4 * setGap + 1.8;
  drawOfficialRostersAndSignatures(d, rightX, mainY, rightW, rosterH, data);

  // 3. Seção Inferior
  const bottomY = mainY + rosterH + 1.2;
  const bottomH = H - bottomY - M;

  const sancW = 54;
  const resultsW = 86;
  const apprW = contentW - sancW - resultsW - 2;

  const xSanc = M;
  const xAppr = M + sancW + 1;
  const xResults = xAppr + apprW + 1;

  drawOfficialSanctions(d, xSanc, bottomY, sancW, bottomH);
  drawOfficialApproval(d, xAppr, bottomY, apprW, bottomH, data);
  drawOfficialResults(d, xResults, bottomY, resultsW, bottomH, data);
}

// ══════════════════════════════════════════════════════════════════════
// 10. FICHAS DE POSIÇÃO (8 FILIPETAS / FOLHA EM A4)
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
  bx(d, x, y, cw, ch, 0.4);

  const hdrH = 6.5;
  fbx(d, x, y, cw, hdrH, BG_HEADER);
  bx(d, x, y, cw, hdrH, 0.2);

  if (team.logoUrl) {
    drawTeamLogo(d, team.logoUrl, x + 1.5, y + 1, 4.5);
  } else {
    circle(d, x + 4, y + hdrH / 2, 2.2, 0.25);
    tx(d, 'V', x + 4, y + hdrH / 2 + 0.8, 3, { a: 'center', b: true });
  }

  tx(d, 'FICHA DE POSIÇÃO', x + cw / 2, y + 4.2, 5, { a: 'center', b: true });
  tx(d, orgName.substring(0, 12).toUpperCase(), x + cw - 2, y + 4.2, 3.2, { a: 'right', c: GRAY_MED });

  const subH = 5.0;
  fbx(d, x, y + hdrH, cw, subH, BG_ZEBRA);
  ln(d, x, y + hdrH + subH, x + cw, y + hdrH + subH, 0.15, GRAY_LIGHT);

  const matchInfoLine = `J#${data.matchNumber || '-'} · ${data.court || data.venue || ''} · Adv: ${(opponent.shortName || opponent.name).substring(0, 10)}`;
  tx(d, matchInfoLine, x + 2, y + hdrH + 3.5, 2.8, { c: GRAY_DARK });

  const teamY = y + hdrH + subH + 1;
  tx(d, team.name.toUpperCase().substring(0, 14), x + 2, teamY + 3.2, 4.2, { b: true });
  tx(d, setLabel, x + cw - 2, teamY + 3.2, 5.5, { a: 'right', b: true });

  const libY = teamY + 4.5;
  tx(d, 'Líbero:', x + 2, libY + 2.5, 3.2, { c: GRAY_DARK });
  ln(d, x + 12, libY + 3, x + 28, libY + 3, 0.15, GRAY_LIGHT);
  tx(d, 'Capitão:', x + 32, libY + 2.5, 3.2, { c: GRAY_DARK });
  ln(d, x + 43, libY + 3, x + cw - 2, libY + 3, 0.15, GRAY_LIGHT);

  const posMap = [['IV', 'III', 'II'], ['V', 'VI', 'I']];
  const gridX = x + 3;
  const gridY = libY + 4.5;
  const cellW = (cw - 6) / 3;
  const cellH = (ch - (gridY - y) - 7.5) / 2;

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const px = gridX + c * cellW;
      const py = gridY + r * cellH;
      const pos = posMap[r][c];
      const isSaque = pos === 'I';
      bx(d, px, py, cellW, cellH, isSaque ? 0.45 : 0.2);
      tx(d, pos, px + 1.5, py + 3, 3.8, { b: true });
      if (isSaque) {
        tx(d, 'Saque', px + cellW / 2, py + cellH - 1.2, 2.8, { a: 'center', c: GRAY_DARK });
      }
    }
  }

  const sigY2 = y + ch - 4.5;
  tx(d, 'Assinatura do Técnico:', x + 3, sigY2 + 3.0, 2.8, { c: GRAY_DARK });
  ln(d, x + 32, sigY2 + 3.0, x + cw - 3, sigY2 + 3.0, 0.15, GRAY_LIGHT);
}

function buildPositionSheet(d: jsPDF, data: MatchSheetData) {
  const orgName = data.orgName || 'VolleyPro';
  const isFiveSets = data.format === '5-sets';

  const cardCols = 4;
  const cardRows = 2;
  const gapX = 3, gapY = 4;
  const cw = (W - 2 * M - (cardCols - 1) * gapX) / cardCols;
  const ch = (H - 2 * M - 8 - (cardRows - 1) * gapY) / cardRows;

  tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO`, W / 2, M + 3, 6, { a: 'center', b: true });
  tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, W / 2, M + 7, 4, { a: 'center', c: GRAY_DARK });

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

  tx(d, `VolleyPro · Fichas de Posição / Ordem de Saque ${isFiveSets ? '(Página 1/2)' : ''}`, M, H - 2, 3.5, { c: GRAY_LIGHT });

  if (isFiveSets) {
    d.addPage('a4', 'landscape');
    tx(d, `${orgName.toUpperCase()} · FICHAS DE POSIÇÃO (SETS DECISIVOS)`, W / 2, M + 3, 6, { a: 'center', b: true });
    tx(d, `${data.competition.toUpperCase()} · ${data.teamA.name.toUpperCase()} x ${data.teamB.name.toUpperCase()} · ${data.date || ''}`, W / 2, M + 7, 4, { a: 'center', c: GRAY_DARK });

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

    tx(d, 'VolleyPro · Fichas de Posição / Ordem de Saque (Página 2/2)', M, H - 2, 3.5, { c: GRAY_LIGHT });
  }
}

// ══════════════════════════════════════════════════════════════════════
// 11. EXPORTAÇÕES PÚBLICAS
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
  orgName = 'TORNEIO FEMININO TDT VOLEIBOL',
): jsPDF {
  const blankData: MatchSheetData = {
    orgName,
    competition: 'TURMA DA TERÇA VOLEIBOL',
    category: 'LIVRE',
    genderCategory: 'female',
    modality: 'indoor',
    format,
    playerFormat: '6x6',
    date: '07/06/2026',
    time: '07:50:00',
    venue: 'UNIPAR FRANCISCO BELTRÃO',
    court: 'Quadra 1',
    city: 'Francisco Beltrão - PR',
    phase: 'Classificatória',
    groupName: 'A',
    round: 1,
    matchNumber: 1,
    teamA: {
      name: 'FB VOLEI',
      shortName: 'FB VOLEI',
      athletes: [
        { documentNumber: '069.612.169-78', name: 'ANA CARLA MENDES CZENKOWSKI', jerseyNumber: 1 },
        { documentNumber: '8.761.530-8', name: 'ANDRÉA NESI WESSLER', jerseyNumber: 2 },
        { documentNumber: '10.476.466-5', name: 'ELIEGE ANDRADE MENIN', jerseyNumber: 3 },
        { documentNumber: '092.899.469-46', name: 'FERNANDA DA COSTA VENTURIN', jerseyNumber: 4 },
        { documentNumber: '104.119.959-79', name: 'JULIA DE ARAÚJO PASTRE', jerseyNumber: 5 },
        { documentNumber: '068.347.619-00', name: 'JÉSSICA DE ANDRADE LEMOS', jerseyNumber: 6 },
        { documentNumber: '148.883.029-01', name: 'LAURA MENDES DA ROZA', jerseyNumber: 7 },
        { documentNumber: '049.225.569-58', name: 'LEYLANI VIANNA GIACOMELLI', jerseyNumber: 8 },
        { documentNumber: '053.657.529-02', name: 'PRISCILA KRÜHS WEINFORTNER', jerseyNumber: 9 },
        { documentNumber: '6.261.389', name: 'SABRINA FERLA DE ALENCAR', jerseyNumber: 10 },
        { documentNumber: '7.946.797-9', name: 'SANDRA CRISTINA TAKADA FLORES', jerseyNumber: 11 },
        { documentNumber: '033.133.839-47', name: 'SILVANE MENDES', jerseyNumber: 12 },
        { documentNumber: '10.327.290-4', name: 'SUÉLEN BASSO MENDES', jerseyNumber: 13 },
        { documentNumber: '960.476.400-44', name: 'TISCIANA LETÍCIA WEIMER DA SILVA', jerseyNumber: 14 },
      ],
    },
    teamB: {
      name: 'AURA VOLEIBOL',
      shortName: 'AURA VOLEIBOL',
      athletes: [
        { documentNumber: '109.212.179-00', name: 'ANA CRISTINA WALENDORF', jerseyNumber: 1 },
        { documentNumber: '052.911.599-95', name: 'ANDRESSA DEMETREO NAZARIO', jerseyNumber: 2 },
        { documentNumber: '072.751.649-30', name: 'BEATRIZ CAVAZINI', jerseyNumber: 3 },
        { documentNumber: '043.100.549-43', name: 'FERNANDA DOS SANTOS THOMAZ', jerseyNumber: 4 },
        { documentNumber: '097.800.492-97', name: 'HELEN CRISTINA LONGO', jerseyNumber: 5 },
        { documentNumber: '119.091.809-98', name: 'HELEN WAGNER', jerseyNumber: 6 },
        { documentNumber: '091.698.219-09', name: 'JULIA GABRIELA CZIEWIAKON', jerseyNumber: 7 },
        { documentNumber: '091.376.499-06', name: 'KETLYN TAINNARA SPELIER LOPES', jerseyNumber: 8 },
        { documentNumber: '071.969.219-92', name: 'TAISNARA CASANOVA', jerseyNumber: 9 },
        { documentNumber: '084.500.029-23', name: 'TAMARA THAIS GIUSTTI BASSANI', jerseyNumber: 10 },
        { documentNumber: '050.494.959-46', name: 'WALESKA REGINA SANCZKOSKI', jerseyNumber: 11 },
      ],
    },
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
