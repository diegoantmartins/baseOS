import { describe, expect, it } from 'vitest';
import type { MatchSlot, StageDefinition } from '@/types/competitionConfig';
import { StageGraph } from '@/services/stageGraphEngine';
import { createByeParticipantSlot, createResolvedParticipantSlot } from '@/types/competitionConfig';

describe('StageGraph & DAG Validator', () => {
  it('valida grafo linear de estágios (Grupos -> Play-In -> Quartas -> Semis -> Final)', () => {
    const stages: StageDefinition[] = [
      { id: 'groups', order: 1, name: 'Fase de Grupos', type: 'group-stage' },
      { id: 'play-in', order: 2, name: 'Play-In', type: 'play-in', dependsOnStageIds: ['groups'] },
      { id: 'knockout', order: 3, name: 'Mata-Mata', type: 'knockout', dependsOnStageIds: ['play-in'] },
    ];

    const result = StageGraph.validate(stages);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.topologicalOrder).toEqual(['groups', 'play-in', 'knockout']);
  });

  it('valida grafo ramificado (Grupos -> Chave Ouro e Grupos -> Chave Prata)', () => {
    const stages: StageDefinition[] = [
      { id: 'groups', order: 1, name: 'Fase de Grupos', type: 'group-stage' },
      { id: 'gold', order: 2, name: 'Chave Ouro', type: 'knockout', dependsOnStageIds: ['groups'] },
      { id: 'silver', order: 2, name: 'Chave Prata', type: 'knockout', dependsOnStageIds: ['groups'] },
    ];

    const result = StageGraph.validate(stages);
    expect(result.isValid).toBe(true);
    expect(result.topologicalOrder[0]).toBe('groups');
    expect(result.topologicalOrder).toContain('gold');
    expect(result.topologicalOrder).toContain('silver');
  });

  it('valida grafo convergente (Chave A e Chave B convergem para Super Final)', () => {
    const stages: StageDefinition[] = [
      { id: 'group-a', order: 1, name: 'Grupo A', type: 'round-robin' },
      { id: 'group-b', order: 1, name: 'Grupo B', type: 'round-robin' },
      { id: 'super-final', order: 2, name: 'Super Final', type: 'knockout', dependsOnStageIds: ['group-a', 'group-b'] },
    ];

    const result = StageGraph.validate(stages);
    expect(result.isValid).toBe(true);
    expect(result.topologicalOrder[2]).toBe('super-final');
  });

  it('detecta ciclo direto: A -> A', () => {
    const stages: StageDefinition[] = [
      { id: 'stage-a', order: 1, name: 'Estágio A', type: 'knockout', dependsOnStageIds: ['stage-a'] },
    ];

    const result = StageGraph.validate(stages);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'DIRECT_CYCLE')).toBe(true);
    expect(result.topologicalOrder).toHaveLength(0);
  });

  it('detecta ciclo indireto: A -> B e B -> A', () => {
    const stages: StageDefinition[] = [
      { id: 'stage-a', order: 1, name: 'Estágio A', type: 'group-stage', dependsOnStageIds: ['stage-b'] },
      { id: 'stage-b', order: 2, name: 'Estágio B', type: 'knockout', dependsOnStageIds: ['stage-a'] },
    ];

    const result = StageGraph.validate(stages);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'INDIRECT_CYCLE')).toBe(true);
  });

  it('detecta ciclo complexo: A -> B, B -> C, C -> A', () => {
    const stages: StageDefinition[] = [
      { id: 'stage-a', order: 1, name: 'Estágio A', type: 'group-stage', dependsOnStageIds: ['stage-c'] },
      { id: 'stage-b', order: 2, name: 'Estágio B', type: 'play-in', dependsOnStageIds: ['stage-a'] },
      { id: 'stage-c', order: 3, name: 'Estágio C', type: 'knockout', dependsOnStageIds: ['stage-b'] },
    ];

    const result = StageGraph.validate(stages);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'COMPLEX_CYCLE')).toBe(true);
  });

  it('detecta referência para estágio inexistente', () => {
    const stages: StageDefinition[] = [
      { id: 'stage-b', order: 2, name: 'Estágio B', type: 'knockout', dependsOnStageIds: ['non-existent-stage'] },
    ];

    const result = StageGraph.validate(stages);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'STAGE_NOT_FOUND')).toBe(true);
  });

  it('detecta MatchSlots com slotId duplicado', () => {
    const stages: StageDefinition[] = [
      { id: 'knockout', order: 1, name: 'Mata-Mata', type: 'knockout' },
    ];

    const slots: MatchSlot[] = [
      {
        slotId: 'SLOT-01',
        stageId: 'knockout',
        roundId: 'qf',
        position: 1,
        participantA: createResolvedParticipantSlot('A', 'team-1'),
        participantB: createResolvedParticipantSlot('B', 'team-2'),
      },
      {
        slotId: 'SLOT-01', // duplicado!
        stageId: 'knockout',
        roundId: 'qf',
        position: 2,
        participantA: createResolvedParticipantSlot('A', 'team-3'),
        participantB: createResolvedParticipantSlot('B', 'team-4'),
      },
    ];

    const result = StageGraph.validate(stages, slots);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'DUPLICATE_SLOT_ID')).toBe(true);
  });

  it('detecta rodada inexistente referenciada em slot', () => {
    const stages: StageDefinition[] = [
      {
        id: 'knockout',
        order: 1,
        name: 'Mata-Mata',
        type: 'knockout',
        rounds: [{ roundId: 'final', stageId: 'knockout', order: 1, name: 'Final' }],
      },
    ];

    const slots: MatchSlot[] = [
      {
        slotId: 'SLOT-01',
        stageId: 'knockout',
        roundId: 'semifinal', // rodada inexistente
        position: 1,
        participantA: createResolvedParticipantSlot('A', 'team-1'),
        participantB: createByeParticipantSlot('B'),
      },
    ];

    const result = StageGraph.validate(stages, slots);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'ROUND_NOT_FOUND')).toBe(true);
  });

  it('detecta conflito de progressão: dois slots direcionados para o mesmo slot destino e mesmo lado', () => {
    const stages: StageDefinition[] = [
      { id: 'stage-a', order: 1, name: 'Fase 1', type: 'knockout' },
      { id: 'stage-b', order: 2, name: 'Fase 2', type: 'knockout', dependsOnStageIds: ['stage-a'] },
    ];

    const slots: MatchSlot[] = [
      {
        slotId: 'SLOT-SRC-1',
        stageId: 'stage-a',
        roundId: 'r1',
        position: 1,
        participantA: createResolvedParticipantSlot('A', 'team-1'),
        participantB: createResolvedParticipantSlot('B', 'team-2'),
        progressionRoute: {
          sourceSlotId: 'SLOT-SRC-1',
          onWinner: { targetStageId: 'stage-b', targetRoundId: 'r2', targetSlotId: 'SLOT-TGT-1', targetSide: 'A' },
        },
      },
      {
        slotId: 'SLOT-SRC-2',
        stageId: 'stage-a',
        roundId: 'r1',
        position: 2,
        participantA: createResolvedParticipantSlot('A', 'team-3'),
        participantB: createResolvedParticipantSlot('B', 'team-4'),
        progressionRoute: {
          sourceSlotId: 'SLOT-SRC-2',
          // Conflito! Aponta para o mesmo slot destino e mesmo lado A!
          onWinner: { targetStageId: 'stage-b', targetRoundId: 'r2', targetSlotId: 'SLOT-TGT-1', targetSide: 'A' },
        },
      },
      {
        slotId: 'SLOT-TGT-1',
        stageId: 'stage-b',
        roundId: 'r2',
        position: 1,
        participantA: createByeParticipantSlot('A'),
        participantB: createByeParticipantSlot('B'),
      },
    ];

    const result = StageGraph.validate(stages, slots);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'PROGRESSION_CONFLICT')).toBe(true);
  });
});
