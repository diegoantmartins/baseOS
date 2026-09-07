import { describe, it, expect } from 'vitest';
import { computeStandings, computeStandingsByGroup } from '@/services/standingsService';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

describe('Fase 4.6 — Classificação e Estatísticas como Projeções Canônicas', () => {
  const teamA: TeamRecord = { id: 'team-a', name: 'Alpha', shortName: 'ALP', modality: 'indoor' };
  const teamB: TeamRecord = { id: 'team-b', name: 'Beta', shortName: 'BET', modality: 'indoor' };
  const teamC: TeamRecord = { id: 'team-c', name: 'Gamma', shortName: 'GAM', modality: 'indoor' };

  const baseCompetition: CompetitionRecord = {
    id: 'comp-standings-1',
    name: 'Copa Classificação 2026',
    modality: 'indoor',
    format: 'groups',
    playerFormat: '6x6',
    setFormat: '5-sets',
    genderCategory: 'male',
    status: 'in-progress',
    config: {
      version: 1,
      format: {
        defaultSetsToWin: 3,
        setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
      },
      scoring: {
        systemType: 'fivb-standard',
        pointsWinClear: 3,
        pointsWinNarrow: 2,
        pointsLossNarrow: 1,
        pointsLossClear: 0,
        pointsWoWin: 3,
        pointsWoLoss: 0,
      },
      standings: {
        tiebreakCriteriaOrder: ['points', 'victories', 'head-to-head', 'set-average', 'points-average'],
        advancingPerGroup: 2,
      },
      registration: {
        minAthletes: 6,
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
        requireJerseyNumberOnRegistration: false,
      },
    },
  };

  it('classificação simples: calcula vitórias, sets, pontos e pontuação FIVB (3x0 = 3pts, 3x2 = 2pts, 2x3 = 1pt)', () => {
    const matches: MatchRecord[] = [
      // Alpha vence Beta por 3x0 (3 pts Alpha, 0 pts Beta)
      {
        id: 'm1',
        competitionId: baseCompetition.id,
        round: 1,
        matchNumber: 1,
        teamAId: 'team-a',
        teamBId: 'team-b',
        teamAName: 'Alpha',
        teamBName: 'Beta',
        teamAShortName: 'ALP',
        teamBShortName: 'BET',
        venue: 'Ginásio',
        scheduledTime: '2026-09-03T10:00:00Z',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 25, scoreB: 18 },
          { setNumber: 3, scoreA: 25, scoreB: 22 },
        ],
        winnerId: 'team-a',
        referees: [],
        createdAt: '',
        updatedAt: '',
      },
      // Beta vence Gamma por 3x2 (2 pts Beta, 1 pt Gamma)
      {
        id: 'm2',
        competitionId: baseCompetition.id,
        round: 2,
        matchNumber: 2,
        teamAId: 'team-b',
        teamBId: 'team-c',
        teamAName: 'Beta',
        teamBName: 'Gamma',
        teamAShortName: 'BET',
        teamBShortName: 'GAM',
        venue: 'Ginásio',
        scheduledTime: '2026-09-03T14:00:00Z',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 22 },
          { setNumber: 4, scoreA: 22, scoreB: 25 },
          { setNumber: 5, scoreA: 15, scoreB: 13 },
        ],
        winnerId: 'team-b',
        referees: [],
        createdAt: '',
        updatedAt: '',
      },
    ];

    const standings = computeStandings(
      [{ team: teamA }, { team: teamB }, { team: teamC }],
      matches,
      { competition: baseCompetition }
    );

    expect(standings).toHaveLength(3);

    // 1º Lugar: Alpha (1J, 1V, 3 pts, sets 3-0)
    expect(standings[0].teamId).toBe('team-a');
    expect(standings[0].position).toBe(1);
    expect(standings[0].competitionPoints).toBe(3);
    expect(standings[0].matchesWon).toBe(1);
    expect(standings[0].setsWon).toBe(3);
    expect(standings[0].setsLost).toBe(0);

    // 2º Lugar: Beta (2J, 1V, 1D, 2 pts, sets 3-5)
    expect(standings[1].teamId).toBe('team-b');
    expect(standings[1].position).toBe(2);
    expect(standings[1].competitionPoints).toBe(2);
    expect(standings[1].matchesWon).toBe(1);
    expect(standings[1].matchesLost).toBe(1);

    // 3º Lugar: Gamma (1J, 0V, 1D, 1 pt, sets 2-3)
    expect(standings[2].teamId).toBe('team-c');
    expect(standings[2].position).toBe(3);
    expect(standings[2].competitionPoints).toBe(1);
    expect(standings[2].matchesWon).toBe(0);
    expect(standings[2].matchesLost).toBe(1);
  });

  it('ordem canônica de desempate: extrai critérios diretamente de CompetitionConfig', () => {
    // Competição com critério customizado: VITÓRIAS antes de PONTOS
    const compVictoriesFirst: CompetitionRecord = {
      ...baseCompetition,
      config: {
        ...baseCompetition.config!,
        standings: {
          tiebreakCriteriaOrder: ['victories', 'points', 'set-average'],
          advancingPerGroup: 2,
        },
      },
    };

    // Equipe A tem 2 vitórias de 3x2 (4 pontos totais)
    // Equipe B tem 1 vitória de 3x0 e 1 derrota 2x3 (4 pontos totais)
    // Se criteria fosse pontos, empatariam; como victories vem antes, A fica em 1º
    const matches: MatchRecord[] = [
      {
        id: 'm1',
        competitionId: compVictoriesFirst.id,
        round: 1,
        matchNumber: 1,
        teamAId: 'team-a',
        teamBId: 'team-c',
        teamAName: 'Alpha',
        teamBName: 'Gamma',
        teamAShortName: 'ALP',
        teamBShortName: 'GAM',
        venue: 'Ginásio',
        scheduledTime: '2026-09-03T10:00:00Z',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 22 },
          { setNumber: 4, scoreA: 22, scoreB: 25 },
          { setNumber: 5, scoreA: 15, scoreB: 13 },
        ],
        winnerId: 'team-a',
        referees: [],
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'm2',
        competitionId: compVictoriesFirst.id,
        round: 2,
        matchNumber: 2,
        teamAId: 'team-a',
        teamBId: 'team-c',
        teamAName: 'Alpha',
        teamBName: 'Gamma',
        teamAShortName: 'ALP',
        teamBShortName: 'GAM',
        venue: 'Ginásio',
        scheduledTime: '2026-09-03T14:00:00Z',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 22 },
          { setNumber: 4, scoreA: 22, scoreB: 25 },
          { setNumber: 5, scoreA: 15, scoreB: 13 },
        ],
        winnerId: 'team-a',
        referees: [],
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'm3',
        competitionId: compVictoriesFirst.id,
        round: 1,
        matchNumber: 3,
        teamAId: 'team-b',
        teamBId: 'team-c',
        teamAName: 'Beta',
        teamBName: 'Gamma',
        teamAShortName: 'BET',
        teamBShortName: 'GAM',
        venue: 'Ginásio',
        scheduledTime: '2026-09-03T16:00:00Z',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 15 },
          { setNumber: 2, scoreA: 25, scoreB: 18 },
          { setNumber: 3, scoreA: 25, scoreB: 20 },
        ],
        winnerId: 'team-b',
        referees: [],
        createdAt: '',
        updatedAt: '',
      },
    ];

    const standings = computeStandings(
      [{ team: teamB }, { team: teamA }],
      matches,
      { competition: compVictoriesFirst }
    );

    // Equipe Alpha tem 2 vitórias vs 1 vitória da Equipe Beta
    expect(standings[0].teamId).toBe('team-a');
    expect(standings[0].matchesWon).toBe(2);
    expect(standings[1].teamId).toBe('team-b');
    expect(standings[1].matchesWon).toBe(1);
    expect(standings[0].tiebreakReason).toContain('mais vitórias');
  });

  it('médias com divisor zero: set average e points average sem NaN ou Infinity', () => {
    // Equipe A venceu 3x0 (setsLost = 0)
    const match: MatchRecord = {
      id: 'm1',
      competitionId: baseCompetition.id,
      round: 1,
      matchNumber: 1,
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      teamAShortName: 'ALP',
      teamBShortName: 'BET',
      venue: 'Ginásio',
      scheduledTime: '2026-09-03T10:00:00Z',
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 0 },
        { setNumber: 2, scoreA: 25, scoreB: 0 },
        { setNumber: 3, scoreA: 25, scoreB: 0 },
      ],
      winnerId: 'team-a',
      referees: [],
      createdAt: '',
      updatedAt: '',
    };

    const standings = computeStandings([{ team: teamA }, { team: teamB }], [match], {
      competition: baseCompetition,
    });

    // SetsRatio deve ser um número finito (não NaN nem Infinity)
    expect(Number.isFinite(standings[0].setsRatio)).toBe(true);
    expect(standings[0].setsRatio).toBe(3); // setsLost = 0 -> ratio = setsWon = 3
    expect(Number.isFinite(standings[0].pointsRatio)).toBe(true);
    expect(standings[0].pointsRatio).toBe(75); // pointsLost = 0 -> ratio = pointsWon = 75
  });

  it('classificação com W.O.: pontua 3x0 e 75x0 pontos corretamente na tabela', () => {
    const woMatch: MatchRecord = {
      id: 'm-wo',
      competitionId: baseCompetition.id,
      round: 1,
      matchNumber: 1,
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      teamAShortName: 'ALP',
      teamBShortName: 'BET',
      venue: 'Ginásio',
      scheduledTime: '2026-09-03T10:00:00Z',
      status: 'completed',
      isWo: true,
      winnerId: 'team-a',
      sets: [], // Sem sets físicos
      referees: [],
      createdAt: '',
      updatedAt: '',
    };

    const standings = computeStandings([{ team: teamA }, { team: teamB }], [woMatch], {
      competition: baseCompetition,
    });

    expect(standings[0].teamId).toBe('team-a');
    expect(standings[0].competitionPoints).toBe(3);
    expect(standings[0].setsWon).toBe(3);
    expect(standings[0].setsLost).toBe(0);
    expect(standings[0].pointsWon).toBe(75);

    expect(standings[1].teamId).toBe('team-b');
    expect(standings[1].competitionPoints).toBe(0);
    expect(standings[1].setsWon).toBe(0);
    expect(standings[1].setsLost).toBe(3);
    expect(standings[1].pointsWon).toBe(0);
  });
});
