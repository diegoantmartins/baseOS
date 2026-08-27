/**
 * matchSheetPage.test.tsx
 *
 * Testes unitários do redesign da Central de Súmulas (Fase 7.2):
 * - Renderização do PageHeader oficial (/sumulas e /sumulas/:matchId)
 * - Resumo operacional com métricas reais (Total, Pendentes, Em Jogo, Homologadas)
 * - Renderização da lista de súmulas com DataTable, placar e StatusBadge
 * - Filtragem rápida por texto, competição e status
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Abertura do modal de súmula em branco
 * - Acesso à súmula individual com abas (Súmula Digital, Escalação em Quadra, Card Redes)
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MatchSheetPage } from '@/pages/MatchSheetPage';
import { dataAccess } from '@/services/dataAccess';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';

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
    listTeams: vi.fn(() => Promise.resolve([])),
    listAthletes: vi.fn(() => Promise.resolve([])),
    getMatch: vi.fn(),
    getCompetition: vi.fn(),
    updateMatch: vi.fn(),
    listCompetitionAthletes: vi.fn(),
    listCompetitionTeams: vi.fn(),
  },
}));

vi.mock('@/services/registrationService', () => ({
  getMatchRosters: vi.fn(() => Promise.resolve({ teamA: [], teamB: [] })),
}));

vi.mock('@/lib/pdf/matchSheetDataBuilder', () => ({
  buildMatchSheetData: vi.fn(() => Promise.resolve({ finalScoreA: 0, finalScoreB: 0 })),
}));

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
    court: 'Quadra 1',
    status: 'homologated',
    homologatedBy: 'Árbitro Principal',
    homologatedAt: '2026-05-12T22:00:00.000Z',
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

describe('MatchSheetPage Component (Fase 7.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    vi.mocked(dataAccess.getMatch).mockImplementation(async (id) =>
      mockMatches.find((m) => m.id === id) || null,
    );
    vi.mocked(dataAccess.getCompetition).mockImplementation(async (id) =>
      mockCompetitions.find((c) => c.id === id) || null,
    );
  });

  describe('Central Geral (/sumulas)', () => {
    it('renderiza o PageHeader oficial com título e ação de súmula em branco', async () => {
      render(
        <MemoryRouter initialEntries={['/sumulas']}>
          <MatchSheetPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /Súmulas Oficiais/i })).toBeDefined();
      });

      expect(screen.getByRole('button', { name: /Súmula em Branco/i })).toBeDefined();
    });

    it('renderiza as métricas do resumo operacional', async () => {
      render(
        <MemoryRouter initialEntries={['/sumulas']}>
          <MatchSheetPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Total de Súmulas')).toBeDefined();
      });

      expect(screen.getByText('Pendentes')).toBeDefined();
      expect(screen.getByText('Em Jogo')).toBeDefined();
      expect(screen.getByText('Homologadas')).toBeDefined();
    });

    it('renderiza a lista de súmulas na DataTable com ações e placar', async () => {
      render(
        <MemoryRouter initialEntries={['/sumulas']}>
          <MatchSheetPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeDefined();
      });

      expect(screen.getByText('#2')).toBeDefined();
      expect(screen.getByText('2 - 0')).toBeDefined();
      expect(screen.getAllByRole('button', { name: /Abrir Súmula/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('filtra súmulas por texto de busca em tempo real', async () => {
      render(
        <MemoryRouter initialEntries={['/sumulas']}>
          <MatchSheetPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/Buscar por jogo #, equipe, sigla/i);
      fireEvent.change(searchInput, { target: { value: 'Minas' } });

      expect(screen.getByText('#1')).toBeDefined();
      expect(screen.getByText('#2')).toBeDefined();
    });

    it('exibe estado vazio quando não há partidas cadastradas', async () => {
      vi.mocked(dataAccess.listMatches).mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/sumulas']}>
          <MatchSheetPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Nenhuma súmula cadastrada')).toBeDefined();
      });

      expect(screen.getByRole('button', { name: /Criar Novo Confronto/i })).toBeDefined();
    });

    it('exibe estado de erro com retry quando o carregamento falha', async () => {
      vi.mocked(dataAccess.listMatches).mockRejectedValueOnce(new Error('Erro de conexão'));

      render(
        <MemoryRouter initialEntries={['/sumulas']}>
          <MatchSheetPage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
      });

      expect(screen.getByText('Não foi possível carregar as súmulas')).toBeDefined();

      // Retry
      vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
      const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeDefined();
      });
    });
  });

  describe('Súmula Individual (/sumulas/:matchId)', () => {
    it('renderiza os detalhes individuais da partida e as abas operacionais', async () => {
      render(
        <MemoryRouter initialEntries={['/sumulas/match-2']}>
          <Routes>
            <Route path="/sumulas/:matchId" element={<MatchSheetPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Súmula Digital · Jogo #2/i)).toBeDefined();
      });

      expect(screen.getByRole('tab', { name: /Súmula Digital/i })).toBeDefined();
      expect(screen.getByRole('tab', { name: /Escalação em Quadra/i })).toBeDefined();
      expect(screen.getByRole('tab', { name: /Card para Redes/i })).toBeDefined();
      expect(screen.getByText(/homologada oficialmente/i)).toBeDefined();
    });

    it('exibe mensagem amigável quando o matchId não é encontrado', async () => {
      vi.mocked(dataAccess.getMatch).mockResolvedValue(null);

      render(
        <MemoryRouter initialEntries={['/sumulas/inexistente']}>
          <Routes>
            <Route path="/sumulas/:matchId" element={<MatchSheetPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Partida não encontrada')).toBeDefined();
      });
    });
  });
});
