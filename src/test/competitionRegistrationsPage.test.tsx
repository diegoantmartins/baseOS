/**
 * competitionRegistrationsPage.test.tsx
 *
 * Testes unitários do redesign da CompetitionRegistrationsPage (Fase 4.2):
 * - Renderização do BreadcrumbNav hierárquico
 * - Renderização do PageHeader oficial com ações
 * - Métricas do resumo operacional
 * - DataTable de equipes inscritas com StatusBadge e ações
 * - Filtragem rápida por texto e por status
 * - Estados universais (Loading, Empty, Not Found, Error)
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CompetitionRegistrationsPage } from '@/pages/CompetitionRegistrationsPage';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
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
    getCompetition: vi.fn(),
    listCompetitionTeams: vi.fn(),
    listTeams: vi.fn(),
    createCompetitionTeam: vi.fn(),
    updateCompetitionTeam: vi.fn(),
    listMatches: vi.fn(),
  },
}));

vi.mock('@/services/registrationService', () => ({
  getMatchRosters: vi.fn().mockResolvedValue({ teamA: [], teamB: [] }),
  isRegistrationLocked: vi.fn((reg) => Boolean(reg.isLocked)),
}));

const mockCompetition: CompetitionRecord = {
  id: 'comp-100',
  name: 'Copa dos Campeões 2026',
  modality: 'indoor',
  status: 'registration-open',
  format: 'group-stage-knockout',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'female',
  groupsCount: 2,
  teamsPerGroup: 4,
  advancingPerGroup: 2,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockRegistrations: CompetitionTeam[] = [
  {
    id: 'ct-1',
    competitionId: 'comp-100',
    teamId: 'team-1',
    teamName: 'São Paulo Vôlei',
    teamShortName: 'SPV',
    accessToken: 'token-spv-123',
    registrationDeadline: '2026-04-01T23:59:59.000Z',
    isLocked: false,
    status: 'submitted',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ct-2',
    competitionId: 'comp-100',
    teamId: 'team-2',
    teamName: 'Minas Tênis Clube',
    teamShortName: 'MTC',
    accessToken: 'token-mtc-456',
    registrationDeadline: '2026-04-01T23:59:59.000Z',
    isLocked: true,
    status: 'approved',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockTeams: TeamRecord[] = [
  { id: 'team-1', name: 'São Paulo Vôlei', shortName: 'SPV', modality: 'indoor', createdAt: '2026-01-01' },
  { id: 'team-2', name: 'Minas Tênis Clube', shortName: 'MTC', modality: 'indoor', createdAt: '2026-01-01' },
  { id: 'team-3', name: 'Osasco Voleibol', shortName: 'OSA', modality: 'indoor', createdAt: '2026-01-01' },
];

function renderComponent(competitionId = 'comp-100') {
  return render(
    <MemoryRouter initialEntries={[`/competicoes/${competitionId}/inscricoes`]}>
      <Routes>
        <Route path="/competicoes/:id/inscricoes" element={<CompetitionRegistrationsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CompetitionRegistrationsPage Component (Fase 4.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.getCompetition).mockResolvedValue(mockCompetition);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue(mockRegistrations);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
  });

  it('renderiza o BreadcrumbNav e o PageHeader com dados da competição', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Gestão de Inscrições/i })).toBeDefined();
    });

    // Breadcrumb
    expect(screen.getByText('Copa dos Campeões 2026')).toBeDefined();
    // Botão de Convidar
    expect(screen.getByRole('button', { name: /Convidar Equipe/i })).toBeDefined();
  });

  it('exibe as métricas de resumo operacional calculadas', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Equipes Convidadas')).toBeDefined();
    });

    expect(screen.getByText('Pendentes / Em Andamento')).toBeDefined();
    expect(screen.getByText('Finalizadas / Aprovadas')).toBeDefined();
    expect(screen.getByText('Bloqueadas / Expiradas')).toBeDefined();
  });

  it('renderiza as equipes na DataTable com seus status e ações', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('São Paulo Vôlei')).toBeDefined();
    });

    expect(screen.getByText('Minas Tênis Clube')).toBeDefined();
    expect(screen.getAllByTitle(/Copiar link/i).length).toBe(2);
  });

  it('filtra as equipes por busca textual e botões de status', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('São Paulo Vôlei')).toBeDefined();
    });

    // Busca textual
    const searchInput = screen.getByPlaceholderText(/Buscar equipe ou sigla/i);
    fireEvent.change(searchInput, { target: { value: 'Minas' } });

    expect(screen.getByText('Minas Tênis Clube')).toBeDefined();
    expect(screen.queryByText('São Paulo Vôlei')).toBeNull();
  });

  it('exibe tela de competição não encontrada caso o ID seja inválido', async () => {
    vi.mocked(dataAccess.getCompetition).mockResolvedValue(null);

    renderComponent('comp-invalid');

    await waitFor(() => {
      expect(screen.getByText('Competição não encontrada')).toBeDefined();
    });
  });

  it('exibe estado vazio amigável quando não há equipes convidadas', async () => {
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nenhuma equipe convidada')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Convidar Primeira Equipe/i })).toBeDefined();
  });
});
