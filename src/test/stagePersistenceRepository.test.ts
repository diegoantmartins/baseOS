import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllCompetitionData,
  dataAccess,
  isArtificialTeamId,
  validateParticipantReference,
} from '@/services/dataAccess';
import type { ParticipantReference } from '@/types/competitionConfig';
import type { CompetitionRecord, TeamRecord, MatchRecord, StageRuntimeStatus } from '@/types/entities';

describe('BaseOS — Stage, Round & MatchSlot Persistence Foundation (Fase 4.6)', () => {
  let compA: CompetitionRecord;
  let compB: CompetitionRecord;
  let team1: TeamRecord;
  let team2: TeamRecord;

  beforeEach(async () => {
    clearAllCompetitionData();

    compA = await dataAccess.createCompetition({
      name: 'Torneio Alpha 2026',
      slug: 'torneio-alpha-2026',
      status: 'in-progress',
      modality: 'indoor',
      genderCategory: 'male',
      format: 'groups-playoffs',
      playerFormat: '6v6',
      setFormat: 'best-of-3',
    });

    compB = await dataAccess.createCompetition({
      name: 'Torneio Beta 2026',
      slug: 'torneio-beta-2026',
      status: 'in-progress',
      modality: 'indoor',
      genderCategory: 'female',
      format: 'groups-playoffs',
      playerFormat: '6v6',
      setFormat: 'best-of-3',
    });

    team1 = await dataAccess.createTeam({
      name: 'Vôlei Taubaté',
      shortName: 'TAU',
      modality: 'indoor',
      city: 'Taubaté',
    });

    team2 = await dataAccess.createTeam({
      name: 'Sada Cruzeiro',
      shortName: 'CRU',
      modality: 'indoor',
      city: 'Belo Horizonte',
    });
  });

  // ==========================================================================
  // 1. Stage Persistence & Integrity
  // ==========================================================================
  describe('Stage Persistence', () => {
    it('deve criar um estágio válido com status default pending e recuperar por ID', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'group-stage',
        name: 'Fase de Grupos',
        stageOrder: 1,
        stageType: 'groups',
        isLocked: false,
      });

      expect(stage.id).toBeDefined();
      expect(stage.competitionId).toBe(compA.id);
      expect(stage.stageId).toBe('group-stage');
      expect(stage.status).toBe('pending');
      expect(stage.stageOrder).toBe(1);

      const fetched = await dataAccess.getStage(stage.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(stage.id);
      expect(fetched?.name).toBe('Fase de Grupos');
    });

    it('deve recuperar estágio pela identidade lógica (competitionId + stageId)', async () => {
      await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'play-in',
        name: 'Play-In Qualificatório',
        stageOrder: 2,
        stageType: 'play-in',
        isLocked: false,
      });

      const fetched = await dataAccess.getStageByLogicalId(compA.id, 'play-in');
      expect(fetched).not.toBeNull();
      expect(fetched?.stageId).toBe('play-in');
      expect(fetched?.stageOrder).toBe(2);

      const notFound = await dataAccess.getStageByLogicalId(compA.id, 'stage-inexistente');
      expect(notFound).toBeNull();
    });

    it('deve listar estágios ordenados por stageOrder', async () => {
      await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'finals',
        name: 'Fase Final',
        stageOrder: 3,
        stageType: 'knockout',
        isLocked: false,
      });
      await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'groups',
        name: 'Fase Inicial',
        stageOrder: 1,
        stageType: 'groups',
        isLocked: false,
      });
      await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'play-in',
        name: 'Repescagem',
        stageOrder: 2,
        stageType: 'play-in',
        isLocked: false,
      });

      const list = await dataAccess.listStages(compA.id);
      expect(list).toHaveLength(3);
      expect(list.map(s => s.stageOrder)).toEqual([1, 2, 3]);
      expect(list.map(s => s.stageId)).toEqual(['groups', 'play-in', 'finals']);
    });

    it('deve rejeitar criação com competição inexistente ou dados ausentes', async () => {
      await expect(
        dataAccess.createStage({
          competitionId: 'comp-fantasma-999',
          stageId: 'groups',
          name: 'Grupos',
          stageOrder: 1,
          stageType: 'groups',
          isLocked: false,
        })
      ).rejects.toThrow(/Competição associada não encontrada/);

      await expect(
        dataAccess.createStage({
          competitionId: '',
          stageId: 'groups',
          name: 'Grupos',
          stageOrder: 1,
          stageType: 'groups',
          isLocked: false,
        })
      ).rejects.toThrow(/competitionId é obrigatório/);

      await expect(
        dataAccess.createStage({
          competitionId: compA.id,
          stageId: '',
          name: 'Grupos',
          stageOrder: 1,
          stageType: 'groups',
          isLocked: false,
        })
      ).rejects.toThrow(/stageId é obrigatório/);
    });

    it('deve garantir unicidade de stageId e stageOrder por competição', async () => {
      await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'groups',
        name: 'Fase de Grupos',
        stageOrder: 1,
        stageType: 'groups',
        isLocked: false,
      });

      // Mesma stageId na mesma competição -> erro
      await expect(
        dataAccess.createStage({
          competitionId: compA.id,
          stageId: 'groups',
          name: 'Fase de Grupos Duplicada',
          stageOrder: 2,
          stageType: 'groups',
          isLocked: false,
        })
      ).rejects.toThrow(/Já existe um estágio com stageId 'groups'/);

      // Mesma stageOrder na mesma competição -> erro
      await expect(
        dataAccess.createStage({
          competitionId: compA.id,
          stageId: 'play-in',
          name: 'Play-In',
          stageOrder: 1,
          stageType: 'play-in',
          isLocked: false,
        })
      ).rejects.toThrow(/Já existe um estágio com ordem 1/);

      // Porém, na competição B, stageId 'groups' e stageOrder 1 devem ser permitidos!
      const stageCompB = await dataAccess.createStage({
        competitionId: compB.id,
        stageId: 'groups',
        name: 'Fase de Grupos Comp B',
        stageOrder: 1,
        stageType: 'groups',
        isLocked: false,
      });
      expect(stageCompB.id).toBeDefined();
    });

    it('deve validar status permitidos e rejeitar status inválido', async () => {
      const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'] as const;
      for (const [idx, st] of validStatuses.entries()) {
        const stage = await dataAccess.createStage({
          competitionId: compA.id,
          stageId: `stage-${st}`,
          name: `Stage ${st}`,
          stageOrder: idx + 1,
          stageType: 'groups',
          status: st,
          isLocked: false,
        });
        expect(stage.status).toBe(st);
      }

      await expect(
        dataAccess.createStage({
          competitionId: compA.id,
          stageId: 'invalid-status-stage',
          name: 'Invalido',
          stageOrder: 99,
          stageType: 'groups',
          status: 'em-andamento' as unknown as StageRuntimeStatus,
          isLocked: false,
        })
      ).rejects.toThrow(/status inválido/);
    });

    it('deve atualizar estágio e propagar alterações de status', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'fase-1',
        name: 'Fase 1',
        stageOrder: 1,
        stageType: 'groups',
        isLocked: false,
      });

      const updated = await dataAccess.updateStage(stage.id, {
        status: 'in-progress',
        isLocked: true,
      });

      expect(updated?.status).toBe('in-progress');
      expect(updated?.isLocked).toBe(true);
      expect(updated?.updatedAt).toBeDefined();
    });

    it('deve excluir estágio e propagar exclusão em cascata', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'fase-temp',
        name: 'Fase Temporária',
        stageOrder: 1,
        stageType: 'knockout',
        isLocked: false,
      });

      const round = await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'r1',
        name: 'Rodada 1',
        roundOrder: 1,
        slotsCount: 1,
        status: 'pending',
      });

      const slot = await dataAccess.createMatchSlot({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'SLOT-TEMP',
        position: 1,
        participantAReference: { type: 'seed', seedNumber: 1 },
        participantBReference: { type: 'seed', seedNumber: 2 },
        participantAStatus: 'unresolved',
        participantBStatus: 'unresolved',
        resolvedTeamAId: null,
        resolvedTeamBId: null,
        matchId: null,
      });

      await dataAccess.deleteStage(stage.id);

      expect(await dataAccess.getStage(stage.id)).toBeNull();
      expect(await dataAccess.getRound(round.id)).toBeNull();
      expect(await dataAccess.getMatchSlot(slot.id)).toBeNull();
    });
  });

  // ==========================================================================
  // 2. Round Persistence & Integrity
  // ==========================================================================
  describe('Round Persistence', () => {
    let stage: { id: string };

    beforeEach(async () => {
      stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'knockout',
        name: 'Mata-Mata',
        stageOrder: 1,
        stageType: 'knockout',
        isLocked: false,
      });
    });

    it('deve criar rodada associada corretamente ao stage', async () => {
      const round = await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'quarterfinals',
        name: 'Quartas de Final',
        roundOrder: 1,
        slotsCount: 4,
        status: 'pending',
      });

      expect(round.id).toBeDefined();
      expect(round.stageRowId).toBe(stage.id);
      expect(round.roundId).toBe('quarterfinals');
      expect(round.roundOrder).toBe(1);

      const fetched = await dataAccess.getRound(round.id);
      expect(fetched?.name).toBe('Quartas de Final');
    });

    it('deve buscar rodada por identidade lógica (stageRowId + roundId)', async () => {
      await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'semifinals',
        name: 'Semifinais',
        roundOrder: 2,
        slotsCount: 2,
        status: 'pending',
      });

      const fetched = await dataAccess.getRoundByLogicalId(stage.id, 'semifinals');
      expect(fetched).not.toBeNull();
      expect(fetched?.roundId).toBe('semifinals');
    });

    it('deve rejeitar criação de rodada com estágio inexistente', async () => {
      await expect(
        dataAccess.createRound({
          competitionId: compA.id,
          stageRowId: 'stage-fantasma-999',
          roundId: 'final',
          name: 'Final',
          roundOrder: 1,
          slotsCount: 1,
          status: 'pending',
        })
      ).rejects.toThrow(/Estágio associado não encontrado/);
    });

    it('deve garantir unicidade de roundId e roundOrder por estágio', async () => {
      await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'r1',
        name: 'Rodada 1',
        roundOrder: 1,
        slotsCount: 2,
        status: 'pending',
      });

      await expect(
        dataAccess.createRound({
          competitionId: compA.id,
          stageRowId: stage.id,
          roundId: 'r1',
          name: 'Rodada 1 Duplicada',
          roundOrder: 2,
          slotsCount: 2,
          status: 'pending',
        })
      ).rejects.toThrow(/Já existe uma rodada com roundId 'r1'/);

      await expect(
        dataAccess.createRound({
          competitionId: compA.id,
          stageRowId: stage.id,
          roundId: 'r2',
          name: 'Rodada 2',
          roundOrder: 1,
          slotsCount: 2,
          status: 'pending',
        })
      ).rejects.toThrow(/Já existe uma rodada com ordem 1/);
    });
  });

  // ==========================================================================
  // 3. MatchSlot Persistence & Separation from Match
  // ==========================================================================
  describe('MatchSlot Persistence & Match Separation', () => {
    let stage: { id: string };
    let round: { id: string };

    beforeEach(async () => {
      stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'playoffs',
        name: 'Playoffs',
        stageOrder: 1,
        stageType: 'knockout',
        isLocked: false,
      });

      round = await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'round-1',
        name: 'Primeira Rodada',
        roundOrder: 1,
        slotsCount: 2,
        status: 'pending',
      });
    });

    it('deve persistir MatchSlot sem Match associado (matchId = null)', async () => {
      const slot = await dataAccess.createMatchSlot({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'SLOT-QF-01',
        position: 1,
        label: 'Quartas 1',
        participantAReference: { type: 'seed', seedNumber: 1 },
        participantBReference: { type: 'seed', seedNumber: 8 },
        participantAStatus: 'unresolved',
        participantBStatus: 'unresolved',
        resolvedTeamAId: null,
        resolvedTeamBId: null,
        matchId: null,
      });

      expect(slot.id).toBeDefined();
      expect(slot.slotId).toBe('SLOT-QF-01');
      expect(slot.matchId).toBeNull();
      expect(slot.resolvedTeamAId).toBeNull();
      expect(slot.resolvedTeamBId).toBeNull();

      const fetched = await dataAccess.getMatchSlot(slot.id);
      expect(fetched?.slotId).toBe('SLOT-QF-01');
      expect(fetched?.matchId).toBeNull();
    });

    it('deve recuperar MatchSlot por identidade lógica (competitionId + slotId)', async () => {
      await dataAccess.createMatchSlot({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'SLOT-LOGICAL-01',
        position: 1,
        participantAReference: { type: 'seed', seedNumber: 1 },
        participantBReference: { type: 'seed', seedNumber: 2 },
        participantAStatus: 'unresolved',
        participantBStatus: 'unresolved',
        resolvedTeamAId: null,
        resolvedTeamBId: null,
        matchId: null,
      });

      const fetched = await dataAccess.getMatchSlotByLogicalId(compA.id, 'SLOT-LOGICAL-01');
      expect(fetched).not.toBeNull();
      expect(fetched?.slotId).toBe('SLOT-LOGICAL-01');
    });

    it('deve garantir unicidade de slotId por competição e position por rodada', async () => {
      await dataAccess.createMatchSlot({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'SLOT-01',
        position: 1,
        participantAReference: { type: 'seed', seedNumber: 1 },
        participantBReference: { type: 'seed', seedNumber: 4 },
        participantAStatus: 'unresolved',
        participantBStatus: 'unresolved',
        resolvedTeamAId: null,
        resolvedTeamBId: null,
        matchId: null,
      });

      // Mesmo slotId na mesma competição -> erro
      await expect(
        dataAccess.createMatchSlot({
          competitionId: compA.id,
          stageRowId: stage.id,
          roundRowId: round.id,
          slotId: 'SLOT-01',
          position: 2,
          participantAReference: { type: 'seed', seedNumber: 2 },
          participantBReference: { type: 'seed', seedNumber: 3 },
          participantAStatus: 'unresolved',
          participantBStatus: 'unresolved',
          resolvedTeamAId: null,
          resolvedTeamBId: null,
          matchId: null,
        })
      ).rejects.toThrow(/Já existe um slot com slotId 'SLOT-01'/);

      // Mesma position na mesma rodada -> erro
      await expect(
        dataAccess.createMatchSlot({
          competitionId: compA.id,
          stageRowId: stage.id,
          roundRowId: round.id,
          slotId: 'SLOT-02',
          position: 1,
          participantAReference: { type: 'seed', seedNumber: 2 },
          participantBReference: { type: 'seed', seedNumber: 3 },
          participantAStatus: 'unresolved',
          participantBStatus: 'unresolved',
          resolvedTeamAId: null,
          resolvedTeamBId: null,
          matchId: null,
        })
      ).rejects.toThrow(/Já existe um slot na posição 1/);
    });

    it('deve atualizar MatchSlot com equipes resolvidas e associar Match concreto quando pronto', async () => {
      const slot = await dataAccess.createMatchSlot({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'SLOT-FINAL-01',
        position: 1,
        participantAReference: { type: 'match-winner', slotId: 'SLOT-SF-01' },
        participantBReference: { type: 'match-winner', slotId: 'SLOT-SF-02' },
        participantAStatus: 'unresolved',
        participantBStatus: 'unresolved',
        resolvedTeamAId: null,
        resolvedTeamBId: null,
        matchId: null,
      });

      expect(slot.resolvedTeamAId).toBeNull();
      expect(slot.matchId).toBeNull();

      // Cria a partida concreta no legado quando as equipes foram definidas
      const match: MatchRecord = await dataAccess.createMatch({
        competitionId: compA.id,
        round: 1,
        matchNumber: 1,
        teamAId: team1.id,
        teamBId: team2.id,
        teamAName: team1.name,
        teamBName: team2.name,
        teamAShortName: team1.shortName,
        teamBShortName: team2.shortName,
        venue: 'Ginásio Central',
        scheduledTime: '2026-09-10T10:00:00Z',
        status: 'scheduled',
        sets: [],
        referees: [],
      });

      // Atualiza o slot com os participantes resolvidos e a partida associada
      const updated = await dataAccess.updateMatchSlot(slot.id, {
        resolvedTeamAId: team1.id,
        resolvedTeamBId: team2.id,
        participantAStatus: 'resolved',
        participantBStatus: 'resolved',
        matchId: match.id,
      });

      expect(updated?.resolvedTeamAId).toBe(team1.id);
      expect(updated?.resolvedTeamBId).toBe(team2.id);
      expect(updated?.matchId).toBe(match.id);
      expect(updated?.participantAStatus).toBe('resolved');
      expect(updated?.participantBStatus).toBe('resolved');
    });
  });

  // ==========================================================================
  // 4. ParticipantReference Validation (8 Canonical Types)
  // ==========================================================================
  describe('ParticipantReference Validation (8 Tipos Canônicos)', () => {
    it('deve validar tipo resolved-team com teamId válido', () => {
      const ref: ParticipantReference = { type: 'resolved-team', teamId: 'team-123' };
      expect(validateParticipantReference(ref)).toEqual(ref);
    });

    it('deve validar tipo group-position com stageId, groupIndex e position', () => {
      const ref: ParticipantReference = { type: 'group-position', stageId: 'groups', groupIndex: 0, position: 1 };
      expect(validateParticipantReference(ref)).toEqual(ref);
    });

    it('deve validar tipo overall-ranking com stageId, position e filter opcional', () => {
      const ref: ParticipantReference = {
        type: 'overall-ranking',
        stageId: 'groups',
        position: 5,
        filter: 'group-runners-up-only',
      };
      expect(validateParticipantReference(ref)).toEqual(ref);
    });

    it('deve validar tipo stage-position com stageId e position', () => {
      const ref: ParticipantReference = { type: 'stage-position', stageId: 'groups', position: 3 };
      expect(validateParticipantReference(ref)).toEqual(ref);
    });

    it('deve validar tipo match-winner com slotId', () => {
      const ref: ParticipantReference = { type: 'match-winner', slotId: 'SLOT-PI-01' };
      expect(validateParticipantReference(ref)).toEqual(ref);
    });

    it('deve validar tipo match-loser com slotId', () => {
      const ref: ParticipantReference = { type: 'match-loser', slotId: 'SLOT-QF-02' };
      expect(validateParticipantReference(ref)).toEqual(ref);
    });

    it('deve validar tipo seed com seedNumber >= 1', () => {
      const ref: ParticipantReference = { type: 'seed', seedNumber: 1 };
      expect(validateParticipantReference(ref)).toEqual(ref);
    });

    it('deve validar tipo bye', () => {
      const ref: ParticipantReference = { type: 'bye' };
      expect(validateParticipantReference(ref)).toEqual(ref);
    });

    it('deve rejeitar tipo inválido ou desconhecido', () => {
      expect(() => validateParticipantReference({ type: 'fake-type' })).toThrow(/type inválido/);
      expect(() => validateParticipantReference(null)).toThrow(/objeto válido/);
      expect(() => validateParticipantReference('string' as unknown as ParticipantReference)).toThrow(/objeto válido/);
    });

    it('deve rejeitar campos obrigatórios ausentes por tipo', () => {
      expect(() => validateParticipantReference({ type: 'resolved-team', teamId: '' })).toThrow(/teamId não vazio/);
      expect(() => validateParticipantReference({ type: 'group-position', stageId: '', groupIndex: 0, position: 1 })).toThrow(/stageId não vazio/);
      expect(() => validateParticipantReference({ type: 'group-position', stageId: 'g', groupIndex: -1, position: 1 })).toThrow(/groupIndex/);
      expect(() => validateParticipantReference({ type: 'group-position', stageId: 'g', groupIndex: 0, position: 0 })).toThrow(/position/);
      expect(() => validateParticipantReference({ type: 'match-winner', slotId: '' })).toThrow(/slotId não vazio/);
      expect(() => validateParticipantReference({ type: 'seed', seedNumber: 0 })).toThrow(/seedNumber/);
    });
  });

  // ==========================================================================
  // 5. Zero Fake / Artificial Teams Policy
  // ==========================================================================
  describe('Zero Fake Teams Policy (TBD, __BYE__, etc.)', () => {
    it('isArtificialTeamId deve detectar e identificar IDs de equipes artificiais', () => {
      expect(isArtificialTeamId('TBD')).toBe(true);
      expect(isArtificialTeamId('tbd-a-1')).toBe(true);
      expect(isArtificialTeamId('TBD_1')).toBe(true);
      expect(isArtificialTeamId('__BYE__')).toBe(true);
      expect(isArtificialTeamId('__bye')).toBe(true);
      expect(isArtificialTeamId('UNKNOWN')).toBe(true);
      expect(isArtificialTeamId('PLACEHOLDER TEAM')).toBe(true);
      expect(isArtificialTeamId('__fake_team__')).toBe(true);

      expect(isArtificialTeamId('team-123')).toBe(false);
      expect(isArtificialTeamId('taubate-vba')).toBe(false);
      expect(isArtificialTeamId(null)).toBe(false);
      expect(isArtificialTeamId(undefined)).toBe(false);
    });

    it('deve rejeitar ParticipantReference resolved-team contendo equipe artificial', () => {
      expect(() =>
        validateParticipantReference({ type: 'resolved-team', teamId: 'TBD-A-1' })
      ).toThrow(/Equipe fictícia não permitida como resolved-team/);

      expect(() =>
        validateParticipantReference({ type: 'resolved-team', teamId: '__BYE__' })
      ).toThrow(/Equipe fictícia não permitida como resolved-team/);
    });

    it('deve rejeitar MatchSlot com resolvedTeam contendo equipe artificial', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'k1',
        name: 'K1',
        stageOrder: 1,
        stageType: 'knockout',
        isLocked: false,
      });

      const round = await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'r1',
        name: 'R1',
        roundOrder: 1,
        slotsCount: 1,
        status: 'pending',
      });

      await expect(
        dataAccess.createMatchSlot({
          competitionId: compA.id,
          stageRowId: stage.id,
          roundRowId: round.id,
          slotId: 'SLOT-TEST-TBD',
          position: 1,
          participantAReference: { type: 'seed', seedNumber: 1 },
          participantBReference: { type: 'seed', seedNumber: 2 },
          participantAStatus: 'unresolved',
          participantBStatus: 'unresolved',
          resolvedTeamAId: 'TBD-A-1',
          resolvedTeamBId: null,
          matchId: null,
        })
      ).rejects.toThrow(/resolvedTeamAId não pode ser equipe artificial\/TBD/);

      await expect(
        dataAccess.createMatchSlot({
          competitionId: compA.id,
          stageRowId: stage.id,
          roundRowId: round.id,
          slotId: 'SLOT-TEST-BYE-TEAM',
          position: 1,
          participantAReference: { type: 'seed', seedNumber: 1 },
          participantBReference: { type: 'seed', seedNumber: 2 },
          participantAStatus: 'unresolved',
          participantBStatus: 'unresolved',
          resolvedTeamAId: null,
          resolvedTeamBId: '__BYE__',
          matchId: null,
        })
      ).rejects.toThrow(/resolvedTeamBId não pode ser equipe artificial\/TBD/);
    });

    it('deve rejeitar resolvedTeam apontando para equipe inexistente no banco', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'k2',
        name: 'K2',
        stageOrder: 1,
        stageType: 'knockout',
        isLocked: false,
      });

      const round = await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'r1',
        name: 'R1',
        roundOrder: 1,
        slotsCount: 1,
        status: 'pending',
      });

      await expect(
        dataAccess.createMatchSlot({
          competitionId: compA.id,
          stageRowId: stage.id,
          roundRowId: round.id,
          slotId: 'SLOT-NON-EXISTENT-TEAM',
          position: 1,
          participantAReference: { type: 'seed', seedNumber: 1 },
          participantBReference: { type: 'seed', seedNumber: 2 },
          participantAStatus: 'unresolved',
          participantBStatus: 'unresolved',
          resolvedTeamAId: 'team-fantasma-999',
          resolvedTeamBId: null,
          matchId: null,
        })
      ).rejects.toThrow(/Equipe resolvedTeamAId inexistente no banco/);
    });
  });

  // ==========================================================================
  // 6. BYE Slots Representation Without Fake Teams
  // ==========================================================================
  describe('BYE Representation Without Fake Teams', () => {
    it('deve persistir slot com BYE sem criar equipe fictícia em teams e sem match', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'playoffs-bye',
        name: 'Playoffs com BYE',
        stageOrder: 1,
        stageType: 'knockout',
        isLocked: false,
      });

      const round = await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'round-bye',
        name: 'Rodada 1 (com folga)',
        roundOrder: 1,
        slotsCount: 1,
        status: 'pending',
      });

      const slot = await dataAccess.createMatchSlot({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'SLOT-BYE-01',
        position: 1,
        participantAReference: { type: 'seed', seedNumber: 1 },
        participantBReference: { type: 'bye' },
        resolvedTeamAId: team1.id,
        resolvedTeamBId: null, // Zero equipes fictícias!
        matchId: null, // Sem partida esportiva concreta!
      });

      expect(slot.participantBReference.type).toBe('bye');
      expect(slot.resolvedTeamBId).toBeNull();
      expect(slot.participantBStatus).toBe('bye');
      expect(slot.matchId).toBeNull();

      // Confirma que nenhuma equipe __BYE__ foi inserida na tabela de times
      const allTeams = await dataAccess.listTeams();
      expect(allTeams.some(t => t.name.includes('BYE') || t.id.includes('BYE'))).toBe(false);
    });
  });

  // ==========================================================================
  // 7. Unknown Participant Slots (Winner / Loser / Overall Ranking)
  // ==========================================================================
  describe('Unknown Participant Slots (Winner, Loser, Ranking)', () => {
    it('deve persistir slots para vencedor de partida e overall ranking com resolved_team = null e match = null', async () => {
      const stage = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'finals-stage',
        name: 'Finals',
        stageOrder: 1,
        stageType: 'knockout',
        isLocked: false,
      });

      const round = await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundId: 'qf',
        name: 'Quartas',
        roundOrder: 1,
        slotsCount: 1,
        status: 'pending',
      });

      const slot = await dataAccess.createMatchSlot({
        competitionId: compA.id,
        stageRowId: stage.id,
        roundRowId: round.id,
        slotId: 'SLOT-QF-UNKNOWN',
        position: 1,
        participantAReference: { type: 'overall-ranking', stageId: 'groups', position: 5 },
        participantBReference: { type: 'match-winner', slotId: 'MATCH-PI-01' },
        resolvedTeamAId: null,
        resolvedTeamBId: null,
        matchId: null,
      });

      expect(slot.participantAReference.type).toBe('overall-ranking');
      expect(slot.participantBReference.type).toBe('match-winner');
      expect(slot.resolvedTeamAId).toBeNull();
      expect(slot.resolvedTeamBId).toBeNull();
      expect(slot.participantAStatus).toBe('unresolved');
      expect(slot.participantBStatus).toBe('unresolved');
      expect(slot.matchId).toBeNull();
    });
  });

  // ==========================================================================
  // 8. Multi-Competition Isolation
  // ==========================================================================
  describe('Multi-Competition Isolation', () => {
    it('deve garantir que Competição A não enxergue ou colida com estágios e slots da Competição B', async () => {
      const stageA = await dataAccess.createStage({
        competitionId: compA.id,
        stageId: 'groups',
        name: 'Grupos A',
        stageOrder: 1,
        stageType: 'groups',
        isLocked: false,
      });

      const stageB = await dataAccess.createStage({
        competitionId: compB.id,
        stageId: 'groups',
        name: 'Grupos B',
        stageOrder: 1,
        stageType: 'groups',
        isLocked: false,
      });

      const roundA = await dataAccess.createRound({
        competitionId: compA.id,
        stageRowId: stageA.id,
        roundId: 'r1',
        name: 'R1 A',
        roundOrder: 1,
        slotsCount: 1,
        status: 'pending',
      });

      const roundB = await dataAccess.createRound({
        competitionId: compB.id,
        stageRowId: stageB.id,
        roundId: 'r1',
        name: 'R1 B',
        roundOrder: 1,
        slotsCount: 1,
        status: 'pending',
      });

      const slotA = await dataAccess.createMatchSlot({
        competitionId: compA.id,
        stageRowId: stageA.id,
        roundRowId: roundA.id,
        slotId: 'SLOT-01',
        position: 1,
        participantAReference: { type: 'seed', seedNumber: 1 },
        participantBReference: { type: 'seed', seedNumber: 2 },
        resolvedTeamAId: null,
        resolvedTeamBId: null,
        matchId: null,
      });

      const slotB = await dataAccess.createMatchSlot({
        competitionId: compB.id,
        stageRowId: stageB.id,
        roundRowId: roundB.id,
        slotId: 'SLOT-01', // Mesmo slotId, mas em competições diferentes!
        position: 1,
        participantAReference: { type: 'seed', seedNumber: 3 },
        participantBReference: { type: 'seed', seedNumber: 4 },
        resolvedTeamAId: null,
        resolvedTeamBId: null,
        matchId: null,
      });

      // Isolamento de listagem de estágios
      const stagesCompA = await dataAccess.listStages(compA.id);
      expect(stagesCompA).toHaveLength(1);
      expect(stagesCompA[0].id).toBe(stageA.id);

      const stagesCompB = await dataAccess.listStages(compB.id);
      expect(stagesCompB).toHaveLength(1);
      expect(stagesCompB[0].id).toBe(stageB.id);

      // Isolamento de listagem de match slots
      const slotsCompA = await dataAccess.listMatchSlots(compA.id);
      expect(slotsCompA).toHaveLength(1);
      expect(slotsCompA[0].id).toBe(slotA.id);

      const slotsCompB = await dataAccess.listMatchSlots(compB.id);
      expect(slotsCompB).toHaveLength(1);
      expect(slotsCompB[0].id).toBe(slotB.id);

      // Lookup lógico isolado por competição
      const fetchedSlotA = await dataAccess.getMatchSlotByLogicalId(compA.id, 'SLOT-01');
      expect(fetchedSlotA?.id).toBe(slotA.id);

      const fetchedSlotB = await dataAccess.getMatchSlotByLogicalId(compB.id, 'SLOT-01');
      expect(fetchedSlotB?.id).toBe(slotB.id);
    });
  });
});
