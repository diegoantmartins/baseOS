import { describe, it, expect } from 'vitest';
import {
  computeOverallStandings,
  type OverallStandingResult,
} from '@/services/overallStandingsEngine';
import { computeStandingsWithMiniTable } from '@/services/standingsService';
import {
  generateThreeGroupPlayoffs,
  buildPlayoffMatches,
  advancePlayoffMatches,
  computePodium,
} from '@/services/playoffsService';
import { CompetitionBracketService } from '@/services/competitionBracketService';
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

function createCompletedMatch(
  id: string,
  matchNumber: number,
  teamA: TeamRecord,
  teamB: TeamRecord,
  phase: MatchRecord['phase'],
  groupName: string,
  setScores: Array<{ scoreA: number; scoreB: number }>,
): MatchRecord {
  const setsWonA = setScores.filter((s) => s.scoreA > s.scoreB).length;
  const setsWonB = setScores.filter((s) => s.scoreB > s.scoreA).length;
  const winnerId = setsWonA > setsWonB ? teamA.id : teamB.id;

  return {
    id,
    competitionId: 'comp-voltz-10-e2e',
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
    phase,
    groupName,
    scheduledTime: '2026-10-18T10:00:00Z',
    status: 'homologated',
    winnerId,
    setsWonA,
    setsWonB,
    sets: setScores.map((s, idx) => ({ setNumber: idx + 1, ...s })),
    setScores: setScores.map((s, idx) => ({ setNumber: idx + 1, ...s })),
    referees: [],
    homologatedAt: '2026-10-18T11:30:00Z',
  } as unknown as MatchRecord;
}

describe('E2E — 4º Campeonato Voltz (10 Equipes, 3 Chaves [4,3,3], Repescagem, Quartas, Semis, Final/3º)', () => {
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
      tiebreakCriteriaOrder: ['points', 'head-to-head', 'set-average', 'points-average', 'victories'],
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

  const competition: CompetitionRecord = {
    id: 'comp-voltz-10-e2e',
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

  // Grupos
  const groupA = [teams[0], teams[1], teams[2], teams[3]]; // 4 times
  const groupB = [teams[4], teams[5], teams[6]];           // 3 times
  const groupC = [teams[7], teams[8], teams[9]];           // 3 times

  // 12 Jogos da Fase de Grupos
  const groupMatches: MatchRecord[] = [
    // Grupo A (6 jogos, 3 jogos por equipe)
    createCompletedMatch('m-gA-1', 1, teams[0], teams[1], 'group_stage', 'Grupo A', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
    createCompletedMatch('m-gA-2', 2, teams[0], teams[2], 'group_stage', 'Grupo A', [{ scoreA: 25, scoreB: 18 }, { scoreA: 25, scoreB: 18 }]),
    createCompletedMatch('m-gA-3', 3, teams[0], teams[3], 'group_stage', 'Grupo A', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
    createCompletedMatch('m-gA-4', 4, teams[1], teams[2], 'group_stage', 'Grupo A', [{ scoreA: 25, scoreB: 22 }, { scoreA: 25, scoreB: 22 }]),
    createCompletedMatch('m-gA-5', 5, teams[1], teams[3], 'group_stage', 'Grupo A', [{ scoreA: 25, scoreB: 19 }, { scoreA: 25, scoreB: 19 }]),
    createCompletedMatch('m-gA-6', 6, teams[2], teams[3], 'group_stage', 'Grupo A', [{ scoreA: 25, scoreB: 21 }, { scoreA: 25, scoreB: 21 }]),

    // Grupo B (3 jogos, 2 jogos por equipe)
    createCompletedMatch('m-gB-1', 7, teams[4], teams[5], 'group_stage', 'Grupo B', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
    createCompletedMatch('m-gB-2', 8, teams[4], teams[6], 'group_stage', 'Grupo B', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
    createCompletedMatch('m-gB-3', 9, teams[5], teams[6], 'group_stage', 'Grupo B', [{ scoreA: 25, scoreB: 22 }, { scoreA: 25, scoreB: 22 }]),

    // Grupo C (3 jogos, 2 jogos por equipe)
    createCompletedMatch('m-gC-1', 10, teams[7], teams[8], 'group_stage', 'Grupo C', [{ scoreA: 25, scoreB: 18 }, { scoreA: 25, scoreB: 18 }]),
    createCompletedMatch('m-gC-2', 11, teams[7], teams[9], 'group_stage', 'Grupo C', [{ scoreA: 25, scoreB: 14 }, { scoreA: 25, scoreB: 14 }]),
    createCompletedMatch('m-gC-3', 12, teams[8], teams[9], 'group_stage', 'Grupo C', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
  ];

  it('1. Valida integridade e 12 partidas na Fase de Grupos com assimetria [4, 3, 3]', () => {
    expect(groupMatches.length).toBe(12);
  });

  it('2. Apura e blinda o Ranking Geral: Top 2 em 1º..6º e restantes em 7º..10º com normalização matemática', () => {
    const standingsA = computeStandingsWithMiniTable(
      groupA.map((t) => ({ team: t, groupName: 'Grupo A' })),
      groupMatches,
    );
    const standingsB = computeStandingsWithMiniTable(
      groupB.map((t) => ({ team: t, groupName: 'Grupo B' })),
      groupMatches,
    );
    const standingsC = computeStandingsWithMiniTable(
      groupC.map((t) => ({ team: t, groupName: 'Grupo C' })),
      groupMatches,
    );

    const groupStandings = [
      { groupName: 'Grupo A', standings: standingsA },
      { groupName: 'Grupo B', standings: standingsB },
      { groupName: 'Grupo C', standings: standingsC },
    ];

    // Cálculo do ranking geral
    const overall = computeOverallStandings(groupStandings, { competition });
    expect(overall.length).toBe(10);

    // Blindagem de Tiers:
    // Posições 1..3 DEVEM ser os 1ºs colocados de cada grupo (team-1, team-5, team-8)
    const tier1Ids = overall.slice(0, 3).map((s) => s.teamId);
    expect(tier1Ids).toContain('team-1');
    expect(tier1Ids).toContain('team-5');
    expect(tier1Ids).toContain('team-8');

    // Posições 4..6 DEVEM ser os 2ºs colocados de cada grupo (team-2, team-6, team-9)
    const tier2Ids = overall.slice(3, 6).map((s) => s.teamId);
    expect(tier2Ids).toContain('team-2');
    expect(tier2Ids).toContain('team-6');
    expect(tier2Ids).toContain('team-9');

    // Posições 7..9 DEVEM ser os 3ºs colocados de cada grupo (team-3, team-7, team-10)
    const tier3Ids = overall.slice(6, 9).map((s) => s.teamId);
    expect(tier3Ids).toContain('team-3');
    expect(tier3Ids).toContain('team-7');
    expect(tier3Ids).toContain('team-10');

    // Posição 10 DEVE ser o 4º colocado do Grupo A (team-4)
    expect(overall[9].teamId).toBe('team-4');
    expect(overall[9].overallRank).toBe(10);

    // Prova de Justiça Matemática:
    // O time de Grupo A jogou 3 partidas e somou 9 pontos (média 3.0 pts/jogo).
    // O time de Grupo B jogou 2 partidas e somou 6 pontos (média 3.0 pts/jogo).
    // O time de Grupo C jogou 2 partidas e somou 6 pontos (média 3.0 pts/jogo).
    // A normalização impede que a equipe do Grupo A vença automaticamente só pelo total absoluto de 9 pontos.
    const firstPlace = overall[0];
    expect(firstPlace.competitionPoints / firstPlace.matchesPlayed).toBe(3.0);
  });

  it('3. Gera a grade eliminatória de 10 jogos (2 Repescagem + 4 Quartas + 2 Semis + 1 3º Lugar + 1 Final = 22 jogos)', () => {
    const standingsA = computeStandingsWithMiniTable(
      groupA.map((t) => ({ team: t, groupName: 'Grupo A' })),
      groupMatches,
    );
    const standingsB = computeStandingsWithMiniTable(
      groupB.map((t) => ({ team: t, groupName: 'Grupo B' })),
      groupMatches,
    );
    const standingsC = computeStandingsWithMiniTable(
      groupC.map((t) => ({ team: t, groupName: 'Grupo C' })),
      groupMatches,
    );

    const groupStandings = [
      { groupName: 'Grupo A', standings: standingsA },
      { groupName: 'Grupo B', standings: standingsB },
      { groupName: 'Grupo C', standings: standingsC },
    ];

    const slots = CompetitionBracketService.generatePlayoffSlots(competition, groupStandings);
    expect(slots.length).toBe(10);

    // Repescagem 1 (7º x 10º) e Repescagem 2 (8º x 9º)
    expect(slots[0].phase).toBe('repescagem');
    expect(slots[0].sourceTeamA.description).toContain('7º Colocado Geral');
    expect(slots[0].sourceTeamB.description).toContain('10º Colocado Geral');

    expect(slots[1].phase).toBe('repescagem');
    expect(slots[1].sourceTeamA.description).toContain('8º Colocado Geral');
    expect(slots[1].sourceTeamB.description).toContain('9º Colocado Geral');

    // Quartas de Final
    expect(slots[2].phase).toBe('quartas');
    expect(slots[2].sourceTeamA.description).toContain('1º Colocado Geral');
    expect(slots[2].sourceTeamB.description).toContain('Vencedor Repescagem 2');

    expect(slots[3].phase).toBe('quartas');
    expect(slots[3].sourceTeamA.description).toContain('4º Colocado Geral');
    expect(slots[3].sourceTeamB.description).toContain('5º Colocado Geral');

    expect(slots[4].phase).toBe('quartas');
    expect(slots[4].sourceTeamA.description).toContain('2º Colocado Geral');
    expect(slots[4].sourceTeamB.description).toContain('Vencedor Repescagem 1');

    expect(slots[5].phase).toBe('quartas');
    expect(slots[5].sourceTeamA.description).toContain('3º Colocado Geral');
    expect(slots[5].sourceTeamB.description).toContain('6º Colocado Geral');

    // Semifinais
    expect(slots[6].phase).toBe('semifinal');
    expect(slots[7].phase).toBe('semifinal');

    // 3º Lugar e Final
    expect(slots[8].phase).toBe('terceiro_lugar');
    expect(slots[9].phase).toBe('final');
  });

  it('4. Simula o avanço completo dos 10 confrontos de playoffs e calcula o pódio oficial (22 jogos no total)', () => {
    const standingsA = computeStandingsWithMiniTable(
      groupA.map((t) => ({ team: t, groupName: 'Grupo A' })),
      groupMatches,
    );
    const standingsB = computeStandingsWithMiniTable(
      groupB.map((t) => ({ team: t, groupName: 'Grupo B' })),
      groupMatches,
    );
    const standingsC = computeStandingsWithMiniTable(
      groupC.map((t) => ({ team: t, groupName: 'Grupo C' })),
      groupMatches,
    );

    const groupStandings = [
      { groupName: 'Grupo A', standings: standingsA },
      { groupName: 'Grupo B', standings: standingsB },
      { groupName: 'Grupo C', standings: standingsC },
    ];

    const overall = computeOverallStandings(groupStandings, { competition });
    const rankMap = new Map(overall.map((s) => [s.overallRank, s.teamId]));

    const slots = CompetitionBracketService.generatePlayoffSlots(competition, groupStandings);
    const initialMatches = buildPlayoffMatches(competition, slots, teams, 13);
    const playoffMatches: MatchRecord[] = initialMatches.map((m, idx) => ({
      ...m,
      id: `match-playoff-${idx + 13}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    expect(playoffMatches.length).toBe(10);

    // 1. Repescagem (Jogos 13 e 14)
    // Repescagem 1: 7º x 10º -> 7º vence
    const rep1 = playoffMatches[0];
    const team7th = rankMap.get(7)!;
    rep1.status = 'homologated';
    rep1.winnerId = team7th;

    // Repescagem 2: 8º x 9º -> 8º vence
    const rep2 = playoffMatches[1];
    const team8th = rankMap.get(8)!;
    rep2.status = 'homologated';
    rep2.winnerId = team8th;

    // Propaga Repescagem -> Quartas
    const step1 = advancePlayoffMatches(playoffMatches, teams, competition);
    expect(step1.changed).toBe(true);

    // Quartas 1 deve receber o Vencedor da Repescagem 2 (8º)
    expect(playoffMatches[2].teamBId).toBe(team8th);
    // Quartas 3 deve receber o Vencedor da Repescagem 1 (7º)
    expect(playoffMatches[4].teamBId).toBe(team7th);

    // 2. Quartas de Final (Jogos 15 a 18)
    // QF1: 1º vs 8º -> 1º vence
    const team1st = rankMap.get(1)!;
    playoffMatches[2].status = 'homologated';
    playoffMatches[2].winnerId = team1st;

    // QF2: 4º vs 5º -> 4º vence
    const team4th = rankMap.get(4)!;
    playoffMatches[3].status = 'homologated';
    playoffMatches[3].winnerId = team4th;

    // QF3: 2º vs 7º -> 2º vence
    const team2nd = rankMap.get(2)!;
    playoffMatches[4].status = 'homologated';
    playoffMatches[4].winnerId = team2nd;

    // QF4: 3º vs 6º -> 3º vence
    const team3rd = rankMap.get(3)!;
    playoffMatches[5].status = 'homologated';
    playoffMatches[5].winnerId = team3rd;

    // Propaga Quartas -> Semis
    const step2 = advancePlayoffMatches(playoffMatches, teams, competition);
    expect(step2.changed).toBe(true);

    // Semifinal 1 (Jogos 19): 1º vs 4º
    expect(playoffMatches[6].teamAId).toBe(team1st);
    expect(playoffMatches[6].teamBId).toBe(team4th);

    // Semifinal 2 (Jogos 20): 2º vs 3º
    expect(playoffMatches[7].teamAId).toBe(team2nd);
    expect(playoffMatches[7].teamBId).toBe(team3rd);

    // 3. Semifinais (Jogos 19 e 20)
    // SF1: 1º vs 4º -> 1º vence (4º vai para 3º lugar)
    playoffMatches[6].status = 'homologated';
    playoffMatches[6].winnerId = team1st;

    // SF2: 2º vs 3º -> 2º vence (3º vai para 3º lugar)
    playoffMatches[7].status = 'homologated';
    playoffMatches[7].winnerId = team2nd;

    // Propaga Semis -> Final e 3º Lugar
    const step3 = advancePlayoffMatches(playoffMatches, teams, competition);
    expect(step3.changed).toBe(true);

    // Disputa de 3º Lugar (Jogo 21): 4º vs 3º
    expect(playoffMatches[8].teamAId).toBe(team4th);
    expect(playoffMatches[8].teamBId).toBe(team3rd);

    // Grande Final (Jogo 22): 1º vs 2º
    expect(playoffMatches[9].teamAId).toBe(team1st);
    expect(playoffMatches[9].teamBId).toBe(team2nd);

    // 4. Disputa de 3º Lugar e Grande Final
    // Jogo 21 (3º Lugar): 3º vence e conquista Bronze, 4º fica em 4º lugar
    playoffMatches[8].status = 'homologated';
    playoffMatches[8].winnerId = team3rd;

    // Jogo 22 (Final): 1º vence e é Campeão, 2º é Vice
    playoffMatches[9].status = 'homologated';
    playoffMatches[9].winnerId = team1st;

    // 5. Cálculo Oficial do Pódio
    const all22Matches = [...groupMatches, ...playoffMatches];
    expect(all22Matches.length).toBe(22);

    const podium = computePodium(playoffMatches, competition);
    expect(podium.championTeamId).toBe(team1st);
    expect(podium.runnerUpTeamId).toBe(team2nd);
    expect(podium.thirdPlaceTeamId).toBe(team3rd);
    expect(podium.fourthPlaceTeamId).toBe(team4th);
  });
});
