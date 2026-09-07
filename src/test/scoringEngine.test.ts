import { describe, expect, it } from 'vitest';
import { ScoringEngine } from '@/services/scoringEngine';
import type { CanonicalMatchResult, ScoringSystemConfig } from '@/types/competitionConfig';

function createMockCanonicalResult(overrides: Partial<CanonicalMatchResult>): CanonicalMatchResult {
  return {
    isValid: true,
    status: 'completed',
    winnerId: 'team-1',
    loserId: 'team-2',
    winnerSide: 'A',
    setsWonA: 2,
    setsWonB: 0,
    pointsScoredA: 50,
    pointsScoredB: 40,
    setScores: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 25, scoreB: 20 },
    ],
    isWo: false,
    isCompleted: true,
    isHomologated: true,
    isInconsistent: false,
    ...overrides,
  };
}

describe('ScoringEngine — Motor Puro de Pontuação', () => {
  const fivbConfig: ScoringSystemConfig = ScoringEngine.createPreset('fivb-standard');
  const amateurConfig: ScoringSystemConfig = ScoringEngine.createPreset('simple-amateur');

  describe('Melhor de 3 (SetsToWin = 2)', () => {
    it('calcula vitória 2x0 limpa (FIVB: 3 pts para A, 0 pts para B)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(3);
      expect(res.pointsB).toBe(0);
      expect(res.winnerPoints).toBe(3);
      expect(res.loserPoints).toBe(0);
    });

    it('calcula vitória 2x1 apertada (FIVB: 2 pts para A, 1 pt para B)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 1,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(2);
      expect(res.pointsB).toBe(1);
    });

    it('calcula derrota 1x2 para Team A (FIVB: 1 pt para A, 2 pts para B)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'B',
        setsWonA: 1,
        setsWonB: 2,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(1);
      expect(res.pointsB).toBe(2);
    });

    it('calcula derrota 0x2 para Team A (FIVB: 0 pts para A, 3 pts para B)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'B',
        setsWonA: 0,
        setsWonB: 2,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(0);
      expect(res.pointsB).toBe(3);
    });
  });

  describe('Melhor de 5 (SetsToWin = 3)', () => {
    it('calcula vitória 3x0 limpa (3/0 pts)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'A',
        setsWonA: 3,
        setsWonB: 0,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(3);
      expect(res.pointsB).toBe(0);
    });

    it('calcula vitória 3x1 limpa (3/0 pts)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'A',
        setsWonA: 3,
        setsWonB: 1,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(3);
      expect(res.pointsB).toBe(0);
    });

    it('calcula vitória 3x2 em tiebreak (2/1 pts)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'A',
        setsWonA: 3,
        setsWonB: 2,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(2);
      expect(res.pointsB).toBe(1);
    });

    it('calcula derrota 2x3 em tiebreak (1/2 pts)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'B',
        setsWonA: 2,
        setsWonB: 3,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(1);
      expect(res.pointsB).toBe(2);
    });

    it('calcula derrota 1x3 limpa (0/3 pts)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'B',
        setsWonA: 1,
        setsWonB: 3,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(0);
      expect(res.pointsB).toBe(3);
    });

    it('calcula derrota 0x3 limpa (0/3 pts)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'B',
        setsWonA: 0,
        setsWonB: 3,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.pointsA).toBe(0);
      expect(res.pointsB).toBe(3);
    });
  });

  describe('Preset Alternativo / Amador (2 pts vitória, 1 pt derrota)', () => {
    it('aplica 2 pts para vitória e 1 pt para derrota em qualquer placar jogado', () => {
      const match2x0 = createMockCanonicalResult({ winnerSide: 'A', setsWonA: 2, setsWonB: 0 });
      const res2x0 = ScoringEngine.calculatePoints(match2x0, amateurConfig);
      expect(res2x0.pointsA).toBe(2);
      expect(res2x0.pointsB).toBe(1);

      const match2x1 = createMockCanonicalResult({ winnerSide: 'A', setsWonA: 2, setsWonB: 1 });
      const res2x1 = ScoringEngine.calculatePoints(match2x1, amateurConfig);
      expect(res2x1.pointsA).toBe(2);
      expect(res2x1.pointsB).toBe(1);
    });
  });

  describe('Tratamento de W.O. (Walkover)', () => {
    it('concede pontos de W.O. padrão para vencedor e perdedor (3/0)', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'A',
        isWo: true,
        setsWonA: 2,
        setsWonB: 0,
      });

      const res = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(res.isWo).toBe(true);
      expect(res.pointsA).toBe(3);
      expect(res.pointsB).toBe(0);
    });

    it('permite configuração de W.O. com penalidade disciplinar (-1 ponto para perdedor)', () => {
      const customConfig: ScoringSystemConfig = {
        ...fivbConfig,
        pointsWoWin: 2,
        pointsWoLoss: -1,
      };

      const canonical = createMockCanonicalResult({
        winnerSide: 'B',
        isWo: true,
        setsWonA: 0,
        setsWonB: 2,
      });

      const res = ScoringEngine.calculatePoints(canonical, customConfig);
      expect(res.pointsA).toBe(-1);
      expect(res.pointsB).toBe(2);
    });
  });

  describe('Casos de Borda e Determinismo', () => {
    it('retorna 0 pontos para ambas as equipes se a partida não estiver completada', () => {
      const incomplete = createMockCanonicalResult({
        isCompleted: false,
        winnerSide: null,
      });

      const res = ScoringEngine.calculatePoints(incomplete, fivbConfig);
      expect(res.pointsA).toBe(0);
      expect(res.pointsB).toBe(0);
    });

    it('retorna 0 pontos se o resultado for inválido', () => {
      const invalid = createMockCanonicalResult({
        isValid: false,
      });

      const res = ScoringEngine.calculatePoints(invalid, fivbConfig);
      expect(res.pointsA).toBe(0);
      expect(res.pointsB).toBe(0);
    });

    it('é puramente determinístico: mesma entrada produz estritamente a mesma saída', () => {
      const canonical = createMockCanonicalResult({
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 1,
      });

      const run1 = ScoringEngine.calculatePoints(canonical, fivbConfig);
      const run2 = ScoringEngine.calculatePoints(canonical, fivbConfig);
      expect(run1).toEqual(run2);
    });
  });
});
