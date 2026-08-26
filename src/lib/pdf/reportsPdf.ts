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
  teamAShort?: string;
  teamALogo?: string;
  teamBName: string;
  teamBShort?: string;
  teamBLogo?: string;
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
  assistantCoach?: string;
  medicalStaff?: string;
  city?: string;
  state?: string;
  modality?: string;
  logoUrl?: string;
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
  doc.text('VOLLEYPRO', MARGIN + 4, MARGIN + (isSubsequentPage ? 5.5 : 7));

  doc.setFontSize(isSubsequentPage ? 7 : 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253);
  doc.text('SISTEMA OFICIAL DE COMPETIÇÕES', MARGIN + (isSubsequentPage ? 28 : 34), MARGIN + (isSubsequentPage ? 5.5 : 7));

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
    doc.text(`BaseOS · Gestão de Voleibol (${orgName})`, MARGIN, FOOTER_Y + 1);

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