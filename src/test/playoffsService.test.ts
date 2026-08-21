import { describe, it, expect } from 'vitest';
import {
  generateFourGroupPlayoffs,
  generateTwoGroupPlayoffs,
  buildPlayoffMatches,
  advancePlayoffMatches,
  computePodium,
} from '@/services/playoffsService';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { StandingsByGroup } from '@/services/standingsService';

const mockTeams: TeamRecord[] = [
  { id: 'team-1', name: 'Osasco', shortName: 'OSA', modality: 'indoor' },
  { id: 'team-2', name: 'Minas', shortName: 'MIN', modality: 'indoor' },
  { id: 'team-3', name: 'Praia Clube', shortName: 'PRA', modality: 'indoor' },
  { id: 'team-4', name: 'Flamengo', shortName: 'FLA', modality: 'indoor' },
  { id: 'team-5', name: 'Sesi-SP', shortName: 'SES', modality: 'indoor' },
  { id: 'team-6', name: 'Sada Cruzeiro', shortName: 'SAD', modality: 'indoor' },
  { id: 'team-7', name: 'Curitiba', shortName: 'CUR', modality: 'indoor' },
  { id: 'team-8', name: 'Barueri', shortName: 'BAR', modality: 'indoor' },
];

const mockStandingsFourGroups: StandingsByGroup = [
  {
    groupName: 'Grupo A',
    standings: [
      { position: 1, teamId: 'team-1', teamName: 'Osasco', teamShortName: 'OSA', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 9, setsLost: 1, setsRatio: 9, pointsWon: 250, pointsLost: 180, pointsBalance: 70, pointsRatio: 1.38, competitionPoints: 9 },
      { position: 2, teamId: 'team-2', teamName: 'Minas', teamShortName: 'MIN', matchesPlayed: 3, matchesWon: 2, matchesLost: 1, setsWon: 6, setsLost: 4, setsRatio: 1.5, pointsWon: 230, pointsLost: 200, pointsBalance: 30, pointsRatio: 1.15, competitionPoints: 6 },
    ],
  },
  {
    groupName: 'Grupo B',
    standings: [
      { position: 1, teamId: 'team-3', teamName: 'Praia Clube', teamShortName: 'PRA', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 9, setsLost: 2, setsRatio: 4.5, pointsWon: 260, pointsLost: 190, pointsBalance: 70, pointsRatio: 1.36, competitionPoints: 8 },
      { position: 2, teamId: 'team-4', teamName: 'Flamengo', teamShortName: 'FLA', matchesPlayed: 3, matchesWon: 2, matchesLost: 1, setsWon: 7, setsLost: 5, setsRatio: 1.4, pointsWon: 240, pointsLost: 220, pointsBalance: 20, pointsRatio: 1.09, competitionPoints: 6 },
    ],
  },
  {
    groupName: 'Grupo C',
    standings: [
      { position: 1, teamId: 'team-5', teamName: 'Sesi-SP', teamShortName: 'SES', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 9, setsLost: 0, setsRatio: 9, pointsWon: 225, pointsLost: 150, pointsBalance: 75, pointsRatio: 1.5, competitionPoints: 9 },
      { position: 2, teamId: 'team-6', teamName: 'Sada Cruzeiro', teamShortName: 'SAD', matchesPlayed: 3, matchesWon: 2, matchesLost: 1, setsWon: 6, setsLost: 3, setsRatio: 2, pointsWon: 210, pointsLost: 180, pointsBalance: 30, pointsRatio: 1.16, competitionPoints: 6 },
    ],
  },
  {
    groupName: 'Grupo D',
    standings: [
      { position: 1, teamId: 'team-7', teamName: 'Curitiba', teamShortName: 'CUR', matchesPlayed: 3, matchesWon: 3, matchesLost: 0, setsWon: 9, setsLost: 2, setsRatio: 4.5, pointsWon: 250, pointsLost: 200, pointsBalance: 50, pointsRatio: 1.25, competitionPoints: 8 },
      { position: 2, teamId: 'team-8', teamName: 'Barueri', teamShortName: 'BAR', matchesPlayed: 3, matchesWon: 2, matchesLost: 1, setsWon: 7, setsLost: 4, setsRatio: 1.75, pointsWon: 240, pointsLost: 210, pointsBalance: 30, pointsRatio: 1.14, competitionPoints: 6 },
    ],
  },
];

const mockCompetition: CompetitionRecord = {
  id: 'comp-1',
  name: 'Copa dos Campeões',
  modality: 'indoor',
  format: 'group-stage-knockout',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  phaseSetRules: {
    groupStage: '3-sets',
    playoffs: '3-sets',
    semifinals: '5-sets',
    final: '5-sets',
  },
  status: 'in-progress',
};

describe('playoffsService', () => {
  it('gera grade de 4 grupos (Quartas, Semis, 3º lugar, Final)', () => {
    const slots = generateFourGroupPlayoffs(mockStandingsFourGroups);
    expect(slots.length).toBe(8);

    // Quartas 1: 1A (team-1) x 2B (team-4)
    expect(slots[0].sourceTeamA.teamId).toBe('team-1');
    expect(slots[0].sourceTeamB.teamId).toBe('team-4');

    // Quartas 2: 1C (team-5) x 2D (team-8)
    expect(slots[1].sourceTeamA.teamId).toBe('team-5');
    expect(slots[1].sourceTeamB.teamId).toBe('team-8');

    // Quartas 3: 1B (team-3) x 2A (team-2)
    expect(slots[2].sourceTeamA.teamId).toBe('team-3');
    expect(slots[2].sourceTeamB.teamId).toBe('team-2');

    // Quartas 4: 1D (team-7) x 2C (team-6)
    expect(slots[3].sourceTeamA.teamId).toBe('team-7');
    expect(slots[3].sourceTeamB.teamId).toBe('team-6');
  });

  it('gera grade de 2 grupos (Semis, 3º lugar, Final)', () => {
    const slots = generateTwoGroupPlayoffs(mockStandingsFourGroups.slice(0, 2));
    expect(slots.length).toBe(4);
    expect(slots[0].sourceTeamA.teamId).toBe('team-1');
    expect(slots[0].sourceTeamB.teamId).toBe('team-4');
  });

  it('cria MatchRecords pré-gerados com status awaiting_schedule', () => {
    const slots = generateFourGroupPlayoffs(mockStandingsFourGroups);
    const matches = buildPlayoffMatches(mockCompetition, slots, mockTeams, 13);
    expect(matches.length).toBe(8);
    expect(matches[0].matchNumber).toBe(13);
    expect(matches[0].status).toBe('awaiting_schedule');
    expect(matches[0].teamAName).toBe('Osasco');
    expect(matches[0].teamBName).toBe('Flamengo');
  });

  it('propaga automaticamente vencedores para as semifinais e final', () => {
    const slots = generateFourGroupPlayoffs(mockStandingsFourGroups);
    const rawMatches = buildPlayoffMatches(mockCompetition, slots, mockTeams, 1);
    const matchesWithIds: MatchRecord[] = rawMatches.map((m, i) => ({
      ...m,
      id: `match-playoff-${i + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Simula vitórias nas Quartas
    matchesWithIds[0].status = 'homologated';
    matchesWithIds[0].winnerId = 'team-1'; // Q1: Osasco vence

    matchesWithIds[1].status = 'homologated';
    matchesWithIds[1].winnerId = 'team-5'; // Q2: Sesi vence

    matchesWithIds[2].status = 'homologated';
    matchesWithIds[2].winnerId = 'team-3'; // Q3: Praia vence

    matchesWithIds[3].status = 'homologated';
    matchesWithIds[3].winnerId = 'team-6'; // Q4: Sada vence

    const { updatedMatches, changed } = advancePlayoffMatches(matchesWithIds, mockTeams);
    expect(changed).toBe(true);

    const semi1 = updatedMatches.find(m => m.phase === 'semifinal' && m.groupName === 'Semifinal 1');
    const semi2 = updatedMatches.find(m => m.phase === 'semifinal' && m.groupName === 'Semifinal 2');

    expect(semi1?.teamAId).toBe('team-1'); // Osasco
    expect(semi1?.teamBId).toBe('team-5'); // Sesi
    expect(semi2?.teamAId).toBe('team-3'); // Praia
    expect(semi2?.teamBId).toBe('team-6'); // Sada

    // Simula vitórias nas Semis
    semi1!.status = 'homologated';
    semi1!.winnerId = 'team-1'; // Osasco vai pra final, Sesi pro 3º

    semi2!.status = 'homologated';
    semi2!.winnerId = 'team-3'; // Praia vai pra final, Sada pro 3º

    const secondAdvance = advancePlayoffMatches(updatedMatches, mockTeams);
    expect(secondAdvance.changed).toBe(true);

    const finalMatch = secondAdvance.updatedMatches.find(m => m.phase === 'final');
    const thirdMatch = secondAdvance.updatedMatches.find(m => m.phase === 'terceiro_lugar');

    expect(finalMatch?.teamAId).toBe('team-1'); // Osasco
    expect(finalMatch?.teamBId).toBe('team-3'); // Praia
    expect(thirdMatch?.teamAId).toBe('team-5'); // Sesi (perdedor Semi 1)
    expect(thirdMatch?.teamBId).toBe('team-6'); // Sada (perdedor Semi 2)
  });

  it('calcula o pódio final da competição', () => {
    const finalMatch: MatchRecord = {
      id: 'final-1',
      competitionId: 'comp-1',
      round: 4,
      matchNumber: 20,
      teamAId: 'team-1',
      teamBId: 'team-3',
      teamAName: 'Osasco',
      teamBName: 'Praia Clube',
      teamAShortName: 'OSA',
      teamBShortName: 'PRA',
      venue: 'Ginásio',
      phase: 'final',
      scheduledTime: new Date().toISOString(),
      status: 'homologated',
      winnerId: 'team-1',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
        { setNumber: 3, scoreA: 25, scoreB: 18 },
      ],
      referees: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const thirdMatch: MatchRecord = {
      id: 'third-1',
      competitionId: 'comp-1',
      round: 3,
      matchNumber: 19,
      teamAId: 'team-5',
      teamBId: 'team-6',
      teamAName: 'Sesi',
      teamBName: 'Sada',
      teamAShortName: 'SES',
      teamBShortName: 'SAD',
      venue: 'Ginásio',
      phase: 'terceiro_lugar',
      scheduledTime: new Date().toISOString(),
      status: 'homologated',
      winnerId: 'team-6',
      sets: [
        { setNumber: 1, scoreA: 20, scoreB: 25 },
        { setNumber: 2, scoreA: 23, scoreB: 25 },
        { setNumber: 3, scoreA: 21, scoreB: 25 },
      ],
      referees: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const podium = computePodium([finalMatch, thirdMatch]);
    expect(podium.championTeamId).toBe('team-1');
    expect(podium.runnerUpTeamId).toBe('team-3');
    expect(podium.thirdPlaceTeamId).toBe('team-6');
    expect(podium.fourthPlaceTeamId).toBe('team-5');
  });
});
