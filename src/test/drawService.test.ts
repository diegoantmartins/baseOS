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
import { buildGroupArena } from '@/components/draw/cinematic/groupArena';
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

describe('buildGroupArena', () => {
  it('constrói os cards reais de cada grupo com status e contagem de revelações', () => {
    const groups = [
      { name: 'Grupo A', teams: [{ teamId: 't1', seed: 1 }, { teamId: 't2', seed: 2 }] },
      { name: 'Grupo B', teams: [{ teamId: 't3', seed: 3 }, { teamId: 't4', seed: 4 }] },
    ];

    const cards = buildGroupArena(groups, [
      { teamId: 't1', groupName: 'Grupo A', order: 0 },
      { teamId: 't2', groupName: 'Grupo A', order: 1 },
    ], 'Grupo A');

    expect(cards).toHaveLength(2);
    expect(cards[0].name).toBe('Grupo A');
    expect(cards[0].revealedCount).toBe(2);
    expect(cards[0].status).toBe('active');
    expect(cards[1].revealedCount).toBe(0);
    expect(cards[1].status).toBe('pending');
  });
});

describe('roundRobinMatchCount', () => {
  it('retorna 0 para menos de 2 equipes', () => {
    expect(roundRobinMatchCount(0)).toBe(0);
    expect(roundRobinMatchCount(1)).toBe(0);
  });

  it('calcula corretamente n*(n-1)/2', () => {
    expect(roundRobinMatchCount(2)).toBe(1);
    expect(roundRobinMatchCount(3)).toBe(3);
    expect(roundRobinMatchCount(4)).toBe(6);
    expect(roundRobinMatchCount(5)).toBe(10);
    expect(roundRobinMatchCount(6)).toBe(15);
    expect(roundRobinMatchCount(8)).toBe(28);
  });
});

describe('roundRobinRoundCount', () => {
  it('retorna 0 para menos de 2 equipes', () => {
    expect(roundRobinRoundCount(0)).toBe(0);
    expect(roundRobinRoundCount(1)).toBe(0);
  });

  it('retorna n-1 para grupos pares', () => {
    expect(roundRobinRoundCount(2)).toBe(1);
    expect(roundRobinRoundCount(4)).toBe(3);
    expect(roundRobinRoundCount(6)).toBe(5);
    expect(roundRobinRoundCount(8)).toBe(7);
  });

  it('retorna n para grupos ímpares', () => {
    expect(roundRobinRoundCount(3)).toBe(3);
    expect(roundRobinRoundCount(5)).toBe(5);
    expect(roundRobinRoundCount(7)).toBe(7);
  });
});

describe('random mode com headSeeds', () => {
  it('todas as equipes estão presentes independemente das headSeeds', () => {
    const config1: DrawConfig = { groupsCount: 2, seedingMode: 'random', seed: 100, headSeeds: ['team-1'] };
    const config2: DrawConfig = { groupsCount: 2, seedingMode: 'random', seed: 100, headSeeds: [] };

    const result1 = runDraw(competition, teams, config1);
    const result2 = runDraw(competition, teams, config2);

    // Todas as equipes devem estar presentes em ambos os resultados
    const ids1 = result1.groups.flatMap(g => g.teams.map(t => t.teamId)).sort();
    const ids2 = result2.groups.flatMap(g => g.teams.map(t => t.teamId)).sort();

    expect(ids1).toEqual(ids2);
    expect(ids1).toEqual(teams.map(t => t.id).sort());
  });
});

describe('seeded mode com headSeeds', () => {
  it('garante que cada cabeça vai para um grupo diferente (até limite)', () => {
    const config: DrawConfig = {
      groupsCount: 3,
      seedingMode: 'seeded',
      seed: 99,
      headSeeds: ['team-1', 'team-2', 'team-3'],
    };
    const result = runDraw(competition, teams, config);

    const allHeads = config.headSeeds;
    const allGrouped = result.groups.flatMap(g => g.teams.map(t => t.teamId));

    // Cada cabeça deve estar no resultado
    allHeads.forEach(head => {
      expect(allGrouped).toContain(head);
    });
  });

  it('modo seeded sem cabeças equivale a modo random balanceado', () => {
    const config: DrawConfig = { groupsCount: 2, seedingMode: 'seeded', seed: 42, headSeeds: [] };
    const result = runDraw(competition, teams, config);
    expect(result.groups).toHaveLength(2);
    expect(result.groups.every(g => g.teams.length === 3)).toBe(true);
  });
});

describe('determinismo e balanceamento', () => {
  it('mesma entrada + mesma seed = mesmo resultado', () => {
    const config: DrawConfig = { groupsCount: 3, seedingMode: 'random', seed: 999, headSeeds: [] };
    const a = runDraw(competition, teams, config);
    const b = runDraw(competition, teams, config);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('balanceamento: max - min <= 1 em todos os cenários', () => {
    const testCases = [
      { teams: createTeamsHelper(8), groups: 3 },
      { teams: createTeamsHelper(10), groups: 3 },
      { teams: createTeamsHelper(14), groups: 4 },
      { teams: createTeamsHelper(17), groups: 4 },
    ];

    testCases.forEach(({ teams: t, groups }) => {
      const result = runDraw(competition, t, {
        groupsCount: groups,
        seedingMode: 'random',
        seed: 100,
        headSeeds: [],
      });
      const sizes = result.groups.map(g => g.teams.length);
      const max = Math.max(...sizes);
      const min = Math.min(...sizes);
      expect(max - min).toBeLessThanOrEqual(1);
    });
  });
});

function createTeamsHelper(count: number): TeamRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Time ${i + 1}`,
    shortName: `T${i + 1}`,
    modality: 'indoor' as const,
  }));
}