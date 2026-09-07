import { describe, expect, it } from 'vitest';
import type { CanonicalMatchResult, MatchSlot, ParticipantReference } from '@/types/competitionConfig';
import type { TeamRecord } from '@/types/entities';
import { ParticipantResolutionEngine, type ResolutionContext } from '@/services/participantResolutionEngine';
import { createByeParticipantSlot, createResolvedParticipantSlot } from '@/types/competitionConfig';

describe('ParticipantResolutionEngine', () => {
  const mockTeams: TeamRecord[] = [
    { id: 'team-1', name: 'Alpha Vôlei', shortName: 'ALP', modality: 'indoor' },
    { id: 'team-2', name: 'Beta Spikers', shortName: 'BET', modality: 'indoor' },
    { id: 'team-3', name: 'Gamma Aces', shortName: 'GAM', modality: 'indoor' },
    { id: 'team-4', name: 'Delta Blockers', shortName: 'DEL', modality: 'indoor' },
  ];

  it('resolve referência BYE com status "bye", isBye: true e resolvedTeamId: null', () => {
    const ref: ParticipantReference = { type: 'bye' };
    const res = ParticipantResolutionEngine.resolveReference(ref, 'A');

    expect(res.status).toBe('bye');
    expect(res.isBye).toBe(true);
    expect(res.resolvedTeamId).toBeNull();
    expect(res.displayPlaceholder).toBe('BYE');
  });

  it('resolve referência resolved-team com o nome correto da equipe', () => {
    const ref: ParticipantReference = { type: 'resolved-team', teamId: 'team-1' };
    const res = ParticipantResolutionEngine.resolveReference(ref, 'A', { teams: mockTeams });

    expect(res.status).toBe('resolved');
    expect(res.resolvedTeamId).toBe('team-1');
    expect(res.resolvedTeamName).toBe('Alpha Vôlei');
    expect(res.isBye).toBe(false);
  });

  it('resolve referência group-position quando o grupo já possui classificação', () => {
    const context: ResolutionContext = {
      teams: mockTeams,
      standingsByStage: {
        'group-stage': [
          {
            groupName: 'Grupo A',
            standings: [
              { position: 1, teamId: 'team-1', teamName: 'Alpha Vôlei', teamShortName: 'ALP', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 6, setsLost: 0, setsBalance: 6, setsRatio: 6, pointsWon: 150, pointsLost: 90, pointsBalance: 60, pointsRatio: 1.66, competitionPoints: 9 },
              { position: 2, teamId: 'team-2', teamName: 'Beta Spikers', teamShortName: 'BET', matchesPlayed: 3, matchesWon: 2, matchesLost: 1, setsWon: 4, setsLost: 2, setsBalance: 2, setsRatio: 2, pointsWon: 130, pointsLost: 110, pointsBalance: 20, pointsRatio: 1.18, competitionPoints: 6 },
            ],
          },
        ],
      },
    };

    const ref1: ParticipantReference = { type: 'group-position', stageId: 'group-stage', groupIndex: 0, position: 1 };
    const res1 = ParticipantResolutionEngine.resolveReference(ref1, 'A', context);
    expect(res1.status).toBe('resolved');
    expect(res1.resolvedTeamId).toBe('team-1');
    expect(res1.resolvedTeamName).toBe('Alpha Vôlei');

    const ref2: ParticipantReference = { type: 'group-position', stageId: 'group-stage', groupIndex: 0, position: 2 };
    const res2 = ParticipantResolutionEngine.resolveReference(ref2, 'B', context);
    expect(res2.status).toBe('resolved');
    expect(res2.resolvedTeamId).toBe('team-2');

    // Posição inexistente no grupo
    const refInvalid: ParticipantReference = { type: 'group-position', stageId: 'group-stage', groupIndex: 0, position: 99 };
    const resInvalid = ParticipantResolutionEngine.resolveReference(refInvalid, 'A', context);
    expect(resInvalid.status).toBe('invalid');
  });

  it('retorna "unresolved" para group-position se a fase de grupos ainda não terminou', () => {
    const ref: ParticipantReference = { type: 'group-position', stageId: 'group-stage', groupIndex: 0, position: 1 };
    const res = ParticipantResolutionEngine.resolveReference(ref, 'A', {});

    expect(res.status).toBe('unresolved');
    expect(res.resolvedTeamId).toBeNull();
    expect(res.displayPlaceholder).toBe('1º Colocado - Grupo A');
  });

  it('resolve referência overall-ranking', () => {
    const context: ResolutionContext = {
      teams: mockTeams,
      overallStandingsByStage: {
        'group-stage': [
          { groupPosition: 1, overallRank: 1, position: 1, teamId: 'team-1', teamName: 'Alpha Vôlei', teamShortName: 'ALP', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 6, setsLost: 0, setsBalance: 6, setsRatio: 6, pointsWon: 150, pointsLost: 90, pointsBalance: 60, pointsRatio: 1.66, competitionPoints: 9 },
          { groupPosition: 1, overallRank: 2, position: 2, teamId: 'team-2', teamName: 'Beta Spikers', teamShortName: 'BET', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 6, setsLost: 1, setsBalance: 5, setsRatio: 6, pointsWon: 145, pointsLost: 95, pointsBalance: 50, pointsRatio: 1.52, competitionPoints: 9 },
          { groupPosition: 2, overallRank: 5, position: 5, teamId: 'team-3', teamName: 'Gamma Aces', teamShortName: 'GAM', matchesPlayed: 3, matchesWon: 2, matchesLost: 1, setsWon: 4, setsLost: 2, setsBalance: 2, setsRatio: 2, pointsWon: 130, pointsLost: 110, pointsBalance: 20, pointsRatio: 1.18, competitionPoints: 6 },
        ],
      },
    };

    const ref5: ParticipantReference = { type: 'overall-ranking', stageId: 'group-stage', position: 5 };
    const res5 = ParticipantResolutionEngine.resolveReference(ref5, 'A', context);

    expect(res5.status).toBe('resolved');
    expect(res5.resolvedTeamId).toBe('team-3');
    expect(res5.resolvedTeamName).toBe('Gamma Aces');

    const refPending: ParticipantReference = { type: 'overall-ranking', stageId: 'group-stage', position: 12 };
    const resPending = ParticipantResolutionEngine.resolveReference(refPending, 'B', context);
    expect(resPending.status).toBe('unresolved');
    expect(resPending.displayPlaceholder).toBe('12º Colocado Geral');
  });

  it('resolve match-winner com resultado canônico homologado', () => {
    const canonicalResult: CanonicalMatchResult = {
      isValid: true,
      status: 'homologated',
      winnerId: 'team-1',
      loserId: 'team-2',
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 0,
      pointsScoredA: 50,
      pointsScoredB: 38,
      setScores: [{ setNumber: 1, scoreA: 25, scoreB: 18 }, { setNumber: 2, scoreA: 25, scoreB: 20 }],
      isWo: false,
      isCompleted: true,
      isHomologated: true,
      isInconsistent: false,
    };

    const context: ResolutionContext = {
      teams: mockTeams,
      canonicalResultsBySlot: {
        'SLOT-01': canonicalResult,
      },
    };

    const refWinner: ParticipantReference = { type: 'match-winner', slotId: 'SLOT-01' };
    const resWinner = ParticipantResolutionEngine.resolveReference(refWinner, 'A', context);
    expect(resWinner.status).toBe('resolved');
    expect(resWinner.resolvedTeamId).toBe('team-1');

    const refLoser: ParticipantReference = { type: 'match-loser', slotId: 'SLOT-01' };
    const resLoser = ParticipantResolutionEngine.resolveReference(refLoser, 'B', context);
    expect(resLoser.status).toBe('resolved');
    expect(resLoser.resolvedTeamId).toBe('team-2');
  });

  it('avança automaticamente o competidor que enfrentou BYE no slot de origem', () => {
    const sourceSlotWithBye: MatchSlot = {
      slotId: 'SLOT-BYE-1',
      stageId: 'knockout',
      roundId: 'r1',
      position: 1,
      participantA: createResolvedParticipantSlot('A', 'team-1', 'Alpha Vôlei'),
      participantB: createByeParticipantSlot('B'),
    };

    const context: ResolutionContext = {
      teams: mockTeams,
      slotsById: {
        'SLOT-BYE-1': sourceSlotWithBye,
      },
      canonicalResultsBySlot: {}, // Sem nenhuma partida jogada!
    };

    const refWinner: ParticipantReference = { type: 'match-winner', slotId: 'SLOT-BYE-1' };
    const resWinner = ParticipantResolutionEngine.resolveReference(refWinner, 'A', context);

    expect(resWinner.status).toBe('resolved');
    expect(resWinner.resolvedTeamId).toBe('team-1');
    expect(resWinner.resolvedTeamName).toBe('Alpha Vôlei');
    expect(resWinner.isBye).toBe(false);
  });

  it('retorna "unresolved" para match-winner quando o jogo ainda não aconteceu', () => {
    const ref: ParticipantReference = { type: 'match-winner', slotId: 'SLOT-FUTURE' };
    const res = ParticipantResolutionEngine.resolveReference(ref, 'A', { canonicalResultsBySlot: {} });

    expect(res.status).toBe('unresolved');
    expect(res.resolvedTeamId).toBeNull();
    expect(res.displayPlaceholder).toBe('Vencedor SLOT-FUTURE');
  });
});
