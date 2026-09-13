/**
 * teamsPage.test.tsx
 *
 * Testes unitários e de integração da TeamsPage (Fase 5.1 e Fase 7.5):
 * - Renderização do PageHeader oficial com ações
 * - Resumo operacional com métricas reais (total, quadra, praia, atletas)
 * - Listagem das equipes na DataTable com StatusBadge e desempenho
 * - Filtragem rápida por texto e botões de modalidade
 * - Estados universais (Loading, Empty, Error com Retry)
 * - Abertura do modal de detalhes da equipe com estrutura de abas
 * - Aba 1: Dados da Equipe (preservação cadastral)
 * - Aba 2: Elenco de Atletas (nova visualização operacional)
 * - Exibição de nomes, camisas, posições e competição vinculada
 * - Identificação explícita de Capitão e Líbero
 * - Ordenação determinística de elenco (camisas menores primeiro, sem camisa no fim)
 * - Estado vazio explícito para equipe sem atletas
 * - Isolamento estrito entre equipes sem mistura de elencos
 * - Ausência de consultas adicionais N+1 ao abrir o detalhe
 * - Ausência de menções legadas a VolleyPro
 * - Acessibilidade semântica da tabela e tabs
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TeamsPage } from '@/pages/TeamsPage';
import { dataAccess } from '@/services/dataAccess';
import { sortRosterAthletes } from '@/services/registrationService';
import type { TeamRecord, MatchRecord, CompetitionRecord } from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';

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
    listTeams: vi.fn(),
    listMatches: vi.fn(),
    listCompetitionTeams: vi.fn(),
    listCompetitionAthletes: vi.fn(),
    listCompetitions: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    createPerson: vi.fn(),
  },
  generateToken: vi.fn(() => 'mock-token-123'),
}));

const mockTeams: TeamRecord[] = [
  {
    id: 'team-1',
    name: 'Sada Cruzeiro Vôlei',
    shortName: 'CRU',
    modality: 'indoor',
    city: 'Belo Horizonte',
    state: 'MG',
    coachName: 'Filipe Ferraz',
    managerName: 'Carlos Silva',
    managerPhone: '(31) 99999-1111',
    managerEmail: 'gestor@cruzeiro.com',
    createdAt: '2026-01-01',
  },
  {
    id: 'team-2',
    name: 'Praia Clube Beach',
    shortName: 'PRA',
    modality: 'beach',
    city: 'Uberlândia',
    state: 'MG',
    coachName: 'Paulo Souza',
    managerName: 'Mariana Costa',
    createdAt: '2026-01-01',
  },
  {
    id: 'team-3',
    name: 'Minas Tênis Clube',
    shortName: 'MTC',
    modality: 'indoor',
    city: 'Belo Horizonte',
    state: 'MG',
    coachName: 'Guilherme Novaes',
    createdAt: '2026-01-01',
  },
];

const mockCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-1',
    name: 'Superliga Nacional 2026',
    modality: 'indoor',
    status: 'in-progress',
    format: 'group-stage-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockCompetitionTeams: CompetitionTeam[] = [
  {
    id: 'ct-1',
    competitionId: 'comp-1',
    teamId: 'team-1',
    teamName: 'Sada Cruzeiro Vôlei',
    teamShortName: 'CRU',
    accessToken: 'token-cru',
    registrationDeadline: '2026-12-31T23:59:59.000Z',
    isLocked: false,
    status: 'approved',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ct-2',
    competitionId: 'comp-1',
    teamId: 'team-2',
    teamName: 'Praia Clube Beach',
    teamShortName: 'PRA',
    accessToken: 'token-pra',
    registrationDeadline: '2026-12-31T23:59:59.000Z',
    isLocked: false,
    status: 'approved',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockAthletes: CompetitionAthlete[] = [
  // Atletas da Equipe 1 (Sada Cruzeiro)
  {
    id: 'ath-1',
    competitionTeamId: 'ct-1',
    name: 'Wallace Souza',
    jerseyNumber: 8,
    position: 'Oposto',
    isCaptain: true,
    isLibero: false,
    gender: 'male',
    documentNumber: '111.222.333-44',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-2',
    competitionTeamId: 'ct-1',
    name: 'Lucas Saatkamp',
    jerseyNumber: 16,
    position: 'Central',
    isCaptain: false,
    isLibero: false,
    gender: 'male',
    documentNumber: '222.333.444-55',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-3',
    competitionTeamId: 'ct-1',
    name: 'Maique Nascimento',
    jerseyNumber: 1,
    position: 'Líbero',
    isCaptain: false,
    isLibero: true,
    gender: 'male',
    documentNumber: '333.444.555-66',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-4',
    competitionTeamId: 'ct-1',
    name: 'Atleta Sem Camisa',
    jerseyNumber: undefined,
    position: 'Ponteiro',
    isCaptain: false,
    isLibero: false,
    gender: 'male',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  // Atleta da Equipe 2 (Praia Clube)
  {
    id: 'ath-5',
    competitionTeamId: 'ct-2',
    name: 'Eduardo Lima',
    jerseyNumber: 10,
    position: 'Ponteiro',
    isCaptain: false,
    isLibero: false,
    gender: 'male',
    documentNumber: '444.555.666-77',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockMatches: MatchRecord[] = [
  {
    id: 'match-1',
    competitionId: 'comp-1',
    matchNumber: 1,
    teamAId: 'team-1',
    teamBId: 'team-2',
    teamAName: 'Sada Cruzeiro Vôlei',
    teamBName: 'Praia Clube Beach',
    teamAShortName: 'CRU',
    teamBShortName: 'PRA',
    status: 'completed',
    winnerId: 'team-1',
    round: 1,
    venue: 'Ginásio Central',
    scheduledTime: '2026-04-01T10:00:00.000Z',
    sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
    referees: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('TeamsPage & Elenco de Atletas (Fase 7.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue(mockCompetitionTeams);
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue(mockAthletes);
    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
  });

  // ── Algoritmo Canônico de Ordenação de Elenco ──
  describe('sortRosterAthletes', () => {
    it('ordena por número da camisa ascendente, com sem camisa no final e desempate alfabético', () => {
      const unordered = [
        { id: '3', name: 'Carlos', jerseyNumber: undefined },
        { id: '1', name: 'Zeca', jerseyNumber: 10 },
        { id: '4', name: 'Alice', jerseyNumber: undefined },
        { id: '2', name: 'Beto', jerseyNumber: 2 },
        { id: '5', name: 'Ana', jerseyNumber: 2 },
      ];

      const sorted = sortRosterAthletes(unordered);

      // Camisa 2: Ana antes de Beto (alfabético)
      expect(sorted[0].name).toBe('Ana');
      expect(sorted[1].name).toBe('Beto');
      // Camisa 10: Zeca
      expect(sorted[2].name).toBe('Zeca');
      // Sem camisa: Alice antes de Carlos (alfabético)
      expect(sorted[3].name).toBe('Alice');
      expect(sorted[4].name).toBe('Carlos');
    });
  });

  // ── Renderização Geral e Métricas ──
  it('renderiza o PageHeader oficial e botão de Nova Equipe', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Gestão de Equipes/i })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Nova Equipe/i })).toBeDefined();
  });

  it('exibe as métricas operacionais consolidadas calculando o total de atletas', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total de Equipes')).toBeDefined();
    });

    expect(screen.getAllByText('Vôlei de Quadra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vôlei de Praia').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total de Atletas')).toBeDefined();
    // 4 atletas para team-1 + 1 atleta para team-2 = 5 atletas no total
    expect(screen.getByText('5')).toBeDefined();
  });

  it('renderiza a lista de equipes na DataTable com desempenho e dados do gestor', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    expect(screen.getByText('Praia Clube Beach')).toBeDefined();
    expect(screen.getByText('Carlos Silva')).toBeDefined();
  });

  it('filtra as equipes por termo de busca e modalidade', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    // Filtro por texto
    const searchInput = screen.getByPlaceholderText(/Buscar por nome, sigla, cidade ou gestor/i);
    fireEvent.change(searchInput, { target: { value: 'Cruzeiro' } });

    expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    expect(screen.queryByText('Praia Clube Beach')).toBeNull();

    // Limpar busca e filtrar por modalidade "Praia" usando nome exato
    fireEvent.change(searchInput, { target: { value: '' } });
    const beachBtn = screen.getByRole('button', { name: /^Praia$/i });
    fireEvent.click(beachBtn);

    expect(screen.getByText('Praia Clube Beach')).toBeDefined();
    expect(screen.queryByText('Sada Cruzeiro Vôlei')).toBeNull();
  });

  it('exibe estado vazio quando não há equipes cadastradas', async () => {
    vi.mocked(dataAccess.listTeams).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma equipe cadastrada')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Cadastrar Primeira Equipe/i })).toBeDefined();
  });

  it('exibe estado de erro amigável com retry quando o dataAccess falha', async () => {
    vi.mocked(dataAccess.listTeams).mockRejectedValueOnce(new Error('Falha de conexão'));

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    expect(screen.getByText('Não foi possível carregar as equipes')).toBeDefined();

    // Clicar em Tentar Novamente
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });
  });

  // ── Detalhes da Equipe: Aba 1 (Dados Cadastrais) ──
  it('abre o modal de detalhes e exibe a aba Dados da Equipe preservando os campos existentes', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    // Clica na linha do Sada Cruzeiro
    fireEvent.click(screen.getByText('Sada Cruzeiro Vôlei'));

    // Confirma abertura do modal
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    expect(screen.getByRole('tab', { name: /Dados da Equipe/i })).toBeDefined();
    expect(screen.getAllByText('Filipe Ferraz').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('gestor@cruzeiro.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('(31) 99999-1111').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Belo Horizonte - MG').length).toBeGreaterThanOrEqual(1);
  });

  // ── Detalhes da Equipe: Aba 2 (Elenco de Atletas) ──
  it('permite alternar para a aba Elenco de Atletas e exibe nomes, camisas e posições', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Sada Cruzeiro Vôlei'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    // Alterna para a aba Elenco de Atletas
    const rosterTab = screen.getByRole('tab', { name: /Elenco de Atletas/i });
    fireEvent.click(rosterTab);

    // Confirma exibição dos atletas do Sada Cruzeiro
    await waitFor(() => {
      expect(screen.getAllByText('Wallace Souza').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Maique Nascimento').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Atleta Sem Camisa').length).toBeGreaterThanOrEqual(1);

    // Números das camisas
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('16').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);

    // Posições
    expect(screen.getAllByText('Oposto').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Central').length).toBeGreaterThanOrEqual(1);
  });

  // ── Capitão e Líbero ──
  it('identifica Capitão e Líbero com badges visíveis e textuais sem depender apenas de cor', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Sada Cruzeiro Vôlei'));

    const rosterTab = await screen.findByRole('tab', { name: /Elenco de Atletas/i });
    fireEvent.click(rosterTab);

    await waitFor(() => {
      expect(screen.getAllByText('Wallace Souza').length).toBeGreaterThanOrEqual(1);
    });

    // Capitão: Wallace Souza deve ter indicador de Capitão
    const captainBadges = screen.getAllByText(/Capitão/i);
    expect(captainBadges.length).toBeGreaterThanOrEqual(1);

    // Líbero: Maique Nascimento deve ter indicador de Líbero
    const liberoBadges = screen.getAllByText(/Líbero/i);
    expect(liberoBadges.length).toBeGreaterThanOrEqual(1);
  });

  // ── Ordenação Determinística na Interface ──
  it('aplica ordenação determinística na renderização: camisas menores primeiro e sem camisa no final', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Sada Cruzeiro Vôlei'));

    const rosterTab = await screen.findByRole('tab', { name: /Elenco de Atletas/i });
    fireEvent.click(rosterTab);

    await waitFor(() => {
      expect(screen.getAllByText('Maique Nascimento').length).toBeGreaterThanOrEqual(1);
    });

    // Na tabela desktop, a ordem das linhas de atletas deve ser:
    // 1. Maique Nascimento (#1)
    // 2. Wallace Souza (#8)
    // 3. Lucas Saatkamp (#16)
    // 4. Atleta Sem Camisa (—)
    const table = screen.getByRole('table', { name: /Elenco de Atletas/i });
    const athleteNamesInTable = Array.from(table.querySelectorAll('tbody tr')).map(
      (row) => row.querySelector('td:nth-child(2) span')?.textContent
    );

    expect(athleteNamesInTable).toEqual([
      'Maique Nascimento',
      'Wallace Souza',
      'Lucas Saatkamp',
      'Atleta Sem Camisa',
    ]);
  });

  // ── Isolamento Estrito Entre Equipes ──
  it('garante isolamento estrito entre equipes sem mistura de atletas', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    // 1. Abre o Sada Cruzeiro
    fireEvent.click(screen.getByText('Sada Cruzeiro Vôlei'));
    const rosterTabCru = await screen.findByRole('tab', { name: /Elenco de Atletas/i });
    fireEvent.click(rosterTabCru);

    await waitFor(() => {
      expect(screen.getAllByText('Wallace Souza').length).toBeGreaterThanOrEqual(1);
    });

    // Atleta do Praia Clube NÃO pode estar no Cruzeiro
    expect(screen.queryByText('Eduardo Lima')).toBeNull();

    // Fecha o modal
    fireEvent.click(screen.getAllByRole('button', { name: /Fechar/i })[0]);

    // 2. Abre o Praia Clube
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    fireEvent.click(screen.getByText('Praia Clube Beach'));
    const rosterTabPra = await screen.findByRole('tab', { name: /Elenco de Atletas/i });
    fireEvent.click(rosterTabPra);

    await waitFor(() => {
      expect(screen.getAllByText('Eduardo Lima').length).toBeGreaterThanOrEqual(1);
    });

    // Atletas do Cruzeiro NÃO podem estar no Praia Clube
    expect(screen.queryByText('Wallace Souza')).toBeNull();
    expect(screen.queryByText('Lucas Saatkamp')).toBeNull();
  });

  // ── Equipe Sem Atletas: Estado Vazio Explícito ──
  it('exibe estado vazio apropriado quando a equipe não possui atletas vinculados', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Minas Tênis Clube')).toBeDefined();
    });

    // Abre Minas Tênis Clube (sem atletas mockados)
    fireEvent.click(screen.getByText('Minas Tênis Clube'));

    const rosterTab = await screen.findByRole('tab', { name: /Elenco de Atletas/i });
    fireEvent.click(rosterTab);

    await waitFor(() => {
      expect(screen.getByText('Nenhum atleta vinculado a esta equipe.')).toBeDefined();
    });

    expect(
      screen.getByText(/Esta equipe ainda não possui inscrição ativa em nenhuma competição/i)
    ).toBeDefined();
  });

  // ── Ausência de N+1 (Consultas em Lote) ──
  it('não realiza chamadas extras ao dataAccess ao abrir o modal ou alternar abas', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    const callsCountBefore = vi.mocked(dataAccess.listCompetitionAthletes).mock.calls.length;

    // Clica para abrir o modal
    fireEvent.click(screen.getByText('Sada Cruzeiro Vôlei'));

    const rosterTab = await screen.findByRole('tab', { name: /Elenco de Atletas/i });
    fireEvent.click(rosterTab);

    await waitFor(() => {
      expect(screen.getAllByText('Wallace Souza').length).toBeGreaterThanOrEqual(1);
    });

    // O número de chamadas ao dataAccess NÃO deve aumentar ao navegar no modal
    const callsCountAfter = vi.mocked(dataAccess.listCompetitionAthletes).mock.calls.length;
    expect(callsCountAfter).toBe(callsCountBefore);
  });

  // ── Ausência de Referências Legadas "VolleyPro" ──
  it('não possui referências residuais à marca VolleyPro na interface e no modal', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Sada Cruzeiro Vôlei'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    expect(screen.queryByText(/VolleyPro/i)).toBeNull();
  });

  // ── Acessibilidade e Semântica ──
  it('renderiza estrutura de tabela semântica com cabeçalhos acessíveis na visão desktop', async () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sada Cruzeiro Vôlei')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Sada Cruzeiro Vôlei'));

    const rosterTab = await screen.findByRole('tab', { name: /Elenco de Atletas/i });
    fireEvent.click(rosterTab);

    const table = await screen.findByRole('table', { name: /Elenco de Atletas/i });
    expect(table).toBeDefined();

    const columnHeaders = screen.getAllByRole('columnheader');
    const headerTexts = columnHeaders.map((th) => th.textContent);
    expect(headerTexts).toContain('Nº');
    expect(headerTexts).toContain('Atleta');
    expect(headerTexts).toContain('Posição');
    expect(headerTexts).toContain('Função');
    expect(headerTexts).toContain('Competição');
  });
});
