/**
 * matchStatisticsReport.test.tsx
 *
 * Testes unitários e de integração para o Relatório de Estatísticas de Partidas, Sets e Duração
 * (BaseOS Fase 7.5 Prompt 8):
 * - Partida com 3 sets
 * - Partida com 5 sets (tiebreak)
 * - Partida sem sets / agendada
 * - Partida sem resultado registrado
 * - Partida homologada vs em andamento vs cancelada
 * - Partida com WO (W.O.)
 * - Cálculo matemático de sets vencidos, pontos e saldo
 * - Agregação e métricas por equipe (J, V, D, Sets+, Sets-, Saldo)
 * - Transparência estatística: duração não registrada (sem estimativas falsas)
 * - Isolamento por competição
 * - Modalidade Indoor e Beach
 * - Visualização HTML-first (cards de métricas, tabs, filtros, mobile e desktop)
 * - Geração de PDF oficial BaseOS
 * - Ausência de "VolleyPro"
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  buildMatchStatisticsReportData,
  formatMatchStatus,
  formatDate,
  formatTime,
} from '@/services/matchStatisticsReportService';
import { MatchStatisticsReportView } from '@/components/report/MatchStatisticsReportView';
import { generateMatchStatisticsReportPdf } from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures Reais BaseOS
// ─────────────────────────────────────────────────────────────────────────────

const mockCompetitionIndoor: CompetitionRecord = {
  id: 'comp-indoor-1',
  name: 'Campeonato Estadual Indoor 2026',
  modality: 'indoor',
  status: 'in-progress',
  format: 'group-stage-knockout',
  playerFormat: '6x6',
  setFormat: '5-sets',
  genderCategory: 'male',
  groupsCount: 1,
  teamsPerGroup: 4,
  advancingPerGroup: 2,
  venue: 'Ginásio Central',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockCompetitionBeach: CompetitionRecord = {
  id: 'comp-beach-1',
  name: 'Circuito Estadual Praia 2026',
  modality: 'beach',
  status: 'in-progress',
  format: 'group-stage-knockout',
  playerFormat: '2x2',
  setFormat: '3-sets',
  genderCategory: 'female',
  groupsCount: 1,
  teamsPerGroup: 2,
  advancingPerGroup: 1,
  venue: 'Arena de Areia',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockTeams: TeamRecord[] = [
  {
    id: 'team-alvorada',
    name: 'Alvorada Voleibol Clube',
    shortName: 'ALV',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-cruzeiro',
    name: 'Cruzeiro Vôlei',
    shortName: 'CRU',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-estrela',
    name: 'Estrela do Mar',
    shortName: 'EST',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockMatches: MatchRecord[] = [
  // 1. Partida com 3 sets concluída (3 x 0)
  {
    id: 'match-1',
    competitionId: 'comp-indoor-1',
    matchNumber: 101,
    scheduledTime: '2026-03-10T14:00:00',
    venue: 'Ginásio Central',
    court: 'Quadra 1',
    phase: 'Classificatória',
    groupName: 'Grupo A',
    round: 1,
    teamAId: 'team-alvorada',
    teamBId: 'team-cruzeiro',
    teamAName: 'Alvorada Voleibol Clube',
    teamBName: 'Cruzeiro Vôlei',
    teamAShortName: 'ALV',
    teamBShortName: 'CRU',
    referees: [],
    status: 'completed',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 25, scoreB: 18 },
      { setNumber: 3, scoreA: 25, scoreB: 22 },
    ],
    winnerId: 'team-alvorada',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  // 2. Partida com 5 sets / tiebreak (3 x 2)
  {
    id: 'match-2',
    competitionId: 'comp-indoor-1',
    matchNumber: 102,
    scheduledTime: '2026-03-11T16:00:00',
    venue: 'Ginásio Central',
    court: 'Quadra 1',
    phase: 'Classificatória',
    groupName: 'Grupo A',
    round: 2,
    teamAId: 'team-cruzeiro',
    teamBId: 'team-estrela',
    teamAName: 'Cruzeiro Vôlei',
    teamBName: 'Estrela do Mar',
    teamAShortName: 'CRU',
    teamBShortName: 'EST',
    referees: [],
    status: 'homologated',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 23 },
      { setNumber: 2, scoreA: 20, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 21 },
      { setNumber: 4, scoreA: 22, scoreB: 25 },
      { setNumber: 5, scoreA: 15, scoreB: 12 },
    ],
    winnerId: 'team-cruzeiro',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  // 3. Partida com WO (W.O. equipe B ausente)
  {
    id: 'match-3',
    competitionId: 'comp-indoor-1',
    matchNumber: 103,
    scheduledTime: '2026-03-12T18:00:00',
    venue: 'Ginásio Central',
    court: 'Quadra 2',
    phase: 'Classificatória',
    groupName: 'Grupo A',
    round: 3,
    teamAId: 'team-alvorada',
    teamBId: 'team-estrela',
    teamAName: 'Alvorada Voleibol Clube',
    teamBName: 'Estrela do Mar',
    teamAShortName: 'ALV',
    teamBShortName: 'EST',
    referees: [],
    status: 'completed',
    isWo: true,
    winnerId: 'team-alvorada',
    sets: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  // 4. Partida em andamento (in-progress)
  {
    id: 'match-4',
    competitionId: 'comp-indoor-1',
    matchNumber: 104,
    scheduledTime: '2026-03-13T20:00:00',
    venue: 'Ginásio Central',
    court: 'Quadra 1',
    phase: 'Semifinal',
    round: 4,
    teamAId: 'team-alvorada',
    teamBId: 'team-cruzeiro',
    teamAName: 'Alvorada Voleibol Clube',
    teamBName: 'Cruzeiro Vôlei',
    teamAShortName: 'ALV',
    teamBShortName: 'CRU',
    referees: [],
    status: 'in-progress',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 21 },
      { setNumber: 2, scoreA: 19, scoreB: 25 },
    ],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  // 5. Partida agendada sem resultado (scheduled)
  {
    id: 'match-5',
    competitionId: 'comp-indoor-1',
    matchNumber: 105,
    scheduledTime: '2026-03-14T15:00:00',
    venue: 'Ginásio Central',
    court: 'Quadra 1',
    phase: 'Final',
    round: 5,
    teamAId: 'team-alvorada',
    teamBId: 'team-estrela',
    teamAName: 'Alvorada Voleibol Clube',
    teamBName: 'Estrela do Mar',
    teamAShortName: 'ALV',
    teamBShortName: 'EST',
    referees: [],
    status: 'scheduled',
    sets: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  // 6. Partida cancelada
  {
    id: 'match-6',
    competitionId: 'comp-indoor-1',
    matchNumber: 106,
    scheduledTime: '2026-03-15T10:00:00',
    venue: 'Ginásio Central',
    court: 'Quadra 1',
    phase: 'Disputa 3º',
    round: 5,
    teamAId: 'team-cruzeiro',
    teamBId: 'team-estrela',
    teamAName: 'Cruzeiro Vôlei',
    teamBName: 'Estrela do Mar',
    teamAShortName: 'CRU',
    teamBShortName: 'EST',
    referees: [],
    status: 'cancelled',
    sets: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Testes do Serviço de Estatísticas (buildMatchStatisticsReportData)
// ─────────────────────────────────────────────────────────────────────────────

describe('MatchStatisticsReportService - buildMatchStatisticsReportData', () => {
  it('isola partidas por competição corretamente', () => {
    const mixedMatches: MatchRecord[] = [
      ...mockMatches,
      {
        id: 'match-other-comp',
        competitionId: 'other-competition-id',
        round: 1,
        matchNumber: 999,
        scheduledTime: '2026-03-20T10:00:00',
        venue: 'Outro Local',
        teamAId: 'team-alvorada',
        teamBId: 'team-cruzeiro',
        teamAName: 'Alvorada Voleibol Clube',
        teamBName: 'Cruzeiro Vôlei',
        teamAShortName: 'ALV',
        teamBShortName: 'CRU',
        referees: [],
        status: 'completed',
        sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mixedMatches,
      teams: mockTeams,
    });

    expect(reportData.matches.length).toBe(6);
    expect(reportData.matches.some((m) => m.matchId === 'match-other-comp')).toBe(false);
  });

  it('calcula métricas executivas gerais com precisão matemática', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    const m = reportData.metrics;
    expect(m.totalMatches).toBe(6);
    // Partidas concluídas: match-1 (completed), match-2 (homologated), match-3 (completed WO)
    expect(m.completedMatches).toBe(3);
    expect(m.inProgressMatches).toBe(1);
    expect(m.scheduledMatches).toBe(1);
    expect(m.woMatches).toBe(1);
    expect(m.cancelledMatches).toBe(1);
    expect(m.tiebreakMatchesCount).toBe(1); // match-2 tem 5 sets

    // Sets disputados: match-1 (3) + match-2 (5) + match-4 (2) = 10 sets
    expect(m.totalSetsPlayed).toBe(10);

    // Pontos totais:
    // match-1: (25+20) + (25+18) + (25+22) = 135
    // match-2: (25+23) + (20+25) + (25+21) + (22+25) + (15+12) = 213
    // match-3 (WO canônico CBV): 50 pts (2x25)
    // match-4: (25+21) + (19+25) = 90
    // Total = 135 + 213 + 50 + 90 = 488
    expect(m.totalPointsScored).toBe(488);

    // Média de sets por partida concluída (8 sets / 3 partidas = 2.67)
    expect(m.averageSetsPerMatch).toBe(2.67);

    // Transparência: declaração explícita de ausência de duração
    expect(m.durationNotice).toContain('Duração de partida não registrada');
  });

  it('trata partida com 3 sets com setsScoreLabel e setsBreakdownLabel corretos', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: [mockMatches[0]],
      teams: mockTeams,
    });

    const matchRow = reportData.matches[0];
    expect(matchRow.matchNumber).toBe(101);
    expect(matchRow.teamAName).toBe('Alvorada Voleibol Clube');
    expect(matchRow.teamBName).toBe('Cruzeiro Vôlei');
    expect(matchRow.teamASetsWon).toBe(3);
    expect(matchRow.teamBSetsWon).toBe(0);
    expect(matchRow.setsScoreLabel).toBe('3 x 0');
    expect(matchRow.setsBreakdownLabel).toBe('25-20, 25-18, 25-22');
    expect(matchRow.teamAPoints).toBe(75);
    expect(matchRow.teamBPoints).toBe(60);
    expect(matchRow.pointDifference).toBe(15);
    expect(matchRow.winnerName).toBe('Alvorada Voleibol Clube');
    expect(matchRow.durationLabel).toBe('Não registrada');
  });

  it('trata partida com 5 sets (tiebreak) corretamente', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: [mockMatches[1]],
      teams: mockTeams,
    });

    const matchRow = reportData.matches[0];
    expect(matchRow.matchNumber).toBe(102);
    expect(matchRow.setsPlayed).toBe(5);
    expect(matchRow.teamASetsWon).toBe(3);
    expect(matchRow.teamBSetsWon).toBe(2);
    expect(matchRow.setsScoreLabel).toBe('3 x 2');
    expect(matchRow.setsBreakdownLabel).toBe('25-23, 20-25, 25-21, 22-25, 15-12');
    expect(matchRow.sets.length).toBe(5);
    expect(matchRow.statusLabel).toBe('Homologada');
  });

  it('trata partida WO com pontuação canônica CBV/FIVB', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: [mockMatches[2]],
      teams: mockTeams,
    });

    const matchRow = reportData.matches[0];
    expect(matchRow.isWo).toBe(true);
    expect(matchRow.setsPlayed).toBe(0);
    expect(matchRow.setsScoreLabel).toBe('2 x 0');
    expect(matchRow.statusLabel).toBe('W.O.');
    expect(matchRow.setsBreakdownLabel).toBe('W.O. (Vitória Equipe A)');
    expect(matchRow.teamAPoints).toBe(50); // Pontos canônicos de W.O. (2x25)
    expect(matchRow.teamBPoints).toBe(0);
    expect(matchRow.winnerName).toBe('Alvorada Voleibol Clube');
  });

  it('trata partida agendada (sem sets / sem resultado) com elegância', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: [mockMatches[4]],
      teams: mockTeams,
    });

    const matchRow = reportData.matches[0];
    expect(matchRow.setsPlayed).toBe(0);
    expect(matchRow.setsScoreLabel).toBe('—');
    expect(matchRow.setsBreakdownLabel).toBe('—');
    expect(matchRow.statusLabel).toBe('Agendada');
  });

  it('trata partida em andamento sem considerá-la concluída', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: [mockMatches[3]],
      teams: mockTeams,
    });

    const matchRow = reportData.matches[0];
    expect(matchRow.isCompleted).toBe(false);
    expect(matchRow.statusLabel).toBe('Em Andamento');
    expect(matchRow.setsPlayed).toBe(2);
    expect(matchRow.setsScoreLabel).toBe('1 x 1');
  });

  it('calcula tabela consolidada de desempenho por equipe', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    const alv = reportData.teamSummaries.find((t) => t.teamId === 'team-alvorada');
    expect(alv).toBeDefined();
    // Alvorada:
    // match-1: V (3-0, pts 75-60)
    // match-3: V por WO (pts 50-0)
    // Total vitórias em jogos concluídos: 2 vitórias, 0 derrotas
    expect(alv?.wins).toBe(2);
    expect(alv?.losses).toBe(0);
    expect(alv?.winRate).toBe(100);
    expect(alv?.setsWon).toBe(5); // 3 (match-1) + 2 (WO)
    expect(alv?.setsLost).toBe(0);
    expect(alv?.pointsScored).toBe(125); // 75 (match-1) + 50 (WO)
    expect(alv?.pointBalance).toBe(65); // 125 - 60 = +65
  });

  it('funciona perfeitamente para competição de Vôlei de Praia (Beach Volleyball)', () => {
    const beachMatch: MatchRecord = {
      id: 'match-beach-1',
      competitionId: 'comp-beach-1',
      matchNumber: 1,
      round: 1,
      scheduledTime: '2026-03-21T09:00:00',
      venue: 'Arena Praia',
      court: 'Quadra Central',
      phase: 'Final',
      teamAId: 'team-alvorada',
      teamBId: 'team-cruzeiro',
      teamAName: 'Alvorada Voleibol Clube',
      teamBName: 'Cruzeiro Vôlei',
      teamAShortName: 'ALV',
      teamBShortName: 'CRU',
      referees: [],
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 21, scoreB: 18 },
        { setNumber: 2, scoreA: 21, scoreB: 19 },
      ],
      winnerId: 'team-alvorada',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionBeach,
      matches: [beachMatch],
      teams: mockTeams,
    });

    expect(reportData.competitionModality).toBe('beach');
    expect(reportData.metrics.totalSetsPlayed).toBe(2);
    expect(reportData.matches[0].setsScoreLabel).toBe('2 x 0');
    expect(reportData.matches[0].setsBreakdownLabel).toBe('21-18, 21-19');
    expect(reportData.matches[0].teamAPoints).toBe(42);
    expect(reportData.matches[0].teamBPoints).toBe(37);
  });

  it('ordena partidas cronologicamente de forma determinística', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    const matchNumbers = reportData.matches.map((m) => m.matchNumber);
    expect(matchNumbers).toEqual([101, 102, 103, 104, 105, 106]);
  });

  it('retorna estrutura segura para competição sem partidas', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: [],
      teams: mockTeams,
    });

    expect(reportData.metrics.totalMatches).toBe(0);
    expect(reportData.metrics.completedMatches).toBe(0);
    expect(reportData.metrics.totalPointsScored).toBe(0);
    expect(reportData.matches).toEqual([]);
    expect(reportData.teamSummaries.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes dos Helpers de Formatação
// ─────────────────────────────────────────────────────────────────────────────

describe('MatchStatisticsReportService - Helpers', () => {
  it('formata status de partida corretamente', () => {
    expect(formatMatchStatus('completed')).toBe('Finalizada');
    expect(formatMatchStatus('homologated')).toBe('Homologada');
    expect(formatMatchStatus('in-progress')).toBe('Em Andamento');
    expect(formatMatchStatus('scheduled')).toBe('Agendada');
    expect(formatMatchStatus('cancelled')).toBe('Cancelada');
    expect(formatMatchStatus('custom_status')).toBe('custom_status');
  });

  it('formata datas e horários corretamente', () => {
    expect(formatDate('2026-03-15')).toBe('15/03/2026');
    expect(formatDate(undefined)).toBe('—');
    expect(formatTime('2026-03-15T14:30:00')).toBe('14:30');
    expect(formatTime(undefined)).toBe('—');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes da Visualização HTML (MatchStatisticsReportView)
// ─────────────────────────────────────────────────────────────────────────────

describe('MatchStatisticsReportView - Interface HTML-First', () => {
  it('renderiza os 6 cards de métricas executivas', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    render(<MatchStatisticsReportView data={reportData} />);

    expect(screen.getByText(/Total de Jogos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Concluídos/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Sets Disputados/i)).toBeInTheDocument();
    expect(screen.getByText(/Pontos Totais/i)).toBeInTheDocument();
    expect(screen.getByText(/Média Sets\/Jogo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Duração$/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Não registrada/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza banner de transparência sobre ausência de cronômetro persistido', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    render(<MatchStatisticsReportView data={reportData} />);

    expect(
      screen.getByText(/Dados extraídos dos sets oficiais homologados/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sem cronômetro no DB/i),
    ).toBeInTheDocument();
  });

  it('permite alternar entre as abas de Confrontos e Desempenho por Equipe', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    render(<MatchStatisticsReportView data={reportData} />);

    const teamSummaryTab = screen.getByRole('tab', { name: /Desempenho por Equipe/i });
    fireEvent.click(teamSummaryTab);

    // Tabela de equipes deve estar visível
    expect(screen.getByText(/Saldo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Alvorada Voleibol Clube/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cruzeiro Vôlei/i).length).toBeGreaterThanOrEqual(1);
  });

  it('filtra confrontos por busca textual', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    render(<MatchStatisticsReportView data={reportData} />);

    const searchInput = screen.getByPlaceholderText(/Buscar equipe, fase, jogo.../i);
    fireEvent.change(searchInput, { target: { value: 'Estrela' } });

    // Deve exibir partidas com Estrela do Mar
    expect(screen.getAllByText(/#102/i).length).toBeGreaterThanOrEqual(1);
  });

  it('NUNCA exibe a marca legada "VolleyPro"', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    const { container } = render(<MatchStatisticsReportView data={reportData} />);

    expect(container.innerHTML).not.toContain('VolleyPro');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes de Geração de PDF Oficial
// ─────────────────────────────────────────────────────────────────────────────

describe('ReportsPdf - generateMatchStatisticsReportPdf', () => {
  it('gera documento PDF oficial com metadados e tabelas', () => {
    const reportData = buildMatchStatisticsReportData({
      competition: mockCompetitionIndoor,
      matches: mockMatches,
      teams: mockTeams,
    });

    const doc = generateMatchStatisticsReportPdf(reportData, 'Federação de Vôlei');
    expect(doc).toBeDefined();
    // Verifica número de páginas inicial
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
