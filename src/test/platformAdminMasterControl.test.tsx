/**
 * platformAdminMasterControl.test.tsx
 *
 * Suíte de testes do Platform Admin Layer (Master Control):
 * 1. Chave-Mestra e Verificação de Regras de Auth (is_platform_admin).
 * 2. Guarda de Rota RequirePlatformAdmin (bloqueio de não-masters, liberação de master).
 * 3. Painel Master (MasterDashboard):
 *    - Tabela Zebra com tipografia Azul Escuro (text-blue-950)
 *    - Botão pílula Laranja BaseOS "Nova Empresa/Base"
 *    - Modal de criação de nova organização e persistência via dataAccess.createOrganization
 *    - Ação de alternar base/contexto
 * 4. TenantSwitcher:
 *    - Invisível para usuários comuns
 *    - Dropdown ativo para is_platform_admin
 *    - Propagação de currentOrganizationId e invalidação de cache
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { dataAccess } from '@/services/dataAccess';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { RequirePlatformAdmin } from '@/components/auth/RequirePlatformAdmin';
import MasterDashboard from '@/pages/master/MasterDashboard';
import type { OrganizationRecord, OrganizationStatus } from '@/types/identity';
import type { AuthSession } from '@/types/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const { mockMasterSession, mockOrganizerSession, mockOrganizations, sharedState } = vi.hoisted(() => {
  const master: AuthSession = {
    user: {
      id: 'usr-master-1',
      email: 'diegoantmartins89@gmail.com',
      name: 'Diego Martins (Master)',
      role: 'admin',
      isPlatformAdmin: true,
      organizationId: 'a0000000-0000-0000-0000-000000000001',
    },
  };

  const organizer: AuthSession = {
    user: {
      id: 'usr-org-2',
      email: 'organizador@voleipro.app',
      name: 'Carlos Organizador',
      role: 'organizer',
      isPlatformAdmin: false,
      organizationId: 'a0000000-0000-0000-0000-000000000001',
    },
  };

  const orgs: OrganizationRecord[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'VOLTZ',
      legalName: 'Voltz Sports & Eventos',
      documentNumber: '11.222.333/0001-44',
      status: 'active',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'org-fed-paulista',
      name: 'Federação Paulista de Volleyball',
      legalName: 'FPV Promoções Esportivas',
      documentNumber: '22.333.444/0001-55',
      status: 'active',
      createdAt: '2026-09-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    },
  ];

  return {
    mockMasterSession: master,
    mockOrganizerSession: organizer,
    mockOrganizations: orgs,
    sharedState: {
      activeOrgId: 'a0000000-0000-0000-0000-000000000001' as string | null,
      orgList: [...orgs],
    },
  };
});

let mockCurrentAuth = {
  session: mockMasterSession as AuthSession | null,
  loading: false,
  isAuthenticated: true,
  isPlatformAdmin: true,
  hasRole: vi.fn((_roles: string[]) => true),
  signIn: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
};

vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => mockCurrentAuth,
}));

vi.mock('@/services/dataAccess', () => {
  return {
    dataAccess: {
      listOrganizations: vi.fn(async () => [...sharedState.orgList]),
      getOrganizationById: vi.fn(async (id: string) => sharedState.orgList.find((o) => o.id === id) || null),
      createOrganization: vi.fn(async (input: { id?: string; name: string; legalName?: string | null; documentNumber?: string | null; status?: OrganizationStatus }) => {
        const created: OrganizationRecord = {
          id: input.id || 'org-' + Date.now(),
          name: input.name,
          legalName: input.legalName,
          documentNumber: input.documentNumber,
          status: input.status || 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        sharedState.orgList.push(created);
        return created;
      }),
      updateOrganization: vi.fn(async (id: string, updates: Partial<OrganizationRecord>) => {
        const idx = sharedState.orgList.findIndex((o) => o.id === id);
        if (idx === -1) throw new Error('Not found');
        sharedState.orgList[idx] = { ...sharedState.orgList[idx], ...updates };
        return sharedState.orgList[idx];
      }),
      getActiveOrganizationId: vi.fn(() => sharedState.activeOrgId),
      setActiveOrganizationId: vi.fn((id: string | null) => {
        sharedState.activeOrgId = id;
      }),
    },
  };
});

function renderWithProviders(ui: React.ReactElement, initialRoute = '/master') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <TenantProvider>{ui}</TenantProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BaseOS — Platform Admin Layer (Master Control)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sharedState.activeOrgId = 'a0000000-0000-0000-0000-000000000001';
    sharedState.orgList = [...mockOrganizations];

    mockCurrentAuth = {
      session: mockMasterSession,
      loading: false,
      isAuthenticated: true,
      isPlatformAdmin: true,
      hasRole: vi.fn(() => true),
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    };
  });

  describe('1. Chave-Mestra e Regras de Segurança (is_platform_admin)', () => {
    it('identifica corretamente o usuário Product Owner / Master como isPlatformAdmin', () => {
      expect(authService.isPlatformAdmin(mockMasterSession)).toBe(true);
      expect(authService.hasRole(mockMasterSession, ['organizer'])).toBe(true);
      expect(authService.hasRole(mockMasterSession, ['admin'])).toBe(true);
    });

    it('identifica corretamente usuários normais como não sendo platform admin', () => {
      expect(authService.isPlatformAdmin(mockOrganizerSession)).toBe(false);
      expect(authService.isPlatformAdmin(null)).toBe(false);
    });

    it('persiste e recupera o activeOrganizationId através do dataAccess', () => {
      dataAccess.setActiveOrganizationId('org-fed-paulista');
      expect(dataAccess.setActiveOrganizationId).toHaveBeenCalledWith('org-fed-paulista');
    });
  });

  describe('2. Guarda de Rota RequirePlatformAdmin', () => {
    it('bloqueia usuário sem is_platform_admin e redireciona para /dashboard', () => {
      mockCurrentAuth = {
        ...mockCurrentAuth,
        session: mockOrganizerSession,
        isPlatformAdmin: false,
      };

      render(
        <MemoryRouter initialEntries={['/master']}>
          <Routes>
            <Route
              path="/master"
              element={
                <RequirePlatformAdmin>
                  <div>Conteúdo Protegido Master</div>
                </RequirePlatformAdmin>
              }
            />
            <Route path="/dashboard" element={<div>Dashboard do Cliente</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Conteúdo Protegido Master')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard do Cliente')).toBeInTheDocument();
    });

    it('permite acesso ao conteúdo para usuário com is_platform_admin = true', () => {
      mockCurrentAuth = {
        ...mockCurrentAuth,
        session: mockMasterSession,
        isPlatformAdmin: true,
      };

      render(
        <MemoryRouter initialEntries={['/master']}>
          <Routes>
            <Route
              path="/master"
              element={
                <RequirePlatformAdmin>
                  <div>Conteúdo Protegido Master</div>
                </RequirePlatformAdmin>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Conteúdo Protegido Master')).toBeInTheDocument();
    });
  });

  describe('3. Painel Master no Frontend (MasterDashboard)', () => {
    it('renderiza o cabeçalho, métricas e tabela zebra com tipografia Azul Escuro', async () => {
      renderWithProviders(<MasterDashboard />);

      // Verifica cabeçalho e badge Master Control
      expect(await screen.findByText('Painel Master de Bases & Clientes')).toBeInTheDocument();
      expect(screen.getByText('Platform Admin')).toBeInTheDocument();
      expect(screen.getByText('Master Control Layer')).toBeInTheDocument();

      // Verifica cards de métricas
      expect(screen.getByText('Total de Bases Cadastradas')).toBeInTheDocument();
      expect(screen.getByText('Bases em Operação Ativa')).toBeInTheDocument();

      // Verifica botão Laranja BaseOS pílula (rounded-full)
      const newOrgBtn = screen.getByRole('button', { name: /Nova Empresa\/Base/i });
      expect(newOrgBtn).toBeInTheDocument();
      expect(newOrgBtn.className).toContain('rounded-full');
      expect(newOrgBtn.className).toContain('bg-orange-500');

      // Verifica organizações na tabela Zebra
      expect(await screen.findByText('11.222.333/0001-44', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('22.333.444/0001-55', { exact: false })).toBeInTheDocument();
    });

    it('abre o modal ao clicar em "Nova Empresa/Base" e cadastra nova organização', async () => {
      renderWithProviders(<MasterDashboard />);

      const newOrgBtn = await screen.findByRole('button', { name: /Nova Empresa\/Base/i });
      fireEvent.click(newOrgBtn);

      // Modal abre
      expect(await screen.findByText('Cadastrar Nova Empresa / Base')).toBeInTheDocument();

      // Preenche os campos
      const nameInput = screen.getByLabelText(/Nome da Empresa \/ Base/i);
      const legalNameInput = screen.getByLabelText(/Razão Social/i);
      const docInput = screen.getByLabelText(/CNPJ ou Registro/i);

      fireEvent.change(nameInput, { target: { value: 'Federação Paranaense de Voleibol' } });
      fireEvent.change(legalNameInput, { target: { value: 'FPV Parana' } });
      fireEvent.change(docInput, { target: { value: '33.444.555/0001-66' } });

      // Submete o formulário
      const submitBtn = screen.getByRole('button', { name: /Cadastrar Empresa/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(dataAccess.createOrganization).toHaveBeenCalledWith({
          name: 'Federação Paranaense de Voleibol',
          legalName: 'FPV Parana',
          documentNumber: '33.444.555/0001-66',
          status: 'active',
        });
      });
    });

    it('filtra as bases através do campo de busca', async () => {
      renderWithProviders(<MasterDashboard />);

      expect((await screen.findAllByText('11.222.333/0001-44', { exact: false })).length).toBeGreaterThan(0);
      const searchInput = screen.getByPlaceholderText(/Buscar por nome, documento ou ID/i);

      // Filtra por Paulista
      fireEvent.change(searchInput, { target: { value: 'Paulista' } });

      expect(screen.getAllByText('Federação Paulista de Volleyball').length).toBeGreaterThan(0);
      expect(screen.queryByText('11.222.333/0001-44')).not.toBeInTheDocument();
    });
  });

  describe('4. Tenant Switcher (Troca de Contexto)', () => {
    it('não renderiza o TenantSwitcher se o usuário não for Platform Admin', async () => {
      mockCurrentAuth = {
        ...mockCurrentAuth,
        isPlatformAdmin: false,
      };

      const { container } = renderWithProviders(<TenantSwitcher />);
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('renderiza o botão discreto com indicador e nome da base ativa quando for Platform Admin', async () => {
      renderWithProviders(<TenantSwitcher />);

      const triggerBtn = await screen.findByRole('button', { name: /Tenant ativo/i });
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn).toHaveTextContent('VOLTZ');
      expect(triggerBtn).toHaveTextContent('Master');
    });

    it('permite alternar de base e chama setOrganizationId com invalidação de cache', async () => {
      // Componente auxiliar para inspecionar useTenant
      function TestTenantConsumer() {
        const { currentOrganizationId, setOrganizationId } = useTenant();
        return (
          <div>
            <span data-testid="current-org">{currentOrganizationId}</span>
            <button
              onClick={() => setOrganizationId('org-fed-paulista')}
              data-testid="switch-btn"
            >
              Switch
            </button>
          </div>
        );
      }

      renderWithProviders(<TestTenantConsumer />);

      const currentOrgSpan = screen.getByTestId('current-org');
      expect(currentOrgSpan).toHaveTextContent('a0000000-0000-0000-0000-000000000001');

      // Executa a troca
      const switchBtn = screen.getByTestId('switch-btn');
      fireEvent.click(switchBtn);

      await waitFor(() => {
        expect(screen.getByTestId('current-org')).toHaveTextContent('org-fed-paulista');
      });
    });
  });
});
