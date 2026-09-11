/**
 * reportsHtmlContextual.test.tsx
 *
 * Testes unitários e de integração da Fase 4 do BaseOS:
 * - Experiência HTML-first: visualização nativa de Boletim, Classificação, Relação Nominal e Pódio
 * - Camada de View Model Unificada compartilhada entre HTML e PDF
 * - Resolução contextual de competitionId (SSOT na URL, fallback de conveniência, ID inválido sem fallback silencioso)
 * - Controle estrito de report na URL (sem persistência em localStorage; fallback para 'boletim')
 * - Isolamento estrito entre competições distintas (Cenário J: zero vazamento de dados de A para B)
 * - URL compartilhável com contexto preservado (competitionId + report)
 * - Ações de impressão (@media print, no-print) e exportação PDF sob demanda
 *
 * Utiliza Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '@/pages/ReportsPage';
import { dataAccess } from '@/services/dataAccess';
import * as reportsPdfModule from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

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
    listCompetitions: vi.fn(),
    listMatches: vi.fn(),
    listTeams: vi.fn(),
    listCompetitionAthletes: vi.fn(),
    listCompetitionTeams: vi.fn(),
  },
}));

vi.mock('@/lib/pdf/reportsPdf', async () => {
  const actual = await vi.importActual<typeof import('@/lib/pdf/reportsPdf')>('@/lib/pdf/reportsPdf');
  return {
    ...actual,
    generateMatchesBoletimPdf: vi.fn(() => ({ save: vi.fn() })),
    generateStandingsReportPdf: vi.fn(() => ({ save: vi.fn() })),
    generateTeamRosterReportPdf: vi.fn(() => ({ save: vi.fn() })),
    generatePodiumReportPdf: vi.fn(() => ({ save: vi.fn() })),
    downloadReportsPdf: vi.fn(),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Cenários de Dados para Teste (Duas Competições Isoladas)
// ─────────────────────────────────────────────────────────────────────────────

const mockCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-alpha-1',
    name: 'Copa Voltz Ouro 2026',
    modality: 'indoor',
    status: 'in-progress',
    format: 'group-stage-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    groupsCount: 1,
    teamsPerGroup: 2,
    advancingPerGroup: 2,
    logoUrl: 'https://cdn.baseos.app/logos/voltz.png',
    venue: 'Arena Poliesportiva Central',
    supporters: [
      { id: 'sup-1', name: 'Banco Alpha', tier: 'master', order: 1 },
      { id: 'sup-2', name: 'Água Cristalina', tier: 'support', order: 2 },
    ],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'comp-beta-2',
    name: 'Torneio Praia Beta 2026',
    modality: 'beach',
    status: 'completed',
    format: 'single-elimination',
    playerFormat: '2x2',
    setFormat: '3-sets',
    genderCategory: 'female',
    groupsCount: 1,
    teamsPerGroup: 2,
    advancingPerGroup: 2,
    venue: 'Praia de Copacabana',
    supporters: [
      { id: 'sup-3', name: 'Protetor Solar Sol&Mar', tier: 'official', order: 1 },
    ],
    createdAt: '2026-01-02',
    updatedAt: '2026-01-02',
  },
];

const mockTeams: TeamRecord[] = [
  { id: 'team-voltz-a', name: 'Voltz Stars', shortName: 'VTZ', modality: 'indoor', city: 'São Paulo', state: 'SP', coachName: 'Renan Dal Zotto', createdAt: '2026-01-01' },
  { id: 'team-voltz-b', name: 'Cruzeiro Base', shortName: 'CRU', modality: 'indoor', city: 'Belo Horizonte', state: 'MG', coachName: 'Filipe Ferraz', createdAt: '2026-01-01' },
  { id: 'team-beta-x', name: 'Duda e Ana Patrícia', shortName: 'D&A', modality: 'beach', city: 'Rio de Janeiro', state: 'RJ', createdAt: '2026-01-02' },
  { id: 'team-beta-y', name: 'Bárbara e Carol', shortName: 'B&C', modality: 'beach', city: 'Niterói', state: 'RJ', createdAt: '2026-01-02' },
];

const mockCompetitionTeams: CompetitionTeam[] = [
  { id: 'ct-voltz-1', competitionId: 'comp-alpha-1', teamId: 'team-voltz-a', teamName: 'Voltz Stars', teamShortName: 'VTZ', accessToken: 'tok-1', registrationDeadline: '2026-12-31', isLocked: true, status: 'approved', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'ct-voltz-2', competitionId: 'comp-alpha-1', teamId: 'team-voltz-b', teamName: 'Cruzeiro Base', teamShortName: 'CRU', accessToken: 'tok-2', registrationDeadline: '2026-12-31', isLocked: true, status: 'approved', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'ct-beta-1', competitionId: 'comp-beta-2', teamId: 'team-beta-x', teamName: 'Duda e Ana Patrícia', teamShortName: 'D&A', accessToken: 'tok-3', registrationDeadline: '2026-12-31', isLocked: true, status: 'approved', createdAt: '2026-01-02', updatedAt: '2026-01-02' },
  { id: 'ct-beta-2', competitionId: 'comp-beta-2', teamId: 'team-beta-y', teamName: 'Bárbara e Carol', teamShortName: 'B&C', accessToken: 'tok-4', registrationDeadline: '2026-12-31', isLocked: true, status: 'approved', createdAt: '2026-01-02', updatedAt: '2026-01-02' },
];

const mockMatches: MatchRecord[] = [
  // Jogo da Copa Voltz (comp-alpha-1)
  {
    id: 'match-voltz-1',
    competitionId: 'comp-alpha-1',
    matchNumber: 101,
    round: 1,
    phase: 'classificatória',
    groupName: 'A',
    teamAId: 'team-voltz-a',
    teamBId: 'team-voltz-b',
    teamAName: 'Voltz Stars',
    teamBName: 'Cruzeiro Base',
    teamAShortName: 'VTZ',
    teamBShortName: 'CRU',
    scheduledTime: '2026-06-15T19:30:00.000Z',
    venue: 'Arena Poliesportiva Central',
    court: 'Quadra Principal',
    status: 'homologated',
    winnerId: 'team-voltz-a',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 25, scoreB: 22 },
    ],
    referees: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  // Jogo do Torneio Beta (comp-beta-2)
  {
    id: 'match-beta-1',
    competitionId: 'comp-beta-2',
    matchNumber: 201,
    round: 1,
    phase: 'final',
    teamAId: 'team-beta-x',
    teamBId: 'team-beta-y',
    teamAName: 'Duda e Ana Patrícia',
    teamBName: 'Bárbara e Carol',
    teamAShortName: 'D&A',
    teamBShortName: 'B&C',
    scheduledTime: '2026-07-20T10:00:00.000Z',
    venue: 'Praia de Copacabana',
    court: 'Arena Central',
    status: 'completed',
    winnerId: 'team-beta-x',
    sets: [
      { setNumber: 1, scoreA: 21, scoreB: 18 },
      { setNumber: 2, scoreA: 21, scoreB: 19 },
    ],
    referees: [],
    createdAt: '2026-01-02',
    updatedAt: '2026-01-02',
  },
];

const mockAthletes: CompetitionAthlete[] = [
  {
    id: 'ath-voltz-1',
    competitionTeamId: 'ct-voltz-1',
    name: 'Bruninho Rezende',
    jerseyNumber: 1,
    position: 'setter',
    gender: 'male',
    birthDate: '1986-07-02',
    isCaptain: true,
    isLibero: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-voltz-2',
    competitionTeamId: 'ct-voltz-1',
    name: 'Thales Hoss',
    jerseyNumber: 17,
    position: 'libero',
    gender: 'male',
    birthDate: '1989-04-27',
    isCaptain: false,
    isLibero: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-beta-1',
    competitionTeamId: 'ct-beta-1',
    name: 'Eduarda Lisboa (Duda)',
    jerseyNumber: 1,
    position: 'defender',
    gender: 'female',
    birthDate: '1998-08-01',
    isCaptain: true,
    isLibero: false,
    createdAt: '2026-01-02',
    updatedAt: '2026-01-02',
  },
];

describe('Fase 4: Relatórios HTML Contextuais, Compartilháveis e Responsivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(dataAccess.listCompetitions).mockResolvedValue(mockCompetitions);
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue(mockAthletes);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue(mockCompetitionTeams);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Contexto e Identidade Visual (Fase 2 + Fase 3)
  // ───────────────────────────────────────────────────────────────────────────

  it('exibe identidade da competição e Apoiadores da Competição com competitionId válido na URL', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Copa Voltz Ouro 2026/i })).toBeDefined();
    });

    // Identidade da competição
    expect(screen.getByText('Voleibol de Quadra')).toBeDefined();
    expect(screen.getByText('Local: Arena Poliesportiva Central')).toBeDefined();
    expect(screen.getByText('Powered by')).toBeDefined();

    // Apoiadores da Competição (terminologia estrita)
    expect(screen.getByText('Apoiadores da Competição')).toBeDefined();
    expect(screen.getByText('Banco Alpha')).toBeDefined();
    expect(screen.getByText('Master')).toBeDefined();
    expect(screen.getByText('Água Cristalina')).toBeDefined();
    expect(screen.getByText('Apoio')).toBeDefined();
  });

  it('exibe alerta de "Competição não encontrada" e NUNCA seleciona silenciosamente em ID inválido', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=id-inexistente-xyz']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Competição não encontrada')).toBeDefined();
    });

    expect(screen.getByText(/id-inexistente-xyz/)).toBeDefined();
    expect(screen.queryByTestId('matches-boletim-view')).toBeNull();
  });

  it('utiliza fallback controlado de competição quando a URL não possui parâmetro', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Primeira competição cadastrada
      expect(screen.getByRole('heading', { level: 2, name: /Copa Voltz Ouro 2026/i })).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Parâmetro report na URL (Sem localStorage, com fallback controlado)
  // ───────────────────────────────────────────────────────────────────────────

  it('adota fallback para "boletim" quando o parâmetro report for omitido ou inválido', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1&report=invalido_xyz']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('matches-boletim-view')).toBeDefined();
    });

    // Confirma que não gravou report no localStorage
    expect(localStorage.getItem('report')).toBeNull();
    expect(localStorage.getItem('baseos_last_report')).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Camada de View Model e Renderização HTML dos 4 Relatórios
  // ───────────────────────────────────────────────────────────────────────────

  it('renderiza o Boletim Geral de Jogos em HTML (report=boletim) com dados do View Model', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1&report=boletim']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('matches-boletim-view')).toBeDefined();
    });

    expect(screen.getByText('101')).toBeDefined(); // matchNumber
    expect(screen.getByText('Voltz Stars')).toBeDefined();
    expect(screen.getByText('Cruzeiro Base')).toBeDefined();
    expect(screen.getByText('2 × 0')).toBeDefined(); // Placar do View Model
    expect(screen.getByText('Homologado')).toBeDefined();
  });

  it('renderiza a Classificação Oficial por Grupos em HTML (report=standings)', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1&report=standings']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('standings-report-view')).toBeDefined();
    });

    expect(screen.getByText(/Grupo A — Classificação Oficial/i)).toBeDefined();
    expect(screen.getByText(/Critérios Oficiais de Classificação e Desempate/i)).toBeDefined();
  });

  it('renderiza a Relação Nominal das Equipes em HTML (report=roster) com elencos e funções', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1&report=roster']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('team-rosters-report-view')).toBeDefined();
    });

    expect(screen.getByText('Bruninho Rezende')).toBeDefined();
    expect(screen.getByText('Capitão')).toBeDefined();
    expect(screen.getByText('Thales Hoss')).toBeDefined();
    expect(screen.getByText('Líbero')).toBeDefined();
    expect(screen.getByText('Renan Dal Zotto')).toBeDefined(); // Técnico
  });

  it('renderiza o Quadro de Honra e Pódio Oficial em HTML (report=podium)', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-beta-2&report=podium']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('podium-report-view')).toBeDefined();
    });

    // No torneio Beta, a final terminou com vitória de Duda e Ana Patrícia
    expect(screen.getByText(/Campeão Oficial/i)).toBeDefined();
    expect(screen.getByText('Duda e Ana Patrícia')).toBeDefined();
    expect(screen.getByText(/Vice-Campeão/i)).toBeDefined();
    expect(screen.getByText('Bárbara e Carol')).toBeDefined();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Cenário J: Isolamento Rigoroso entre Competições Distintas
  // ───────────────────────────────────────────────────────────────────────────

  it('Cenário J: garante isolamento rigoroso entre dados de competições distintas (zero vazamento de A para B)', async () => {
    // 1. Carrega Competição A (Voltz)
    const { unmount } = render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1&report=boletim']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Copa Voltz Ouro 2026/i })).toBeDefined();
    });

    expect(screen.getByText('Voltz Stars')).toBeDefined();
    expect(screen.queryByText('Duda e Ana Patrícia')).toBeNull();
    expect(screen.queryByText('Torneio Praia Beta 2026')).toBeNull();

    unmount();

    // 2. Carrega Competição B (Beta Praia)
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-beta-2&report=boletim']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Torneio Praia Beta 2026/i })).toBeDefined();
    });

    expect(screen.getByText('Duda e Ana Patrícia')).toBeDefined();
    expect(screen.queryByText('Voltz Stars')).toBeNull();
    expect(screen.queryByText('Cruzeiro Base')).toBeNull();
    expect(screen.queryByText('Copa Voltz Ouro 2026')).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. URL Compartilhável com Contexto Preservado
  // ───────────────────────────────────────────────────────────────────────────

  it('abre exatamente a competição e relatório indicados na URL compartilhada em nova sessão', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-beta-2&report=podium']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Torneio Praia Beta 2026/i })).toBeDefined();
    });

    // Relatório ativo é o pódio
    expect(screen.getByTestId('podium-report-view')).toBeDefined();
    expect(screen.queryByTestId('matches-boletim-view')).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Ações do Relatório: Compartilhamento, Impressão e Exportação PDF Sob Demanda
  // ───────────────────────────────────────────────────────────────────────────

  it('possui classe no-print nos botões de ação e seletores de relatório', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1&report=boletim']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('matches-boletim-view')).toBeDefined();
    });

    const shareBtn = screen.getByRole('button', { name: /Compartilhar/i });
    expect(shareBtn.closest('.no-print')).not.toBeNull();

    const printBtn = screen.getByRole('button', { name: /Imprimir/i });
    expect(printBtn.closest('.no-print')).not.toBeNull();

    const pdfBtn = screen.getByRole('button', { name: /Exportar PDF/i });
    expect(pdfBtn.closest('.no-print')).not.toBeNull();
  });

  it('exporta PDF sob demanda apenas ao clicar explicitamente no botão', async () => {
    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1&report=boletim']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('matches-boletim-view')).toBeDefined();
    });

    // Zero chamada automática antes do clique
    expect(reportsPdfModule.generateMatchesBoletimPdf).not.toHaveBeenCalled();

    // Clique explícito em Exportar PDF
    const exportBtn = screen.getByRole('button', { name: /Exportar PDF/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(reportsPdfModule.generateMatchesBoletimPdf).toHaveBeenCalled();
      expect(reportsPdfModule.downloadReportsPdf).toHaveBeenCalled();
    });
  });

  it('executa compartilhamento contextual via clipboard fallback quando navigator.share não existe', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
      share: undefined,
    });

    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-alpha-1&report=standings']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('standings-report-view')).toBeDefined();
    });

    const shareBtn = screen.getByRole('button', { name: /Compartilhar/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });
  });
});
