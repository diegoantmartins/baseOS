/**
 * DrawArenaController
 *
 * Componente principal do Draw Arena Cinematográfico.
 * Orquestra a máquina de estados e apresentação visual.
 *
 * Transformado na Etapa 13.1 em um TAKEOVER FULLSCREEN EXCLUSIVO:
 *  - Sai da interface operacional do BaseOS (fixed inset-0 z-[100]);
 *  - Palco 3D desobstruído com a Draw Chamber como protagonista;
 *  - Suporte a teclado global (Esc para fechar, Espaço para play/pause, Seta direita para avançar);
 *  - Captura e recuperação graciosa de falhas WebGL / Context Lost via DrawScene3D.
 */

import React, { Component, useEffect, useRef, useState, useCallback } from 'react';
import type { DrawResult } from '@/types/draw';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import { useDrawArenaStateMachine } from './useDrawArenaStateMachine';
import { DrawArenaCanvas } from './DrawArenaCanvas';
import { DrawArenaHUD } from './DrawArenaHUD';
import { DrawScene3D } from '../DrawScene3D';
import { ANIMATION_TIMINGS, resolveDrawTimings } from '@/config/drawArenaFeatures';

interface DrawArenaControllerProps {
  /** Resultado do sorteio (vem do motor puro em DrawPage) */
  result: DrawResult;

  /** Lista de equipes para lookup */
  teams: TeamRecord[];

  /** Competição para contexto */
  competition: CompetitionRecord;

  /** Callback ao fechar modal */
  onClose?: () => void;

  /** ID real do sorteio persistido (para auditoria). Se undefined, não exibe. */
  drawId?: string;

  /** Modo Simulação / Demo (sem persistência) */
  isSimulation?: boolean;
}

/**
 * Error Boundary específico para captura de falhas de renderização WebGL/Three.js.
 * Redireciona imediatamente para o fallback 2D/CSS controlado sem tela preta.
 */
class WebGLErrorBoundary extends Component<
  { onError: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[DrawArena] Erro no pipeline WebGL — acionando fallback:', error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Controller principal do Draw Arena
 */
export function DrawArenaController({
  result,
  teams,
  competition,
  onClose,
  drawId,
  isSimulation,
}: DrawArenaControllerProps) {
  // Estados de controle: inicia em pausa (false) para permitir contemplação da Urna em READY
  const [autoPlay, setAutoPlay] = useState(false);
  const [revealDurationMs, setRevealDurationMs] = useState(ANIMATION_TIMINGS.PREPARE_MS);

  // Timing real derivado de UMA única fonte
  const { prepare, revealHold, groupHold } = resolveDrawTimings(revealDurationMs);

  // Máquina de estados
  const machine = useDrawArenaStateMachine({
    drawResult: result,
    teams,
  });

  const startTriggeredRef = useRef(false);

  // === EFEITO: Trava o scroll do body durante a experiência fullscreen ===
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // === EFEITO: Iniciar quando montar ===
  useEffect(() => {
    if (!startTriggeredRef.current) {
      startTriggeredRef.current = true;
      machine.start();
    }
  }, [machine]);

  // === EFEITO: Ir para READY após intro ===
  useEffect(() => {
    if (machine.state === 'INTRO') {
      const timer = setTimeout(() => {
        machine.completeIntro();
      }, 700); // transição suave de intro
      return () => clearTimeout(timer);
    }
  }, [machine.state, machine]);

  // === EFEITO: Iniciar DRAWING após READY se autoplay for acionado ===
  useEffect(() => {
    if (machine.state === 'READY' && autoPlay) {
      const timer = setTimeout(() => {
        machine.startDrawing();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [machine.state, autoPlay, machine]);

  // === EFEITO: Revelar após tempo de turbilhonamento na DRAWING ===
  useEffect(() => {
    if (machine.state !== 'DRAWING') {
      return;
    }

    const timer = setTimeout(() => {
      machine.revealNext();
    }, prepare);

    return () => clearTimeout(timer);
  }, [machine.state, prepare, machine]);

  // === EFEITO: Ir para GROUP_UPDATE após REVEAL (se autoplay ativo) ===
  useEffect(() => {
    if (machine.state === 'REVEAL' && autoPlay) {
      const timer = setTimeout(() => {
        machine.completeReveal();
      }, revealHold); // pausa para leitura da equipe revelada
      return () => clearTimeout(timer);
    }
  }, [machine.state, autoPlay, revealHold, machine]);

  // === EFEITO: Processar GROUP_UPDATE (se autoplay ativo) ===
  useEffect(() => {
    if (machine.state === 'GROUP_UPDATE' && autoPlay) {
      const timer = setTimeout(() => {
        machine.completeGroupUpdate();
      }, groupHold); // tempo para o grupo ser confirmado antes do próximo time
      return () => clearTimeout(timer);
    }
  }, [machine.state, autoPlay, groupHold, machine]);

  // Tratar avanço manual em qualquer estado válido
  const handleAdvance = useCallback(() => {
    if (machine.state === 'READY') {
      machine.startDrawing();
    } else if (machine.state === 'REVEAL') {
      machine.completeReveal();
      setTimeout(() => {
        machine.completeGroupUpdate();
      }, 500);
    } else if (machine.state === 'GROUP_UPDATE') {
      machine.completeGroupUpdate();
    } else if (machine.state === 'DRAWING') {
      machine.revealNext();
    }
  }, [machine]);

  // === EFEITO: Teclas de Atalho Globais (Esc, Espaço, Seta Direita) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não interceptar se o foco estiver em campo de texto
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (machine.state === 'READY') {
          machine.startDrawing();
        } else {
          setAutoPlay((prev) => !prev);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (machine.canAdvance) {
          handleAdvance();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [machine.canAdvance, machine.state, machine, handleAdvance, onClose]);

  // === RENDERIZAÇÃO: Fallback gracioso para DrawScene3D (CSS/Framer Motion) ===
  if (machine.state === 'FALLBACK' || machine.state === 'ERROR') {
    return (
      <div className="fixed inset-0 z-[100] w-screen h-screen bg-[#05070c] overflow-hidden">
        <DrawScene3D
          result={result}
          teams={teams}
          competition={competition}
          revealDurationMs={revealDurationMs}
          onClose={onClose}
        />
      </div>
    );
  }

  // === RENDERIZAÇÃO: Experiência Cinematográfica Fullscreen ===
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sorteio Oficial de Grupos"
      className="fixed inset-0 z-[100] w-screen h-screen bg-[#05070c] overflow-hidden select-none flex flex-col"
    >
      {/* Palco 3D com Error Boundary e detecção de Context Lost */}
      <WebGLErrorBoundary onError={() => machine.requireFallback()}>
        <DrawArenaCanvas
          state={machine.state}
          currentTeam={machine.context.currentTeam}
          currentGroup={machine.context.currentGroup}
          drawResult={result}
          competition={competition}
          teams={teams}
          onContextLost={() => machine.requireFallback()}
        />
      </WebGLErrorBoundary>

      {/* Camada HUD Oficial de Informação e Controles */}
      <DrawArenaHUD
        state={machine.state}
        progress={machine.context.progress}
        progressCount={machine.context.progressCount}
        currentIndex={machine.context.currentIndex}
        currentTeam={machine.context.currentTeam}
        currentGroup={machine.context.currentGroup}
        teams={teams}
        drawResult={result}
        revealSequence={machine.context.revealSequence}
        totalReveals={machine.context.totalReveals}
        competition={competition}
        isAutoPlay={autoPlay}
        onAutoPlayToggle={setAutoPlay}
        onRevealDurationChange={setRevealDurationMs}
        revealDurationMs={revealDurationMs}
        onClose={onClose}
        canAdvance={machine.canAdvance}
        onAdvance={handleAdvance}
        onReset={machine.reset}
        drawId={drawId}
        isSimulation={isSimulation}
      />
    </div>
  );
}
