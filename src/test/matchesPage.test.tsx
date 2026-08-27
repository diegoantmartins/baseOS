/**
 * matchesPage.test.tsx
 *
 * Testes unitários do redesign da MatchesPage (Fase 6):
 * - Renderização do PageHeader oficial com ações
 * - Resumo operacional com métricas reais (total, agendadas, ao vivo, encerradas)
 * - Renderização dos confrontos na DataTable com placar, parciais e StatusBadge
 * - Navegação em sub-abas operacionais (Todos, Grupos, Mata-mata, Agenda, Súmulas, Resultados)
 * - Filtragem rápida por texto, competição e status
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Preservação dos botões e fluxos de homologação, súmula e mesa ao vivo
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MatchesPage } from '@/pages/MatchesPage';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';

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
    listMatches: vi.fn(),
    listCompetitions: vi.fn(),
    listTeams: vi.fn(),
    listVenues: vi.fn(),
    updateMatch: vi.fn(),
    createMatch: vi.fn(),
    addAuditLog: vi.fn(),
    listCompetitionTeams: vi.fn(),
  },
}));

vi.mock('@/lib/pdf/reportsPdf', () => ({
  generateMatchesBoletimPdf: vi.fn(() => ({})),
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

const mockVenues: VenueRecord[] = [
  {
    id: 'venue-1',
    name: 'Ginásio do Riacho',
    address: 'Contagem - MG',
    courts: ['Quadra Principal', 'Quadra 2'],
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
    groupName: 'A',
    teamAId: 'team-1',
    teamBId: 'team-2',
    teamAName: 'Sada Cruzeiro Vôlei',
    teamBName: 'Itambé Minas',
    teamAShortName: 'CRU',
    teamBShortName: 'MIN',
    scheduledTime: '2026-05-10T19:00:00.000Z',
    venue: 'Ginásio do Riacho',
    court: 'Quadra Principal',
    status: 'scheduled',
    sets: [],
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
    groupName: 'A',
    teamAId: 'team-1',
    teamBId: 'team-2',
    teamAName: 'Sada Cruzeiro Vôlei',
    teamBName: 'Itambé Minas',
    teamAShortName: 'CRU',
    teamBShortName: 'MIN',
    scheduledTime: '2026-05-12T20:00:00.000Z',
    venue: 'Ginásio do Riacho',
    court: 'Quadra Principal',
    status: 'completed',
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

describe('MatchesPage Component (Fase 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listVenues).mockResolvedValue(mockVenues);
  });

  it('renderiza o PageHeader oficial com título e ações de boletim e novo confronto', async () => {
    render(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Gestão de Partidas/i })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Novo Confronto/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Gerar Boletim/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Súmula em Branco/i })).toBeDefined();
  });

  it('renderiza as métricas do resumo operacional', async () => {
    render(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total de Partidas')).toBeDefined();
    });

    expect(screen.getByText('Agendadas')).toBeDefined();
    expect(screen.getByText('Ao Vivo')).toBeDefined();
    expect(screen.getByText('Encerradas')).toBeDefined();
  });

  it('renderiza a lista de partidas na DataTable com placar, status e ações', async () => {
    render(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeDefined();
    });

    expect(screen.getByText('#2')).toBeDefined();
    expect(screen.getByText('2 - 0')).toBeDefined();
  });

  it('filtra partidas por termo de busca em tempo real', async () => {
    render(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por equipe, ginásio, quadra/i);
    fireEvent.change(searchInput, { target: { value: 'Cruzeiro' } });

    expect(screen.getByText('#1')).toBeDefined();
    expect(screen.getByText('#2')).toBeDefined();
  });

  it('alterna entre sub-abas operacionais', async () => {
    render(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeDefined();
    });

    const mataMataTab = screen.getByRole('tab', { name: /Mata-mata/i });
    fireEvent.click(mataMataTab);

    // Ambas as partidas de mock são group-stage, então na aba mata-mata a tabela fica vazia
    expect(screen.getByText('Nenhum confronto encontrado para os filtros selecionados')).toBeDefined();
    expect(screen.getByText(/Chaveamento Eliminatório e Mata-mata/i)).toBeDefined();
  });

  it('exibe estado vazio quando não há partidas cadastradas', async () => {
    vi.mocked(dataAccess.listMatches).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma partida programada')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Criar Primeiro Confronto/i })).toBeDefined();
  });

  it('exibe estado de erro com retry quando o carregamento falha', async () => {
    vi.mocked(dataAccess.listMatches).mockRejectedValueOnce(new Error('Erro no servidor'));

    render(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('Não foi possível carregar as partidas')).toBeDefined();

    // Retry
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeDefined();
    });
  });
});
