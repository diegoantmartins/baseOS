import { describe, expect, it } from 'vitest';
import {
  ANIMATION_TIMINGS,
  SCENE3D_REVEAL_MS,
  resolveDrawTimings,
} from '@/config/drawArenaFeatures';

describe('drawArenaFeatures — timing centralizado', () => {
  it('expõe um timing de cena 3D alinhado à prescrição documental (~4–5s)', () => {
    expect(SCENE3D_REVEAL_MS).toBeGreaterThanOrEqual(3500);
    expect(SCENE3D_REVEAL_MS).toBeLessThanOrEqual(6000);
  });

  it('a soma das sub-fases por equipe fica dentro de ~4–6s', () => {
    const timing = resolveDrawTimings(ANIMATION_TIMINGS.PREPARE_MS);
    const totalPerTeam = timing.prepare + timing.revealHold + timing.groupHold;
    expect(totalPerTeam).toBeGreaterThanOrEqual(4000);
    expect(totalPerTeam).toBeLessThanOrEqual(6500);
  });

  it('escala os holds proporcionalmente ao tempo de preparo (um único controle)', () => {
    const slow = resolveDrawTimings(5000);
    const fast = resolveDrawTimings(1500);

    // preparo mais lento => holds mais longos
    expect(slow.revealHold).toBeGreaterThan(fast.revealHold);
    expect(slow.groupHold).toBeGreaterThan(fast.groupHold);

    // proporções fixas => sem números mágicos espalhados
    expect(slow.revealHold).toBeCloseTo(slow.prepare * 0.55, 0);
    expect(slow.groupHold).toBeCloseTo(slow.prepare * 0.4, 0);
  });

  it('o tempo mínimo de preparo respeita o limite definido', () => {
    expect(resolveDrawTimings(0).prepare).toBe(ANIMATION_TIMINGS.MIN_REVEAL_MS);
    expect(resolveDrawTimings(0).prepare).toBeGreaterThanOrEqual(1000);
  });

  it('limites do slider de velocidade são coerentes', () => {
    expect(ANIMATION_TIMINGS.MIN_REVEAL_MS).toBeLessThan(ANIMATION_TIMINGS.MAX_REVEAL_MS);
    expect(ANIMATION_TIMINGS.STEP_MS).toBeGreaterThan(0);
  });
});
