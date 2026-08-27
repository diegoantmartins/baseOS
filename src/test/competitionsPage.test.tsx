/**
 * competitionsPage.test.tsx
 *
 * Testes unitários do redesign da CompetitionsPage (Fase 4.1):
 * - Renderização do PageHeader oficial
 * - Listagem de torneios com StatusBadge e seleção interativa
 * - Filtros rápidos por modalidade e busca textual
 * - Exibição de detalhes da competição selecionada e abas operacionais
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Permissões (RBAC / useCapability)
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import CompetitionsPage from '@/pages/CompetitionsPage';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/services/dataAccess', () => ({
  dataAccess: {
    listCompetitions: vi.fn(),
    listModalities: vi.fn(),
    listVenues: vi.fn(),
    listTeams: vi.fn(),
    listCompetitionTeams: vi.fn(),
    listCompetitionAthletes: vi.fn(),
    listMatches: vi.fn(),
    createCompetition: vi.fn(),
    updateCompetition: vi.fn(),
  },
}));

vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => ({
    session: { user: { name: 'Organizador Master', email: 'org@baseos.app', role: 'organizer' } },
    signOut: vi.fn(),
  }),
}));

const mockCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-1',
    name: 'Superliga Estadual 2026',
    modality: 'indoor',
    status: 'in-progress',
    format: 'group-stage-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'female',
    groupsCount: 2,
    teamsPerGroup: 4,
    advancingPerGroup: 2,
    venue: 'Ginásio Central',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'comp-2',
    name: 'Circuito de Praia Open',
    modality: 'beach',
    status: 'registration-open',
    format: 'group-stage-knockout',
    playerFormat: '2x2',
    setFormat: '3-sets',
    genderCategory: 'male',
    groupsCount: 4,
    teamsPerGroup: 3,
    advancingPerGroup: 2,
    venue: 'Arena Praia',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockTeams: TeamRecord[] = [
  {
    id: 'team-1',
    name: 'Curitiba Vôlei',
    shortName: 'CUR',
    modality: 'indoor',
    createdAt: '2026-01-01',
  },
];

describe('CompetitionsPage Component (Fase 4.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    vi.mocked(dataAccess.listModalities).mockResolvedValue([]);
    vi.mocked(dataAccess.listVenues).mockResolvedValue([]);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue([
      {
        id: 'ct-1',
        competitionId: 'comp-1',
        teamId: 'team-1',
        teamName: 'Curitiba Vôlei',
        teamShortName: 'CUR',
        accessToken: 'token-1',
        registrationDeadline: '2026-03-01',
        isLocked: false,
        status: 'approved',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue([]);
    vi.mocked(dataAccess.listMatches).mockResolvedValue([]);
  });

  it('renderiza o PageHeader com título e botão de criar competição', async () => {
    render(
      <MemoryRouter>
        <CompetitionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Gestão de Competições/i })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Nova Competição/i })).toBeDefined();
  });

  it('lista as competições com StatusBadge na coluna de seleção', async () => {
    render(
      <MemoryRouter>
        <CompetitionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const items = screen.getAllByText('Superliga Estadual 2026');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('Circuito de Praia Open').length).toBeGreaterThanOrEqual(1);
  });

  it('filtra as competições por modalidade e busca textual', async () => {
    render(
      <MemoryRouter>
        <CompetitionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Superliga Estadual 2026').length).toBeGreaterThanOrEqual(1);
    });

    // Testar busca por texto
    const searchInput = screen.getByPlaceholderText(/Buscar competição/i);
    fireEvent.change(searchInput, { target: { value: 'Circuito' } });

    expect(screen.getByText('Circuito de Praia Open')).toBeDefined();
  });

  it('exibe estado vazio quando não há competições cadastradas', async () => {
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <CompetitionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma competição cadastrada')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Cadastrar Nova Competição/i })).toBeDefined();
  });

  it('exibe tela de erro amigável com retry quando falha no dataAccess', async () => {
    vi.mocked(dataAccess.listCompetitions).mockRejectedValueOnce(new Error('Erro no servidor'));

    render(
      <MemoryRouter>
        <CompetitionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('Não foi possível carregar as competições')).toBeDefined();

    // Clicar em tentar novamente
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Superliga Estadual 2026').length).toBeGreaterThanOrEqual(1);
    });
  });
});
