import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TenantRouteGuard } from '@/components/routing/TenantRouteGuard';
import { dataAccess } from '@/services/dataAccess';
import { toast } from 'sonner';

// Mocks
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

import type { UserProfile } from '@/types/auth';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';

let mockAuthContext: {
  session: {
    user: UserProfile;
    token: string;
  } | null;
  loading: boolean;
  isPlatformAdmin: boolean;
} = {
  session: {
    user: {
      id: 'user-org-1',
      name: 'Organizador Org 1',
      email: 'org1@test.com',
      role: 'organizer',
      organizationId: 'org-1',
      isPlatformAdmin: false,
    },
    token: 'test-token',
  },
  loading: false,
  isPlatformAdmin: false,
};

vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => mockAuthContext,
}));

let mockTenantContext = {
  currentOrganizationId: 'org-1',
  currentOrganization: { id: 'org-1', name: 'Org 1', slug: 'org-1' },
  userOrganizations: [{ id: 'org-1', name: 'Org 1', slug: 'org-1' }],
  isLoading: false,
};

vi.mock('@/contexts/TenantContext', () => ({
  useTenant: () => mockTenantContext,
}));

describe('TenantRouteGuard — Proteção IDOR / BOLA Multi-Tenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('baseos.active_org_id', 'org-1');

    mockAuthContext = {
      session: {
        user: {
          id: 'user-org-1',
          name: 'Organizador Org 1',
          email: 'org1@test.com',
          role: 'organizer',
          organizationId: 'org-1',
        },
        token: 'test-token',
      },
      loading: false,
      isPlatformAdmin: false,
    };

    mockTenantContext = {
      currentOrganizationId: 'org-1',
      currentOrganization: { id: 'org-1', name: 'Org 1', slug: 'org-1' },
      userOrganizations: [{ id: 'org-1', name: 'Org 1', slug: 'org-1' }],
      isLoading: false,
    };
  });

  it('1. Permite acesso normal quando o recurso de competição pertence ao tenant ativo', async () => {
    vi.spyOn(dataAccess, 'getCompetition').mockResolvedValue({
      id: 'comp-org-1',
      name: 'Copa Org 1',
      organizationId: 'org-1',
      status: 'active',
    } as unknown as CompetitionRecord);

    render(
      <MemoryRouter initialEntries={['/competicoes/comp-org-1/inscricoes']}>
        <Routes>
          <Route
            path="/competicoes/:id/inscricoes"
            element={
              <TenantRouteGuard>
                <div>CONTEUDO_AUTORIZADO</div>
              </TenantRouteGuard>
            }
          />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CONTEUDO_AUTORIZADO')).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('2. Bloqueia acesso (IDOR) e redireciona para /dashboard se a competição pertencer a outro tenant', async () => {
    vi.spyOn(dataAccess, 'getCompetition').mockResolvedValue({
      id: 'comp-org-2',
      name: 'Copa Org 2 Invasao',
      organizationId: 'org-2',
      status: 'active',
    } as unknown as CompetitionRecord);

    render(
      <MemoryRouter initialEntries={['/competicoes/comp-org-2/inscricoes']}>
        <Routes>
          <Route
            path="/competicoes/:id/inscricoes"
            element={
              <TenantRouteGuard>
                <div>CONTEUDO_AUTORIZADO</div>
              </TenantRouteGuard>
            }
          />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PAGINA_DASHBOARD')).toBeInTheDocument();
    });
    expect(screen.queryByText('CONTEUDO_AUTORIZADO')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      'Acesso Negado (403)',
      expect.objectContaining({
        description: 'A competição solicitada não pertence à sua organização ativa.',
      })
    );
  });

  it('3. Bloqueia tentativa de manipulação via rota de sorteio :competitionId cross-tenant', async () => {
    vi.spyOn(dataAccess, 'getCompetition').mockResolvedValue({
      id: 'comp-cross',
      name: 'Competicao Alheia',
      organizationId: 'org-target-adversary',
      status: 'draft',
    } as unknown as CompetitionRecord);

    render(
      <MemoryRouter initialEntries={['/sorteio/comp-cross']}>
        <Routes>
          <Route
            path="/sorteio/:competitionId"
            element={
              <TenantRouteGuard>
                <div>ARENA_DE_SORTEIO</div>
              </TenantRouteGuard>
            }
          />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PAGINA_DASHBOARD')).toBeInTheDocument();
    });
    expect(screen.queryByText('ARENA_DE_SORTEIO')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Acesso Negado (403)', expect.anything());
  });

  it('4. Bloqueia acesso cross-tenant via :organizationId quando organizador não tem membership', async () => {
    vi.spyOn(dataAccess, 'listUserMemberships').mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/organizacoes/org-vitima']}>
        <Routes>
          <Route
            path="/organizacoes/:organizationId"
            element={
              <TenantRouteGuard>
                <div>DETALHE_ORGANIZACAO</div>
              </TenantRouteGuard>
            }
          />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PAGINA_DASHBOARD')).toBeInTheDocument();
    });
    expect(screen.queryByText('DETALHE_ORGANIZACAO')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      'Acesso Negado (403)',
      expect.objectContaining({
        description: 'Você não possui permissão para acessar recursos desta organização.',
      })
    );
  });

  it('5. Bloqueia acesso a sumulas/:matchId se a partida pertencer a competição de outro tenant', async () => {
    vi.spyOn(dataAccess, 'getMatch').mockResolvedValue({
      id: 'match-adversary-1',
      competitionId: 'comp-adversary-1',
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      status: 'scheduled',
    } as unknown as MatchRecord);

    vi.spyOn(dataAccess, 'getCompetition').mockResolvedValue({
      id: 'comp-adversary-1',
      name: 'Competicao Adversaria',
      organizationId: 'org-adversary',
      status: 'active',
    } as unknown as CompetitionRecord);

    render(
      <MemoryRouter initialEntries={['/sumulas/match-adversary-1']}>
        <Routes>
          <Route
            path="/sumulas/:matchId"
            element={
              <TenantRouteGuard>
                <div>SUMULA_OFICIAL</div>
              </TenantRouteGuard>
            }
          />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PAGINA_DASHBOARD')).toBeInTheDocument();
    });
    expect(screen.queryByText('SUMULA_OFICIAL')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      'Acesso Negado (403)',
      expect.objectContaining({
        description: 'A partida solicitada pertence a outra organização.',
      })
    );
  });

  it('6. Concede bypass irrestrito se o usuário autenticado for Platform Admin', async () => {
    mockAuthContext = {
      ...mockAuthContext,
      isPlatformAdmin: true,
      session: {
        ...mockAuthContext.session,
        user: {
          ...mockAuthContext.session.user,
          role: 'admin',
          isPlatformAdmin: true,
        },
      },
    };

    render(
      <MemoryRouter initialEntries={['/competicoes/comp-qualquer/inscricoes']}>
        <Routes>
          <Route
            path="/competicoes/:id/inscricoes"
            element={
              <TenantRouteGuard>
                <div>ACESSO_PLATFORM_ADMIN</div>
              </TenantRouteGuard>
            }
          />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ACESSO_PLATFORM_ADMIN')).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
