/**
 * dashboard.test.tsx
 *
 * Testes unitários do componente Dashboard da Fase 3:
 * - Renderização do PageHeader e botões de ação
 * - Cálculo de métricas e KPIs operacionais com dados reais
 * - Alertas operacionais (sorteio pendente, jogos sem quadra, homologação)
 * - Tabela de partidas com DataTable e StatusBadge
 * - Tratamento de erro e retry via StateContainer
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

// ─────────────────────────────────────────────────────────────────────────────
// Mock do dataAccess
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/services/dataAccess', () => ({
  dataAccess: {
    listCompetitions: vi.fn(),
    listTeams: vi.fn(),
    listCompetitionTeams: vi.fn(),
    listCompetitionAthletes: vi.fn(),
    listMatches: vi.fn(),
    listVenues: vi.fn(),
    listDraws: vi.fn(),
  },
}));

// Mock do AuthContext para o Header/MainLayout se necessário
vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => ({
    session: { user: { name: 'Organizador Master', email: 'org@baseos.app', role: 'organizer' } },
    signOut: vi.fn(),
  }),
}));

const mockCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-1',
    name: 'Copa Regional de Vôlei 2026',
    modality: 'indoor',
    status: 'in-progress',
    format: 'groups_and_playoffs',
    groupsCount: 2,
    teamsPerGroup: 4,
    advancingPerGroup: 2,
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    defaultDeadline: '2026-03-01',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockTeams: TeamRecord[] = [
  {
    id: 'team-1',
    name: 'Vôlei Clube Paraná',
    shortName: 'VCP',
    modality: 'indoor',
    city: 'Curitiba',
    state: 'PR',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-2',
    name: 'Associação Londrina',
    shortName: 'ALV',
    modality: 'indoor',
    city: 'Londrina',
    state: 'PR',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockMatches: MatchRecord[] = [
  {
    id: 'match-1',
    competitionId: 'comp-1',
    round: 1,
    matchNumber: 1,
    teamAId: 'team-1',
    teamBId: 'team-2',
    teamAName: 'Vôlei Clube Paraná',
    teamBName: 'Associação Londrina',
    teamAShortName: 'VCP',
    teamBShortName: 'ALV',
    venue: 'Ginásio do Tarumã',
    court: 'Quadra Central',
    status: 'scheduled',
    scheduledTime: '2026-08-26T14:00:00.000Z',
    referees: [],
    sets: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue([
      {
        id: 'ct-1',
        competitionId: 'comp-1',
        teamId: 'team-1',
        teamName: 'Vôlei Clube Paraná',
        teamShortName: 'VCP',
        accessToken: 'token-1',
        registrationDeadline: '2026-03-01',
        isLocked: false,
        status: 'approved',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'ct-2',
        competitionId: 'comp-1',
        teamId: 'team-2',
        teamName: 'Associação Londrina',
        teamShortName: 'ALV',
        accessToken: 'token-2',
        registrationDeadline: '2026-03-01',
        isLocked: false,
        status: 'approved',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue([
      {
        id: 'ca-1',
        competitionTeamId: 'ct-1',
        name: 'Carlos Silva',
        jerseyNumber: 7,
        position: 'setter',
        gender: 'male',
        isCaptain: false,
        isLibero: false,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listVenues).mockResolvedValue([]);
    vi.mocked(dataAccess.listDraws).mockResolvedValue([]);
  });

  it('renderiza o PageHeader com título e botões de ação', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Painel Geral/i })).toBeDefined();
    });

    const newCompBtns = screen.getAllByRole('button', { name: /Nova Competição/i });
    expect(newCompBtns.length).toBeGreaterThanOrEqual(1);
    const reportBtns = screen.getAllByRole('button', { name: /Relatórios/i });
    expect(reportBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('exibe as 4 métricas principais calculadas com dados reais', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Competições Ativas')).toBeDefined();
    });

    expect(screen.getByText('Equipes Cadastradas')).toBeDefined();
    expect(screen.getByText('Atletas no Sistema')).toBeDefined();
    expect(screen.getByText('Partidas Realizadas')).toBeDefined();

    expect(screen.getByText('1 cadastradas no total')).toBeDefined();
    expect(screen.getByText('2 inscrições em torneios')).toBeDefined();
  });

  it('exibe alerta de sorteio pendente quando há equipes suficientes sem sorteio realizado', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Alertas Operacionais/i)).toBeDefined();
    });

    expect(screen.getByText(/Sorteio pendente: Copa Regional de Vôlei 2026/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Realizar Sorteio/i })).toBeDefined();
  });

  it('renderiza a tabela de partidas do dia com dados e StatusBadge', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Vôlei Clube Paraná')).toBeDefined();
    });

    expect(screen.getByText('Associação Londrina')).toBeDefined();
    expect(screen.getByText('Quadra Central')).toBeDefined();
    // Status Agendado pelo StatusBadge
    expect(screen.getByText('Agendado')).toBeDefined();
  });

  it('exibe tela de erro e botão de retry quando o dataAccess falha', async () => {
    vi.mocked(dataAccess.listCompetitions).mockRejectedValueOnce(new Error('Erro de conexão ao banco'));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('Não foi possível carregar os dados do painel')).toBeDefined();
    expect(screen.getByText('Erro de conexão ao banco')).toBeDefined();

    // Testar o botão de retry
    vi.mocked(dataAccess.listCompetitions).mockResolvedValueOnce(mockCompetitions);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Competições Ativas')).toBeDefined();
    });
  });
});
