/**
 * Testes: useDrawArenaStateMachine
 *
 * Valida transições de estado, emissão de eventos, e progresso da sequência.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrawArenaStateMachine } from '@/components/draw/cinematic/useDrawArenaStateMachine';
import { buildRevealSequence } from '@/components/draw/drawRevealSequence';
import { isValidTransition, calculateProgress } from '@/types/drawCinematic';
import type { DrawResult, DrawGroup } from '@/types/draw';
import type { TeamRecord } from '@/types/entities';

describe('drawCinematic types', () => {
  it('deve validar transições permitidas', () => {
    expect(isValidTransition('IDLE', 'INTRO')).toBe(true);
    expect(isValidTransition('INTRO', 'READY')).toBe(true);
    expect(isValidTransition('READY', 'DRAWING')).toBe(true);
    expect(isValidTransition('DRAWING', 'REVEAL')).toBe(true);
  });

  it('deve rejeitar transições inválidas', () => {
    expect(isValidTransition('IDLE', 'DRAWING')).toBe(false);
    expect(isValidTransition('IDLE', 'COMPLETE')).toBe(false);
    expect(isValidTransition('COMPLETE', 'DRAWING')).toBe(false);
  });

  it('deve permitir transição para ERROR de estados específicos', () => {
    // Apenas DRAWING pode transicionar para ERROR (não REVEAL ou GROUP_UPDATE)
    expect(isValidTransition('DRAWING', 'ERROR')).toBe(true);
  });

  it('deve permitir reset de ERROR e FALLBACK', () => {
    expect(isValidTransition('ERROR', 'IDLE')).toBe(true);
    expect(isValidTransition('FALLBACK', 'IDLE')).toBe(true);
  });

  it('deve calcular progresso corretamente', () => {
    const result = calculateProgress(0, 10);
    expect(result.progress).toBe(0.1);
    expect(result.count).toBe('1 / 10');

    const result50 = calculateProgress(4, 10);
    expect(result50.progress).toBe(0.5);
    expect(result50.count).toBe('5 / 10');

    const result100 = calculateProgress(9, 10);
    expect(result100.progress).toBe(1);
    expect(result100.count).toBe('10 / 10');
  });

  it('deve clampar índice negativo em progresso (0 / total)', () => {
    const result = calculateProgress(-1, 10);
    expect(result.progress).toBe(0);
    expect(result.count).toBe('0 / 10');
  });

  it('deve clampar índice acima do total em progresso', () => {
    const result = calculateProgress(15, 10);
    expect(result.progress).toBe(1);
    expect(result.count).toBe('10 / 10');
  });

  it('deve lidar com zero total em progresso', () => {
    const result = calculateProgress(0, 0);
    expect(result.progress).toBe(0);
    expect(result.count).toBe('0 / 0');
  });

  it('deve revelar times intercalando grupos por rodada de vagas (Grupo A, depois Grupo B, etc.)', () => {
    const groups: DrawGroup[] = [
      { name: 'Grupo A', teams: [{ teamId: 'a1', seed: 1 }, { teamId: 'a2', seed: 2 }, { teamId: 'a3', seed: 3 }] },
      { name: 'Grupo B', teams: [{ teamId: 'b1', seed: 1 }, { teamId: 'b2', seed: 2 }, { teamId: 'b3', seed: 3 }] },
    ];

    const sequence = buildRevealSequence(groups);

    expect(sequence.map(item => item.groupName)).toEqual([
      'Grupo A', 'Grupo B',
      'Grupo A', 'Grupo B',
      'Grupo A', 'Grupo B',
    ]);
    expect(sequence.map(item => item.teamId)).toEqual(['a1', 'b1', 'a2', 'b2', 'a3', 'b3']);
  });

  it('deve bloquear avanço duplo antes da próxima renderização', () => {
    const groups: DrawGroup[] = [
      { name: 'A', teams: [{ teamId: 't1', seed: 1 }, { teamId: 't2', seed: 2 }] },
      { name: 'B', teams: [{ teamId: 't3', seed: 1 }, { teamId: 't4', seed: 2 }] },
    ];

    const drawResult: DrawResult = {
      competitionId: 'c1',
      config: {
        groupsCount: 2,
        seedingMode: 'random',
        seed: 1,
        headSeeds: [],
      },
      groups,
      matches: [],
      status: 'official',
    };

    const teams: TeamRecord[] = [
      { id: 't1', name: 'Time 1', shortName: 'T1', modality: 'indoor' },
      { id: 't2', name: 'Time 2', shortName: 'T2', modality: 'indoor' },
      { id: 't3', name: 'Time 3', shortName: 'T3', modality: 'indoor' },
      { id: 't4', name: 'Time 4', shortName: 'T4', modality: 'indoor' },
    ];

    const { result } = renderHook(() => useDrawArenaStateMachine({ drawResult, teams }));

    act(() => {
      result.current.start();
    });

    act(() => {
      result.current.completeIntro();
    });

    act(() => {
      result.current.startDrawing();
    });

    act(() => {
      result.current.revealNext();
      result.current.revealNext();
    });

    expect(result.current.state).toBe('REVEAL');
    expect(result.current.context.currentIndex).toBe(0);
    expect(result.current.context.currentTeam?.id).toBe('t1');
  });
});
