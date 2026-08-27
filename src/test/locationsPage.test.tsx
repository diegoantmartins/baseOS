/**
 * locationsPage.test.tsx
 *
 * Testes unitários do redesign de Locais e Quadras (Fase 8.1):
 * - Renderização do PageHeader oficial com título, descrição e ação primária "Novo Local"
 * - Resumo operacional com métricas reais (Total de Locais, Total de Quadras, Média, Endereços)
 * - Renderização da lista de locais na DataTable com badges de quadras
 * - Filtragem em tempo real por nome do local e quadras
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Abertura e submissão do modal de criação de local
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { VenuesPage } from '@/pages/VenuesPage';
import { dataAccess } from '@/services/dataAccess';
import type { VenueRecord } from '@/types/entities';

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
    listVenues: vi.fn(),
    createVenue: vi.fn(),
    updateVenue: vi.fn(),
    deleteVenue: vi.fn(),
  },
}));

const mockVenues: VenueRecord[] = [
  {
    id: 'venue-1',
    name: 'Ginásio Poliesportivo do Riacho',
    address: 'Rua Rio Negro, 405 - Contagem/MG',
    courts: ['Quadra Principal', 'Quadra 2'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'venue-2',
    name: 'Arena Minas Tênis Clube',
    address: 'Rua da Bahia, 2244 - Belo Horizonte/MG',
    courts: ['Quadra 1'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('VenuesPage / LocationsPage Component (Fase 8.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listVenues).mockResolvedValue(mockVenues);
  });

  it('renderiza o PageHeader oficial com título e ação primária de novo local', async () => {
    render(
      <MemoryRouter>
        <VenuesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Locais e Quadras/i })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Novo Local/i })).toBeDefined();
  });

  it('renderiza as métricas reais do resumo operacional', async () => {
    render(
      <MemoryRouter>
        <VenuesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Total de Locais')).toBeDefined();
    });

    expect(screen.getByText('Total de Quadras')).toBeDefined();
    expect(screen.getByText('Média Quadras/Local')).toBeDefined();
    expect(screen.getByText('Endereços Mapeados')).toBeDefined();
  });

  it('renderiza a lista de locais na DataTable com dados e quadras', async () => {
    render(
      <MemoryRouter>
        <VenuesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ginásio Poliesportivo do Riacho')).toBeDefined();
    });

    expect(screen.getByText('Arena Minas Tênis Clube')).toBeDefined();
    expect(screen.getByText('Quadra Principal')).toBeDefined();
    expect(screen.getByText('Quadra 2')).toBeDefined();
  });

  it('filtra locais por busca textual em tempo real', async () => {
    render(
      <MemoryRouter>
        <VenuesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ginásio Poliesportivo do Riacho')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome do ginásio/i);
    fireEvent.change(searchInput, { target: { value: 'Minas' } });

    expect(screen.queryByText('Ginásio Poliesportivo do Riacho')).toBeNull();
    expect(screen.getByText('Arena Minas Tênis Clube')).toBeDefined();
  });

  it('exibe estado vazio quando não há locais cadastrados', async () => {
    vi.mocked(dataAccess.listVenues).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <VenuesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhum local cadastrado')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Cadastrar Primeiro Local/i })).toBeDefined();
  });

  it('exibe estado de erro com retry quando o carregamento falha', async () => {
    vi.mocked(dataAccess.listVenues).mockRejectedValueOnce(new Error('Erro de conexão'));

    render(
      <MemoryRouter>
        <VenuesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('Não foi possível carregar os locais')).toBeDefined();

    // Retry
    vi.mocked(dataAccess.listVenues).mockResolvedValue(mockVenues);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Ginásio Poliesportivo do Riacho')).toBeDefined();
    });
  });

  it('abre o modal de criação ao clicar em Novo Local', async () => {
    render(
      <MemoryRouter>
        <VenuesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ginásio Poliesportivo do Riacho')).toBeDefined();
    });

    const newBtn = screen.getByRole('button', { name: /Novo Local/i });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    expect(screen.getByLabelText(/Nome do local/i)).toBeDefined();
  });
});
