/**
 * modalitiesPage.test.tsx
 *
 * Testes unitários do redesign de Modalidades Esportivas (Fase 8.3):
 * - Renderização do PageHeader oficial com título, descrição e ação primária "Nova Modalidade"
 * - Resumo operacional com métricas reais (Total, Quadra, Praia, Competições Vinculadas)
 * - Renderização da lista de modalidades na DataTable com colunas de formato e sets
 * - Filtragem em tempo real por busca textual e ambiente (Quadra/Praia)
 * - Abertura de modais (Nova Modalidade, Detalhes/Regulamento)
 * - Estados universais (Loading, Empty, Error com Retry)
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ModalitiesPage } from '@/pages/ModalitiesPage';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, ModalityRecord } from '@/types/entities';

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
    listModalities: vi.fn(),
    listCompetitions: vi.fn(),
    createModality: vi.fn(),
    updateModality: vi.fn(),
    deleteModality: vi.fn(),
  },
}));

const mockModalities: ModalityRecord[] = [
  {
    id: 'mod-1',
    name: 'Vôlei de Quadra Adulto',
    type: 'indoor',
    defaultPlayerFormat: '6x6',
    defaultSetFormat: '3-sets',
    defaultSetPoints: 25,
    defaultTiebreakPoints: 15,
    description: 'Regulamento oficial CBV de quadra',
  },
  {
    id: 'mod-2',
    name: 'Vôlei de Praia Duplas',
    type: 'beach',
    defaultPlayerFormat: '2x2',
    defaultSetFormat: '3-sets',
    defaultSetPoints: 21,
    defaultTiebreakPoints: 15,
    description: 'Regulamento oficial de duplas na areia',
  },
];

const mockCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-1',
    name: 'Superliga Masculina 2026',
    modality: 'indoor',
    modalityId: 'mod-1',
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

describe('ModalitiesPage Component (Fase 8.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listModalities).mockResolvedValue(mockModalities);
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
  });

  it('renderiza o PageHeader oficial com título e ação primária de nova modalidade', async () => {
    render(
      <MemoryRouter>
        <ModalitiesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Modalidades Esportivas/i }),
      ).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Nova Modalidade/i })).toBeDefined();
  });

  it('renderiza as métricas reais do resumo operacional', async () => {
    render(
      <MemoryRouter>
        <ModalitiesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Total de Modalidades')).toBeDefined();
    });

    expect(screen.getByText('Vôlei de Quadra')).toBeDefined();
    expect(screen.getByText('Vôlei de Praia')).toBeDefined();
    expect(screen.getByText('Competições Vinculadas')).toBeDefined();
  });

  it('renderiza a lista de modalidades na DataTable com dados e formatos', async () => {
    render(
      <MemoryRouter>
        <ModalitiesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Vôlei de Quadra Adulto')).toBeDefined();
    });

    expect(screen.getByText('Vôlei de Praia Duplas')).toBeDefined();
    expect(screen.getByText('6x6')).toBeDefined();
    expect(screen.getByText('2x2')).toBeDefined();
    expect(screen.getByText('Quadra')).toBeDefined();
    expect(screen.getByText('Praia')).toBeDefined();
  });

  it('filtra modalidades por busca textual em tempo real', async () => {
    render(
      <MemoryRouter>
        <ModalitiesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Vôlei de Quadra Adulto')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome, formato/i);
    fireEvent.change(searchInput, { target: { value: 'Praia' } });

    expect(screen.queryByText('Vôlei de Quadra Adulto')).toBeNull();
    expect(screen.getByText('Vôlei de Praia Duplas')).toBeDefined();
  });

  it('exibe estado vazio quando não há modalidades cadastradas', async () => {
    vi.mocked(dataAccess.listModalities).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ModalitiesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma modalidade cadastrada')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Cadastrar Primeira Modalidade/i })).toBeDefined();
  });

  it('exibe estado de erro com retry quando o carregamento falha', async () => {
    vi.mocked(dataAccess.listModalities).mockRejectedValueOnce(new Error('Erro de conexão'));

    render(
      <MemoryRouter>
        <ModalitiesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(
      screen.getByText('Não foi possível carregar as modalidades'),
    ).toBeDefined();

    // Retry
    vi.mocked(dataAccess.listModalities).mockResolvedValue(mockModalities);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Vôlei de Quadra Adulto')).toBeDefined();
    });
  });

  it('abre o modal de criação ao clicar em Nova Modalidade', async () => {
    render(
      <MemoryRouter>
        <ModalitiesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Vôlei de Quadra Adulto')).toBeDefined();
    });

    const newBtn = screen.getByRole('button', { name: /Nova Modalidade/i });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    expect(screen.getByLabelText(/Nome da Modalidade/i)).toBeDefined();
  });

  it('abre o modal de detalhes ao clicar no botão de visualização', async () => {
    render(
      <MemoryRouter>
        <ModalitiesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Vôlei de Quadra Adulto')).toBeDefined();
    });

    const viewButtons = screen.getAllByLabelText(/Ver detalhes e regulamento/i);
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Detalhes da Modalidade')).toBeDefined();
    });

    expect(screen.getAllByText('Regulamento oficial CBV de quadra').length).toBeGreaterThanOrEqual(1);
  });
});
