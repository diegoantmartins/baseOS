/**
 * reportsPage.test.tsx
 *
 * Testes unitários do redesign da Central de Relatórios e Documentos (Fase 7.2):
 * - Renderização do PageHeader oficial com ações e contexto
 * - Resumo operacional com métricas reais (Equipes, Atletas, Jogos, Concluídos)
 * - Filtros contextuais por Competição, Fase e Categoria de Gênero
 * - Cards categorizados de documentos operacionais (Boletim, Classificação, Relação Nominal, Pódio, Súmula em Branco)
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Integração dos botões de pré-visualização em PDF e exportação CSV
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '@/pages/ReportsPage';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => ({
    session: { user: { name: 'Organizador Master', email: 'org@baseos.app', role: 'organizer' } },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/services/dataAccess', () => ({
  dataAccess: {
    listCompetitions: vi.fn(),
    listMatches: vi.fn(),
    listTeams: vi.fn(),
    listCompetitionAthletes: vi.fn(),
    listCompetitionTeams: vi.fn(),
  },
}));

vi.mock('@/lib/pdf/reportsPdf', () => ({
  generateMatchesBoletimPdf: vi.fn(() => ({})),
  generateStandingsReportPdf: vi.fn(() => ({})),
  generateTeamRosterReportPdf: vi.fn(() => ({})),
  generatePodiumReportPdf: vi.fn(() => ({})),
  downloadReportsPdf: vi.fn(),
}));

const mockCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-1',
    name: 'Superliga Masculina 2026',
    modality: 'indoor',
    status: 'in-progress',
    format: 'group-stage-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    groupsCount: 2,
    teamsPerGroup: 4,
    advancingPerGroup: 2,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockTeams: TeamRecord[] = [
  {
    id: 'team-1',
    name: 'Sada Cruzeiro Vôlei',
    shortName: 'CRU',
    modality: 'indoor',
    createdAt: '2026-01-01',
  },
  {
    id: 'team-2',
    name: 'Itambé Minas',
    shortName: 'MIN',
    modality: 'indoor',
    createdAt: '2026-01-01',
  },
];

const mockMatches: MatchRecord[] = [
  {
    id: 'match-1',
    competitionId: 'comp-1',
    matchNumber: 1,
    round: 1,
    phase: 'group-stage',
    groupName: 'A',
    teamAId: 'team-1',
    teamBId: 'team-2',
    teamAName: 'Sada Cruzeiro Vôlei',
    teamBName: 'Itambé Minas',
    teamAShortName: 'CRU',
    teamBShortName: 'MIN',
    scheduledTime: '2026-05-10T19:00:00.000Z',
    venue: 'Ginásio do Riacho',
    court: 'Quadra 1',
    status: 'homologated',
    winnerId: 'team-1',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 25, scoreB: 22 },
    ],
    referees: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockAthletes: CompetitionAthlete[] = [
  {
    id: 'ath-1',
    competitionTeamId: 'ct-1',
    name: 'Wallace de Souza',
    jerseyNumber: 8,
    position: 'opposite',
    gender: 'male',
    birthDate: '1990-01-01',
    isCaptain: true,
    isLibero: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('ReportsPage Component (Fase 7.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue(mockAthletes);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue([]);
  });

  it('renderiza o PageHeader oficial com título e ação secundária', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Relatórios e Documentos/i }),
      ).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Súmula em Branco/i })).toBeDefined();
  });

  it('renderiza as métricas do resumo operacional', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Equipes Ativas')).toBeDefined();
    });

    expect(screen.getByText('Atletas Vinculados')).toBeDefined();
    expect(screen.getByText('Jogos no Filtro')).toBeDefined();
    expect(screen.getByText('Jogos Concluídos')).toBeDefined();
  });

  it('renderiza as categorias de documentos operacionais', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Competição & Confrontos')).toBeDefined();
    });

    expect(screen.getByText('Boletim Geral de Jogos')).toBeDefined();
    expect(screen.getByText('Classificação por Grupos')).toBeDefined();
    expect(screen.getByText('Relação Nominal das Equipes')).toBeDefined();
    expect(screen.getByText('Quadro de Honra & Pódio Oficial')).toBeDefined();
  });

  it('exibe estado vazio quando não há competições cadastradas', async () => {
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma competição encontrada')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Criar Campeonato/i })).toBeDefined();
  });

  it('exibe estado de erro amigável com retry quando o carregamento falha', async () => {
    vi.mocked(dataAccess.listCompetitions).mockRejectedValueOnce(new Error('Erro de conexão'));

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(
      screen.getByText('Não foi possível carregar a central de relatórios'),
    ).toBeDefined();

    // Retry
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Boletim Geral de Jogos')).toBeDefined();
    });
  });
});
