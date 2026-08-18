import jsPDF from 'jspdf';

// Types for PDF generation
interface TeamInfo {
  name: string;
  shortName: string;
  athletes: { jerseyNumber: number; name: string; position?: string; captain?: boolean; libero?: boolean }[];
  coach?: string;
}

interface SetResult {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  duration?: string;
}

export interface MatchSheetData {
  competition: string;
  category: string;
  genderCategory?: 'male' | 'female' | 'mixed';
  modality: 'indoor' | 'beach';
  format: '3-sets' | '5-sets' | '1-set' | '2-sets';
  playerFormat: '6x6' | '4x4' | '2x2' | '3x3';
  date: string;
  time: string;
  venue: string;
  court?: string;
  round: number;
  matchNumber: number;
  teamA: TeamInfo;
  teamB: TeamInfo;
  sets: SetResult[];
  finalScoreA: number;
  finalScoreB: number;
  winner?: 'A' | 'B';
  referees: { role: string; name: string }[];
  timeouts: { team: 'A' | 'B'; set: number; score: string }[];
  substitutions: { team: 'A' | 'B'; set: number; playerIn: number; playerOut: number; score: string }[];
  sanctions: { team: 'A' | 'B'; player: string; type: string; set: number }[];
  observations?: string;
  startTime?: string;
  endTime?: string;
}

const GENDER_CATEGORY_LABEL: Record<NonNullable<MatchSheetData['genderCategory']>, string> = {
  male: 'MASCULINO',
  female: 'FEMININO',
  mixed: 'MISTO',
};

// PDF dimensions and margins (A4 in mm)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// Colors (grayscale for B&W printing)
const BLACK = '#000000';
const GRAY_DARK = '#333333';
const GRAY_MEDIUM = '#666666';
const GRAY_LIGHT = '#999999';
const WHITE = '#FFFFFF';

/**
 * Generate official match sheet PDF optimized for A4 black & white printing
 */
export function generateMatchSheetPdf(data: MatchSheetData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPos = MARGIN;

  // ===== HEADER =====
  yPos = drawHeader(doc, data, yPos);
  
  // ===== MATCH INFO =====
  yPos = drawMatchInfo(doc, data, yPos);
  
  // ===== TEAMS LINEUPS =====
  yPos = drawTeamsLineups(doc, data, yPos);
  
  // ===== SCORE TABLE =====
  yPos = drawScoreTable(doc, data, yPos);
  
  // ===== TIMEOUTS =====
  yPos = drawTimeouts(doc, data, yPos);
  
  // ===== SUBSTITUTIONS =====
  yPos = drawSubstitutions(doc, data, yPos);
  
  // ===== SANCTIONS =====
  yPos = drawSanctions(doc, data, yPos);
  
  // ===== OBSERVATIONS =====
  if (data.observations) {
    yPos = drawObservations(doc, data.observations, yPos);
  }
  
  // ===== SIGNATURES =====
  yPos = drawSignatures(doc, data, yPos);
  
  // ===== FOOTER =====
  drawFooter(doc, data);

  return doc;
}

function drawHeader(doc: jsPDF, data: MatchSheetData, y: number): number {
  const modalityText = data.modality === 'indoor' ? 'VÔLEI DE QUADRA' : 'VÔLEI DE PRAIA';
  const formatText = data.format.toUpperCase().replace('-', ' ');
  
  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text('SÚMULA OFICIAL', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 6;
  
  // Modality and format
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${modalityText} - ${formatText} (${data.playerFormat})`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  
  // Competition name
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.competition.toUpperCase(), PAGE_WIDTH / 2, y, { align: 'center' });
  y += 5;
  
  // Category + Naipe
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.category, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4;
  if (data.genderCategory) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`NAIPE: ${GENDER_CATEGORY_LABEL[data.genderCategory]}`, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 4;
  }
  y += 4;
  
  // Horizontal line
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 5;
  
  return y;
}

function drawMatchInfo(doc: jsPDF, data: MatchSheetData, y: number): number {
  const boxHeight = 18;
  
  // Info box background
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight, 'F');
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight, 'S');
  
  // Grid
  const colWidth = CONTENT_WIDTH / 4;
  doc.line(MARGIN + colWidth, y, MARGIN + colWidth, y + boxHeight);
  doc.line(MARGIN + colWidth * 2, y, MARGIN + colWidth * 2, y + boxHeight);
  doc.line(MARGIN + colWidth * 3, y, MARGIN + colWidth * 3, y + boxHeight);
  
  // Labels and values
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY_MEDIUM);
  
  const labelY = y + 5;
  const valueY = y + 12;
  
  doc.text('DATA', MARGIN + 2, labelY);
  doc.text('HORÁRIO', MARGIN + colWidth + 2, labelY);
  doc.text('RODADA', MARGIN + colWidth * 2 + 2, labelY);
  doc.text('JOGO Nº', MARGIN + colWidth * 3 + 2, labelY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  
  doc.text(data.date, MARGIN + 2, valueY);
  doc.text(data.time, MARGIN + colWidth + 2, valueY);
  doc.text(String(data.round), MARGIN + colWidth * 2 + 2, valueY);
  doc.text(String(data.matchNumber), MARGIN + colWidth * 3 + 2, valueY);
  
  y += boxHeight + 3;
  
  // Venue
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY_MEDIUM);
  doc.text('LOCAL:', MARGIN, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text(data.venue + (data.court ? ` - ${data.court}` : ''), MARGIN + 15, y + 4);
  
  y += 10;
  
  return y;
}

function drawTeamsLineups(doc: jsPDF, data: MatchSheetData, y: number): number {
  const teamBoxWidth = (CONTENT_WIDTH - 4) / 2;
  const maxAthletes = Math.max(data.teamA.athletes.length, data.teamB.athletes.length);
  const lineHeight = 4.2;
  const headerRows = 2;
  const coachRow = data.teamA.coach || data.teamB.coach ? 1 : 0;
  const teamBoxHeight = 8 + headerRows * lineHeight + maxAthletes * lineHeight + (coachRow ? 4 : 1);

  const PAGE_LIMIT = PAGE_HEIGHT - 60;

  if (y + teamBoxHeight > PAGE_LIMIT) {
    doc.addPage();
    y = MARGIN;
  }

  // Team A
  drawTeamBox(doc, data.teamA, MARGIN, y, teamBoxWidth, teamBoxHeight, 'A');

  // Team B
  drawTeamBox(doc, data.teamB, MARGIN + teamBoxWidth + 4, y, teamBoxWidth, teamBoxHeight, 'B');

  return y + teamBoxHeight + 5;
}

function drawTeamBox(
  doc: jsPDF, 
  team: TeamInfo, 
  x: number, 
  y: number, 
  width: number, 
  height: number,
  label: string
): void {
  // Box
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height, 'S');
  
  // Header
  doc.setFillColor(230, 230, 230);
  doc.rect(x, y, width, 8, 'F');
  doc.line(x, y + 8, x + width, y + 8);
  
  // Team label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GRAY_MEDIUM);
  doc.text(`EQUIPE ${label}`, x + 2, y + 5.5);
  
  // Team name
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  const nameX = x + width - 2;
  doc.text(team.name.toUpperCase(), nameX, y + 5.5, { align: 'right' });
  
  // Athletes list (lista nominal completa)
  let lineY = y + 13;
  const lineHeight = 4.2;
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  // Header row
  doc.setTextColor(GRAY_MEDIUM);
  doc.text('Nº', x + 2, lineY);
  doc.text('ATLETA', x + 12, lineY);
  doc.text('POSIÇÃO', x + 67, lineY);
  lineY += lineHeight;
  
  // Athletes
  doc.setTextColor(BLACK);
  team.athletes.forEach((athlete, idx) => {
    const numStr = String(athlete.jerseyNumber).padStart(2, '0');
    let nameStr = athlete.name;
    if (athlete.captain) nameStr += ' (C)';
    if (athlete.libero) nameStr += ' (L)';
    
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(x, lineY - 3, width, lineHeight, 'F');
    }
    
    doc.text(numStr, x + 2, lineY);
    doc.text(nameStr.substring(0, 28), x + 12, lineY);
    doc.text((athlete.position ?? '').substring(0, 16), x + 67, lineY);
    lineY += lineHeight;
  });
  
  // Coach
  if (team.coach) {
    doc.setFontSize(6);
    doc.setTextColor(GRAY_MEDIUM);
    doc.text('TÉC:', x + 2, y + height - 2.5);
    doc.setTextColor(BLACK);
    doc.text(team.coach, x + 12, y + height - 2.5);
  }
}

function drawScoreTable(doc: jsPDF, data: MatchSheetData, y: number): number {
  const tableHeight = 25;
  const maxSets = data.format === '5-sets' ? 5 : data.format === '3-sets' ? 3 : data.format === '2-sets' ? 3 : 1;
  
  // Title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text('RESULTADO', MARGIN, y + 4);
  y += 7;
  
  // Table structure
  const teamColWidth = 45;
  const setColWidth = (CONTENT_WIDTH - teamColWidth - 20) / maxSets;
  const totalColWidth = 20;
  
  // Header row
  doc.setFillColor(230, 230, 230);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'S');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIPE', MARGIN + 2, y + 5);
  
  for (let i = 0; i < maxSets; i++) {
    const setX = MARGIN + teamColWidth + (i * setColWidth);
    doc.line(setX, y, setX, y + tableHeight);
    doc.text(`SET ${i + 1}`, setX + setColWidth / 2, y + 5, { align: 'center' });
  }
  
  const totalX = MARGIN + teamColWidth + (maxSets * setColWidth);
  doc.line(totalX, y, totalX, y + tableHeight);
  doc.text('SETS', totalX + totalColWidth / 2, y + 5, { align: 'center' });
  
  y += 7;
  
  // Team A row
  const rowHeight = 9;
  doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(data.teamA.shortName, MARGIN + 2, y + 6);
  
  data.sets.forEach((set, idx) => {
    const setX = MARGIN + teamColWidth + (idx * setColWidth);
    doc.setFontSize(10);
    doc.text(String(set.scoreA), setX + setColWidth / 2, y + 6.5, { align: 'center' });
  });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(data.finalScoreA), totalX + totalColWidth / 2, y + 7, { align: 'center' });
  
  y += rowHeight;
  
  // Team B row
  doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(data.teamB.shortName, MARGIN + 2, y + 6);
  
  data.sets.forEach((set, idx) => {
    const setX = MARGIN + teamColWidth + (idx * setColWidth);
    doc.setFontSize(10);
    doc.text(String(set.scoreB), setX + setColWidth / 2, y + 6.5, { align: 'center' });
  });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(data.finalScoreB), totalX + totalColWidth / 2, y + 7, { align: 'center' });
  
  y += rowHeight + 5;
  
  // Winner
  if (data.winner) {
    const winnerTeam = data.winner === 'A' ? data.teamA : data.teamB;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`VENCEDOR: ${winnerTeam.name.toUpperCase()}`, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 7;
  }
  
  return y;
}

function drawTimeouts(doc: jsPDF, data: MatchSheetData, y: number): number {
  if (data.timeouts.length === 0) return y;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text('TEMPOS TÉCNICOS', MARGIN, y + 4);
  y += 7;
  
  const boxHeight = Math.min(data.timeouts.length * 5 + 8, 25);
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight, 'S');
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  let lineY = y + 5;
  data.timeouts.slice(0, 4).forEach(timeout => {
    const team = timeout.team === 'A' ? data.teamA.shortName : data.teamB.shortName;
    doc.text(`SET ${timeout.set}: ${team} (${timeout.score})`, MARGIN + 3, lineY);
    lineY += 5;
  });
  
  return y + boxHeight + 3;
}

function drawSubstitutions(doc: jsPDF, data: MatchSheetData, y: number): number {
  if (data.substitutions.length === 0) return y;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text('SUBSTITUIÇÕES', MARGIN, y + 4);
  y += 7;
  
  const boxHeight = Math.min(data.substitutions.length * 5 + 8, 30);
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight, 'S');
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  let lineY = y + 5;
  data.substitutions.slice(0, 5).forEach(sub => {
    const team = sub.team === 'A' ? data.teamA.shortName : data.teamB.shortName;
    doc.text(`SET ${sub.set}: ${team} - #${sub.playerIn} ← #${sub.playerOut} (${sub.score})`, MARGIN + 3, lineY);
    lineY += 5;
  });
  
  return y + boxHeight + 3;
}

function drawSanctions(doc: jsPDF, data: MatchSheetData, y: number): number {
  if (data.sanctions.length === 0) return y;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text('SANÇÕES', MARGIN, y + 4);
  y += 7;
  
  const boxHeight = Math.min(data.sanctions.length * 5 + 8, 20);
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight, 'S');
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  let lineY = y + 5;
  data.sanctions.forEach(sanction => {
    const team = sanction.team === 'A' ? data.teamA.shortName : data.teamB.shortName;
    doc.text(`SET ${sanction.set}: ${team} - ${sanction.player} (${sanction.type})`, MARGIN + 3, lineY);
    lineY += 5;
  });
  
  return y + boxHeight + 3;
}

function drawObservations(doc: jsPDF, observations: string, y: number): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text('OBSERVAÇÕES', MARGIN, y + 4);
  y += 7;
  
  doc.setDrawColor(BLACK);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 15, 'S');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(observations, CONTENT_WIDTH - 6);
  doc.text(lines.slice(0, 3), MARGIN + 3, y + 5);
  
  return y + 18;
}

function drawSignatures(doc: jsPDF, data: MatchSheetData, y: number): number {
  // Check if we need a new page
  if (y > PAGE_HEIGHT - 50) {
    doc.addPage();
    y = MARGIN;
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLACK);
  doc.text('ASSINATURAS', MARGIN, y + 4);
  y += 8;
  
  const sigBoxWidth = (CONTENT_WIDTH - 8) / 3;
  const sigBoxHeight = 18;
  
  // Referee signatures
  const refereeRoles = ['1º Árbitro', '2º Árbitro', 'Apontador'];
  refereeRoles.forEach((role, idx) => {
    const x = MARGIN + (idx * (sigBoxWidth + 4));
    doc.setDrawColor(BLACK);
    doc.setLineWidth(0.3);
    doc.rect(x, y, sigBoxWidth, sigBoxHeight, 'S');
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY_MEDIUM);
    doc.text(role.toUpperCase(), x + sigBoxWidth / 2, y + 4, { align: 'center' });
    
    const referee = data.referees.find(r => r.role === role);
    if (referee) {
      doc.setFontSize(7);
      doc.setTextColor(BLACK);
      doc.text(referee.name, x + sigBoxWidth / 2, y + sigBoxHeight - 3, { align: 'center' });
    }
  });
  
  y += sigBoxHeight + 3;
  
  // Team signatures
  const teamRoles = [
    { label: `TÉC. ${data.teamA.shortName}`, key: 'coach-a' },
    { label: `TÉC. ${data.teamB.shortName}`, key: 'coach-b' },
    { label: `CAP. ${data.teamA.shortName}`, key: 'captain-a' },
    { label: `CAP. ${data.teamB.shortName}`, key: 'captain-b' },
  ];
  
  const teamSigWidth = (CONTENT_WIDTH - 12) / 4;
  
  teamRoles.forEach((role, idx) => {
    const x = MARGIN + (idx * (teamSigWidth + 4));
    doc.setDrawColor(BLACK);
    doc.setLineWidth(0.3);
    doc.rect(x, y, teamSigWidth, sigBoxHeight, 'S');
    
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY_MEDIUM);
    doc.text(role.label, x + teamSigWidth / 2, y + 4, { align: 'center' });
  });
  
  y += sigBoxHeight + 5;
  
  return y;
}

function drawFooter(doc: jsPDF, data: MatchSheetData): void {
  const footerY = PAGE_HEIGHT - 8;
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY_LIGHT);
  
  // Match timing
  if (data.startTime && data.endTime) {
    doc.text(`Início: ${data.startTime} | Término: ${data.endTime}`, MARGIN, footerY);
  }
  
  // Generation date
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  doc.text(`Gerado em: ${dateStr}`, PAGE_WIDTH - MARGIN, footerY, { align: 'right' });
  
  // Center: System name
  doc.text('VolleyPro - Sistema de Gestão de Competições', PAGE_WIDTH / 2, footerY, { align: 'center' });
}

/**
 * Download the PDF
 */
export function downloadMatchSheetPdf(data: MatchSheetData, filename?: string): void {
  const doc = generateMatchSheetPdf(data);
  const defaultFilename = `sumula_${data.teamA.shortName}_vs_${data.teamB.shortName}_${data.date.replace(/\//g, '-')}.pdf`;
  doc.save(filename || defaultFilename);
}

/**
 * Open PDF in new tab for preview
 */
export function previewMatchSheetPdf(data: MatchSheetData): void {
  const doc = generateMatchSheetPdf(data);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}

/**
 * Gera um PDF único com uma súmula por página para todas as partidas
 * (ex.: "Baixar Súmulas de Todas as Partidas").
 */
export function generateMatchSheetsBatchPdf(
  matches: MatchSheetData[],
  competitionName: string,
): jsPDF {
  if (matches.length === 0) throw new Error('Nenhuma partida para gerar.');
  const doc = generateMatchSheetPdf(matches[0]);
  for (let i = 1; i < matches.length; i++) {
    doc.addPage();
    let y = MARGIN;
    y = drawHeader(doc, matches[i], y);
    y = drawMatchInfo(doc, matches[i], y);
    y = drawTeamsLineups(doc, matches[i], y);
    y = drawScoreTable(doc, matches[i], y);
    y = drawTimeouts(doc, matches[i], y);
    y = drawSubstitutions(doc, matches[i], y);
    y = drawSanctions(doc, matches[i], y);
    if (matches[i].observations) {
      y = drawObservations(doc, matches[i].observations!, y);
    }
    y = drawSignatures(doc, matches[i], y);
    drawFooter(doc, matches[i]);
  }
  return doc;
}

export function downloadMatchSheetsBatchPdf(matches: MatchSheetData[], competitionName: string): void {
  const doc = generateMatchSheetsBatchPdf(matches, competitionName);
  const safeName = competitionName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  doc.save(`sumulas_${safeName || 'competicao'}.pdf`);
}
