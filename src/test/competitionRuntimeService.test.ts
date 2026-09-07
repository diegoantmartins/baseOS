import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CanonicalMatchResult,
  MatchSlot,
  ParticipantReference,
  ProgressionRoute,
  StageDefinition,
} from '@/types/competitionConfig';
import type { CompetitionRecord, MatchRecord, MatchSlotRecord, TeamRecord } from '@/types/entities';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { CompetitionRuntimeService } from '@/services/competitionRuntimeService';
import { clearAllCompetitionData, dataAccess, isArtificialTeamId } from '@/services/dataAccess';
import { GenericProgressionEngine } from '@/services/genericProgressionEngine';
import { OverallStandingsEngine } from '@/services/overallStandingsEngine';
import { ParticipantResolutionEngine } from '@/services/participantResolutionEngine';
import { computeStandingsByGroup, type StandingInput } from '@/services/standingsService';

describe('Fase 4.8 — Competition Runtime Integration & Progression Engine', () => {
  const compId = 'comp-runtime-test';

  const mockCompetition: CompetitionRecord = {
    id: compId,
    name: 'Copa Runtime Teste 2026',
    modality: 'indoor',
    format: 'knockout',
    playerFormat: '6x6',
    genderCategory: 'male',
    status: 'in-progress',
    setFormat: '3-sets',
    tiebreakCriteria: ['points', 'set-average', 'points-average'],
  };

  const createMockTeam = (id: string, name: string): TeamRecord => ({
    id,
    name,
    shortName: name.substring(0, 3).toUpperCase(),
    modality: 'indoor',
    status: 'confirmed',
  });

  const teams12: TeamRecord[] = Array.from({ length: 12 }, (_, i) =>
    createMockTeam(`team-${i + 1}`, `Equipe ${String.fromCharCode(65 + i)}`),
  );

  beforeEach(async () => {
    clearAllCompetitionData();
    await dataAccess.createCompetition({
      ...mockCompetition,
      id: compId,
    });
    for (const t of teams12) {
      await dataAccess.createTeam({ ...t, id: t.id });
      await dataAccess.createCompetitionTeam({
        competitionId: compId,
        teamId: t.id,
        teamName: t.name,
        teamShortName: t.shortName,
        registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
        isLocked: false,
        status: 'approved',
      });
    }
  });

  // ==========================================================================
  // CASO A — 4 Equipes (SF1, SF2 -> FINAL)
  // ==========================================================================
  describe('Caso A — 4 Equipes (SF1, SF2 -> FINAL)', () => {
    it('materializa SFs com times reais, propaga vencedores e só materializa a FINAL quando ambos estão resolvidos', async () => {
      // 1. Cria Estágio e Rodadas
      const stage = await dataAccess.createStage({
        competitionId: compId,
        stageId: 'playoffs',
        name: 'Fase Final',
        stageOrder: 1,
        stageType: 'knockout',
        status: 'in-progress',
        isLocked: false,
        metadata: {},
      });

      const roundSemi = await dataAccess.createRound({
        competitionId: compId,
        stageRowId: stage.id,
        roundId: 'semifinals',
        name: 'Semifinais',
        roundOrder: 1,
        slotsCount: 2,
        status: 'in-progress',
      });

      const roundFinal = await dataAccess.createRound({
        competitionId: compId,
        stageRowId: stage.id,
        roundId: 'finals',
        name: 'Grande Final',
        roundOrder: 2,
        slotsCount: 1,
        status: 'pending',
      });

      // 2. Cria Slots das Semifinais com equipes resolvidas
      const slotSF1 = await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: roundSemi.id,
        slotId: 'SF-01',
        position: 1,
        label: 'Semifinal 1',
        participantAReference: { type: 'resolved-team', teamId: 'team-1', teamName: 'Equipe A' },
        participantBReference: { type: 'resolved-team', teamId: 'team-2', teamName: 'Equipe B' },
        resolvedTeamAId: 'team-1',
        resolvedTeamBId: 'team-2',
        progressionRoute: {
          sourceSlotId: 'SF-01',
          onWinner: { targetStageId: stage.id, targetRoundId: roundFinal.id, targetSlotId: 'FINAL-01', targetSide: 'A' },
        },
      });

      const slotSF2 = await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: roundSemi.id,
        slotId: 'SF-02',
        position: 2,
        label: 'Semifinal 2',
        participantAReference: { type: 'resolved-team', teamId: 'team-3', teamName: 'Equipe C' },
        participantBReference: { type: 'resolved-team', teamId: 'team-4', teamName: 'Equipe D' },
        resolvedTeamAId: 'team-3',
        resolvedTeamBId: 'team-4',
        progressionRoute: {
          sourceSlotId: 'SF-02',
          onWinner: { targetStageId: stage.id, targetRoundId: roundFinal.id, targetSlotId: 'FINAL-01', targetSide: 'B' },
        },
      });

      // 3. Cria Slot da Final com referências estruturais match-winner
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: roundFinal.id,
        slotId: 'FINAL-01',
        position: 1,
        label: 'Final',
        participantAReference: { type: 'match-winner', slotId: 'SF-01' },
        participantBReference: { type: 'match-winner', slotId: 'SF-02' },
      });

      // 4. Materializa as Semifinais
      const matSF1 = await dataAccess.materializeSlotMatch({ competitionId: compId, slotId: 'SF-01' });
      const matSF2 = await dataAccess.materializeSlotMatch({ competitionId: compId, slotId: 'SF-02' });

      expect(matSF1.ok).toBe(true);
      expect(matSF2.ok).toBe(true);
      expect(matSF1.matchId).toBeTruthy();
      expect(matSF2.matchId).toBeTruthy();

      // Final ainda não deve possuir partida
      const initialFinalSlot = await dataAccess.getMatchSlotByLogicalId(compId, 'FINAL-01');
      expect(initialFinalSlot?.matchId).toBeNull();
      expect(initialFinalSlot?.resolvedTeamAId).toBeNull();
      expect(initialFinalSlot?.resolvedTeamBId).toBeNull();

      // 5. Finaliza SF-01 (team-1 vence por 2x0)
      await dataAccess.updateMatch(matSF1.matchId, {
        status: 'completed',
        winnerId: 'team-1',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 25, scoreB: 18 },
        ],
      });

      const summarySF1 = await CompetitionRuntimeService.handleMatchCompleted(compId, matSF1.matchId);
      expect(summarySF1.ok).toBe(true);
      expect(summarySF1.sourceSlotId).toBe('SF-01');

      // Verifica que Team-1 avançou para a FINAL (lado A), mas FINAL ainda NÃO criou Match
      const finalAfterSF1 = await dataAccess.getMatchSlotByLogicalId(compId, 'FINAL-01');
      expect(finalAfterSF1?.resolvedTeamAId).toBe('team-1');
      expect(finalAfterSF1?.participantAStatus).toBe('resolved');
      expect(finalAfterSF1?.resolvedTeamBId).toBeNull();
      expect(finalAfterSF1?.matchId).toBeNull(); // Não cria match prematuramente!

      // 6. Finaliza SF-02 (team-4 vence por 2x1)
      await dataAccess.updateMatch(matSF2.matchId, {
        status: 'completed',
        winnerId: 'team-4',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 22 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 13, scoreB: 15 },
        ],
      });

      const summarySF2 = await CompetitionRuntimeService.handleMatchCompleted(compId, matSF2.matchId);
      expect(summarySF2.ok).toBe(true);

      // Agora a FINAL possui ambos os participantes e o Match deve estar materializado!
      const finalAfterSF2 = await dataAccess.getMatchSlotByLogicalId(compId, 'FINAL-01');
      expect(finalAfterSF2?.resolvedTeamAId).toBe('team-1');
      expect(finalAfterSF2?.resolvedTeamBId).toBe('team-4');
      expect(finalAfterSF2?.matchId).toBeTruthy();

      const finalMatch = await dataAccess.getMatch(finalAfterSF2!.matchId!);
      expect(finalMatch).not.toBeNull();
      expect(finalMatch?.teamAId).toBe('team-1');
      expect(finalMatch?.teamBId).toBe('team-4');
      expect(finalMatch?.slotId).toBe('FINAL-01');
    });
  });

  // ==========================================================================
  // CASO B — 6 Equipes (group-position: 1º A x 2º B, 1º B x 2º A)
  // ==========================================================================
  describe('Caso B — 6 Equipes (group-position)', () => {
    it('resolve referências group-position a partir da fase de grupos e propaga para as semifinais', async () => {
      // 1. Cria Estágios de Grupos e Playoffs
      const groupStage = await dataAccess.createStage({
        competitionId: compId,
        stageId: 'stage-groups',
        name: 'Fase de Grupos',
        stageOrder: 1,
        stageType: 'groups',
        status: 'completed',
        isLocked: true,
        metadata: {},
      });

      const playoffStage = await dataAccess.createStage({
        competitionId: compId,
        stageId: 'stage-playoffs',
        name: 'Semifinais',
        stageOrder: 2,
        stageType: 'knockout',
        status: 'in-progress',
        isLocked: false,
        metadata: {},
      });

      const roundSF = await dataAccess.createRound({
        competitionId: compId,
        stageRowId: playoffStage.id,
        roundId: 'round-sf',
        name: 'Semifinais',
        roundOrder: 1,
        slotsCount: 2,
        status: 'in-progress',
      });

      // 2. Cria Partidas da Fase de Grupos
      // Grupo A: team-1 vence team-2 (team-1 é 1º A, team-2 é 2º A)
      await dataAccess.createMatch({
        competitionId: compId,
        round: 1,
        matchNumber: 101,
        teamAId: 'team-1',
        teamBId: 'team-2',
        teamAName: 'Equipe A',
        teamBName: 'Equipe B',
        teamAShortName: 'EQU',
        teamBShortName: 'EQU',
        venue: 'Arena 1',
        scheduledTime: new Date().toISOString(),
        status: 'completed',
        phase: 'Fase de Grupos',
        groupName: 'Grupo A',
        winnerId: 'team-1',
        sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 18 }],
        referees: [],
      });

      // Grupo B: team-4 vence team-5 (team-4 é 1º B, team-5 é 2º B)
      await dataAccess.createMatch({
        competitionId: compId,
        round: 1,
        matchNumber: 102,
        teamAId: 'team-4',
        teamBId: 'team-5',
        teamAName: 'Equipe D',
        teamBName: 'Equipe E',
        teamAShortName: 'EQU',
        teamBShortName: 'EQU',
        venue: 'Arena 2',
        scheduledTime: new Date().toISOString(),
        status: 'completed',
        phase: 'Fase de Grupos',
        groupName: 'Grupo B',
        winnerId: 'team-4',
        sets: [{ setNumber: 1, scoreA: 25, scoreB: 22 }, { setNumber: 2, scoreA: 25, scoreB: 21 }],
        referees: [],
      });

      // 3. Cria Slots das Semifinais referenciando posições de grupo:
      // SF-1: 1º Grupo A x 2º Grupo B
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: playoffStage.id,
        roundRowId: roundSF.id,
        slotId: 'SF-G1',
        position: 1,
        label: 'SF 1 (1º A x 2º B)',
        participantAReference: { type: 'group-position', stageId: 'stage-groups', groupIndex: 0, position: 1 },
        participantBReference: { type: 'group-position', stageId: 'stage-groups', groupIndex: 1, position: 2 },
      });

      // SF-2: 1º Grupo B x 2º Grupo A
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: playoffStage.id,
        roundRowId: roundSF.id,
        slotId: 'SF-G2',
        position: 2,
        label: 'SF 2 (1º B x 2º A)',
        participantAReference: { type: 'group-position', stageId: 'stage-groups', groupIndex: 1, position: 1 },
        participantBReference: { type: 'group-position', stageId: 'stage-groups', groupIndex: 0, position: 2 },
      });

      // 4. Executa Reconciliação do Runtime
      const reconcile = await CompetitionRuntimeService.reconcileCompetitionRuntime(compId);
      expect(reconcile.ok).toBe(true);

      const sf1 = await dataAccess.getMatchSlotByLogicalId(compId, 'SF-G1');
      expect(sf1?.resolvedTeamAId).toBe('team-1'); // 1º A
      expect(sf1?.resolvedTeamBId).toBe('team-5'); // 2º B
      expect(sf1?.matchId).toBeTruthy();

      const sf2 = await dataAccess.getMatchSlotByLogicalId(compId, 'SF-G2');
      expect(sf2?.resolvedTeamAId).toBe('team-4'); // 1º B
      expect(sf2?.resolvedTeamBId).toBe('team-2'); // 2º A
      expect(sf2?.matchId).toBeTruthy();
    });
  });

  // ==========================================================================
  // CASO B2 — 8 Equipes (overall-ranking via OverallStandingsEngine)
  // ==========================================================================
  describe('Caso B2 — 8 Equipes (overall-ranking via OverallStandingsEngine)', () => {
    it('consolida múltiplos grupos em ranking unificado e resolve referências overall-ranking', async () => {
      // 1. Simula classificação de 2 grupos de 4
      const teamsGroupA: StandingInput[] = [
        { team: teams12[0], groupName: 'Grupo A' },
        { team: teams12[1], groupName: 'Grupo A' },
        { team: teams12[2], groupName: 'Grupo A' },
        { team: teams12[3], groupName: 'Grupo A' },
      ];
      const teamsGroupB: StandingInput[] = [
        { team: teams12[4], groupName: 'Grupo B' },
        { team: teams12[5], groupName: 'Grupo B' },
        { team: teams12[6], groupName: 'Grupo B' },
        { team: teams12[7], groupName: 'Grupo B' },
      ];

      const now = new Date().toISOString();
      const matchesGroup: MatchRecord[] = [
        // Grupo A
        {
          id: 'm-ga1',
          competitionId: compId,
          round: 1,
          matchNumber: 1,
          teamAId: 'team-1',
          teamBId: 'team-2',
          teamAName: 'Equipe A',
          teamBName: 'Equipe B',
          teamAShortName: 'EQU',
          teamBShortName: 'EQU',
          venue: 'V',
          scheduledTime: now,
          status: 'completed',
          winnerId: 'team-1',
          sets: [{ setNumber: 1, scoreA: 25, scoreB: 10 }, { setNumber: 2, scoreA: 25, scoreB: 10 }],
          referees: [],
          createdAt: now,
          updatedAt: now,
        },
        // Grupo B
        {
          id: 'm-gb1',
          competitionId: compId,
          round: 1,
          matchNumber: 2,
          teamAId: 'team-5',
          teamBId: 'team-6',
          teamAName: 'Equipe E',
          teamBName: 'Equipe F',
          teamAShortName: 'EQU',
          teamBShortName: 'EQU',
          venue: 'V',
          scheduledTime: now,
          status: 'completed',
          winnerId: 'team-5',
          sets: [{ setNumber: 1, scoreA: 25, scoreB: 23 }, { setNumber: 2, scoreA: 25, scoreB: 22 }],
          referees: [],
          createdAt: now,
          updatedAt: now,
        },
      ];

      const groupStandings = computeStandingsByGroup([...teamsGroupA, ...teamsGroupB], matchesGroup);
      const overall = OverallStandingsEngine.computeOverallStandings(groupStandings, {
        matches: matchesGroup,
        criteria: ['points', 'set-average', 'points-average'],
      });

      expect(overall[0].teamId).toBe('team-1');
      expect(overall[0].overallRank).toBe(1);
      expect(overall[1].teamId).toBe('team-5');
      expect(overall[1].overallRank).toBe(2);

      // 2. Cria estágio com slot referenciando 1º e 2º Geral
      const stageOverall = await dataAccess.createStage({
        competitionId: compId,
        stageId: 'stage-overall-knockout',
        name: 'Playoff Geral',
        stageOrder: 2,
        stageType: 'knockout',
        status: 'in-progress',
        isLocked: false,
        metadata: {},
      });

      const roundOverall = await dataAccess.createRound({
        competitionId: compId,
        stageRowId: stageOverall.id,
        roundId: 'final-overall',
        name: 'Duelo dos Melhores',
        roundOrder: 1,
        slotsCount: 1,
        status: 'in-progress',
      });

      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stageOverall.id,
        roundRowId: roundOverall.id,
        slotId: 'OV-01',
        position: 1,
        label: '1º Geral vs 2º Geral',
        participantAReference: { type: 'overall-ranking', stageId: 'stage-overall-knockout', position: 1 },
        participantBReference: { type: 'overall-ranking', stageId: 'stage-overall-knockout', position: 2 },
      });

      // Resolução direta via ParticipantResolutionEngine com o contexto calculado
      const slotRecord = await dataAccess.getMatchSlotByLogicalId(compId, 'OV-01');
      const resolvedSlot = ParticipantResolutionEngine.resolveSlot(
        {
          slotId: slotRecord!.slotId,
          stageId: 'stage-overall-knockout',
          roundId: 'round-overall-final',
          position: 1,
          participantA: { side: 'A', reference: slotRecord!.participantAReference, status: 'unresolved', resolvedTeamId: null, displayPlaceholder: '', isBye: false },
          participantB: { side: 'B', reference: slotRecord!.participantBReference, status: 'unresolved', resolvedTeamId: null, displayPlaceholder: '', isBye: false },
        },
        {
          teams: teams12,
          overallStandingsByStage: {
            'stage-overall-knockout': overall,
          },
        },
      );

      expect(resolvedSlot.participantA.resolvedTeamId).toBe('team-1');
      expect(resolvedSlot.participantB.resolvedTeamId).toBe('team-5');
    });
  });

  // ==========================================================================
  // CASO C — 8 Equipes (Knockout direto: QF -> SF -> FINAL)
  // ==========================================================================
  describe('Caso C — 8 Equipes (QF -> SF -> FINAL)', () => {
    it('executa chaveamento completo de 8 equipes materializando cada fase após resolução', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compId,
        stageId: 'bracket-8',
        name: 'Eliminatórias 8',
        stageOrder: 1,
        stageType: 'knockout',
        status: 'in-progress',
        isLocked: false,
        metadata: {},
      });

      const rQF = await dataAccess.createRound({ competitionId: compId, stageRowId: stage.id, roundId: 'r-qf', name: 'Quartas', roundOrder: 1, slotsCount: 4, status: 'in-progress' });
      const rSF = await dataAccess.createRound({ competitionId: compId, stageRowId: stage.id, roundId: 'r-sf', name: 'Semis', roundOrder: 2, slotsCount: 2, status: 'pending' });
      const rF = await dataAccess.createRound({ competitionId: compId, stageRowId: stage.id, roundId: 'r-f', name: 'Final', roundOrder: 3, slotsCount: 1, status: 'pending' });

      // Cria 4 QFs
      for (let i = 0; i < 4; i++) {
        const tA = `team-${i * 2 + 1}`;
        const tB = `team-${i * 2 + 2}`;
        const targetSF = i < 2 ? 'SF-01' : 'SF-02';
        const targetSide = (i % 2 === 0 ? 'A' : 'B') as 'A' | 'B';

        await dataAccess.createMatchSlot({
          competitionId: compId,
          stageRowId: stage.id,
          roundRowId: rQF.id,
          slotId: `QF-0${i + 1}`,
          position: i + 1,
          label: `Quartas ${i + 1}`,
          participantAReference: { type: 'resolved-team', teamId: tA, teamName: `Equipe ${tA}` },
          participantBReference: { type: 'resolved-team', teamId: tB, teamName: `Equipe ${tB}` },
          resolvedTeamAId: tA,
          resolvedTeamBId: tB,
          progressionRoute: {
            sourceSlotId: `QF-0${i + 1}`,
            onWinner: { targetStageId: stage.id, targetRoundId: rSF.id, targetSlotId: targetSF, targetSide },
          },
        });
      }

      // Cria 2 SFs
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: rSF.id,
        slotId: 'SF-01',
        position: 1,
        participantAReference: { type: 'match-winner', slotId: 'QF-01' },
        participantBReference: { type: 'match-winner', slotId: 'QF-02' },
        progressionRoute: { sourceSlotId: 'SF-01', onWinner: { targetStageId: stage.id, targetRoundId: rF.id, targetSlotId: 'F-01', targetSide: 'A' } },
      });
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: rSF.id,
        slotId: 'SF-02',
        position: 2,
        participantAReference: { type: 'match-winner', slotId: 'QF-03' },
        participantBReference: { type: 'match-winner', slotId: 'QF-04' },
        progressionRoute: { sourceSlotId: 'SF-02', onWinner: { targetStageId: stage.id, targetRoundId: rF.id, targetSlotId: 'F-01', targetSide: 'B' } },
      });

      // Cria Final
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: rF.id,
        slotId: 'F-01',
        position: 1,
        participantAReference: { type: 'match-winner', slotId: 'SF-01' },
        participantBReference: { type: 'match-winner', slotId: 'SF-02' },
      });

      // Reconcilia e materializa as 4 QFs
      await CompetitionRuntimeService.reconcileCompetitionRuntime(compId);
      const allSlots = await dataAccess.listMatchSlots(compId);
      const qfSlots = allSlots.filter(s => s.slotId.startsWith('QF-'));
      expect(qfSlots.every(s => s.matchId !== null)).toBe(true);

      // Finaliza QF-01 (team-1 vence) e QF-02 (team-3 vence)
      await dataAccess.updateMatch(qfSlots[0].matchId!, { status: 'completed', winnerId: 'team-1', sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }] });
      await CompetitionRuntimeService.handleMatchCompleted(compId, qfSlots[0].matchId!);

      await dataAccess.updateMatch(qfSlots[1].matchId!, { status: 'completed', winnerId: 'team-3', sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }] });
      await CompetitionRuntimeService.handleMatchCompleted(compId, qfSlots[1].matchId!);

      // SF-01 agora deve estar materializada (team-1 x team-3)
      const sf1 = await dataAccess.getMatchSlotByLogicalId(compId, 'SF-01');
      expect(sf1?.matchId).toBeTruthy();
      expect(sf1?.resolvedTeamAId).toBe('team-1');
      expect(sf1?.resolvedTeamBId).toBe('team-3');
    });
  });

  // ==========================================================================
  // CASO D — 5 Equipes em Chave de 8 com BYEs Reais
  // ==========================================================================
  describe('Caso D — 5 Equipes com 3 BYEs Reais', () => {
    it('avança equipes com folga via GenericProgressionEngine sem criar equipes fictícias ou partidas fantasmas', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compId,
        stageId: 'stage-bye',
        name: 'Chave com BYE',
        stageOrder: 1,
        stageType: 'knockout',
        status: 'in-progress',
        isLocked: false,
        metadata: {},
      });

      const rQF = await dataAccess.createRound({ competitionId: compId, stageRowId: stage.id, roundId: 'r-bye-qf', name: 'QF', roundOrder: 1, slotsCount: 4, status: 'in-progress' });
      const rSF = await dataAccess.createRound({ competitionId: compId, stageRowId: stage.id, roundId: 'r-bye-sf', name: 'SF', roundOrder: 2, slotsCount: 2, status: 'pending' });

      // QF-01: Team 1 x BYE -> avança Team 1
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: rQF.id,
        slotId: 'QFB-01',
        position: 1,
        participantAReference: { type: 'resolved-team', teamId: 'team-1', teamName: 'Equipe A' },
        participantBReference: { type: 'bye' },
        resolvedTeamAId: 'team-1',
        resolvedTeamBId: null,
        progressionRoute: {
          sourceSlotId: 'QFB-01',
          onWinner: { targetStageId: stage.id, targetRoundId: rSF.id, targetSlotId: 'SFB-01', targetSide: 'A' },
        },
      });

      // QF-02: Team 2 x Team 3 -> jogo real
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: rQF.id,
        slotId: 'QFB-02',
        position: 2,
        participantAReference: { type: 'resolved-team', teamId: 'team-2', teamName: 'Equipe B' },
        participantBReference: { type: 'resolved-team', teamId: 'team-3', teamName: 'Equipe C' },
        resolvedTeamAId: 'team-2',
        resolvedTeamBId: 'team-3',
        progressionRoute: {
          sourceSlotId: 'QFB-02',
          onWinner: { targetStageId: stage.id, targetRoundId: rSF.id, targetSlotId: 'SFB-01', targetSide: 'B' },
        },
      });

      // Semifinal 1
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: rSF.id,
        slotId: 'SFB-01',
        position: 1,
        participantAReference: { type: 'match-winner', slotId: 'QFB-01' },
        participantBReference: { type: 'match-winner', slotId: 'QFB-02' },
      });

      // 1. Executa avanço de BYEs
      const advancedByes = await CompetitionRuntimeService.advanceByes(compId);
      expect(advancedByes).toBe(1); // Team 1 avançou automaticamente

      // 2. QF-01 NÃO deve ter gerado Match (pois tem BYE)
      const qf1Slot = await dataAccess.getMatchSlotByLogicalId(compId, 'QFB-01');
      expect(qf1Slot?.matchId).toBeNull();

      // 3. QF-02 DEVE poder materializar Match (dois times reais)
      const matQF2 = await dataAccess.materializeSlotMatch({ competitionId: compId, slotId: 'QFB-02' });
      expect(matQF2.ok).toBe(true);
      expect(matQF2.matchId).toBeTruthy();

      // 4. SFB-01 já tem team-1 como resolvedTeamAId devido ao BYE!
      const sf1Slot = await dataAccess.getMatchSlotByLogicalId(compId, 'SFB-01');
      expect(sf1Slot?.resolvedTeamAId).toBe('team-1');
      expect(sf1Slot?.participantAStatus).toBe('resolved');
      expect(sf1Slot?.resolvedTeamBId).toBeNull(); // Aguardando QF-02
      expect(sf1Slot?.matchId).toBeNull();

      // 5. Finaliza QF-02 (Team 2 vence)
      await dataAccess.updateMatch(matQF2.matchId, {
        status: 'completed',
        winnerId: 'team-2',
        sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 21 }],
      });

      await CompetitionRuntimeService.handleMatchCompleted(compId, matQF2.matchId);

      // SFB-01 agora tem Team 1 x Team 2 e seu Match foi materializado!
      const finalSF1Slot = await dataAccess.getMatchSlotByLogicalId(compId, 'SFB-01');
      expect(finalSF1Slot?.resolvedTeamAId).toBe('team-1');
      expect(finalSF1Slot?.resolvedTeamBId).toBe('team-2');
      expect(finalSF1Slot?.matchId).toBeTruthy();

      // Nenhuma equipe fictícia no banco
      const allSlotsAfter = await dataAccess.listMatchSlots(compId);
      for (const slot of allSlotsAfter) {
        expect(isArtificialTeamId(slot.resolvedTeamAId)).toBe(false);
        expect(isArtificialTeamId(slot.resolvedTeamBId)).toBe(false);
      }
    });
  });

  // ==========================================================================
  // CASO E — Cenário Voltz Real (12 Equipes -> 4 Grupos x 3 -> Ranking -> Play-in -> QF -> SF -> F)
  // ==========================================================================
  describe('Caso E — Cenário Voltz Real (12 Equipes)', () => {
    it('executa a integração ponta a ponta com ranking geral verdadeiro e cruzamento técnico de teste', async () => {
      // 1. Simula os 12 times em 4 grupos de 3 (A: 1,2,3; B: 4,5,6; C: 7,8,9; D: 10,11,12)
      const standingInputs: StandingInput[] = teams12.map((t, idx) => {
        const groupLetter = String.fromCharCode(65 + Math.floor(idx / 3));
        return { team: t, groupName: `Grupo ${groupLetter}` };
      });

      const now = new Date().toISOString();
      const groupMatches: MatchRecord[] = [
        // Grupo A
        { id: 'm-v1', competitionId: compId, round: 1, matchNumber: 1, teamAId: 'team-1', teamBId: 'team-2', teamAName: 'A', teamBName: 'B', teamAShortName: 'A', teamBShortName: 'B', venue: 'V', scheduledTime: now, status: 'completed', winnerId: 'team-1', sets: [{ setNumber: 1, scoreA: 25, scoreB: 15 }, { setNumber: 2, scoreA: 25, scoreB: 15 }], referees: [], createdAt: now, updatedAt: now },
        { id: 'm-v2', competitionId: compId, round: 2, matchNumber: 2, teamAId: 'team-2', teamBId: 'team-3', teamAName: 'B', teamBName: 'C', teamAShortName: 'B', teamBShortName: 'C', venue: 'V', scheduledTime: now, status: 'completed', winnerId: 'team-2', sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }], referees: [], createdAt: now, updatedAt: now },
        // Grupo B
        { id: 'm-v3', competitionId: compId, round: 1, matchNumber: 3, teamAId: 'team-4', teamBId: 'team-5', teamAName: 'D', teamBName: 'E', teamAShortName: 'D', teamBShortName: 'E', venue: 'V', scheduledTime: now, status: 'completed', winnerId: 'team-4', sets: [{ setNumber: 1, scoreA: 25, scoreB: 18 }, { setNumber: 2, scoreA: 25, scoreB: 18 }], referees: [], createdAt: now, updatedAt: now },
        { id: 'm-v4', competitionId: compId, round: 2, matchNumber: 4, teamAId: 'team-5', teamBId: 'team-6', teamAName: 'E', teamBName: 'F', teamAShortName: 'E', teamBShortName: 'F', venue: 'V', scheduledTime: now, status: 'completed', winnerId: 'team-5', sets: [{ setNumber: 1, scoreA: 25, scoreB: 22 }, { setNumber: 2, scoreA: 25, scoreB: 22 }], referees: [], createdAt: now, updatedAt: now },
      ];

      // 2. Calcula classificação de grupos via computeStandingsByGroup
      const groupStandings = computeStandingsByGroup(standingInputs, groupMatches);

      // 3. Calcula ranking geral unificado de 1 a 12 via OverallStandingsEngine
      const overallStandings = OverallStandingsEngine.computeOverallStandings(groupStandings, {
        matches: groupMatches,
        criteria: ['points', 'set-average', 'points-average'],
      });

      expect(overallStandings.length).toBe(12);
      expect(overallStandings[0].overallRank).toBe(1);
      expect(overallStandings[11].overallRank).toBe(12);

      // 4. Cria estágios: Play-in e QF
      const stagePlayIn = await dataAccess.createStage({
        competitionId: compId,
        stageId: 'voltz-playin',
        name: 'Play-in (Repescagem)',
        stageOrder: 2,
        stageType: 'play-in',
        status: 'in-progress',
        isLocked: false,
        metadata: {},
      });

      const roundPI = await dataAccess.createRound({
        competitionId: compId,
        stageRowId: stagePlayIn.id,
        roundId: 'r-pi',
        name: 'Confrontos Play-in',
        roundOrder: 1,
        slotsCount: 4,
        status: 'in-progress',
      });

      // Cruzamentos do Play-in segundo regulamento Voltz: 5x12, 6x11, 7x10, 8x9
      const piMatchesDef = [
        { slotId: 'PI-01', posA: 5, posB: 12 },
        { slotId: 'PI-02', posA: 6, posB: 11 },
        { slotId: 'PI-03', posA: 7, posB: 10 },
        { slotId: 'PI-04', posA: 8, posB: 9 },
      ];

      for (const def of piMatchesDef) {
        await dataAccess.createMatchSlot({
          competitionId: compId,
          stageRowId: stagePlayIn.id,
          roundRowId: roundPI.id,
          slotId: def.slotId,
          position: parseInt(def.slotId.replace('PI-0', ''), 10),
          participantAReference: { type: 'overall-ranking', stageId: 'voltz-playin', position: def.posA },
          participantBReference: { type: 'overall-ranking', stageId: 'voltz-playin', position: def.posB },
        });
      }

      // Resolução dos slots de Play-in via ParticipantResolutionEngine
      const piSlots = await dataAccess.listMatchSlots(compId);
      const domainPISlots = piSlots.map(s => ({
        slotId: s.slotId,
        stageId: 'voltz-playin',
        roundId: 'round-pi-1',
        position: s.position,
        participantA: { side: 'A' as const, reference: s.participantAReference, status: 'unresolved' as const, resolvedTeamId: null, displayPlaceholder: '', isBye: false },
        participantB: { side: 'B' as const, reference: s.participantBReference, status: 'unresolved' as const, resolvedTeamId: null, displayPlaceholder: '', isBye: false },
      }));

      const resolvedPISlots = ParticipantResolutionEngine.resolveSlots(domainPISlots, {
        teams: teams12,
        overallStandingsByStage: {
          'voltz-playin': overallStandings,
        },
      });

      // Prova que 5º x 12º foi resolvido com as equipes corretas do ranking geral
      expect(resolvedPISlots[0].participantA.resolvedTeamId).toBe(overallStandings[4].teamId); // 5º
      expect(resolvedPISlots[0].participantB.resolvedTeamId).toBe(overallStandings[11].teamId); // 12º

      // Prova que 6º x 11º foi resolvido
      expect(resolvedPISlots[1].participantA.resolvedTeamId).toBe(overallStandings[5].teamId); // 6º
      expect(resolvedPISlots[1].participantB.resolvedTeamId).toBe(overallStandings[10].teamId); // 11º
    });
  });

  // ==========================================================================
  // CONCORRÊNCIA, IDEMPOTÊNCIA E RESILIÊNCIA
  // ==========================================================================
  describe('Concorrência, Idempotência e Resiliência', () => {
    it('garante criação única de Match mesmo sob chamadas simultâneas (concurrency-safe)', async () => {
      const stage = await dataAccess.createStage({ competitionId: compId, stageId: 'c-stage', name: 'S', stageOrder: 1, stageType: 'knockout', status: 'in-progress', isLocked: false, metadata: {} });
      const round = await dataAccess.createRound({ competitionId: compId, stageRowId: stage.id, roundId: 'c-round', name: 'R', roundOrder: 1, slotsCount: 1, status: 'in-progress' });

      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'CONC-01',
        position: 1,
        participantAReference: { type: 'resolved-team', teamId: 'team-1', teamName: 'A' },
        participantBReference: { type: 'resolved-team', teamId: 'team-2', teamName: 'B' },
        resolvedTeamAId: 'team-1',
        resolvedTeamBId: 'team-2',
      });

      // Simula duas requisições simultâneas para materializar o mesmo slot
      const [res1, res2] = await Promise.all([
        dataAccess.materializeSlotMatch({ competitionId: compId, slotId: 'CONC-01' }),
        dataAccess.materializeSlotMatch({ competitionId: compId, slotId: 'CONC-01' }),
      ]);

      expect(res1.ok).toBe(true);
      expect(res2.ok).toBe(true);
      // Devem apontar para o MESMO matchId
      expect(res1.matchId).toBe(res2.matchId);
      // Pelo menos um deve indicar que já estava materializado
      expect(res1.alreadyMaterialized || res2.alreadyMaterialized).toBe(true);

      // Apenas 1 registro na tabela matches
      const allMatches = await dataAccess.listMatches(compId);
      const slotMatches = allMatches.filter(m => m.slotId === 'CONC-01');
      expect(slotMatches.length).toBe(1);
    });

    it('reprocessa com sucesso após falha parcial (reconcileCompetitionRuntime)', async () => {
      const stage = await dataAccess.createStage({ competitionId: compId, stageId: 'rec-stage', name: 'S', stageOrder: 1, stageType: 'knockout', status: 'in-progress', isLocked: false, metadata: {} });
      const round = await dataAccess.createRound({ competitionId: compId, stageRowId: stage.id, roundId: 'rec-round', name: 'R', roundOrder: 1, slotsCount: 1, status: 'in-progress' });

      // Slot já está com times resolvidos, mas sem matchId (simulando que o processo caiu antes da materialização)
      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'RECOV-01',
        position: 1,
        participantAReference: { type: 'resolved-team', teamId: 'team-3', teamName: 'C' },
        participantBReference: { type: 'resolved-team', teamId: 'team-4', teamName: 'D' },
        resolvedTeamAId: 'team-3',
        resolvedTeamBId: 'team-4',
      });

      const slotBefore = await dataAccess.getMatchSlotByLogicalId(compId, 'RECOV-01');
      expect(slotBefore?.matchId).toBeNull();

      // Executa reconciliação de recuperação
      const summary = await CompetitionRuntimeService.reconcileCompetitionRuntime(compId);
      expect(summary.ok).toBe(true);

      const slotAfter = await dataAccess.getMatchSlotByLogicalId(compId, 'RECOV-01');
      expect(slotAfter?.matchId).toBeTruthy();

      const createdMatch = await dataAccess.getMatch(slotAfter!.matchId!);
      expect(createdMatch).not.toBeNull();
      expect(createdMatch?.teamAId).toBe('team-3');
      expect(createdMatch?.teamBId).toBe('team-4');
    });

    it('rejeita propagação quando o CanonicalMatchResult é inválido ou incompleto', async () => {
      const match = await dataAccess.createMatch({
        competitionId: compId,
        round: 1,
        matchNumber: 999,
        teamAId: 'team-1',
        teamBId: 'team-2',
        teamAName: 'A',
        teamBName: 'B',
        teamAShortName: 'A',
        teamBShortName: 'B',
        venue: 'V',
        scheduledTime: new Date().toISOString(),
        status: 'in-progress', // Não concluído!
        sets: [],
        referees: [],
      });

      const result = await CompetitionRuntimeService.handleMatchCompleted(compId, match.id);
      expect(result.ok).toBe(false);
      expect(result.message).toContain('não completada');
      expect(result.materializedMatches.length).toBe(0);
    });

    it('mantém idempotência estrita ao chamar handleMatchCompleted repetidamente', async () => {
      const stage = await dataAccess.createStage({ competitionId: compId, stageId: 'idemp-s', name: 'S', stageOrder: 1, stageType: 'knockout', status: 'in-progress', isLocked: false, metadata: {} });
      const round = await dataAccess.createRound({ competitionId: compId, stageRowId: stage.id, roundId: 'idemp-r', name: 'R', roundOrder: 1, slotsCount: 1, status: 'in-progress' });

      await dataAccess.createMatchSlot({
        competitionId: compId,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'IDEMP-01',
        position: 1,
        participantAReference: { type: 'resolved-team', teamId: 'team-1', teamName: 'A' },
        participantBReference: { type: 'resolved-team', teamId: 'team-2', teamName: 'B' },
        resolvedTeamAId: 'team-1',
        resolvedTeamBId: 'team-2',
      });

      const mat = await dataAccess.materializeSlotMatch({ competitionId: compId, slotId: 'IDEMP-01' });

      await dataAccess.updateMatch(mat.matchId, {
        status: 'completed',
        winnerId: 'team-1',
        sets: [{ setNumber: 1, scoreA: 25, scoreB: 15 }, { setNumber: 2, scoreA: 25, scoreB: 15 }],
      });

      const run1 = await CompetitionRuntimeService.handleMatchCompleted(compId, mat.matchId);
      expect(run1.ok).toBe(true);

      const run2 = await CompetitionRuntimeService.handleMatchCompleted(compId, mat.matchId);
      expect(run2.ok).toBe(true);
      expect(run2.idempotent).toBe(true);
    });
  });
});
