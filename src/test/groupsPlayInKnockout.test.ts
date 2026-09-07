import { describe, expect, it } from 'vitest';
import {
  computeOverallStandings,
  getPositionsRange,
  type OverallStandingResult,
} from '@/services/overallStandingsEngine';
import { computeStandingsWithMiniTable } from '@/services/standingsService';
import { ScoringEngine } from '@/services/scoringEngine';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import type { MatchRecord, TeamRecord } from '@/types/entities';

function createTeam(id: string, name: string): TeamRecord {
  return {
    id,
    name,
    shortName: id.slice(0, 3).toUpperCase(),
    modality: 'indoor',
  };
}

function createMatch(
  id: string,
  teamAId: string,
  teamBId: string,
  setScores: Array<{ scoreA: number; scoreB: number }>,
): MatchRecord {
  const setsWonA = setScores.filter(s => s.scoreA > s.scoreB).length;
  const setsWonB = setScores.filter(s => s.scoreB > s.scoreA).length;

  return {
    id,
    competitionId: 'comp-engine-proof',
    teamAId,
    teamBId,
    scheduledTime: '2026-09-05T10:00:00Z',
    status: 'completed',
    setsWonA,
    setsWonB,
    sets: setScores.map((s, idx) => ({ setNumber: idx + 1, ...s })),
    setScores: setScores.map((s, idx) => ({ setNumber: idx + 1, ...s })),
    homologatedAt: '2026-09-05T12:00:00Z',
  } as unknown as MatchRecord;
}

/**
 * Função genérica de emparelhamento por chaveamento alto-baixo (high-low seed pairing).
 * Emparelha a equipe de melhor ranking com a de pior ranking dentro do subconjunto:
 * 1º vs N-ésimo, 2º vs (N-1)-ésimo, etc.
 * NENHUMA regra hardcoded para tamanho específico de torneio.
 */
function generateHighLowPairings(
  teams: OverallStandingResult[],
): Array<{ matchNumber: number; homeTeam: OverallStandingResult; awayTeam: OverallStandingResult }> {
  const sorted = [...teams].sort((a, b) => a.overallRank - b.overallRank);
  const n = sorted.length;
  const pairings: Array<{ matchNumber: number; homeTeam: OverallStandingResult; awayTeam: OverallStandingResult }> = [];

  for (let i = 0; i < Math.floor(n / 2); i++) {
    pairings.push({
      matchNumber: i + 1,
      homeTeam: sorted[i],
      awayTeam: sorted[n - 1 - i],
    });
  }

  return pairings;
}

describe("Formato 'groups-play-in-knockout' — Prova de Domínio e Expressividade", () => {
  describe('Cenário de Homologação: 12 Equipes (4 Grupos de 3, Play-In 5-12, Quartas, Semis e Final)', () => {
    // 12 Equipes
    const teams: TeamRecord[] = Array.from({ length: 12 }, (_, i) =>
      createTeam(`team-${i + 1}`, `Equipe ${String.fromCharCode(65 + i)}`),
    );

    // Divisão em 4 grupos de 3:
    // Grupo A: team-1, team-2, team-3
    // Grupo B: team-4, team-5, team-6
    // Grupo C: team-7, team-8, team-9
    // Grupo D: team-10, team-11, team-12
    const groupA = [teams[0], teams[1], teams[2]];
    const groupB = [teams[3], teams[4], teams[5]];
    const groupC = [teams[6], teams[7], teams[8]];
    const groupD = [teams[9], teams[10], teams[11]];

    // Partidas da Fase de Grupos (Turno Único, 3 jogos por grupo, 2 jogos por equipe)
    const groupMatches: MatchRecord[] = [
      // Grupo A: team-1 vence 2 (3-0), team-2 vence 1 (3-0), team-3 perde 2 (0-3)
      createMatch('gA-1', 'team-1', 'team-2', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
      createMatch('gA-2', 'team-1', 'team-3', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
      createMatch('gA-3', 'team-2', 'team-3', [{ scoreA: 25, scoreB: 18 }, { scoreA: 25, scoreB: 18 }]),

      // Grupo B: team-4 vence 2, team-5 vence 1, team-6 perde 2
      createMatch('gB-1', 'team-4', 'team-5', [{ scoreA: 25, scoreB: 16 }, { scoreA: 25, scoreB: 16 }]),
      createMatch('gB-2', 'team-4', 'team-6', [{ scoreA: 25, scoreB: 16 }, { scoreA: 25, scoreB: 16 }]),
      createMatch('gB-3', 'team-5', 'team-6', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),

      // Grupo C: team-7 vence 2, team-8 vence 1, team-9 perde 2
      createMatch('gC-1', 'team-7', 'team-8', [{ scoreA: 25, scoreB: 17 }, { scoreA: 25, scoreB: 17 }]),
      createMatch('gC-2', 'team-7', 'team-9', [{ scoreA: 25, scoreB: 17 }, { scoreA: 25, scoreB: 17 }]),
      createMatch('gC-3', 'team-8', 'team-9', [{ scoreA: 25, scoreB: 21 }, { scoreA: 25, scoreB: 21 }]),

      // Grupo D: team-10 vence 2, team-11 vence 1, team-12 perde 2
      createMatch('gD-1', 'team-10', 'team-11', [{ scoreA: 25, scoreB: 18 }, { scoreA: 25, scoreB: 18 }]),
      createMatch('gD-2', 'team-10', 'team-12', [{ scoreA: 25, scoreB: 18 }, { scoreA: 25, scoreB: 18 }]),
      createMatch('gD-3', 'team-11', 'team-12', [{ scoreA: 25, scoreB: 22 }, { scoreA: 25, scoreB: 22 }]),
    ];

    it('executa a fase de grupos, consolida o ranking geral de 1 a 12 e classifica 1-4 diretamente', () => {
      // 1. Apuração da classificação de cada grupo individualmente
      const standingsA = computeStandingsWithMiniTable(groupA.map(t => ({ team: t, groupName: 'Grupo A' })), groupMatches);
      const standingsB = computeStandingsWithMiniTable(groupB.map(t => ({ team: t, groupName: 'Grupo B' })), groupMatches);
      const standingsC = computeStandingsWithMiniTable(groupC.map(t => ({ team: t, groupName: 'Grupo C' })), groupMatches);
      const standingsD = computeStandingsWithMiniTable(groupD.map(t => ({ team: t, groupName: 'Grupo D' })), groupMatches);

      const groupStandings = [
        { groupName: 'Grupo A', standings: standingsA },
        { groupName: 'Grupo B', standings: standingsB },
        { groupName: 'Grupo C', standings: standingsC },
        { groupName: 'Grupo D', standings: standingsD },
      ];

      // 2. Consolidação do Ranking Geral Intergrupos
      const overall = computeOverallStandings(groupStandings, { strategy: 'by-group-position-first' });
      expect(overall).toHaveLength(12);

      // 3. Vagas Diretas: Posições 1 a 4
      const directQualifiers = getPositionsRange(overall, 1, 4);
      expect(directQualifiers).toHaveLength(4);
      expect(directQualifiers.map(t => t.teamId)).toEqual(['team-1', 'team-4', 'team-7', 'team-10']);
      expect(directQualifiers.every(t => t.groupPosition === 1)).toBe(true);

      // 4. Vagas de Play-In: Posições 5 a 12
      const playInTeams = getPositionsRange(overall, 5, 12);
      expect(playInTeams).toHaveLength(8);
      expect(playInTeams[0].overallRank).toBe(5);
      expect(playInTeams[7].overallRank).toBe(12);

      // 5. Geração de confrontos do Play-in por regra de pairing genérica (high-low)
      const playInPairings = generateHighLowPairings(playInTeams);
      expect(playInPairings).toHaveLength(4);

      // Validação dos cruzamentos gerados pela regra de pareamento:
      // Jogo 1: 5º vs 12º
      expect(playInPairings[0].homeTeam.overallRank).toBe(5);
      expect(playInPairings[0].awayTeam.overallRank).toBe(12);

      // Jogo 2: 6º vs 11º
      expect(playInPairings[1].homeTeam.overallRank).toBe(6);
      expect(playInPairings[1].awayTeam.overallRank).toBe(11);

      // Jogo 3: 7º vs 10º
      expect(playInPairings[2].homeTeam.overallRank).toBe(7);
      expect(playInPairings[2].awayTeam.overallRank).toBe(10);

      // Jogo 4: 8º vs 9º
      expect(playInPairings[3].homeTeam.overallRank).toBe(8);
      expect(playInPairings[3].awayTeam.overallRank).toBe(9);

      // Na Fase 4.3, o teste comprova que o domínio matemático entrega as 4 vagas diretas
      // e os 8 participantes do Play-in emparelhados de forma puramente configurável.
      // A execução e progressão das rodadas do Play-In e Knockout pertencem à Fase 4.4.
    });
  });

  describe('Cenário de Generalização: 6 Equipes (2 Grupos de 3, Play-In 3-6, Semifinais e Final)', () => {
    // Prova de que a arquitetura não possui nenhuma amarração a 12 equipes ou 4 grupos
    const teams: TeamRecord[] = Array.from({ length: 6 }, (_, i) =>
      createTeam(`team-${i + 1}`, `Equipe ${i + 1}`),
    );

    const groupA = [teams[0], teams[1], teams[2]];
    const groupB = [teams[3], teams[4], teams[5]];

    const matches: MatchRecord[] = [
      // Grupo A
      createMatch('gA-1', 'team-1', 'team-2', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
      createMatch('gA-2', 'team-1', 'team-3', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
      createMatch('gA-3', 'team-2', 'team-3', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
      // Grupo B
      createMatch('gB-1', 'team-4', 'team-5', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
      createMatch('gB-2', 'team-4', 'team-6', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
      createMatch('gB-3', 'team-5', 'team-6', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
    ];

    it('aplica o mesmo modelo matemático para classificar 1-2 direto e 3-6 para Play-in de 4 vagas', () => {
      const standingsA = computeStandingsWithMiniTable(groupA.map(t => ({ team: t, groupName: 'Grupo A' })), matches);
      const standingsB = computeStandingsWithMiniTable(groupB.map(t => ({ team: t, groupName: 'Grupo B' })), matches);

      const overall = computeOverallStandings([
        { groupName: 'Grupo A', standings: standingsA },
        { groupName: 'Grupo B', standings: standingsB },
      ]);

      expect(overall).toHaveLength(6);

      // Classificados diretos: posições 1 e 2
      const directQualifiers = getPositionsRange(overall, 1, 2);
      expect(directQualifiers).toHaveLength(2);
      expect(directQualifiers.map(t => t.teamId)).toEqual(['team-1', 'team-4']);

      // Play-in com as posições 3 a 6 (4 equipes)
      const playInTeams = getPositionsRange(overall, 3, 6);
      expect(playInTeams).toHaveLength(4);

      // Mesma regra genérica de emparelhamento high-low
      const pairings = generateHighLowPairings(playInTeams);
      expect(pairings).toHaveLength(2);

      // Jogo 1: 3º vs 6º
      expect(pairings[0].homeTeam.overallRank).toBe(3);
      expect(pairings[0].awayTeam.overallRank).toBe(6);

      // Jogo 2: 4º vs 5º
      expect(pairings[1].homeTeam.overallRank).toBe(4);
      expect(pairings[1].awayTeam.overallRank).toBe(5);

      // Na Fase 4.3, o teste comprova que o domínio matemático entrega as 2 vagas diretas
      // e os 4 participantes do Play-in emparelhados de forma puramente configurável.
    });
  });
});
