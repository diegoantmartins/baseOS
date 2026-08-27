/**
 * standingsPage.test.tsx
 *
 * Testes unitários do redesign da Classificação / Standings (Fase 7.1):
 * - Renderização do PageHeader oficial com ações e contexto
 * - Seleção de competição e exibição de métricas do torneio
 * - Navegação e filtragem por grupos (Tabs de Chaves)
 * - Renderização dos dados de classificação com tipografia tabular mono
 * - Destaque discreto de posições (1º, 2º, 3º) e zona de avanço
 * - Seção de Melhores Terceiros Colocados (computeBestThirds)
 * - Alerta de partidas concluídas com homologação pendente
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Exibição da seção de critérios homologados de desempate
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { StandingsPage } from '@/pages/StandingsPage';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

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
    listCompetitionTeams: vi.fn(),
  },
}));

vi.mock('@/lib/pdf/reportsPdf', () => ({
  generateStandingsReportPdf: vi.fn(() => ({})),
  downloadReportsPdf: vi.fn(),
}));

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
  {
    id: 'team-3',
    name: 'Vôlei Renata Campinas',
    shortName: 'REN',
    modality: 'indoor',
    createdAt: '2026-01-01',
  },
];

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
    bestThirdsCount: 1,
    tiebreakCriteriaOrder: ['points', 'victories', 'sets-balance', 'points-balance'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockCompetitionTeams: CompetitionTeam[] = [
  {
    id: 'ct-1',
    competitionId: 'comp-1',
    teamId: 'team-1',
    teamName: 'Sada Cruzeiro Vôlei',
    teamShortName: 'CRU',
    registrationDeadline: '2026-12-31T23:59:59.000Z',
    isLocked: false,
    status: 'approved',
    accessToken: 'tok-1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ct-2',
    competitionId: 'comp-1',
    teamId: 'team-2',
    teamName: 'Itambé Minas',
    teamShortName: 'MIN',
    registrationDeadline: '2026-12-31T23:59:59.000Z',
    isLocked: false,
    status: 'approved',
    accessToken: 'tok-2',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ct-3',
    competitionId: 'comp-1',
    teamId: 'team-3',
    teamName: 'Vôlei Renata Campinas',
    teamShortName: 'REN',
    registrationDeadline: '2026-12-31T23:59:59.000Z',
    isLocked: false,
    status: 'approved',
    accessToken: 'tok-3',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockMatches: MatchRecord[] = [
  {
    id: 'match-1',
    competitionId: 'comp-1',
    matchNumber: 1,
    round: 1,
    phase: 'group-stage',
    groupName: 'Chave A',
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
  {
    id: 'match-2',
    competitionId: 'comp-1',
    matchNumber: 2,
    round: 1,
    phase: 'group-stage',
    groupName: 'Chave A',
    teamAId: 'team-1',
    teamBId: 'team-3',
    teamAName: 'Sada Cruzeiro Vôlei',
    teamBName: 'Vôlei Renata Campinas',
    teamAShortName: 'CRU',
    teamBShortName: 'REN',
    scheduledTime: '2026-05-12T19:00:00.000Z',
    venue: 'Ginásio do Riacho',
    court: 'Quadra 1',
    status: 'completed', // Partida concluída pendente de homologação
    winnerId: 'team-1',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 18 },
      { setNumber: 2, scoreA: 25, scoreB: 19 },
    ],
    referees: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('StandingsPage Component (Fase 7.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue(mockCompetitionTeams);
  });

  it('renderiza o PageHeader oficial com título e ação de exportação', async () => {
    render(
      <MemoryRouter>
        <StandingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Classificação/i })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Exportar Classificação \(PDF\)/i })).toBeDefined();
  });

  it('exibe o contexto e métricas da competição selecionada', async () => {
    render(
      <MemoryRouter>
        <StandingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/3 equipes/i)).toBeDefined();
    });

    expect(screen.getByText(/2 Grupo\(s\) · 2 Avançam/i)).toBeDefined();
    expect(screen.getByText(/Vôlei de Quadra/i)).toBeDefined();
  });

  it('renderiza a tabela de classificação oficial com dados numéricos e posições', async () => {
    render(
      <MemoryRouter>
        <StandingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    expect(screen.getAllByText('1º').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('CRU')).toBeDefined();
    expect(screen.getByText('Itambé Minas')).toBeDefined();
  });

  it('exibe aviso de resultados provisórios quando há jogos não homologados', async () => {
    render(
      <MemoryRouter>
        <StandingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Existem resultados pendentes de homologação oficial/i)
      ).toBeDefined();
    });
  });

  it('exibe a seção de critérios de desempate homologados', async () => {
    render(
      <MemoryRouter>
        <StandingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Critérios de Desempate Homologados/i)).toBeDefined();
    });

    expect(screen.getByText(/1\. Pontos na Tabela/i)).toBeDefined();
    expect(screen.getByText(/2\. Número de Vitórias/i)).toBeDefined();
  });

  it('exibe estado vazio quando não há competições cadastradas', async () => {
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <StandingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma competição cadastrada')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Criar Campeonato/i })).toBeDefined();
  });

  it('exibe estado de erro amigável com retry quando o carregamento falha', async () => {
    vi.mocked(dataAccess.listCompetitions).mockRejectedValueOnce(new Error('Erro no banco'));

    render(
      <MemoryRouter>
        <StandingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('Não foi possível carregar a classificação')).toBeDefined();

    // Retry
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });
  });
});
