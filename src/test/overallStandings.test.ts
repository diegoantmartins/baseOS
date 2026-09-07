import { describe, expect, it } from 'vitest';
import {
  OverallStandingsEngine,
  computeOverallStandings,
  getGroupWinners,
  getPositionsRange,
  getSecondPlaced,
  getThirdPlaced,
} from '@/services/overallStandingsEngine';
import type { StandingsByGroup, TeamStandingResult } from '@/services/standingsService';

function createMockTeamStanding(
  teamId: string,
  teamName: string,
  groupName: string,
  position: number,
  points: number,
  wins: number,
  setsRatio: number,
  pointsRatio: number,
): TeamStandingResult {
  return {
    teamId,
    teamName,
    teamShortName: teamId.slice(0, 3).toUpperCase(),
    groupName,
    position,
    matchesPlayed: 2,
    matchesWon: wins,
    matchesLost: 2 - wins,
    setsWon: wins * 2,
    setsLost: (2 - wins) * 2,
    setsRatio,
    pointsWon: 100,
    pointsLost: 100 / pointsRatio,
    pointsBalance: 100 - (100 / pointsRatio),
    pointsRatio,
    competitionPoints: points,
  };
}

describe('OverallStandingsEngine — Classificação Intergrupos', () => {
  // Cenário com 4 grupos de 3 equipes (12 equipes no total)
  const mock4GroupsStandings: StandingsByGroup = [
    {
      groupName: 'Grupo A',
      standings: [
        createMockTeamStanding('A1', 'Alpha 1', 'Grupo A', 1, 6, 2, 4.0, 1.25),
        createMockTeamStanding('A2', 'Alpha 2', 'Grupo A', 2, 3, 1, 1.0, 1.05),
        createMockTeamStanding('A3', 'Alpha 3', 'Grupo A', 3, 0, 0, 0.25, 0.80),
      ],
    },
    {
      groupName: 'Grupo B',
      standings: [
        createMockTeamStanding('B1', 'Beta 1', 'Grupo B', 1, 5, 2, 3.0, 1.20),
        createMockTeamStanding('B2', 'Beta 2', 'Grupo B', 2, 3, 1, 1.0, 1.02),
        createMockTeamStanding('B3', 'Beta 3', 'Grupo B', 3, 1, 0, 0.5, 0.85),
      ],
    },
    {
      groupName: 'Grupo C',
      standings: [
        createMockTeamStanding('C1', 'Charlie 1', 'Grupo C', 1, 6, 2, 4.0, 1.30), // Melhor que A1 no pointsRatio
        createMockTeamStanding('C2', 'Charlie 2', 'Grupo C', 2, 2, 1, 0.8, 0.95),
        createMockTeamStanding('C3', 'Charlie 3', 'Grupo C', 3, 1, 0, 0.5, 0.82),
      ],
    },
    {
      groupName: 'Grupo D',
      standings: [
        createMockTeamStanding('D1', 'Delta 1', 'Grupo D', 1, 4, 1, 1.5, 1.10),
        createMockTeamStanding('D2', 'Delta 2', 'Grupo D', 2, 4, 1, 1.2, 1.08),
        createMockTeamStanding('D3', 'Delta 3', 'Grupo D', 3, 1, 0, 0.5, 0.84),
      ],
    },
  ];

  describe('Estratégia Padrão: by-group-position-first', () => {
    it('ordena os 1ºs colocados de cada grupo nas primeiras 4 posições (1º a 4º geral)', () => {
      const overall = computeOverallStandings(mock4GroupsStandings, {
        strategy: 'by-group-position-first',
      });

      expect(overall).toHaveLength(12);

      // As posições 1 a 4 devem ser estritamente compostas pelos líderes de grupo
      const top4 = overall.slice(0, 4);
      expect(top4.map(s => s.teamId)).toEqual(['C1', 'A1', 'B1', 'D1']);
      expect(top4.every(s => s.groupPosition === 1)).toBe(true);

      // Posição 1: C1 (6 pts, ratio 1.30)
      expect(overall[0].teamId).toBe('C1');
      expect(overall[0].overallRank).toBe(1);

      // Posição 2: A1 (6 pts, ratio 1.25)
      expect(overall[1].teamId).toBe('A1');
      expect(overall[1].overallRank).toBe(2);

      // Posição 3: B1 (5 pts)
      expect(overall[2].teamId).toBe('B1');
      expect(overall[2].overallRank).toBe(3);

      // Posição 4: D1 (4 pts)
      expect(overall[3].teamId).toBe('D1');
      expect(overall[3].overallRank).toBe(4);
    });

    it('ordena os 2ºs colocados de cada grupo nas posições 5 a 8 geral', () => {
      const overall = computeOverallStandings(mock4GroupsStandings, {
        strategy: 'by-group-position-first',
      });

      const tier2 = overall.slice(4, 8);
      expect(tier2.every(s => s.groupPosition === 2)).toBe(true);
      expect(tier2.map(s => s.overallRank)).toEqual([5, 6, 7, 8]);

      // D2 tem 4 pts -> melhor 2º colocado (posição 5 geral)
      expect(overall[4].teamId).toBe('D2');
      expect(overall[4].overallRank).toBe(5);
    });

    it('ordena os 3ºs colocados de cada grupo nas posições 9 a 12 geral', () => {
      const overall = computeOverallStandings(mock4GroupsStandings, {
        strategy: 'by-group-position-first',
      });

      const tier3 = overall.slice(8, 12);
      expect(tier3.every(s => s.groupPosition === 3)).toBe(true);
      expect(tier3.map(s => s.overallRank)).toEqual([9, 10, 11, 12]);
    });
  });

  describe('Estratégia Alternativa: pure-overall-stats', () => {
    it('agrega todas as equipes puramente por estatísticas globais acumuladas', () => {
      const overall = computeOverallStandings(mock4GroupsStandings, {
        strategy: 'pure-overall-stats',
      });

      expect(overall).toHaveLength(12);
      // Em pure-overall-stats, a equipe com mais pontos fica na frente, independente do grupo
      // C1 e A1 têm 6 pts -> top 2
      expect(['C1', 'A1']).toContain(overall[0].teamId);
      expect(['C1', 'A1']).toContain(overall[1].teamId);
      // B1 tem 5 pts -> 3º
      expect(overall[2].teamId).toBe('B1');
      // D1 e D2 têm 4 pts -> 4º e 5º
      expect(['D1', 'D2']).toContain(overall[3].teamId);
      expect(['D1', 'D2']).toContain(overall[4].teamId);
    });
  });

  describe('Seletores e Consultas Puras', () => {
    const overall = computeOverallStandings(mock4GroupsStandings);

    it('getGroupWinners retorna exatamente os 4 vencedores de grupo', () => {
      const winners = getGroupWinners(overall);
      expect(winners).toHaveLength(4);
      expect(winners.map(w => w.teamId)).toEqual(['C1', 'A1', 'B1', 'D1']);
    });

    it('getSecondPlaced retorna os 4 segundos colocados', () => {
      const seconds = getSecondPlaced(overall);
      expect(seconds).toHaveLength(4);
      expect(seconds.every(s => s.groupPosition === 2)).toBe(true);
    });

    it('getThirdPlaced retorna os 4 terceiros colocados', () => {
      const thirds = getThirdPlaced(overall);
      expect(thirds).toHaveLength(4);
      expect(thirds.every(s => s.groupPosition === 3)).toBe(true);
    });

    it('getPositionsRange extrai com precisão a faixa de repescagem/Play-In (5º a 12º)', () => {
      const playInTeams = getPositionsRange(overall, 5, 12);
      expect(playInTeams).toHaveLength(8);
      expect(playInTeams[0].overallRank).toBe(5);
      expect(playInTeams[7].overallRank).toBe(12);
      // Nenhum vencedor de grupo deve estar no Play-In
      expect(playInTeams.some(t => t.groupPosition === 1)).toBe(false);
    });

    it('getPositionsRange extrai com precisão os classificados diretos (1º a 4º)', () => {
      const directQualifiers = getPositionsRange(overall, 1, 4);
      expect(directQualifiers).toHaveLength(4);
      expect(directQualifiers.map(t => t.teamId)).toEqual(['C1', 'A1', 'B1', 'D1']);
    });
  });

  describe('Casos de Borda e Resiliência', () => {
    it('retorna array vazio quando groupStandings estiver vazio', () => {
      const result = computeOverallStandings([]);
      expect(result).toEqual([]);
    });

    it('suporta grupos com tamanhos desiguais (ex: 3 equipes no Grupo A, 2 no Grupo B)', () => {
      const unevenGroups: StandingsByGroup = [
        {
          groupName: 'Grupo A',
          standings: [
            createMockTeamStanding('A1', 'Alpha 1', 'Grupo A', 1, 6, 2, 4.0, 1.25),
            createMockTeamStanding('A2', 'Alpha 2', 'Grupo A', 2, 3, 1, 1.0, 1.05),
            createMockTeamStanding('A3', 'Alpha 3', 'Grupo A', 3, 0, 0, 0.25, 0.80),
          ],
        },
        {
          groupName: 'Grupo B',
          standings: [
            createMockTeamStanding('B1', 'Beta 1', 'Grupo B', 1, 3, 1, 1.5, 1.10),
            createMockTeamStanding('B2', 'Beta 2', 'Grupo B', 2, 0, 0, 0.5, 0.90),
          ],
        },
      ];

      const overall = computeOverallStandings(unevenGroups);
      expect(overall).toHaveLength(5);
      // Top 2 posições: A1 e B1
      expect(overall[0].teamId).toBe('A1');
      expect(overall[1].teamId).toBe('B1');
      // Posições 3 e 4: A2 e B2
      expect(overall[2].teamId).toBe('A2');
      expect(overall[3].teamId).toBe('B2');
      // Posição 5: A3 (única na posição 3)
      expect(overall[4].teamId).toBe('A3');
      expect(overall[4].overallRank).toBe(5);
    });

    it('é estritamente determinístico: mesma entrada produz a mesma saída', () => {
      const run1 = computeOverallStandings(mock4GroupsStandings);
      const run2 = computeOverallStandings(mock4GroupsStandings);
      expect(run1).toEqual(run2);
    });
  });
});
