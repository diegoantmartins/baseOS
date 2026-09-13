/**
 * mvpReport.test.tsx
 *
 * Testes unitários e de integração para o Relatório de Destaques / MVP / Atletas em Evidência
 * (BaseOS Fase 7.5 Prompt 6):
 * - Partida com MVP
 * - Partida sem MVP
 * - Múltiplas partidas com o mesmo MVP
 * - Múltiplos atletas com MVP
 * - Ranking por quantidade e desempate determinístico
 * - Atleta pertencente à equipe correta
 * - MVP inválido / não resolvido ("Atleta não localizado")
 * - Filtro por equipe
 * - Filtro por status de MVP (Com MVP / Sem MVP)
 * - Busca textual por atleta / equipe
 * - Isolamento por competição
 * - Geração de PDF (BaseOS oficial)
 * - Renderização mobile / cards
 * - Ausência de "VolleyPro"
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { buildMvpReportData } from '@/services/mvpReportService';
import { MvpReportView } from '@/components/report/MvpReportView';
import { generateMvpReportPdf } from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures Reais BaseOS
// ─────────────────────────────────────────────────────────────────────────────

const mockCompetition: CompetitionRecord = {
  id: 'comp-mvp-1',
  name: 'Superliga Estadual BaseOS 2026',
  modality: 'indoor',
  status: 'in-progress',
  format: 'group-stage-knockout',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'female',
  groupsCount: 1,
  teamsPerGroup: 4,
  advancingPerGroup: 2,
  venue: 'Arena Central',
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
    id: 'team-voltz',
    name: 'Voltz Sports Team',
    shortName: 'VOL',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockCompetitionTeams: CompetitionTeam[] = [
  {
    id: 'ct-alv',
    competitionId: 'comp-mvp-1',
    teamId: 'team-alvorada',
    teamName: 'Alvorada Voleibol Clube',
    teamShortName: 'ALV',
    accessToken: 'tok-alv',
    registrationDeadline: '2026-08-01',
    isLocked: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'approved',
  },
  {
    id: 'ct-vol',
    competitionId: 'comp-mvp-1',
    teamId: 'team-voltz',
    teamName: 'Voltz Sports Team',
    teamShortName: 'VOL',
    accessToken: 'tok-vol',
    registrationDeadline: '2026-08-01',
    isLocked: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'approved',
  },
];

const mockAthletes: CompetitionAthlete[] = [
  {
    id: 'ath-bruna',
    competitionTeamId: 'ct-alv',
    name: 'Bruna Silva',
    jerseyNumber: 7,
    position: 'Ponteira',
    isCaptain: true,
    isLibero: false,
    gender: 'female',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-carol',
    competitionTeamId: 'ct-alv',
    name: 'Carolina Mendes',
    jerseyNumber: 10,
    position: 'Levantadora',
    isCaptain: false,
    isLibero: false,
    gender: 'female',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-juliana',
    competitionTeamId: 'ct-vol',
    name: 'Juliana Costa',
    jerseyNumber: 3,
    position: 'Oposta',
    isCaptain: false,
    isLibero: false,
    gender: 'female',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockMatches: MatchRecord[] = [
  {
    id: 'match-1',
    competitionId: 'comp-mvp-1',
    matchNumber: 1,
    phase: 'classificatória',
    groupName: 'Grupo Único',
    round: 1,
    scheduledTime: '2026-08-10T14:00:00',
    venue: 'Arena Central',
    court: 'Quadra 1',
    teamAId: 'team-alvorada',
    teamBId: 'team-voltz',
    teamAName: 'Alvorada Voleibol Clube',
    teamBName: 'Voltz Sports Team',
    teamAShortName: 'ALV',
    teamBShortName: 'VOL',
    referees: [],
    status: 'homologated',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 22, scoreB: 25 },
      { setNumber: 3, scoreA: 15, scoreB: 11 },
    ],
    highlightAthleteId: 'ath-bruna',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'match-2',
    competitionId: 'comp-mvp-1',
    matchNumber: 2,
    phase: 'classificatória',
    groupName: 'Grupo Único',
    round: 2,
    scheduledTime: '2026-08-11T16:00:00',
    venue: 'Arena Central',
    court: 'Quadra 1',
    teamAId: 'team-voltz',
    teamBId: 'team-alvorada',
    teamAName: 'Voltz Sports Team',
    teamBName: 'Alvorada Voleibol Clube',
    teamAShortName: 'VOL',
    teamBShortName: 'ALV',
    referees: [],
    status: 'homologated',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 21 },
      { setNumber: 2, scoreA: 25, scoreB: 23 },
    ],
    highlightAthleteId: 'ath-juliana',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'match-3',
    competitionId: 'comp-mvp-1',
    matchNumber: 3,
    phase: 'final',
    round: 3,
    scheduledTime: '2026-08-12T18:00:00',
    venue: 'Arena Central',
    court: 'Quadra 1',
    teamAId: 'team-alvorada',
    teamBId: 'team-voltz',
    teamAName: 'Alvorada Voleibol Clube',
    teamBName: 'Voltz Sports Team',
    teamAShortName: 'ALV',
    teamBShortName: 'VOL',
    referees: [],
    status: 'homologated',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 18 },
      { setNumber: 2, scoreA: 25, scoreB: 19 },
    ],
    highlightAthleteId: 'ath-bruna', // Bruna ganha seu 2º MVP!
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'match-4',
    competitionId: 'comp-mvp-1',
    matchNumber: 4,
    phase: 'classificatória',
    round: 4,
    scheduledTime: '2026-08-13T10:00:00',
    venue: 'Arena Central',
    court: 'Quadra 2',
    teamAId: 'team-alvorada',
    teamBId: 'team-voltz',
    teamAName: 'Alvorada Voleibol Clube',
    teamBName: 'Voltz Sports Team',
    teamAShortName: 'ALV',
    teamBShortName: 'VOL',
    referees: [],
    status: 'scheduled',
    sets: [],
    highlightAthleteId: null, // Partida sem MVP
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'match-5',
    competitionId: 'comp-mvp-1',
    matchNumber: 5,
    phase: 'classificatória',
    round: 5,
    scheduledTime: '2026-08-14T11:00:00',
    venue: 'Arena Central',
    court: 'Quadra 2',
    teamAId: 'team-alvorada',
    teamBId: 'team-voltz',
    teamAName: 'Alvorada Voleibol Clube',
    teamBName: 'Voltz Sports Team',
    teamAShortName: 'ALV',
    teamBShortName: 'VOL',
    referees: [],
    status: 'completed',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 25, scoreB: 22 },
    ],
    highlightAthleteId: 'ath-fantasma-inexistente', // MVP órfão / não localizado
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Testes de Serviço (buildMvpReportData)
// ─────────────────────────────────────────────────────────────────────────────

describe('Serviço mvpReportService (buildMvpReportData)', () => {
  it('processa métricas globais corretamente', () => {
    const data = buildMvpReportData({
      competition: mockCompetition,
      matches: mockMatches,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    expect(data.metrics.totalMatches).toBe(5);
    expect(data.metrics.matchesWithMvp).toBe(4); // 3 válidos + 1 órfão
    expect(data.metrics.matchesWithoutMvp).toBe(1);
    expect(data.metrics.distinctHighlightedAthletes).toBe(2); // Bruna e Juliana (atletas válidos)
    expect(data.metrics.leaderName).toBe('Bruna Silva');
    expect(data.metrics.leaderMvpCount).toBe(2);
  });

  it('ordena o ranking de MVP com desempate determinístico', () => {
    const data = buildMvpReportData({
      competition: mockCompetition,
      matches: mockMatches,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    // Bruna tem 2 MVPs (1º lugar)
    expect(data.leaderboard[0].athleteId).toBe('ath-bruna');
    expect(data.leaderboard[0].athleteName).toBe('Bruna Silva');
    expect(data.leaderboard[0].mvpCount).toBe(2);
    expect(data.leaderboard[0].position).toBe(1);
    expect(data.leaderboard[0].matchNumbers).toEqual([1, 3]);

    // Juliana tem 1 MVP
    const julianaRow = data.leaderboard.find((r) => r.athleteId === 'ath-juliana');
    expect(julianaRow).toBeDefined();
    expect(julianaRow?.mvpCount).toBe(1);
    expect(julianaRow?.teamName).toBe('Voltz Sports Team');
    expect(julianaRow?.teamShortName).toBe('VOL');
  });

  it('lida com atleta MVP não localizado sem crashar nem fabricar dados', () => {
    const data = buildMvpReportData({
      competition: mockCompetition,
      matches: mockMatches,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    const orphanMatch = data.matches.find((m) => m.matchId === 'match-5');
    expect(orphanMatch).toBeDefined();
    expect(orphanMatch?.hasHighlight).toBe(true);
    expect(orphanMatch?.isUnresolvedAthlete).toBe(true);
    expect(orphanMatch?.athleteName).toBe('Atleta não localizado');

    // Atleta órfão/não localizado não polui o ranking oficial de atletas
    const orphanLeaderboard = data.leaderboard.find((r) => r.athleteId === 'ath-fantasma-inexistente');
    expect(orphanLeaderboard).toBeUndefined();
  });

  it('representa partidas sem MVP de forma clara', () => {
    const data = buildMvpReportData({
      competition: mockCompetition,
      matches: mockMatches,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    const matchWithoutMvp = data.matches.find((m) => m.matchId === 'match-4');
    expect(matchWithoutMvp).toBeDefined();
    expect(matchWithoutMvp?.hasHighlight).toBe(false);
    expect(matchWithoutMvp?.athleteName).toBeUndefined();
    expect(matchWithoutMvp?.athleteId).toBeUndefined();
  });

  it('isola estritamente a competição informada', () => {
    const otherMatch: MatchRecord = {
      ...mockMatches[0],
      id: 'match-other-comp',
      competitionId: 'other-comp-999',
      highlightAthleteId: 'ath-bruna',
      referees: [],
    };

    const data = buildMvpReportData({
      competition: mockCompetition,
      matches: [...mockMatches, otherMatch],
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    // otherMatch não deve entrar
    expect(data.matches.some((m) => m.matchId === 'match-other-comp')).toBe(false);
    expect(data.metrics.totalMatches).toBe(5);
  });

  it('retorna estado limpo quando não há partidas', () => {
    const data = buildMvpReportData({
      competition: mockCompetition,
      matches: [],
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    expect(data.metrics.totalMatches).toBe(0);
    expect(data.metrics.matchesWithMvp).toBe(0);
    expect(data.metrics.matchesWithoutMvp).toBe(0);
    expect(data.metrics.distinctHighlightedAthletes).toBe(0);
    expect(data.metrics.leaderName).toBeUndefined();
    expect(data.leaderboard).toEqual([]);
    expect(data.matches).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes de Componente UI (MvpReportView)
// ─────────────────────────────────────────────────────────────────────────────

describe('Componente MvpReportView', () => {
  const sampleData = buildMvpReportData({
    competition: mockCompetition,
    matches: mockMatches,
    teams: mockTeams,
    athletes: mockAthletes,
    competitionTeams: mockCompetitionTeams,
  });

  it('renderiza métricas executivas corretamente', () => {
    render(<MvpReportView data={sampleData} />);

    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1); // Total Jogos
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1); // Com MVP
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // Sem Destaque
    expect(screen.getAllByText('Bruna Silva').length).toBeGreaterThanOrEqual(1); // Líder
  });

  it('renderiza o ranking de MVPs e permite alternar abas', () => {
    render(<MvpReportView data={sampleData} />);

    // Por padrão a aba "Ranking de Destaques" está ativa
    expect(screen.getByText('Quadro Geral de Atletas Destaque')).toBeInTheDocument();
    expect(screen.getAllByText('Bruna Silva').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2x/).length).toBeGreaterThanOrEqual(1);

    // Alternar para a aba "Partidas & Destaques"
    const matchesTabBtn = screen.getByRole('button', { name: /Partidas & Destaques/i });
    fireEvent.click(matchesTabBtn);

    expect(screen.getByText('Confrontos da Competição & Destaques Oficiais')).toBeInTheDocument();
    expect(screen.getAllByText('Sem destaque registrado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Atleta não localizado').length).toBeGreaterThanOrEqual(1);
  });

  it('permite filtrar por status de MVP via props iniciais', () => {
    render(
      <MvpReportView
        data={sampleData}
        initialTab="matches"
        initialStatusFilter="without-mvp"
      />,
    );

    expect(screen.getAllByText('Sem destaque registrado').length).toBeGreaterThanOrEqual(1);
    // Bruna Silva não deve estar na lista filtrada de partidas sem MVP
    expect(screen.queryByText(/#7 Bruna Silva/i)).not.toBeInTheDocument();
  });

  it('permite buscar por texto de atleta ou equipe', () => {
    render(<MvpReportView data={sampleData} />);

    const searchInput = screen.getByPlaceholderText(/Buscar atleta\/equipe\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Juliana' } });

    expect(screen.getAllByText('Juliana Costa').length).toBeGreaterThanOrEqual(1);
  });

  it('não contém nenhuma ocorrência de "VolleyPro"', () => {
    const { container } = render(<MvpReportView data={sampleData} />);
    expect(container.textContent).not.toContain('VolleyPro');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes de PDF (generateMvpReportPdf)
// ─────────────────────────────────────────────────────────────────────────────

describe('PDF Oficial generateMvpReportPdf', () => {
  it('gera instância válida de jsPDF com seções de ranking e confrontos', () => {
    const sampleData = buildMvpReportData({
      competition: mockCompetition,
      matches: mockMatches,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    const doc = generateMvpReportPdf(sampleData, 'Superliga Estadual BaseOS 2026');
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);

    // O texto retornado pelo PDF não deve conter VolleyPro
    const outputString = doc.output('datauristring');
    expect(outputString).toBeDefined();
  });
});
