/**
 * Hook: Máquina de Estados do Draw Arena Cinematográfico
 *
 * Arquitetura unificada atômica (Finite State Machine).
 * Garante sincronização perfeita entre o estado visual ('REVEAL', 'GROUP_UPDATE', etc.)
 * e o contexto da narrativa (equipe atual, grupo destino, progresso e contadores).
 */

import { useCallback, useReducer, useEffect } from 'react';
import type {
  DrawArenaState,
  DrawArenaEvent,
  DrawArenaContext,
  DrawArenaConfig,
} from '@/types/drawCinematic';
import { isValidTransition, calculateProgress } from '@/types/drawCinematic';
import { buildRevealSequence } from '@/components/draw/drawRevealSequence';

interface MachineState {
  state: DrawArenaState;
  context: DrawArenaContext;
}

type MachineAction =
  | { type: 'START' }
  | { type: 'INTRO_COMPLETE' }
  | { type: 'DRAW_STARTED' }
  | { type: 'REVEAL_NEXT' }
  | { type: 'REVEAL_COMPLETE' }
  | { type: 'GROUP_UPDATE_COMPLETE' }
  | { type: 'REQUIRE_FALLBACK' }
  | { type: 'RESET'; payload?: DrawArenaConfig }
  | { type: 'SET_ERROR'; payload: Error }
  | { type: 'SET_STATE'; payload: DrawArenaState };

function initializeMachine(config: DrawArenaConfig): MachineState {
  const teamsMap = new Map(config.teams.map((t) => [t.id, t]));
  const revealSequence = buildRevealSequence(config.drawResult.groups);
  const initialProgress = calculateProgress(-1, revealSequence.length);

  return {
    state: 'IDLE',
    context: {
      drawResult: config.drawResult,
      teams: teamsMap,
      revealSequence,
      currentIndex: -1,
      totalReveals: revealSequence.length,
      currentReveal: null,
      currentTeam: null,
      currentGroup: null,
      progress: initialProgress.progress,
      progressCount: initialProgress.count,
      reducedMotion: config.reducedMotion ?? false,
      performanceMode: config.performanceMode ?? 'auto',
      error: null,
    },
  };
}

function machineReducer(current: MachineState, action: MachineAction): MachineState {
  switch (action.type) {
    case 'START': {
      if (!isValidTransition(current.state, 'INTRO')) return current;
      return { ...current, state: 'INTRO' };
    }

    case 'INTRO_COMPLETE': {
      if (!isValidTransition(current.state, 'READY')) return current;
      return { ...current, state: 'READY' };
    }

    case 'DRAW_STARTED': {
      if (!isValidTransition(current.state, 'DRAWING')) return current;
      return { ...current, state: 'DRAWING' };
    }

    case 'REVEAL_NEXT': {
      // Permitido avançar de DRAWING, GROUP_UPDATE ou READY
      if (current.state !== 'DRAWING' && current.state !== 'GROUP_UPDATE' && current.state !== 'READY') {
        return current;
      }

      const nextIndex = current.context.currentIndex + 1;

      if (nextIndex >= current.context.totalReveals) {
        if (!isValidTransition(current.state, 'COMPLETE')) return current;
        return {
          ...current,
          state: 'COMPLETE',
          context: {
            ...current.context,
            ...calculateProgress(current.context.totalReveals - 1, current.context.totalReveals),
          },
        };
      }

      if (!isValidTransition(current.state, 'REVEAL')) return current;

      const nextReveal = current.context.revealSequence[nextIndex] || null;
      const nextTeam = nextReveal ? current.context.teams.get(nextReveal.teamId) || null : null;
      const nextGroup = nextReveal
        ? current.context.drawResult.groups.find((g) => g.name === nextReveal.groupName) || null
        : null;
      const progressData = calculateProgress(nextIndex, current.context.totalReveals);

      return {
        state: 'REVEAL',
        context: {
          ...current.context,
          currentIndex: nextIndex,
          currentReveal: nextReveal,
          currentTeam: nextTeam,
          currentGroup: nextGroup,
          progress: progressData.progress,
          progressCount: progressData.count,
        },
      };
    }

    case 'REVEAL_COMPLETE': {
      if (!isValidTransition(current.state, 'GROUP_UPDATE')) return current;
      return { ...current, state: 'GROUP_UPDATE' };
    }

    case 'GROUP_UPDATE_COMPLETE': {
      if (current.context.currentIndex + 1 >= current.context.totalReveals) {
        if (!isValidTransition(current.state, 'COMPLETE')) return current;
        return { ...current, state: 'COMPLETE' };
      }
      if (!isValidTransition(current.state, 'DRAWING')) return current;
      return { ...current, state: 'DRAWING' };
    }

    case 'REQUIRE_FALLBACK': {
      return { ...current, state: 'FALLBACK' };
    }

    case 'RESET': {
      const config = action.payload ?? {
        drawResult: current.context.drawResult,
        teams: Array.from(current.context.teams.values()),
        reducedMotion: current.context.reducedMotion,
        performanceMode: current.context.performanceMode,
      };
      return initializeMachine(config);
    }

    case 'SET_ERROR': {
      return {
        state: 'ERROR',
        context: {
          ...current.context,
          error: action.payload,
        },
      };
    }

    case 'SET_STATE': {
      if (!isValidTransition(current.state, action.payload)) return current;
      return { ...current, state: action.payload };
    }

    default:
      return current;
  }
}

/**
 * Hook da Máquina de Estados
 */
export function useDrawArenaStateMachine(config: DrawArenaConfig) {
  const [{ state, context }, dispatch] = useReducer(
    machineReducer,
    config,
    initializeMachine
  );

  // Notifica mudanças de estado externas
  useEffect(() => {
    config.onStateChange?.(state);
  }, [state, config]);

  const emitEvent = useCallback(
    (event: DrawArenaEvent) => {
      config.onEvent?.(event);
    },
    [config]
  );

  // Transições e ações públicas
  const transitionTo = useCallback(
    (nextState: DrawArenaState): boolean => {
      if (!isValidTransition(state, nextState)) return false;
      dispatch({ type: 'SET_STATE', payload: nextState });
      return true;
    },
    [state]
  );

  const start = useCallback(() => {
    dispatch({ type: 'START' });
    emitEvent('START');
  }, [emitEvent]);

  const completeIntro = useCallback(() => {
    dispatch({ type: 'INTRO_COMPLETE' });
    emitEvent('INTRO_COMPLETE');
  }, [emitEvent]);

  const startDrawing = useCallback(() => {
    dispatch({ type: 'DRAW_STARTED' });
    emitEvent('DRAW_STARTED');
  }, [emitEvent]);

  const revealNext = useCallback(() => {
    dispatch({ type: 'REVEAL_NEXT' });
    emitEvent('DRAW_RESULT_READY');
  }, [emitEvent]);

  const completeReveal = useCallback(() => {
    dispatch({ type: 'REVEAL_COMPLETE' });
    emitEvent('REVEAL_COMPLETE');
  }, [emitEvent]);

  const completeGroupUpdate = useCallback(() => {
    dispatch({ type: 'GROUP_UPDATE_COMPLETE' });
    emitEvent('GROUP_UPDATE_COMPLETE');
  }, [emitEvent]);

  const requireFallback = useCallback(() => {
    dispatch({ type: 'REQUIRE_FALLBACK' });
    emitEvent('FALLBACK_REQUIRED');
  }, [emitEvent]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', payload: config });
    emitEvent('RESET');
  }, [config, emitEvent]);

  const setError = useCallback(
    (error: Error) => {
      dispatch({ type: 'SET_ERROR', payload: error });
      emitEvent('ERROR_OCCURRED');
    },
    [emitEvent]
  );

  return {
    state,
    context,
    transitionTo,
    start,
    completeIntro,
    startDrawing,
    revealNext,
    completeReveal,
    completeGroupUpdate,
    requireFallback,
    reset,
    setError,
    emitEvent,
    isComplete: state === 'COMPLETE',
    isError: state === 'ERROR',
    isFallback: state === 'FALLBACK',
    canAdvance: state === 'DRAWING' || state === 'GROUP_UPDATE' || state === 'READY' || state === 'REVEAL',
  };
}
