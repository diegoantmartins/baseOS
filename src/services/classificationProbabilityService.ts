/**
 * classificationProbabilityService.ts
 *
 * Motor Analítico Puro de Probabilidade de Classificação para o BaseOS (Fase 5).
 *
 * Princípios Matemáticos:
 * 1. Modelo de Cenários Equiprováveis baseado em todos os placares finais regulamentares
 *    (6 placares no melhor de 5: 3x0, 3x1, 3x2, 2x3, 1x3, 0x3; 4 no melhor de 3: 2x0, 2x1, 1x2, 0x2).
 * 2. Jamais inventa pontos de rally futuros (não força 25-20). Se um desempate na linha de corte K
 *    depender de dados futuros não observáveis (ex: points average), sinaliza explicitamente a
 *    incerteza (tieBreakUncertainty: true) e reparte simetricamente as frações de cenário.
 * 3. Garantia matemática ('qualified') ou eliminação ('eliminated') provada exclusivamente por:
 *    - Exaustão determinística de 100% dos cenários; OU
 *    - Limite estrito de pontos (points_bound) considerando a zona K inteira e confrontos diretos.
 * 4. Monte Carlo (10.000 iterações com Mulberry32) NUNCA declara garantia ou eliminação por
 *    frequência amostral; emite estritamente 'in_contention'.
 * 5. Determinístico e reprodutivo: mesma entrada + mesma seed = mesmo resultado.
 */

import type { CompetitionRecord, MatchRecord, TeamRecord, SetScoreRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import type {
  CompetitionProbabilityResult,
  FutureMatchOutcome,
  GroupProbabilityResult,
  MathematicalStatus,
  ProbabilityCalculationOptions,
  ProofBasis,
  TeamProbabilityResult,
} from '@/types/classificationProbability';
import { CompetitionRulesService } from './competitionRulesService';
import { computeStandings, isMatchCompleted, type StandingInput, type TeamStandingResult } from './standingsService';

// ─────────────────────────────────────────────────────────────────────────────
// Gerador Pseudo-Aleatório Determinístico (Mulberry32)
// ─────────────────────────────────────────────────────────────────────────────

export function createMulberry32(seed: number = 42) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcomess Regulamentares por Formato de Partida
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna todos os placares finais regulamentares possíveis para uma partida futura,
 * conforme o formato oficial da competição (CompetitionRulesService).
 */
export function getRegulationOutcomes(
  match: MatchRecord,
  competition: CompetitionRecord,
): FutureMatchOutcome[] {
  const formatConfig = CompetitionRulesService.resolveMatchFormat(
    competition,
    match.phase,
    match.customSetFormat,
  );
  const setsToWin = formatConfig.setsToWin;
  const outcomes: FutureMatchOutcome[] = [];

  const teamAId = match.teamAId;
  const teamBId = match.teamBId;

  if (setsToWin === 3) {
    // Melhor de 5 sets — 6 placares regulamentares
    // Vitórias da Equipe A
    outcomes.push({
      winnerId: teamAId,
      loserId: teamBId,
      setsWonByWinner: 3,
      setsWonByLoser: 0,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 3, 0),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 0, 3),
      scoreLabel: '3x0',
    });
    outcomes.push({
      winnerId: teamAId,
      loserId: teamBId,
      setsWonByWinner: 3,
      setsWonByLoser: 1,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 3, 1),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 1, 3),
      scoreLabel: '3x1',
    });
    outcomes.push({
      winnerId: teamAId,
      loserId: teamBId,
      setsWonByWinner: 3,
      setsWonByLoser: 2,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 3, 2),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 2, 3),
      scoreLabel: '3x2',
    });
    // Vitórias da Equipe B
    outcomes.push({
      winnerId: teamBId,
      loserId: teamAId,
      setsWonByWinner: 3,
      setsWonByLoser: 2,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 3, 2),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 2, 3),
      scoreLabel: '2x3',
    });
    outcomes.push({
      winnerId: teamBId,
      loserId: teamAId,
      setsWonByWinner: 3,
      setsWonByLoser: 1,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 3, 1),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 1, 3),
      scoreLabel: '1x3',
    });
    outcomes.push({
      winnerId: teamBId,
      loserId: teamAId,
      setsWonByWinner: 3,
      setsWonByLoser: 0,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 3, 0),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 0, 3),
      scoreLabel: '0x3',
    });
  } else if (setsToWin === 2) {
    // Melhor de 3 sets — 4 placares regulamentares
    outcomes.push({
      winnerId: teamAId,
      loserId: teamBId,
      setsWonByWinner: 2,
      setsWonByLoser: 0,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 2, 0),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 0, 2),
      scoreLabel: '2x0',
    });
    outcomes.push({
      winnerId: teamAId,
      loserId: teamBId,
      setsWonByWinner: 2,
      setsWonByLoser: 1,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 2, 1),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 1, 2),
      scoreLabel: '2x1',
    });
    outcomes.push({
      winnerId: teamBId,
      loserId: teamAId,
      setsWonByWinner: 2,
      setsWonByLoser: 1,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 2, 1),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 1, 2),
      scoreLabel: '1x2',
    });
    outcomes.push({
      winnerId: teamBId,
      loserId: teamAId,
      setsWonByWinner: 2,
      setsWonByLoser: 0,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 2, 0),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 0, 2),
      scoreLabel: '0x2',
    });
  } else {
    // Set único — 2 placares regulamentares
    outcomes.push({
      winnerId: teamAId,
      loserId: teamBId,
      setsWonByWinner: 1,
      setsWonByLoser: 0,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 1, 0),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 0, 1),
      scoreLabel: '1x0',
    });
    outcomes.push({
      winnerId: teamBId,
      loserId: teamAId,
      setsWonByWinner: 1,
      setsWonByLoser: 0,
      competitionPointsWinner: CompetitionRulesService.calculateCompetitionPoints(competition, 1, 0),
      competitionPointsLoser: CompetitionRulesService.calculateCompetitionPoints(competition, 0, 1),
      scoreLabel: '0x1',
    });
  }

  return outcomes;
}

/**
 * Constrói um MatchRecord simulado válido para computeStandings.
 * NÃO inventa parciais de rally (25-20). Em vez disso, gera parciais regulamentares neutras
 * onde cada set vencido pelo vencedor registra 1-0 para que a contagem de setsWon/setsLost
 * seja matematicamente exata no motor canônico.
 */
export function buildSimulatedMatch(
  baseMatch: MatchRecord,
  outcome: FutureMatchOutcome,
): MatchRecord {
  const isWinnerA = outcome.winnerId === baseMatch.teamAId;
  const sets: SetScoreRecord[] = [];

  for (let i = 0; i < outcome.setsWonByWinner; i++) {
    sets.push({
      setNumber: sets.length + 1,
      scoreA: isWinnerA ? 1 : 0,
      scoreB: isWinnerA ? 0 : 1,
    });
  }
  for (let i = 0; i < outcome.setsWonByLoser; i++) {
    sets.push({
      setNumber: sets.length + 1,
      scoreA: isWinnerA ? 0 : 1,
      scoreB: isWinnerA ? 1 : 0,
    });
  }

  return {
    ...baseMatch,
    status: 'completed',
    winnerId: outcome.winnerId,
    sets,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auditoria de Empate na Linha de Corte K (Incerteza de Desempate)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se duas equipes na linha de corte K estão rigorosamente empatadas em:
 * 1. Pontos na tabela
 * 2. Vitórias
 * 3. Sets ratio (ou saldo de sets)
 * 4. Confronto direto
 * Se sim, o desempate dependeria de pontos de rally futuros não observáveis.
 */
function checkTieBreakUncertaintyAtCutoff(
  standings: TeamStandingResult[],
  advancingCount: number,
  allMatches: MatchRecord[],
): { isUncertain: boolean; tiedTeamIds: Set<string> } {
  const tiedTeamIds = new Set<string>();
  if (standings.length <= advancingCount) {
    return { isUncertain: false, tiedTeamIds };
  }

  const teamAtCutoff = standings[advancingCount - 1]; // Último classificado atual (posição K)
  const teamOutside = standings[advancingCount];       // Primeiro não classificado (posição K+1)

  if (!teamAtCutoff || !teamOutside) {
    return { isUncertain: false, tiedTeamIds };
  }

  // Compara pontos, vitórias e sets ratio
  const pointsEqual = teamAtCutoff.competitionPoints === teamOutside.competitionPoints;
  const winsEqual = teamAtCutoff.matchesWon === teamOutside.matchesWon;
  const setsRatioEqual = Math.abs(teamAtCutoff.setsRatio - teamOutside.setsRatio) < 0.0001;

  if (pointsEqual && winsEqual && setsRatioEqual) {
    // Verifica se há vencedor de confronto direto já estabelecido
    let winsA = 0;
    let winsB = 0;
    for (const m of allMatches) {
      if (!isMatchCompleted(m)) continue;
      const involvesBoth =
        (m.teamAId === teamAtCutoff.teamId && m.teamBId === teamOutside.teamId) ||
        (m.teamAId === teamOutside.teamId && m.teamBId === teamAtCutoff.teamId);
      if (!involvesBoth) continue;
      if (m.winnerId === teamAtCutoff.teamId) winsA++;
      else if (m.winnerId === teamOutside.teamId) winsB++;
    }

    if (winsA === winsB) {
      // Rigorosamente empatados até o critério de pontos average!
      tiedTeamIds.add(teamAtCutoff.teamId);
      tiedTeamIds.add(teamOutside.teamId);
      return { isUncertain: true, tiedTeamIds };
    }
  }

  return { isUncertain: false, tiedTeamIds };
}

// ─────────────────────────────────────────────────────────────────────────────
// Avaliação de Limites Matemáticos Estritos (Points Bound Conservador)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Avalia limites conservadores sobre toda a zona de corte K.
 */
function evaluateStrictPointsBounds(
  teams: StandingInput[],
  currentStandings: TeamStandingResult[],
  remainingMatches: MatchRecord[],
  advancingCount: number,
  maxPointsPerMatch: number,
): Map<string, { isGuaranteed: boolean; isEliminated: boolean }> {
  const result = new Map<string, { isGuaranteed: boolean; isEliminated: boolean }>();

  // Contagem de partidas restantes por equipe
  const remainingCountByTeam = new Map<string, number>();
  for (const t of teams) {
    remainingCountByTeam.set(t.team.id, 0);
  }
  for (const m of remainingMatches) {
    remainingCountByTeam.set(m.teamAId, (remainingCountByTeam.get(m.teamAId) || 0) + 1);
    remainingCountByTeam.set(m.teamBId, (remainingCountByTeam.get(m.teamBId) || 0) + 1);
  }

  const standingsMap = new Map(currentStandings.map((s) => [s.teamId, s]));

  // Para cada equipe, calcula Pcurr e Pmax
  const statsByTeam = new Map<string, { pCurr: number; pMax: number; r: number }>();
  for (const t of teams) {
    const s = standingsMap.get(t.team.id);
    const pCurr = s?.competitionPoints || 0;
    const r = remainingCountByTeam.get(t.team.id) || 0;
    const pMax = pCurr + r * maxPointsPerMatch;
    statsByTeam.set(t.team.id, { pCurr, pMax, r });
  }

  for (const t of teams) {
    const myStats = statsByTeam.get(t.team.id)!;
    const myCurr = myStats.pCurr;
    const myMax = myStats.pMax;

    // Prova de Garantia (qualified):
    // Equipe T está garantida se a quantidade de equipes que podem alcançar ou superar myCurr for < advancingCount
    let teamsThatCanPassMe = 0;
    for (const other of teams) {
      if (other.team.id === t.team.id) continue;
      const otherStats = statsByTeam.get(other.team.id)!;
      // Para haver garantia estrita sem depender de desempate, myCurr deve ser ESTRITAMENTE maior que otherMax
      if (otherStats.pMax >= myCurr) {
        teamsThatCanPassMe++;
      }
    }
    const isGuaranteed = teamsThatCanPassMe < advancingCount;

    // Prova de Eliminação (eliminated):
    // Equipe T está eliminada se a quantidade de equipes cujos pontos atuais já são estritamente maiores que myMax for >= advancingCount
    let teamsAlreadyStrictlyAhead = 0;
    for (const other of teams) {
      if (other.team.id === t.team.id) continue;
      const otherStats = statsByTeam.get(other.team.id)!;
      if (otherStats.pCurr > myMax) {
        teamsAlreadyStrictlyAhead++;
      }
    }
    const isEliminated = teamsAlreadyStrictlyAhead >= advancingCount;

    result.set(t.team.id, { isGuaranteed, isEliminated });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Avaliação por Grupo
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateGroupProbabilities(
  groupName: string,
  groupTeams: StandingInput[],
  completedMatches: MatchRecord[],
  remainingMatches: MatchRecord[],
  competition: CompetitionRecord,
  options?: ProbabilityCalculationOptions,
): GroupProbabilityResult {
  const startTime = performance.now();
  const advancingCount = competition.advancingPerGroup ?? 2;
  const maxDeterministic = options?.maxDeterministicScenarios ?? 10_000;
  const monteCarloRuns = options?.monteCarloSimulations ?? 10_000;
  const seed = options?.seed ?? 42;

  // Classificação atual da competição com jogos concluídos
  const currentStandings = computeStandings(groupTeams, completedMatches, { competition });

  // Caso A: Se não houver partidas restantes, a classificação está 100% consolidada
  if (remainingMatches.length === 0) {
    const teams: TeamProbabilityResult[] = currentStandings.map((st) => {
      const isQualified = st.position <= advancingCount;
      return {
        teamId: st.teamId,
        teamName: st.teamName,
        teamShortName: st.teamShortName,
        currentPosition: st.position,
        currentPoints: st.competitionPoints,
        remainingMatchesCount: 0,
        minPossiblePoints: st.competitionPoints,
        maxPossiblePoints: st.competitionPoints,
        probabilityPercent: isQualified ? 100 : 0,
        advancingCount,
        targetPhaseDescription: `Top ${advancingCount} do Grupo ${groupName}`,
        mathematicalStatus: isQualified ? 'qualified' : 'eliminated',
        statusLabel: isQualified ? 'Garantido matematicamente' : 'Sem chances matemáticas',
        proofBasis: 'deterministic_exhaustion',
        tieBreakUncertainty: false,
        favorableScenarios: isQualified ? 1 : 0,
        totalScenarios: 1,
      };
    });

    return {
      groupName,
      advancingCount,
      totalTeams: groupTeams.length,
      totalRemainingMatches: 0,
      methodology: 'completed',
      scenariosEvaluated: 1,
      executionTimeMs: Math.round(performance.now() - startTime),
      methodologyExplanation: 'Classificação final oficial consolidada com todas as partidas concluídas.',
      tieBreakUncertaintyDetected: false,
      teams,
    };
  }

  // Prepara os cenários regulamentares por partida restante
  const matchOutcomesList = remainingMatches.map((m) => getRegulationOutcomes(m, competition));
  const outcomesCountPerMatch = matchOutcomesList.map((list) => list.length);
  const totalCombinations = outcomesCountPerMatch.reduce((acc, count) => acc * count, 1);

  // Bounds de pontos por equipe
  const maxPointsPerMatch = 3; // FIVB padrão
  const strictBounds = evaluateStrictPointsBounds(
    groupTeams,
    currentStandings,
    remainingMatches,
    advancingCount,
    maxPointsPerMatch,
  );

  const favorableCounts = new Map<string, number>();
  const tieBreakUncertaintyByTeam = new Map<string, boolean>();
  for (const t of groupTeams) {
    favorableCounts.set(t.team.id, 0);
    tieBreakUncertaintyByTeam.set(t.team.id, false);
  }

  let tieBreakUncertaintyGlobal = false;
  let methodology: 'deterministic' | 'monte_carlo' = 'deterministic';
  let scenariosEvaluated = 0;

  if (totalCombinations <= maxDeterministic) {
    // ─────────────────────────────────────────────────────────────────────────
    // Modo 1: Exaustão Determinística Completa
    // ─────────────────────────────────────────────────────────────────────────
    methodology = 'deterministic';
    scenariosEvaluated = totalCombinations;

    // Função recursiva de enumeração cartesiana
    function enumerateScenarios(matchIdx: number, currentSimulated: MatchRecord[]) {
      if (matchIdx === remainingMatches.length) {
        const fullMatchList = [...completedMatches, ...currentSimulated];
        const scenarioStandings = computeStandings(groupTeams, fullMatchList, { competition });

        const tieCheck = checkTieBreakUncertaintyAtCutoff(scenarioStandings, advancingCount, fullMatchList);
        if (tieCheck.isUncertain) {
          tieBreakUncertaintyGlobal = true;
        }

        for (const st of scenarioStandings) {
          if (tieCheck.isUncertain && tieCheck.tiedTeamIds.has(st.teamId)) {
            // Reparte simetricamente 0.5 crédito de cenário favorável
            favorableCounts.set(st.teamId, (favorableCounts.get(st.teamId) || 0) + 0.5);
            tieBreakUncertaintyByTeam.set(st.teamId, true);
          } else if (st.position <= advancingCount) {
            favorableCounts.set(st.teamId, (favorableCounts.get(st.teamId) || 0) + 1);
          }
        }
        return;
      }

      const match = remainingMatches[matchIdx];
      const outcomes = matchOutcomesList[matchIdx];
      for (const outcome of outcomes) {
        const simMatch = buildSimulatedMatch(match, outcome);
        currentSimulated.push(simMatch);
        enumerateScenarios(matchIdx + 1, currentSimulated);
        currentSimulated.pop();
      }
    }

    enumerateScenarios(0, []);
  } else {
    // ─────────────────────────────────────────────────────────────────────────
    // Modo 2: Simulação Monte Carlo Reprodutível (Mulberry32)
    // ─────────────────────────────────────────────────────────────────────────
    methodology = 'monte_carlo';
    scenariosEvaluated = monteCarloRuns;
    const prng = createMulberry32(seed);

    for (let sim = 0; sim < monteCarloRuns; sim++) {
      const simulatedMatches: MatchRecord[] = [];
      for (let i = 0; i < remainingMatches.length; i++) {
        const outcomes = matchOutcomesList[i];
        const randomIndex = Math.floor(prng() * outcomes.length);
        const chosenOutcome = outcomes[randomIndex];
        simulatedMatches.push(buildSimulatedMatch(remainingMatches[i], chosenOutcome));
      }

      const fullMatchList = [...completedMatches, ...simulatedMatches];
      const scenarioStandings = computeStandings(groupTeams, fullMatchList, { competition });

      const tieCheck = checkTieBreakUncertaintyAtCutoff(scenarioStandings, advancingCount, fullMatchList);
      if (tieCheck.isUncertain) {
        tieBreakUncertaintyGlobal = true;
      }

      for (const st of scenarioStandings) {
        if (tieCheck.isUncertain && tieCheck.tiedTeamIds.has(st.teamId)) {
          favorableCounts.set(st.teamId, (favorableCounts.get(st.teamId) || 0) + 0.5);
          tieBreakUncertaintyByTeam.set(st.teamId, true);
        } else if (st.position <= advancingCount) {
          favorableCounts.set(st.teamId, (favorableCounts.get(st.teamId) || 0) + 1);
        }
      }
    }
  }

  // Montagem do View Model por equipe
  const remainingCountByTeam = new Map<string, number>();
  for (const m of remainingMatches) {
    remainingCountByTeam.set(m.teamAId, (remainingCountByTeam.get(m.teamAId) || 0) + 1);
    remainingCountByTeam.set(m.teamBId, (remainingCountByTeam.get(m.teamBId) || 0) + 1);
  }

  const teamsResult: TeamProbabilityResult[] = currentStandings.map((st) => {
    const favorable = favorableCounts.get(st.teamId) || 0;
    const rawPercent = (favorable / scenariosEvaluated) * 100;
    const bounded = strictBounds.get(st.teamId) || { isGuaranteed: false, isEliminated: false };
    const hasTieUncertainty = tieBreakUncertaintyByTeam.get(st.teamId) || false;

    let mathStatus: MathematicalStatus = 'in_contention';
    let proofBasis: ProofBasis = 'none';
    let statusLabel = 'Em disputa';
    let finalPercent = Math.round(rawPercent * 10) / 10;

    if (methodology === 'deterministic') {
      if (favorable === scenariosEvaluated && !hasTieUncertainty) {
        mathStatus = 'qualified';
        proofBasis = 'deterministic_exhaustion';
        statusLabel = 'Garantido matematicamente';
        finalPercent = 100;
      } else if (favorable === 0) {
        mathStatus = 'eliminated';
        proofBasis = 'deterministic_exhaustion';
        statusLabel = 'Sem chances matemáticas';
        finalPercent = 0;
      } else {
        mathStatus = 'in_contention';
        proofBasis = 'none';
        statusLabel = 'Em disputa';
      }
    } else {
      // Modo Monte Carlo: garantia/eliminação SOMENTE por limite estrito comprovado
      if (bounded.isGuaranteed) {
        mathStatus = 'qualified';
        proofBasis = 'points_bound';
        statusLabel = 'Garantido matematicamente';
        finalPercent = 100;
      } else if (bounded.isEliminated) {
        mathStatus = 'eliminated';
        proofBasis = 'points_bound';
        statusLabel = 'Sem chances matemáticas';
        finalPercent = 0;
      } else {
        // Monte Carlo puro: mesmo com 10.000/10.000, se não houver prova de pontos, fica in_contention
        mathStatus = 'in_contention';
        proofBasis = 'none';
        statusLabel = 'Em disputa';
        if (finalPercent >= 99.9 && rawPercent < 100) finalPercent = 99.9;
        if (finalPercent <= 0.1 && rawPercent > 0) finalPercent = 0.1;
      }
    }

    const rCount = remainingCountByTeam.get(st.teamId) || 0;
    const minPts = st.competitionPoints;
    const maxPts = st.competitionPoints + rCount * maxPointsPerMatch;

    return {
      teamId: st.teamId,
      teamName: st.teamName,
      teamShortName: st.teamShortName,
      currentPosition: st.position,
      currentPoints: st.competitionPoints,
      remainingMatchesCount: rCount,
      minPossiblePoints: minPts,
      maxPossiblePoints: maxPts,
      probabilityPercent: finalPercent,
      advancingCount,
      targetPhaseDescription: `Top ${advancingCount} do Grupo ${groupName}`,
      mathematicalStatus: mathStatus,
      statusLabel,
      proofBasis,
      tieBreakUncertainty: hasTieUncertainty,
      favorableScenarios: Math.round(favorable),
      totalScenarios: scenariosEvaluated,
    };
  });

  const explanation =
    methodology === 'deterministic'
      ? `Exaustão determinística completa de ${scenariosEvaluated} cenários regulamentares equiprováveis.`
      : `Simulação Monte Carlo com ${scenariosEvaluated.toLocaleString('pt-BR')} iterações equiprováveis (Mulberry32, seed determinística). Erro amostral esperado σ ≈ ±0,5%.`;

  return {
    groupName,
    advancingCount,
    totalTeams: groupTeams.length,
    totalRemainingMatches: remainingMatches.length,
    methodology,
    scenariosEvaluated,
    executionTimeMs: Math.round(performance.now() - startTime),
    methodologyExplanation: explanation,
    tieBreakUncertaintyDetected: tieBreakUncertaintyGlobal,
    teams: teamsResult,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orquestrador Principal da Competição
// ─────────────────────────────────────────────────────────────────────────────

export class ClassificationProbabilityService {
  public static calculateCompetitionProbabilities(
    competition: CompetitionRecord | null | undefined,
    matches: MatchRecord[],
    teams: TeamRecord[],
    competitionTeams: CompetitionTeam[],
    options?: ProbabilityCalculationOptions,
  ): CompetitionProbabilityResult {
    const generatedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (!competition) {
      return {
        competitionId: '',
        competitionName: 'Competição',
        isSufficientData: false,
        statusReason: 'Competição não informada.',
        groups: [],
        generatedAt,
      };
    }

    const compTeamsFiltered = competitionTeams.filter((ct) => ct.competitionId === competition.id);
    const compMatchesFiltered = matches.filter((m) => m.competitionId === competition.id);

    // Identificação de dados insuficientes: sem equipes cadastradas
    if (compTeamsFiltered.length === 0 || teams.length === 0) {
      return {
        competitionId: competition.id,
        competitionName: competition.name,
        isSufficientData: false,
        statusReason: 'Nenhuma equipe inscrita nesta competição.',
        groups: [],
        generatedAt,
      };
    }

    // Identificação de partidas: se não houver nenhuma partida (jogada ou restante)
    if (compMatchesFiltered.length === 0) {
      return {
        competitionId: competition.id,
        competitionName: competition.name,
        isSufficientData: false,
        statusReason: 'Nenhuma partida cadastrada para a competição.',
        groups: [],
        generatedAt,
      };
    }

    // Mapeamento de equipes para grupos
    const teamById = new Map(teams.map((t) => [t.id, t]));
    const registrations: StandingInput[] = [];

    for (const ct of compTeamsFiltered) {
      const team = teamById.get(ct.teamId);
      if (!team) continue;
      const groupMatch = compMatchesFiltered.find(
        (m) => m.teamAId === ct.teamId || m.teamBId === ct.teamId,
      );
      registrations.push({
        team,
        groupName: groupMatch?.groupName ?? competition.groupName ?? 'A',
      });
    }

    // Agrupa equipes por chave
    const groupsMap = new Map<string, StandingInput[]>();
    for (const r of registrations) {
      const gName = r.groupName || 'A';
      const list = groupsMap.get(gName) || [];
      list.push(r);
      groupsMap.set(gName, list);
    }

    const groupsResult: GroupProbabilityResult[] = [];

    for (const [gName, gTeams] of groupsMap.entries()) {
      const gTeamIds = new Set(gTeams.map((t) => t.team.id));
      const gMatches = compMatchesFiltered.filter(
        (m) => gTeamIds.has(m.teamAId) || gTeamIds.has(m.teamBId),
      );

      const completed = gMatches.filter((m) => isMatchCompleted(m));
      const remaining = gMatches.filter(
        (m) => !isMatchCompleted(m) && m.status !== 'cancelled',
      );

      const groupProb = evaluateGroupProbabilities(
        gName,
        gTeams,
        completed,
        remaining,
        competition,
        options,
      );
      groupsResult.push(groupProb);
    }

    // Alerta informativo se a competição estiver configurada com useBestThirds
    const useBestThirdsWarning = competition.useBestThirds
      ? 'Atenção: Esta competição prevê repescagem por Melhores Terceiros Colocados. As probabilidades abaixo referem-se estritamente à vaga direta pelo grupo (Top 2).'
      : undefined;

    return {
      competitionId: competition.id,
      competitionName: competition.name,
      isSufficientData: true,
      useBestThirdsWarning,
      groups: groupsResult,
      generatedAt,
    };
  }
}
