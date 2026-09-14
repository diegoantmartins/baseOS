// ============================================================================
// Central de Relatórios do BaseOS — PDFs Editoriais de Alta Definição
//
// Relatórios:
//  1. Boletim Geral de Jogos (confrontos com logos dos times, horários, locais, status)
//  2. Relatório de Classificação por grupos (critérios FIVB/CBV)
//  3. Relação Nominal das Equipes (1 EQUIPE DEDICADA POR PÁGINA A4 com logo, elenco e comissão)
//  4. Quadro de Honra & Pódio Final (Encerramento Oficial com medalhas Ouro, Prata, Bronze)
// ============================================================================

import jsPDF from 'jspdf';
import type { TeamStandingResult } from '@/services/standingsService';
import type { MvpReportData, DelegationReportData, MatchStatisticsReportData } from './types';

// ============================================================================
// Tipos de entrada
// ============================================================================

export type MatchBoletimRow = {
  matchNumber: number;
  round: number;
  phase?: string | undefined;
  groupName?: string | undefined;
  date: string;
  time: string;
  venue: string;
  court?: string | undefined;
  teamAName: string;
  teamAShort?: string | undefined;
  teamALogo?: string | undefined;
  teamBName: string;
  teamBShort?: string | undefined;
  teamBLogo?: string | undefined;
  scoreA?: number | undefined;
  scoreB?: number | undefined;
  statusLabel: string;
  highlightAthleteName?: string | undefined;
  highlightTeamShort?: string | undefined;
};

export type StandingsReportGroup = {
  groupName: string;
  standings: TeamStandingResult[];
};

export type RosterReportAthlete = {
  jerseyNumber?: number | undefined;
  name: string;
  position: string;
  documentNumber?: string | undefined;
  isCaptain: boolean;
  isLibero: boolean;
};

export type RosterReportTeam = {
  name: string;
  shortName: string;
  coach?: string | undefined;
  assistantCoach?: string | undefined;
  medicalStaff?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  modality?: string | undefined;
  logoUrl?: string | undefined;
  athletes: RosterReportAthlete[];
};

export type PodiumReportData = {
  competitionName: string;
  categoryName?: string;
  orgName?: string;
  champion?: { name: string; shortName?: string; logoUrl?: string };
  runnerUp?: { name: string; shortName?: string; logoUrl?: string };
  third?: { name: string; shortName?: string; logoUrl?: string };
  fourth?: { name: string; shortName?: string; logoUrl?: string };
};

export type RefereesScheduleRow = {
  matchNumber: number;
  round: number;
  phase?: string;
  groupName?: string;
  date: string;
  time: string;
  venue: string;
  court?: string;
  teamAName: string;
  teamAShort?: string;
  teamALogo?: string;
  teamBName: string;
  teamBShort?: string;
  teamBLogo?: string;
  statusLabel: string;
  firstReferee: string;
  secondReferee: string;
  scorer: string;
  assistantScorer: string;
  lineJudges: string[];
  hasOfficials: boolean;
};

export type DailyScheduleRow = {
  matchId: string;
  matchNumber: number;
  round: number;
  phase?: string;
  groupName?: string;
  date: string;
  time: string;
  scheduledTime: string;
  venue: string;
  court?: string;
  teamAName: string;
  teamAShort?: string;
  teamALogo?: string;
  teamBName: string;
  teamBShort?: string;
  teamBLogo?: string;
  status: string;
  statusLabel: string;
  scoreA?: number;
  scoreB?: number;
  hasConflict?: boolean;
  conflictMessage?: string;
};

/**
 * Normaliza e extrai os oficiais designados para uma partida a partir do array de referees.
 */
export function parseMatchReferees(referees: Array<{ role?: string; name?: string }> = []): {
  firstReferee: string;
  secondReferee: string;
  scorer: string;
  assistantScorer: string;
  lineJudges: string[];
  otherOfficials: Array<{ role: string; name: string }>;
  hasOfficials: boolean;
} {
  let firstReferee = '—';
  let secondReferee = '—';
  let scorer = '—';
  let assistantScorer = '—';
  const lineJudges: string[] = [];
  const otherOfficials: Array<{ role: string; name: string }> = [];

  for (const ref of referees) {
    const name = ref.name?.trim();
    if (!name) continue;
    const role = (ref.role || '').toLowerCase();

    if (/1º|primeiro|1st|principal/i.test(role)) {
      firstReferee = name;
    } else if (/2º|segundo|2nd|auxiliar/i.test(role)) {
      secondReferee = name;
    } else if (/apontador assistente|anotador assistente|cronometrista|assistant scorer|timekeeper/i.test(role)) {
      assistantScorer = name;
    } else if (/apontador|anotador|scorer|mesa/i.test(role)) {
      scorer = name;
    } else if (/linha|line/i.test(role)) {
      lineJudges.push(name);
    } else {
      otherOfficials.push({ role: ref.role || 'Oficial', name });
    }
  }

  const hasOfficials =
    firstReferee !== '—' ||
    secondReferee !== '—' ||
    scorer !== '—' ||
    assistantScorer !== '—' ||
    lineJudges.length > 0 ||
    otherOfficials.length > 0;

  return {
    firstReferee,
    secondReferee,
    scorer,
    assistantScorer,
    lineJudges,
    otherOfficials,
    hasOfficials,
  };
}


// ============================================================================
// Constantes e Paleta Editorial
// ============================================================================

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 12;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 8;

const NAVY: [number, number, number] = [15, 41, 66];
const NAVY_LIGHT: [number, number, number] = [235, 245, 255];
const GOLD: [number, number, number] = [217, 119, 6];
const GOLD_LIGHT: [number, number, number] = [254, 243, 199];
const SILVER: [number, number, number] = [100, 116, 139];
const SILVER_LIGHT: [number, number, number] = [241, 245, 249];
const BRONZE: [number, number, number] = [180, 83, 9];
const BRONZE_LIGHT: [number, number, number] = [255, 237, 213];

const TEXT_DARK: [number, number, number] = [15, 23, 42];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const BORDER_COLOR: [number, number, number] = [203, 213, 225];
const ZEBRA_BG: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];

// ============================================================================
// Helpers de Desenho e Layout
// ============================================================================

function pageBreakIfNeeded(doc: jsPDF, y: number, needed: number, orgName: string): number {
  if (y + needed > PAGE_HEIGHT - 18) {
    doc.addPage();
    return docHeader(doc, orgName, '', '', true);
  }
  return y;
}

function safeDrawImage(
  doc: jsPDF,
  imgData: string | undefined,
  fallbackText: string,
  x: number,
  y: number,
  size: number,
): void {
  if (imgData && imgData.startsWith('data:image')) {
    try {
      const format = imgData.startsWith('data:image/png')
        ? 'PNG'
        : imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')
          ? 'JPEG'
          : undefined;
      doc.addImage(imgData, format, x, y, size, size);
      return;
    } catch {
      // fallback para badge abaixo
    }
  }

  // Fallback monogram badge
  doc.setFillColor(...NAVY_LIGHT);
  doc.roundedRect(x, y, size, size, 1, 1, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, size, size, 1, 1, 'S');

  doc.setFontSize(size > 10 ? 8 : 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  const initials = fallbackText.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase() || 'VOL';
  doc.text(initials, x + size / 2, y + size / 2 + (size > 10 ? 2.5 : 2), { align: 'center' });
}

function docHeader(
  doc: jsPDF,
  orgName: string,
  competitionName: string,
  reportTitle: string,
  isSubsequentPage = false,
): number {
  // Top Banner Dark Navy
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, isSubsequentPage ? 8 : 16, 'F');

  doc.setFontSize(isSubsequentPage ? 8 : 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('BASEOS', MARGIN + 4, MARGIN + (isSubsequentPage ? 5.5 : 7));

  doc.setFontSize(isSubsequentPage ? 7 : 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253);
  doc.text('SPORTS INTELLIGENCE · SISTEMA OFICIAL', MARGIN + (isSubsequentPage ? 24 : 26), MARGIN + (isSubsequentPage ? 5.5 : 7));

  if (!isSubsequentPage) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(224, 242, 254);
    doc.text(orgName.toUpperCase(), PAGE_WIDTH - MARGIN - 4, MARGIN + 7, { align: 'right' });

    // Faixa branca com título
    doc.setFillColor(...WHITE);
    doc.rect(MARGIN, MARGIN + 16, CONTENT_WIDTH, 14, 'F');
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, MARGIN + 16, CONTENT_WIDTH, 14, 'S');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(competitionName.toUpperCase(), MARGIN + 4, MARGIN + 22.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(reportTitle.toUpperCase(), MARGIN + 4, MARGIN + 27);

    return MARGIN + 35;
  }

  return MARGIN + 12;
}

function footer(doc: jsPDF, orgName: string): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, FOOTER_Y - 3, PAGE_WIDTH - MARGIN, FOOTER_Y - 3);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`BaseOS · Sports Intelligence (${orgName})`, MARGIN, FOOTER_Y + 1);

    const now = new Date();
    const dateStr = `Emissão: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, PAGE_WIDTH / 2, FOOTER_Y + 1, { align: 'center' });

    doc.text(`Página ${i} de ${pageCount}`, PAGE_WIDTH - MARGIN, FOOTER_Y + 1, { align: 'right' });
  }
}

// ============================================================================
// 1. Boletim / Tabela Geral de Jogos com Logos
// ============================================================================

export function generateMatchesBoletimPdf(
  rows: MatchBoletimRow[],
  competitionName: string,
  orgName = 'BaseOS',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(doc, orgName, competitionName, 'Boletim Geral de Jogos e Confrontos');

  if (rows.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Nenhum jogo cadastrado nesta competição.', MARGIN + 2, y + 6);
    footer(doc, orgName);
    return doc;
  }

  // Larguras das colunas
  const col = {
    game: 14,      // J.01 · R1
    phase: 22,     // Fase / Grupo
    matchup: 78,   // [Logo] Time A (Sets) vs (Sets) Time B [Logo]
    dateTime: 26,  // 22/08 · 14:20
    venue: 26,     // Ginásio / Quadra
    status: 20,    // Badge Status
  };

  const headerY = y;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6.5, 'F');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);

  doc.text('JOGO', MARGIN + 2, headerY - 0.5);
  doc.text('FASE / GRUPO', MARGIN + col.game + 2, headerY - 0.5);
  doc.text('CONFRONTO DAS EQUIPES', MARGIN + col.game + col.phase + col.matchup / 2, headerY - 0.5, { align: 'center' });
  doc.text('DATA / HORA', MARGIN + col.game + col.phase + col.matchup + 2, headerY - 0.5);
  doc.text('GINÁSIO / QUADRA', MARGIN + col.game + col.phase + col.matchup + col.dateTime + 2, headerY - 0.5);
  doc.text('STATUS', MARGIN + col.game + col.phase + col.matchup + col.dateTime + col.venue + col.status / 2, headerY - 0.5, { align: 'center' });

  y = headerY + 4;

  const rowHeight = 9.5;
  rows.forEach((row, idx) => {
    y = pageBreakIfNeeded(doc, y, rowHeight + 2, orgName);

    // Linha zebrada
    if (idx % 2 === 1) {
      doc.setFillColor(...ZEBRA_BG);
      doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'F');
    }
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'S');

    // 1. Jogo e Rodada
    let cx = MARGIN;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`J.${String(row.matchNumber).padStart(2, '0')}`, cx + 2, y + 0.5);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Rod. ${row.round}`, cx + 2, y + 4.5);
    cx += col.game;

    // 2. Fase / Grupo
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    const cleanPhase = (row.groupName || row.phase || 'Geral').substring(0, 15);
    doc.text(cleanPhase, cx + 2, y + 1.5);
    cx += col.phase;

    // 3. Confronto com Logos (Equipe A x Equipe B)
    const matchBoxStartX = cx;
    const teamLogoSize = 6;

    // Logo Team A
    safeDrawImage(doc, row.teamALogo, row.teamAShort || row.teamAName, matchBoxStartX + 2, y - 2, teamLogoSize);

    // Nome Team A
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    const teamANameTrunc = row.teamAName.substring(0, 16);
    doc.text(teamANameTrunc, matchBoxStartX + 9, y + 1.5);

    // Placar central
    const centerX = matchBoxStartX + col.matchup / 2;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(centerX - 8, y - 2.5, 16, 6, 1, 1, 'F');
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.roundedRect(centerX - 8, y - 2.5, 16, 6, 1, 1, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    const scoreStr = row.scoreA !== undefined && row.scoreB !== undefined ? `${row.scoreA} x ${row.scoreB}` : 'VS';
    doc.text(scoreStr, centerX, y + 1.5, { align: 'center' });

    // Nome Team B
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    const teamBNameTrunc = row.teamBName.substring(0, 16);
    doc.text(teamBNameTrunc, matchBoxStartX + col.matchup - 9, y + 1.5, { align: 'right' });

    // Logo Team B
    safeDrawImage(doc, row.teamBLogo, row.teamBShort || row.teamBName, matchBoxStartX + col.matchup - 8, y - 2, teamLogoSize);

    cx += col.matchup;

    // 4. Data e Hora
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    const dateFormatted = row.date.includes('-') ? row.date.split('-').reverse().join('/') : row.date;
    doc.text(dateFormatted, cx + 2, y + 0.5);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(row.time || '--:--', cx + 2, y + 4.5);
    cx += col.dateTime;

    // 5. Local e Quadra
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(row.venue.substring(0, 18), cx + 2, y + 0.5);
    if (row.court) {
      doc.setFontSize(6.5);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(row.court.substring(0, 18), cx + 2, y + 4.5);
    }
    cx += col.venue;

    // 6. Status Badge
    const statusX = cx + 2;
    const isFinished = row.statusLabel.toLowerCase().includes('finaliz') || row.statusLabel.toLowerCase().includes('homolog');
    const isLive = row.statusLabel.toLowerCase().includes('vivo');

    if (isFinished) {
      doc.setFillColor(220, 252, 231);
      doc.setTextColor(22, 101, 52);
    } else if (isLive) {
      doc.setFillColor(254, 226, 226);
      doc.setTextColor(153, 27, 27);
    } else {
      doc.setFillColor(241, 245, 249);
      doc.setTextColor(71, 85, 105);
    }
    doc.roundedRect(statusX, y - 2.5, col.status - 4, 6, 1, 1, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(row.statusLabel.toUpperCase().substring(0, 10), statusX + (col.status - 4) / 2, y + 1.5, { align: 'center' });

    y += rowHeight;
  });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 2. Relatório de Classificação por Grupos
// ============================================================================

export function generateStandingsReportPdf(
  groups: StandingsReportGroup[],
  competitionName: string,
  orgName = 'BaseOS',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(doc, orgName, competitionName, 'Relatório Oficial de Classificação');

  if (groups.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Nenhum dado de classificação disponível.', MARGIN + 2, y + 6);
    footer(doc, orgName);
    return doc;
  }

  const col = { pos: 10, team: 72, j: 10, v: 10, d: 10, sets: 22, points: 24, pts: 18 };
  const colWidths = [col.pos, col.team, col.j, col.v, col.d, col.sets, col.points, col.pts];

  for (const group of groups) {
    y = pageBreakIfNeeded(doc, y, 35, orgName);

    // Header da Chave
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 7, 1, 1, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(group.groupName.toUpperCase(), MARGIN + 4, y + 0.8);
    y += 5.5;

    // Header da Tabela
    const headerY = y;
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, headerY - 3.5, CONTENT_WIDTH, 6, 'F');
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, headerY - 3.5, CONTENT_WIDTH, 6, 'S');

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    const labels = ['#', 'EQUIPE', 'J', 'V', 'D', 'SETS (V-D)', 'PONTOS (M-S)', 'PONTOS'];
    let hx = MARGIN;
    labels.forEach((label, i) => {
      doc.text(label, hx + (i === 0 || i >= 2 ? colWidths[i] / 2 : 2), headerY + 0.5, {
        align: i === 0 || i >= 2 ? 'center' : 'left',
      });
      hx += colWidths[i];
    });
    y = headerY + 4;

    const rowHeight = 6.8;
    group.standings.forEach((s, idx) => {
      y = pageBreakIfNeeded(doc, y, rowHeight + 2, orgName);

      const isClassified = idx < 2; // G-2 classificados
      if (isClassified) {
        doc.setFillColor(240, 253, 250);
        doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'F');
        // Indicador lateral verde
        doc.setFillColor(13, 148, 136);
        doc.rect(MARGIN, y - 3.5, 1.5, rowHeight, 'F');
      } else if (idx % 2 === 1) {
        doc.setFillColor(...ZEBRA_BG);
        doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'F');
      }

      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.2);
      doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'S');

      let cx = MARGIN;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`${s.position}º`, cx + col.pos / 2, y + 1, { align: 'center' });
      cx += col.pos;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT_DARK);
      doc.text(s.teamName.substring(0, 36), cx + 2, y + 1);
      cx += col.team;

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);

      doc.text(String(s.matchesPlayed), cx + col.j / 2, y + 1, { align: 'center' });
      cx += col.j;
      doc.text(String(s.matchesWon), cx + col.v / 2, y + 1, { align: 'center' });
      cx += col.v;
      doc.text(String(s.matchesLost), cx + col.d / 2, y + 1, { align: 'center' });
      cx += col.d;

      doc.text(`${s.setsWon}-${s.setsLost}`, cx + col.sets / 2, y + 1, { align: 'center' });
      cx += col.sets;

      doc.text(`${s.pointsWon}-${s.pointsLost}`, cx + col.points / 2, y + 1, { align: 'center' });
      cx += col.points;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(String(s.competitionPoints), cx + col.pts / 2, y + 1, { align: 'center' });
      cx += col.pts;

      y += rowHeight;
    });

    y += 5;
  }

  // Bloco Critérios de Desempate
  y = pageBreakIfNeeded(doc, y, 32, orgName);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, y - 3, CONTENT_WIDTH, 26, 1, 1, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y - 3, CONTENT_WIDTH, 26, 1, 1, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('CRITÉRIOS OFICIAIS DE DESEMPATE (FIVB / CBV)', MARGIN + 4, y + 1.5);

  const criteria = [
    '1. Maior número de pontos de classificação (3 pts vitória 3-0/3-1; 2 pts 3-2; 1 pt 2-3; 0 pt 0-3/1-3)',
    '2. Confronto direto (em caso de empate entre 2 equipes)',
    '3. Set average (sets vencidos / sets perdidos)',
    '4. Pontos average (pontos marcados / pontos sofridos)',
    '5. Saldo de pontos (marcados - sofridos)',
    '6. Maior número de pontos marcados',
  ];
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);

  let critY = y + 5.5;
  criteria.forEach(c => {
    doc.text(c, MARGIN + 4, critY);
    critY += 3.4;
  });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 3. Relação Nominal das Equipes (1 PÁGINA A4 DEDICADA POR EQUIPE)
// ============================================================================

export function generateTeamRosterReportPdf(
  teams: RosterReportTeam[],
  competitionName: string,
  orgName = 'BaseOS',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  if (teams.length === 0) {
    docHeader(doc, orgName, competitionName, 'Relação Nominal das Equipes');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Nenhuma equipe inscrita.', MARGIN + 2, MARGIN + 42);
    footer(doc, orgName);
    return doc;
  }

  teams.forEach((team, teamIdx) => {
    if (teamIdx > 0) doc.addPage();

    let y = docHeader(doc, orgName, competitionName, `Ficha Oficial de Elenco · ${team.shortName || 'EQUIPE'}`);

    // Card Principal da Equipe
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, 20, 1.5, 1.5, 'F');
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, 20, 1.5, 1.5, 'S');

    // Logo da Equipe (14x14mm)
    safeDrawImage(doc, team.logoUrl, team.shortName || team.name, MARGIN + 3, y + 1, 14);

    // Nome e Metadados
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(team.name.toUpperCase(), MARGIN + 20, y + 6);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    const teamCity = team.city ? `${team.city}${team.state ? ' / ' + team.state : ''}` : 'Cidade não informada';
    doc.text(`SIGLA OFICIAL: ${team.shortName || '---'}  |  SEDE: ${teamCity}`, MARGIN + 20, y + 11);
    doc.text(`MODALIDADE: ${team.modality === 'beach' ? 'Vôlei de Praia' : 'Voleibol de Quadra'}  |  TOTAL ATLETAS: ${team.athletes.length}`, MARGIN + 20, y + 15.5);

    y += 24;

    // Bloco da Comissão Técnica
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, 12, 1, 1, 'F');
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, 12, 1, 1, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('COMISSÃO TÉCNICA OFICIAL', MARGIN + 3, y + 2.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(`TÉCNICO(A): ${team.coach || '________________________'}`, MARGIN + 3, y + 7.5);
    doc.text(`ASSISTENTE: ${team.assistantCoach || '________________________'}`, MARGIN + 65, y + 7.5);
    doc.text(`MÉDICO/PREP.: ${team.medicalStaff || '________________________'}`, MARGIN + 125, y + 7.5);

    y += 16;

    // Tabela Nominal de Atletas
    const col = { num: 14, name: 78, pos: 36, role: 26, docNum: 32 };
    const headerY = y;

    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, headerY - 3.5, CONTENT_WIDTH, 6.5, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('CAMISA', MARGIN + col.num / 2, headerY + 0.5, { align: 'center' });
    doc.text('NOME COMPLETO DO ATLETA', MARGIN + col.num + 2, headerY + 0.5);
    doc.text('POSIÇÃO', MARGIN + col.num + col.name + 2, headerY + 0.5);
    doc.text('FUNÇÃO', MARGIN + col.num + col.name + col.pos + 2, headerY + 0.5);
    doc.text('DOCUMENTO (RG/CPF)', MARGIN + col.num + col.name + col.pos + col.role + 2, headerY + 0.5);

    y = headerY + 4;

    const rowHeight = 7.5;
    if (team.athletes.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text('Nenhum atleta inscrito nesta equipe.', MARGIN + 2, y + 4);
      y += 10;
    } else {
      team.athletes.forEach((a, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(...ZEBRA_BG);
          doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'F');
        }
        doc.setDrawColor(...BORDER_COLOR);
        doc.setLineWidth(0.2);
        doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'S');

        // Camisa
        let cx = MARGIN;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        const numStr = a.jerseyNumber !== undefined ? String(a.jerseyNumber).padStart(2, '0') : '--';
        doc.text(numStr, cx + col.num / 2, y + 1.5, { align: 'center' });
        cx += col.num;

        // Nome
        doc.setFontSize(8);
        doc.setFont('helvetica', a.isCaptain ? 'bold' : 'normal');
        doc.setTextColor(...TEXT_DARK);
        doc.text(a.name.substring(0, 42), cx + 2, y + 1.5);
        cx += col.name;

        // Posição
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(a.position || '—', cx + 2, y + 1.5);
        cx += col.pos;

        // Função
        if (a.isCaptain) {
          doc.setFillColor(254, 243, 199);
          doc.roundedRect(cx + 1, y - 2, 22, 5, 1, 1, 'F');
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(180, 83, 9);
          doc.text('CAPITÃO', cx + 12, y + 1.5, { align: 'center' });
        } else if (a.isLibero) {
          doc.setFillColor(224, 231, 255);
          doc.roundedRect(cx + 1, y - 2, 22, 5, 1, 1, 'F');
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(67, 56, 202);
          doc.text('LÍBERO', cx + 12, y + 1.5, { align: 'center' });
        } else {
          doc.setFontSize(7.5);
          doc.setTextColor(...TEXT_MUTED);
          doc.text('Atleta', cx + 2, y + 1.5);
        }
        cx += col.role;

        // Documento
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_DARK);
        doc.text(a.documentNumber || '—', cx + 2, y + 1.5);

        y += rowHeight;
      });
    }

    // Assinaturas de Homologação da Equipe
    const signBoxY = PAGE_HEIGHT - 38;
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);

    // Linha 1: Responsável pela Equipe
    doc.line(MARGIN + 10, signBoxY, MARGIN + 80, signBoxY);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('RESPONSÁVEL / TÉCNICO DA EQUIPE', MARGIN + 45, signBoxY + 3.5, { align: 'center' });

    // Linha 2: Organização
    doc.line(PAGE_WIDTH - MARGIN - 80, signBoxY, PAGE_WIDTH - MARGIN - 10, signBoxY);
    doc.text('COMISSÃO ORGANIZADORA (HOMOLOGAÇÃO)', PAGE_WIDTH - MARGIN - 45, signBoxY + 3.5, { align: 'center' });
  });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 4. Quadro de Honra & Pódio Final (Encerramento Oficial)
// ============================================================================

export function generatePodiumReportPdf(
  data: PodiumReportData,
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const orgName = data.orgName || 'BaseOS';
  let y = docHeader(doc, orgName, data.competitionName, 'Quadro de Honra e Pódio Oficial');

  // Banner Comemorativo
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, 14, 1.5, 1.5, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('ENCERRAMENTO OFICIAL DA COMPETIÇÃO', MARGIN + CONTENT_WIDTH / 2, y + 5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253);
  doc.text('Classificação Final e Premiações Homologadas', MARGIN + CONTENT_WIDTH / 2, y + 9.5, { align: 'center' });

  y += 20;

  const podiumSlots = [
    {
      title: '1º LUGAR · CAMPEÃO',
      team: data.champion,
      color: GOLD,
      bgColor: GOLD_LIGHT,
      border: GOLD,
      label: 'TROFÉU E MEDALHA DE OURO',
    },
    {
      title: '2º LUGAR · VICE-CAMPEÃO',
      team: data.runnerUp,
      color: SILVER,
      bgColor: SILVER_LIGHT,
      border: SILVER,
      label: 'MEDALHA DE PRATA',
    },
    {
      title: '3º LUGAR · 3º COLOCADO',
      team: data.third,
      color: BRONZE,
      bgColor: BRONZE_LIGHT,
      border: BRONZE,
      label: 'MEDALHA DE BRONZE',
    },
    {
      title: '4º LUGAR · 4º COLOCADO',
      team: data.fourth,
      color: TEXT_MUTED,
      bgColor: ZEBRA_BG,
      border: BORDER_COLOR,
      label: 'CERTIFICADO DE PARTICIPAÇÃO',
    },
  ];

  const cardHeight = 22;
  podiumSlots.forEach(slot => {
    // Card Box
    doc.setFillColor(...slot.bgColor);
    doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(...slot.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, cardHeight, 1.5, 1.5, 'S');

    // Faixa lateral com cor de destaque
    doc.setFillColor(...slot.color);
    doc.rect(MARGIN, y - 2, 4, cardHeight, 'F');

    // Logo da equipe (14x14mm)
    safeDrawImage(doc, slot.team?.logoUrl, slot.team?.shortName || slot.team?.name || 'VLY', MARGIN + 8, y + 2, 14);

    // Título da Posição
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slot.color);
    doc.text(slot.title, MARGIN + 26, y + 4.5);

    // Nome da Equipe
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    const teamName = slot.team?.name || 'A definir / Em disputa';
    doc.text(teamName.toUpperCase(), MARGIN + 26, y + 11.5);

    // Label do Prêmio
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(slot.label, MARGIN + 26, y + 16.5);

    y += cardHeight + 4.5;
  });

  // Assinaturas de Homologação
  const signBoxY = PAGE_HEIGHT - 38;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);

  doc.line(MARGIN + 15, signBoxY, MARGIN + 85, signBoxY);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('DIRETOR TÉCNICO DA COMPETIÇÃO', MARGIN + 50, signBoxY + 3.5, { align: 'center' });

  doc.line(PAGE_WIDTH - MARGIN - 85, signBoxY, PAGE_WIDTH - MARGIN - 15, signBoxY);
  doc.text('COORDENAÇÃO DE ARBITRAGEM', PAGE_WIDTH - MARGIN - 50, signBoxY + 3.5, { align: 'center' });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 5. Escala Oficial de Arbitragem e Oficiais de Mesa
// ============================================================================

export function generateRefereesSchedulePdf(
  rows: RefereesScheduleRow[],
  competitionName: string,
  orgName = 'BaseOS',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(doc, orgName, competitionName, 'Escala Oficial de Arbitragem e Oficiais de Mesa');

  if (rows.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Nenhuma partida ou escala registrada nesta competição.', MARGIN + 2, y + 6);
    footer(doc, orgName);
    return doc;
  }

  // Colunas (total 186mm = CONTENT_WIDTH)
  const col = {
    game: 14,      // J.01 · R1
    dateTime: 26,  // 22/08 · 14:20
    court: 24,     // Quadra / Local
    matchup: 46,   // Time A vs Time B
    firstRef: 26,  // 1º Árbitro
    secondRef: 25, // 2º Árbitro
    scorer: 25,    // Apontador / Mesa
  };

  const headerY = y;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6.5, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);

  doc.text('JOGO', MARGIN + 2, headerY - 0.5);
  doc.text('DATA / HORA', MARGIN + col.game + 2, headerY - 0.5);
  doc.text('QUADRA / LOCAL', MARGIN + col.game + col.dateTime + 2, headerY - 0.5);
  doc.text('CONFRONTO', MARGIN + col.game + col.dateTime + col.court + 2, headerY - 0.5);
  doc.text('1º ÁRBITRO', MARGIN + col.game + col.dateTime + col.court + col.matchup + 2, headerY - 0.5);
  doc.text('2º ÁRBITRO', MARGIN + col.game + col.dateTime + col.court + col.matchup + col.firstRef + 2, headerY - 0.5);
  doc.text('APONTADOR / MESA', MARGIN + col.game + col.dateTime + col.court + col.matchup + col.firstRef + col.secondRef + 2, headerY - 0.5);

  y = headerY + 4;

  const rowHeight = 10.5;
  rows.forEach((row, idx) => {
    y = pageBreakIfNeeded(doc, y, rowHeight + 2, orgName);

    // Linha zebrada
    if (idx % 2 === 1) {
      doc.setFillColor(...ZEBRA_BG);
      doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'F');
    }
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'S');

    // 1. Jogo e Rodada
    let cx = MARGIN;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`J.${String(row.matchNumber).padStart(2, '0')}`, cx + 2, y + 0.5);
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Rod. ${row.round}`, cx + 2, y + 4.5);
    cx += col.game;

    // 2. Data / Hora
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text(row.date || '—', cx + 2, y + 0.5);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(row.time || '—', cx + 2, y + 4.5);
    cx += col.dateTime;

    // 3. Quadra / Local
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    const courtText = (row.court || 'Quadra Principal').substring(0, 14);
    doc.text(courtText, cx + 2, y + 0.5);
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    const venueText = (row.venue || '—').substring(0, 16);
    doc.text(venueText, cx + 2, y + 4.5);
    cx += col.court;

    // 4. Confronto (Equipe A x Equipe B)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    const teamAText = (row.teamAShort || row.teamAName).substring(0, 11);
    const teamBText = (row.teamBShort || row.teamBName).substring(0, 11);
    doc.text(`${teamAText} vs ${teamBText}`, cx + 2, y + 0.5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    const phaseText = (row.groupName ? `Gr. ${row.groupName}` : row.phase || '').substring(0, 18);
    doc.text(phaseText, cx + 2, y + 4.5);
    cx += col.matchup;

    // 5. 1º Árbitro
    doc.setFontSize(6.8);
    if (row.firstReferee && row.firstReferee !== '—') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(row.firstReferee.substring(0, 18), cx + 2, y + 1.5);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...TEXT_MUTED);
      doc.text('A definir', cx + 2, y + 1.5);
    }
    cx += col.firstRef;

    // 6. 2º Árbitro
    doc.setFontSize(6.8);
    if (row.secondReferee && row.secondReferee !== '—') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(row.secondReferee.substring(0, 17), cx + 2, y + 1.5);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...TEXT_MUTED);
      doc.text('A definir', cx + 2, y + 1.5);
    }
    cx += col.secondRef;

    // 7. Apontador / Mesa
    doc.setFontSize(6.8);
    if (row.scorer && row.scorer !== '—') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(row.scorer.substring(0, 17), cx + 2, y + 0.5);
      if (row.assistantScorer && row.assistantScorer !== '—') {
        doc.setFontSize(5.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(`Assist: ${row.assistantScorer.substring(0, 14)}`, cx + 2, y + 4.5);
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...TEXT_MUTED);
      doc.text('A definir', cx + 2, y + 1.5);
    }

    y += rowHeight;
  });

  // Assinaturas de Homologação da Arbitragem
  y = pageBreakIfNeeded(doc, y, 32, orgName);
  const signBoxY = PAGE_HEIGHT - 36;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);

  doc.line(MARGIN + 15, signBoxY, MARGIN + 85, signBoxY);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('COORDENAÇÃO DE ARBITRAGEM', MARGIN + 50, signBoxY + 3.5, { align: 'center' });

  doc.line(PAGE_WIDTH - MARGIN - 85, signBoxY, PAGE_WIDTH - MARGIN - 15, signBoxY);
  doc.text('DIRETORIA TÉCNICA / FEDERAÇÃO', PAGE_WIDTH - MARGIN - 50, signBoxY + 3.5, { align: 'center' });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 6. Programação Diária e Ordem dos Jogos
// ============================================================================

export function generateDailySchedulePdf(
  rows: DailyScheduleRow[],
  competitionName: string,
  selectedDateLabel?: string,
  orgName = 'BaseOS',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const subtitle = selectedDateLabel
    ? `Programação Oficial dos Jogos · ${selectedDateLabel}`
    : 'Programação Diária e Ordem dos Jogos';
  let y = docHeader(doc, orgName, competitionName, subtitle);

  if (rows.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Nenhuma partida encontrada na programação desta competição.', MARGIN + 2, y + 6);
    footer(doc, orgName);
    return doc;
  }

  // Colunas (total 186mm = CONTENT_WIDTH)
  const col = {
    game: 16,        // J.01 · R1
    time: 22,        // 14:00 · 22/08
    courtVenue: 38,  // Quadra 1 · Ginásio Costa Cavalcanti
    matchup: 56,     // Time A vs Time B (com placar se finalizado)
    phaseGroup: 30,  // Semifinal / Grupo A
    status: 24,      // Agendado / Encerrado
  };

  const headerY = y;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, headerY - 4.5, CONTENT_WIDTH, 6.5, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);

  doc.text('JOGO', MARGIN + 2, headerY - 0.5);
  doc.text('HORA / DATA', MARGIN + col.game + 2, headerY - 0.5);
  doc.text('LOCAL / QUADRA', MARGIN + col.game + col.time + 2, headerY - 0.5);
  doc.text('CONFRONTO', MARGIN + col.game + col.time + col.courtVenue + 2, headerY - 0.5);
  doc.text('FASE / GRUPO', MARGIN + col.game + col.time + col.courtVenue + col.matchup + 2, headerY - 0.5);
  doc.text('STATUS', MARGIN + col.game + col.time + col.courtVenue + col.matchup + col.phaseGroup + 2, headerY - 0.5);

  y = headerY + 4;

  const rowHeight = 10.5;
  rows.forEach((row, idx) => {
    y = pageBreakIfNeeded(doc, y, rowHeight + 2, orgName);

    // Linha zebrada
    if (idx % 2 === 1) {
      doc.setFillColor(...ZEBRA_BG);
      doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'F');
    }
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight, 'S');

    // 1. Jogo e Rodada
    let cx = MARGIN;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`J.${String(row.matchNumber).padStart(2, '0')}`, cx + 2, y + 0.5);
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Rod. ${row.round}`, cx + 2, y + 4.5);
    cx += col.game;

    // 2. Horário / Data
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text(row.time || '—', cx + 2, y + 0.5);
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(row.date || '—', cx + 2, y + 4.5);
    cx += col.time;

    // 3. Local / Quadra
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    const courtText = (row.court || 'Quadra Principal').substring(0, 22);
    doc.text(courtText, cx + 2, y + 0.5);
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    const venueText = (row.venue || '—').substring(0, 24);
    doc.text(venueText, cx + 2, y + 4.5);
    cx += col.courtVenue;

    // 4. Confronto (Equipe A x Equipe B)
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    const teamAText = (row.teamAShort || row.teamAName).substring(0, 14);
    const teamBText = (row.teamBShort || row.teamBName).substring(0, 14);
    const hasScore = row.scoreA !== undefined && row.scoreB !== undefined;
    const scoreText = hasScore ? ` (${row.scoreA} x ${row.scoreB})` : '';
    doc.text(`${teamAText} vs ${teamBText}${scoreText}`, cx + 2, y + 0.5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${row.teamAName} x ${row.teamBName}`.substring(0, 36), cx + 2, y + 4.5);
    cx += col.matchup;

    // 5. Fase / Grupo
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text((row.phase || 'Classificatória').substring(0, 18), cx + 2, y + 0.5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    const grText = row.groupName ? `Grupo ${row.groupName}` : 'Chave Única';
    doc.text(grText, cx + 2, y + 4.5);
    cx += col.phaseGroup;

    // 6. Status
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    if (row.status === 'completed' || row.status === 'homologated') {
      doc.setTextColor(16, 185, 129); // Emerald
    } else if (row.status === 'in-progress') {
      doc.setTextColor(245, 158, 11); // Amber
    } else if (row.status === 'cancelled') {
      doc.setTextColor(239, 68, 68); // Red
    } else {
      doc.setTextColor(...TEXT_MUTED);
    }
    doc.text(row.statusLabel, cx + 2, y + 0.5);
    if (row.hasConflict) {
      doc.setFontSize(5.5);
      doc.setTextColor(239, 68, 68);
      doc.text('! Sobreposição', cx + 2, y + 4.5);
    }
    cx += col.status;

    y += rowHeight;
  });

  // Assinaturas de Homologação da Programação
  y = pageBreakIfNeeded(doc, y, 32, orgName);
  const signBoxY = PAGE_HEIGHT - 36;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);

  doc.line(MARGIN + 15, signBoxY, MARGIN + 85, signBoxY);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('COORDENAÇÃO GERAL DA COMPETIÇÃO', MARGIN + 50, signBoxY + 3.5, { align: 'center' });

  doc.line(PAGE_WIDTH - MARGIN - 85, signBoxY, PAGE_WIDTH - MARGIN - 15, signBoxY);
  doc.text('DIRETORIA TÉCNICA / OPERAÇÕES', PAGE_WIDTH - MARGIN - 50, signBoxY + 3.5, { align: 'center' });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 7. Galeria Oficial de Destaques / MVP da Partida
// ============================================================================

export function generateMvpReportPdf(
  data: MvpReportData,
  orgName = 'BaseOS',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(doc, orgName, data.competitionName, 'Galeria Oficial de Destaques / MVP da Partida');

  // Caixa de Métricas / Resumo Executivo
  doc.setFillColor(...ZEBRA_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 14, 1.5, 1.5, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);

  const colW = CONTENT_WIDTH / 5;
  // 1. Total Jogos
  doc.text('TOTAL DE JOGOS', MARGIN + colW * 0.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(String(data.metrics.totalMatches), MARGIN + colW * 0.5, y + 5.5, { align: 'center' });

  // 2. Com MVP
  doc.setFontSize(6.8);
  doc.text('JOGOS COM MVP', MARGIN + colW * 1.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(String(data.metrics.matchesWithMvp), MARGIN + colW * 1.5, y + 5.5, { align: 'center' });

  // 3. Sem Destaque
  doc.setFontSize(6.8);
  doc.setTextColor(...NAVY);
  doc.text('SEM DESTAQUE', MARGIN + colW * 2.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(String(data.metrics.matchesWithoutMvp), MARGIN + colW * 2.5, y + 5.5, { align: 'center' });

  // 4. Atletas Premiados
  doc.setFontSize(6.8);
  doc.setTextColor(...NAVY);
  doc.text('ATLETAS DESTACADOS', MARGIN + colW * 3.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(String(data.metrics.distinctHighlightedAthletes), MARGIN + colW * 3.5, y + 5.5, { align: 'center' });

  // 5. Maior Destaque
  doc.setFontSize(6.8);
  doc.text('LÍDER DE DESTAQUES', MARGIN + colW * 4.5, y - 0.5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  const leaderText = data.metrics.leaderName
    ? `${data.metrics.leaderName.split(' ')[0]} (${data.metrics.leaderMvpCount}x)`
    : '—';
  doc.text(leaderText, MARGIN + colW * 4.5, y + 5.5, { align: 'center' });

  y += 16;

  // --- SEÇÃO 1: RANKING DE DESTAQUES ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('RANKING DE ATLETAS DESTAQUE (MVP)', MARGIN + 2, y);
  y += 3;

  // Cabeçalho da Tabela de Ranking
  const rCol = {
    pos: 16,
    athlete: 64,
    team: 56,
    mvps: 22,
    matches: 28,
  };

  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, 5.5, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(...WHITE);
  doc.text('POS', MARGIN + 2, y - 0.2);
  doc.text('ATLETA', MARGIN + rCol.pos + 2, y - 0.2);
  doc.text('EQUIPE', MARGIN + rCol.pos + rCol.athlete + 2, y - 0.2);
  doc.text('DESTAQUES', MARGIN + rCol.pos + rCol.athlete + rCol.team + 2, y - 0.2);
  doc.text('CONFRONTOS', MARGIN + rCol.pos + rCol.athlete + rCol.team + rCol.mvps + 2, y - 0.2);
  y += 3.5;

  if (data.leaderboard.length === 0) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Nenhum atleta destaque registrado nesta competição.', MARGIN + 2, y + 3);
    y += 8;
  } else {
    data.leaderboard.forEach((row, idx) => {
      if (y > PAGE_HEIGHT - MARGIN - 22) {
        doc.addPage();
        y = docHeader(doc, orgName, data.competitionName, 'Galeria Oficial de Destaques / MVP da Partida');
      }

      if (idx % 2 === 0) {
        doc.setFillColor(...ZEBRA_BG);
        doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 5.5, 'F');
      }

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      if (row.position === 1) {
        doc.setTextColor(...GOLD);
      } else {
        doc.setTextColor(...NAVY);
      }
      doc.text(`${row.position}º`, MARGIN + 4, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_DARK);
      const jerseyPrefix = row.jerseyNumber != null ? `#${row.jerseyNumber} ` : '';
      doc.text(`${jerseyPrefix}${row.athleteName}`, MARGIN + rCol.pos + 2, y);
      doc.text(row.teamName, MARGIN + rCol.pos + rCol.athlete + 2, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GOLD);
      doc.text(`${row.mvpCount}x MVP`, MARGIN + rCol.pos + rCol.athlete + rCol.team + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      const matchesStr = row.matchNumbers.map((n) => `J.${n}`).join(', ');
      doc.text(matchesStr, MARGIN + rCol.pos + rCol.athlete + rCol.team + rCol.mvps + 2, y);

      y += 5;
    });
  }

  y += 6;

  // --- SEÇÃO 2: RELAÇÃO DE CONFRONTOS E DESTAQUES ---
  if (y > PAGE_HEIGHT - MARGIN - 35) {
    doc.addPage();
    y = docHeader(doc, orgName, data.competitionName, 'Galeria Oficial de Destaques / MVP da Partida');
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('CONFRONTOS DA COMPETIÇÃO & DESTAQUES REGISTRADOS', MARGIN + 2, y);
  y += 3;

  const mCol = {
    game: 18,     // J.01 · R1
    dateTime: 28, // 22/08 · 14:00
    venue: 36,    // Ginásio Central
    matchup: 46,  // Time A vs Time B
    score: 18,    // 3 x 1
    mvp: 40,      // #7 Bruna Silva (ALP)
  };

  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, 5.5, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(...WHITE);
  doc.text('JOGO', MARGIN + 2, y - 0.2);
  doc.text('DATA / HORA', MARGIN + mCol.game + 2, y - 0.2);
  doc.text('LOCAL / QUADRA', MARGIN + mCol.game + mCol.dateTime + 2, y - 0.2);
  doc.text('CONFRONTO', MARGIN + mCol.game + mCol.dateTime + mCol.venue + 2, y - 0.2);
  doc.text('PLACAR', MARGIN + mCol.game + mCol.dateTime + mCol.venue + mCol.matchup + 2, y - 0.2);
  doc.text('DESTAQUE (MVP)', MARGIN + mCol.game + mCol.dateTime + mCol.venue + mCol.matchup + mCol.score + 2, y - 0.2);
  y += 3.5;

  if (data.matches.length === 0) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Nenhum confronto programado nesta competição.', MARGIN + 2, y + 3);
    y += 8;
  } else {
    data.matches.forEach((m, idx) => {
      if (y > PAGE_HEIGHT - MARGIN - 18) {
        doc.addPage();
        y = docHeader(doc, orgName, data.competitionName, 'Galeria Oficial de Destaques / MVP da Partida');
      }

      if (idx % 2 === 0) {
        doc.setFillColor(...ZEBRA_BG);
        doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 5.5, 'F');
      }

      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`J.${String(m.matchNumber).padStart(2, '0')}`, MARGIN + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`${m.date || 'A def.'} ${m.time ? `${m.time}h` : ''}`, MARGIN + mCol.game + 2, y);

      doc.text(m.venue || '—', MARGIN + mCol.game + mCol.dateTime + 2, y);

      doc.setTextColor(...TEXT_DARK);
      const matchupStr = `${m.teamAShort || m.teamAName} x ${m.teamBShort || m.teamBName}`;
      doc.text(matchupStr, MARGIN + mCol.game + mCol.dateTime + mCol.venue + 2, y);

      doc.setFont('helvetica', 'bold');
      doc.text(m.setsScoreLabel || '—', MARGIN + mCol.game + mCol.dateTime + mCol.venue + mCol.matchup + 2, y);

      if (m.hasHighlight && m.athleteName) {
        if (m.isUnresolvedAthlete) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(180, 50, 50);
          doc.text('Atleta não localizado', MARGIN + mCol.game + mCol.dateTime + mCol.venue + mCol.matchup + mCol.score + 2, y);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...GOLD);
          const jPrefix = m.jerseyNumber != null ? `#${m.jerseyNumber} ` : '';
          const teamSfx = m.athleteTeamShort ? ` (${m.athleteTeamShort})` : '';
          doc.text(`${jPrefix}${m.athleteName}${teamSfx}`, MARGIN + mCol.game + mCol.dateTime + mCol.venue + mCol.matchup + mCol.score + 2, y);
        }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...TEXT_MUTED);
        doc.text('Sem destaque', MARGIN + mCol.game + mCol.dateTime + mCol.venue + mCol.matchup + mCol.score + 2, y);
      }

      y += 5;
    });
  }

  // Bloco de Assinaturas e Homologação
  if (y > PAGE_HEIGHT - MARGIN - 30) {
    doc.addPage();
    y = docHeader(doc, orgName, data.competitionName, 'Galeria Oficial de Destaques / MVP da Partida');
  }

  const signBoxY = Math.max(y + 10, PAGE_HEIGHT - MARGIN - 20);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);

  doc.line(MARGIN + 15, signBoxY, MARGIN + 85, signBoxY);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('COORDENAÇÃO TÉCNICA / PREMIAÇÕES', MARGIN + 50, signBoxY + 3.5, { align: 'center' });

  doc.line(PAGE_WIDTH - MARGIN - 85, signBoxY, PAGE_WIDTH - MARGIN - 15, signBoxY);
  doc.text('DIRETORIA DE OPERAÇÕES BASEOS', PAGE_WIDTH - MARGIN - 50, signBoxY + 3.5, { align: 'center' });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 8. Relação Oficial de Delegações & Responsáveis
// ============================================================================

export function generateDelegationReportPdf(
  data: DelegationReportData,
  orgName = 'BaseOS',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(doc, orgName, data.competitionName, 'Relação Oficial de Delegações & Responsáveis');

  // Caixa de Métricas Executivas
  doc.setFillColor(...ZEBRA_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 14, 1.5, 1.5, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);

  const colW = CONTENT_WIDTH / 5;
  // 1. Total Equipes
  doc.text('DELEGAÇÕES', MARGIN + colW * 0.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(String(data.metrics.totalTeams), MARGIN + colW * 0.5, y + 5.5, { align: 'center' });

  // 2. Homologadas / Aprovadas
  doc.setFontSize(6.8);
  doc.text('INSCR. APROVADAS', MARGIN + colW * 1.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(String(data.metrics.approvedTeams), MARGIN + colW * 1.5, y + 5.5, { align: 'center' });

  // 3. Pendentes
  doc.setFontSize(6.8);
  doc.setTextColor(...NAVY);
  doc.text('PENDENTES', MARGIN + colW * 2.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(String(data.metrics.pendingTeams), MARGIN + colW * 2.5, y + 5.5, { align: 'center' });

  // 4. Atletas
  doc.setFontSize(6.8);
  doc.setTextColor(...NAVY);
  doc.text('TOTAL DE ATLETAS', MARGIN + colW * 3.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(String(data.metrics.totalAthletes), MARGIN + colW * 3.5, y + 5.5, { align: 'center' });

  // 5. Responsáveis
  doc.setFontSize(6.8);
  doc.text('RESPONSÁVEIS', MARGIN + colW * 4.5, y - 0.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(String(data.metrics.teamsWithManager), MARGIN + colW * 4.5, y + 5.5, { align: 'center' });

  y += 16;

  if (data.teams.length === 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Nenhuma delegação vinculada a esta competição.', MARGIN + 2, y + 3);
    y += 10;
  } else {
    data.teams.forEach((team) => {
      // Verifica espaço para cabeçalho da equipe + pelo menos 2 atletas
      if (y > PAGE_HEIGHT - MARGIN - 40) {
        doc.addPage();
        y = docHeader(doc, orgName, data.competitionName, 'Relação Oficial de Delegações & Responsáveis');
      }

      // Faixa de cabeçalho da equipe
      doc.setFillColor(...NAVY);
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 6.5, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      const teamTitle = `${team.teamName}${team.teamShortName ? ` [${team.teamShortName}]` : ''}`;
      doc.text(teamTitle, MARGIN + 3, y + 1.5);

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      const locStr = team.city ? `${team.city}${team.state ? `-${team.state}` : ''}` : '';
      const statusBadge = `Situação: ${team.registrationStatus} ${team.isLocked ? '(Bloqueada)' : ''}`;
      doc.text(`${locStr}  |  ${statusBadge}`, PAGE_WIDTH - MARGIN - 3, y + 1.5, { align: 'right' });
      y += 5.5;

      // Sub-faixa de Gestor e Comissão
      doc.setFillColor(...ZEBRA_BG);
      doc.rect(MARGIN, y - 1.5, CONTENT_WIDTH, 6, 'F');
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.2);
      doc.rect(MARGIN, y - 1.5, CONTENT_WIDTH, 6, 'S');

      doc.setFontSize(6.2);
      doc.setTextColor(...TEXT_DARK);
      const managerLabel = team.managerName ? `Gestor/Resp: ${team.managerName}${team.managerPhone ? ` (${team.managerPhone})` : ''}` : 'Gestor: Não informado';
      const coachLabel = team.coachName ? `Técnico: ${team.coachName}` : 'Técnico: Não informado';
      const staffExtra = team.assistantCoach ? ` | Aux: ${team.assistantCoach}` : '';
      doc.text(`${managerLabel}  |  ${coachLabel}${staffExtra}`, MARGIN + 3, y + 2.5);

      doc.setFont('helvetica', 'bold');
      doc.text(`${team.athleteCount} atletas`, PAGE_WIDTH - MARGIN - 3, y + 2.5, { align: 'right' });
      y += 7;

      // Tabela de Atletas do Elenco
      const aCol = {
        num: 12,
        name: 70,
        pos: 38,
        doc: 36,
        role: 30,
      };

      doc.setFillColor(241, 245, 249);
      doc.rect(MARGIN, y - 2.5, CONTENT_WIDTH, 4.5, 'F');
      doc.setFontSize(5.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT_MUTED);
      doc.text('Nº', MARGIN + 2, y + 0.5);
      doc.text('ATLETA', MARGIN + aCol.num + 2, y + 0.5);
      doc.text('POSIÇÃO', MARGIN + aCol.num + aCol.name + 2, y + 0.5);
      doc.text('DOCUMENTO', MARGIN + aCol.num + aCol.name + aCol.pos + 2, y + 0.5);
      doc.text('FUNÇÃO', MARGIN + aCol.num + aCol.name + aCol.pos + aCol.doc + 2, y + 0.5);
      y += 3.5;

      if (team.athletes.length === 0) {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...TEXT_MUTED);
        doc.text('Nenhum atleta inscrito no elenco desta equipe.', MARGIN + 4, y + 2);
        y += 6;
      } else {
        team.athletes.forEach((ath, aIdx) => {
          if (y > PAGE_HEIGHT - MARGIN - 18) {
            doc.addPage();
            y = docHeader(doc, orgName, data.competitionName, 'Relação Oficial de Delegações & Responsáveis');
          }

          if (aIdx % 2 === 1) {
            doc.setFillColor(...ZEBRA_BG);
            doc.rect(MARGIN, y - 2.5, CONTENT_WIDTH, 4.5, 'F');
          }

          doc.setFontSize(6.2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...NAVY);
          doc.text(ath.jerseyNumber != null ? `#${ath.jerseyNumber}` : '—', MARGIN + 2, y + 0.5);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...TEXT_DARK);
          doc.text(ath.name, MARGIN + aCol.num + 2, y + 0.5);

          doc.setTextColor(...TEXT_MUTED);
          doc.text(ath.position, MARGIN + aCol.num + aCol.name + 2, y + 0.5);
          doc.text(ath.documentNumber || '—', MARGIN + aCol.num + aCol.name + aCol.pos + 2, y + 0.5);

          if (ath.isCaptain) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GOLD);
            doc.text('(C) Capitão', MARGIN + aCol.num + aCol.name + aCol.pos + aCol.doc + 2, y + 0.5);
          } else if (ath.isLibero) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text('(L) Líbero', MARGIN + aCol.num + aCol.name + aCol.pos + aCol.doc + 2, y + 0.5);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_MUTED);
            doc.text('Atleta', MARGIN + aCol.num + aCol.name + aCol.pos + aCol.doc + 2, y + 0.5);
          }

          y += 4.5;
        });
      }

      y += 5;
    });
  }

  // Bloco de Assinatura e Homologação
  if (y > PAGE_HEIGHT - MARGIN - 26) {
    doc.addPage();
    y = docHeader(doc, orgName, data.competitionName, 'Relação Oficial de Delegações & Responsáveis');
  }

  const signBoxY = Math.max(y + 8, PAGE_HEIGHT - MARGIN - 20);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);

  doc.line(MARGIN + 15, signBoxY, MARGIN + 85, signBoxY);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('COORDENAÇÃO DE DELEGAÇÕES', MARGIN + 50, signBoxY + 3.5, { align: 'center' });

  doc.line(PAGE_WIDTH - MARGIN - 85, signBoxY, PAGE_WIDTH - MARGIN - 15, signBoxY);
  doc.text('DIRETORIA DE OPERAÇÕES BASEOS', PAGE_WIDTH - MARGIN - 50, signBoxY + 3.5, { align: 'center' });

  footer(doc, orgName);
  return doc;
}

// ============================================================================
// 8. Relatório Estatístico de Partidas e Sets (BaseOS Fase 7.5 Prompt 8)
// ============================================================================

export function generateMatchStatisticsReportPdf(
  data: MatchStatisticsReportData,
  orgName = 'BASEOS SPORTS INTELLIGENCE',
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = docHeader(
    doc,
    orgName,
    data.competitionName,
    'Resumo Estatístico de Partidas, Sets e Pontuação',
  );

  // 1. Resumo Executivo / Métricas
  doc.setFillColor(...ZEBRA_BG);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 1.5, 1.5, 'S');

  const mColWidth = CONTENT_WIDTH / 5;
  const metrics = [
    { label: 'JOGOS TOTAIS', val: `${data.metrics.totalMatches} (${data.metrics.completedMatches} conc.)` },
    { label: 'SETS DISPUTADOS', val: `${data.metrics.totalSetsPlayed} sets` },
    { label: 'PONTOS REGISTRADOS', val: `${data.metrics.totalPointsScored.toLocaleString('pt-BR')} pts` },
    { label: 'MÉDIA SETS/JOGO', val: `${data.metrics.averageSetsPerMatch}` },
    { label: 'DURAÇÃO OFICIAL', val: 'Não registrada' },
  ];

  metrics.forEach((m, idx) => {
    const mx = MARGIN + idx * mColWidth;
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(m.label, mx + 2, y + 4.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(idx === 4 ? TEXT_MUTED : NAVY));
    doc.text(m.val, mx + 2, y + 10);

    if (idx < 4) {
      doc.setDrawColor(...BORDER_COLOR);
      doc.line(mx + mColWidth, y + 2, mx + mColWidth, y + 12);
    }
  });

  y += 18;

  // 2. Tabela de Desempenho por Equipe
  if (data.teamSummaries.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('DESEMPENHO CONSOLIDADO POR EQUIPE', MARGIN, y);
    y += 3.5;

    // Cabeçalho da tabela de equipes
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 5, 'F');

    const tCol = { pos: 10, team: 60, j: 12, v: 12, d: 12, pct: 16, setsW: 14, setsL: 14, saldo: 20, setAvg: 20 };
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    let tx = MARGIN;
    doc.text('POS', tx + 2, y + 3.5);
    tx += tCol.pos;
    doc.text('EQUIPE', tx + 2, y + 3.5);
    tx += tCol.team;
    doc.text('J', tx + 3, y + 3.5);
    tx += tCol.j;
    doc.text('V', tx + 3, y + 3.5);
    tx += tCol.v;
    doc.text('D', tx + 3, y + 3.5);
    tx += tCol.d;
    doc.text('% VIT', tx + 3, y + 3.5);
    tx += tCol.pct;
    doc.text('SETS+', tx + 2, y + 3.5);
    tx += tCol.setsW;
    doc.text('SETS-', tx + 2, y + 3.5);
    tx += tCol.setsL;
    doc.text('SALDO PTS', tx + 2, y + 3.5);
    tx += tCol.saldo;
    doc.text('SET AVG', tx + 2, y + 3.5);

    y += 5;

    // Linhas das equipes
    data.teamSummaries.slice(0, 12).forEach((t, idx) => {
      if (y > PAGE_HEIGHT - MARGIN - 20) {
        doc.addPage();
        y = docHeader(doc, orgName, data.competitionName, 'Resumo Estatístico de Partidas e Sets');
      }

      if (idx % 2 === 1) {
        doc.setFillColor(...ZEBRA_BG);
        doc.rect(MARGIN, y, CONTENT_WIDTH, 4.5, 'F');
      }

      let cx = MARGIN;
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`${idx + 1}º`, cx + 2, y + 3);
      cx += tCol.pos;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_DARK);
      doc.text(t.teamName.substring(0, 32), cx + 2, y + 3);
      cx += tCol.team;

      doc.text(String(t.matchesPlayed), cx + 3, y + 3);
      cx += tCol.j;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(String(t.wins), cx + 3, y + 3);
      cx += tCol.v;

      doc.setTextColor(239, 68, 68);
      doc.text(String(t.losses), cx + 3, y + 3);
      cx += tCol.d;

      doc.setTextColor(...TEXT_DARK);
      doc.text(`${t.winRate}%`, cx + 3, y + 3);
      cx += tCol.pct;

      doc.text(String(t.setsWon), cx + 3, y + 3);
      cx += tCol.setsW;
      doc.text(String(t.setsLost), cx + 3, y + 3);
      cx += tCol.setsL;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(t.pointBalance >= 0 ? 16 : 239, t.pointBalance >= 0 ? 185 : 68, t.pointBalance >= 0 ? 129 : 68);
      doc.text(t.pointBalance > 0 ? `+${t.pointBalance}` : String(t.pointBalance), cx + 2, y + 3);
      cx += tCol.saldo;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text(t.setRatio === 999 ? 'MAX' : t.setRatio != null ? t.setRatio.toFixed(3) : '—', cx + 2, y + 3);

      y += 4.5;
    });

    y += 6;
  }

  // 3. Relação de Confrontos e Parciais dos Sets
  if (data.matches.length > 0) {
    if (y > PAGE_HEIGHT - MARGIN - 35) {
      doc.addPage();
      y = docHeader(doc, orgName, data.competitionName, 'Resumo Estatístico de Partidas e Sets');
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('CONFRONTOS, PLACARES E PARCIAIS SET A SET', MARGIN, y);
    y += 3.5;

    // Cabeçalho dos confrontos
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 5, 'F');

    const mCol = { num: 12, date: 22, phase: 22, teamA: 36, score: 16, teamB: 36, sets: 36, dur: 10 };
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    let mx = MARGIN;
    doc.text('JOGO', mx + 2, y + 3.5);
    mx += mCol.num;
    doc.text('DATA/HORA', mx + 2, y + 3.5);
    mx += mCol.date;
    doc.text('FASE/GRUPO', mx + 2, y + 3.5);
    mx += mCol.phase;
    doc.text('MANDANTE (A)', mx + 2, y + 3.5);
    mx += mCol.teamA;
    doc.text('PLACAR', mx + 2, y + 3.5);
    mx += mCol.score;
    doc.text('VISITANTE (B)', mx + 2, y + 3.5);
    mx += mCol.teamB;
    doc.text('PARCIAIS DOS SETS', mx + 2, y + 3.5);
    mx += mCol.sets;
    doc.text('DUR.', mx + 1, y + 3.5);

    y += 5;

    data.matches.forEach((m, idx) => {
      if (y > PAGE_HEIGHT - MARGIN - 12) {
        doc.addPage();
        y = docHeader(doc, orgName, data.competitionName, 'Resumo Estatístico de Partidas e Sets');
      }

      if (idx % 2 === 1) {
        doc.setFillColor(...ZEBRA_BG);
        doc.rect(MARGIN, y, CONTENT_WIDTH, 5.5, 'F');
      }

      let cx = MARGIN;
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`#${m.matchNumber}`, cx + 2, y + 3.5);
      cx += mCol.num;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`${m.date} ${m.time}`, cx + 2, y + 3.5);
      cx += mCol.date;

      doc.text((m.groupName || m.phase || '—').substring(0, 14), cx + 2, y + 3.5);
      cx += mCol.phase;

      // Equipe A
      doc.setFont('helvetica', m.winnerSide === 'A' ? 'bold' : 'normal');
      doc.setTextColor(...(m.winnerSide === 'A' ? GOLD : TEXT_DARK));
      doc.text((m.teamAShortName || m.teamAName).substring(0, 18), cx + 2, y + 3.5);
      cx += mCol.teamA;

      // Placar Sets
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(m.setsScoreLabel, cx + 3, y + 3.5);
      cx += mCol.score;

      // Equipe B
      doc.setFont('helvetica', m.winnerSide === 'B' ? 'bold' : 'normal');
      doc.setTextColor(...(m.winnerSide === 'B' ? GOLD : TEXT_DARK));
      doc.text((m.teamBShortName || m.teamBName).substring(0, 18), cx + 2, y + 3.5);
      cx += mCol.teamB;

      // Parciais
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text((m.setsBreakdownLabel || '—').substring(0, 24), cx + 2, y + 3.5);
      cx += mCol.sets;

      // Duração (Regra: Não registrada)
      doc.setFontSize(5.5);
      doc.setTextColor(...TEXT_MUTED);
      doc.text('—', cx + 3, y + 3.5);

      y += 5.5;
    });
  }

  // Bloco de Assinatura e Homologação
  if (y > PAGE_HEIGHT - MARGIN - 26) {
    doc.addPage();
    y = docHeader(doc, orgName, data.competitionName, 'Resumo Estatístico de Partidas e Sets');
  }

  const signBoxY = Math.max(y + 8, PAGE_HEIGHT - MARGIN - 20);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);

  doc.line(MARGIN + 15, signBoxY, MARGIN + 85, signBoxY);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('COORDENAÇÃO TÉCNICA E ESTATÍSTICA', MARGIN + 50, signBoxY + 3.5, { align: 'center' });

  doc.line(PAGE_WIDTH - MARGIN - 85, signBoxY, PAGE_WIDTH - MARGIN - 15, signBoxY);
  doc.text('DIRETORIA DE COMPETIÇÕES BASEOS', PAGE_WIDTH - MARGIN - 50, signBoxY + 3.5, { align: 'center' });

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