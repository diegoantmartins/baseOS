/**
 * BaseOS — GenericProgressionEngine (Motor Puro de Progressão Esportiva)
 *
 * Responsável por:
 * 1. Propagar vencedores e perdedores para seus respectivos slots de destino;
 * 2. Consumir estritamente CanonicalMatchResult como autoridade esportiva;
 * 3. NUNCA recalcular sets, pontos, critérios de desempate ou vencedores;
 * 4. Suportar resultados parciais (jogos pendentes não bloqueiam os já finalizados);
 * 5. Garantir determinismo e idempotência (mesma entrada -> mesma saída).
 *
 * MODO: Domínio Puro em Memória (Sem dependência de banco, I/O ou UI).
 */

import type {
  CanonicalMatchResult,
  MatchSlot,
  ParticipantSlotState,
  ProgressionRoute,
} from '@/types/competitionConfig';
import type { TeamRecord } from '@/types/entities';

export interface AdvancementEntry {
  sourceSlotId: string;
  targetSlotId: string;
  targetSide: 'A' | 'B';
  teamId: string;
  teamName?: string;
  type: 'winner' | 'loser' | 'bye-advance';
}

export interface ProgressionEvaluationResult {
  updatedSlots: MatchSlot[];
  advancements: AdvancementEntry[];
  pendingRoutesCount: number;
  resolvedRoutesCount: number;
}

export interface ProgressionContext {
  canonicalResultsBySlot: Record<string, CanonicalMatchResult>;
  routes?: ProgressionRoute[];
  teams?: TeamRecord[];
}

export class GenericProgressionEngine {
  /**
   * Avalia as regras e rotas de progressão e propaga os participantes qualificados
   * para os slots de destino de forma pura e determinística.
   */
  public static evaluate(
    slots: MatchSlot[],
    context: ProgressionContext,
  ): ProgressionEvaluationResult {
    // Clona os slots para garantir pureza e imutabilidade do input
    const slotsMap = new Map<string, MatchSlot>();
    for (const slot of slots) {
      slotsMap.set(slot.slotId, {
        ...slot,
        participantA: { ...slot.participantA },
        participantB: { ...slot.participantB },
      });
    }

    const teamNamesMap = new Map<string, string>();
    if (context.teams) {
      for (const t of context.teams) {
        teamNamesMap.set(t.id, t.name);
      }
    }

    // Coleta todas as rotas (as declaradas explicitamente e as embutidas nos slots)
    const routesMap = new Map<string, ProgressionRoute>();
    if (context.routes) {
      for (const r of context.routes) {
        routesMap.set(r.sourceSlotId, r);
      }
    }
    for (const slot of slots) {
      if (slot.progressionRoute) {
        routesMap.set(slot.slotId, slot.progressionRoute);
      }
    }

    const advancements: AdvancementEntry[] = [];
    let pendingRoutesCount = 0;
    let resolvedRoutesCount = 0;

    for (const [sourceSlotId, route] of routesMap) {
      const sourceSlot = slotsMap.get(sourceSlotId);
      if (!sourceSlot) continue;

      let winnerId: string | null = null;
      let loserId: string | null = null;
      let isByeAdvance = false;

      // 1. Verificação nativa de BYE no slot de origem
      if (sourceSlot.participantB.isBye && sourceSlot.participantA.status === 'resolved' && sourceSlot.participantA.resolvedTeamId) {
        winnerId = sourceSlot.participantA.resolvedTeamId;
        loserId = null;
        isByeAdvance = true;
      } else if (sourceSlot.participantA.isBye && sourceSlot.participantB.status === 'resolved' && sourceSlot.participantB.resolvedTeamId) {
        winnerId = sourceSlot.participantB.resolvedTeamId;
        loserId = null;
        isByeAdvance = true;
      } else {
        // 2. Verificação via CanonicalMatchResult homologado
        const result = context.canonicalResultsBySlot[sourceSlotId]
          ?? (sourceSlot.matchRecordId ? context.canonicalResultsBySlot[sourceSlot.matchRecordId] : undefined);

        if (result && result.isValid && result.isCompleted && result.winnerId) {
          winnerId = result.winnerId;
          loserId = result.loserId ?? null;
        }
      }

      // Propaga Vencedor
      if (route.onWinner) {
        const targetSlot = slotsMap.get(route.onWinner.targetSlotId);
        if (targetSlot) {
          if (winnerId) {
            const teamName = teamNamesMap.get(winnerId) ?? winnerId;
            const updatedParticipant: ParticipantSlotState = {
              side: route.onWinner.targetSide,
              reference: { type: 'resolved-team', teamId: winnerId, teamName },
              status: 'resolved',
              resolvedTeamId: winnerId,
              resolvedTeamName: teamName,
              displayPlaceholder: teamName,
              isBye: false,
            };

            if (route.onWinner.targetSide === 'A') {
              targetSlot.participantA = updatedParticipant;
            } else {
              targetSlot.participantB = updatedParticipant;
            }

            advancements.push({
              sourceSlotId,
              targetSlotId: route.onWinner.targetSlotId,
              targetSide: route.onWinner.targetSide,
              teamId: winnerId,
              teamName,
              type: isByeAdvance ? 'bye-advance' : 'winner',
            });
            resolvedRoutesCount++;
          } else {
            pendingRoutesCount++;
          }
        }
      }

      // Propaga Perdedor (ex: disputa de 3º lugar)
      if (route.onLoser) {
        const targetSlot = slotsMap.get(route.onLoser.targetSlotId);
        if (targetSlot) {
          if (loserId) {
            const teamName = teamNamesMap.get(loserId) ?? loserId;
            const updatedParticipant: ParticipantSlotState = {
              side: route.onLoser.targetSide,
              reference: { type: 'resolved-team', teamId: loserId, teamName },
              status: 'resolved',
              resolvedTeamId: loserId,
              resolvedTeamName: teamName,
              displayPlaceholder: teamName,
              isBye: false,
            };

            if (route.onLoser.targetSide === 'A') {
              targetSlot.participantA = updatedParticipant;
            } else {
              targetSlot.participantB = updatedParticipant;
            }

            advancements.push({
              sourceSlotId,
              targetSlotId: route.onLoser.targetSlotId,
              targetSide: route.onLoser.targetSide,
              teamId: loserId,
              teamName,
              type: 'loser',
            });
            resolvedRoutesCount++;
          } else {
            pendingRoutesCount++;
          }
        }
      }
    }

    return {
      updatedSlots: Array.from(slotsMap.values()),
      advancements,
      pendingRoutesCount,
      resolvedRoutesCount,
    };
  }
}
