/**
 * BaseOS — GenericPairingEngine (Motor Puro de Pareamento Esportivo)
 *
 * Responsável por:
 * 1. Emparelhar participantes determinísticamente com base em regras esportivas abstratas;
 * 2. Suportar estratégias puras: 'high-low', 'same-position-cross', 'seeded-bracket', 'round-robin', 'custom';
 * 3. Tratar BYEs nativamente sem criar equipes fantasmas ou partidas fictícias;
 * 4. Produzir MatchSlots com identificadores estáveis (não dependentes de índices de array);
 * 5. Não conter qualquer regra específica de torneio ou referências a 'Voltz'.
 *
 * MODO: Domínio Puro em Memória (Sem dependência de banco, I/O ou UI).
 */

import type {
  MatchSlot,
  PairingDefinition,
  ParticipantSlotState,
} from '@/types/competitionConfig';
import { createByeParticipantSlot } from '@/types/competitionConfig';

export interface PairingOptions {
  stageId: string;
  roundId: string;
  slotIdPrefix?: string;
  labelPrefix?: string;
}

/**
 * Gera a sequência clássica e canônica de sementes para chaveamento eliminatório de potência de 2.
 * Exemplo para tamanho 8: [[1, 8], [4, 5], [2, 7], [3, 6]]
 * Garantindo que a semente 1 e a semente 2 só possam se enfrentar na final.
 */
export function getSeededPairings(bracketSize: number): Array<[number, number]> {
  // Encontra a menor potência de 2 maior ou igual a bracketSize (mínimo 2)
  let size = 2;
  while (size < bracketSize) {
    size *= 2;
  }

  let rounds = [1, 2];
  while (rounds.length < size) {
    const nextRound: number[] = [];
    const currentSum = rounds.length * 2 + 1;
    for (const seed of rounds) {
      nextRound.push(seed);
      nextRound.push(currentSum - seed);
    }
    rounds = nextRound;
  }

  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < rounds.length; i += 2) {
    pairs.push([rounds[i], rounds[i + 1]]);
  }
  return pairs;
}

export class GenericPairingEngine {
  /**
   * Gera a lista de MatchSlots a partir de participantes e definição de pareamento.
   */
  public static pair(
    participants: ParticipantSlotState[],
    pairing: PairingDefinition,
    options: PairingOptions,
  ): MatchSlot[] {
    switch (pairing.strategy) {
      case 'high-low':
        return this.pairHighLow(participants, options);

      case 'same-position-cross':
        return this.pairSamePositionCross(participants, options);

      case 'seeded-bracket':
        return this.pairSeededBracket(participants, pairing.bracketSize, options);

      case 'round-robin':
        return this.pairRoundRobin(participants, options);

      case 'custom':
        return this.pairCustom(participants, pairing, options);

      default:
        throw new Error(`Estratégia de pareamento não suportada: ${(pairing as PairingDefinition).strategy}`);
    }
  }

  /**
   * Pareamento High-Low (ex: 1x8, 2x7, 3x6, 4x5 ou 5x12, 6x11, 7x10, 8x9).
   */
  public static pairHighLow(
    participants: ParticipantSlotState[],
    options: PairingOptions,
  ): MatchSlot[] {
    const n = participants.length;
    if (n < 2) return [];

    const items = [...participants];
    // Se ímpar, insere BYE no final para balancear
    if (n % 2 !== 0) {
      items.push(createByeParticipantSlot('B'));
    }

    const total = items.length;
    const matchesCount = total / 2;
    const slots: MatchSlot[] = [];
    const prefix = options.slotIdPrefix ?? `${options.stageId}-${options.roundId}`;

    for (let i = 0; i < matchesCount; i++) {
      const top = items[i];
      const bottom = items[total - 1 - i];

      const participantA: ParticipantSlotState = {
        ...top,
        side: 'A',
      };
      const participantB: ParticipantSlotState = {
        ...bottom,
        side: 'B',
      };

      const slotNumber = i + 1;
      const slotId = `${prefix}-SLOT-${String(slotNumber).padStart(2, '0')}`;

      slots.push({
        slotId,
        stageId: options.stageId,
        roundId: options.roundId,
        position: slotNumber,
        label: `${options.labelPrefix ?? 'Jogo'} ${slotNumber}`,
        participantA,
        participantB,
        matchRecordId: null,
      });
    }

    return slots;
  }

  /**
   * Cruzamento de Mesma Posição entre Grupos (ex: 1ºA x 2ºB, 1ºB x 2ºA).
   * Algoritmo determinístico aplicável a G grupos.
   */
  public static pairSamePositionCross(
    participants: ParticipantSlotState[],
    options: PairingOptions,
  ): MatchSlot[] {
    // Separa participantes por posição de grupo quando disponível
    const groupPosA = participants.filter(p => p.reference.type === 'group-position' && p.reference.position === 1);
    const groupPosB = participants.filter(p => p.reference.type === 'group-position' && p.reference.position === 2);

    const prefix = options.slotIdPrefix ?? `${options.stageId}-${options.roundId}`;
    const slots: MatchSlot[] = [];

    if (groupPosA.length > 0 && groupPosA.length === groupPosB.length) {
      // Ordena por groupIndex
      const firsts = [...groupPosA].sort((a, b) => {
        const ga = a.reference.type === 'group-position' ? a.reference.groupIndex : 0;
        const gb = b.reference.type === 'group-position' ? b.reference.groupIndex : 0;
        return ga - gb;
      });
      const seconds = [...groupPosB].sort((a, b) => {
        const ga = a.reference.type === 'group-position' ? a.reference.groupIndex : 0;
        const gb = b.reference.type === 'group-position' ? b.reference.groupIndex : 0;
        return ga - gb;
      });

      const gCount = firsts.length;

      for (let i = 0; i < gCount; i++) {
        // Cruzamento canônico: 1º do grupo i x 2º do grupo (i + 1) % gCount
        const home = firsts[i];
        const awayIndex = (i + 1) % gCount;
        const away = seconds[awayIndex];

        const slotNumber = i + 1;
        const slotId = `${prefix}-SLOT-${String(slotNumber).padStart(2, '0')}`;

        slots.push({
          slotId,
          stageId: options.stageId,
          roundId: options.roundId,
          position: slotNumber,
          label: `${options.labelPrefix ?? 'Jogo'} ${slotNumber}`,
          participantA: { ...home, side: 'A' },
          participantB: { ...away, side: 'B' },
          matchRecordId: null,
        });
      }

      return slots;
    }

    // Fallback ordenado se referências não forem explicitamente group-position
    return this.pairHighLow(participants, options);
  }

  /**
   * Chaveamento Olímpico Baseado em Sementes (Bracket Seeding com suporte nativo a BYE).
   */
  public static pairSeededBracket(
    participants: ParticipantSlotState[],
    bracketSize: number | undefined,
    options: PairingOptions,
  ): MatchSlot[] {
    const rawCount = participants.length;
    const targetSize = bracketSize ?? (rawCount > 2 ? Math.pow(2, Math.ceil(Math.log2(rawCount))) : 2);
    const pairings = getSeededPairings(targetSize);

    // Mapeia sementes 1..targetSize para participantes
    const slots: MatchSlot[] = [];
    const prefix = options.slotIdPrefix ?? `${options.stageId}-${options.roundId}`;

    pairings.forEach(([seedA, seedB], index) => {
      const participantA = seedA <= rawCount
        ? { ...participants[seedA - 1], side: 'A' as const }
        : createByeParticipantSlot('A');

      const participantB = seedB <= rawCount
        ? { ...participants[seedB - 1], side: 'B' as const }
        : createByeParticipantSlot('B');

      const slotNumber = index + 1;
      const slotId = `${prefix}-SLOT-${String(slotNumber).padStart(2, '0')}`;

      slots.push({
        slotId,
        stageId: options.stageId,
        roundId: options.roundId,
        position: slotNumber,
        label: `${options.labelPrefix ?? 'Jogo'} ${slotNumber}`,
        participantA,
        participantB,
        matchRecordId: null,
      });
    });

    return slots;
  }

  /**
   * Pareamento Todos-contra-Todos (Round Robin / Berger Circle).
   */
  public static pairRoundRobin(
    participants: ParticipantSlotState[],
    options: PairingOptions,
  ): MatchSlot[] {
    const n = participants.length;
    if (n < 2) return [];

    const items = [...participants];
    // Se ímpar, adiciona BYE
    if (n % 2 !== 0) {
      items.push(createByeParticipantSlot('B'));
    }

    const m = items.length;
    const roundsCount = m - 1;
    const slots: MatchSlot[] = [];
    let matchNumber = 1;

    for (let r = 0; r < roundsCount; r++) {
      const roundNumber = r + 1;
      for (let i = 0; i < m / 2; i++) {
        const a = items[i];
        const b = items[m - 1 - i];

        // Se nenhum dos dois for BYE, gera o slot da partida
        if (!a.isBye && !b.isBye) {
          const slotId = `${options.slotIdPrefix ?? options.stageId}-R${roundNumber}-M${matchNumber}`;
          slots.push({
            slotId,
            stageId: options.stageId,
            roundId: `${options.roundId}-R${roundNumber}`,
            position: matchNumber,
            label: `Rodada ${roundNumber} - Jogo ${matchNumber}`,
            participantA: { ...a, side: 'A' },
            participantB: { ...b, side: 'B' },
            matchRecordId: null,
          });
          matchNumber++;
        }
      }

      // Rotação clássica do círculo Berger (fixa o primeiro elemento items[0])
      const last = items[m - 1];
      for (let i = m - 1; i > 1; i--) {
        items[i] = items[i - 1];
      }
      items[1] = last;
    }

    return slots;
  }

  /**
   * Pareamento Declarativo Customizado.
   */
  public static pairCustom(
    participants: ParticipantSlotState[],
    pairing: PairingDefinition,
    options: PairingOptions,
  ): MatchSlot[] {
    const crossings = pairing.customCrossings ?? [];
    const slots: MatchSlot[] = [];
    const prefix = options.slotIdPrefix ?? `${options.stageId}-${options.roundId}`;

    crossings.forEach((c, idx) => {
      const home = participants[c.homeIndex] ?? createByeParticipantSlot('A');
      const away = participants[c.awayIndex] ?? createByeParticipantSlot('B');
      const slotNumber = idx + 1;
      const slotId = `${prefix}-SLOT-${String(slotNumber).padStart(2, '0')}`;

      slots.push({
        slotId,
        stageId: options.stageId,
        roundId: options.roundId,
        position: slotNumber,
        label: c.label ?? `${options.labelPrefix ?? 'Jogo'} ${slotNumber}`,
        participantA: { ...home, side: 'A' },
        participantB: { ...away, side: 'B' },
        matchRecordId: null,
      });
    });

    return slots;
  }
}
