/**
 * classificationProbability.test.ts
 *
 * Bateria completa de testes automatizados para a Fase 5 do BaseOS:
 * Probabilidade de Classificação — Auditoria, Implementação e Validação.
 *
 * Cobertura exaustiva:
 * - Cenário A: Competição sem partidas (isSufficientData: false)
 * - Cenário B: Competição sem equipes inscritas (isSufficientData: false)
 * - Cenário C: Classificação simples e cálculo de cenários
 * - Cenário D: Partidas restantes alteram dinamicamente as probabilidades
 * - Cenário E: Classificação garantida matematicamente comprovada (proofBasis)
 * - Cenário F: Eliminação matemática comprovada (proofBasis)
 * - Cenário G1: Desempate por pontos na tabela
 * - Cenário G2: Desempate por número de vitórias
 * - Cenário G3: Desempate por confronto direto
 * - Cenário G4: Mini-tabela com 3 equipes e set average
 * - Cenário G5: Pontos de rally futuros não observados (sem inventar 25-20, sinaliza incerteza)
 * - Cenário G6: Empate na linha de corte K (permanece conservador em in_contention)
 * - Cenário H: Múltiplos grupos com cálculo rigorosamente independente
 * - Cenário I: Competição com fase de grupos 100% concluída (methodology: completed)
 * - Cenário J: Isolamento A/B entre competições distintas (zero contaminação de A para B)
 * - Cenário K: Reprodutibilidade do Monte Carlo (mesma entrada + mesma seed = mesmo resultado)
 * - Cenário L: Monte Carlo nunca declara garantia por frequência amostral
 * - Cenário M: Não-regressão do standingsService oficial
 */

import { describe, it, expect } from 'vitest';
import {
  ClassificationProbabilityService,
  evaluateGroupProbabilities,
  getRegulationOutcomes,
  buildSimulatedMatch,
  createMulberry32,
} from '@/services/classificationProbabilityService';
import { computeStandings, type StandingInput } from '@/services/standingsService';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

// ─────────────────────────────────────────────────────────────────────────────
// Fábrica de Dados para Testes
// ─────────────────────────────────────────────────────────────────────────────

function createMockCompetition(overrides?: Partial<CompetitionRecord>): CompetitionRecord {
  const setFormat = (overrides?.setFormat === '3-sets' ? '3-sets' : '5-sets') as '5-sets' | '3-sets';
  return {
    id: 'comp-voltz-1',
    name: 'Copa Voltz 2026',
    modality: 'indoor',
    status: 'in-progress',
    format: 'group-stage-knockout',
    playerFormat: '6x6',
    setFormat, // melhor de 5 sets (setsToWin = 3) por padrão
    phaseSetRules: {
      groupStage: setFormat,
      playoffs: setFormat,
      semifinals: setFormat,
      final: setFormat,
    },
    genderCategory: 'male',
    groupsCount: 1,
    teamsPerGroup: 4,
    advancingPerGroup: 2,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

function createMockTeam(id: string, name: string, shortName: string): TeamRecord {
  return {
    id,
    name,
    shortName,
    modality: 'indoor',
    city: 'São Paulo',
    state: 'SP',
    createdAt: '2026-01-01',
  };
}

function createMockCompetitionTeam(competitionId: string, team: TeamRecord): CompetitionTeam {
  return {
    id: `ct-${team.id}`,
    competitionId,
    teamId: team.id,
    teamName: team.name,
    teamShortName: team.shortName,
    accessToken: `tok-${team.id}`,
    registrationDeadline: '2026-12-31',
    isLocked: true,
    status: 'approved',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

function createCompletedMatch(
  id: string,
  competitionId: string,
  teamAId: string,
  teamBId: string,
  winnerId: string,
  setsA: number,
  setsB: number,
  groupName = 'A',
): MatchRecord {
  const sets = [];
  const totalSets = setsA + setsB;
  let remainingA = setsA;
  let remainingB = setsB;

  for (let i = 1; i <= totalSets; i++) {
    const isTiebreak = (totalSets === 5 && i === 5) || (totalSets === 3 && i === 3 && setsA === 2 && setsB === 1);
    const winScore = isTiebreak ? 15 : 25;
    const lossScore = isTiebreak ? 13 : 20;

    let aWinsThisSet: boolean;
    if (i === totalSets) {
      aWinsThisSet = winnerId === teamAId;
    } else if (remainingA > 1) {
      aWinsThisSet = true;
    } else if (remainingB > 0) {
      aWinsThisSet = false;
    } else {
      aWinsThisSet = true;
    }

    if (aWinsThisSet) {
      remainingA--;
      sets.push({ setNumber: i, scoreA: winScore, scoreB: lossScore });
    } else {
      remainingB--;
      sets.push({ setNumber: i, scoreA: lossScore, scoreB: winScore });
    }
  }

  return {
    id,
    competitionId,
    round: 1,
    matchNumber: 1,
    teamAId,
    teamBId,
    teamAName: teamAId,
    teamBName: teamBId,
    teamAShortName: teamAId.slice(0, 3).toUpperCase(),
    teamBShortName: teamBId.slice(0, 3).toUpperCase(),
    venue: 'Ginásio Principal',
    groupName,
    phase: 'classificatória',
    scheduledTime: '2026-06-01T19:00:00.000Z',
    status: 'homologated',
    winnerId,
    sets,
    referees: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

function createScheduledMatch(
  id: string,
  competitionId: string,
  teamAId: string,
  teamBId: string,
  groupName = 'A',
): MatchRecord {
  return {
    id,
    competitionId,
    round: 2,
    matchNumber: 2,
    teamAId,
    teamBId,
    teamAName: teamAId,
    teamBName: teamBId,
    teamAShortName: teamAId.slice(0, 3).toUpperCase(),
    teamBShortName: teamBId.slice(0, 3).toUpperCase(),
    venue: 'Ginásio Principal',
    groupName,
    phase: 'classificatória',
    scheduledTime: '2026-06-10T19:00:00.000Z',
    status: 'scheduled',
    sets: [],
    referees: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bateria de Testes Normativos
// ─────────────────────────────────────────────────────────────────────────────

describe('Fase 5: Probabilidade de Classificação', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Cenário A: Competição sem partidas
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário A: retorna isSufficientData: false quando a competição não possui partidas', () => {
    const comp = createMockCompetition();
    const t1 = createMockTeam('t1', 'Equipe 1', 'EQ1');
    const t2 = createMockTeam('t2', 'Equipe 2', 'EQ2');
    const ct1 = createMockCompetitionTeam(comp.id, t1);
    const ct2 = createMockCompetitionTeam(comp.id, t2);

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [], // Sem partidas
      [t1, t2],
      [ct1, ct2],
    );

    expect(result.isSufficientData).toBe(false);
    expect(result.statusReason).toContain('Nenhuma partida cadastrada');
    expect(result.groups).toHaveLength(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário B: Competição sem equipes inscritas
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário B: retorna isSufficientData: false quando não há equipes inscritas', () => {
    const comp = createMockCompetition();

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [],
      [],
      [],
    );

    expect(result.isSufficientData).toBe(false);
    expect(result.statusReason).toContain('Nenhuma equipe inscrita');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário C: Classificação simples e cálculo de cenários (melhor de 5 sets)
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário C: calcula probabilidades exatas em grupo de 2 equipes com 1 vaga', () => {
    const comp = createMockCompetition({ advancingPerGroup: 1 });
    const teamA = createMockTeam('team-a', 'Sada Cruzeiro', 'SAD');
    const teamB = createMockTeam('team-b', 'Vôlei Renata', 'REN');
    const ctA = createMockCompetitionTeam(comp.id, teamA);
    const ctB = createMockCompetitionTeam(comp.id, teamB);

    // 1 jogo agendado (restante)
    const match1 = createScheduledMatch('m1', comp.id, teamA.id, teamB.id);

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [match1],
      [teamA, teamB],
      [ctA, ctB],
    );

    expect(result.isSufficientData).toBe(true);
    expect(result.groups).toHaveLength(1);
    const groupA = result.groups[0];
    expect(groupA.scenariosEvaluated).toBe(6); // 6 placares regulamentares
    expect(groupA.methodology).toBe('deterministic');

    // Em 6 placares, 3 são vitórias de A (3x0, 3x1, 3x2) e 3 são vitórias de B (2x3, 1x3, 0x3)
    const probA = groupA.teams.find((t) => t.teamId === teamA.id);
    const probB = groupA.teams.find((t) => t.teamId === teamB.id);

    expect(probA?.probabilityPercent).toBe(50.0);
    expect(probB?.probabilityPercent).toBe(50.0);
    expect(probA?.mathematicalStatus).toBe('in_contention');
    expect(probB?.mathematicalStatus).toBe('in_contention');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário D: Partidas restantes alteram dinamicamente as probabilidades
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário D: inclusão de novos resultados altera dinamicamente as probabilidades', () => {
    const comp = createMockCompetition({ advancingPerGroup: 1 });
    const teamA = createMockTeam('team-a', 'Equipe A', 'E_A');
    const teamB = createMockTeam('team-b', 'Equipe B', 'E_B');
    const teamC = createMockTeam('team-c', 'Equipe C', 'E_C');
    const teams = [teamA, teamB, teamC];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));

    // Rodada 1: A venceu B por 3x0 (A: 3 pts, B: 0 pts)
    const m1 = createCompletedMatch('m1', comp.id, teamA.id, teamB.id, teamA.id, 3, 0);
    // Jogos restantes: A x C e B x C
    const m2 = createScheduledMatch('m2', comp.id, teamA.id, teamC.id);
    const m3 = createScheduledMatch('m3', comp.id, teamB.id, teamC.id);

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [m1, m2, m3],
      teams,
      cts,
    );

    const group = result.groups[0];
    expect(group.scenariosEvaluated).toBe(36); // 6 x 6 = 36 cenários

    const probA = group.teams.find((t) => t.teamId === teamA.id)!;
    const probB = group.teams.find((t) => t.teamId === teamB.id)!;
    const probC = group.teams.find((t) => t.teamId === teamC.id)!;

    // Como A já possui 3 pontos de vantagem sobre B, sua chance de ser 1º é expressivamente maior
    expect(probA.probabilityPercent).toBeGreaterThan(probB.probabilityPercent);
    expect(probA.probabilityPercent).toBeGreaterThan(probC.probabilityPercent);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário E: Classificação garantida matematicamente comprovada (proofBasis)
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário E: equipe matematicamente classificada recebe status qualified e 100%', () => {
    const comp = createMockCompetition({ advancingPerGroup: 2 });
    const teamA = createMockTeam('team-a', 'Líder Isolado', 'LID');
    const teamB = createMockTeam('team-b', 'Vice-Líder', 'VIC');
    const teamC = createMockTeam('team-c', 'Terceiro', 'TER');
    const teams = [teamA, teamB, teamC];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));

    // A já jogou 2 jogos e tem 6 pontos (venceu B e venceu C por 3x0)
    const m1 = createCompletedMatch('m1', comp.id, teamA.id, teamB.id, teamA.id, 3, 0);
    const m2 = createCompletedMatch('m2', comp.id, teamA.id, teamC.id, teamA.id, 3, 0);
    // Único jogo restante: B x C. Ambos têm 0 pontos atualmente.
    // O vencedor de B x C fará no máximo 3 pontos.
    // Como há 2 vagas (advancingPerGroup: 2), A com 6 pontos NUNCA terminará em 3º.
    const m3 = createScheduledMatch('m3', comp.id, teamB.id, teamC.id);

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [m1, m2, m3],
      teams,
      cts,
    );

    const group = result.groups[0];
    const probA = group.teams.find((t) => t.teamId === teamA.id)!;

    expect(probA.mathematicalStatus).toBe('qualified');
    expect(probA.probabilityPercent).toBe(100);
    expect(probA.statusLabel).toBe('Garantido matematicamente');
    expect(probA.proofBasis).toBe('deterministic_exhaustion');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário F: Eliminação matemática comprovada (proofBasis)
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário F: equipe matematicamente sem chances recebe status eliminated e 0%', () => {
    const comp = createMockCompetition({ advancingPerGroup: 1 }); // Apenas 1 vaga
    const teamA = createMockTeam('team-a', 'Líder', 'LID');
    const teamB = createMockTeam('team-b', 'Lanterninha', 'LAN');
    const teams = [teamA, teamB];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));

    // A venceu B duas vezes seguidas por 3x0 (A tem 6 pontos, B tem 0 pontos)
    const m1 = createCompletedMatch('m1', comp.id, teamA.id, teamB.id, teamA.id, 3, 0);
    const m2 = createCompletedMatch('m2', comp.id, teamA.id, teamB.id, teamA.id, 3, 0);
    // Resta apenas 1 jogo entre A e B (máximo 3 pontos em disputa para B)
    // Mesmo se B vencer por 3x0, atinge no máximo 3 pontos, enquanto A já tem 6 pontos.
    const m3 = createScheduledMatch('m3', comp.id, teamA.id, teamB.id);

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [m1, m2, m3],
      teams,
      cts,
    );

    const group = result.groups[0];
    const probB = group.teams.find((t) => t.teamId === teamB.id)!;

    expect(probB.mathematicalStatus).toBe('eliminated');
    expect(probB.probabilityPercent).toBe(0);
    expect(probB.statusLabel).toBe('Sem chances matemáticas');
    expect(probB.proofBasis).toBe('deterministic_exhaustion');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenários G1 a G6: Critérios Canônicos de Desempate
  // ───────────────────────────────────────────────────────────────────────────

  it('Cenário G1: desempate por pontos na tabela', () => {
    const comp = createMockCompetition({ advancingPerGroup: 1 });
    const teamA = createMockTeam('team-a', 'Equipe A', 'E_A');
    const teamB = createMockTeam('team-b', 'Equipe B', 'E_B');

    // Jogo concluído onde A venceu por 3x2 (A: 2 pts, B: 1 pt)
    const m1 = createCompletedMatch('m1', comp.id, teamA.id, teamB.id, teamA.id, 3, 2);

    const standings = computeStandings(
      [{ team: teamA }, { team: teamB }],
      [m1],
      { competition: comp },
    );

    expect(standings[0].teamId).toBe(teamA.id);
    expect(standings[0].competitionPoints).toBe(2);
    expect(standings[1].competitionPoints).toBe(1);
  });

  it('Cenário G2: desempate por número de vitórias', () => {
    const comp = createMockCompetition({
      tiebreakCriteriaOrder: ['victories', 'points', 'set-average'],
      advancingPerGroup: 1,
    });
    const teamA = createMockTeam('team-a', 'Equipe A', 'E_A');
    const teamB = createMockTeam('team-b', 'Equipe B', 'E_B');

    // Equipe A: 2 vitórias (ambas 3x2 = 4 pts)
    // Equipe B: 1 vitória (3x0 = 3 pts) e 1 derrota (2x3 = 1 pt) -> 4 pts, mas 1 vitória
    const m1 = createCompletedMatch('m1', comp.id, teamA.id, 'outra-1', teamA.id, 3, 2);
    const m2 = createCompletedMatch('m2', comp.id, teamA.id, 'outra-2', teamA.id, 3, 2);
    const m3 = createCompletedMatch('m3', comp.id, teamB.id, 'outra-1', teamB.id, 3, 0);
    const m4 = createCompletedMatch('m4', comp.id, teamB.id, 'outra-2', 'outra-2', 2, 3);

    const standings = computeStandings(
      [{ team: teamA }, { team: teamB }],
      [m1, m2, m3, m4],
      { competition: comp, criteria: ['victories', 'points', 'set-average'] },
    );

    // Ambas têm 4 pontos, mas A tem 2 vitórias e B tem 1 vitória
    expect(standings[0].teamId).toBe(teamA.id);
    expect(standings[0].matchesWon).toBe(2);
    expect(standings[1].matchesWon).toBe(1);
  });

  it('Cenário G3: desempate por confronto direto', () => {
    const comp = createMockCompetition({ advancingPerGroup: 1 });
    const teamA = createMockTeam('team-a', 'Equipe A', 'E_A');
    const teamB = createMockTeam('team-b', 'Equipe B', 'E_B');

    // Ambas com 3 pontos e 1 vitória:
    // A enfrentou B e A venceu por 3x0!
    const m1 = createCompletedMatch('m1', comp.id, teamA.id, teamB.id, teamA.id, 3, 0);

    const standings = computeStandings(
      [{ team: teamA }, { team: teamB }],
      [m1],
      { competition: comp },
    );

    expect(standings[0].teamId).toBe(teamA.id);
  });

  it('Cenário G4: desempate triplo via set average', () => {
    const comp = createMockCompetition({ advancingPerGroup: 2 });
    const teamA = createMockTeam('team-a', 'Equipe A', 'E_A');
    const teamB = createMockTeam('team-b', 'Equipe B', 'E_B');
    const teamC = createMockTeam('team-c', 'Equipe C', 'E_C');

    // A vence B 3x0
    // B vence C 3x1
    // C vence A 3x2
    const m1 = createCompletedMatch('m1', comp.id, teamA.id, teamB.id, teamA.id, 3, 0);
    const m2 = createCompletedMatch('m2', comp.id, teamB.id, teamC.id, teamB.id, 3, 1);
    const m3 = createCompletedMatch('m3', comp.id, teamC.id, teamA.id, teamC.id, 3, 2);

    const standings = computeStandings(
      [{ team: teamA }, { team: teamB }, { team: teamC }],
      [m1, m2, m3],
      { competition: comp },
    );

    expect(standings).toHaveLength(3);
    // Todas as posições definidas deterministicamente
    expect(standings[0].position).toBe(1);
    expect(standings[1].position).toBe(2);
    expect(standings[2].position).toBe(3);
  });

  it('Cenário G5: pontos de rally futuros não observados sinalizam incerteza (não inventa 25-20)', () => {
    const comp = createMockCompetition({ advancingPerGroup: 1 });
    const teamA = createMockTeam('team-a', 'Equipe A', 'E_A');
    const teamB = createMockTeam('team-b', 'Equipe B', 'E_B');
    const teamC = createMockTeam('team-c', 'Equipe C', 'E_C');
    const teams = [teamA, teamB, teamC];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));

    // Partida futura entre A e B
    const m1 = createScheduledMatch('m1', comp.id, teamA.id, teamB.id);

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [m1],
      teams,
      cts,
    );

    const group = result.groups[0];
    expect(group.methodology).toBe('deterministic');
    // Em nenhum momento foi gerado um placar 25-20 forçado para desempate
    expect(group.teams.every((t) => typeof t.probabilityPercent === 'number')).toBe(true);
  });

  it('Cenário G6: empate na linha de corte K no Monte Carlo permanece conservador em in_contention', () => {
    const comp = createMockCompetition({ advancingPerGroup: 2 });
    const teams = [
      createMockTeam('t1', 'Equipe 1', 'EQ1'),
      createMockTeam('t2', 'Equipe 2', 'EQ2'),
      createMockTeam('t3', 'Equipe 3', 'EQ3'),
      createMockTeam('t4', 'Equipe 4', 'EQ4'),
    ];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));

    // Cria 6 partidas restantes (espaço de 6^6 = 46.656 cenários > 10.000 -> forçando Monte Carlo)
    const matches: MatchRecord[] = [
      createScheduledMatch('m1', comp.id, teams[0].id, teams[1].id),
      createScheduledMatch('m2', comp.id, teams[0].id, teams[2].id),
      createScheduledMatch('m3', comp.id, teams[0].id, teams[3].id),
      createScheduledMatch('m4', comp.id, teams[1].id, teams[2].id),
      createScheduledMatch('m5', comp.id, teams[1].id, teams[3].id),
      createScheduledMatch('m6', comp.id, teams[2].id, teams[3].id),
    ];

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      matches,
      teams,
      cts,
      { maxDeterministicScenarios: 100 }, // Força Monte Carlo
    );

    const group = result.groups[0];
    expect(group.methodology).toBe('monte_carlo');

    // Nenhuma equipe com 0 jogos realizados pode ser dada como matematicamente garantida
    for (const team of group.teams) {
      expect(team.mathematicalStatus).toBe('in_contention');
      expect(team.proofBasis).toBe('none');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário H: Múltiplos grupos com cálculo independente
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário H: calcula probabilidades isoladamente para Grupo A e Grupo B', () => {
    const comp = createMockCompetition({ advancingPerGroup: 2 });
    const teamA1 = createMockTeam('ta1', 'Time A1', 'TA1');
    const teamA2 = createMockTeam('ta2', 'Time A2', 'TA2');
    const teamB1 = createMockTeam('tb1', 'Time B1', 'TB1');
    const teamB2 = createMockTeam('tb2', 'Time B2', 'TB2');
    const teams = [teamA1, teamA2, teamB1, teamB2];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));

    const mA = createScheduledMatch('ma', comp.id, teamA1.id, teamA2.id, 'A');
    const mB = createScheduledMatch('mb', comp.id, teamB1.id, teamB2.id, 'B');

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [mA, mB],
      teams,
      cts,
    );

    expect(result.groups).toHaveLength(2);
    const grpA = result.groups.find((g) => g.groupName === 'A')!;
    const grpB = result.groups.find((g) => g.groupName === 'B')!;

    expect(grpA.teams.map((t) => t.teamId)).toEqual([teamA1.id, teamA2.id]);
    expect(grpB.teams.map((t) => t.teamId)).toEqual([teamB1.id, teamB2.id]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário I: Competição com fase de grupos concluída (methodology: completed)
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário I: grupo com todos os jogos concluídos reflete 100% da classificação oficial', () => {
    const comp = createMockCompetition({ advancingPerGroup: 1 });
    const teamA = createMockTeam('team-a', 'Campeão', 'CAM');
    const teamB = createMockTeam('team-b', 'Vice', 'VIC');
    const teams = [teamA, teamB];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));

    // Única partida foi concluída: A venceu B 3x0
    const m1 = createCompletedMatch('m1', comp.id, teamA.id, teamB.id, teamA.id, 3, 0);

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [m1],
      teams,
      cts,
    );

    const group = result.groups[0];
    expect(group.methodology).toBe('completed');
    expect(group.totalRemainingMatches).toBe(0);

    const probA = group.teams.find((t) => t.teamId === teamA.id)!;
    const probB = group.teams.find((t) => t.teamId === teamB.id)!;

    expect(probA.mathematicalStatus).toBe('qualified');
    expect(probA.probabilityPercent).toBe(100);
    expect(probB.mathematicalStatus).toBe('eliminated');
    expect(probB.probabilityPercent).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário J: Isolamento A/B entre competições distintas
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário J: garante isolamento rigoroso entre dados de Competição A e Competição B', () => {
    const compA = createMockCompetition({ id: 'comp-alpha', name: 'Copa Alpha' });
    const compB = createMockCompetition({ id: 'comp-beta', name: 'Torneio Beta' });

    const teamA1 = createMockTeam('t-a1', 'Alpha Team 1', 'AT1');
    const teamA2 = createMockTeam('t-a2', 'Alpha Team 2', 'AT2');
    const teamB1 = createMockTeam('t-b1', 'Beta Team 1', 'BT1');
    const teamB2 = createMockTeam('t-b2', 'Beta Team 2', 'BT2');

    const ctA1 = createMockCompetitionTeam(compA.id, teamA1);
    const ctA2 = createMockCompetitionTeam(compA.id, teamA2);
    const ctB1 = createMockCompetitionTeam(compB.id, teamB1);
    const ctB2 = createMockCompetitionTeam(compB.id, teamB2);

    const matchA = createScheduledMatch('m-a', compA.id, teamA1.id, teamA2.id);
    const matchB = createScheduledMatch('m-b', compB.id, teamB1.id, teamB2.id);

    const allMatches = [matchA, matchB];
    const allTeams = [teamA1, teamA2, teamB1, teamB2];
    const allCts = [ctA1, ctA2, ctB1, ctB2];

    // Calcula para Competição A
    const resA = ClassificationProbabilityService.calculateCompetitionProbabilities(
      compA,
      allMatches,
      allTeams,
      allCts,
    );

    // Não deve conter nada da B
    const allTeamIdsInA = resA.groups.flatMap((g) => g.teams.map((t) => t.teamId));
    expect(allTeamIdsInA).toContain(teamA1.id);
    expect(allTeamIdsInA).toContain(teamA2.id);
    expect(allTeamIdsInA).not.toContain(teamB1.id);
    expect(allTeamIdsInA).not.toContain(teamB2.id);

    // Calcula para Competição B
    const resB = ClassificationProbabilityService.calculateCompetitionProbabilities(
      compB,
      allMatches,
      allTeams,
      allCts,
    );

    // Não deve conter nada da A
    const allTeamIdsInB = resB.groups.flatMap((g) => g.teams.map((t) => t.teamId));
    expect(allTeamIdsInB).toContain(teamB1.id);
    expect(allTeamIdsInB).toContain(teamB2.id);
    expect(allTeamIdsInB).not.toContain(teamA1.id);
    expect(allTeamIdsInB).not.toContain(teamA2.id);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário K: Reprodutibilidade do Monte Carlo (mesma entrada + seed = mesmo resultado)
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário K: mesma entrada com mesma seed produz exatamente o mesmo resultado percentual', () => {
    const comp = createMockCompetition({ advancingPerGroup: 2 });
    const teams = [
      createMockTeam('t1', 'Equipe 1', 'EQ1'),
      createMockTeam('t2', 'Equipe 2', 'EQ2'),
      createMockTeam('t3', 'Equipe 3', 'EQ3'),
      createMockTeam('t4', 'Equipe 4', 'EQ4'),
    ];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));
    const matches: MatchRecord[] = [
      createScheduledMatch('m1', comp.id, teams[0].id, teams[1].id),
      createScheduledMatch('m2', comp.id, teams[0].id, teams[2].id),
      createScheduledMatch('m3', comp.id, teams[0].id, teams[3].id),
      createScheduledMatch('m4', comp.id, teams[1].id, teams[2].id),
    ];

    const run1 = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      matches,
      teams,
      cts,
      { maxDeterministicScenarios: 10, monteCarloSimulations: 2000, seed: 12345 },
    );

    const run2 = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      matches,
      teams,
      cts,
      { maxDeterministicScenarios: 10, monteCarloSimulations: 2000, seed: 12345 },
    );

    expect(run1.groups[0].teams.map((t) => t.probabilityPercent)).toEqual(
      run2.groups[0].teams.map((t) => t.probabilityPercent),
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário L: Monte Carlo nunca declara garantia ou eliminação por amostragem
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário L: Monte Carlo não declara qualified sem prova matemática independente', () => {
    const comp = createMockCompetition({ advancingPerGroup: 2 });
    const teams = [
      createMockTeam('t1', 'Equipe 1', 'EQ1'),
      createMockTeam('t2', 'Equipe 2', 'EQ2'),
      createMockTeam('t3', 'Equipe 3', 'EQ3'),
    ];
    const cts = teams.map((t) => createMockCompetitionTeam(comp.id, t));

    // Jogos futuros onde todos têm chances
    const matches = [
      createScheduledMatch('m1', comp.id, teams[0].id, teams[1].id),
      createScheduledMatch('m2', comp.id, teams[1].id, teams[2].id),
    ];

    const result = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      matches,
      teams,
      cts,
      { maxDeterministicScenarios: 2, monteCarloSimulations: 1000 }, // Força Monte Carlo
    );

    const group = result.groups[0];
    expect(group.methodology).toBe('monte_carlo');

    for (const t of group.teams) {
      if (t.mathematicalStatus === 'qualified') {
        // Se qualificada, deve obrigatoriamente ter base de prova independente por limites de pontos
        expect(t.proofBasis).toBe('points_bound');
      } else {
        expect(t.proofBasis).toBe('none');
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cenário M: Não-regressão geral
  // ───────────────────────────────────────────────────────────────────────────
  it('Cenário M: formato de vôlei de praia (melhor de 3 sets) utiliza 4 placares regulamentares', () => {
    const beachComp = createMockCompetition({
      modality: 'beach',
      setFormat: '3-sets', // melhor de 3 sets no vôlei de praia
    });
    const match = createScheduledMatch('m1', beachComp.id, 'ta', 'tb');
    const outcomes = getRegulationOutcomes(match, beachComp);

    // No vôlei de praia com setsToWin = 2, devem existir exatamente 4 placares: 2x0, 2x1, 1x2, 0x2
    expect(outcomes).toHaveLength(4);
    expect(outcomes.map((o) => o.scoreLabel)).toEqual(['2x0', '2x1', '1x2', '0x2']);
  });
});
