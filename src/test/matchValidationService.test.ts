import { describe, it, expect } from 'vitest';
import { validateSingleSet, validateMatchResult, DEFAULT_INDOOR_CONFIG } from '@/services/matchValidationService';

describe('matchValidationService', () => {
  describe('validateSingleSet', () => {
    it('valida set regular de 25 pontos com vantagem de 2', () => {
      const res = validateSingleSet(1, 25, 23, DEFAULT_INDOOR_CONFIG, false);
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
    });

    it('valida set estendido após empate (ex: 28x26)', () => {
      const res = validateSingleSet(1, 26, 28, DEFAULT_INDOOR_CONFIG, false);
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('B');
    });

    it('rejeita set incompleto que não atingiu a pontuação mínima', () => {
      const res = validateSingleSet(1, 20, 15, DEFAULT_INDOOR_CONFIG, false);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('mínimo 25 pontos');
    });

    it('rejeita set sem diferença mínima de 2 pontos (ex: 25x24)', () => {
      const res = validateSingleSet(1, 25, 24, DEFAULT_INDOOR_CONFIG, false);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('pelo menos 2 pontos');
    });

    it('rejeita set estendido com diferença maior que 2 (ex: 28x25)', () => {
      const res = validateSingleSet(1, 28, 25, DEFAULT_INDOOR_CONFIG, false);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exatamente com 2 pontos de vantagem');
    });

    it('valida tiebreak de 15 pontos', () => {
      const res = validateSingleSet(3, 15, 13, DEFAULT_INDOOR_CONFIG, true);
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
    });
  });

  describe('validateMatchResult', () => {
    it('valida vitória 2x0 em melhor de 3', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
      ];
      const res = validateMatchResult(sets, { ...DEFAULT_INDOOR_CONFIG, setFormat: '3-sets' });
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
      expect(res.scoreA).toBe(2);
      expect(res.scoreB).toBe(0);
    });

    it('valida vitória 2x1 em melhor de 3 com tiebreak', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 15, scoreB: 12 },
      ];
      const res = validateMatchResult(sets, { ...DEFAULT_INDOOR_CONFIG, setFormat: '3-sets' });
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
      expect(res.scoreA).toBe(2);
      expect(res.scoreB).toBe(1);
    });

    it('bloqueia resultado 3x0 em partida melhor de 3 sets', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 20 },
        { setNumber: 3, scoreA: 25, scoreB: 20 },
      ];
      const res = validateMatchResult(sets, { ...DEFAULT_INDOOR_CONFIG, setFormat: '3-sets' });
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('A partida já havia sido encerrada antes deste set');
    });

    it('valida vitória 3x2 em melhor de 5 com tiebreak', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 23, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 22 },
        { setNumber: 4, scoreA: 22, scoreB: 25 },
        { setNumber: 5, scoreA: 15, scoreB: 13 },
      ];
      const res = validateMatchResult(sets, { ...DEFAULT_INDOOR_CONFIG, setFormat: '5-sets' });
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
      expect(res.scoreA).toBe(3);
      expect(res.scoreB).toBe(2);
    });

    it('valida resultado por WO', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 0 },
        { setNumber: 2, scoreA: 25, scoreB: 0 },
      ];
      const res = validateMatchResult(sets, { ...DEFAULT_INDOOR_CONFIG, setFormat: '3-sets' }, true);
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
      expect(res.scoreA).toBe(2);
      expect(res.scoreB).toBe(0);
    });
  });
});
