// Motor de classificação e desempate do VolleyPro.
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

import type { MatchRecord, TeamRecord, TiebreakCriterionId } from '@/types/entities';

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
export function competitionPointsFromSets(setsWon: number, setsLost: number): number {
  if (setsWon === setsLost) return 0;
  if (setsWon > setsLost) return setsWon - setsLost === 1 ? 2 : 3;
  return setsLost - setsWon === 1 ? 1 : 0;
}

export function isMatchCompleted(match: MatchRecord, onlyHomologated = false): boolean {
  if (onlyHomologated) {
    return match.status === 'homologated';
  }
  return match.status === 'completed' || match.status === 'homologated';
}

export function matchWinner(match: MatchRecord): string | null {
  if (match.winnerId) return match.winnerId;
  if (!isMatchCompleted(match)) return null;
  const setsA = match.sets.filter(s => s.scoreA > s.scoreB).length;
  const setsB = match.sets.filter(s => s.scoreB > s.scoreA).length;
  if (setsA === setsB) return null;
  return setsA > setsB ? match.teamAId : match.teamBId;
}

/** Agrega as estatísticas de uma equipe em uma lista de partidas. */
export function accumulateStats(
  matches: MatchRecord[],
  teamId: string,
  onlyHomologated = false,
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

    const setsWon = isA
      ? match.sets.filter(s => s.scoreA > s.scoreB).length
      : match.sets.filter(s => s.scoreB > s.scoreA).length;
    const setsLost = isA
      ? match.sets.filter(s => s.scoreB > s.scoreA).length
      : match.sets.filter(s => s.scoreA > s.scoreB).length;
    const pointsScored = isA
      ? match.sets.reduce((acc, s) => acc + s.scoreA, 0)
      : match.sets.reduce((acc, s) => acc + s.scoreB, 0);
    const pointsConceded = isA
      ? match.sets.reduce((acc, s) => acc + s.scoreB, 0)
      : match.sets.reduce((acc, s) => acc + s.scoreA, 0);

    stats.matchesPlayed += 1;
    if (setsWon > setsLost) stats.matchesWon += 1;
    else stats.matchesLost += 1;
    stats.setsWon += setsWon;
    stats.setsLost += setsLost;
    stats.pointsWon += pointsScored;
    stats.pointsLost += pointsConceded;
    stats.competitionPoints += competitionPointsFromSets(setsWon, setsLost);
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
): string | null {
  let winsA = 0;
  let winsB = 0;
  for (const match of matches) {
    if (!isMatchCompleted(match, onlyHomologated)) continue;
    const involvesBoth =
      (match.teamAId === teamAId && match.teamBId === teamBId) ||
      (match.teamAId === teamBId && match.teamBId === teamAId);
    if (!involvesBoth) continue;
    const winner = matchWinner(match);
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
      const winner = headToHeadWinner(matches, a.teamId, b.teamId, onlyHomologated);
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
};

/**
 * Calcula a classificação de uma lista de equipes com critérios customizáveis.
 */
export function computeStandings(
  teams: StandingInput[],
  matches: MatchRecord[],
  options?: StandingsOptions,
): TeamStandingResult[] {
  const criteria = options?.criteria?.length ? options.criteria : DEFAULT_TIEBREAK_CRITERIA;
  const onlyHomologated = options?.onlyHomologated ?? false;

  const rows: TeamStandingResult[] = teams.map(({ team, groupName }) => ({
    teamId: team.id,
    teamName: team.name,
    teamShortName: team.shortName,
    groupName,
    position: 0,
    ...accumulateStats(matches, team.id, onlyHomologated),
    isProvisional: !onlyHomologated && matches.some(m => m.status === 'completed' && !m.homologatedAt),
  }));

  rows.sort((a, b) => {
    for (const criterion of criteria) {
      const { diff, reason } = evaluateSingleCriterion(criterion, a, b, matches, onlyHomologated);
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
      const { diff, reason } = evaluateSingleCriterion(criterion, a, b, [], onlyHomologated);
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

