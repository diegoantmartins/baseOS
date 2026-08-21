// Testes do motor de sorteio do VolleyPro (distribuição em grupos + tabela).

import { describe, expect, it } from 'vitest';
import {
  distributeTeamsIntoGroups,
  generateDrawMatches,
  generateGroupRoundRobin,
  groupNameForIndex,
  mulberry32,
  roundRobinMatchCount,
  roundRobinRoundCount,
  runDraw,
} from '@/services/drawService';
import type { DrawConfig, DrawGroup, DrawTeamEntry } from '@/types/draw';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

const teams: TeamRecord[] = Array.from({ length: 6 }, (_, i) => ({
  id: `team-${i + 1}`,
  name: `Time ${i + 1}`,
  shortName: `T${i + 1}`,
  modality: 'indoor',
}));

const competition: CompetitionRecord = {
  id: 'comp-1',
  name: 'Copa Teste 2026',
  modality: 'indoor',
  format: 'round-robin',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  status: 'registration',
};

const entries: DrawTeamEntry[] = teams.map((team, i) => ({ teamId: team.id, seed: i + 1 }));

describe('mulberry32', () => {
  it('é determinístico: mesmo seed produz a mesma sequência', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produz valores entre 0 e 1', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('groupNameForIndex', () => {
  it('gera nomes de grupo em sequência alfabética', () => {
    expect(groupNameForIndex(0)).toBe('Grupo A');
    expect(groupNameForIndex(1)).toBe('Grupo B');
    expect(groupNameForIndex(3)).toBe('Grupo D');
  });
});

describe('distributeTeamsIntoGroups', () => {
  it('distribui as equipes de forma balanceada (2 grupos para 6 equipes)', () => {
    const groups = distributeTeamsIntoGroups(entries, 2, { seedingMode: 'random', seed: 123, headSeeds: [] });
    expect(groups).toHaveLength(2);
    expect(groups.every(g => g.teams.length === 3)).toBe(true);
    const allIds = groups.flatMap(g => g.teams.map(t => t.teamId)).sort();
    expect(allIds).toEqual(teams.map(t => t.id).sort());
  });

  it('equipes com números ímpares deixa grupos com diferença de no máximo 1', () => {
    const oddTeams = teams.slice(0, 5);
    const oddEntries = oddTeams.map((t, i) => ({ teamId: t.id, seed: i + 1 }));
    const groups = distributeTeamsIntoGroups(oddEntries, 2, { seedingMode: 'random', seed: 5, headSeeds: [] });
    const sizes = groups.map(g => g.teams.length).sort((a, b) => b - a);
    expect(sizes[0] - sizes[1]).toBeLessThanOrEqual(1);
  });

  it('modo seeded: cabeças de chave ficam uma por grupo', () => {
    const groups = distributeTeamsIntoGroups(entries, 2, {
      seedingMode: 'seeded',
      seed: 99,
      headSeeds: ['team-1', 'team-2'],
    });
    expect(groups[0].teams.some(t => t.teamId === 'team-1')).toBe(true);
    expect(groups[0].teams.some(t => t.teamId === 'team-2')).toBe(false);
    expect(groups[1].teams.some(t => t.teamId === 'team-2')).toBe(true);
    expect(groups[1].teams.some(t => t.teamId === 'team-1')).toBe(false);
  });

  it('modo seeded sem cabeças de chave distribui tudo aleatoriamente e balanceado', () => {
    const groups = distributeTeamsIntoGroups(entries, 3, { seedingMode: 'seeded', seed: 11, headSeeds: [] });
    expect(groups).toHaveLength(3);
    expect(groups.every(g => g.teams.length === 2)).toBe(true);
  });

  it('é determinístico: mesma semente gera o mesmo sorteio', () => {
    const a = distributeTeamsIntoGroups(entries, 2, { seedingMode: 'random', seed: 2026, headSeeds: [] });
    const b = distributeTeamsIntoGroups(entries, 2, { seedingMode: 'random', seed: 2026, headSeeds: [] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('sementes diferentes geram sorteios diferentes (alta probabilidade)', () => {
    const a = distributeTeamsIntoGroups(entries, 2, { seedingMode: 'random', seed: 1, headSeeds: [] });
    const b = distributeTeamsIntoGroups(entries, 2, { seedingMode: 'random', seed: 2, headSeeds: [] });
    const key = (g: DrawGroup[]) => g.map(gr => gr.teams.map(t => t.teamId).join(',')).join('|');
    expect(key(a)).not.toBe(key(b));
  });
});

describe('generateGroupRoundRobin', () => {
  it('cada dupla joga uma única vez (turno único)', () => {
    const ids = ['t1', 't2', 't3', 't4'];
    const pairs = generateGroupRoundRobin(ids).map(p => [p.teamAId, p.teamBId].sort().join('-'));
    const unique = new Set(pairs);
    expect(unique.size).toBe(6);
    expect(pairs).toHaveLength(6);
  });

  it('nenhuma equipe enfrenta a si mesma', () => {
    const ids = ['t1', 't2', 't3', 't4', 't5'];
    const pairs = generateGroupRoundRobin(ids);
    for (const p of pairs) {
      expect(p.teamAId).not.toBe(p.teamBId);
    }
  });

  it('com número par de equipes gera n-1 rodadas com n/2 jogos', () => {
    const ids = ['t1', 't2', 't3', 't4', 't5', 't6'];
    const pairs = generateGroupRoundRobin(ids);
    const rounds = new Set(pairs.map(p => p.round));
    expect(rounds.size).toBe(5);
    for (let r = 1; r <= 5; r++) {
      expect(pairs.filter(p => p.round === r)).toHaveLength(3);
    }
    expect(pairs).toHaveLength(15);
  });

  it('com número ímpar de equipes uma fica de folga por rodada', () => {
    const ids = ['t1', 't2', 't3', 't4', 't5'];
    const pairs = generateGroupRoundRobin(ids);
    expect(pairs).toHaveLength(10);
    const rounds = new Set(pairs.map(p => p.round));
    expect(rounds.size).toBe(5);
  });
});

describe('generateDrawMatches', () => {
  it('gera jogos com fase, grupo e numeração sequencial', () => {
    const groups: DrawGroup[] = [
      { name: 'Grupo A', teams: entries.slice(0, 3) },
      { name: 'Grupo B', teams: entries.slice(3, 6) },
    ];
    const matches = generateDrawMatches(groups, 'classificatória');
    expect(matches).toHaveLength(6);
    expect(matches.map(m => m.matchNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(matches.every(m => m.phase === 'classificatória')).toBe(true);
    const groupA = matches.filter(m => m.groupName === 'Grupo A');
    expect(groupA).toHaveLength(3);
  });

  it('contagem de jogos por equipe confere com a fórmula', () => {
    const groups: DrawGroup[] = [
      { name: 'Grupo A', teams: entries.slice(0, 4) },
      { name: 'Grupo B', teams: entries.slice(4, 6) },
    ];
    const matches = generateDrawMatches(groups);
    const total = groups.reduce((acc, g) => acc + roundRobinMatchCount(g.teams.length), 0);
    expect(matches).toHaveLength(total);
  });
});

describe('runDraw', () => {
  it('executa o sorteio completo da competição', () => {
    const config: DrawConfig = {
      groupsCount: 2,
      seedingMode: 'seeded',
      seed: 42,
      headSeeds: ['team-1', 'team-2'],
    };
    const result = runDraw(competition, teams, config);
    expect(result.competitionId).toBe('comp-1');
    expect(result.groups).toHaveLength(2);
    expect(result.groups.flatMap(g => g.teams)).toHaveLength(6);
    expect(result.matches).toHaveLength(6);
    expect(result.matches.every(m => m.groupName.startsWith('Grupo'))).toBe(true);
  });

  it('respeita os limites de rodadas e jogos', () => {
    const config: DrawConfig = { groupsCount: 1, seedingMode: 'random', seed: 1, headSeeds: [] };
    const result = runDraw(competition, teams, config);
    expect(roundRobinRoundCount(6)).toBe(5);
    expect(result.matches.length).toBe(roundRobinMatchCount(6));
    const maxRound = Math.max(...result.matches.map(m => m.round));
    expect(maxRound).toBe(5);
  });
});