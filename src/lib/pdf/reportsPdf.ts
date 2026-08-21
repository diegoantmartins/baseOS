// Central de Relatórios do VolleyPro — PDFs limpos para impressão A4.
//
// Relatórios:
//  1. Boletim / Tabela Geral de Jogos (horários, locais, quadras, confrontos, status)
//  2. Relatório de Classificação por grupos (critérios FIVB/CBV)
//  3. Relação Nominal das Equipes (elenco, números, funções e documentos)

import jsPDF from 'jspdf';
import type { TeamStandingResult } from '@/services/standingsService';

// ============================================================================
// Tipos de entrada
// ============================================================================

export type MatchBoletimRow = {
  matchNumber: number;
  round: number;
  phase?: string;
  groupName?: string;
  date: string;
  time: string;
  venue: string;
  court?: string;
  teamAName: string;
  teamBName: string;
  scoreA?: number;
  scoreB?: number;
  statusLabel: string;
};

export type StandingsReportGroup = {
  groupName: string;
  standings: TeamStandingResult[];
};

export type RosterReportAthlete = {
  jerseyNumber?: number;
  name: string;
  position: string;
  documentNumber?: string;
  isCaptain: boolean;
  isLibero: boolean;
};

export type RosterReportTeam = {
  name: string;
  shortName: string;
  coach?: string;
  logoUrl?: string;
  athletes: RosterReportAthlete[];
};

// ============================================================================
// Constantes de layout (A4 em mm, P&B)
// ============================================================================

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 12;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 8;
const BLACK: [number, number, number] = [0, 0, 0];
const GRAY_DARK: [number, number, number] = [51, 51, 51];
const GRAY_MEDIUM: [number, number, number] = [102, 102, 102];
const GRAY_LIGHT: [number, number, number] = [153, 153, 153];

function pageBreakIfNeeded(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - 25) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(text.toUpperCase(), MARGIN, y);
  doc.setDrawColor(...GRAY_DARK);
  doc.setLineWidth(0.4);
  const lineY = y + 2;
  doc.line(MARGIN, lineY, PAGE_WIDTH - MARGIN, lineY);
  return lineY + 5;
}

function docHeader(doc: jsPDF, orgName: string, competitionName: string, reportTitle: string): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY_MEDIUM);
  doc.text(orgName.toUpperCase(), PAGE_WIDTH / 2, MARGIN, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text(competitionName.toUpperCase(), PAGE_WIDTH / 2, MARGIN + 7, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(reportTitle, PAGE_WIDTH / 2, MARGIN + 12, { align: 'center' });

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, MARGIN + 15, PAGE_WIDTH - MARGIN, MARGIN + 15);
  return MARGIN + 20;
}

function footer(doc: jsPDF, orgName: string): void {
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_LIGHT);
  doc.text(orgName, PAGE_WIDTH / 2, FOOTER_Y, { align: 'center' });
  const now = new Date();
  doc.text(
    `Gerado em: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`,
    PAGE_WIDTH - MARGIN,
    FOOTER_Y,
    { align: 'right' },
  );
}

function statusColor(statusLabel: string): [number, number, number] {
  if (statusLabel.toUpperCase().includes('FINALIZ') || statusLabel.toUpperCase().includes('REALIZ')) return BLACK;
  return GRAY_MEDIUM;
}

// ============================================================================
// 1. Boletim / Tabela Geral de Jogos
// ============================================================================

export function generateMatchesBoletimPdf(
  rows: MatchBoletimRow[],
  competitionName: string,
  orgName = 'VolleyPro',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(doc, orgName, competitionName, 'BOLETIM GERAL DE JOGOS');

  const col = {
    num: 8,
    round: 10,
    phase: 24,
    teamA: 32,
    scoreA: 9,
    scoreB: 9,
    teamB: 32,
    date: 18,
    time: 11,
    venue: 28,
    court: 18,
    status: 17,
  };
  const total = col.num + col.round + col.phase + col.teamA + col.scoreA + col.scoreB + col.teamB + col.date + col.time + col.venue + col.court + col.status;
  void total;

  // Header da tabela
  const headerY = y;
  doc.setFillColor(230, 230, 230);
  doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6, 'F');
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6, 'S');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY_DARK);
  const headers: Array<[string, number, number]> = [
    ['JOGO', col.num, 0],
    ['ROD', col.round, 0],
    ['FASE/Grupo', col.phase, 0],
    ['EQUIPE A', col.teamA, 0],
    ['SET A', col.scoreA, 1],
    ['SET B', col.scoreB, 1],
    ['EQUIPE B', col.teamB, 0],
    ['DATA', col.date, 0],
    ['HORA', col.time, 0],
    ['LOCAL', col.venue, 0],
    ['QUADRA', col.court, 0],
    ['STATUS', col.status, 0],
  ];
  let x = MARGIN;
  const xCols: number[] = [];
  for (const [label, width, align] of headers) {
    xCols.push(x);
    doc.text(label, x + (align === 1 ? width / 2 : 1.5), headerY, { align: align === 1 ? 'center' : 'left' });
    x += width;
  }
  void xCols;

  y = headerY + 3;

  if (rows.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_MEDIUM);
    doc.text('Nenhum jogo cadastrado.', MARGIN, y + 6);
    footer(doc, orgName);
    return doc;
  }

  const rowHeight = 5.2;
  doc.setFontSize(6.8);
  rows.forEach((row, idx) => {
    y = pageBreakIfNeeded(doc, y, rowHeight + 1);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(MARGIN, y - 3.8, CONTENT_WIDTH, rowHeight, 'F');
    }
    doc.setDrawColor(...GRAY_MEDIUM);
    doc.line(MARGIN, y - 3.8, PAGE_WIDTH - MARGIN, y - 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_DARK);

    let cx = MARGIN;
    doc.text(String(row.matchNumber), cx + 1.5, y);
    cx += col.num;
    doc.text(String(row.round), cx + 1.5, y);
    cx += col.round;
    const phaseLabel = [row.phase, row.groupName].filter(Boolean).join(' · ');
    doc.text(phaseLabel.substring(0, 22), cx + 1.5, y);
    cx += col.phase;
    doc.setFont('helvetica', 'bold');
    doc.text(row.teamAName.substring(0, 22), cx + 1.5, y);
    cx += col.teamA;
    doc.setFont('helvetica', 'bold');
    doc.text(row.scoreA !== undefined ? String(row.scoreA) : '', cx + col.scoreA / 2, y, { align: 'center' });
    cx += col.scoreA;
    doc.text(row.scoreB !== undefined ? String(row.scoreB) : '', cx + col.scoreB / 2, y, { align: 'center' });
    cx += col.scoreB;
    doc.setFont('helvetica', 'bold');
    doc.text(row.teamBName.substring(0, 22), cx + 1.5, y);
    cx += col.teamB;
    doc.setFont('helvetica', 'normal');
    doc.text(row.date, cx + 1.5, y);
    cx += col.date;
    doc.text(row.time, cx + 1.5, y);
    cx += col.time;
    doc.text(row.venue.substring(0, 18), cx + 1.5, y);
    cx += col.venue;
    doc.text((row.court ?? '').substring(0, 13), cx + 1.5, y);
    cx += col.court;
    doc.setTextColor(...statusColor(row.statusLabel));
    doc.setFont('helvetica', 'bold');
    doc.text(row.statusLabel.substring(0, 11), cx + 1.5, y);
    y += rowHeight;
  });

  // Fechamento da tabela
  doc.setDrawColor(...GRAY_MEDIUM);
  doc.line(MARGIN, y - 3.8, PAGE_WIDTH - MARGIN, y - 3.8);

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 2. Relatório de Classificação (por grupos)
// ============================================================================

export function generateStandingsReportPdf(
  groups: StandingsReportGroup[],
  competitionName: string,
  orgName = 'VolleyPro',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(doc, orgName, competitionName, 'RELATÓRIO DE CLASSIFICAÇÃO');

  if (groups.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_MEDIUM);
    doc.text('Sem partidas finalizadas nesta competição.', MARGIN, y + 6);
    footer(doc, orgName);
    return doc;
  }

  const col = { pos: 8, team: 56, j: 8, v: 8, d: 8, sets: 18, points: 18, pts: 10 };
  const colWidths = [col.pos, col.team, col.j, col.v, col.d, col.sets, col.points, col.pts];

  for (const group of groups) {
    y = pageBreakIfNeeded(doc, y, 30);
    y = sectionTitle(doc, group.groupName, y);

    const headerY = y;
    doc.setFillColor(230, 230, 230);
    doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6, 'F');
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6, 'S');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_DARK);
    const labels = ['#', 'EQUIPE', 'J', 'V', 'D', 'SETS (V-D)', 'PONTOS (M-S)', 'PTS'];
    let hx = MARGIN;
    labels.forEach((label, i) => {
      doc.text(label, hx + (i === 0 || i >= 2 ? colWidths[i] / 2 : 1.5), headerY, {
        align: i === 0 || i >= 2 ? 'center' : 'left',
      });
      hx += colWidths[i];
    });
    y = headerY + 3;

    const rowHeight = 5.4;
    group.standings.forEach((s, idx) => {
      y = pageBreakIfNeeded(doc, y, rowHeight + 1);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 248, 248);
        doc.rect(MARGIN, y - 4, CONTENT_WIDTH, rowHeight, 'F');
      }
      doc.setDrawColor(...GRAY_MEDIUM);
      doc.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4);
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      let cx = MARGIN;
      doc.text(String(s.position), cx + col.pos / 2, y, { align: 'center' });
      cx += col.pos;
      doc.setFont('helvetica', 'bold');
      doc.text(s.teamName.substring(0, 34), cx + 1.5, y);
      cx += col.team;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_DARK);
      const centered = [col.j, col.v, col.d, col.pts];
      const values = [String(s.matchesPlayed), String(s.matchesWon), String(s.matchesLost), String(s.competitionPoints)];
      centered.forEach((width, i) => {
        doc.text(values[i], cx + width / 2, y, { align: 'center' });
        cx += width;
      });
      doc.text(`${s.setsWon}-${s.setsLost}`, cx + col.sets / 2, y, { align: 'center' });
      cx += col.sets;
      doc.text(`${s.pointsWon}-${s.pointsLost}`, cx + col.points / 2, y, { align: 'center' });
      cx += col.points;
      y += rowHeight;
    });
    doc.setDrawColor(...GRAY_MEDIUM);
    doc.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4);
    y += 4;
  }

  // Critérios de desempate
  y = pageBreakIfNeeded(doc, y, 30);
  y = sectionTitle(doc, 'Critérios de desempate (FIVB/CBV)', y);
  const criteria = [
    '1º Maior número de pontos (3 pts vitória 3-0/3-1; 2 pts vitória 3-2; 1 pt derrota 2-3; 0 pt derrota 0-3/1-3)',
    '2º Confronto direto (empate entre 2 equipes)',
    '3º Set average (sets vencidos ÷ sets perdidos)',
    '4º Pontos average (pontos marcados ÷ pontos sofridos)',
    '5º Saldo de pontos (marcados − sofridos)',
    '6º Maior número de pontos marcados',
    '7º Sorteio',
  ];
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_DARK);
  criteria.forEach(c => {
    y = pageBreakIfNeeded(doc, y, 5);
    doc.text(c, MARGIN + 2, y);
    y += 4.6;
  });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 3. Relação Nominal das Equipes (elenco com números e documentos)
// ============================================================================

export function generateTeamRosterReportPdf(
  teams: RosterReportTeam[],
  competitionName: string,
  orgName = 'VolleyPro',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(doc, orgName, competitionName, 'RELAÇÃO NOMINAL DAS EQUIPES');

  if (teams.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_MEDIUM);
    doc.text('Nenhuma equipe inscrita.', MARGIN, y + 6);
    footer(doc, orgName);
    return doc;
  }

  for (const team of teams) {
    // Cabeçalho da equipe
    y = pageBreakIfNeeded(doc, y, 26);
    const headerBoxY = y;
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN, headerBoxY - 4, CONTENT_WIDTH, 9, 'F');
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.4);
    doc.rect(MARGIN, headerBoxY - 4, CONTENT_WIDTH, 9, 'S');

    if (team.logoUrl) {
      try {
        if (team.logoUrl.startsWith('data:image/svg+xml')) {
          const svg = decodeURIComponent(team.logoUrl.replace(/^data:image\/svg\+xml;utf8,?/, ''));
          doc.addSvgAsImage(svg, MARGIN + 1, headerBoxY - 3, 7, 7);
        } else {
          const format = team.logoUrl.startsWith('data:image/png') ? 'PNG' : team.logoUrl.startsWith('data:image/jpeg') ? 'JPEG' : undefined;
          doc.addImage(team.logoUrl, format, MARGIN + 1, headerBoxY - 3, 7, 7);
        }
      } catch {
        // segue sem logo
      }
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(team.name.toUpperCase(), MARGIN + 10, headerBoxY);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_MEDIUM);
    doc.text(`SIGLA: ${team.shortName}`, MARGIN + 10, headerBoxY + 3.5);
    if (team.coach) {
      doc.text(`TÉCNICO: ${team.coach}`, PAGE_WIDTH - MARGIN, headerBoxY + 3.5, { align: 'right' });
    }
    y = headerBoxY + 6.5;

    // Tabela de atletas
    const col = { num: 10, name: 70, position: 38, role: 24, doc: 48 };
    const headerY = y;
    doc.setFillColor(230, 230, 230);
    doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6, 'F');
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6, 'S');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_DARK);
    const labels: Array<[string, number, number]> = [
      ['Nº', col.num, 1],
      ['NOME COMPLETO', col.name, 0],
      ['POSIÇÃO', col.position, 0],
      ['FUNÇÃO', col.role, 0],
      ['DOCUMENTO', col.doc, 0],
    ];
    let hx = MARGIN;
    for (const [label, width, align] of labels) {
      doc.text(label, hx + (align === 1 ? width / 2 : 1.5), headerY, { align: align === 1 ? 'center' : 'left' });
      hx += width;
    }
    y = headerY + 3;

    const rowHeight = 5.2;
    if (team.athletes.length === 0) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_MEDIUM);
      doc.text('Nenhum atleta inscrito.', MARGIN + 2, y);
      y += rowHeight;
    } else {
      team.athletes.forEach((a, idx) => {
        y = pageBreakIfNeeded(doc, y, rowHeight + 1);
        if (idx % 2 === 1) {
          doc.setFillColor(248, 248, 248);
          doc.rect(MARGIN, y - 4, CONTENT_WIDTH, rowHeight, 'F');
        }
        doc.setDrawColor(...GRAY_MEDIUM);
        doc.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4);
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_DARK);
        let cx = MARGIN;
        doc.setFont('helvetica', 'bold');
        doc.text(a.jerseyNumber !== undefined ? String(a.jerseyNumber).padStart(2, '0') : '--', cx + col.num / 2, y, { align: 'center' });
        cx += col.num;
        doc.setFont('helvetica', 'bold');
        doc.text(a.name.substring(0, 44), cx + 1.5, y);
        cx += col.name;
        doc.setFont('helvetica', 'normal');
        doc.text(a.position.substring(0, 24), cx + 1.5, y);
        cx += col.position;
        const role = a.isCaptain ? 'Capitã(o)' : a.isLibero ? 'Líbero' : '—';
        doc.text(role, cx + 1.5, y);
        cx += col.role;
        doc.text((a.documentNumber ?? '—').substring(0, 28), cx + 1.5, y);
        y += rowHeight;
      });
    }
    doc.setDrawColor(...GRAY_MEDIUM);
    doc.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4);
    y += 6;
  }

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// Helpers de download / preview / impressão
// ============================================================================

export function downloadReportsPdf(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

export function previewReportsPdf(doc: jsPDF): void {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function printReportsPdf(doc: jsPDF): void {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      try {
        win.focus();
        win.print();
      } catch {
        // O usuário pode imprimir pela própria janela do PDF.
      }
    };
  }
}