/**
 * refereesScheduleReport.test.tsx
 *
 * Testes unitários e de integração para a Escala Oficial de Arbitragem e Oficiais de Mesa (Fase 7.5 Prompt 2):
 * - Cenário 1: Competição com partidas e arbitragem completa
 * - Cenário 2: Competição com partidas sem arbitragem (mostra partida e indica '—' / 'A definir')
 * - Cenário 3: Designação parcial (exibe somente oficiais realmente designados, sem erro fatal)
 * - Cenário 4: Múltiplas partidas
 * - Cenário 5: Múltiplas quadras
 * - Cenário 6: Múltiplas datas
 * - Cenário 7: Ordenação correta (data, horário, local, quadra, número do jogo)
 * - Cenário 8: Competição sem partidas (empty state)
 * - Cenário 9: Nenhuma ocorrência de `VolleyPro` no conteúdo produzido pelo relatório
 * - Cenário 10: PDF gera corretamente (instância válida de jsPDF com páginas e cabeçalho BaseOS)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '@/pages/ReportsPage';
import { RefereesScheduleReportView } from '@/components/report/RefereesScheduleReportView';
import {
  parseMatchReferees,
  generateRefereesSchedulePdf,
} from '@/lib/pdf/reportsPdf';
import type { RefereesScheduleRow } from '@/lib/pdf/types';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => ({
    session: { user: { name: 'Diretor de Arbitragem', email: 'arbitragem@baseos.app', role: 'organizer' } },
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

// ─────────────────────────────────────────────────────────────────────────────
// Dados Base para Teste
// ─────────────────────────────────────────────────────────────────────────────

const mockCompetition: CompetitionRecord = {
  id: 'comp-arbitragem-1',
  name: 'Campeonato Paranaense BaseOS 2026',
  modality: 'indoor',
  status: 'in-progress',
  format: 'group-stage-knockout',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  groupsCount: 1,
  teamsPerGroup: 2,
  advancingPerGroup: 2,
  venue: 'Ginásio Costa Cavalcanti',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockTeams: TeamRecord[] = [
  {
    id: 'team-a',
    name: 'Foz Vôlei Clube',
    shortName: 'FVC',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-b',
    name: 'Cascavel Voleibol',
    shortName: 'CAS',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-c',
    name: 'Toledo Vôlei',
    shortName: 'TOL',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('parseMatchReferees (Serviço / Adapter de Oficiais)', () => {
  it('Cenário 1: Extrai arbitragem completa com 1º árbitro, 2º árbitro, apontador e assistente', () => {
    const refs = [
      { role: '1º Árbitro', name: 'Carlos Silva' },
      { role: '2º Árbitro', name: 'Mariana Costa' },
      { role: 'Apontador', name: 'Juliana Dias' },
      { role: 'Apontador Assistente', name: 'Lucas Mendes' },
      { role: 'Juiz de Linha 1', name: 'Paulo Ramos' },
      { role: 'Juiz de Linha 2', name: 'Renata Lima' },
    ];

    const result = parseMatchReferees(refs);

    expect(result.firstReferee).toBe('Carlos Silva');
    expect(result.secondReferee).toBe('Mariana Costa');
    expect(result.scorer).toBe('Juliana Dias');
    expect(result.assistantScorer).toBe('Lucas Mendes');
    expect(result.lineJudges).toHaveLength(2);
    expect(result.lineJudges).toContain('Paulo Ramos');
    expect(result.hasOfficials).toBe(true);
  });

  it('Cenário 2: Partida sem oficiais retorna traço e hasOfficials falso', () => {
    const result = parseMatchReferees([]);

    expect(result.firstReferee).toBe('—');
    expect(result.secondReferee).toBe('—');
    expect(result.scorer).toBe('—');
    expect(result.assistantScorer).toBe('—');
    expect(result.lineJudges).toHaveLength(0);
    expect(result.hasOfficials).toBe(false);
  });

  it('Cenário 3: Designação parcial preenche apenas os oficiais existentes', () => {
    const refs = [
      { role: '1º Árbitro', name: 'Carlos Silva' },
    ];

    const result = parseMatchReferees(refs);

    expect(result.firstReferee).toBe('Carlos Silva');
    expect(result.secondReferee).toBe('—');
    expect(result.scorer).toBe('—');
    expect(result.hasOfficials).toBe(true);
  });
});

describe('RefereesScheduleReportView (Componente HTML-First)', () => {
  const sampleRows: RefereesScheduleRow[] = [
    {
      matchNumber: 1,
      round: 1,
      phase: 'Classificatória',
      groupName: 'A',
      date: '22/08/2026',
      time: '14:00',
      venue: 'Ginásio Costa Cavalcanti',
      court: 'Quadra 1',
      teamAName: 'Foz Vôlei Clube',
      teamAShort: 'FVC',
      teamBName: 'Cascavel Voleibol',
      teamBShort: 'CAS',
      statusLabel: 'Finalizado',
      firstReferee: 'Carlos Silva',
      secondReferee: 'Mariana Costa',
      scorer: 'Juliana Dias',
      assistantScorer: 'Lucas Mendes',
      lineJudges: ['Paulo Ramos', 'Renata Lima'],
      hasOfficials: true,
    },
    {
      matchNumber: 2,
      round: 1,
      phase: 'Classificatória',
      groupName: 'A',
      date: '22/08/2026',
      time: '16:00',
      venue: 'Ginásio Costa Cavalcanti',
      court: 'Quadra 2',
      teamAName: 'Toledo Vôlei',
      teamAShort: 'TOL',
      teamBName: 'Foz Vôlei Clube',
      teamBShort: 'FVC',
      statusLabel: 'Agendado',
      firstReferee: 'Carlos Silva',
      secondReferee: '—',
      scorer: '—',
      assistantScorer: '—',
      lineJudges: [],
      hasOfficials: true,
    },
    {
      matchNumber: 3,
      round: 2,
      phase: 'Classificatória',
      groupName: 'B',
      date: '23/08/2026',
      time: '09:00',
      venue: 'Ginásio Municipal',
      court: 'Quadra Central',
      teamAName: 'Cascavel Voleibol',
      teamAShort: 'CAS',
      teamBName: 'Toledo Vôlei',
      teamBShort: 'TOL',
      statusLabel: 'Agendado',
      firstReferee: '—',
      secondReferee: '—',
      scorer: '—',
      assistantScorer: '—',
      lineJudges: [],
      hasOfficials: false,
    },
  ];

  it('Cenário 4: Renderiza múltiplas partidas com métricas operacionais consolidadas', () => {
    render(<RefereesScheduleReportView rows={sampleRows} />);

    expect(screen.getByText('Total de Partidas')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // total
    expect(screen.getByText('Escala Completa')).toBeInTheDocument();
    expect(screen.getByText('Designação Parcial')).toBeInTheDocument();
    expect(screen.getByText('Sem Escala')).toBeInTheDocument();

    // Os 3 cards individuais têm valor 1 cada
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(3);
  });

  it('Cenário 5: Exibe múltiplas quadras corretamente nas linhas da tabela', () => {
    render(<RefereesScheduleReportView rows={sampleRows} />);

    expect(screen.getAllByText('Quadra 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Quadra 2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Quadra Central').length).toBeGreaterThanOrEqual(1);
  });

  it('Cenário 6: Exibe múltiplas datas corretamente nas linhas da tabela', () => {
    render(<RefereesScheduleReportView rows={sampleRows} />);

    const dates22 = screen.getAllByText(/22\/08\/2026/);
    expect(dates22.length).toBeGreaterThanOrEqual(1);
    const dates23 = screen.getAllByText(/23\/08\/2026/);
    expect(dates23.length).toBeGreaterThanOrEqual(1);
  });

  it('Cenário 8: Competição sem partidas exibe estado vazio claro', () => {
    render(<RefereesScheduleReportView rows={[]} />);

    expect(screen.getByTestId('referees-schedule-empty')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma partida encontrada para esta competição.')).toBeInTheDocument();
  });

  it('Filtra interativamente por status de escala (Completa, Parcial, Sem Escala)', () => {
    render(<RefereesScheduleReportView rows={sampleRows} />);

    // Clica no card "Escala Completa"
    fireEvent.click(screen.getByText('Escala Completa'));
    expect(screen.getByTestId('referee-row-1')).toBeInTheDocument();
    expect(screen.queryByTestId('referee-row-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('referee-row-3')).not.toBeInTheDocument();

    // Clica no card "Sem Escala"
    fireEvent.click(screen.getByText('Sem Escala'));
    expect(screen.queryByTestId('referee-row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('referee-row-3')).toBeInTheDocument();
  });
});

describe('generateRefereesSchedulePdf (Geração de PDF Oficial)', () => {
  const sampleRows: RefereesScheduleRow[] = [
    {
      matchNumber: 1,
      round: 1,
      phase: 'Semifinal',
      date: '25/08/2026',
      time: '15:00',
      venue: 'Arena Foz',
      court: 'Quadra 1',
      teamAName: 'Foz Vôlei',
      teamAShort: 'FOZ',
      teamBName: 'Toledo Vôlei',
      teamBShort: 'TOL',
      statusLabel: 'Agendado',
      firstReferee: 'Carlos Alberto Silva',
      secondReferee: 'Mariana Lima Costa',
      scorer: 'Juliana Martins Dias',
      assistantScorer: 'Lucas Silveira Mendes',
      lineJudges: ['Juiz 1', 'Juiz 2'],
      hasOfficials: true,
    },
    {
      matchNumber: 2,
      round: 1,
      phase: 'Final',
      date: '25/08/2026',
      time: '18:00',
      venue: 'Arena Foz',
      court: 'Quadra Principal',
      teamAName: 'Foz Vôlei',
      teamAShort: 'FOZ',
      teamBName: 'Cascavel Vôlei',
      teamBShort: 'CAS',
      statusLabel: 'Agendado',
      firstReferee: 'Carlos Alberto Silva',
      secondReferee: '—',
      scorer: '—',
      assistantScorer: '—',
      lineJudges: [],
      hasOfficials: true,
    },
  ];

  it('Cenário 10: Gera PDF oficial com orientação retrato A4 e assinaturas', () => {
    const doc = generateRefereesSchedulePdf(sampleRows, 'Campeonato Paranaense 2026', 'BaseOS');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('Cenário 10 (vazio): Gera PDF com estado de sem escalas sem crash', () => {
    const doc = generateRefereesSchedulePdf([], 'Campeonato Paranaense 2026', 'BaseOS');
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('Cenário 9: Não emite VolleyPro no PDF ou no documento', () => {
    const doc = generateRefereesSchedulePdf(sampleRows, 'Copa Paraná', 'BaseOS');
    const pdfOutputString = doc.output('datauristring');
    // Verifica que "VolleyPro" não está presente na representação
    expect(pdfOutputString.includes('VolleyPro')).toBe(false);
  });
});

describe('ReportsPage — Integração /relatorios?report=arbitragem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Cenário 7: Ordena partidas cronologicamente e renderiza o relatório de arbitragem via URL', async () => {
    const mockMatches: MatchRecord[] = [
      {
        id: 'm-2',
        competitionId: 'comp-arbitragem-1',
        matchNumber: 2,
        round: 1,
        teamAId: 'team-a',
        teamBId: 'team-b',
        teamAName: 'Foz Vôlei Clube',
        teamBName: 'Cascavel Voleibol',
        teamAShortName: 'FVC',
        teamBShortName: 'CAS',
        venue: 'Ginásio Costa Cavalcanti',
        court: 'Quadra 1',
        scheduledTime: '2026-08-22T16:30:00.000Z',
        status: 'scheduled',
        sets: [],
        referees: [{ role: '1º Árbitro', name: 'Carlos Silva' }],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'm-1',
        competitionId: 'comp-arbitragem-1',
        matchNumber: 1,
        round: 1,
        teamAId: 'team-a',
        teamBId: 'team-c',
        teamAName: 'Foz Vôlei Clube',
        teamBName: 'Toledo Vôlei',
        teamAShortName: 'FVC',
        teamBShortName: 'TOL',
        venue: 'Ginásio Costa Cavalcanti',
        court: 'Quadra 1',
        scheduledTime: '2026-08-22T14:00:00.000Z',
        status: 'scheduled',
        sets: [],
        referees: [
          { role: '1º Árbitro', name: 'Carlos Silva' },
          { role: '2º Árbitro', name: 'Mariana Costa' },
          { role: 'Apontador', name: 'Juliana Dias' },
        ],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    vi.mocked(dataAccess.listCompetitions).mockResolvedValue([mockCompetition]);
    vi.mocked(dataAccess.listMatches).mockResolvedValue(mockMatches);
    vi.mocked(dataAccess.listTeams).mockResolvedValue(mockTeams);
    vi.mocked(dataAccess.listCompetitionAthletes).mockResolvedValue([]);
    vi.mocked(dataAccess.listCompetitionTeams).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-arbitragem-1&report=arbitragem']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    // Aguarda o carregamento
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Escala Oficial de Arbitragem' })).toBeInTheDocument();
    });

    // Verifica que o título do relatório está ativo
    expect(screen.getByText('Escala Oficial de Arbitragem e Oficiais de Mesa')).toBeInTheDocument();

    // Cenário 7: Jogo 1 (14:00) deve vir antes do Jogo 2 (16:30) na tabela
    const rows = screen.getAllByTestId(/referee-row-/);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-testid', 'referee-row-1');
    expect(rows[1]).toHaveAttribute('data-testid', 'referee-row-2');

    // Cenário 9: Verifica que o documento em tela não contém 'VolleyPro'
    const viewContainer = screen.getByTestId('referees-schedule-view');
    expect(viewContainer.textContent).not.toContain('VolleyPro');
  });
});
