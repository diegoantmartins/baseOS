import { describe, expect, it } from 'vitest';
import type { ParticipantSlotState } from '@/types/competitionConfig';
import { GenericPairingEngine, getSeededPairings } from '@/services/genericPairingEngine';
import { createByeParticipantSlot, createResolvedParticipantSlot, createUnresolvedParticipantSlot } from '@/types/competitionConfig';

describe('GenericPairingEngine', () => {
  it('gera sementes canônicas para bracket eliminatório (getSeededPairings)', () => {
    // Para tamanho 2: [1, 2]
    expect(getSeededPairings(2)).toEqual([[1, 2]]);

    // Para tamanho 4: [1, 4], [2, 3] (Semente 1 e 2 em lados opostos)
    expect(getSeededPairings(4)).toEqual([[1, 4], [2, 3]]);

    // Para tamanho 8: [[1, 8], [4, 5], [2, 7], [3, 6]]
    expect(getSeededPairings(8)).toEqual([[1, 8], [4, 5], [2, 7], [3, 6]]);
  });

  describe('High-Low Pairing', () => {
    it('emparelha 8 equipes no formato 1x8, 2x7, 3x6, 4x5', () => {
      const participants: ParticipantSlotState[] = Array.from({ length: 8 }, (_, i) => {
        const rank = i + 1;
        return createResolvedParticipantSlot('A', `team-${rank}`, `Equipe ${rank}`);
      });

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'high-low' },
        { stageId: 'knockout', roundId: 'qf', labelPrefix: 'Quartas' },
      );

      expect(slots).toHaveLength(4);

      // Jogo 1: 1 x 8
      expect(slots[0].participantA.resolvedTeamId).toBe('team-1');
      expect(slots[0].participantB.resolvedTeamId).toBe('team-8');
      expect(slots[0].slotId).toBe('knockout-qf-SLOT-01');

      // Jogo 2: 2 x 7
      expect(slots[1].participantA.resolvedTeamId).toBe('team-2');
      expect(slots[1].participantB.resolvedTeamId).toBe('team-7');

      // Jogo 3: 3 x 6
      expect(slots[2].participantA.resolvedTeamId).toBe('team-3');
      expect(slots[2].participantB.resolvedTeamId).toBe('team-6');

      // Jogo 4: 4 x 5
      expect(slots[3].participantA.resolvedTeamId).toBe('team-4');
      expect(slots[3].participantB.resolvedTeamId).toBe('team-5');
    });

    it('emparelha Play-In de 8 equipes do ranking 5 ao 12: 5x12, 6x11, 7x10, 8x9', () => {
      const participants: ParticipantSlotState[] = [5, 6, 7, 8, 9, 10, 11, 12].map(rank =>
        createUnresolvedParticipantSlot(
          'A',
          { type: 'overall-ranking', stageId: 'groups', position: rank },
          `${rank}º Geral`,
        ),
      );

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'high-low' },
        { stageId: 'play-in', roundId: 'r1', slotIdPrefix: 'PLAYIN' },
      );

      expect(slots).toHaveLength(4);

      // 5 x 12
      expect(slots[0].participantA.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 5 });
      expect(slots[0].participantB.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 12 });

      // 6 x 11
      expect(slots[1].participantA.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 6 });
      expect(slots[1].participantB.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 11 });

      // 7 x 10
      expect(slots[2].participantA.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 7 });
      expect(slots[2].participantB.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 10 });

      // 8 x 9
      expect(slots[3].participantA.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 8 });
      expect(slots[3].participantB.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 9 });
    });

    it('insere BYE no lado B quando número de participantes for ímpar', () => {
      const participants = [
        createResolvedParticipantSlot('A', 'team-1', 'Alpha'),
        createResolvedParticipantSlot('A', 'team-2', 'Beta'),
        createResolvedParticipantSlot('A', 'team-3', 'Gamma'),
      ];

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'high-low' },
        { stageId: 'knockout', roundId: 'r1' },
      );

      expect(slots).toHaveLength(2);
      // Jogo 1: Team 1 vs BYE
      expect(slots[0].participantA.resolvedTeamId).toBe('team-1');
      expect(slots[0].participantB.isBye).toBe(true);
      expect(slots[0].participantB.status).toBe('bye');

      // Jogo 2: Team 2 vs Team 3
      expect(slots[1].participantA.resolvedTeamId).toBe('team-2');
      expect(slots[1].participantB.resolvedTeamId).toBe('team-3');
    });
  });

  describe('Same-Position Cross Pairing', () => {
    it('cruza 2 grupos: 1ºA x 2ºB e 1ºB x 2ºA', () => {
      const participants: ParticipantSlotState[] = [
        createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: 'groups', groupIndex: 0, position: 1 }, '1ºA'),
        createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: 'groups', groupIndex: 0, position: 2 }, '2ºA'),
        createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: 'groups', groupIndex: 1, position: 1 }, '1ºB'),
        createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: 'groups', groupIndex: 1, position: 2 }, '2ºB'),
      ];

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'same-position-cross' },
        { stageId: 'knockout', roundId: 'semis' },
      );

      expect(slots).toHaveLength(2);

      // Semi 1: 1ºA x 2ºB
      expect(slots[0].participantA.reference).toEqual({ type: 'group-position', stageId: 'groups', groupIndex: 0, position: 1 });
      expect(slots[0].participantB.reference).toEqual({ type: 'group-position', stageId: 'groups', groupIndex: 1, position: 2 });

      // Semi 2: 1ºB x 2ºA
      expect(slots[1].participantA.reference).toEqual({ type: 'group-position', stageId: 'groups', groupIndex: 1, position: 1 });
      expect(slots[1].participantB.reference).toEqual({ type: 'group-position', stageId: 'groups', groupIndex: 0, position: 2 });
    });
  });

  describe('Seeded Bracket Pairing com BYEs', () => {
    it('aloca 5 equipes em chave de 8 gerando exatamente 3 BYEs sem criar equipes fictícias', () => {
      const participants: ParticipantSlotState[] = Array.from({ length: 5 }, (_, i) => {
        const seed = i + 1;
        return createResolvedParticipantSlot('A', `seed-team-${seed}`, `Seed ${seed}`);
      });

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'seeded-bracket', bracketSize: 8 },
        { stageId: 'knockout', roundId: 'qf' },
      );

      expect(slots).toHaveLength(4);

      // Pairings para 8: [[1, 8], [4, 5], [2, 7], [3, 6]]
      // Slot 1: Seed 1 x Seed 8 (BYE)
      expect(slots[0].participantA.resolvedTeamId).toBe('seed-team-1');
      expect(slots[0].participantB.isBye).toBe(true);

      // Slot 2: Seed 4 x Seed 5 (Partida real)
      expect(slots[1].participantA.resolvedTeamId).toBe('seed-team-4');
      expect(slots[1].participantB.resolvedTeamId).toBe('seed-team-5');

      // Slot 3: Seed 2 x Seed 7 (BYE)
      expect(slots[2].participantA.resolvedTeamId).toBe('seed-team-2');
      expect(slots[2].participantB.isBye).toBe(true);

      // Slot 4: Seed 3 x Seed 6 (BYE)
      expect(slots[3].participantA.resolvedTeamId).toBe('seed-team-3');
      expect(slots[3].participantB.isBye).toBe(true);

      // Validação crítica de integridade: Nenhuma equipe "BYE" foi criada
      const allResolvedIds = slots.flatMap(s => [s.participantA.resolvedTeamId, s.participantB.resolvedTeamId]);
      expect(allResolvedIds.filter(id => id !== null)).toEqual([
        'seed-team-1',
        'seed-team-4',
        'seed-team-5',
        'seed-team-2',
        'seed-team-3',
      ]);
    });
  });

  describe('Round Robin Pairing (Berger Circle)', () => {
    it('gera todos os confrontos em turno único para 4 equipes (3 rodadas, 6 jogos)', () => {
      const participants = [
        createResolvedParticipantSlot('A', 't1', 'Time 1'),
        createResolvedParticipantSlot('A', 't2', 'Time 2'),
        createResolvedParticipantSlot('A', 't3', 'Time 3'),
        createResolvedParticipantSlot('A', 't4', 'Time 4'),
      ];

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'round-robin' },
        { stageId: 'groups', roundId: 'r' },
      );

      // 4 * 3 / 2 = 6 jogos
      expect(slots).toHaveLength(6);

      // Cada dupla deve se enfrentar exatamente uma vez
      const pairs = slots.map(s => [s.participantA.resolvedTeamId, s.participantB.resolvedTeamId].sort().join(' x '));
      const uniquePairs = new Set(pairs);
      expect(uniquePairs.size).toBe(6);
      expect(uniquePairs.has('t1 x t2')).toBe(true);
      expect(uniquePairs.has('t1 x t3')).toBe(true);
      expect(uniquePairs.has('t1 x t4')).toBe(true);
      expect(uniquePairs.has('t2 x t3')).toBe(true);
      expect(uniquePairs.has('t2 x t4')).toBe(true);
      expect(uniquePairs.has('t3 x t4')).toBe(true);
    });
  });

  describe('Determinismo Estrito', () => {
    it('produz saída estritamente idêntica para entradas idênticas repetidas 100 vezes', () => {
      const participants: ParticipantSlotState[] = Array.from({ length: 8 }, (_, i) =>
        createResolvedParticipantSlot('A', `team-${i + 1}`, `Team ${i + 1}`),
      );

      const firstOutput = GenericPairingEngine.pair(
        participants,
        { strategy: 'high-low' },
        { stageId: 'knockout', roundId: 'qf' },
      );

      for (let run = 0; run < 100; run++) {
        const nextOutput = GenericPairingEngine.pair(
          participants,
          { strategy: 'high-low' },
          { stageId: 'knockout', roundId: 'qf' },
        );
        expect(nextOutput).toEqual(firstOutput);
      }
    });
  });
});
