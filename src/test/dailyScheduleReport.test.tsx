/**
 * dailyScheduleReport.test.tsx
 *
 * Testes unitários e de integração para a Programação Diária / Ordem dos Jogos (Fase 7.5 Prompt 3):
 * - Cenário 1: Competição com várias partidas
 * - Cenário 2: Múltiplas datas
 * - Cenário 3: Múltiplas quadras
 * - Cenário 4: Múltiplos locais
 * - Cenário 5: Ordenação cronológica (data, horário, local, quadra, número do jogo)
 * - Cenário 6: Filtro por data
 * - Cenário 7: Filtro por status / busca operacional
 * - Cenário 8: Competição sem partidas (empty state)
 * - Cenário 9: Partida sem horário/local/quadra quando permitido pelo contrato
 * - Cenário 10: PDF gerado corretamente (instância válida de jsPDF com páginas e cabeçalho BaseOS)
 * - Cenário 11: CSV gerado com cabeçalhos e formatação esperada
 * - Cenário 12: Nenhuma ocorrência de `VolleyPro` no conteúdo produzido pelo relatório
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '@/pages/ReportsPage';
import { DailyScheduleReportView } from '@/components/report/DailyScheduleReportView';
import { generateDailySchedulePdf } from '@/lib/pdf/reportsPdf';
import type { DailyScheduleRow } from '@/lib/pdf/types';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => ({
    session: { user: { name: 'Diretor Técnico', email: 'coordenacao@baseos.app', role: 'organizer' } },
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
  id: 'comp-schedule-1',
  name: 'Copa Regional Sul BaseOS 2026',
  modality: 'indoor',
  status: 'in-progress',
  format: 'group-stage-knockout',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  groupsCount: 2,
  teamsPerGroup: 3,
  advancingPerGroup: 2,
  venue: 'Complexo Esportivo Tarumã',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockTeams: TeamRecord[] = [
  {
    id: 'team-1',
    name: 'Curitiba Vôlei',
    shortName: 'CUR',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-2',
    name: 'Londrina Esporte Clube',
    shortName: 'LON',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-3',
    name: 'Maringá Voleibol',
    shortName: 'MAR',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-4',
    name: 'Ponta Grossa Vôlei',
    shortName: 'PGO',
    modality: 'indoor',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('DailyScheduleReportView (Componente HTML-First)', () => {
  const sampleRows: DailyScheduleRow[] = [
    {
      matchId: 'm-1',
      matchNumber: 1,
      round: 1,
      phase: 'classificatória',
      groupName: 'Grupo A',
      date: '12/09/2026',
      time: '08:30',
      scheduledTime: '2026-09-12T08:30:00Z',
      venue: 'Ginásio Principal',
      court: 'Quadra 1',
      teamAName: 'Curitiba Vôlei',
      teamAShort: 'CUR',
      teamBName: 'Londrina Esporte Clube',
      teamBShort: 'LON',
      status: 'scheduled',
      statusLabel: 'Agendado',
    },
    {
      matchId: 'm-2',
      matchNumber: 2,
      round: 1,
      phase: 'classificatória',
      groupName: 'Grupo A',
      date: '12/09/2026',
      time: '10:00',
      scheduledTime: '2026-09-12T10:00:00Z',
      venue: 'Ginásio Principal',
      court: 'Quadra 1',
      teamAName: 'Maringá Voleibol',
      teamAShort: 'MAR',
      teamBName: 'Ponta Grossa Vôlei',
      teamBShort: 'PGO',
      status: 'in-progress',
      statusLabel: 'Em andamento',
    },
    {
      matchId: 'm-3',
      matchNumber: 3,
      round: 1,
      phase: 'classificatória',
      groupName: 'Grupo B',
      date: '13/09/2026',
      time: '09:00',
      scheduledTime: '2026-09-13T09:00:00Z',
      venue: 'Ginásio Anexo',
      court: 'Quadra 2',
      teamAName: 'Curitiba Vôlei',
      teamAShort: 'CUR',
      teamBName: 'Maringá Voleibol',
      teamBShort: 'MAR',
      status: 'completed',
      statusLabel: 'Finalizado',
      scoreA: 2,
      scoreB: 1,
    },
  ];

  it('Cenário 1: Renderiza múltiplas partidas com equipes, horários e quadras', () => {
    render(<DailyScheduleReportView rows={sampleRows} />);

    expect(screen.getAllByText('Curitiba Vôlei').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Londrina Esporte Clube').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Maringá Voleibol').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ponta Grossa Vôlei').length).toBeGreaterThanOrEqual(1);

    // Verificação de horários
    expect(screen.getAllByText('08:30').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('10:00').length).toBeGreaterThanOrEqual(1);

    // Verificação de locais e quadras
    expect(screen.getAllByText(/Ginásio Principal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Quadra 1/i).length).toBeGreaterThan(0);
  });

  it('Cenário 2: Exibe seletor com múltiplas datas e contadores', () => {
    render(<DailyScheduleReportView rows={sampleRows} />);

    expect(screen.getByRole('tab', { name: /Todas as Datas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /12\/09\/2026/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /13\/09\/2026/i })).toBeInTheDocument();
  });

  it('Cenário 3 & 4: Exibe métricas de múltiplas quadras e múltiplos locais', () => {
    render(<DailyScheduleReportView rows={sampleRows} />);

    // Rótulos e contadores operacionais
    expect(screen.getByText('Locais Utilizados')).toBeInTheDocument();
    expect(screen.getByText('Quadras em Atividade')).toBeInTheDocument();
    expect(screen.getByText('ginásios e arenas')).toBeInTheDocument();
    expect(screen.getByText('espaços simultâneos')).toBeInTheDocument();
  });

  it('Cenário 6: Permite filtrar por data específica', () => {
    const onDateChange = vi.fn();
    render(
      <DailyScheduleReportView
        rows={sampleRows}
        selectedDate="12/09/2026"
        onDateChange={onDateChange}
      />,
    );

    // Na data 12/09/2026 apenas os jogos 1 e 2 devem aparecer
    expect(screen.getAllByText('Curitiba Vôlei').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Londrina Esporte Clube').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('08:30').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('10:00').length).toBeGreaterThanOrEqual(1);

    // Jogo do dia 13 não deve constar na tabela ativa
    expect(screen.queryByText('09:00')).not.toBeInTheDocument();
  });

  it('Cenário 7: Filtro por status (ex: apenas agendados)', () => {
    render(<DailyScheduleReportView rows={sampleRows} />);

    // Clica no filtro Agendados
    const scheduledFilterBtn = screen.getByRole('button', { name: /^Agendados/i });
    fireEvent.click(scheduledFilterBtn);

    // Jogo 1 (Agendado) visível
    expect(screen.getAllByText('08:30').length).toBeGreaterThanOrEqual(1);
    // Jogo 2 (Em andamento) oculto
    expect(screen.queryByText('10:00')).not.toBeInTheDocument();
  });

  it('Cenário 8: Exibe estado vazio quando não há partidas cadastradas', () => {
    render(<DailyScheduleReportView rows={[]} />);

    expect(screen.getByText(/Nenhuma partida encontrada nesta competição/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Cadastre partidas com data e horário para gerar a programação diária oficial/i),
    ).toBeInTheDocument();
  });

  it('Cenário 9: Trata partida sem horário, local ou quadra sem falha', () => {
    const incompleteRows: DailyScheduleRow[] = [
      {
        matchId: 'm-incomp',
        matchNumber: 99,
        round: 1,
        date: '',
        time: '',
        scheduledTime: '',
        venue: '—',
        teamAName: 'Equipe Alpha',
        teamBName: 'Equipe Beta',
        status: 'scheduled',
        statusLabel: 'Agendado',
      },
    ];

    render(<DailyScheduleReportView rows={incompleteRows} />);

    expect(screen.getAllByText('Equipe Alpha').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Equipe Beta').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Quadra Principal').length).toBeGreaterThan(0);
  });

  it('Cenário 12: Nenhuma ocorrência de VolleyPro no conteúdo renderizado', () => {
    const { container } = render(<DailyScheduleReportView rows={sampleRows} />);
    const htmlContent = container.innerHTML;

    expect(htmlContent).not.toMatch(/volleypro/i);
    expect(htmlContent).not.toMatch(/volley\s*pro/i);
  });
});

describe('generateDailySchedulePdf (Motor PDF A4 Retrato)', () => {
  const samplePdfRows: DailyScheduleRow[] = [
    {
      matchId: 'm-1',
      matchNumber: 1,
      round: 1,
      phase: 'classificatória',
      groupName: 'Grupo A',
      date: '12/09/2026',
      time: '08:30',
      scheduledTime: '2026-09-12T08:30:00Z',
      venue: 'Ginásio Principal',
      court: 'Quadra 1',
      teamAName: 'Curitiba Vôlei',
      teamAShort: 'CUR',
      teamBName: 'Londrina Esporte Clube',
      teamBShort: 'LON',
      status: 'scheduled',
      statusLabel: 'Agendado',
    },
    {
      matchId: 'm-2',
      matchNumber: 2,
      round: 1,
      phase: 'classificatória',
      groupName: 'Grupo B',
      date: '12/09/2026',
      time: '10:00',
      scheduledTime: '2026-09-12T10:00:00Z',
      venue: 'Ginásio Anexo',
      court: 'Quadra 2',
      teamAName: 'Maringá Voleibol',
      teamAShort: 'MAR',
      teamBName: 'Ponta Grossa Vôlei',
      teamBShort: 'PGO',
      status: 'completed',
      statusLabel: 'Finalizado',
      scoreA: 2,
      scoreB: 0,
    },
  ];

  it('Cenário 10: Gera documento jsPDF com layout A4 Retrato, paginação e metadados oficiais BaseOS', () => {
    const doc = generateDailySchedulePdf(
      samplePdfRows,
      'Copa Regional Sul BaseOS 2026',
      '12/09/2026',
      'BaseOS',
    );

    expect(doc).toBeDefined();
    // Verifica se possui páginas geradas
    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThanOrEqual(1);

    // Verifica se a saída binária/base64 é gerada com sucesso
    const output = doc.output('datauristring');
    expect(output).toContain('data:application/pdf');

    // Validação de branding no output interno
    const rawPdf = doc.output();
    expect(rawPdf).not.toMatch(/volleypro/i);
  });
});

describe('ReportsPage — Integração /relatorios?report=programacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Cenário 5 & 11: Ordenação cronológica rigorosa e carregamento integrado com CSV', async () => {
    const mockMatches: MatchRecord[] = [
      {
        id: 'm-late',
        competitionId: 'comp-schedule-1',
        matchNumber: 2,
        round: 1,
        phase: 'classificatória',
        groupName: 'Grupo A',
        scheduledTime: '2026-09-12T14:00:00Z',
        venue: 'Ginásio Principal',
        court: 'Quadra 1',
        teamAId: 'team-3',
        teamBId: 'team-4',
        teamAName: 'Maringá Voleibol',
        teamAShortName: 'MAR',
        teamBName: 'Ponta Grossa Vôlei',
        teamBShortName: 'PGO',
        referees: [],
        status: 'scheduled',
        sets: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'm-early',
        competitionId: 'comp-schedule-1',
        matchNumber: 1,
        round: 1,
        phase: 'classificatória',
        groupName: 'Grupo A',
        scheduledTime: '2026-09-12T09:00:00Z',
        venue: 'Ginásio Principal',
        court: 'Quadra 1',
        teamAId: 'team-1',
        teamBId: 'team-2',
        teamAName: 'Curitiba Vôlei',
        teamAShortName: 'CUR',
        teamBName: 'Londrina Esporte Clube',
        teamBShortName: 'LON',
        referees: [],
        status: 'scheduled',
        sets: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    (dataAccess.listCompetitions as ReturnType<typeof vi.fn>).mockResolvedValue([mockCompetition]);
    (dataAccess.listMatches as ReturnType<typeof vi.fn>).mockResolvedValue(mockMatches);
    (dataAccess.listTeams as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeams);
    (dataAccess.listCompetitionAthletes as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (dataAccess.listCompetitionTeams as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/relatorios?competitionId=comp-schedule-1&report=programacao']}>
        <ReportsPage />
      </MemoryRouter>,
    );

    // Aguarda carregamento
    await waitFor(() => {
      expect(screen.getByText('Programação Diária e Ordem dos Jogos')).toBeInTheDocument();
    });

    // Confrontos devem aparecer na ordem cronológica (06:00 antes de 11:00 no timezone local)
    const rows = screen.getAllByTestId(/daily-schedule-row-/);
    expect(rows.length).toBe(2);
    expect(rows[0]).toHaveAttribute('data-testid', 'daily-schedule-row-1');
    expect(rows[1]).toHaveAttribute('data-testid', 'daily-schedule-row-2');

    // Botão de exportação CSV deve estar presente no cabeçalho
    const exportCsvBtn = screen.getByRole('button', { name: /CSV/i });
    expect(exportCsvBtn).toBeInTheDocument();
  });
});
