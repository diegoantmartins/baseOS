/**
 * frente8SaaSAndSmartRegistration.test.tsx
 *
 * Testes unitários e de integração para a Frente 8:
 * 1. RootRedirector: Roteador Global & Gatekeeper SaaS
 * 2. PublicPortal: Vitrine Pública focada em "Competições Hoje"
 * 3. SmartAthleteForm: Cadastro Inteligente por CPF Único e Persistência Multi-Tenant
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { RootRedirector } from '@/components/routing/RootRedirector';
import PublicPortal from '@/pages/PublicPortal';
import { SmartAthleteForm } from '@/components/registration/SmartAthleteForm';
import { dataAccess } from '@/services/dataAccess';
import * as useAuthModule from '@/components/auth/useAuth';
import type { AuthSession } from '@/types/auth';
import type { UserMembership } from '@/types/identity';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

vi.mock('@/services/dataAccess', () => ({
  dataAccess: {
    listUserMemberships: vi.fn(),
    listCompetitions: vi.fn(),
    listMatches: vi.fn(),
    listTeams: vi.fn(),
    listVenues: vi.fn(),
    listOrganizations: vi.fn(),
    getAthleteByCpf: vi.fn(),
    createAthlete: vi.fn(),
    createUserMembership: vi.fn(),
  },
}));

vi.mock('@/lib/supabaseClient', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseClient: vi.fn().mockResolvedValue(null),
  SUPABASE_TABLES: {
    athletes: 'athletes',
    profiles: 'profiles',
    userMemberships: 'user_memberships',
  },
}));

describe('Frente 8: SaaS Portals & Smart Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'test-uuid-1234' },
      writable: true
    });
  });

  // ==========================================================================
  // TAREFA 1: RootRedirector (Gatekeeper SaaS)
  // ==========================================================================
  describe('Tarefa 1: RootRedirector', () => {
    it('1.1 Sem sessão ativa: renderiza a rota / (Portal Público)', async () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        session: null,
        loading: false,
        isAuthenticated: false,
        hasRole: () => false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RootRedirector />} />
          </Routes>
        </MemoryRouter>
      );

      // Deve renderizar a vitrine pública
      await waitFor(() => {
        expect(screen.getByText(/O Futuro da Gestão Esportiva/i)).toBeDefined();
        expect(screen.getByText(/Seu campeonato organizado/i)).toBeDefined();
      });
    });

    it('1.2 Com sessão ativa e role admin/organizer: redireciona para /dashboard', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'user-admin-1',
          name: 'Organizador Master',
          email: 'admin@baseos.online',
          role: 'organizer',
        },
      };

      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        session: mockSession,
        loading: false,
        isAuthenticated: true,
        hasRole: () => true,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      });

      vi.mocked(dataAccess.listUserMemberships).mockResolvedValue([
        {
          id: 'mem-1',
          userId: 'user-admin-1',
          organizationId: 'org-voltz',
          role: 'organizer',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RootRedirector />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard Admin</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
      });
    });

    it('1.3 Com sessão e apenas roles team_manager ou athlete: redireciona para /portal/equipe', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'user-team-1',
          name: 'Dirigente Vôlei Minas',
          email: 'minas@baseos.online',
          role: 'team',
        },
      };

      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        session: mockSession,
        loading: false,
        isAuthenticated: true,
        hasRole: () => false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      });

      vi.mocked(dataAccess.listUserMemberships).mockResolvedValue([
        {
          id: 'mem-2',
          userId: 'user-team-1',
          organizationId: 'org-voltz',
          teamId: 'team-minas',
          role: 'team_manager',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RootRedirector />} />
            <Route path="/portal/equipe" element={<div data-testid="team-portal-page">Portal da Equipe</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('team-portal-page')).toBeDefined();
      });
    });

    it('1.4 Autenticado mas sem memberships ativas (ex: fã): renderiza / (Portal Público)', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'user-fan-1',
          name: 'Fã de Voleibol',
          email: 'fan@gmail.com',
          role: 'viewer',
        },
      };

      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        session: mockSession,
        loading: false,
        isAuthenticated: true,
        hasRole: () => false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      });

      vi.mocked(dataAccess.listUserMemberships).mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RootRedirector />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/O Futuro da Gestão Esportiva/i)).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // TAREFA 2: PublicPortal (Jogos ao Vivo & Vitrine)
  // ==========================================================================
  describe('Tarefa 2: PublicPortal', () => {
    it('2.1 Renderiza visual de jogos de hoje, cidades e ginásios sem exigir login', async () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        session: null,
        loading: false,
        isAuthenticated: false,
        hasRole: () => false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        updateProfile: vi.fn(),
      });

      vi.mocked(dataAccess.listCompetitions).mockResolvedValue([
        {
          id: 'comp-1',
          name: 'Liga Nacional Pro Masc',
          status: 'in-progress',
          modality: 'indoor',
          playerFormat: '6x6',
        } as unknown as CompetitionRecord,
      ]);

      vi.mocked(dataAccess.listMatches).mockResolvedValue([
        {
          id: 'match-1',
          competitionId: 'comp-1',
          round: 1,
          matchNumber: 101,
          teamAId: 'team-1',
          teamBId: 'team-2',
          teamAName: 'Vortex Vôlei',
          teamBName: 'Titanium Clube',
          teamAShortName: 'VOR',
          teamBShortName: 'TIT',
          venue: 'Ginásio Poliesportivo Central',
          court: 'Quadra 1',
          phase: 'Semifinal',
          scheduledTime: new Date().toISOString(),
          status: 'in-progress',
          sets: [
            { setNumber: 1, scoreA: 25, scoreB: 23 },
            { setNumber: 2, scoreA: 18, scoreB: 25 },
          ],
        } as unknown as MatchRecord,
      ]);

      vi.mocked(dataAccess.listTeams).mockResolvedValue([
        { id: 'team-1', name: 'Vortex Vôlei', shortName: 'VOR', modality: 'indoor' } as unknown as TeamRecord,
        { id: 'team-2', name: 'Titanium Clube', shortName: 'TIT', modality: 'indoor' } as unknown as TeamRecord,
      ]);

      render(
        <MemoryRouter>
          <PublicPortal />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Competições Hoje/i)).toBeDefined();
        expect(screen.getByText(/Vortex Vôlei/i)).toBeDefined();
        expect(screen.getByText(/Titanium Clube/i)).toBeDefined();
        expect(screen.getByText(/Ginásio Poliesportivo Central/i)).toBeDefined();
        expect(screen.getAllByText(/AO VIVO/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/25x23/i)).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // TAREFA 3: SmartAthleteForm (Cadastro Inteligente por CPF)
  // ==========================================================================
  describe('Tarefa 3: SmartAthleteForm', () => {
    it('3.1 Localiza atleta existente por CPF, auto-preenche o nome e trava o campo', async () => {
      vi.mocked(dataAccess.listOrganizations).mockResolvedValue([
        { id: 'org-voltz', name: 'VOLTZ Sports', status: 'active', createdAt: '', updatedAt: '' },
      ]);
      vi.mocked(dataAccess.listTeams).mockResolvedValue([
        { id: 'team-voltz', name: 'Voltz Vôlei', shortName: 'VTZ', modality: 'indoor' } as unknown as TeamRecord,
      ]);

      vi.mocked(dataAccess.getAthleteByCpf).mockResolvedValue({
        id: 'ath-123',
        normalizedCpf: '12345678900',
        name: 'Giba Silva',
        birthDate: '1985-05-20',
        createdAt: '',
        updatedAt: '',
      });

      render(
        <SmartAthleteForm
          organizationId="org-voltz"
          teamId="team-voltz"
        />
      );

      const cpfInput = screen.getByLabelText(/CPF do Atleta/i);
      fireEvent.change(cpfInput, { target: { value: '123.456.789-00' } });
      fireEvent.blur(cpfInput);

      await waitFor(() => {
        expect(dataAccess.getAthleteByCpf).toHaveBeenCalledWith('12345678900');
        expect(screen.getByText(/Atleta já cadastrado no BaseOS/i)).toBeDefined();
      });

      const nameInput = screen.getByLabelText(/Nome Completo/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Giba Silva');
      expect(nameInput.readOnly).toBe(true);
    });

    it('3.2 Atleta novo: permite preencher o nome livremente', async () => {
      vi.mocked(dataAccess.listOrganizations).mockResolvedValue([
        { id: 'org-voltz', name: 'VOLTZ Sports', status: 'active', createdAt: '', updatedAt: '' },
      ]);
      vi.mocked(dataAccess.listTeams).mockResolvedValue([
        { id: 'team-voltz', name: 'Voltz Vôlei', shortName: 'VTZ', modality: 'indoor' } as unknown as TeamRecord,
      ]);
      vi.mocked(dataAccess.getAthleteByCpf).mockResolvedValue(null);

      render(
        <SmartAthleteForm
          organizationId="org-voltz"
          teamId="team-voltz"
        />
      );

      const cpfInput = screen.getByLabelText(/CPF do Atleta/i);
      fireEvent.change(cpfInput, { target: { value: '999.888.777-66' } });
      fireEvent.blur(cpfInput);

      await waitFor(() => {
        expect(screen.getByText(/Novo atleta no BaseOS/i)).toBeDefined();
      });

      const nameInput = screen.getByLabelText(/Nome Completo/i) as HTMLInputElement;
      expect(nameInput.readOnly).toBe(false);
      fireEvent.change(nameInput, { target: { value: 'Novo Jogador Promessa' } });
      expect(nameInput.value).toBe('Novo Jogador Promessa');
    });

    it('3.3 Submete vinculando à organization_id e team_id em user_memberships sem chamar auth.users', async () => {
      vi.mocked(dataAccess.listOrganizations).mockResolvedValue([
        { id: 'org-voltz', name: 'VOLTZ Sports', status: 'active', createdAt: '', updatedAt: '' },
      ]);
      vi.mocked(dataAccess.listTeams).mockResolvedValue([
        { id: 'team-voltz', name: 'Voltz Vôlei', shortName: 'VTZ', modality: 'indoor' } as unknown as TeamRecord,
      ]);
      vi.mocked(dataAccess.getAthleteByCpf).mockResolvedValue(null);
      vi.mocked(dataAccess.createUserMembership).mockResolvedValue({
        id: 'mem-new-1',
        userId: 'ath-gen-1',
        organizationId: 'org-voltz',
        teamId: 'team-voltz',
        role: 'athlete',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const onSuccess = vi.fn();

      render(
        <SmartAthleteForm
          organizationId="org-voltz"
          teamId="team-voltz"
          defaultRole="athlete"
          onSuccess={onSuccess}
        />
      );

      const cpfInput = screen.getByLabelText(/CPF do Atleta/i);
      fireEvent.change(cpfInput, { target: { value: '111.222.333-44' } });
      fireEvent.blur(cpfInput);

      await waitFor(() => {
        expect(screen.getByText(/Novo atleta no BaseOS/i)).toBeDefined();
      });

      const nameInput = screen.getByLabelText(/Nome Completo/i);
      fireEvent.change(nameInput, { target: { value: 'Carlos Levantador' } });

      const submitBtn = screen.getByRole('button', { name: /Cadastrar e Vincular/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(dataAccess.createUserMembership).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org-voltz',
            teamId: 'team-voltz',
            role: 'athlete',
            status: 'active',
          })
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});
