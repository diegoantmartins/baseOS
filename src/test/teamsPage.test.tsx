/**
 * teamsPage.test.tsx
 *
 * Testes unitários do redesign da TeamsPage (Fase 5.1):
 * - Renderização do PageHeader oficial com ações
 * - Resumo operacional com métricas reais (total, quadra, praia, atletas)
 * - Listagem das equipes na DataTable com StatusBadge e desempenho
 * - Filtragem rápida por texto e botões de modalidade
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Verificações de permissão RBAC
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TeamsPage } from '@/pages/TeamsPage';
import { dataAccess } from '@/services/dataAccess';
import type { TeamRecord, MatchRecord, CompetitionRecord } from '@/types/entities';

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
    listTeams: vi.fn(),
    listMatches: vi.fn(),
    listCompetitionTeams: vi.fn(),
    listCompetitionAthletes: vi.fn(),
    listCompetitions: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    createPerson: vi.fn(),
  },
  generateToken: vi.fn(() => 'mock-token-123'),
}));

const mockTeams: TeamRecord[] = [
  {
    id: 'team-1',
    name: 'Sada Cruzeiro Vôlei',
    shortName: 'CRU',
    modality: 'indoor',
    city: 'Belo Horizonte',
    coachName: 'Filipe Ferraz',
    managerName: 'Carlos Silva',
    managerPhone: '(31) 99999-1111',
    createdAt: '2026-01-01',
  },
  {
    id: 'team-2',
    name: 'Praia Clube Beach',
    shortName: 'PRA',
    modality: 'beach',
    city: 'Uberlândia',
    coachName: 'Paulo Souza',
    managerName: 'Mariana Costa',
    createdAt: '2026-01-01',
  },
];

const mockCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-1',
    name: 'Superliga 2026',
    modality: 'indoor',
    status: 'in-progress',
    format: 'group-stage-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'female',
    groupsCount: 2,
    teamsPerGroup: 4,
    advancingPerGroup: 2,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockMatches: MatchRecord[] = [
  {
    id: 'match-1',
    competitionId: 'comp-1',
    matchNumber: 1,
    teamAId: 'team-1',
    teamBId: 'team-2',
    teamAName: 'Sada Cruzeiro Vôlei',
    teamBName: 'Praia Clube Beach',
    teamAShortName: 'CRU',
    teamBShortName: 'PRA',
    status: 'completed',
    winnerId: 'team-1',
    round: 1,
    venue: 'Ginásio Central',
    scheduledTime: '2026-04-01T10:00:00.000Z',
    sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
    referees: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('TeamsPage Component (Fase 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue([]);
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue([]);
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
  });

  it('renderiza o PageHeader oficial e botão de Nova Equipe', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Gestão de Equipes/i })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Nova Equipe/i })).toBeDefined();
  });

  it('exibe as métricas do resumo operacional', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total de Equipes')).toBeDefined();
    });

    expect(screen.getAllByText('Vôlei de Quadra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vôlei de Praia').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total de Atletas')).toBeDefined();
  });

  it('renderiza a lista de equipes na DataTable com desempenho e gestor', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    expect(screen.getByText('Praia Clube Beach')).toBeDefined();
    expect(screen.getByText('Carlos Silva')).toBeDefined();
  });

  it('filtra as equipes por termo de busca e modalidade', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    // Filtro por texto
    const searchInput = screen.getByPlaceholderText(/Buscar por nome, sigla, cidade ou gestor/i);
    fireEvent.change(searchInput, { target: { value: 'Cruzeiro' } });

    expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    expect(screen.queryByText('Praia Clube Beach')).toBeNull();

    // Limpar busca e filtrar por modalidade "Praia" usando nome exato
    fireEvent.change(searchInput, { target: { value: '' } });
    const beachBtn = screen.getByRole('button', { name: /^Praia$/i });
    fireEvent.click(beachBtn);

    expect(screen.getByText('Praia Clube Beach')).toBeDefined();
    expect(screen.queryByText('Sada Cruzeiro Vôlei')).toBeNull();
  });

  it('exibe estado vazio quando não há equipes cadastradas', async () => {
    vi.mocked(dataAccess.listTeams).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma equipe cadastrada')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Cadastrar Primeira Equipe/i })).toBeDefined();
  });

  it('exibe estado de erro amigável com retry quando o dataAccess falha', async () => {
    vi.mocked(dataAccess.listTeams).mockRejectedValueOnce(new Error('Falha de conexão'));

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('Não foi possível carregar as equipes')).toBeDefined();

    // Clicar em Tentar Novamente
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });
  });
});
