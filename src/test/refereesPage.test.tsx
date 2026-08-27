/**
 * refereesPage.test.tsx
 *
 * Testes unitários do redesign de Arbitragem e Oficiais (Fase 8.2):
 * - Renderização do PageHeader oficial com título, descrição e ações
 * - Resumo operacional com métricas reais (Total, Disponíveis, Em Jogo, Concluídos)
 * - Renderização da lista de árbitros na DataTable com badges de certificação
 * - Filtragem em tempo real por nome e nível
 * - Abertura de modais (Novo Oficial, Perfil do Árbitro, Escala Geral)
 * - Estados universais (Loading, Empty, Error com Retry)
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RefereesPage } from '@/pages/RefereesPage';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, RefereeRecord } from '@/types/entities';

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
    listReferees: vi.fn(),
    listMatches: vi.fn(),
    listCompetitions: vi.fn(),
    createReferee: vi.fn(),
    updateReferee: vi.fn(),
  },
}));

const mockReferees: RefereeRecord[] = [
  {
    id: 'ref-1',
    name: 'Carlos Alberto dos Santos',
    level: 'national',
  },
  {
    id: 'ref-2',
    name: 'Mariana Silva Moreira',
    level: 'international',
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
    status: 'scheduled',
    sets: [],
    referees: [
      { name: 'Carlos Alberto dos Santos', role: '1º Árbitro' },
      { name: 'Mariana Silva Moreira', role: '2º Árbitro' },
    ],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('RefereesPage Component (Fase 8.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listReferees).mockResolvedValue(mockReferees);
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
  });

  it('renderiza o PageHeader oficial com título e botões de ação', async () => {
    render(
      <MemoryRouter>
        <RefereesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Arbitragem e Oficiais/i }),
      ).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Novo Oficial/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Ver Escala Completa/i })).toBeDefined();
  });

  it('renderiza as métricas reais do resumo operacional', async () => {
    render(
      <MemoryRouter>
        <RefereesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Total de Oficiais')).toBeDefined();
    });

    expect(screen.getByText('Disponíveis')).toBeDefined();
    expect(screen.getByText('Em Jogo / Atuação')).toBeDefined();
    expect(screen.getByText('Jogos Concluídos')).toBeDefined();
  });

  it('renderiza a lista de árbitros na DataTable com dados e certificação', async () => {
    render(
      <MemoryRouter>
        <RefereesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Carlos Alberto dos Santos')).toBeDefined();
    });

    expect(screen.getByText('Mariana Silva Moreira')).toBeDefined();
    expect(screen.getByText('Nacional')).toBeDefined();
    expect(screen.getByText('Internacional')).toBeDefined();
  });

  it('filtra árbitros por busca textual em tempo real', async () => {
    render(
      <MemoryRouter>
        <RefereesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Carlos Alberto dos Santos')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome, certificação/i);
    fireEvent.change(searchInput, { target: { value: 'Mariana' } });

    expect(screen.queryByText('Carlos Alberto dos Santos')).toBeNull();
    expect(screen.getByText('Mariana Silva Moreira')).toBeDefined();
  });

  it('exibe estado vazio quando não há oficiais cadastrados', async () => {
    vi.mocked(dataAccess.listReferees).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <RefereesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhum oficial cadastrado')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Cadastrar Primeiro Oficial/i })).toBeDefined();
  });

  it('exibe estado de erro com retry quando o carregamento falha', async () => {
    vi.mocked(dataAccess.listReferees).mockRejectedValueOnce(new Error('Erro de conexão'));

    render(
      <MemoryRouter>
        <RefereesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(
      screen.getByText('Não foi possível carregar o quadro de arbitragem'),
    ).toBeDefined();

    // Retry
    vi.mocked(dataAccess.listReferees).mockResolvedValue(mockReferees);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Carlos Alberto dos Santos')).toBeDefined();
    });
  });

  it('abre o modal de criação de oficial ao clicar em Novo Oficial', async () => {
    render(
      <MemoryRouter>
        <RefereesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Carlos Alberto dos Santos')).toBeDefined();
    });

    const newBtn = screen.getByRole('button', { name: /Novo Oficial/i });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    expect(screen.getByLabelText(/Nome Completo/i)).toBeDefined();
  });

  it('abre o modal de escala completa ao clicar em Ver Escala Completa', async () => {
    render(
      <MemoryRouter>
        <RefereesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Carlos Alberto dos Santos')).toBeDefined();
    });

    const scheduleBtn = screen.getByRole('button', { name: /Ver Escala Completa/i });
    fireEvent.click(scheduleBtn);

    await waitFor(() => {
      expect(screen.getByText('Escala Geral de Arbitragem')).toBeDefined();
    });
  });
});
