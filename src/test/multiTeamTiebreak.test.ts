import { describe, expect, it } from 'vitest';
import { TieBreakEngine } from '@/services/tieBreakEngine';
import { computeStandingsWithMiniTable } from '@/services/standingsService';
import type { MatchRecord, TeamRecord, TiebreakCriterionId } from '@/types/entities';

function createTeam(id: string, name: string): TeamRecord {
  return {
    id,
    name,
    shortName: id.slice(0, 3).toUpperCase(),
    modality: 'indoor',
  };
}

function createCompletedMatch(
  id: string,
  teamAId: string,
  teamBId: string,
  setScores: Array<{ scoreA: number; scoreB: number }>,
): MatchRecord {
  const setsWonA = setScores.filter(s => s.scoreA > s.scoreB).length;
  const setsWonB = setScores.filter(s => s.scoreB > s.scoreA).length;

  return {
    id,
    competitionId: 'comp-1',
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

describe('TieBreakEngine — Algoritmo de Mini-Tabela e Desempate Multi-Equipe', () => {
  const teamA = createTeam('team-a', 'Equipe Alpha');
  const teamB = createTeam('team-b', 'Equipe Beta');
  const teamC = createTeam('team-c', 'Equipe Charlie');
  const teamD = createTeam('team-d', 'Equipe Delta');

  describe('Empate entre 2 Equipes', () => {
    it('desempata por confronto direto simples quando 2 equipes estão empatadas em pontos', () => {
      // Team A vence Team B por 2x0 (3 pontos para A, 0 para B)
      // Team A perde para D (0x2) -> A termina com 3 pontos
      // Team B vence D (2x0) -> B termina com 3 pontos
      const matches: MatchRecord[] = [
        createCompletedMatch('m1', 'team-a', 'team-b', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
        createCompletedMatch('m2', 'team-a', 'team-d', [{ scoreA: 20, scoreB: 25 }, { scoreA: 20, scoreB: 25 }]),
        createCompletedMatch('m3', 'team-b', 'team-d', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
      ];

      const standings = computeStandingsWithMiniTable(
        [{ team: teamA }, { team: teamB }],
        matches,
        { criteria: ['points', 'head-to-head-mini-table', 'draw'] },
      );

      expect(standings[0].teamId).toBe('team-a');
      expect(standings[0].position).toBe(1);
      expect(standings[0].tiebreakReason).toContain('confronto direto');
      expect(standings[1].teamId).toBe('team-b');
      expect(standings[1].position).toBe(2);
    });
  });

  describe('Empate entre 3 Equipes com Desempate Parcial (A > B = C)', () => {
    it('isola a equipe dominante na mini-tabela e desempata recursivamente o subgrupo restante', () => {
      // Mini-tabela entre A, B e C:
      // A vence B (2x0)
      // A vence C (2x0)
      // B vence C (2x1)
      // Fora do subgrupo: todas têm pontuação idêntica
      const matches: MatchRecord[] = [
        createCompletedMatch('m1', 'team-a', 'team-b', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
        createCompletedMatch('m2', 'team-a', 'team-c', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
        createCompletedMatch('m3', 'team-b', 'team-c', [
          { scoreA: 25, scoreB: 20 },
          { scoreA: 20, scoreB: 25 },
          { scoreA: 15, scoreB: 10 },
        ]),
      ];

      const standings = computeStandingsWithMiniTable(
        [{ team: teamC }, { team: teamA }, { team: teamB }],
        matches,
        { criteria: ['points', 'head-to-head-mini-table', 'draw'] },
      );

      // A venceu B e C -> 1º lugar
      expect(standings[0].teamId).toBe('team-a');
      expect(standings[0].position).toBe(1);

      // Entre B e C: B venceu C -> B fica em 2º, C fica em 3º
      expect(standings[1].teamId).toBe('team-b');
      expect(standings[1].position).toBe(2);

      expect(standings[2].teamId).toBe('team-c');
      expect(standings[2].position).toBe(3);
    });
  });

  describe('Ciclos em 3 Equipes (A vence B, B vence C, C vence A)', () => {
    it('detecta ciclo irredutível na mini-tabela e avança estritamente para o próximo critério configurado', () => {
      // Ciclo perfeito com parciais idênticas:
      // A vence B 2x0 (25-20, 25-20)
      // B vence C 2x0 (25-20, 25-20)
      // C vence A 2x0 (25-20, 25-20)
      const matches: MatchRecord[] = [
        createCompletedMatch('m1', 'team-a', 'team-b', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
        createCompletedMatch('m2', 'team-b', 'team-c', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
        createCompletedMatch('m3', 'team-c', 'team-a', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
      ];

      // Cenário 1: Sem critério de desempate final ('draw' omitido propositalmente)
      // O regulamento não configurou sorteio!
      const criteriaSemSorteio: TiebreakCriterionId[] = [
        'points',
        'head-to-head-mini-table',
        'set-average',
        'points-average',
      ];

      const standingsSemSorteio = computeStandingsWithMiniTable(
        [{ team: teamA }, { team: teamB }, { team: teamC }],
        matches,
        { criteria: criteriaSemSorteio },
      );

      // Todas permanecem empatadas! Não se inventa regra de sorteio se ela não foi configurada.
      expect(standingsSemSorteio[0].unresolvedTie).toBe(true);
      expect(standingsSemSorteio[1].unresolvedTie).toBe(true);
      expect(standingsSemSorteio[2].unresolvedTie).toBe(true);
      // Compartilham a posição 1
      expect(standingsSemSorteio[0].position).toBe(1);
      expect(standingsSemSorteio[1].position).toBe(1);
      expect(standingsSemSorteio[2].position).toBe(1);

      // Cenário 2: Com critério de 'draw' explicitamente configurado pelo regulamento
      const criteriaComSorteio: TiebreakCriterionId[] = [
        'points',
        'head-to-head-mini-table',
        'draw',
      ];

      const standingsComSorteio = computeStandingsWithMiniTable(
        [{ team: teamC }, { team: teamB }, { team: teamA }],
        matches,
        { criteria: criteriaComSorteio },
      );

      // Com sorteio configurado, desempata pelo ID estável de forma determinística
      expect(standingsComSorteio.map(s => s.teamId)).toEqual(['team-a', 'team-b', 'team-c']);
      expect(standingsComSorteio[0].position).toBe(1);
      expect(standingsComSorteio[1].position).toBe(2);
      expect(standingsComSorteio[2].position).toBe(3);
    });
  });

  describe('Empate entre 4 Equipes', () => {
    it('desempata 4 equipes com mini-tabela gerando grupos parciais', () => {
      // 4 equipes:
      // A vence B (3-0) e C (3-0), perde para D (0-3) -> 6 pts na mini-tabela
      // D vence A (3-0), B (3-0) e C (3-0) -> 9 pts na mini-tabela
      // B vence C (3-0), perde para A e D -> 3 pts na mini-tabela
      // C perde para todas -> 0 pts na mini-tabela
      const matches: MatchRecord[] = [
        createCompletedMatch('m1', 'team-d', 'team-a', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
        createCompletedMatch('m2', 'team-d', 'team-b', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
        createCompletedMatch('m3', 'team-d', 'team-c', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
        createCompletedMatch('m4', 'team-a', 'team-b', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
        createCompletedMatch('m5', 'team-a', 'team-c', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
        createCompletedMatch('m6', 'team-b', 'team-c', [{ scoreA: 25, scoreB: 20 }, { scoreA: 25, scoreB: 20 }]),
      ];

      const standings = computeStandingsWithMiniTable(
        [{ team: teamC }, { team: teamB }, { team: teamA }, { team: teamD }],
        matches,
        { criteria: ['points', 'head-to-head-mini-table', 'draw'] },
      );

      expect(standings.map(s => s.teamId)).toEqual(['team-d', 'team-a', 'team-b', 'team-c']);
      expect(standings[0].position).toBe(1);
      expect(standings[1].position).toBe(2);
      expect(standings[2].position).toBe(3);
      expect(standings[3].position).toBe(4);
    });
  });

  describe('Determinismo e Independência da Ordem de Entrada', () => {
    it('produz rigorosamente a mesma classificação independentemente da ordem inicial do array', () => {
      const matches: MatchRecord[] = [
        createCompletedMatch('m1', 'team-a', 'team-b', [{ scoreA: 25, scoreB: 15 }, { scoreA: 25, scoreB: 15 }]),
        createCompletedMatch('m2', 'team-b', 'team-c', [{ scoreA: 25, scoreB: 18 }, { scoreA: 25, scoreB: 18 }]),
        createCompletedMatch('m3', 'team-a', 'team-c', [{ scoreA: 25, scoreB: 12 }, { scoreA: 25, scoreB: 12 }]),
      ];

      const order1 = computeStandingsWithMiniTable(
        [{ team: teamA }, { team: teamB }, { team: teamC }],
        matches,
      );

      const order2 = computeStandingsWithMiniTable(
        [{ team: teamC }, { team: teamA }, { team: teamB }],
        matches,
      );

      const order3 = computeStandingsWithMiniTable(
        [{ team: teamB }, { team: teamC }, { team: teamA }],
        matches,
      );

      expect(order1.map(s => s.teamId)).toEqual(order2.map(s => s.teamId));
      expect(order1.map(s => s.teamId)).toEqual(order3.map(s => s.teamId));
    });
  });
});
