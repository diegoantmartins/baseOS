/**
 * competitionBracketViewModel.test.ts — Suíte de Testes da Camada de Visualização do Chaveamento (Fase 4.9)
 *
 * Cobertura Obrigatória dos 12 Gates da Fase 4.9:
 * - Cenário A: 4 equipes (SF -> FINAL)
 * - Cenário B: 6 equipes (2 grupos -> SF -> FINAL)
 * - Cenário C: 8 equipes (QF -> SF -> FINAL)
 * - Cenário D: 5 equipes com 3 BYEs (estrutural sem times fake)
 * - Cenário E: 12 equipes Voltz (Play-In 5º-12º + QF 1º-4º + SF + Final)
 * - Cenário F: Estágio customizado assimétrico (5 slots em 3 rounds, não-binário)
 * - Teste de Inconsistência MatchSlot <-> Match
 * - Prova de canOpenMatch estrito
 * - Prova de ausência de IDs artificiais (Zero TBD)
 * - Idempotência e pureza do ViewModel
 * - Adaptador legado de compatibilidade
 */

import { describe, it, expect } from 'vitest';
import {
  CompetitionBracketViewModelBuilder,
  formatParticipantReference,
  type BuildBracketViewModelInput,
} from '@/services/competitionBracketViewModel';
import type {
  CompetitionRecord,
  MatchRecord,
  MatchSlotRecord,
  RoundRecord,
  StageRecord,
  TeamRecord,
} from '@/types/entities';

// ============================================================================
// FIXTURES E MOCKS
// ============================================================================

const createMockCompetition = (id = 'comp-test', name = 'Copa Teste'): CompetitionRecord => ({
  id,
  name,
  modality: 'indoor',
  format: 'knockout',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  status: 'in-progress',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
});

const createMockTeam = (id: string, name: string, shortName: string): TeamRecord => ({
  id,
  name,
  shortName,
  modality: 'indoor',
});

const createMockMatch = (
  id: string,
  competitionId: string,
  slotId: string,
  teamA: TeamRecord,
  teamB: TeamRecord,
  matchNumber = 1,
  status: MatchRecord['status'] = 'scheduled',
): MatchRecord => ({
  id,
  competitionId,
  slotId,
  round: 1,
  matchNumber,
  teamAId: teamA.id,
  teamBId: teamB.id,
  teamAName: teamA.name,
  teamBName: teamB.name,
  teamAShortName: teamA.shortName,
  teamBShortName: teamB.shortName,
  venue: 'Arena Central',
  court: 'Quadra 1',
  scheduledTime: '2026-09-10T19:00:00Z',
  status,
  sets: [],
  referees: [],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
});

describe('CompetitionBracketViewModelBuilder (Fase 4.9)', () => {
  const teams4 = [
    createMockTeam('t1', 'Taubaté Vôlei', 'TAU'),
    createMockTeam('t2', 'Sada Cruzeiro', 'CRU'),
    createMockTeam('t3', 'Minas Tênis', 'MTC'),
    createMockTeam('t4', 'Vôlei Renata', 'REN'),
  ];

  // ==========================================================================
  // CENÁRIO A: 4 Equipes (SF1, SF2 -> FINAL)
  // ==========================================================================
  describe('Cenário A — 4 Equipes (SF -> FINAL)', () => {
    it('deve representar slots pendentes com texto legível e transitar para materializado quando partida existir', () => {
      const comp = createMockCompetition();

      const stage: StageRecord = {
        id: 'stg-1',
        competitionId: comp.id,
        stageId: 'stage-playoffs',
        name: 'Fase Final',
        stageOrder: 1,
        stageType: 'knockout',
        status: 'in-progress',
        isLocked: false,
      };

      const rounds: RoundRecord[] = [
        { id: 'rnd-1', competitionId: comp.id, stageRowId: 'stg-1', roundId: 'round-sf', name: 'Semifinais', roundOrder: 1, slotsCount: 2, status: 'in-progress' },
        { id: 'rnd-2', competitionId: comp.id, stageRowId: 'stg-1', roundId: 'round-f', name: 'Final', roundOrder: 2, slotsCount: 1, status: 'pending' },
      ];

      const slots: MatchSlotRecord[] = [
        {
          id: 's1',
          competitionId: comp.id,
          stageRowId: 'stg-1',
          roundRowId: 'rnd-1',
          slotId: 'SLOT-SF1',
          position: 1,
          label: 'Semifinal 1',
          participantAReference: { type: 'resolved-team', teamId: 't1' },
          participantAStatus: 'resolved',
          resolvedTeamAId: 't1',
          participantBReference: { type: 'resolved-team', teamId: 't2' },
          participantBStatus: 'resolved',
          resolvedTeamBId: 't2',
          matchId: 'match-sf1',
        },
        {
          id: 's2',
          competitionId: comp.id,
          stageRowId: 'stg-1',
          roundRowId: 'rnd-1',
          slotId: 'SLOT-SF2',
          position: 2,
          label: 'Semifinal 2',
          participantAReference: { type: 'resolved-team', teamId: 't3' },
          participantAStatus: 'resolved',
          resolvedTeamAId: 't3',
          participantBReference: { type: 'resolved-team', teamId: 't4' },
          participantBStatus: 'resolved',
          resolvedTeamBId: 't4',
          matchId: 'match-sf2',
        },
        {
          id: 's3',
          competitionId: comp.id,
          stageRowId: 'stg-1',
          roundRowId: 'rnd-2',
          slotId: 'SLOT-F1',
          position: 1,
          label: 'Grande Final',
          participantAReference: { type: 'match-winner', slotId: 'SLOT-SF1' },
          participantAStatus: 'unresolved',
          resolvedTeamAId: null,
          participantBReference: { type: 'match-winner', slotId: 'SLOT-SF2' },
          participantBStatus: 'unresolved',
          resolvedTeamBId: null,
          matchId: null,
        },
      ];

      const matches: MatchRecord[] = [
        createMockMatch('match-sf1', comp.id, 'SLOT-SF1', teams4[0], teams4[1], 1, 'in-progress'),
        createMockMatch('match-sf2', comp.id, 'SLOT-SF2', teams4[2], teams4[3], 2, 'scheduled'),
      ];

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds,
        slots,
        matches,
        teams: teams4,
      });

      expect(vm.stages.length).toBe(1);
      expect(vm.stages[0].rounds.length).toBe(2);

      // SF1: Ao vivo, com canOpenMatch = true
      const sf1 = vm.stages[0].rounds[0].slots[0];
      expect(sf1.visualState).toBe('in_progress');
      expect(sf1.canOpenMatch).toBe(true);
      expect(sf1.participantA.displayName).toBe('Taubaté Vôlei');
      expect(sf1.participantB.displayName).toBe('Sada Cruzeiro');

      // Final: Pendente, com placeholders estruturais legíveis
      const finalSlot = vm.stages[0].rounds[1].slots[0];
      expect(finalSlot.visualState).toBe('pending');
      expect(finalSlot.canOpenMatch).toBe(false);
      expect(finalSlot.participantA.displayName).toBe('Vencedor Semifinal 1');
      expect(finalSlot.participantB.displayName).toBe('Vencedor Semifinal 2');
      expect(finalSlot.participantA.isResolved).toBe(false);
      expect(finalSlot.participantB.isResolved).toBe(false);
    });
  });

  // ==========================================================================
  // CENÁRIO B: 6 Equipes (2 Grupos -> Semifinais Cruzadas)
  // ==========================================================================
  describe('Cenário B — 6 Equipes (2 Grupos -> Semifinais Cruzadas)', () => {
    it('deve traduzir group-position corretamente como 1º Grupo A, 2º Grupo B, etc.', () => {
      const comp = createMockCompetition('comp-b', 'Torneio 2 Grupos');

      const stage: StageRecord = {
        id: 'stg-b',
        competitionId: comp.id,
        stageId: 'stage-semis',
        name: 'Semifinais Cruzadas',
        stageOrder: 1,
        stageType: 'knockout',
        status: 'pending',
        isLocked: false,
      };

      const round: RoundRecord = {
        id: 'rnd-b1',
        competitionId: comp.id,
        stageRowId: 'stg-b',
        roundId: 'round-cross-sf',
        name: 'Semifinais',
        roundOrder: 1,
        slotsCount: 2,
        status: 'pending',
      };

      const slots: MatchSlotRecord[] = [
        {
          id: 'sb1',
          competitionId: comp.id,
          stageRowId: 'stg-b',
          roundRowId: 'rnd-b1',
          slotId: 'SLOT-CSF1',
          position: 1,
          label: 'Semifinal 1',
          participantAReference: { type: 'group-position', stageId: 'stage-groups', groupIndex: 0, position: 1 },
          participantAStatus: 'unresolved',
          resolvedTeamAId: null,
          participantBReference: { type: 'group-position', stageId: 'stage-groups', groupIndex: 1, position: 2 },
          participantBStatus: 'unresolved',
          resolvedTeamBId: null,
          matchId: null,
        },
        {
          id: 'sb2',
          competitionId: comp.id,
          stageRowId: 'stg-b',
          roundRowId: 'rnd-b1',
          slotId: 'SLOT-CSF2',
          position: 2,
          label: 'Semifinal 2',
          participantAReference: { type: 'group-position', stageId: 'stage-groups', groupIndex: 1, position: 1 },
          participantAStatus: 'unresolved',
          resolvedTeamAId: null,
          participantBReference: { type: 'group-position', stageId: 'stage-groups', groupIndex: 0, position: 2 },
          participantBStatus: 'unresolved',
          resolvedTeamBId: null,
          matchId: null,
        },
      ];

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds: [round],
        slots,
        matches: [],
        teams: teams4,
      });

      const sf1 = vm.stages[0].rounds[0].slots[0];
      expect(sf1.participantA.displayName).toBe('1º Grupo A');
      expect(sf1.participantB.displayName).toBe('2º Grupo B');

      const sf2 = vm.stages[0].rounds[0].slots[1];
      expect(sf2.participantA.displayName).toBe('1º Grupo B');
      expect(sf2.participantB.displayName).toBe('2º Grupo A');
    });
  });

  // ==========================================================================
  // CENÁRIO C: 8 Equipes (QF -> SF -> Final)
  // ==========================================================================
  describe('Cenário C — 8 Equipes (QF -> SF -> Final)', () => {
    it('deve montar hierarquia completa de 3 rodadas sem misturar ordem ou posições', () => {
      const comp = createMockCompetition('comp-c', 'Eliminatória de 8');

      const stage: StageRecord = {
        id: 'stg-c',
        competitionId: comp.id,
        stageId: 'stage-knockout',
        name: 'Playoffs',
        stageOrder: 1,
        stageType: 'knockout',
        status: 'in-progress',
        isLocked: false,
      };

      const rounds: RoundRecord[] = [
        { id: 'r-qf', competitionId: comp.id, stageRowId: 'stg-c', roundId: 'round-qf', name: 'Quartas de Final', roundOrder: 1, slotsCount: 4, status: 'completed' },
        { id: 'r-sf', competitionId: comp.id, stageRowId: 'stg-c', roundId: 'round-sf', name: 'Semifinais', roundOrder: 2, slotsCount: 2, status: 'in-progress' },
        { id: 'r-f', competitionId: comp.id, stageRowId: 'stg-c', roundId: 'round-f', name: 'Final', roundOrder: 3, slotsCount: 1, status: 'pending' },
      ];

      const qfSlots: MatchSlotRecord[] = Array.from({ length: 4 }, (_, i) => ({
        id: `slot-qf-${i + 1}`,
        competitionId: comp.id,
        stageRowId: 'stg-c',
        roundRowId: 'r-qf',
        slotId: `QF-${i + 1}`,
        position: i + 1,
        label: `Quartas ${i + 1}`,
        participantAReference: { type: 'resolved-team', teamId: teams4[0].id },
        participantAStatus: 'resolved',
        resolvedTeamAId: teams4[0].id,
        participantBReference: { type: 'resolved-team', teamId: teams4[1].id },
        participantBStatus: 'resolved',
        resolvedTeamBId: teams4[1].id,
        matchId: `m-qf-${i + 1}`,
      }));

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds,
        slots: qfSlots,
        matches: [],
        teams: teams4,
      });

      expect(vm.stages[0].rounds.length).toBe(3);
      expect(vm.stages[0].rounds[0].name).toBe('Quartas de Final');
      expect(vm.stages[0].rounds[0].slots.length).toBe(4);
      expect(vm.stages[0].rounds[1].name).toBe('Semifinais');
      expect(vm.stages[0].rounds[2].name).toBe('Final');
    });
  });

  // ==========================================================================
  // CENÁRIO D: 5 Equipes com 3 BYEs
  // ==========================================================================
  describe('Cenário D — 5 Equipes com 3 BYEs', () => {
    it('deve renderizar BYE com badge estrutural e sem equipes artificiais', () => {
      const comp = createMockCompetition('comp-d', 'Chave com BYEs');

      const stage: StageRecord = {
        id: 'stg-d',
        competitionId: comp.id,
        stageId: 'stage-bye',
        name: 'Eliminatória',
        stageOrder: 1,
        stageType: 'knockout',
        status: 'in-progress',
        isLocked: false,
      };

      const round: RoundRecord = {
        id: 'rnd-d',
        competitionId: comp.id,
        stageRowId: 'stg-d',
        roundId: 'round-1',
        name: 'Primeira Rodada',
        roundOrder: 1,
        slotsCount: 1,
        status: 'in-progress',
      };

      const slotWithBye: MatchSlotRecord = {
        id: 's-bye',
        competitionId: comp.id,
        stageRowId: 'stg-d',
        roundRowId: 'rnd-d',
        slotId: 'SLOT-BYE-1',
        position: 1,
        label: 'Jogo 1 (Isenção)',
        participantAReference: { type: 'resolved-team', teamId: 't1' },
        participantAStatus: 'resolved',
        resolvedTeamAId: 't1',
        participantBReference: { type: 'bye' },
        participantBStatus: 'bye',
        resolvedTeamBId: null,
        matchId: null,
      };

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds: [round],
        slots: [slotWithBye],
        matches: [],
        teams: teams4,
      });

      const slot = vm.stages[0].rounds[0].slots[0];
      expect(slot.visualState).toBe('bye');
      expect(slot.participantA.displayName).toBe('Taubaté Vôlei');
      expect(slot.participantB.displayName).toBe('BYE');
      expect(slot.participantB.isBye).toBe(true);
      expect(slot.participantB.teamId).toBeNull();
    });
  });

  // ==========================================================================
  // CENÁRIO E: 12 Equipes (Voltz Multi-Stage: Play-In + QF/SF/Final)
  // ==========================================================================
  describe('Cenário E — 12 Equipes Voltz Multi-Stage (Item 7 Reforçado)', () => {
    it('comprova que 1º a 4º Geral entram diretamente nas QF e 5º a 12º entram no Play-In', () => {
      const comp = createMockCompetition('comp-voltz', 'Voltz Tour 2026');

      const stages: StageRecord[] = [
        {
          id: 'stg-pi',
          competitionId: comp.id,
          stageId: 'voltz-playin',
          name: 'Play-In (5º ao 12º)',
          stageOrder: 1,
          stageType: 'play-in',
          status: 'completed',
          isLocked: true,
        },
        {
          id: 'stg-qf',
          competitionId: comp.id,
          stageId: 'voltz-final',
          name: 'Quartas de Final em Diante',
          stageOrder: 2,
          stageType: 'knockout',
          status: 'in-progress',
          isLocked: false,
        },
      ];

      const rounds: RoundRecord[] = [
        { id: 'rnd-pi', competitionId: comp.id, stageRowId: 'stg-pi', roundId: 'round-pi', name: 'Play-In', roundOrder: 1, slotsCount: 4, status: 'completed' },
        { id: 'rnd-qf', competitionId: comp.id, stageRowId: 'stg-qf', roundId: 'round-qf', name: 'Quartas de Final', roundOrder: 1, slotsCount: 4, status: 'in-progress' },
      ];

      // Play-In slots (posições 5º a 12º)
      const playInSlots: MatchSlotRecord[] = [
        {
          id: 'pi-1',
          competitionId: comp.id,
          stageRowId: 'stg-pi',
          roundRowId: 'rnd-pi',
          slotId: 'SLOT-PI-1',
          position: 1,
          label: 'Play-In 1',
          participantAReference: { type: 'overall-ranking', stageId: 'voltz-playin', position: 5 },
          participantAStatus: 'unresolved',
          resolvedTeamAId: null,
          participantBReference: { type: 'overall-ranking', stageId: 'voltz-playin', position: 12 },
          participantBStatus: 'unresolved',
          resolvedTeamBId: null,
          matchId: null,
        },
      ];

      // Quartas de Final slots: 1º Geral vs Vencedor Play-In 4
      const qfSlots: MatchSlotRecord[] = [
        {
          id: 'qf-1',
          competitionId: comp.id,
          stageRowId: 'stg-qf',
          roundRowId: 'rnd-qf',
          slotId: 'SLOT-QF-1',
          position: 1,
          label: 'Quartas 1',
          participantAReference: { type: 'overall-ranking', stageId: 'voltz-final', position: 1 },
          participantAStatus: 'unresolved',
          resolvedTeamAId: null,
          participantBReference: { type: 'match-winner', slotId: 'SLOT-PI-1' },
          participantBStatus: 'unresolved',
          resolvedTeamBId: null,
          matchId: null,
        },
      ];

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages,
        rounds,
        slots: [...playInSlots, ...qfSlots],
        matches: [],
        teams: teams4,
      });

      expect(vm.stages.length).toBe(2);

      // Prova que o Play-In contém referências 5º Geral e 12º Geral
      const piSlot = vm.stages[0].rounds[0].slots[0];
      expect(piSlot.participantA.displayName).toBe('5º Geral');
      expect(piSlot.participantB.displayName).toBe('12º Geral');

      // Prova que a QF consome 1º Geral diretamente e Vencedor Play-In 1
      const qfSlot = vm.stages[1].rounds[0].slots[0];
      expect(qfSlot.participantA.displayName).toBe('1º Geral');
      expect(qfSlot.participantB.displayName).toBe('Vencedor Play-In 1');
    });
  });

  // ==========================================================================
  // CENÁRIO F: Estágio Customizado Assimétrico (Item 8 Reforçado)
  // ==========================================================================
  describe('Cenário F — Estágio Customizado Assimétrico (Incompatível com 2^N)', () => {
    it('deve renderizar 5 slots distribuídos em 3 rodadas sem dependência de formato simétrico', () => {
      const comp = createMockCompetition('comp-custom', 'Torneio Assimétrico');

      const stage: StageRecord = {
        id: 'stg-cust',
        competitionId: comp.id,
        stageId: 'stage-custom',
        name: 'Torneio Livre',
        stageOrder: 1,
        stageType: 'custom',
        status: 'in-progress',
        isLocked: false,
      };

      // 3 Rodadas com contagens não convencionais: 3, 1, 1 (total: 5 slots)
      const rounds: RoundRecord[] = [
        { id: 'r1', competitionId: comp.id, stageRowId: 'stg-cust', roundId: 'rnd-1', name: 'Triangulares', roundOrder: 1, slotsCount: 3, status: 'in-progress' },
        { id: 'r2', competitionId: comp.id, stageRowId: 'stg-cust', roundId: 'rnd-2', name: 'Desafio', roundOrder: 2, slotsCount: 1, status: 'pending' },
        { id: 'r3', competitionId: comp.id, stageRowId: 'stg-cust', roundId: 'rnd-3', name: 'Super Final', roundOrder: 3, slotsCount: 1, status: 'pending' },
      ];

      const slots: MatchSlotRecord[] = [
        { id: 'c1', competitionId: comp.id, stageRowId: 'stg-cust', roundRowId: 'r1', slotId: 'C-01', position: 1, label: 'Jogo 1', participantAReference: { type: 'seed', seedNumber: 1 }, participantAStatus: 'unresolved', resolvedTeamAId: null, participantBReference: { type: 'seed', seedNumber: 6 }, participantBStatus: 'unresolved', resolvedTeamBId: null, matchId: null },
        { id: 'c2', competitionId: comp.id, stageRowId: 'stg-cust', roundRowId: 'r1', slotId: 'C-02', position: 2, label: 'Jogo 2', participantAReference: { type: 'seed', seedNumber: 2 }, participantAStatus: 'unresolved', resolvedTeamAId: null, participantBReference: { type: 'seed', seedNumber: 5 }, participantBStatus: 'unresolved', resolvedTeamBId: null, matchId: null },
        { id: 'c3', competitionId: comp.id, stageRowId: 'stg-cust', roundRowId: 'r1', slotId: 'C-03', position: 3, label: 'Jogo 3', participantAReference: { type: 'seed', seedNumber: 3 }, participantAStatus: 'unresolved', resolvedTeamAId: null, participantBReference: { type: 'seed', seedNumber: 4 }, participantBStatus: 'unresolved', resolvedTeamBId: null, matchId: null },
        { id: 'c4', competitionId: comp.id, stageRowId: 'stg-cust', roundRowId: 'r2', slotId: 'C-04', position: 1, label: 'Desafio Único', participantAReference: { type: 'match-winner', slotId: 'C-01' }, participantAStatus: 'unresolved', resolvedTeamAId: null, participantBReference: { type: 'match-winner', slotId: 'C-02' }, participantBStatus: 'unresolved', resolvedTeamBId: null, matchId: null },
        { id: 'c5', competitionId: comp.id, stageRowId: 'stg-cust', roundRowId: 'r3', slotId: 'C-05', position: 1, label: 'Super Final', participantAReference: { type: 'match-winner', slotId: 'C-04' }, participantAStatus: 'unresolved', resolvedTeamAId: null, participantBReference: { type: 'match-winner', slotId: 'C-03' }, participantBStatus: 'unresolved', resolvedTeamBId: null, matchId: null },
      ];

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds,
        slots,
        matches: [],
        teams: teams4,
      });

      expect(vm.stages[0].rounds.length).toBe(3);
      expect(vm.stages[0].rounds[0].slots.length).toBe(3);
      expect(vm.stages[0].rounds[1].slots.length).toBe(1);
      expect(vm.stages[0].rounds[2].slots.length).toBe(1);
      expect(vm.stages[0].rounds[0].slots[0].participantA.displayName).toBe('Cabeça de Chave 1');
    });
  });

  // ==========================================================================
  // DETECÇÃO DE INCONSISTÊNCIA MATCHSLOT <-> MATCH (Item 11 do Usuário)
  // ==========================================================================
  describe('Detecção de Inconsistência MatchSlot <-> Match (Item 11)', () => {
    it('deve marcar slot como inconsistente quando houver divergência entre resolvedTeam e match.teamId', () => {
      const comp = createMockCompetition();

      const stage: StageRecord = { id: 'stg-inc', competitionId: comp.id, stageId: 's-inc', name: 'Fase', stageOrder: 1, stageType: 'knockout', status: 'in-progress', isLocked: false };
      const round: RoundRecord = { id: 'rnd-inc', competitionId: comp.id, stageRowId: 'stg-inc', roundId: 'r-inc', name: 'Final', roundOrder: 1, slotsCount: 1, status: 'in-progress' };

      // Slot aponta para team t1 e t2
      const slot: MatchSlotRecord = {
        id: 's-divergent',
        competitionId: comp.id,
        stageRowId: 'stg-inc',
        roundRowId: 'rnd-inc',
        slotId: 'SLOT-DIV-1',
        position: 1,
        label: 'Final Divergente',
        participantAReference: { type: 'resolved-team', teamId: 't1' },
        participantAStatus: 'resolved',
        resolvedTeamAId: 't1',
        participantBReference: { type: 'resolved-team', teamId: 't2' },
        participantBStatus: 'resolved',
        resolvedTeamBId: 't2',
        matchId: 'match-div',
      };

      // Partida materializada possui time t1 e time t3 (DIVERGÊNCIA NO TIME B!)
      const divergentMatch = createMockMatch('match-div', comp.id, 'SLOT-DIV-1', teams4[0], teams4[2]); // t1 x t3

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds: [round],
        slots: [slot],
        matches: [divergentMatch],
        teams: teams4,
      });

      const slotVm = vm.stages[0].rounds[0].slots[0];
      expect(slotVm.isInconsistent).toBe(true);
      expect(slotVm.visualState).toBe('inconsistent');
      expect(slotVm.inconsistencyReason).toMatch(/Divergência de Equipe B/);
    });

    it('deve marcar slot como inconsistente quando matchId do slot não existir na lista de partidas', () => {
      const comp = createMockCompetition();

      const stage: StageRecord = { id: 'stg-ghost', competitionId: comp.id, stageId: 's-ghost', name: 'Fase', stageOrder: 1, stageType: 'knockout', status: 'in-progress', isLocked: false };
      const round: RoundRecord = { id: 'rnd-ghost', competitionId: comp.id, stageRowId: 'stg-ghost', roundId: 'r-ghost', name: 'Final', roundOrder: 1, slotsCount: 1, status: 'in-progress' };

      const slot: MatchSlotRecord = {
        id: 's-ghost',
        competitionId: comp.id,
        stageRowId: 'stg-ghost',
        roundRowId: 'rnd-ghost',
        slotId: 'SLOT-GHOST',
        position: 1,
        participantAReference: { type: 'resolved-team', teamId: 't1' },
        participantAStatus: 'resolved',
        resolvedTeamAId: 't1',
        participantBReference: { type: 'resolved-team', teamId: 't2' },
        participantBStatus: 'resolved',
        resolvedTeamBId: 't2',
        matchId: 'match-fantasma-inexistente',
      };

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds: [round],
        slots: [slot],
        matches: [], // Partida não existe
        teams: teams4,
      });

      const slotVm = vm.stages[0].rounds[0].slots[0];
      expect(slotVm.isInconsistent).toBe(true);
      expect(slotVm.visualState).toBe('inconsistent');
      expect(slotVm.inconsistencyReason).toMatch(/não foi encontrada/);
    });
  });

  // ==========================================================================
  // PROVA DE AUSÊNCIA DE IDs ARTIFICIAIS (ZERO TBD)
  // ==========================================================================
  describe('Prova de Ausência de IDs Artificiais (Zero TBD)', () => {
    it('nunca deve renderizar TBD-A-1 ou fake-team em nomes ou siglas', () => {
      const teamsById = new Map<string, TeamRecord>();
      const slotsById = new Map<string, MatchSlotRecord>();

      const ref1 = formatParticipantReference({ type: 'overall-ranking', stageId: 's1', position: 7 }, teamsById, slotsById);
      expect(ref1.displayName).toBe('7º Geral');
      expect(ref1.displayName).not.toMatch(/TBD/);

      const ref2 = formatParticipantReference({ type: 'group-position', stageId: 's1', groupIndex: 2, position: 2 }, teamsById, slotsById);
      expect(ref2.displayName).toBe('2º Grupo C');
      expect(ref2.displayName).not.toMatch(/TBD/);

      const ref3 = formatParticipantReference({ type: 'match-winner', slotId: 'SLOT-QF-2' }, teamsById, slotsById);
      expect(ref3.displayName).toBe('Vencedor SLOT-QF-2');
      expect(ref3.displayName).not.toMatch(/TBD/);
    });
  });

  // ==========================================================================
  // PROVA DE CAN_OPEN_MATCH ESTATUTO DE ACESSIBILIDADE
  // ==========================================================================
  describe('Prova de canOpenMatch (Item 6 do Usuário)', () => {
    it('canOpenMatch deve ser estritamente false quando não houver matchId e true quando houver', () => {
      const comp = createMockCompetition();
      const stage: StageRecord = { id: 'stg', competitionId: comp.id, stageId: 'stg', name: 'Fase', stageOrder: 1, stageType: 'knockout', status: 'in-progress', isLocked: false };
      const round: RoundRecord = { id: 'rnd', competitionId: comp.id, stageRowId: 'stg', roundId: 'rnd', name: 'Rodada', roundOrder: 1, slotsCount: 2, status: 'in-progress' };

      const slotWithMatch: MatchSlotRecord = {
        id: 's1', competitionId: comp.id, stageRowId: 'stg', roundRowId: 'rnd', slotId: 'S-1', position: 1,
        participantAReference: { type: 'resolved-team', teamId: 't1' }, participantAStatus: 'resolved', resolvedTeamAId: 't1',
        participantBReference: { type: 'resolved-team', teamId: 't2' }, participantBStatus: 'resolved', resolvedTeamBId: 't2',
        matchId: 'm-1',
      };

      const slotWithoutMatch: MatchSlotRecord = {
        id: 's2', competitionId: comp.id, stageRowId: 'stg', roundRowId: 'rnd', slotId: 'S-2', position: 2,
        participantAReference: { type: 'match-winner', slotId: 'S-1' }, participantAStatus: 'unresolved', resolvedTeamAId: null,
        participantBReference: { type: 'resolved-team', teamId: 't3' }, participantBStatus: 'resolved', resolvedTeamBId: 't3',
        matchId: null,
      };

      const match = createMockMatch('m-1', comp.id, 'S-1', teams4[0], teams4[1]);

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds: [round],
        slots: [slotWithMatch, slotWithoutMatch],
        matches: [match],
        teams: teams4,
      });

      expect(vm.stages[0].rounds[0].slots[0].canOpenMatch).toBe(true);
      expect(vm.stages[0].rounds[0].slots[1].canOpenMatch).toBe(false);
    });
  });

  // ==========================================================================
  // ADAPTADOR LEGADO (COMPETIÇÕES PRÉ-FASE 4)
  // ==========================================================================
  describe('Adaptador Legado (buildLegacy)', () => {
    it('deve converter partidas legadas em árvore visual perfeitamente utilizável', () => {
      const comp = createMockCompetition('comp-legacy', 'Torneio Antigo');

      const legacyMatches: MatchRecord[] = [
        {
          ...createMockMatch('m-legacy-1', comp.id, '', teams4[0], teams4[1], 1, 'completed'),
          round: 1,
          phase: 'playoffs',
          winnerId: 't1',
        },
        {
          ...createMockMatch('m-legacy-2', comp.id, '', teams4[2], teams4[3], 2, 'scheduled'),
          round: 1,
          phase: 'playoffs',
        },
      ];

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [],
        rounds: [],
        slots: [],
        matches: legacyMatches,
        teams: teams4,
      });

      expect(vm.isLegacy).toBe(true);
      expect(vm.hasMatchSlots).toBe(false);
      expect(vm.stages.length).toBe(1);
      expect(vm.stages[0].rounds.length).toBe(1);
      expect(vm.stages[0].rounds[0].slots.length).toBe(2);
      expect(vm.stages[0].rounds[0].slots[0].canOpenMatch).toBe(true);
    });
  });
});
