import { beforeEach, describe, expect, it } from 'vitest';
import {
  computeOverallStandings,
  OverallStandingsEngine,
} from '@/services/overallStandingsEngine';
import { computeStandingsWithMiniTable } from '@/services/standingsService';
import { CompetitionRuntimeService } from '@/services/competitionRuntimeService';
import { clearAllCompetitionData, dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionConfig } from '@/types/competitionConfig';

function createTeam(id: string, name: string, shortName: string): TeamRecord {
  return {
    id,
    name,
    shortName,
    modality: 'indoor',
  };
}

function createMatch(
  id: string,
  matchNumber: number,
  teamA: TeamRecord,
  teamB: TeamRecord,
  groupName: string,
  setScores: Array<{ scoreA: number; scoreB: number }>,
): MatchRecord {
  const setsWonA = setScores.filter((s) => s.scoreA > s.scoreB).length;
  const setsWonB = setScores.filter((s) => s.scoreB > s.scoreA).length;
  const winnerId = setsWonA > setsWonB ? teamA.id : teamB.id;
  const now = '2026-10-18T10:00:00Z';

  return {
    id,
    competitionId: 'comp-voltz-dag-transition',
    round: matchNumber,
    matchNumber,
    teamAId: teamA.id,
    teamBId: teamB.id,
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAShortName: teamA.shortName,
    teamBShortName: teamB.shortName,
    venue: 'Ginásio Voltz',
    court: 'Quadra Central',
    phase: 'classificatória',
    groupName,
    scheduledTime: now,
    status: 'homologated',
    winnerId,
    setsWonA,
    setsWonB,
    sets: setScores.map((s, idx) => ({ setNumber: idx + 1, ...s })),
    setScores: setScores.map((s, idx) => ({ setNumber: idx + 1, ...s })),
    referees: [],
    homologatedAt: now,
    createdAt: now,
    updatedAt: now,
  } as unknown as MatchRecord;
}

describe('BASEOS v2.5.2 — Transição Automática de Fases (DAG): Ranking [4,3,3], Play-In e Quartas', () => {
  const compId = 'comp-voltz-dag-transition';

  // 10 Equipes Oficiais
  const teams: TeamRecord[] = [
    createTeam('team-1', 'Voltz A', 'VTA'),
    createTeam('team-2', "SNK's Core", 'SNK'),
    createTeam('team-3', 'Mafia Voleibol', 'MAF'),
    createTeam('team-4', 'Nexus', 'NEX'),
    createTeam('team-5', 'UFFS Realeza', 'UFF'),
    createTeam('team-6', 'Overzone', 'OVZ'),
    createTeam('team-7', 'Voltz B', 'VTB'),
    createTeam('team-8', 'AVQI Quedas do Iguaçu', 'AVQ'),
    createTeam('team-9', 'AAADU Preguiça', 'PRE'),
    createTeam('team-10', 'Foz Vôlei', 'FOZ'),
  ];

  const competitionConfig: CompetitionConfig = {
    version: 1,
    format: {
      formatType: 'groups-play-in-knockout',
      defaultSetsToWin: 2,
      setRules: {
        regularSetPoints: 25,
        tiebreakPoints: 15,
        minAdvantage: 2,
      },
      stages: [
        {
          id: 'fase-grupos',
          stageId: 'fase-grupos',
          order: 1,
          name: 'Fase de Grupos (3 Chaves)',
          type: 'group-stage',
          participantsCount: 10,
          groupsCount: 3,
          advancingCount: 6,
          groupConfig: {
            groupsCount: 3,
            teamsPerGroup: 4,
            groupCapacities: [4, 3, 3],
            rounds: 'single',
          },
        },
        {
          id: 'play-in',
          stageId: 'play-in',
          order: 2,
          name: 'Repescagem / Play-In (7º ao 10º)',
          type: 'play-in',
          participantsCount: 4,
          advancingCount: 2,
        },
        {
          id: 'fase-final',
          stageId: 'fase-final',
          order: 3,
          name: 'Fase Final (Quartas, Semis, Final e 3º)',
          type: 'knockout',
          participantsCount: 8,
          eliminationConfig: {
            bracketSize: 8,
            hasThirdPlaceMatch: true,
          },
        },
      ],
    },
    standings: {
      aggregationStrategy: 'by-group-position-first',
      advancingPerGroup: 2,
      bestThirds: { enabled: false, count: 0 },
      tiebreakCriteriaOrder: ['points', 'victories', 'set-average', 'points-average'],
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
    registration: {
      minAthletes: 6,
      maxAthletes: 14,
      maxCaptains: 1,
      maxLiberos: 2,
      requireJerseyNumberOnRegistration: false,
    },
  };

  const competitionRecord: CompetitionRecord = {
    id: compId,
    name: '4º Campeonato Voltz de Voleibol',
    modality: 'indoor',
    format: 'groups-play-in-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'in-progress',
    groupsCount: 3,
    config: competitionConfig,
  };

  // Grupos [4, 3, 3]
  const groupA = [teams[0], teams[1], teams[2], teams[3]]; // 4 times
  const groupB = [teams[4], teams[5], teams[6]];           // 3 times
  const groupC = [teams[7], teams[8], teams[9]];           // 3 times

  // 12 Partidas da Classificatória
  const groupMatches: MatchRecord[] = [
    // Grupo A (6 jogos: 3 jogos por equipe)
    createMatch('m-1', 1, teams[0], teams[1], 'Grupo A', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
    createMatch('m-2', 2, teams[0], teams[2], 'Grupo A', [{ scoreA: 25, scoreB: 18 }, { scoreA: 25, scoreB: 18 }]),
    createMatch('m-3', 3, teams[0], teams[3], 'Grupo A', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
    createMatch('m-4', 4, teams[1], teams[2], 'Grupo A', [{ scoreA: 25, scoreB: 22 }, { scoreA: 25, scoreB: 22 }]),
    createMatch('m-5', 5, teams[1], teams[3], 'Grupo A', [{ scoreA: 25, scoreB: 19 }, { scoreA: 25, scoreB: 19 }]),
    createMatch('m-6', 6, teams[2], teams[3], 'Grupo A', [{ scoreA: 25, scoreB: 21 }, { scoreA: 25, scoreB: 21 }]),

    // Grupo B (3 jogos: 2 jogos por equipe)
    createMatch('m-7', 7, teams[4], teams[5], 'Grupo B', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
    createMatch('m-8', 8, teams[4], teams[6], 'Grupo B', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
    createMatch('m-9', 9, teams[5], teams[6], 'Grupo B', [{ scoreA: 25, scoreB: 22 }, { scoreA: 25, scoreB: 22 }]),

    // Grupo C (3 jogos: 2 jogos por equipe)
    createMatch('m-10', 10, teams[7], teams[8], 'Grupo C', [{ scoreA: 25, scoreB: 18 }, { scoreA: 25, scoreB: 18 }]),
    createMatch('m-11', 11, teams[7], teams[9], 'Grupo C', [{ scoreA: 25, scoreB: 14 }, { scoreA: 25, scoreB: 14 }]),
    createMatch('m-12', 12, teams[8], teams[9], 'Grupo C', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
  ];

  beforeEach(async () => {
    clearAllCompetitionData();
    await dataAccess.createCompetition(competitionRecord);
    for (const t of teams) {
      await dataAccess.createTeam(t);
      await dataAccess.createCompetitionTeam({
        competitionId: compId,
        teamId: t.id,
        teamName: t.name,
        teamShortName: t.shortName,
        registrationDeadline: '2026-10-31T23:59:59Z',
        isLocked: false,
        status: 'approved',
      });
    }
    for (const m of groupMatches) {
      await dataAccess.createMatch(m);
    }
  });

  it('1. Ranking Intergrupos Canônico FIVB: descarta partida contra o 4º colocado do Grupo A e ordena 1º..6º e 7º..10º', () => {
    const standingsA = computeStandingsWithMiniTable(groupA.map((t) => ({ team: t, groupName: 'Grupo A' })), groupMatches);
    const standingsB = computeStandingsWithMiniTable(groupB.map((t) => ({ team: t, groupName: 'Grupo B' })), groupMatches);
    const standingsC = computeStandingsWithMiniTable(groupC.map((t) => ({ team: t, groupName: 'Grupo C' })), groupMatches);

    const groupStandings = [
      { groupName: 'Grupo A', standings: standingsA },
      { groupName: 'Grupo B', standings: standingsB },
      { groupName: 'Grupo C', standings: standingsC },
    ];

    const overall = OverallStandingsEngine.computeOverallStandings(groupStandings, {
      competition: competitionRecord,
      matches: groupMatches,
      criteria: ['points', 'victories', 'set-average', 'points-average'],
    });

    expect(overall.length).toBe(10);

    // 1º ao 6º garantidos pelos 1ºs e 2ºs colocados de cada grupo (Avanço direto para Quartas)
    const directToQuarters = overall.slice(0, 6).map((s) => s.teamId);
    expect(directToQuarters).toContain('team-1'); // 1º Grupo A
    expect(directToQuarters).toContain('team-5'); // 1º Grupo B
    expect(directToQuarters).toContain('team-8'); // 1º Grupo C
    expect(directToQuarters).toContain('team-2'); // 2º Grupo A
    expect(directToQuarters).toContain('team-6'); // 2º Grupo B
    expect(directToQuarters).toContain('team-9'); // 2º Grupo C

    // 7º ao 10º formam a faixa da Repescagem / Play-In
    const playInParticipants = overall.slice(6, 10).map((s) => s.teamId);
    expect(playInParticipants).toContain('team-3');  // 3º Grupo A
    expect(playInParticipants).toContain('team-7');  // 3º Grupo B
    expect(playInParticipants).toContain('team-10'); // 3º Grupo C
    expect(playInParticipants).toContain('team-4');  // 4º Grupo A

    // 10º colocado DEVE ser o 4º colocado do Grupo A
    expect(overall[9].teamId).toBe('team-4');
    expect(overall[9].overallRank).toBe(10);
  });

  it('2. Materializa automaticamente os 2 jogos da Repescagem (R1 e R2) via reconciliação DAG', async () => {
    const standingsA = computeStandingsWithMiniTable(groupA.map((t) => ({ team: t, groupName: 'Grupo A' })), groupMatches);
    const standingsB = computeStandingsWithMiniTable(groupB.map((t) => ({ team: t, groupName: 'Grupo B' })), groupMatches);
    const standingsC = computeStandingsWithMiniTable(groupC.map((t) => ({ team: t, groupName: 'Grupo C' })), groupMatches);
    const groupStandings = [
      { groupName: 'Grupo A', standings: standingsA },
      { groupName: 'Grupo B', standings: standingsB },
      { groupName: 'Grupo C', standings: standingsC },
    ];
    const overall = OverallStandingsEngine.computeOverallStandings(groupStandings, {
      competition: competitionRecord,
      matches: groupMatches,
      criteria: ['points', 'victories', 'set-average', 'points-average'],
    });
    const rankMap = new Map(overall.map((s) => [s.overallRank, s.teamId]));

    // Reconciliação do Grafo
    const result = await CompetitionRuntimeService.reconcileCompetitionRuntime(compId);
    expect(result.ok).toBe(true);

    const allSlots = await dataAccess.listMatchSlots(compId);
    expect(allSlots.length).toBe(10); // R1, R2, QF1-4, SF1-2, Bronze, Final

    // Slot R1 (7º x 10º)
    const slotR1 = allSlots.find((s) => s.slotId === 'R1');
    expect(slotR1).toBeDefined();
    expect(slotR1?.participantAStatus).toBe('resolved');
    expect(slotR1?.participantBStatus).toBe('resolved');
    expect(slotR1?.resolvedTeamAId).toBe(rankMap.get(7));  // 7º Geral
    expect(slotR1?.resolvedTeamBId).toBe(rankMap.get(10)); // 10º Geral

    // Slot R2 (8º x 9º)
    const slotR2 = allSlots.find((s) => s.slotId === 'R2');
    expect(slotR2).toBeDefined();
    expect(slotR2?.participantAStatus).toBe('resolved');
    expect(slotR2?.participantBStatus).toBe('resolved');
    expect(slotR2?.resolvedTeamAId).toBe(rankMap.get(8)); // 8º Geral
    expect(slotR2?.resolvedTeamBId).toBe(rankMap.get(9)); // 9º Geral

    // Partidas reais materializadas em matches com status 'scheduled'
    const matchesAfter = await dataAccess.listMatches(compId);
    const matchR1 = matchesAfter.find((m) => m.slotId === 'R1');
    const matchR2 = matchesAfter.find((m) => m.slotId === 'R2');

    expect(matchR1).toBeDefined();
    expect(matchR1?.status).toBe('scheduled');
    expect(matchR1?.teamAId).toBe(rankMap.get(7));
    expect(matchR1?.teamBId).toBe(rankMap.get(10));

    expect(matchR2).toBeDefined();
    expect(matchR2?.status).toBe('scheduled');
    expect(matchR2?.teamAId).toBe(rankMap.get(8));
    expect(matchR2?.teamBId).toBe(rankMap.get(9));

    // Slots das Quartas de Final devem conter os classificados diretos resolvidos
    const slotQF1 = allSlots.find((s) => s.slotId === 'QF-01');
    expect(slotQF1?.resolvedTeamAId).toBe(rankMap.get(1)); // 1º Geral
    expect(slotQF1?.participantBStatus).toBe('unresolved'); // Vencedor R2 pendente

    const slotQF3 = allSlots.find((s) => s.slotId === 'QF-03');
    expect(slotQF3?.resolvedTeamAId).toBe(rankMap.get(2)); // 2º Geral
    expect(slotQF3?.participantBStatus).toBe('unresolved'); // Vencedor R1 pendente

    const slotQF2 = allSlots.find((s) => s.slotId === 'QF-02');
    expect(slotQF2?.resolvedTeamAId).toBe(rankMap.get(4)); // 4º Geral
    expect(slotQF2?.resolvedTeamBId).toBe(rankMap.get(5)); // 5º Geral

    const slotQF4 = allSlots.find((s) => s.slotId === 'QF-04');
    expect(slotQF4?.resolvedTeamAId).toBe(rankMap.get(3)); // 3º Geral
    expect(slotQF4?.resolvedTeamBId).toBe(rankMap.get(6)); // 6º Geral
  });

  it('3. Propagação Transacional: Conclusão de R1 e R2 avança vencedores para Quartas e materializa Q1 e Q3', async () => {
    const standingsA = computeStandingsWithMiniTable(groupA.map((t) => ({ team: t, groupName: 'Grupo A' })), groupMatches);
    const standingsB = computeStandingsWithMiniTable(groupB.map((t) => ({ team: t, groupName: 'Grupo B' })), groupMatches);
    const standingsC = computeStandingsWithMiniTable(groupC.map((t) => ({ team: t, groupName: 'Grupo C' })), groupMatches);
    const groupStandings = [
      { groupName: 'Grupo A', standings: standingsA },
      { groupName: 'Grupo B', standings: standingsB },
      { groupName: 'Grupo C', standings: standingsC },
    ];
    const overall = OverallStandingsEngine.computeOverallStandings(groupStandings, {
      competition: competitionRecord,
      matches: groupMatches,
      criteria: ['points', 'victories', 'set-average', 'points-average'],
    });
    const rankMap = new Map(overall.map((s) => [s.overallRank, s.teamId]));

    // 1. Reconciliação inicial: materializa R1 e R2
    await CompetitionRuntimeService.reconcileCompetitionRuntime(compId);

    const matchesList = await dataAccess.listMatches(compId);
    const matchR1 = matchesList.find((m) => m.slotId === 'R1')!;
    const matchR2 = matchesList.find((m) => m.slotId === 'R2')!;

    const winnerR1 = matchR1.teamAId; // 7º vence
    const winnerR2 = matchR2.teamAId; // 8º vence

    // 2. Homologa Repescagem 1
    await dataAccess.updateMatch(matchR1.id, {
      status: 'homologated',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 18 },
        { setNumber: 2, scoreA: 25, scoreB: 18 },
      ],
      winnerId: winnerR1,
      homologatedAt: new Date().toISOString(),
    });

    const execR1 = await CompetitionRuntimeService.handleMatchCompleted(compId, matchR1.id);
    expect(execR1.ok).toBe(true);

    // Slot QF-03 deve ter recebido o vencedor da Repescagem 1
    const slotsAfterR1 = await dataAccess.listMatchSlots(compId);
    const slotQF3 = slotsAfterR1.find((s) => s.slotId === 'QF-03');
    expect(slotQF3?.resolvedTeamBId).toBe(winnerR1);
    expect(slotQF3?.participantBStatus).toBe('resolved');

    // Partida QF-03 agora DEVE ter sido materializada automaticamente!
    const matchesAfterR1 = await dataAccess.listMatches(compId);
    const matchQF3 = matchesAfterR1.find((m) => m.slotId === 'QF-03');
    expect(matchQF3).toBeDefined();
    expect(matchQF3?.status).toBe('scheduled');
    expect(matchQF3?.teamAId).toBe(rankMap.get(2)); // 2º Geral
    expect(matchQF3?.teamBId).toBe(winnerR1);       // Vencedor R1

    // 3. Homologa Repescagem 2
    await dataAccess.updateMatch(matchR2.id, {
      status: 'homologated',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 20 },
      ],
      winnerId: winnerR2,
      homologatedAt: new Date().toISOString(),
    });

    const execR2 = await CompetitionRuntimeService.handleMatchCompleted(compId, matchR2.id);
    expect(execR2.ok).toBe(true);

    // Slot QF-01 deve ter recebido o vencedor da Repescagem 2
    const slotsAfterR2 = await dataAccess.listMatchSlots(compId);
    const slotQF1 = slotsAfterR2.find((s) => s.slotId === 'QF-01');
    expect(slotQF1?.resolvedTeamBId).toBe(winnerR2);
    expect(slotQF1?.participantBStatus).toBe('resolved');

    // Partida QF-01 agora DEVE ter sido materializada automaticamente!
    const matchesAfterR2 = await dataAccess.listMatches(compId);
    const matchQF1 = matchesAfterR2.find((m) => m.slotId === 'QF-01');
    expect(matchQF1).toBeDefined();
    expect(matchQF1?.status).toBe('scheduled');
    expect(matchQF1?.teamAId).toBe(rankMap.get(1)); // 1º Geral
    expect(matchQF1?.teamBId).toBe(winnerR2);       // Vencedor R2
  });
});
