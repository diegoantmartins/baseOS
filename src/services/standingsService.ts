// Motor de classificação e desempate do BaseOS.
//
// Suporta critérios ordenáveis configurados pelo gestor da competição:
//  - 'points': Maior número de pontos (competition points)
//  - 'victories': Maior número de vitórias
//  - 'sets-balance': Saldo de sets (sets vencidos − sets perdidos)
//  - 'points-balance': Saldo de pontos (pontos marcados − pontos sofridos)
//  - 'head-to-head': Confronto direto (somente para empate direto entre 2 equipes)
//  - 'set-average': Set Average = sets vencidos ÷ sets perdidos (maior índice)
//  - 'points-average': Pontos Average = pontos marcados ÷ pontos sofridos (maior índice)
//  - 'draw': Sorteio / Ordem estável determinística

import type { CompetitionRecord, MatchRecord, TeamRecord, TiebreakCriterionId } from '@/types/entities';
import { CompetitionRulesService } from './competitionRulesService';
import { TieBreakEngine } from './tieBreakEngine';
import { OverallStandingsEngine } from './overallStandingsEngine';
import type { OverallStandingResult, OverallStandingsOptions } from './overallStandingsEngine';

export type StandingInput = {
  team: TeamRecord;
  groupName?: string;
};

export type TeamStandingResult = {
  teamId: string;
  teamName: string;
  teamShortName: string;
  groupName?: string;
  position: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  setsBalance?: number;
  setsRatio: number;
  pointsWon: number;
  pointsLost: number;
  pointsBalance: number;
  pointsRatio: number;
  competitionPoints: number;
  /** Explicação detalhada de desempate quando aplicável */
  tiebreakReason?: string;
  /** Se a classificação inclui jogos ainda não homologados */
  isProvisional?: boolean;
  /** Se a equipe está em situação de empate em sua posição */
  isTied?: boolean;
  /** Se o empate não pôde ser resolvido pelos critérios configurados */
  unresolvedTie?: boolean;
};

export const DEFAULT_TIEBREAK_CRITERIA: TiebreakCriterionId[] = [
  'points',
  'head-to-head',
  'set-average',
  'points-average',
  'sets-balance',
  'points-balance',
  'victories',
  'draw',
];

export const TIEBREAK_CRITERIA_LABELS: Record<TiebreakCriterionId, string> = {
  points: '1. Pontos na Tabela',
  victories: '2. Número de Vitórias',
  'sets-balance': '3. Saldo de Sets',
  'points-balance': '4. Saldo de Pontos',
  'head-to-head': '5. Confronto Direto',
  'head-to-head-mini-table': '5. Confronto Direto (Mini-Tabela)',
  'set-average': '6. Set Average (Razão de Sets)',
  'sets-ratio': '6. Razão de Sets (Set Average)',
  'points-average': '7. Pontos Average (Razão de Pontos)',
  'points-ratio': '7. Razão de Pontos (Pontos Average)',
  draw: '8. Sorteio / Determinístico',
};

/**
 * Pontos por resultado (padrão FIVB/CBV):
 * vitória 3-0 ou 3-1 = 3 pts; vitória 3-2 = 2 pts;
 * derrota 2-3 = 1 pt; derrota 0-3 ou 1-3 = 0 pts.
 */
export function competitionPointsFromSets(
  setsWon: number,
  setsLost: number,
  isWo = false,
  competition?: CompetitionRecord,
): number {
  if (competition) {
    return CompetitionRulesService.calculateCompetitionPoints(competition, setsWon, setsLost, isWo);
  }
  return CompetitionRulesService.calculateCompetitionPoints(
    { modality: 'indoor' } as CompetitionRecord,
    setsWon,
    setsLost,
    isWo,
  );
}

export function isMatchCompleted(match: MatchRecord, onlyHomologated = false): boolean {
  if (onlyHomologated) {
    return match.status === 'homologated';
  }
  return match.status === 'completed' || match.status === 'homologated';
}

export function matchWinner(match: MatchRecord, competition?: CompetitionRecord): string | null {
  const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, match);
  return canonical.winnerId;
}

/** Agrega as estatísticas de uma equipe em uma lista de partidas com base no resultado canônico. */
export function accumulateStats(
  matches: MatchRecord[],
  teamId: string,
  onlyHomologated = false,
  competition?: CompetitionRecord,
): Omit<TeamStandingResult, 'teamId' | 'teamName' | 'teamShortName' | 'groupName' | 'position' | 'tiebreakReason' | 'isProvisional'> {
  const stats = {
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    setsWon: 0,
    setsLost: 0,
    setsBalance: 0,
    setsRatio: 0,
    pointsWon: 0,
    pointsLost: 0,
    pointsBalance: 0,
    pointsRatio: 0,
    competitionPoints: 0,
  };

  for (const match of matches) {
    if (!isMatchCompleted(match, onlyHomologated)) continue;
    const isA = match.teamAId === teamId;
    if (!isA && match.teamBId !== teamId) continue;

    const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, match);
    if (!canonical.isCompleted) continue;

    const setsWon = isA ? canonical.setsWonA : canonical.setsWonB;
    const setsLost = isA ? canonical.setsWonB : canonical.setsWonA;
    const pointsScored = isA ? canonical.pointsScoredA : canonical.pointsScoredB;
    const pointsConceded = isA ? canonical.pointsScoredB : canonical.pointsScoredA;

    stats.matchesPlayed += 1;
    if (canonical.winnerId === teamId) stats.matchesWon += 1;
    else stats.matchesLost += 1;

    stats.setsWon += setsWon;
    stats.setsLost += setsLost;
    stats.pointsWon += pointsScored;
    stats.pointsLost += pointsConceded;

    const points = competitionPointsFromSets(setsWon, setsLost, canonical.isWo, competition);
    stats.competitionPoints += points;
  }

  stats.setsBalance = stats.setsWon - stats.setsLost;
  stats.pointsBalance = stats.pointsWon - stats.pointsLost;
  stats.setsRatio = stats.setsLost === 0 ? stats.setsWon : stats.setsWon / stats.setsLost;
  stats.pointsRatio = stats.pointsLost === 0 ? stats.pointsWon : stats.pointsWon / stats.pointsLost;

  return stats;
}

/** Confronto direto entre duas equipes (retorna a vencedora, ou null se empate/inexistente). */
export function headToHeadWinner(
  matches: MatchRecord[],
  teamAId: string,
  teamBId: string,
  onlyHomologated = false,
  competition?: CompetitionRecord,
): string | null {
  let winsA = 0;
  let winsB = 0;
  for (const match of matches) {
    if (!isMatchCompleted(match, onlyHomologated)) continue;
    const involvesBoth =
      (match.teamAId === teamAId && match.teamBId === teamBId) ||
      (match.teamAId === teamBId && match.teamBId === teamAId);
    if (!involvesBoth) continue;
    const winner = matchWinner(match, competition);
    if (winner === teamAId) winsA += 1;
    else if (winner === teamBId) winsB += 1;
  }
  if (winsA === winsB) return null;
  return winsA > winsB ? teamAId : teamBId;
}

/**
 * Avalia um único critério entre duas equipes.
 * Retorna < 0 se A > B, > 0 se B > A, ou 0 se empatado.
 */
function evaluateSingleCriterion(
  criterion: TiebreakCriterionId,
  a: TeamStandingResult,
  b: TeamStandingResult,
  matches: MatchRecord[],
  onlyHomologated: boolean,
  competition?: CompetitionRecord,
): { diff: number; reason?: string } {
  switch (criterion) {
    case 'points':
      if (a.competitionPoints !== b.competitionPoints) {
        return {
          diff: b.competitionPoints - a.competitionPoints,
          reason: `${a.competitionPoints > b.competitionPoints ? a.teamName : b.teamName} tem mais pontos (${Math.max(a.competitionPoints, b.competitionPoints)} vs ${Math.min(a.competitionPoints, b.competitionPoints)})`,
        };
      }
      return { diff: 0 };

    case 'victories':
      if (a.matchesWon !== b.matchesWon) {
        return {
          diff: b.matchesWon - a.matchesWon,
          reason: `${a.matchesWon > b.matchesWon ? a.teamName : b.teamName} tem mais vitórias (${Math.max(a.matchesWon, b.matchesWon)} vs ${Math.min(a.matchesWon, b.matchesWon)})`,
        };
      }
      return { diff: 0 };

    case 'head-to-head': {
      const winner = headToHeadWinner(matches, a.teamId, b.teamId, onlyHomologated, competition);
      if (winner === a.teamId) {
        return { diff: -1, reason: `${a.teamName} venceu o confronto direto contra ${b.teamName}` };
      }
      if (winner === b.teamId) {
        return { diff: 1, reason: `${b.teamName} venceu o confronto direto contra ${a.teamName}` };
      }
      return { diff: 0 };
    }

    case 'sets-balance':
      if (a.setsBalance !== b.setsBalance) {
        return {
          diff: b.setsBalance - a.setsBalance,
          reason: `${a.setsBalance > b.setsBalance ? a.teamName : b.teamName} tem melhor saldo de sets (${Math.max(a.setsBalance, b.setsBalance)} vs ${Math.min(a.setsBalance, b.setsBalance)})`,
        };
      }
      return { diff: 0 };

    case 'set-average':
    case 'sets-ratio':
      if (Math.abs(a.setsRatio - b.setsRatio) > 0.0001) {
        return {
          diff: b.setsRatio - a.setsRatio,
          reason: `${a.setsRatio > b.setsRatio ? a.teamName : b.teamName} tem melhor set average (${Math.max(a.setsRatio, b.setsRatio).toFixed(3)} vs ${Math.min(a.setsRatio, b.setsRatio).toFixed(3)})`,
        };
      }
      return { diff: 0 };

    case 'points-balance':
      if (a.pointsBalance !== b.pointsBalance) {
        return {
          diff: b.pointsBalance - a.pointsBalance,
          reason: `${a.pointsBalance > b.pointsBalance ? a.teamName : b.teamName} tem melhor saldo de pontos (${Math.max(a.pointsBalance, b.pointsBalance)} vs ${Math.min(a.pointsBalance, b.pointsBalance)})`,
        };
      }
      return { diff: 0 };

    case 'points-average':
    case 'points-ratio':
      if (Math.abs(a.pointsRatio - b.pointsRatio) > 0.0001) {
        return {
          diff: b.pointsRatio - a.pointsRatio,
          reason: `${a.pointsRatio > b.pointsRatio ? a.teamName : b.teamName} tem melhor pontos average (${Math.max(a.pointsRatio, b.pointsRatio).toFixed(3)} vs ${Math.min(a.pointsRatio, b.pointsRatio).toFixed(3)})`,
        };
      }
      return { diff: 0 };

    case 'draw':
    default: {
      const diff = a.teamId.localeCompare(b.teamId);
      return {
        diff,
        reason: diff !== 0 ? `Desempate por sorteio determinístico` : undefined,
      };
    }
  }
}

export type StandingsOptions = {
  criteria?: TiebreakCriterionId[];
  onlyHomologated?: boolean;
  competition?: CompetitionRecord;
  /** Se true, utiliza o TieBreakEngine com algoritmo canônico de Mini-Tabela para desempates 3+ */
  useMiniTable?: boolean;
};

/**
 * Calcula a classificação de uma lista de equipes com critérios customizáveis.
 * Suporta o algoritmo clássico e o novo TieBreakEngine com Mini-Tabela.
 */
export function computeStandings(
  teams: StandingInput[],
  matches: MatchRecord[],
  options?: StandingsOptions,
): TeamStandingResult[] {
  const competition = options?.competition;
  const configCriteria = competition
    ? CompetitionRulesService.getConfig(competition).standings?.tiebreakCriteriaOrder
    : undefined;
  const criteria = options?.criteria?.length
    ? options.criteria
    : configCriteria?.length
      ? configCriteria
      : DEFAULT_TIEBREAK_CRITERIA;
  const onlyHomologated = options?.onlyHomologated ?? false;

  const rows: TeamStandingResult[] = teams.map(({ team, groupName }) => ({
    teamId: team.id,
    teamName: team.name,
    teamShortName: team.shortName,
    groupName,
    position: 0,
    ...accumulateStats(matches, team.id, onlyHomologated, competition),
    isProvisional: !onlyHomologated && matches.some(m => m.status === 'completed' && !m.homologatedAt),
  }));

  // Se solicitado explicitamente ou se o critério 'head-to-head-mini-table' estiver presente,
  // utiliza o novo motor de particionamento e mini-tabela.
  if (options?.useMiniTable || criteria.includes('head-to-head-mini-table')) {
    return TieBreakEngine.resolveStandings(rows, matches, criteria, { onlyHomologated, competition });
  }

  // Comportamento canônico pairwise original
  rows.sort((a, b) => {
    for (const criterion of criteria) {
      const { diff, reason } = evaluateSingleCriterion(criterion, a, b, matches, onlyHomologated, competition);
      if (diff !== 0) {
        if (criterion !== 'points') {
          if (diff < 0 && !a.tiebreakReason) a.tiebreakReason = reason;
          else if (diff > 0 && !b.tiebreakReason) b.tiebreakReason = reason;
        }
        return diff;
      }
    }
    return a.teamId.localeCompare(b.teamId);
  });

  rows.forEach((row, idx) => {
    row.position = idx + 1;
  });

  return rows;
}

/**
 * Função canônica do novo Competition Format Engine que calcula a classificação
 * garantindo resolução determinística por Mini-Tabela para 2, 3 ou mais equipes.
 */
export function computeStandingsWithMiniTable(
  teams: StandingInput[],
  matches: MatchRecord[],
  options?: Omit<StandingsOptions, 'useMiniTable'>,
): TeamStandingResult[] {
  return computeStandings(teams, matches, { ...options, useMiniTable: true });
}

export type StandingsByGroup = {
  groupName: string;
  standings: TeamStandingResult[];
}[];

/**
 * Classificação separada por grupo (chave).
 */
export function computeStandingsByGroup(
  teams: StandingInput[],
  matches: MatchRecord[],
  options?: StandingsOptions,
): StandingsByGroup {
  const groups = new Map<string, StandingInput[]>();
  for (const entry of teams) {
    const key = entry.groupName ?? '';
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }

  const result: StandingsByGroup = [];
  for (const [groupName, groupTeams] of groups) {
    const sorted = computeStandings(groupTeams, matches, options);
    result.push({ groupName: groupName || 'Classificação Geral', standings: sorted });
  }
  return result;
}

export type BestThirdResult = TeamStandingResult & {
  originalGroupName: string;
  originalPosition: number;
  qualified: boolean;
};

/**
 * Calcula o ranking dos Melhores Terceiros colocados entre todos os grupos.
 */
export function computeBestThirds(
  groupStandings: StandingsByGroup,
  qualifyingCount = 2,
  options?: StandingsOptions,
): BestThirdResult[] {
  const thirdPlaces: BestThirdResult[] = [];

  for (const group of groupStandings) {
    const third = group.standings.find(s => s.position === 3);
    if (third) {
      thirdPlaces.push({
        ...third,
        originalGroupName: group.groupName,
        originalPosition: 3,
        qualified: false,
      });
    }
  }

  const criteria = options?.criteria?.length ? options.criteria : DEFAULT_TIEBREAK_CRITERIA;
  const onlyHomologated = options?.onlyHomologated ?? false;

  thirdPlaces.sort((a, b) => {
    for (const criterion of criteria) {
      if (criterion === 'head-to-head') continue; // Equipes de grupos diferentes não têm confronto direto
      const { diff, reason } = evaluateSingleCriterion(criterion, a, b, [], onlyHomologated, options?.competition);
      if (diff !== 0) {
        if (criterion !== 'points') {
          if (diff < 0 && !a.tiebreakReason) a.tiebreakReason = reason;
          else if (diff > 0 && !b.tiebreakReason) b.tiebreakReason = reason;
        }
        return diff;
      }
    }
    return a.teamId.localeCompare(b.teamId);
  });

  thirdPlaces.forEach((team, idx) => {
    team.position = idx + 1;
    team.qualified = idx < qualifyingCount;
    if (team.qualified) {
      team.tiebreakReason = team.tiebreakReason
        ? `${team.tiebreakReason} (Avança como ${idx + 1}º Melhor 3º)`
        : `Classificado como ${idx + 1}º Melhor 3º colocado`;
    }
  });

  return thirdPlaces;
}

// Re-exporta o motor de classificação intergrupos e seletores de ranking geral
export { OverallStandingsEngine } from './overallStandingsEngine';
export type { OverallStandingResult, OverallStandingsOptions } from './overallStandingsEngine';

export function computeOverallStandings(
  groupStandings: StandingsByGroup,
  options?: OverallStandingsOptions,
): OverallStandingResult[] {
  return OverallStandingsEngine.computeOverallStandings(groupStandings, options);
}

export function getGroupWinners(overall: OverallStandingResult[]): OverallStandingResult[] {
  return OverallStandingsEngine.getGroupWinners(overall);
}

export function getSecondPlaced(overall: OverallStandingResult[]): OverallStandingResult[] {
  return OverallStandingsEngine.getSecondPlaced(overall);
}

export function getThirdPlaced(overall: OverallStandingResult[]): OverallStandingResult[] {
  return OverallStandingsEngine.getThirdPlaced(overall);
}

export function getPositionsRange(
  overall: OverallStandingResult[],
  startRank: number,
  endRank: number,
): OverallStandingResult[] {
  return OverallStandingsEngine.getPositionsRange(overall, startRank, endRank);
}


