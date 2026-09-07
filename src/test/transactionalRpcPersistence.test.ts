import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllCompetitionData,
  dataAccess,
  isArtificialTeamId,
  validateParticipantReference,
} from '@/services/dataAccess';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { ParticipantReference } from '@/types/competitionConfig';

describe('BaseOS — Transactional RPC Persistence & Security (Fase 4.7)', () => {
  let compA: CompetitionRecord;
  let compB: CompetitionRecord;
  let team1: TeamRecord;
  let team2: TeamRecord;
  let team3: TeamRecord;
  let team4: TeamRecord;

  beforeEach(async () => {
    clearAllCompetitionData();

    compA = await dataAccess.createCompetition({
      name: 'Superliga BaseOS Alpha 2026',
      slug: 'superliga-alpha-2026',
      status: 'in-progress',
      modality: 'indoor',
      genderCategory: 'male',
      format: 'groups-playoffs',
      playerFormat: '6v6',
      setFormat: 'best-of-5',
    });

    compB = await dataAccess.createCompetition({
      name: 'Superliga BaseOS Beta 2026',
      slug: 'superliga-beta-2026',
      status: 'in-progress',
      modality: 'indoor',
      genderCategory: 'female',
      format: 'groups-playoffs',
      playerFormat: '6v6',
      setFormat: 'best-of-5',
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

    team3 = await dataAccess.createTeam({
      name: 'Minas Tênis Clube',
      shortName: 'MTC',
      modality: 'indoor',
      city: 'Belo Horizonte',
    });

    team4 = await dataAccess.createTeam({
      name: 'Vôlei Renata Campinas',
      shortName: 'REN',
      modality: 'indoor',
      city: 'Campinas',
    });
  });

  // ============================================================================
  // 1. Prova de Atomicidade Real & Rollback Completo
  // ============================================================================
  describe('Prova de Atomicidade e Rollback (PERSIST-002)', () => {
    it('Teste A: Sucesso Atômico — deve persistir Stage, Rounds e Slots em lote único', async () => {
      const result = await dataAccess.saveStageDrawAndSlots({
        competitionId: compA.id,
        stage: {
          stageId: 'playoffs',
          name: 'Fase Eliminatória',
          stageOrder: 2,
          stageType: 'knockout',
          status: 'pending',
          isLocked: false,
        },
        rounds: [
          { roundId: 'semi', name: 'Semifinais', roundOrder: 1, slotsCount: 2 },
          { roundId: 'final', name: 'Grande Final', roundOrder: 2, slotsCount: 1 },
        ],
        slots: [
          {
            slotId: 'SLOT-SF-01',
            roundId: 'semi',
            position: 1,
            label: 'Semifinal 1',
            participantAReference: { type: 'seed', seedNumber: 1 },
            participantBReference: { type: 'seed', seedNumber: 4 },
            progressionRoute: {
              onWinner: { targetSlotId: 'SLOT-FN-01', targetSide: 'A' },
            },
          },
          {
            slotId: 'SLOT-SF-02',
            roundId: 'semi',
            position: 2,
            label: 'Semifinal 2',
            participantAReference: { type: 'seed', seedNumber: 2 },
            participantBReference: { type: 'seed', seedNumber: 3 },
            progressionRoute: {
              onWinner: { targetSlotId: 'SLOT-FN-01', targetSide: 'B' },
            },
          },
          {
            slotId: 'SLOT-FN-01',
            roundId: 'final',
            position: 1,
            label: 'Disputa do Título',
            participantAReference: { type: 'match-winner', slotId: 'SLOT-SF-01' },
            participantBReference: { type: 'match-winner', slotId: 'SLOT-SF-02' },
          },
        ],
      });

      expect(result.ok).toBe(true);
      expect(result.roundsCount).toBe(2);
      expect(result.slotsCount).toBe(3);

      // Consulta posterior comprova que todos os registros foram persistidos
      const stages = await dataAccess.listStages(compA.id);
      expect(stages).toHaveLength(1);
      expect(stages[0].stageId).toBe('playoffs');

      const rounds = await dataAccess.listRounds(stages[0].id);
      expect(rounds).toHaveLength(2);

      const slots = await dataAccess.listMatchSlots(compA.id);
      expect(slots).toHaveLength(3);
    });

    it('Teste B: Prova de Atomicidade — falha no Slot 2 aborta e reverte Stage, Round e Slot 1', async () => {
      // Pré-condição: banco está limpo
      expect(await dataAccess.listStages(compA.id)).toHaveLength(0);
      expect(await dataAccess.listMatchSlots(compA.id)).toHaveLength(0);

      // Tenta salvar: Stage válido, Round válido, Slot 1 válido, mas Slot 2 com tipo inválido de referência
      await expect(
        dataAccess.saveStageDrawAndSlots({
          competitionId: compA.id,
          stage: {
            stageId: 'playoffs',
            name: 'Fase Eliminatória',
            stageOrder: 2,
            stageType: 'knockout',
          },
          rounds: [
            { roundId: 'quarter', name: 'Quartas de Final', roundOrder: 1, slotsCount: 2 },
          ],
          slots: [
            {
              slotId: 'SLOT-QF-01',
              roundId: 'quarter',
              position: 1,
              participantAReference: { type: 'seed', seedNumber: 1 },
              participantBReference: { type: 'seed', seedNumber: 8 },
            },
            {
              slotId: 'SLOT-QF-02',
              roundId: 'quarter',
              position: 2,
              // Referência inválida que dispara erro de validação
              participantAReference: { type: 'tipo-invalido-inexistente' } as unknown as ParticipantReference,
              participantBReference: { type: 'seed', seedNumber: 7 },
            },
          ],
        })
      ).rejects.toThrow();

      // Prova de Rollback Completo: ZERO registros persistidos
      const stagesAfterFailure = await dataAccess.listStages(compA.id);
      expect(stagesAfterFailure).toHaveLength(0);

      const slotsAfterFailure = await dataAccess.listMatchSlots(compA.id);
      expect(slotsAfterFailure).toHaveLength(0);
    });

    it('Teste C: Falha por round inexistente no slot aborta a operação inteira', async () => {
      await expect(
        dataAccess.saveStageDrawAndSlots({
          competitionId: compA.id,
          stage: {
            stageId: 'knockout-phase',
            name: 'Chaveamento',
            stageOrder: 1,
            stageType: 'knockout',
          },
          rounds: [
            { roundId: 'semi', name: 'Semifinal', roundOrder: 1 },
          ],
          slots: [
            {
              slotId: 'SLOT-01',
              // Round 'oitavas' NÃO existe na lista de rodadas declarada
              roundId: 'oitavas-fantasma',
              position: 1,
              participantAReference: { type: 'seed', seedNumber: 1 },
              participantBReference: { type: 'bye' },
            },
          ],
        })
      ).rejects.toThrow(/não existe no estágio/i);

      expect(await dataAccess.listStages(compA.id)).toHaveLength(0);
    });
  });

  // ============================================================================
  // 2. Defesa Anti-Fake Team (PERSIST-001 / PERSIST-006)
  // ============================================================================
  describe('Defesa Anti-Fake Team (Zero TBD, __BYE__, UNKNOWN)', () => {
    it('deve rejeitar tentativa de persistir resolvedTeamAId com TBD', async () => {
      await expect(
        dataAccess.saveStageDrawAndSlots({
          competitionId: compA.id,
          stage: { stageId: 's1', name: 'Estágio 1', stageOrder: 1, stageType: 'groups' },
          rounds: [{ roundId: 'r1', name: 'Rodada 1', roundOrder: 1 }],
          slots: [
            {
              slotId: 'SLOT-TBD-1',
              roundId: 'r1',
              position: 1,
              participantAReference: { type: 'seed', seedNumber: 1 },
              participantBReference: { type: 'seed', seedNumber: 2 },
              resolvedTeamAId: 'TBD-A-1',
            },
          ],
        })
      ).rejects.toThrow(/Equipe artificial 'TBD-A-1' rejeitada/i);

      expect(await dataAccess.listStages(compA.id)).toHaveLength(0);
    });

    it('deve rejeitar tentativa de persistir resolvedTeamBId com __BYE__', async () => {
      await expect(
        dataAccess.saveStageDrawAndSlots({
          competitionId: compA.id,
          stage: { stageId: 's1', name: 'Estágio 1', stageOrder: 1, stageType: 'knockout' },
          rounds: [{ roundId: 'r1', name: 'Rodada 1', roundOrder: 1 }],
          slots: [
            {
              slotId: 'SLOT-BYE-1',
              roundId: 'r1',
              position: 1,
              participantAReference: { type: 'seed', seedNumber: 1 },
              participantBReference: { type: 'bye' },
              resolvedTeamBId: '__BYE__',
            },
          ],
        })
      ).rejects.toThrow(/Equipe artificial '__BYE__' rejeitada/i);
    });

    it('deve rejeitar tentativa de persistir resolvedTeamAId com UNKNOWN ou PLACEHOLDER', async () => {
      await expect(
        dataAccess.saveStageDrawAndSlots({
          competitionId: compA.id,
          stage: { stageId: 's1', name: 'Estágio 1', stageOrder: 1, stageType: 'knockout' },
          rounds: [{ roundId: 'r1', name: 'Rodada 1', roundOrder: 1 }],
          slots: [
            {
              slotId: 'SLOT-UNK-1',
              roundId: 'r1',
              position: 1,
              participantAReference: { type: 'seed', seedNumber: 1 },
              participantBReference: { type: 'seed', seedNumber: 2 },
              resolvedTeamAId: 'UNKNOWN',
            },
          ],
        })
      ).rejects.toThrow(/Equipe artificial 'UNKNOWN' rejeitada/i);
    });

    it('função isArtificialTeamId identifica com precisão todas as variações de IDs falsos', () => {
      expect(isArtificialTeamId('TBD')).toBe(true);
      expect(isArtificialTeamId('tbd-1')).toBe(true);
      expect(isArtificialTeamId('TBD-A-1')).toBe(true);
      expect(isArtificialTeamId('__BYE__')).toBe(true);
      expect(isArtificialTeamId('__bye')).toBe(true);
      expect(isArtificialTeamId('UNKNOWN')).toBe(true);
      expect(isArtificialTeamId('unknown')).toBe(true);
      expect(isArtificialTeamId('PLACEHOLDER-X')).toBe(true);
      expect(isArtificialTeamId('__TEMPORARY')).toBe(true);

      // IDs legítimos de equipes
      expect(isArtificialTeamId('team-1')).toBe(false);
      expect(isArtificialTeamId('ct-osasco')).toBe(false);
      expect(isArtificialTeamId('taubate-volei')).toBe(false);
      expect(isArtificialTeamId(null)).toBe(false);
      expect(isArtificialTeamId(undefined)).toBe(false);
    });
  });

  // ============================================================================
  // 3. Validação dos 8 Tipos Canônicos de ParticipantReference
  // ============================================================================
  describe('Validação Canônica de ParticipantReference', () => {
    it('deve aceitar os 8 tipos canônicos aprovados', () => {
      expect(() => validateParticipantReference({ type: 'resolved-team', teamId: 'team-1', teamName: 'Taubaté' })).not.toThrow();
      expect(() => validateParticipantReference({ type: 'group-position', stageId: 'g1', groupIndex: 0, position: 1 })).not.toThrow();
      expect(() => validateParticipantReference({ type: 'overall-ranking', stageId: 'g1', position: 5 })).not.toThrow();
      expect(() => validateParticipantReference({ type: 'stage-position', stageId: 'pi1', position: 1 })).not.toThrow();
      expect(() => validateParticipantReference({ type: 'match-winner', slotId: 'SLOT-01' })).not.toThrow();
      expect(() => validateParticipantReference({ type: 'match-loser', slotId: 'SLOT-01' })).not.toThrow();
      expect(() => validateParticipantReference({ type: 'seed', seedNumber: 1 })).not.toThrow();
      expect(() => validateParticipantReference({ type: 'bye' })).not.toThrow();
    });

    it('deve rejeitar resolved-team com ID artificial embutido na referência', () => {
      expect(() => validateParticipantReference({ type: 'resolved-team', teamId: 'TBD-A-1' })).toThrow(/Equipe fictícia não permitida/i);
      expect(() => validateParticipantReference({ type: 'resolved-team', teamId: '__BYE__' })).toThrow(/Equipe fictícia não permitida/i);
    });

    it('deve rejeitar tipos desconhecidos ou não canônicos', () => {
      expect(() => validateParticipantReference({ type: 'custom-formula' })).toThrow(/ParticipantReference type inválido/i);
      expect(() => validateParticipantReference({ type: 'winner_of_bracket' })).toThrow(/ParticipantReference type inválido/i);
      expect(() => validateParticipantReference(null)).toThrow(/objeto válido/i);
    });
  });

  // ============================================================================
  // 4. Propagação Transacional de Resultado (rpc_propagate_slot_outcome)
  // ============================================================================
  describe('Propagação Transacional de Resultado e Preservação de Proveniência', () => {
    beforeEach(async () => {
      // Cria chaveamento inicial: QF1 e QF2 propagam para SF1
      await dataAccess.saveStageDrawAndSlots({
        competitionId: compA.id,
        stage: {
          stageId: 'playoffs',
          name: 'Playoffs',
          stageOrder: 1,
          stageType: 'knockout',
        },
        rounds: [
          { roundId: 'quarters', name: 'Quartas', roundOrder: 1 },
          { roundId: 'semis', name: 'Semifinais', roundOrder: 2 },
          { roundId: 'third-place', name: 'Disputa 3º Lugar', roundOrder: 3 },
        ],
        slots: [
          {
            slotId: 'SLOT-QF-01',
            roundId: 'quarters',
            position: 1,
            participantAReference: { type: 'resolved-team', teamId: team1.id, teamName: team1.name },
            participantAStatus: 'resolved',
            resolvedTeamAId: team1.id,
            participantBReference: { type: 'resolved-team', teamId: team2.id, teamName: team2.name },
            participantBStatus: 'resolved',
            resolvedTeamBId: team2.id,
            progressionRoute: {
              onWinner: { targetSlotId: 'SLOT-SF-01', targetSide: 'A' },
              onLoser: { targetSlotId: 'SLOT-3RD-01', targetSide: 'A' },
            },
          },
          {
            slotId: 'SLOT-SF-01',
            roundId: 'semis',
            position: 1,
            label: 'Semifinal 1',
            participantAReference: { type: 'match-winner', slotId: 'SLOT-QF-01' },
            participantBReference: { type: 'seed', seedNumber: 4 },
          },
          {
            slotId: 'SLOT-3RD-01',
            roundId: 'third-place',
            position: 1,
            label: 'Bronze',
            participantAReference: { type: 'match-loser', slotId: 'SLOT-QF-01' },
            participantBReference: { type: 'seed', seedNumber: 8 },
          },
        ],
      });
    });

    it('deve propagar vencedor e perdedor preservando rigorosamente o participant_reference original', async () => {
      // Executa propagação atômica do resultado: team1 venceu, team2 perdeu
      const result = await dataAccess.propagateSlotOutcome({
        competitionId: compA.id,
        slotId: 'SLOT-QF-01',
        winnerTeamId: team1.id,
        loserTeamId: team2.id,
      });

      expect(result.ok).toBe(true);
      expect(result.updatedCount).toBeGreaterThanOrEqual(2);

      // Verifica slot de destino do vencedor (SF-01)
      const sfSlot = await dataAccess.getMatchSlotByLogicalId(compA.id, 'SLOT-SF-01');
      expect(sfSlot).not.toBeNull();
      expect(sfSlot?.resolvedTeamAId).toBe(team1.id);
      expect(sfSlot?.participantAStatus).toBe('resolved');

      // REGRA MÁXIMA DA FASE 4.7: participant_reference NUNCA é substituído!
      expect(sfSlot?.participantAReference).toEqual({
        type: 'match-winner',
        slotId: 'SLOT-QF-01',
      });

      // Verifica slot de destino do perdedor (3RD-01)
      const thirdSlot = await dataAccess.getMatchSlotByLogicalId(compA.id, 'SLOT-3RD-01');
      expect(thirdSlot).not.toBeNull();
      expect(thirdSlot?.resolvedTeamAId).toBe(team2.id);
      expect(thirdSlot?.participantAStatus).toBe('resolved');

      // Proveniência estrutural do perdedor intacta
      expect(thirdSlot?.participantAReference).toEqual({
        type: 'match-loser',
        slotId: 'SLOT-QF-01',
      });
    });

    it('Idempotência: repetir a mesma propagação não duplica nem corrompe os dados', async () => {
      // 1ª propagação
      const firstRun = await dataAccess.propagateSlotOutcome({
        competitionId: compA.id,
        slotId: 'SLOT-QF-01',
        winnerTeamId: team1.id,
        loserTeamId: team2.id,
      });
      expect(firstRun.ok).toBe(true);
      expect(firstRun.idempotent).toBe(false);

      // 2ª propagação (idêntica)
      const secondRun = await dataAccess.propagateSlotOutcome({
        competitionId: compA.id,
        slotId: 'SLOT-QF-01',
        winnerTeamId: team1.id,
        loserTeamId: team2.id,
      });
      expect(secondRun.ok).toBe(true);
      expect(secondRun.idempotent).toBe(true);
      expect(secondRun.updatedCount).toBe(0);

      // Confere integridade final
      const sfSlot = await dataAccess.getMatchSlotByLogicalId(compA.id, 'SLOT-SF-01');
      expect(sfSlot?.resolvedTeamAId).toBe(team1.id);
      expect(sfSlot?.participantAStatus).toBe('resolved');
      expect(sfSlot?.participantAReference.type).toBe('match-winner');
    });

    it('deve rejeitar propagação que tente enviar equipe artificial como vencedor', async () => {
      await expect(
        dataAccess.propagateSlotOutcome({
          competitionId: compA.id,
          slotId: 'SLOT-QF-01',
          winnerTeamId: 'TBD-A-1',
        })
      ).rejects.toThrow(/Equipe artificial 'TBD-A-1' rejeitada como vencedor/i);
    });

    it('deve rejeitar propagação que tente enviar equipe artificial como perdedor', async () => {
      await expect(
        dataAccess.propagateSlotOutcome({
          competitionId: compA.id,
          slotId: 'SLOT-QF-01',
          loserTeamId: '__BYE__',
        })
      ).rejects.toThrow(/Equipe artificial '__BYE__' rejeitada como perdedor/i);
    });

    it('deve associar matchId no slot de origem quando informado na propagação', async () => {
      const match = await dataAccess.createMatch({
        competitionId: compA.id,
        round: 1,
        matchNumber: 101,
        teamAId: team1.id,
        teamBId: team2.id,
        teamAName: team1.name,
        teamBName: team2.name,
        teamAShortName: team1.shortName,
        teamBShortName: team2.shortName,
        venue: 'Ginásio Alpha',
        scheduledTime: '2026-09-10T14:00:00Z',
        status: 'scheduled',
        sets: [],
        referees: [],
      });

      await dataAccess.propagateSlotOutcome({
        competitionId: compA.id,
        slotId: 'SLOT-QF-01',
        winnerTeamId: team1.id,
        matchId: match.id,
      });

      const qfSlot = await dataAccess.getMatchSlotByLogicalId(compA.id, 'SLOT-QF-01');
      expect(qfSlot?.matchId).toBe(match.id);
    });
  });
});
