import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DrawPage from '@/pages/DrawPage';
import { dataAccess } from '@/services/dataAccess';

vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => ({
    session: { user: { name: 'Organizador Master', email: 'org@baseos.app', role: 'organizer' } },
    loading: false,
    isAuthenticated: true,
    hasRole: vi.fn(() => true),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('@/services/dataAccess', () => ({
  dataAccess: {
    listCompetitions: vi.fn(),
    listTeams: vi.fn(),
    listCompetitionTeams: vi.fn(),
    listMatches: vi.fn(),
    listDraws: vi.fn(),
    getDrawByCompetition: vi.fn(),
    saveDrawWithMatches: vi.fn(),
    listCompetitionAthletes: vi.fn(),
  },
}));

describe('DrawPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue([
      {
        id: 'comp-1',
        name: 'Copa Teste',
        modality: 'indoor',
        status: 'registration-open',
        format: 'group-stage',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
    vi.mocked(dataAccess.listTeams).mockResolvedValue([]);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue([]);
    vi.mocked(dataAccess.listMatches).mockResolvedValue([]);
    vi.mocked(dataAccess.listDraws).mockResolvedValue([]);
    vi.mocked(dataAccess.getDrawByCompetition).mockResolvedValue(null);
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue([]);
  });

  it('renderiza estado vazio quando a competição da rota não existe', async () => {
    render(
      <MemoryRouter initialEntries={['/sorteio/comp-nao-existe']}>
        <Routes>
          <Route path="/sorteio/:competitionId?" element={<DrawPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma competição selecionada')).toBeInTheDocument();
    });

    expect(screen.getByText('Cadastre ou selecione uma competição para configurar o chaveamento e realizar o sorteio dos grupos.')).toBeInTheDocument();
  });
});
