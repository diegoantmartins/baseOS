/**
 * BaseOS — StageGraphEngine (Grafo de Estágios e Validador de DAG)
 *
 * Responsável por:
 * 1. Modelar o grafo de estágios (StageDefinition) e intenções de partida (MatchSlot);
 * 2. Validar que a estrutura de estágios forma um Grafo Acíclico Dirigido (DAG);
 * 3. Detectar ciclos diretos (A -> A), indiretos (A -> B -> A) e complexos (A -> B -> C -> A);
 * 4. Detectar referências quebradas (estágio, rodada ou slot inexistente);
 * 5. Detectar conflitos de roteamento (ex: múltiplos vencedores direcionados para o mesmo slot e lado);
 * 6. Calcular a ordenação topológica de execução dos estágios.
 *
 * MODO: Domínio Puro em Memória (Sem dependência de banco, I/O ou UI).
 */

import type {
  MatchSlot,
  ParticipantReference,
  ProgressionRoute,
  RoundDefinition,
  StageDefinition,
} from '@/types/competitionConfig';
import { getStageId } from '@/types/competitionConfig';

export type StageValidationErrorCode =
  | 'DIRECT_CYCLE'
  | 'INDIRECT_CYCLE'
  | 'COMPLEX_CYCLE'
  | 'STAGE_NOT_FOUND'
  | 'ROUND_NOT_FOUND'
  | 'SLOT_NOT_FOUND'
  | 'DUPLICATE_STAGE_ID'
  | 'DUPLICATE_SLOT_ID'
  | 'PROGRESSION_CONFLICT'
  | 'IMPOSSIBLE_DEPENDENCY'
  | 'INVALID_STRUCTURE';

export interface StageValidationError {
  code: StageValidationErrorCode;
  message: string;
  stageId?: string;
  roundId?: string;
  slotId?: string;
  cyclePath?: string[];
  details?: Record<string, unknown>;
}

export interface StageValidationResult {
  isValid: boolean;
  errors: StageValidationError[];
  topologicalOrder: string[];
}

export class StageEngineError extends Error {
  public readonly code: StageValidationErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: StageValidationErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'StageEngineError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Validador e construtor do DAG de Estágios do BaseOS.
 */
export class StageGraph {
  private readonly stagesMap = new Map<string, StageDefinition>();
  private readonly slotsMap = new Map<string, MatchSlot>();

  constructor(stages: StageDefinition[] = [], slots: MatchSlot[] = []) {
    for (const stage of stages) {
      const id = getStageId(stage);
      this.stagesMap.set(id, stage);
    }
    for (const slot of slots) {
      this.slotsMap.set(slot.slotId, slot);
    }
  }

  public getStages(): StageDefinition[] {
    return Array.from(this.stagesMap.values());
  }

  public getStage(stageId: string): StageDefinition | undefined {
    return this.stagesMap.get(stageId);
  }

  public getSlots(stageId?: string, roundId?: string): MatchSlot[] {
    const all = Array.from(this.slotsMap.values());
    return all.filter(s => {
      if (stageId && s.stageId !== stageId) return false;
      if (roundId && s.roundId !== roundId) return false;
      return true;
    });
  }

  public getSlot(slotId: string): MatchSlot | undefined {
    return this.slotsMap.get(slotId);
  }

  public addSlot(slot: MatchSlot): void {
    this.slotsMap.set(slot.slotId, slot);
  }

  /**
   * Constrói e valida as conexões de dependência entre estágios.
   * Retorna o relatório detalhado de erros e a ordem topológica quando válido.
   */
  public validateDAG(): StageValidationResult {
    return StageGraph.validate(this.getStages(), Array.from(this.slotsMap.values()));
  }

  /**
   * Validação estática puramente funcional de uma coleção de estágios e slots.
   */
  public static validate(stages: StageDefinition[], slots: MatchSlot[] = []): StageValidationResult {
    const errors: StageValidationError[] = [];
    const stageIdsSet = new Set<string>();
    const stagesById = new Map<string, StageDefinition>();

    // 1. Unicidade de estágios
    for (const stage of stages) {
      const id = getStageId(stage);
      if (!id || id.trim() === '') {
        errors.push({
          code: 'INVALID_STRUCTURE',
          message: 'Estágio possui identificador vazio ou indefinido.',
        });
        continue;
      }
      if (stageIdsSet.has(id)) {
        errors.push({
          code: 'DUPLICATE_STAGE_ID',
          message: `Identificador de estágio duplicado: "${id}".`,
          stageId: id,
        });
      }
      stageIdsSet.add(id);
      stagesById.set(id, stage);
    }

    // 2. Unicidade de slots e verificação de integridade
    const slotIdsSet = new Set<string>();
    const slotsById = new Map<string, MatchSlot>();

    for (const slot of slots) {
      if (!slot.slotId || slot.slotId.trim() === '') {
        errors.push({
          code: 'INVALID_STRUCTURE',
          message: 'MatchSlot possui slotId vazio ou indefinido.',
        });
        continue;
      }
      if (slotIdsSet.has(slot.slotId)) {
        errors.push({
          code: 'DUPLICATE_SLOT_ID',
          message: `Identificador de MatchSlot duplicado: "${slot.slotId}".`,
          slotId: slot.slotId,
        });
      }
      slotIdsSet.add(slot.slotId);
      slotsById.set(slot.slotId, slot);

      // Valida vínculo de estágio e rodada do slot
      const stage = stagesById.get(slot.stageId);
      if (!stage) {
        errors.push({
          code: 'STAGE_NOT_FOUND',
          message: `MatchSlot "${slot.slotId}" referencia estágio inexistente "${slot.stageId}".`,
          slotId: slot.slotId,
          stageId: slot.stageId,
        });
      } else if (stage.rounds && stage.rounds.length > 0) {
        const roundExists = stage.rounds.some(r => r.roundId === slot.roundId);
        if (!roundExists) {
          errors.push({
            code: 'ROUND_NOT_FOUND',
            message: `MatchSlot "${slot.slotId}" referencia rodada inexistente "${slot.roundId}" no estágio "${slot.stageId}".`,
            slotId: slot.slotId,
            stageId: slot.stageId,
            roundId: slot.roundId,
          });
        }
      }
    }

    // 3. Monta o grafo de adjacência de estágios
    // sourceStageId -> Set<targetStageId>
    // Nota: Se B depende de A (B.dependsOn = [A]), a aresta de fluxo esportivo é A -> B.
    const forwardAdj = new Map<string, Set<string>>();
    for (const id of stageIdsSet) {
      forwardAdj.set(id, new Set<string>());
    }

    // Coleta arestas por dependsOnStageIds
    for (const stage of stages) {
      const targetId = getStageId(stage);
      const deps = stage.dependsOnStageIds ?? [];

      for (const depSourceId of deps) {
        if (!stageIdsSet.has(depSourceId)) {
          errors.push({
            code: 'STAGE_NOT_FOUND',
            message: `Estágio "${targetId}" declara dependência de estágio inexistente: "${depSourceId}".`,
            stageId: targetId,
            details: { missingDependency: depSourceId },
          });
        } else {
          forwardAdj.get(depSourceId)?.add(targetId);
        }
      }
    }

    // Coleta arestas através dos ParticipantFeeds do estágio
    for (const stage of stages) {
      const targetId = getStageId(stage);
      const feeds = stage.participantFeeds ?? stage.participantFeed ?? [];

      for (const feed of feeds) {
        if ('stageId' in feed && feed.stageId) {
          const sourceId = feed.stageId;
          if (!stageIdsSet.has(sourceId)) {
            errors.push({
              code: 'STAGE_NOT_FOUND',
              message: `Feed do estágio "${targetId}" referencia estágio de origem inexistente: "${sourceId}".`,
              stageId: targetId,
              details: { missingSourceStage: sourceId },
            });
          } else {
            forwardAdj.get(sourceId)?.add(targetId);
          }
        }
      }
    }

    // Coleta arestas através de progressionRoutes dos slots ou estágios
    const progressionOccupation = new Map<string, string>(); // "targetSlotId:targetSide" -> "sourceSlotId:winner|loser"

    const allRoutes: Array<{ sourceStageId: string; route: ProgressionRoute }> = [];

    // Rotas declaradas nos estágios
    for (const stage of stages) {
      const sId = getStageId(stage);
      const routes = stage.progressionRoutes ?? [];
      for (const r of routes) {
        allRoutes.push({ sourceStageId: sId, route: r });
      }
    }

    // Rotas declaradas nos slots
    for (const slot of slots) {
      if (slot.progressionRoute) {
        allRoutes.push({ sourceStageId: slot.stageId, route: slot.progressionRoute });
      }
    }

    for (const { sourceStageId, route } of allRoutes) {
      const targets = [
        { type: 'winner', t: route.onWinner },
        { type: 'loser', t: route.onLoser },
      ];

      for (const { type, t } of targets) {
        if (!t) continue;

        if (!stageIdsSet.has(t.targetStageId)) {
          errors.push({
            code: 'STAGE_NOT_FOUND',
            message: `Rota de progressão do slot "${route.sourceSlotId}" aponta para estágio inexistente "${t.targetStageId}".`,
            slotId: route.sourceSlotId,
            stageId: t.targetStageId,
          });
        } else {
          if (sourceStageId !== t.targetStageId) {
            forwardAdj.get(sourceStageId)?.add(t.targetStageId);
          }

          // Valida rodada de destino se o estágio tiver rodadas cadastradas
          const targetStage = stagesById.get(t.targetStageId);
          if (targetStage?.rounds && targetStage.rounds.length > 0) {
            const rExists = targetStage.rounds.some(r => r.roundId === t.targetRoundId);
            if (!rExists) {
              errors.push({
                code: 'ROUND_NOT_FOUND',
                message: `Rota de progressão aponta para rodada inexistente "${t.targetRoundId}" no estágio "${t.targetStageId}".`,
                stageId: t.targetStageId,
                roundId: t.targetRoundId,
              });
            }
          }

          // Valida slot de destino se lista de slots foi fornecida
          if (slots.length > 0 && !slotIdsSet.has(t.targetSlotId)) {
            errors.push({
              code: 'SLOT_NOT_FOUND',
              message: `Rota de progressão aponta para slot de destino inexistente "${t.targetSlotId}".`,
              slotId: t.targetSlotId,
            });
          }

          // Valida conflito de ocupação (duas rotas apontando para o mesmo slot e mesmo lado)
          const occupancyKey = `${t.targetSlotId}:${t.targetSide}`;
          const currentOccupant = progressionOccupation.get(occupancyKey);
          const newOccupant = `${route.sourceSlotId}:${type}`;

          if (currentOccupant && currentOccupant !== newOccupant) {
            errors.push({
              code: 'PROGRESSION_CONFLICT',
              message: `Conflito de progressão: Slot destino "${t.targetSlotId}" lado ${t.targetSide} recebe múltiplos competidores (${currentOccupant} e ${newOccupant}).`,
              slotId: t.targetSlotId,
              details: {
                targetSlotId: t.targetSlotId,
                targetSide: t.targetSide,
                conflictA: currentOccupant,
                conflictB: newOccupant,
              },
            });
          } else {
            progressionOccupation.set(occupancyKey, newOccupant);
          }
        }
      }
    }

    // 4. Detecção de Ciclos no Grafo de Estágios (3-Color DFS)
    // 0 = UNVISITED, 1 = VISITING, 2 = VISITED
    const state = new Map<string, number>();
    for (const id of stageIdsSet) {
      state.set(id, 0);
    }

    const topologicalOrderReversed: string[] = [];
    const recursionStack: string[] = [];

    const dfs = (currId: string): void => {
      state.set(currId, 1); // VISITING
      recursionStack.push(currId);

      const neighbors = forwardAdj.get(currId) ?? new Set<string>();
      for (const nextId of neighbors) {
        const nextState = state.get(nextId) ?? 0;
        if (nextState === 1) {
          // Ciclo detectado!
          const cycleStartIndex = recursionStack.indexOf(nextId);
          const cyclePath = [...recursionStack.slice(cycleStartIndex), nextId];
          const cycleLength = cyclePath.length - 1;

          let code: StageValidationErrorCode = 'COMPLEX_CYCLE';
          if (cycleLength === 1) {
            code = 'DIRECT_CYCLE';
          } else if (cycleLength === 2) {
            code = 'INDIRECT_CYCLE';
          }

          errors.push({
            code,
            message: `Ciclo detectado no grafo de estágios: ${cyclePath.join(' -> ')}.`,
            stageId: currId,
            cyclePath,
          });
        } else if (nextState === 0) {
          dfs(nextId);
        }
      }

      recursionStack.pop();
      state.set(currId, 2); // VISITED
      topologicalOrderReversed.push(currId);
    };

    for (const id of stageIdsSet) {
      if (state.get(id) === 0) {
        dfs(id);
      }
    }

    const topologicalOrder = topologicalOrderReversed.reverse();

    return {
      isValid: errors.length === 0,
      errors,
      topologicalOrder: errors.length === 0 ? topologicalOrder : [],
    };
  }
}
