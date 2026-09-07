import { describe, expect, it } from 'vitest';
import type { CanonicalMatchResult, MatchSlot, ProgressionRoute } from '@/types/competitionConfig';
import { GenericProgressionEngine } from '@/services/genericProgressionEngine';
import { createByeParticipantSlot, createResolvedParticipantSlot, createUnresolvedParticipantSlot } from '@/types/competitionConfig';

describe('GenericProgressionEngine', () => {
  it('propaga vencedor para o slot destino sem recalcular resultado esportivo', () => {
    const slots: MatchSlot[] = [
      {
        slotId: 'SLOT-SF-1',
        stageId: 'playoffs',
        roundId: 'semis',
        position: 1,
        participantA: createResolvedParticipantSlot('A', 'team-1', 'Alpha Vôlei'),
        participantB: createResolvedParticipantSlot('B', 'team-2', 'Beta Spikers'),
        progressionRoute: {
          sourceSlotId: 'SLOT-SF-1',
          onWinner: { targetStageId: 'playoffs', targetRoundId: 'final', targetSlotId: 'SLOT-FINAL', targetSide: 'A' },
          onLoser: { targetStageId: 'playoffs', targetRoundId: 'third-place', targetSlotId: 'SLOT-BRONZE', targetSide: 'A' },
        },
      },
      {
        slotId: 'SLOT-FINAL',
        stageId: 'playoffs',
        roundId: 'final',
        position: 1,
        participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: 'SLOT-SF-1' }, 'Vencedor Semi 1'),
        participantB: createUnresolvedParticipantSlot('B', { type: 'match-winner', slotId: 'SLOT-SF-2' }, 'Vencedor Semi 2'),
      },
      {
        slotId: 'SLOT-BRONZE',
        stageId: 'playoffs',
        roundId: 'third-place',
        position: 1,
        participantA: createUnresolvedParticipantSlot('A', { type: 'match-loser', slotId: 'SLOT-SF-1' }, 'Perdedor Semi 1'),
        participantB: createUnresolvedParticipantSlot('B', { type: 'match-loser', slotId: 'SLOT-SF-2' }, 'Perdedor Semi 2'),
      },
    ];

    // CanonicalMatchResult oficial emitido por autoridade esportiva
    const canonicalResult: CanonicalMatchResult = {
      isValid: true,
      status: 'homologated',
      winnerId: 'team-1',
      loserId: 'team-2',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 1,
      pointsScoredA: 55,
      pointsScoredB: 50,
      setScores: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 15, scoreB: 10 },
      ],
      isWo: false,
      isCompleted: true,
      isHomologated: true,
      isInconsistent: false,
    };

    const evalResult = GenericProgressionEngine.evaluate(slots, {
      canonicalResultsBySlot: {
        'SLOT-SF-1': canonicalResult,
      },
    });

    const finalSlot = evalResult.updatedSlots.find(s => s.slotId === 'SLOT-FINAL');
    expect(finalSlot?.participantA.status).toBe('resolved');
    expect(finalSlot?.participantA.resolvedTeamId).toBe('team-1');
    expect(finalSlot?.participantB.status).toBe('unresolved'); // Semi 2 ainda pendente!

    const bronzeSlot = evalResult.updatedSlots.find(s => s.slotId === 'SLOT-BRONZE');
    expect(bronzeSlot?.participantA.status).toBe('resolved');
    expect(bronzeSlot?.participantA.resolvedTeamId).toBe('team-2'); // Perdedor da Semi 1
    expect(bronzeSlot?.participantB.status).toBe('unresolved');
  });

  it('suporta resultado parcial (Match A concluído, Match B pendente) sem quebrar o grafo', () => {
    const slots: MatchSlot[] = [
      {
        slotId: 'SLOT-SF-1',
        stageId: 'playoffs',
        roundId: 'semis',
        position: 1,
        participantA: createResolvedParticipantSlot('A', 'team-1'),
        participantB: createResolvedParticipantSlot('B', 'team-2'),
        progressionRoute: {
          sourceSlotId: 'SLOT-SF-1',
          onWinner: { targetStageId: 'playoffs', targetRoundId: 'final', targetSlotId: 'SLOT-FINAL', targetSide: 'A' },
        },
      },
      {
        slotId: 'SLOT-SF-2',
        stageId: 'playoffs',
        roundId: 'semis',
        position: 2,
        participantA: createResolvedParticipantSlot('A', 'team-3'),
        participantB: createResolvedParticipantSlot('B', 'team-4'),
        progressionRoute: {
          sourceSlotId: 'SLOT-SF-2',
          onWinner: { targetStageId: 'playoffs', targetRoundId: 'final', targetSlotId: 'SLOT-FINAL', targetSide: 'B' },
        },
      },
      {
        slotId: 'SLOT-FINAL',
        stageId: 'playoffs',
        roundId: 'final',
        position: 1,
        participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: 'SLOT-SF-1' }, 'Vencedor Semi 1'),
        participantB: createUnresolvedParticipantSlot('B', { type: 'match-winner', slotId: 'SLOT-SF-2' }, 'Vencedor Semi 2'),
      },
    ];

    // Semi 1 finalizada, Semi 2 pendente
    const partialResult: CanonicalMatchResult = {
      isValid: true,
      status: 'homologated',
      winnerId: 'team-1',
      loserId: 'team-2',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 0,
      pointsScoredA: 50,
      pointsScoredB: 30,
      setScores: [{ setNumber: 1, scoreA: 25, scoreB: 15 }, { setNumber: 2, scoreA: 25, scoreB: 15 }],
      isWo: false,
      isCompleted: true,
      isHomologated: true,
      isInconsistent: false,
    };

    const firstRun = GenericProgressionEngine.evaluate(slots, {
      canonicalResultsBySlot: {
        'SLOT-SF-1': partialResult,
      },
    });

    const finalFirst = firstRun.updatedSlots.find(s => s.slotId === 'SLOT-FINAL');
    expect(finalFirst?.participantA.status).toBe('resolved');
    expect(finalFirst?.participantA.resolvedTeamId).toBe('team-1');
    expect(finalFirst?.participantB.status).toBe('unresolved');
    expect(firstRun.resolvedRoutesCount).toBe(1);
    expect(firstRun.pendingRoutesCount).toBe(1);

    // Passo 2: Semi 2 é concluída mais tarde
    const semi2Result: CanonicalMatchResult = {
      isValid: true,
      status: 'homologated',
      winnerId: 'team-4',
      loserId: 'team-3',
      winnerSide: 'B',
      setsWonA: 1,
      setsWonB: 2,
      pointsScoredA: 45,
      pointsScoredB: 50,
      setScores: [],
      isWo: false,
      isCompleted: true,
      isHomologated: true,
      isInconsistent: false,
    };

    const secondRun = GenericProgressionEngine.evaluate(firstRun.updatedSlots, {
      canonicalResultsBySlot: {
        'SLOT-SF-1': partialResult,
        'SLOT-SF-2': semi2Result,
      },
    });

    const finalSecond = secondRun.updatedSlots.find(s => s.slotId === 'SLOT-FINAL');
    // Ambos os participantes agora estão resolvidos
    expect(finalSecond?.participantA.status).toBe('resolved');
    expect(finalSecond?.participantA.resolvedTeamId).toBe('team-1');
    expect(finalSecond?.participantB.status).toBe('resolved');
    expect(finalSecond?.participantB.resolvedTeamId).toBe('team-4');
  });

  it('propaga avanço automático de BYE diretamente sem necessidade de partida', () => {
    const slots: MatchSlot[] = [
      {
        slotId: 'SLOT-QF-1',
        stageId: 'playoffs',
        roundId: 'qf',
        position: 1,
        participantA: createResolvedParticipantSlot('A', 'team-top-seed', 'Top Seed'),
        participantB: createByeParticipantSlot('B'),
        progressionRoute: {
          sourceSlotId: 'SLOT-QF-1',
          onWinner: { targetStageId: 'playoffs', targetRoundId: 'semis', targetSlotId: 'SLOT-SF-1', targetSide: 'A' },
        },
      },
      {
        slotId: 'SLOT-SF-1',
        stageId: 'playoffs',
        roundId: 'semis',
        position: 1,
        participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: 'SLOT-QF-1' }, 'Vencedor QF 1'),
        participantB: createByeParticipantSlot('B'),
      },
    ];

    // Nenhuma partida foi jogada no slot QF-1 (é BYE)
    const evalResult = GenericProgressionEngine.evaluate(slots, {
      canonicalResultsBySlot: {},
    });

    const semiSlot = evalResult.updatedSlots.find(s => s.slotId === 'SLOT-SF-1');
    expect(semiSlot?.participantA.status).toBe('resolved');
    expect(semiSlot?.participantA.resolvedTeamId).toBe('team-top-seed');
    expect(evalResult.advancements[0].type).toBe('bye-advance');
  });

  it('é estritamente idempotente (re-execução com mesmos dados produz saída idêntica)', () => {
    const slots: MatchSlot[] = [
      {
        slotId: 'SLOT-1',
        stageId: 's1',
        roundId: 'r1',
        position: 1,
        participantA: createResolvedParticipantSlot('A', 'team-1'),
        participantB: createResolvedParticipantSlot('B', 'team-2'),
        progressionRoute: {
          sourceSlotId: 'SLOT-1',
          onWinner: { targetStageId: 's2', targetRoundId: 'r2', targetSlotId: 'SLOT-2', targetSide: 'A' },
        },
      },
      {
        slotId: 'SLOT-2',
        stageId: 's2',
        roundId: 'r2',
        position: 1,
        participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: 'SLOT-1' }, 'Vencedor'),
        participantB: createByeParticipantSlot('B'),
      },
    ];

    const result: CanonicalMatchResult = {
      isValid: true,
      status: 'homologated',
      winnerId: 'team-1',
      loserId: 'team-2',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 0,
      pointsScoredA: 50,
      pointsScoredB: 30,
      setScores: [],
      isWo: false,
      isCompleted: true,
      isHomologated: true,
      isInconsistent: false,
    };

    const first = GenericProgressionEngine.evaluate(slots, { canonicalResultsBySlot: { 'SLOT-1': result } });
    const second = GenericProgressionEngine.evaluate(first.updatedSlots, { canonicalResultsBySlot: { 'SLOT-1': result } });

    expect(second.updatedSlots).toEqual(first.updatedSlots);
  });
});
