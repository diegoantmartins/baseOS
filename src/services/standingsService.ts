// Motor de classificação e desempate do VolleyPro.
//
// Critérios de classificação (por chave/grupo), nesta ordem:
//  1º  Maior número de pontos (competition points)
//  2º  Confronto direto (somente quando o empate envolve 2 equipes;
//      com 3+ equipes ou confronto 1x1, passa ao critério seguinte)
//  3º  Set Average = sets vencidos ÷ sets perdidos (maior índice)
//  4º  Pontos Average = pontos marcados ÷ pontos sofridos (maior índice)
//  5º  Saldo de pontos = pontos marcados − pontos sofridos (maior saldo)
//  6º  Maior número de pontos marcados
//  7º  Sorteio (aqui, ordem estável determinística)

import type { MatchRecord, TeamRecord } from '@/types/entities';

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
  setsRatio: number;
  pointsWon: number;
  pointsLost: number;
  pointsRatio: number;
  pointsBalance: number;
  competitionPoints: number;
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

export function matchWinner(match: MatchRecord): string | null {
  if (match.status !== 'completed') return null;
  const setsA = match.sets.filter(s => s.scoreA > s.scoreB).length;
  const setsB = match.sets.filter(s => s.scoreB > s.scoreA).length;
  if (setsA === setsB) return null;
  return setsA > setsB ? match.teamAId : match.teamBId;
}

/** Agrega as estatísticas de uma equipe em uma lista de partidas. */
export function accumulateStats(matches: MatchRecord[], teamId: string): Omit<TeamStandingResult, 'teamId' | 'teamName' | 'teamShortName' | 'groupName' | 'position'> {
  const stats = {
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    competitionPoints: 0,
    setsRatio: 0,
    pointsRatio: 0,
    pointsBalance: 0,
  };

  for (const match of matches) {
    if (match.status !== 'completed') continue;
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

  stats.setsRatio = stats.setsLost === 0 ? stats.setsWon : stats.setsWon / stats.setsLost;
  stats.pointsRatio = stats.pointsLost === 0 ? stats.pointsWon : stats.pointsWon / stats.pointsLost;
  stats.pointsBalance = stats.pointsWon - stats.pointsLost;

  return stats;
}

/** Confronto direto entre duas equipes (retorna a vencedora, ou null se 1x1/inexistente). */
export function headToHeadWinner(matches: MatchRecord[], teamAId: string, teamBId: string): string | null {
  let winsA = 0;
  let winsB = 0;
  for (const match of matches) {
    if (match.status !== 'completed') continue;
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
 * Compara duas equipes pelos critérios 1º a 6º.
 * Retorna 0 quando deve ir ao critério seguinte.
 */
function compareByCriteria(
  a: TeamStandingResult,
  b: TeamStandingResult,
  matches: MatchRecord[],
): number {
  // 1º - Maior número de pontos
  if (a.competitionPoints !== b.competitionPoints) return b.competitionPoints - a.competitionPoints;
  // 2º - Confronto direto (apenas empate entre 2 equipes)
  const directWinner = headToHeadWinner(matches, a.teamId, b.teamId);
  if (directWinner === a.teamId) return -1;
  if (directWinner === b.teamId) return 1;
  // 3º - Set Average
  if (a.setsRatio !== b.setsRatio) return b.setsRatio - a.setsRatio;
  // 4º - Pontos Average
  if (a.pointsRatio !== b.pointsRatio) return b.pointsRatio - a.pointsRatio;
  // 5º - Saldo de pontos
  if (a.pointsBalance !== b.pointsBalance) return b.pointsBalance - a.pointsBalance;
  // 6º - Maior número de pontos marcados
  return b.pointsWon - a.pointsWon;
}

/**
 * Calcula a classificação de um grupo.
 * Em empates com 3+ equipes nos critérios 1-2, os critérios 3-6 são
 * aplicados globalmente (evita arbitrariedade); o 7º critério (sorteio)
 * é resolvido por ordem estável (id lexicográfico), documentado no
 * regulamento como substituto determinístico do sorteio.
 */
export function computeStandings(
  teams: StandingInput[],
  matches: MatchRecord[],
): TeamStandingResult[] {
  const rows: TeamStandingResult[] = teams.map(({ team, groupName }) => ({
    teamId: team.id,
    teamName: team.name,
    teamShortName: team.shortName,
    groupName,
    position: 0,
    ...accumulateStats(matches, team.id),
  }));

  rows.sort((a, b) => {
    const byCriteria = compareByCriteria(a, b, matches);
    if (byCriteria !== 0) return byCriteria;
    // 7º - Sorteio: ordem estável determinística
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
 * Classificação separada por grupo (chave). Se nenhuma equipe tiver
 * groupName, retorna uma única chave genérica.
 */
export function computeStandingsByGroup(
  teams: StandingInput[],
  matches: MatchRecord[],
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
    const sorted = computeStandings(groupTeams, matches);
    result.push({ groupName: groupName || 'Classificação Geral', standings: sorted });
  }
  return result;
}
