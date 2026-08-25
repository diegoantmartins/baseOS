import { describe, it, expect } from 'vitest';
import type { MatchRecord, SetScoreRecord } from '@/types/entities';

describe('Fase 3 — Live Match Scorer & Mesa do Apontador', () => {
  const sampleMatch: MatchRecord = {
    id: 'match-live-1',
    competitionId: 'comp-1',
    round: 1,
    matchNumber: 10,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: 'Osasco Vôlei',
    teamBName: 'Minas Tênis',
    teamAShortName: 'OSA',
    teamBShortName: 'MIN',
    venue: 'Ginásio José Liberatti',
    scheduledTime: '2026-08-30T18:00:00Z',
    status: 'in-progress',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 22 },
      { setNumber: 2, scoreA: 23, scoreB: 25 },
    ],
    referees: [{ role: '1º Árbitro', name: 'Árbitro Oficial' }],
    createdAt: '',
    updatedAt: '',
  };

  describe('Cálculo de Sets Ganhos', () => {
    it('deve calcular corretamente os sets ganhos por cada equipe', () => {
      const sets = sampleMatch.sets;
      const setsWonA = sets.filter(s => s.scoreA > s.scoreB).length;
      const setsWonB = sets.filter(s => s.scoreB > s.scoreA).length;

      expect(setsWonA).toBe(1);
      expect(setsWonB).toBe(1);
    });

    it('deve identificar vencedor de partida Melhor de 3 ao atingir 2 sets ganhos', () => {
      const setsBestOf3: SetScoreRecord[] = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
      ];
      const setsWonA = setsBestOf3.filter(s => s.scoreA > s.scoreB).length;
      const maxSetsToWin = 2;

      expect(setsWonA >= maxSetsToWin).toBe(true);
    });

    it('deve identificar vencedor de partida Melhor de 5 ao atingir 3 sets ganhos', () => {
      const setsBestOf5: SetScoreRecord[] = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 18 },
        { setNumber: 4, scoreA: 25, scoreB: 23 },
      ];
      const setsWonA = setsBestOf5.filter(s => s.scoreA > s.scoreB).length;
      const maxSetsToWin = 3;

      expect(setsWonA >= maxSetsToWin).toBe(true);
    });
  });

  describe('Regra de Término de Set (25 ou 15 pts com diferença mínima de 2)', () => {
    const isSetFinished = (scoreA: number, scoreB: number, target: number) => {
      return (scoreA >= target || scoreB >= target) && Math.abs(scoreA - scoreB) >= 2;
    };

    it('não deve finalizar com 24 x 23 (abaixo de 25)', () => {
      expect(isSetFinished(24, 23, 25)).toBe(false);
    });

    it('não deve finalizar com 25 x 24 (diferença de apenas 1 ponto)', () => {
      expect(isSetFinished(25, 24, 25)).toBe(false);
    });

    it('deve finalizar com 25 x 23 (atingiu 25 com 2 de vantagem)', () => {
      expect(isSetFinished(25, 23, 25)).toBe(true);
    });

    it('deve estender set acima de 25 até atingir 2 de vantagem (ex: 28 x 26)', () => {
      expect(isSetFinished(27, 26, 25)).toBe(false);
      expect(isSetFinished(28, 26, 25)).toBe(true);
    });

    it('no Tie-break (meta 15), deve finalizar com 15 x 13 ou estender até 2 de vantagem', () => {
      expect(isSetFinished(14, 14, 15)).toBe(false);
      expect(isSetFinished(15, 14, 15)).toBe(false);
      expect(isSetFinished(15, 13, 15)).toBe(true);
      expect(isSetFinished(17, 15, 15)).toBe(true);
    });
  });

  describe('Controle de Pedidos de Tempo (Timeouts)', () => {
    it('deve limitar a 2 tempos por set por equipe', () => {
      let timeoutsA = 0;
      const maxTimeouts = 2;

      // Pedido 1
      expect(timeoutsA < maxTimeouts).toBe(true);
      timeoutsA++;

      // Pedido 2
      expect(timeoutsA < maxTimeouts).toBe(true);
      timeoutsA++;

      // Pedido 3 -> Bloqueado
      expect(timeoutsA < maxTimeouts).toBe(false);
    });
  });
});
