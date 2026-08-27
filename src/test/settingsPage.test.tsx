/**
 * settingsPage.test.tsx
 *
 * Testes unitários do redesign de Configurações Gerais do Sistema (Fase 8.4):
 * - Renderização do PageHeader oficial com título e descrição
 * - Renderização das abas de categorias reais (Usuários, Segurança, Organização, Perfil, Notificações, Aparência, Base de Dados)
 * - Renderização da lista de usuários na DataTable
 * - Filtragem textual de usuários
 * - Abertura de modal de cadastro de usuário
 * - Navegação para aba Organização & Regras
 * - Navegação para aba Meu Perfil
 * - Estado de erro com retry no carregamento
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '@/pages/SettingsPage';
import { dataAccess } from '@/services/dataAccess';
import { authService } from '@/services/authService';
import type { SettingsRecord } from '@/types/entities';
import type { SystemUser } from '@/types/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockUser: SystemUser = {
  id: 'usr-admin-1',
  name: 'Administrador Master',
  email: 'admin@baseos.app',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-01',
};

const mockUsersList: SystemUser[] = [
  mockUser,
  {
    id: 'usr-org-1',
    name: 'Carlos Organizador',
    email: 'carlos@baseos.app',
    role: 'organizer',
    status: 'active',
    createdAt: '2026-01-01',
  },
];

const mockSettings: SettingsRecord = {
  id: 'settings-1',
  orgName: 'Federação Mineira de Voleibol',
  orgCode: 'FMV',
  cnpj: '00.123.456/0001-00',
  website: 'https://fmv.org.br',
  contactEmail: 'contato@fmv.org.br',
  phone: '(31) 3333-4444',
  address: 'Av. Esportes, 1000 - Belo Horizonte, MG',
  theme: 'dark',
  language: 'pt-BR',
  rules: {
    pointsPerWin: 3,
    pointsPerLoss: 0,
    pointsPerSetWin: 1,
    pointsPerSetLoss: 0,
    setPoints: 25,
    tiebreakPoints: 15,
    timeoutsPerSet: 2,
  },
  notifications: {
    matchScheduled: true,
    rosterSubmitted: true,
    matchResult: true,
    marketing: false,
    liveGames: true,
    pendingSheets: true,
    dailyDigest: false,
  },
};

vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => ({
    session: { user: mockUser },
    updateProfile: vi.fn().mockResolvedValue({ ok: true }),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/services/dataAccess', () => ({
  dataAccess: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
  clearAllCompetitionData: vi.fn(),
  resetLocalData: vi.fn(),
}));

describe('SettingsPage Component (Fase 8.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(dataAccess.getSettings).mockResolvedValue(mockSettings);
    vi.spyOn(authService, 'listUsers').mockResolvedValue(mockUsersList);
  });

  it('renderiza o PageHeader oficial de configurações', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Configurações do Sistema/i }),
      ).toBeDefined();
    });
  });

  it('renderiza todas as categorias reais nas abas de navegação', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Usuários/i })).toBeDefined();
    });

    expect(screen.getByRole('tab', { name: /Segurança & Auditoria/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Organização & Regras/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Meu Perfil/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Notificações/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Aparência/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Base de Dados/i })).toBeDefined();
  });

  it('renderiza a lista de usuários do sistema na DataTable', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Carlos Organizador')).toBeDefined();
    });

    expect(screen.getByText('admin@baseos.app')).toBeDefined();
    expect(screen.getByText('carlos@baseos.app')).toBeDefined();
  });

  it('filtra usuários por busca textual em tempo real', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Carlos Organizador')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome ou e-mail/i);
    fireEvent.change(searchInput, { target: { value: 'Carlos' } });

    expect(screen.queryByText('admin@baseos.app')).toBeNull();
    expect(screen.getByText('Carlos Organizador')).toBeDefined();
  });

  it('abre o modal de cadastro de usuário ao clicar no botão', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cadastrar Usuário/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cadastrar Usuário/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    expect(screen.getByLabelText(/Nome Completo \*/i)).toBeDefined();
  });

  it('navega para a aba Organização & Regras e exibe os dados da entidade', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Organização & Regras/i })).toBeDefined();
    });

    const orgTab = screen.getByRole('tab', { name: /Organização & Regras/i });
    fireEvent.click(orgTab);

    await waitFor(() => {
      expect(screen.getByText('Dados Institucionais da Entidade')).toBeDefined();
    });

    expect(screen.getByDisplayValue('Federação Mineira de Voleibol')).toBeDefined();
    expect(screen.getByDisplayValue('FMV')).toBeDefined();
  });

  it('navega para a aba Meu Perfil e exibe o perfil do usuário logado', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Meu Perfil/i })).toBeDefined();
    });

    const profTab = screen.getByRole('tab', { name: /Meu Perfil/i });
    fireEvent.click(profTab);

    await waitFor(() => {
      expect(screen.getByText('Identidade Operacional')).toBeDefined();
    });

    expect(screen.getByDisplayValue('Administrador Master')).toBeDefined();
  });

  it('exibe estado de erro com retry quando o carregamento falha', async () => {
    vi.mocked(dataAccess.getSettings).mockRejectedValueOnce(new Error('Falha no servidor'));

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(
      screen.getByText('Não foi possível carregar as configurações'),
    ).toBeDefined();

    // Retry
    vi.mocked(dataAccess.getSettings).mockResolvedValue(mockSettings);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Carlos Organizador')).toBeDefined();
    });
  });
});
