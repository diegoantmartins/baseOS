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
import {
  createByeParticipantSlot,
  createUnresolvedParticipantSlot,
} from '@/types/competitionConfig';

export interface PairingOptions {
  stageId: string;
  roundId: string;
  slotIdPrefix?: string;
  labelPrefix?: string;
}

export interface DoubleEliminationPairingOptions {
  bracketSize: number; // 4, 8, 16
  participants?: ParticipantSlotState[];
  stageWinnersId?: string;
  stageLosersId?: string;
  stageGrandFinalId?: string;
  labelPrefix?: string;
}

export interface DoubleEliminationRoundInfo {
  roundId: string;
  name: string;
  order: number;
  slotsCount: number;
}

export interface DoubleEliminationSlotsResult {
  allSlots: MatchSlot[];
  winnersSlots: MatchSlot[];
  losersSlots: MatchSlot[];
  grandFinalSlot: MatchSlot;
  roundsWinners: DoubleEliminationRoundInfo[];
  roundsLosers: DoubleEliminationRoundInfo[];
  roundsGrandFinal: DoubleEliminationRoundInfo[];
}

function getWinnersRoundName(roundIdx: number, totalRounds: number): string {
  const remaining = totalRounds - roundIdx;
  if (remaining === 1) return 'Final de Winners';
  if (remaining === 2) return 'Semifinais de Winners';
  if (remaining === 3) return 'Quartas de Final de Winners';
  if (remaining === 4) return 'Oitavas de Final de Winners';
  return `Winners Rodada ${roundIdx + 1}`;
}

function getLosersRoundName(roundIdx: number, totalRounds: number): string {
  const remaining = totalRounds - roundIdx;
  if (remaining === 1) return 'Final de Losers';
  if (remaining === 2) return 'Semifinal de Losers';
  return `Losers Rodada ${roundIdx + 1}`;
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

  /**
   * Chaveamento Puro e Determinístico de Eliminatória Dupla (Winners, Losers e Grand Final).
   * Suporta potências de 2 (4, 8, 16 equipes) com conservação matemática exata de partidas (2N - 2).
   */
  public static pairDoubleElimination(
    options: DoubleEliminationPairingOptions,
  ): DoubleEliminationSlotsResult {
    const rawSize = options.bracketSize;
    // Garante potência de 2 no bracketSize (mínimo 4)
    let size = 4;
    while (size < rawSize) {
      size *= 2;
    }
    const k = Math.round(Math.log2(size)); // 2 para 4, 3 para 8, 4 para 16

    const stageWinnersId = options.stageWinnersId ?? 'stage-winners';
    const stageLosersId = options.stageLosersId ?? 'stage-losers';
    const stageGrandFinalId = options.stageGrandFinalId ?? 'stage-grand-final';

    const winnersSlots: MatchSlot[] = [];
    const losersSlots: MatchSlot[] = [];
    const roundsWinners: DoubleEliminationRoundInfo[] = [];
    const roundsLosers: DoubleEliminationRoundInfo[] = [];
    const roundsGrandFinal: DoubleEliminationRoundInfo[] = [];

    // ========================================================================
    // 1. GERAÇÃO DO WINNERS BRACKET (k rodadas)
    // ========================================================================
    for (let r = 1; r <= k; r++) {
      const roundId = `${stageWinnersId}-R${r}`;
      const roundName = getWinnersRoundName(r - 1, k);
      const matchesCount = size / Math.pow(2, r);

      roundsWinners.push({
        roundId,
        name: roundName,
        order: r,
        slotsCount: matchesCount,
      });

      if (r === 1) {
        // Primeira rodada: pareamento canônico por sementes
        const pairings = getSeededPairings(size);
        pairings.forEach(([seedA, seedB], idx) => {
          const slotNumber = idx + 1;
          const slotId = `${stageWinnersId}-R1-SLOT-${String(slotNumber).padStart(2, '0')}`;

          const participantA = options.participants && options.participants[seedA - 1]
            ? { ...options.participants[seedA - 1], side: 'A' as const }
            : createUnresolvedParticipantSlot('A', { type: 'seed', seedNumber: seedA }, `Seed ${seedA}`);

          const participantB = options.participants && options.participants[seedB - 1]
            ? { ...options.participants[seedB - 1], side: 'B' as const }
            : createUnresolvedParticipantSlot('B', { type: 'seed', seedNumber: seedB }, `Seed ${seedB}`);

          // Destino do vencedor: WB R2
          const nextWbSlot = Math.floor(idx / 2) + 1;
          const nextWbSide = idx % 2 === 0 ? 'A' : 'B';

          // Destino do perdedor: LB R1
          const nextLbSlot = Math.floor(idx / 2) + 1;
          const nextLbSide = idx % 2 === 0 ? 'A' : 'B';

          winnersSlots.push({
            slotId,
            stageId: stageWinnersId,
            roundId,
            position: slotNumber,
            label: `${roundName} #${slotNumber}`,
            participantA,
            participantB,
            progressionRoute: {
              sourceSlotId: slotId,
              onWinner: {
                targetStageId: stageWinnersId,
                targetRoundId: `${stageWinnersId}-R2`,
                targetSlotId: `${stageWinnersId}-R2-SLOT-${String(nextWbSlot).padStart(2, '0')}`,
                targetSide: nextWbSide,
              },
              onLoser: {
                targetStageId: stageLosersId,
                targetRoundId: `${stageLosersId}-R1`,
                targetSlotId: `${stageLosersId}-R1-SLOT-${String(nextLbSlot).padStart(2, '0')}`,
                targetSide: nextLbSide,
              },
            },
            matchRecordId: null,
          });
        });
      } else if (r < k) {
        // Rodadas intermediárias de Winners (R2 até R(k-1))
        for (let i = 0; i < matchesCount; i++) {
          const slotNumber = i + 1;
          const slotId = `${stageWinnersId}-R${r}-SLOT-${String(slotNumber).padStart(2, '0')}`;
          const srcA = `${stageWinnersId}-R${r - 1}-SLOT-${String(2 * i + 1).padStart(2, '0')}`;
          const srcB = `${stageWinnersId}-R${r - 1}-SLOT-${String(2 * i + 2).padStart(2, '0')}`;

          const nextWbSlot = Math.floor(i / 2) + 1;
          const nextWbSide = i % 2 === 0 ? 'A' : 'B';

          // Destino de perdedor: cai na rodada Major correspondente de Losers
          const targetLbRnd = 2 * r - 2;
          const crossTargetSlot = ((i + Math.floor(matchesCount / 2)) % matchesCount) + 1;

          winnersSlots.push({
            slotId,
            stageId: stageWinnersId,
            roundId,
            position: slotNumber,
            label: `${roundName} #${slotNumber}`,
            participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: srcA }, `Vencedor ${srcA}`),
            participantB: createUnresolvedParticipantSlot('B', { type: 'match-winner', slotId: srcB }, `Vencedor ${srcB}`),
            progressionRoute: {
              sourceSlotId: slotId,
              onWinner: {
                targetStageId: stageWinnersId,
                targetRoundId: `${stageWinnersId}-R${r + 1}`,
                targetSlotId: `${stageWinnersId}-R${r + 1}-SLOT-${String(nextWbSlot).padStart(2, '0')}`,
                targetSide: nextWbSide,
              },
              onLoser: {
                targetStageId: stageLosersId,
                targetRoundId: `${stageLosersId}-R${targetLbRnd}`,
                targetSlotId: `${stageLosersId}-R${targetLbRnd}-SLOT-${String(crossTargetSlot).padStart(2, '0')}`,
                targetSide: 'B',
              },
            },
            matchRecordId: null,
          });
        }
      } else {
        // Final de Winners (r = k)
        const slotId = `${stageWinnersId}-R${k}-SLOT-01`;
        const srcA = `${stageWinnersId}-R${k - 1}-SLOT-01`;
        const srcB = `${stageWinnersId}-R${k - 1}-SLOT-02`;
        const totalLbRounds = 2 * k - 2;

        winnersSlots.push({
          slotId,
          stageId: stageWinnersId,
          roundId,
          position: 1,
          label: roundName,
          participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: srcA }, `Vencedor ${srcA}`),
          participantB: createUnresolvedParticipantSlot('B', { type: 'match-winner', slotId: srcB }, `Vencedor ${srcB}`),
          progressionRoute: {
            sourceSlotId: slotId,
            onWinner: {
              targetStageId: stageGrandFinalId,
              targetRoundId: `${stageGrandFinalId}-R1`,
              targetSlotId: `${stageGrandFinalId}-R1-SLOT-01`,
              targetSide: 'A',
            },
            onLoser: {
              targetStageId: stageLosersId,
              targetRoundId: `${stageLosersId}-R${totalLbRounds}`,
              targetSlotId: `${stageLosersId}-R${totalLbRounds}-SLOT-01`,
              targetSide: 'B',
            },
          },
          matchRecordId: null,
        });
      }
    }

    // ========================================================================
    // 2. GERAÇÃO DO LOSERS BRACKET (2k - 2 rodadas)
    // ========================================================================
    const totalLbRounds = 2 * k - 2;
    for (let lbR = 1; lbR <= totalLbRounds; lbR++) {
      const roundId = `${stageLosersId}-R${lbR}`;
      const roundName = getLosersRoundName(lbR - 1, totalLbRounds);

      if (lbR === 1) {
        // LB Round 1: Minor 1 (confrontos diretos entre perdedores do WB R1)
        const matchesCount = size / 4;
        roundsLosers.push({ roundId, name: roundName, order: lbR, slotsCount: matchesCount });

        for (let i = 0; i < matchesCount; i++) {
          const slotNumber = i + 1;
          const slotId = `${stageLosersId}-R1-SLOT-${String(slotNumber).padStart(2, '0')}`;
          const srcA = `${stageWinnersId}-R1-SLOT-${String(2 * i + 1).padStart(2, '0')}`;
          const srcB = `${stageWinnersId}-R1-SLOT-${String(2 * i + 2).padStart(2, '0')}`;

          losersSlots.push({
            slotId,
            stageId: stageLosersId,
            roundId,
            position: slotNumber,
            label: `${roundName} #${slotNumber}`,
            participantA: createUnresolvedParticipantSlot('A', { type: 'match-loser', slotId: srcA }, `Perdedor ${srcA}`),
            participantB: createUnresolvedParticipantSlot('B', { type: 'match-loser', slotId: srcB }, `Perdedor ${srcB}`),
            progressionRoute: {
              sourceSlotId: slotId,
              onWinner: {
                targetStageId: stageLosersId,
                targetRoundId: `${stageLosersId}-R2`,
                targetSlotId: `${stageLosersId}-R2-SLOT-${String(slotNumber).padStart(2, '0')}`,
                targetSide: 'A',
              },
              onLoser: undefined, // 2ª derrota = eliminado
            },
            matchRecordId: null,
          });
        }
      } else if (lbR % 2 === 0) {
        // Rodada Major (Par): vencedores da rodada anterior de LB enfrentam perdedores de WB
        const wbRnd = lbR / 2 + 1;
        const matchesCount = size / Math.pow(2, wbRnd);
        roundsLosers.push({ roundId, name: roundName, order: lbR, slotsCount: matchesCount });

        const isFinalLbRound = lbR === totalLbRounds;

        for (let i = 0; i < matchesCount; i++) {
          const slotNumber = i + 1;
          const slotId = `${stageLosersId}-R${lbR}-SLOT-${String(slotNumber).padStart(2, '0')}`;
          const srcA = `${stageLosersId}-R${lbR - 1}-SLOT-${String(slotNumber).padStart(2, '0')}`;
          const crossWbIndex = ((i + Math.floor(matchesCount / 2)) % matchesCount) + 1;
          const srcB = `${stageWinnersId}-R${wbRnd}-SLOT-${String(crossWbIndex).padStart(2, '0')}`;

          losersSlots.push({
            slotId,
            stageId: stageLosersId,
            roundId,
            position: slotNumber,
            label: `${roundName} #${slotNumber}`,
            participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: srcA }, `Vencedor ${srcA}`),
            participantB: createUnresolvedParticipantSlot('B', { type: 'match-loser', slotId: srcB }, `Perdedor ${srcB}`),
            progressionRoute: {
              sourceSlotId: slotId,
              onWinner: isFinalLbRound
                ? {
                    targetStageId: stageGrandFinalId,
                    targetRoundId: `${stageGrandFinalId}-R1`,
                    targetSlotId: `${stageGrandFinalId}-R1-SLOT-01`,
                    targetSide: 'B',
                  }
                : {
                    targetStageId: stageLosersId,
                    targetRoundId: `${stageLosersId}-R${lbR + 1}`,
                    targetSlotId: `${stageLosersId}-R${lbR + 1}-SLOT-${String(Math.floor(i / 2) + 1).padStart(2, '0')}`,
                    targetSide: i % 2 === 0 ? 'A' : 'B',
                  },
              onLoser: undefined, // 2ª derrota = eliminado
            },
            matchRecordId: null,
          });
        }
      } else {
        // Rodada Minor (Ímpar, >= 3): vencedores de LB jogam entre si
        const prevWbRnd = (lbR - 1) / 2 + 1;
        const prevMatchesCount = size / Math.pow(2, prevWbRnd);
        const matchesCount = prevMatchesCount / 2;
        roundsLosers.push({ roundId, name: roundName, order: lbR, slotsCount: matchesCount });

        for (let i = 0; i < matchesCount; i++) {
          const slotNumber = i + 1;
          const slotId = `${stageLosersId}-R${lbR}-SLOT-${String(slotNumber).padStart(2, '0')}`;
          const srcA = `${stageLosersId}-R${lbR - 1}-SLOT-${String(2 * i + 1).padStart(2, '0')}`;
          const srcB = `${stageLosersId}-R${lbR - 1}-SLOT-${String(2 * i + 2).padStart(2, '0')}`;

          losersSlots.push({
            slotId,
            stageId: stageLosersId,
            roundId,
            position: slotNumber,
            label: `${roundName} #${slotNumber}`,
            participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: srcA }, `Vencedor ${srcA}`),
            participantB: createUnresolvedParticipantSlot('B', { type: 'match-winner', slotId: srcB }, `Vencedor ${srcB}`),
            progressionRoute: {
              sourceSlotId: slotId,
              onWinner: {
                targetStageId: stageLosersId,
                targetRoundId: `${stageLosersId}-R${lbR + 1}`,
                targetSlotId: `${stageLosersId}-R${lbR + 1}-SLOT-${String(slotNumber).padStart(2, '0')}`,
                targetSide: 'A',
              },
              onLoser: undefined, // 2ª derrota = eliminado
            },
            matchRecordId: null,
          });
        }
      }
    }

    // ========================================================================
    // 3. GERAÇÃO DA GRANDE FINAL (1 rodada, 1 slot)
    // ========================================================================
    const gfRoundId = `${stageGrandFinalId}-R1`;
    roundsGrandFinal.push({
      roundId: gfRoundId,
      name: 'Grande Final',
      order: 1,
      slotsCount: 1,
    });

    const srcWbFinal = `${stageWinnersId}-R${k}-SLOT-01`;
    const srcLbFinal = `${stageLosersId}-R${totalLbRounds}-SLOT-01`;
    const grandFinalSlot: MatchSlot = {
      slotId: `${stageGrandFinalId}-R1-SLOT-01`,
      stageId: stageGrandFinalId,
      roundId: gfRoundId,
      position: 1,
      label: 'Grande Final',
      participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: srcWbFinal }, `Campeão dos Winners`),
      participantB: createUnresolvedParticipantSlot('B', { type: 'match-winner', slotId: srcLbFinal }, `Campeão dos Losers`),
      progressionRoute: {
        sourceSlotId: `${stageGrandFinalId}-R1-SLOT-01`,
        onWinner: undefined, // Campeão da Competição
        onLoser: undefined, // Vice-campeão da Competição
      },
      matchRecordId: null,
    };

    const allSlots = [...winnersSlots, ...losersSlots, grandFinalSlot];

    return {
      allSlots,
      winnersSlots,
      losersSlots,
      grandFinalSlot,
      roundsWinners,
      roundsLosers,
      roundsGrandFinal,
    };
  }
}
