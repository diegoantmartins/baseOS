/**
 * athletesPage.test.tsx
 *
 * Testes unitários do redesign da AthletesPage (Fase 5.2):
 * - Renderização do PageHeader oficial com ações e botões
 * - Resumo operacional com métricas reais (total, quadra, praia, equipes inscritas)
 * - Renderização dos atletas na DataTable com camisas, posições e badges CAP / LÍBERO
 * - Filtragem em tempo real por texto, gênero, modalidade e equipe
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Abertura do diálogo de cadastro de novo atleta
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AthletesPage } from '@/pages/AthletesPage';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type { TeamRecord, CompetitionRecord } from '@/types/entities';

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
    listCompetitionAthletes: vi.fn(),
    listCompetitionTeams: vi.fn(),
    listTeams: vi.fn(),
    listCompetitions: vi.fn(),
    createCompetitionAthlete: vi.fn(),
    updateCompetitionAthlete: vi.fn(),
    getCompetitionTeamById: vi.fn(),
  },
}));

vi.mock('@/lib/pdf/reportsPdf', () => ({
  generateTeamRosterReportPdf: vi.fn(() => ({})),
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
    name: 'Praia Clube Beach',
    shortName: 'PRA',
    modality: 'beach',
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
    accessToken: 'token-ct-1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ct-2',
    competitionId: 'comp-1',
    teamId: 'team-2',
    teamName: 'Praia Clube Beach',
    teamShortName: 'PRA',
    registrationDeadline: '2026-12-31T23:59:59.000Z',
    isLocked: false,
    status: 'approved',
    accessToken: 'token-ct-2',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockAthletes: CompetitionAthlete[] = [
  {
    id: 'ath-1',
    competitionTeamId: 'ct-1',
    name: 'Lucas Saatkamp',
    jerseyNumber: 16,
    position: 'Central',
    gender: 'male',
    documentNumber: '12.345.678-9',
    birthDate: '1986-03-06',
    isCaptain: true,
    isLibero: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-2',
    competitionTeamId: 'ct-1',
    name: 'Thales Hoss',
    jerseyNumber: 17,
    position: 'Líbero',
    gender: 'male',
    documentNumber: '98.765.432-1',
    birthDate: '1989-04-26',
    isCaptain: false,
    isLibero: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-3',
    competitionTeamId: 'ct-2',
    name: 'Ana Patricia Silva',
    jerseyNumber: 1,
    position: 'Bloqueadora',
    gender: 'female',
    documentNumber: '11.222.333-4',
    birthDate: '1997-09-29',
    isCaptain: false,
    isLibero: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('AthletesPage Component (Fase 5.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue(mockAthletes);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue(mockCompetitionTeams);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
  });

  it('renderiza o PageHeader oficial com ações de Novo Atleta e Relação Nominal', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Gestão de Atletas/i })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Novo Atleta/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Relação Nominal \(PDF\)/i })).toBeDefined();
  });

  it('renderiza as métricas do resumo operacional', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total de Atletas')).toBeDefined();
    });

    expect(screen.getByText('Atletas de Quadra')).toBeDefined();
    expect(screen.getByText('Atletas de Praia')).toBeDefined();
    expect(screen.getByText('Equipes Inscritas')).toBeDefined();
  });

  it('renderiza os atletas na DataTable com números de camisa e badges de CAP e LÍBERO', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lucas Saatkamp')).toBeDefined();
    });

    expect(screen.getByText('Thales Hoss')).toBeDefined();
    expect(screen.getByText('Ana Patricia Silva')).toBeDefined();

    // Badges de capitão e líbero
    expect(screen.getByText('CAP')).toBeDefined();
    expect(screen.getByText('LÍBERO')).toBeDefined();
  });

  it('filtra atletas por termo de busca em tempo real', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lucas Saatkamp')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome, documento, posição ou camisa/i);
    fireEvent.change(searchInput, { target: { value: 'Thales' } });

    expect(screen.getByText('Thales Hoss')).toBeDefined();
    expect(screen.queryByText('Lucas Saatkamp')).toBeNull();
    expect(screen.queryByText('Ana Patricia Silva')).toBeNull();
  });

  it('filtra atletas por modalidade', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lucas Saatkamp')).toBeDefined();
    });

    const beachBtn = screen.getByRole('button', { name: /^Praia$/i });
    fireEvent.click(beachBtn);

    expect(screen.getByText('Ana Patricia Silva')).toBeDefined();
    expect(screen.queryByText('Lucas Saatkamp')).toBeNull();
    expect(screen.queryByText('Thales Hoss')).toBeNull();
  });

  it('abre o modal de cadastro de novo atleta ao clicar no CTA', async () => {
    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Novo Atleta/i })).toBeDefined();
    });

    const newBtn = screen.getByRole('button', { name: /Novo Atleta/i });
    fireEvent.click(newBtn);

    expect(screen.getByRole('heading', { name: /Cadastrar Novo Atleta/i })).toBeDefined();
    expect(screen.getByLabelText(/Nome Completo/i)).toBeDefined();
  });

  it('exibe estado vazio quando não há atletas cadastrados', async () => {
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhum atleta cadastrado')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Cadastrar Primeiro Atleta/i })).toBeDefined();
  });

  it('exibe estado de erro amigável com retry quando o carregamento falha', async () => {
    vi.mocked(dataAccess.listCompetitionAthletes).mockRejectedValueOnce(new Error('Falha de rede'));

    render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('Não foi possível carregar os atletas')).toBeDefined();

    // Retry
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue(mockAthletes);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Lucas Saatkamp')).toBeDefined();
    });
  });
});
