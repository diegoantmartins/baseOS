/**
 * delegationReport.test.tsx
 *
 * Testes unitários e de integração para o Relatório Oficial de Delegações,
 * Responsáveis e Comissão Técnica (BaseOS Fase 7.5 Prompt 7):
 * - Equipe com elenco completo
 * - Equipe sem atletas
 * - Múltiplas equipes e isolamento por competição
 * - Responsável/dirigente existente vs ausente
 * - Comissão técnica existente (treinador, auxiliar, preparador, médico) vs ausente
 * - Status de inscrição da equipe (approved, pending, draft, rejected)
 * - Ordenação de atletas (camisa ASC, atletas sem número por nome ASC, id ASC)
 * - Flags de capitão e líbero
 * - Modalidades indoor e beach
 * - Tratamento seguro de competição nula / estado vazio
 * - Geração oficial do PDF BaseOS
 * - Renderização do componente HTML-First (DelegationReportView)
 * - Filtros operacionais (equipe, status, busca)
 * - Ausência de "VolleyPro"
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  buildDelegationReportData,
  sortDelegationAthletes,
  formatRegistrationStatus,
} from '@/services/delegationReportService';
import { DelegationReportView } from '@/components/report/DelegationReportView';
import { generateDelegationReportPdf } from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures Reais BaseOS
// ─────────────────────────────────────────────────────────────────────────────

const mockCompetitionIndoor: CompetitionRecord = {
  id: 'comp-del-1',
  name: 'Copa Regional BaseOS 2026',
  modality: 'indoor',
  status: 'in-progress',
  format: 'group-stage-knockout',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  groupsCount: 1,
  teamsPerGroup: 4,
  advancingPerGroup: 2,
  venue: 'Ginásio Poliesportivo BaseOS',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockCompetitionBeach: CompetitionRecord = {
  id: 'comp-beach-1',
  name: 'Circuito BaseOS Praia 2026',
  modality: 'beach',
  status: 'in-progress',
  format: 'group-stage-knockout',
  playerFormat: '2x2',
  setFormat: '3-sets',
  genderCategory: 'female',
  groupsCount: 1,
  teamsPerGroup: 2,
  advancingPerGroup: 1,
  venue: 'Arena de Praia 1',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockTeams: TeamRecord[] = [
  {
    id: 'team-alvorada',
    name: 'Alvorada Voleibol Clube',
    shortName: 'ALV',
    city: 'Belo Horizonte',
    state: 'MG',
    modality: 'indoor',
    managerName: 'Carlos Mendonça',
    managerEmail: 'carlos@alvorada.com.br',
    managerPhone: '(31) 99888-1122',
    coachName: 'Prof. Roberto Silva',
    assistantCoach: 'Ana Paula Costa',
    physicalTrainer: 'Lucas Meireles',
    doctor: 'Dra. Fernanda Ramos',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-voltz',
    name: 'Voltz Sports Team',
    shortName: 'VOL',
    city: 'Curitiba',
    state: 'PR',
    modality: 'indoor',
    // Sem dirigente e sem comissão técnica para testar tratamento de campos ausentes
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'team-praia',
    name: 'Dupla Sol & Areia',
    shortName: 'SOL',
    city: 'Fortaleza',
    state: 'CE',
    modality: 'beach',
    managerName: 'Mariana Souza',
    coachName: 'Técnico Beach Marcelo',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockCompetitionTeams: CompetitionTeam[] = [
  {
    id: 'ct-alv',
    competitionId: 'comp-del-1',
    teamId: 'team-alvorada',
    teamName: 'Alvorada Voleibol Clube',
    teamShortName: 'ALV',
    accessToken: 'tok-alv',
    registrationDeadline: '2026-08-01',
    isLocked: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'approved',
  },
  {
    id: 'ct-vol',
    competitionId: 'comp-del-1',
    teamId: 'team-voltz',
    teamName: 'Voltz Sports Team',
    teamShortName: 'VOL',
    accessToken: 'tok-vol',
    registrationDeadline: '2026-08-01',
    isLocked: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'invited', // 'invited' é tratado como Pendente
  },
  // Equipe em outra competição (comp-beach-1)
  {
    id: 'ct-beach',
    competitionId: 'comp-beach-1',
    teamId: 'team-praia',
    teamName: 'Dupla Sol & Areia',
    teamShortName: 'SOL',
    accessToken: 'tok-beach',
    registrationDeadline: '2026-08-01',
    isLocked: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    status: 'in_progress', // 'in_progress' é status real de preenchimento
  },
];

const mockAthletes: CompetitionAthlete[] = [
  {
    id: 'ath-1',
    competitionTeamId: 'ct-alv',
    name: 'Bruno Lima',
    jerseyNumber: 10,
    position: 'Levantador',
    documentNumber: '11.222.333-4',
    isCaptain: true,
    isLibero: false,
    gender: 'male',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-2',
    competitionTeamId: 'ct-alv',
    name: 'André Santos',
    jerseyNumber: 2,
    position: 'Central',
    documentNumber: '22.333.444-5',
    isCaptain: false,
    isLibero: false,
    gender: 'male',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-3',
    competitionTeamId: 'ct-alv',
    name: 'Tiago Rocha',
    jerseyNumber: 17,
    position: 'Líbero',
    documentNumber: '33.444.555-6',
    isCaptain: false,
    isLibero: true,
    gender: 'male',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-4',
    competitionTeamId: 'ct-alv',
    name: 'Guilherme Sem Número',
    jerseyNumber: undefined,
    position: 'Ponteiro',
    documentNumber: '44.555.666-7',
    isCaptain: false,
    isLibero: false,
    gender: 'male',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ath-5',
    competitionTeamId: 'ct-alv',
    name: 'Bernardo Sem Número',
    jerseyNumber: undefined,
    position: 'Oposto',
    documentNumber: '55.666.777-8',
    isCaptain: false,
    isLibero: false,
    gender: 'male',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  // Atleta da equipe de praia em outra competição
  {
    id: 'ath-beach-1',
    competitionTeamId: 'ct-beach',
    name: 'Camila Areia',
    jerseyNumber: 1,
    position: 'Jogadora 1',
    documentNumber: '77.888.999-0',
    isCaptain: true,
    isLibero: false,
    gender: 'female',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Testes de Unidade: Servico delegationReportService
// ─────────────────────────────────────────────────────────────────────────────

describe('delegationReportService', () => {
  it('formata os status de inscrição corretamente', () => {
    expect(formatRegistrationStatus('approved')).toBe('Aprovada');
    expect(formatRegistrationStatus('pending')).toBe('Pendente');
    expect(formatRegistrationStatus('invited')).toBe('Pendente');
    expect(formatRegistrationStatus('draft')).toBe('Rascunho');
    expect(formatRegistrationStatus('in_progress')).toBe('Em Preenchimento');
    expect(formatRegistrationStatus('rejected')).toBe('Rejeitada');
    expect(formatRegistrationStatus(undefined as unknown as string)).toBe('Pendente');
    expect(formatRegistrationStatus('outro')).toBe('outro');
  });

  it('ordena atletas corretamente: camisas ASC, sem camisa por nome ASC, id ASC', () => {
    const list = [
      { athleteId: '3', name: 'Zezinho', jerseyNumber: undefined, position: 'Ponta', isCaptain: false, isLibero: false },
      { athleteId: '1', name: 'Carlos', jerseyNumber: 12, position: 'Central', isCaptain: false, isLibero: false },
      { athleteId: '2', name: 'Ana', jerseyNumber: 5, position: 'Levantador', isCaptain: false, isLibero: false },
      { athleteId: '4', name: 'Alan', jerseyNumber: undefined, position: 'Oposto', isCaptain: false, isLibero: false },
    ];
    const sorted = sortDelegationAthletes(list);
    expect(sorted[0].name).toBe('Ana'); // camisa 5
    expect(sorted[1].name).toBe('Carlos'); // camisa 12
    expect(sorted[2].name).toBe('Alan'); // sem camisa, letra A
    expect(sorted[3].name).toBe('Zezinho'); // sem camisa, letra Z
  });

  it('trata graciosamente competição nula ou indefinida', () => {
    const emptyResult = buildDelegationReportData({
      competition: null,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });
    expect(emptyResult.competitionId).toBe('');
    expect(emptyResult.competitionName).toBe('Competição');
    expect(emptyResult.teams).toHaveLength(0);
    expect(emptyResult.metrics.totalTeams).toBe(0);
    expect(emptyResult.metrics.totalAthletes).toBe(0);
  });

  it('isola equipes e atletas pela competição solicitada', () => {
    const dataIndoor = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    // Apenas ct-alv e ct-vol pertencem a comp-del-1
    expect(dataIndoor.competitionId).toBe('comp-del-1');
    expect(dataIndoor.competitionName).toBe('Copa Regional BaseOS 2026');
    expect(dataIndoor.teams).toHaveLength(2);
    expect(dataIndoor.teams.map((t) => t.teamId)).toContain('team-alvorada');
    expect(dataIndoor.teams.map((t) => t.teamId)).toContain('team-voltz');
    expect(dataIndoor.teams.map((t) => t.teamId)).not.toContain('team-praia');

    // Equipe Alvorada deve ter 5 atletas inscritos
    const alvorada = dataIndoor.teams.find((t) => t.teamId === 'team-alvorada')!;
    expect(alvorada.athleteCount).toBe(5);
    expect(alvorada.athletes).toHaveLength(5);

    // Primeiro atleta ordenado por número de camisa: camisa 2 (André)
    expect(alvorada.athletes[0].name).toBe('André Santos');
    expect(alvorada.athletes[0].jerseyNumber).toBe(2);

    // Segundo atleta: camisa 10 (Bruno Lima - Capitão)
    expect(alvorada.athletes[1].name).toBe('Bruno Lima');
    expect(alvorada.athletes[1].jerseyNumber).toBe(10);
    expect(alvorada.athletes[1].isCaptain).toBe(true);

    // Terceiro atleta: camisa 17 (Tiago Rocha - Líbero)
    expect(alvorada.athletes[2].name).toBe('Tiago Rocha');
    expect(alvorada.athletes[2].isLibero).toBe(true);

    // Atletas sem número ordenados por nome: Bernardo vem antes de Guilherme
    expect(alvorada.athletes[3].name).toBe('Bernardo Sem Número');
    expect(alvorada.athletes[4].name).toBe('Guilherme Sem Número');
  });

  it('consolida corretamente equipe sem atletas', () => {
    const dataIndoor = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    const voltz = dataIndoor.teams.find((t) => t.teamId === 'team-voltz')!;
    expect(voltz.athleteCount).toBe(0);
    expect(voltz.athletes).toHaveLength(0);
    expect(voltz.managerName).toBeUndefined();
    expect(voltz.coachName).toBeUndefined();
    expect(voltz.registrationStatus).toBe('Pendente');
  });

  it('extrai corretamente dirigente e comissão técnica completa quando presentes', () => {
    const dataIndoor = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    const alvorada = dataIndoor.teams.find((t) => t.teamId === 'team-alvorada')!;
    expect(alvorada.managerName).toBe('Carlos Mendonça');
    expect(alvorada.managerEmail).toBe('carlos@alvorada.com.br');
    expect(alvorada.managerPhone).toBe('(31) 99888-1122');
    expect(alvorada.coachName).toBe('Prof. Roberto Silva');
    expect(alvorada.assistantCoach).toBe('Ana Paula Costa');
    expect(alvorada.physicalTrainer).toBe('Lucas Meireles');
    expect(alvorada.doctor).toBe('Dra. Fernanda Ramos');
    expect(alvorada.city).toBe('Belo Horizonte');
    expect(alvorada.state).toBe('MG');
    expect(alvorada.registrationStatus).toBe('Aprovada');
  });

  it('calcula métricas consolidadas com exatidão', () => {
    const dataIndoor = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    expect(dataIndoor.metrics.totalTeams).toBe(2);
    expect(dataIndoor.metrics.totalAthletes).toBe(5);
    expect(dataIndoor.metrics.approvedTeams).toBe(1);
    expect(dataIndoor.metrics.pendingTeams).toBe(1);
    expect(dataIndoor.metrics.teamsWithManager).toBe(1);
    expect(dataIndoor.metrics.teamsWithCoach).toBe(1);
  });

  it('suporta modalidade praia com atletas específicos', () => {
    const dataBeach = buildDelegationReportData({
      competition: mockCompetitionBeach,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    expect(dataBeach.competitionName).toBe('Circuito BaseOS Praia 2026');
    expect(dataBeach.competitionModality).toBe('beach');
    expect(dataBeach.teams).toHaveLength(1);
    const praiaTeam = dataBeach.teams[0];
    expect(praiaTeam.teamName).toBe('Dupla Sol & Areia');
    expect(praiaTeam.registrationStatus).toBe('Em Preenchimento');
    expect(praiaTeam.athleteCount).toBe(1);
    expect(praiaTeam.athletes[0].name).toBe('Camila Areia');
    expect(praiaTeam.athletes[0].isCaptain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Testes de Integração: Componente HTML DelegationReportView
// ─────────────────────────────────────────────────────────────────────────────

describe('DelegationReportView (HTML-First)', () => {
  it('renderiza métricas, delegações e atletas com identidade BaseOS', () => {
    const data = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    render(<DelegationReportView data={data} />);

    // Verifica cards de resumo
    expect(screen.getByText('Delegações')).toBeDefined();
    expect(screen.getByText('Atletas Inscritos')).toBeDefined();
    expect(screen.getByText('Aprovadas')).toBeDefined();
    expect(screen.getByText('Responsáveis')).toBeDefined();
    expect(screen.getByText('Comissão / Técnicos')).toBeDefined();

    // Verifica nomes das equipes
    expect(screen.getByText('Alvorada Voleibol Clube')).toBeDefined();
    expect(screen.getByText('Voltz Sports Team')).toBeDefined();

    // Verifica detalhes da equipe Alvorada
    expect(screen.getByText(/Belo Horizonte - MG/i)).toBeDefined();
    expect(screen.getByText('Carlos Mendonça')).toBeDefined();
    expect(screen.getByText(/Prof\. Roberto Silva/i)).toBeDefined();

    // Verifica atletas do elenco (renderizados em desktop e mobile)
    expect(screen.getAllByText('Bruno Lima').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('André Santos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tiago Rocha').length).toBeGreaterThanOrEqual(1);

    // Verifica que VolleyPro NÃO aparece na renderização
    expect(document.body.textContent).not.toContain('VolleyPro');
  });

  it('permite filtrar por busca textual (nome de atleta ou equipe)', () => {
    const data = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    render(<DelegationReportView data={data} />);

    const searchInput = screen.getByPlaceholderText(/Buscar equipe, atleta, técnico\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Bruno Lima' } });

    // A equipe Alvorada deve permanecer visível pois Bruno Lima joga nela
    expect(screen.getByTestId('delegation-card-team-alvorada')).toBeDefined();
    // Voltz Sports Team não possui Bruno Lima nem texto correspondente, deve ser ocultada
    expect(screen.queryByTestId('delegation-card-team-voltz')).toBeNull();
  });

  it('permite filtrar por status da inscrição via initialStatusFilter', () => {
    const data = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    render(<DelegationReportView data={data} initialStatusFilter="pending" />);

    // Voltz é pending, deve aparecer
    expect(screen.getByTestId('delegation-card-team-voltz')).toBeDefined();
    // Alvorada é approved, deve ser filtrada
    expect(screen.queryByTestId('delegation-card-team-alvorada')).toBeNull();
  });

  it('permite filtrar por equipe específica via initialTeamFilter', () => {
    const data = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    render(<DelegationReportView data={data} initialTeamFilter="team-voltz" />);

    expect(screen.getByTestId('delegation-card-team-voltz')).toBeDefined();
    expect(screen.queryByTestId('delegation-card-team-alvorada')).toBeNull();
  });

  it('exibe mensagem quando nenhuma delegação é cadastrada', () => {
    const emptyData = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: [],
      athletes: [],
      competitionTeams: [],
    });

    render(<DelegationReportView data={emptyData} />);
    expect(screen.getByText('Nenhuma delegação encontrada')).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Testes de Integração: Geração de PDF Oficial BaseOS
// ─────────────────────────────────────────────────────────────────────────────

describe('generateDelegationReportPdf', () => {
  it('gera documento jsPDF com estrutura válida e sem erros', () => {
    const data = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: mockTeams,
      athletes: mockAthletes,
      competitionTeams: mockCompetitionTeams,
    });

    const doc = generateDelegationReportPdf(data, 'Superliga BaseOS');
    expect(doc).toBeDefined();
    // Verifica contagem de páginas gerada
    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThanOrEqual(1);

    // O PDF deve conter metadados e tabelas válidas
    const output = doc.output();
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(100);
  });

  it('gera PDF limpo mesmo quando não há equipes inscritas', () => {
    const emptyData = buildDelegationReportData({
      competition: mockCompetitionIndoor,
      teams: [],
      athletes: [],
      competitionTeams: [],
    });

    const doc = generateDelegationReportPdf(emptyData, 'BaseOS');
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
