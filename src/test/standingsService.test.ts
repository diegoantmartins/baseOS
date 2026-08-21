// Testes do motor de classificação e desempate.

import { describe, expect, it } from 'vitest';
import type { MatchRecord, TeamRecord } from '@/types/entities';
import {
  competitionPointsFromSets,
  computeStandings,
  computeStandingsByGroup,
  computeBestThirds,
  headToHeadWinner,
  type StandingsByGroup,
} from '@/services/standingsService';

function team(id: string, name: string, shortName: string, groupName?: string) {
  return { team: { id, name, shortName } as TeamRecord, groupName };
}

function completedMatch(
  id: string,
  teamAId: string,
  teamBId: string,
  sets: { scoreA: number; scoreB: number }[],
): MatchRecord {
  const teamAName = teamAId;
  const teamBName = teamBId;
  return {
    id,
    competitionId: 'comp-1',
    modality: 'indoor',
    playerFormat: '6x6',
    round: 1,
    matchNumber: 1,
    teamAId,
    teamBId,
    teamAName,
    teamBName,
    teamAShortName: teamAId,
    teamBShortName: teamBId,
    sets: sets.map((s, i) => ({ setNumber: i + 1, scoreA: s.scoreA, scoreB: s.scoreB })),
    status: 'completed',
    date: '2026-08-01',
    time: '09:00',
    venue: 'Ginásio',
    scheduledTime: '2026-08-01T09:00:00.000Z',
    winnerId: null,
    referees: [],
    createdAt: '',
    updatedAt: '',
  } as MatchRecord;
}

describe('Pontos de competição (FIVB/CBV)', () => {
  it('vitória 3-0 e 3-1 valem 3 pontos', () => {
    expect(competitionPointsFromSets(3, 0)).toBe(3);
    expect(competitionPointsFromSets(3, 1)).toBe(3);
  });

  it('vitória 3-2 vale 2 pontos', () => {
    expect(competitionPointsFromSets(3, 2)).toBe(2);
  });

  it('derrota 2-3 vale 1 ponto', () => {
    expect(competitionPointsFromSets(2, 3)).toBe(1);
  });

  it('derrota 0-3 e 1-3 valem 0 pontos', () => {
    expect(competitionPointsFromSets(0, 3)).toBe(0);
    expect(competitionPointsFromSets(1, 3)).toBe(0);
  });
});

describe('Desempate por confronto direto', () => {
  it('retorna o vencedor entre duas equipes com jogo definido', () => {
    const m = completedMatch('m1', 'A', 'B', [
      { scoreA: 25, scoreB: 20 },
      { scoreA: 25, scoreB: 18 },
      { scoreA: 26, scoreB: 24 },
    ]);
    expect(headToHeadWinner([m], 'A', 'B')).toBe('A');
  });

  it('retorna null quando as equipes empataram 1x1', () => {
    const m1 = completedMatch('m1', 'A', 'B', [
      { scoreA: 25, scoreB: 20 },
      { scoreA: 25, scoreB: 18 },
      { scoreA: 26, scoreB: 24 },
    ]);
    const m2 = completedMatch('m2', 'B', 'A', [
      { scoreA: 25, scoreB: 22 },
      { scoreA: 25, scoreB: 19 },
      { scoreA: 25, scoreB: 21 },
    ]);
    expect(headToHeadWinner([m1, m2], 'A', 'B')).toBeNull();
  });
});

describe('Classificação', () => {
  it('ordena por pontos de competição', () => {
    const matches = [
      completedMatch('m1', 'A', 'B', [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 18 },
        { scoreA: 26, scoreB: 24 },
      ]),
      completedMatch('m2', 'C', 'A', [
        { scoreA: 22, scoreB: 25 },
        { scoreA: 20, scoreB: 25 },
        { scoreA: 18, scoreB: 25 },
      ]),
      completedMatch('m3', 'B', 'C', [
        { scoreA: 25, scoreB: 22 },
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 21 },
      ]),
    ];
    const standings = computeStandings(
      [team('A', 'Alpha', 'ALP'), team('B', 'Bravo', 'BRA'), team('C', 'Charlie', 'CHA')],
      matches,
    );
    expect(standings.map(s => s.teamId)).toEqual(['A', 'B', 'C']);
    expect(standings[0].competitionPoints).toBe(6);
    expect(standings[2].competitionPoints).toBe(0);
  });

  it('usa confronto direto quando há empate em pontos entre 2 equipes', () => {
    const matches = [
      // A vence B, mas perde para C; B vence C
      completedMatch('m1', 'A', 'B', [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 18 },
        { scoreA: 26, scoreB: 24 },
      ]),
      completedMatch('m2', 'C', 'A', [
        { scoreA: 25, scoreB: 22 },
        { scoreA: 25, scoreB: 19 },
        { scoreA: 25, scoreB: 21 },
      ]),
      completedMatch('m3', 'B', 'C', [
        { scoreA: 25, scoreB: 22 },
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 21 },
      ]),
    ];
    const standings = computeStandings(
      [team('A', 'Alpha', 'ALP'), team('B', 'Bravo', 'BRA'), team('C', 'Charlie', 'CHA')],
      matches,
    );
    // A venceu B no confronto direto e B venceu C: A, B, C
    expect(standings.map(s => s.teamId)).toEqual(['A', 'B', 'C']);
  });

  it('aplica set average quando o confronto direto não decide (3+ equipes)', () => {
    const matches = [
      completedMatch('m1', 'A', 'B', [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 18 },
        { scoreA: 26, scoreB: 24 },
      ]),
      completedMatch('m2', 'C', 'A', [
        { scoreA: 25, scoreB: 22 },
        { scoreA: 25, scoreB: 19 },
        { scoreA: 25, scoreB: 21 },
      ]),
      completedMatch('m3', 'B', 'C', [
        { scoreA: 25, scoreB: 22 },
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 21 },
      ]),
    ];
    // Todos 6 pontos; D e E só com empate direto não definido
    const extraMatches = [
      completedMatch('m4', 'D', 'E', [
        { scoreA: 25, scoreB: 23 },
        { scoreA: 23, scoreB: 25 },
        { scoreA: 15, scoreB: 10 },
        { scoreA: 25, scoreB: 21 },
      ]),
      completedMatch('m5', 'E', 'D', [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 18 },
        { scoreA: 25, scoreB: 22 },
      ]),
    ];
    const standings = computeStandings(
      [team('D', 'Delta', 'DEL'), team('E', 'Echo', 'ECH')],
      extraMatches,
    );
    // Empate em pontos (3x3) e confronto direto 1x1: decide o set average.
    // E: 4 sets vencidos / 3 perdidos = 1.33 > D: 3/4 = 0.75
    expect(standings[0].teamId).toBe('E');
    expect(standings[1].teamId).toBe('D');
  });

  it('ordena por saldo de pontos em último caso antes do sorteio', () => {
    const matches = [
      completedMatch('m1', 'A', 'B', [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 18 },
        { scoreA: 26, scoreB: 24 },
      ]),
      completedMatch('m2', 'C', 'A', [
        { scoreA: 25, scoreB: 22 },
        { scoreA: 25, scoreB: 19 },
        { scoreA: 25, scoreB: 21 },
      ]),
      completedMatch('m3', 'B', 'C', [
        { scoreA: 25, scoreB: 22 },
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 21 },
      ]),
    ];
    const standings = computeStandings(
      [team('A', 'Alpha', 'ALP'), team('B', 'Bravo', 'BRA'), team('C', 'Charlie', 'CHA')],
      matches,
    );
    expect(standings.map(s => s.teamId)).toEqual(['A', 'B', 'C']);
  });

  it('agrupa por chave e nomeia a chave genérica', () => {
    const byGroup = computeStandingsByGroup(
      [
        team('A', 'Alpha', 'ALP', 'Grupo A'),
        team('B', 'Bravo', 'BRA', 'Grupo A'),
        team('C', 'Charlie', 'CHA'),
      ],
      [],
    );
    expect(byGroup.map(g => g.groupName)).toEqual(['Grupo A', 'Classificação Geral']);
    expect(byGroup[0].standings[0].position).toBe(1);
  });

  it('respeita ordem customizada de critérios definida pelo gestor (ex: vitórias antes de pontos)', () => {
    // Equipe A: 2 vitórias por 3x2 = 4 pontos
    // Equipe B: 1 vitória por 3x0 e 1 derrota 2x3 = 4 pontos (1 vitória)
    const matches = [
      completedMatch('m1', 'A', 'C', [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 20, scoreB: 25 },
        { scoreA: 25, scoreB: 22 },
        { scoreA: 22, scoreB: 25 },
        { scoreA: 15, scoreB: 13 },
      ]),
      completedMatch('m2', 'A', 'D', [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 20, scoreB: 25 },
        { scoreA: 25, scoreB: 22 },
        { scoreA: 22, scoreB: 25 },
        { scoreA: 15, scoreB: 13 },
      ]),
      completedMatch('m3', 'B', 'C', [
        { scoreA: 25, scoreB: 15 },
        { scoreA: 25, scoreB: 18 },
        { scoreA: 25, scoreB: 20 },
      ]),
      completedMatch('m4', 'D', 'B', [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 20, scoreB: 25 },
        { scoreA: 25, scoreB: 22 },
        { scoreA: 22, scoreB: 25 },
        { scoreA: 15, scoreB: 13 },
      ]),
    ];

    const standings = computeStandings(
      [team('B', 'Bravo', 'BRA'), team('A', 'Alpha', 'ALP')],
      matches,
      { criteria: ['victories', 'points', 'sets-balance'] },
    );

    // Com critério 'victories' primeiro, Equipe A (2 vitórias) fica à frente de B (1 vitória)
    expect(standings[0].teamId).toBe('A');
    expect(standings[0].matchesWon).toBe(2);
    expect(standings[1].teamId).toBe('B');
    expect(standings[1].matchesWon).toBe(1);
    expect(standings[0].tiebreakReason).toContain('mais vitórias');
  });

  it('calcula o ranking dos Melhores Terceiros colocados', () => {
    const groupAStandings = [
      { position: 1, teamId: 'A1', teamName: 'A1', teamShortName: 'A1', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 9, setsLost: 0, setsRatio: 9, pointsWon: 225, pointsLost: 150, pointsBalance: 75, pointsRatio: 1.5, competitionPoints: 9 },
      { position: 2, teamId: 'A2', teamName: 'A2', teamShortName: 'A2', matchesPlayed: 3, matchesWon: 2, matchesLost: 1, setsWon: 6, setsLost: 3, setsRatio: 2, pointsWon: 210, pointsLost: 180, pointsBalance: 30, pointsRatio: 1.16, competitionPoints: 6 },
      { position: 3, teamId: 'A3', teamName: 'Equipe A3', teamShortName: 'A3', matchesPlayed: 3, matchesWon: 1, matchesLost: 2, setsWon: 4, setsLost: 6, setsRatio: 0.66, pointsWon: 200, pointsLost: 210, pointsBalance: -10, pointsRatio: 0.95, competitionPoints: 4 },
    ];
    const groupBStandings = [
      { position: 1, teamId: 'B1', teamName: 'B1', teamShortName: 'B1', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 9, setsLost: 0, setsRatio: 9, pointsWon: 225, pointsLost: 150, pointsBalance: 75, pointsRatio: 1.5, competitionPoints: 9 },
      { position: 2, teamId: 'B2', teamName: 'B2', teamShortName: 'B2', matchesPlayed: 3, matchesWon: 2, matchesLost: 1, setsWon: 6, setsLost: 3, setsRatio: 2, pointsWon: 210, pointsLost: 180, pointsBalance: 30, pointsRatio: 1.16, competitionPoints: 6 },
      { position: 3, teamId: 'B3', teamName: 'Equipe B3', teamShortName: 'B3', matchesPlayed: 3, matchesWon: 1, matchesLost: 2, setsWon: 3, setsLost: 7, setsRatio: 0.42, pointsWon: 180, pointsLost: 220, pointsBalance: -40, pointsRatio: 0.81, competitionPoints: 2 },
    ];

    const groupStandings: StandingsByGroup = [
      { groupName: 'Grupo A', standings: groupAStandings },
      { groupName: 'Grupo B', standings: groupBStandings },
    ];

    const bestThirds = computeBestThirds(groupStandings, 1);
    expect(bestThirds.length).toBe(2);
    expect(bestThirds[0].teamId).toBe('A3');
    expect(bestThirds[0].qualified).toBe(true);
    expect(bestThirds[1].teamId).toBe('B3');
    expect(bestThirds[1].qualified).toBe(false);
  });
});
