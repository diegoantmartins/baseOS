// Motor de sorteio do VolleyPro.
//
// Algoritmos:
//  1. PRNG determinístico (mulberry32) — mesmo seed, mesmo sorteio.
//  2. Distribuição serpentina balanceada em grupos (modo 'seeded') ou
//     distribuição totalmente aleatória (modo 'random').
//  3. Tabela de jogos pelo método do círculo (Berger table): turno único,
//     todas as duplas se enfrentam uma vez.

import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type {
  DrawConfig,
  DrawGroup,
  DrawMatchProposal,
  DrawResult,
  DrawTeamEntry,
} from '@/types/draw';

/** PRNG determinístico de 32 bits (mulberry32). Mesmo seed → mesma sequência. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Nome de grupo por índice (0 → 'Grupo A', 1 → 'Grupo B'...). */
export function groupNameForIndex(index: number): string {
  const letter = String.fromCharCode(65 + index);
  return `Grupo ${letter}`;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBalancedCapacities(total: number, groupsCount: number): number[] {
  const base = Math.floor(total / groupsCount);
  const extra = total % groupsCount;
  return Array.from({ length: groupsCount }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * Distribui as equipes em grupos balanceados.
 * - Modo 'seeded': as cabeças de chave (headSeeds, em ordem de prioridade) são
 *   colocadas uma por grupo; o restante é embaralhado com a semente e
 *   distribuído preenchendo primeiro os grupos com mais vagas (balanceamento).
 * - Modo 'random': todas as equipes são embaralhadas e distribuídas da mesma
 *   forma balanceada.
 */
export function distributeTeamsIntoGroups(
  entries: DrawTeamEntry[],
  groupsCount: number,
  config: Pick<DrawConfig, 'seedingMode' | 'seed' | 'headSeeds'>,
): DrawGroup[] {
  const total = entries.length;
  if (total === 0) return [];
  const groupsCountSafe = Math.max(1, Math.min(groupsCount, total));
  const groups: DrawGroup[] = Array.from({ length: groupsCountSafe }, (_, i) => ({
    name: groupNameForIndex(i),
    teams: [],
  }));
  const capacity = buildBalancedCapacities(total, groupsCountSafe);
  const rand = mulberry32(config.seed >>> 0);

  const headIds = config.headSeeds ?? [];
  const head: DrawTeamEntry[] = [];
  const rest: DrawTeamEntry[] = [];
  for (const entry of entries) {
    if (headIds.includes(entry.teamId)) head.push(entry);
    else rest.push(entry);
  }
  head.sort((a, b) => headIds.indexOf(a.teamId) - headIds.indexOf(b.teamId));

  if (config.seedingMode === 'seeded') {
    // Cabeças de chave: uma por grupo (ordem de prioridade).
    head.forEach((entry, i) => {
      const g = i % groupsCountSafe;
      groups[g].teams.push(entry);
      capacity[g] -= 1;
    });
  } else {
    // Sorteio puro: as cabeças de chave entram no sorteio geral.
    rest.push(...head);
  }

  const shuffled = shuffle(rest, rand);
  for (const entry of shuffled) {
    const candidates = capacity
      .map((space, i) => ({ i, space }))
      .filter(c => c.space > 0)
      .sort((a, b) => b.space - a.space || a.i - b.i);
    const chosen = candidates[0];
    if (!chosen) break;
    groups[chosen.i].teams.push(entry);
    capacity[chosen.i] -= 1;
  }

  // Se houver sobra de vagas (grupos desiguais), normaliza a ordem por seed.
  return groups.map(g => ({ ...g, teams: g.teams.sort((a, b) => a.seed - b.seed) }));
}

/**
 * Gera a tabela de jogos de um grupo pelo método do círculo (Berger table).
 * Cada dupla joga uma única vez; com número ímpar de equipes há rodadas com
 * folga (bye).
 */
export function generateGroupRoundRobin(teamIds: string[]): Array<{ round: number; teamAId: string; teamBId: string }> {
  const n = teamIds.length;
  if (n < 2) return [];
  const ids = [...teamIds];
  if (n % 2 === 1) ids.push('__BYE__');
  const m = ids.length;
  const rounds = m - 1;
  const result: Array<{ round: number; teamAId: string; teamBId: string }> = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < m / 2; i++) {
      const a = ids[i];
      const b = ids[m - 1 - i];
      if (a !== '__BYE__' && b !== '__BYE__') {
        result.push({ round: r + 1, teamAId: a, teamBId: b });
      }
    }
    const last = ids[m - 1];
    for (let i = m - 1; i > 1; i--) ids[i] = ids[i - 1];
    ids[1] = last;
  }
  return result;
}

/** Gera todos os jogos da fase classificatória a partir dos grupos sorteados. */
export function generateDrawMatches(groups: DrawGroup[], phase = 'classificatória'): DrawMatchProposal[] {
  let matchNumber = 1;
  const proposals: DrawMatchProposal[] = [];
  for (const group of groups) {
    const ids = group.teams.map(t => t.teamId);
    for (const pair of generateGroupRoundRobin(ids)) {
      proposals.push({
        round: pair.round,
        matchNumber,
        teamAId: pair.teamAId,
        teamBId: pair.teamBId,
        groupName: group.name,
        phase,
      });
      matchNumber += 1;
    }
  }
  return proposals;
}

/**
 * Executa o sorteio completo de uma competição.
 * Entrada: competição + equipes inscritas (TeamRecord) + configuração.
 */
export function runDraw(
  competition: CompetitionRecord,
  teams: TeamRecord[],
  config: DrawConfig,
): DrawResult {
  const entries: DrawTeamEntry[] = teams
    .map((team, index) => ({ teamId: team.id, seed: index + 1 }))
    .sort((a, b) => a.seed - b.seed);

  const groups = distributeTeamsIntoGroups(entries, config.groupsCount, config);
  const matches = generateDrawMatches(groups);

  return {
    competitionId: competition.id,
    config: { ...config, headSeeds: [...config.headSeeds] },
    groups,
    matches,
  };
}

/** Total de jogos de um turno único para n equipes. */
export function roundRobinMatchCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return Math.floor((teamCount * (teamCount - 1)) / 2);
}

/** Total de rodadas de um turno único para n equipes. */
export function roundRobinRoundCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}