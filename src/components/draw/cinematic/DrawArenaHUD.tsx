/**
 * DrawArenaHUD
 *
 * Camada de Informação e Grafismo Oficial de Transmissão (Padrão FIVB / UEFA / CBV Gala).
 *
 * Arquitetura de Transmissão:
 *  - Top Bar: Identidade oficial da competição, status da transmissão e controle de saída.
 *  - Alas Laterais (Wings):
 *      - Ala Esquerda: Painel do Grupo A com preenchimento em tempo real e vagas em aberto.
 *      - Ala Direita: Painel do Grupo B com preenchimento em tempo real e vagas em aberto.
 *  - Palco Central: A Urna 3D em total evidência + Card de Revelação Oficial de TV (Lower-Third / Centerpiece).
 *  - Dock Inferior: Console de produção com botões de ação com brilho nobre, controle de ritmo e atalhos.
 *  - Conclusão: Apoteose com todos os grupos definidos e botão de homologação oficial.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  X,
  Trophy,
  Medal,
  Layers,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { DrawGroup, DrawResult } from '@/types/draw';
import type { DrawArenaState } from '@/types/drawCinematic';
import type { DrawRevealEvent } from '@/components/draw/drawRevealSequence';
import { buildGroupArena, headSeedOrdinalOf } from './groupArena';

interface DrawArenaHUDProps {
  state: DrawArenaState;
  progress: number;
  progressCount: string;
  currentIndex: number;
  currentTeam: TeamRecord | null;
  currentGroup: DrawGroup | null;
  teams: TeamRecord[];
  drawResult: DrawResult;
  revealSequence: DrawRevealEvent[];
  totalReveals: number;
  competition: CompetitionRecord;
  isAutoPlay: boolean;
  onAutoPlayToggle: (value: boolean) => void;
  onRevealDurationChange: (ms: number) => void;
  revealDurationMs: number;
  onClose?: () => void;
  canAdvance: boolean;
  onAdvance: () => void;
  onReset?: () => void;
  drawId?: string;
}

export function DrawArenaHUD({
  state,
  progress,
  progressCount,
  currentIndex,
  currentTeam,
  currentGroup,
  teams,
  drawResult,
  revealSequence,
  totalReveals,
  competition,
  isAutoPlay,
  onAutoPlayToggle,
  onRevealDurationChange,
  revealDurationMs,
  onClose,
  canAdvance,
  onAdvance,
  onReset,
  drawId,
}: DrawArenaHUDProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Escuta tecla G para abrir/fechar visão de grupos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const stateLabel: Record<DrawArenaState, string> = {
    IDLE: 'Aguardando Início',
    INTRO: 'Apresentação Oficial',
    READY: 'Pronto para Iniciar',
    DRAWING: 'Sorteando Esfera...',
    REVEAL: 'Revelação Oficial',
    GROUP_UPDATE: 'Chaveamento Confirmado',
    COMPLETE: 'Sorteio Concluído',
    ERROR: 'Falha no Sorteio',
    FALLBACK: 'Modo Alternativo',
  };

  // Revelações estritamente acumuladas até o índice atual (sem vazamento de resultados futuros)
  const activeRevealedEvents = useMemo(() => {
    if (currentIndex < 0) return [];
    return revealSequence.slice(0, currentIndex + 1);
  }, [revealSequence, currentIndex]);

  const arenaCards = useMemo(
    () => buildGroupArena(drawResult.groups, activeRevealedEvents, currentGroup?.name),
    [drawResult.groups, activeRevealedEvents, currentGroup?.name]
  );

  const headSeeds = useMemo(() => drawResult.config.headSeeds, [drawResult.config.headSeeds]);
  const isOfficial = drawResult.status === 'official' || drawResult.status === 'locked';

  // Equipe atual resolvida com fallback
  const resolvedTeam = useMemo(() => {
    if (currentTeam) return currentTeam;
    if (currentIndex >= 0 && currentIndex < revealSequence.length) {
      const event = revealSequence[currentIndex];
      return teams.find((t) => t.id === event.teamId) || null;
    }
    return null;
  }, [currentTeam, currentIndex, revealSequence, teams]);

  const currentHeadSeedOrdinal = useMemo(() => {
    if (!resolvedTeam) return undefined;
    return headSeedOrdinalOf(resolvedTeam.id, drawResult.config.seedingMode, headSeeds);
  }, [resolvedTeam, drawResult.config.seedingMode, headSeeds]);

  const revealedCount = Math.max(0, Math.min(currentIndex + 1, totalReveals));

  // Divisão dos grupos para as alas laterais no formato broadcast
  const { leftGroups, rightGroups } = useMemo(() => {
    if (arenaCards.length <= 1) {
      return { leftGroups: arenaCards, rightGroups: [] };
    }
    if (arenaCards.length === 2) {
      return { leftGroups: [arenaCards[0]], rightGroups: [arenaCards[1]] };
    }
    const mid = Math.ceil(arenaCards.length / 2);
    return {
      leftGroups: arenaCards.slice(0, mid),
      rightGroups: arenaCards.slice(mid),
    };
  }, [arenaCards]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between select-none overflow-hidden text-slate-50">
      {/* ── TOP BAR: IDENTIDADE DE TRANSMISSÃO OFICIAL ──────────────────────── */}
      <header className="pointer-events-auto z-20 border-b border-white/10 bg-gradient-to-b from-black/95 via-black/80 to-transparent px-4 py-3 sm:px-6 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Logo e Nome do Torneio */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden sm:inline-flex items-center rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-[#fbbf24]">
              BASEOS
            </span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/15 shadow-[0_0_18px_rgba(245,158,11,0.2)]">
              <Trophy className="h-4 w-4 text-[#fbbf24]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#fbbf24]">
                  Sorteio Oficial de Grupos
                </p>
                {isOfficial && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.2 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                    Homologado
                  </span>
                )}
              </div>
              <h1 className="truncate font-black uppercase tracking-[0.08em] text-white text-xs sm:text-sm md:text-base">
                {competition.name}
              </h1>
            </div>
          </div>

          {/* Status em Tempo Real da Transmissão */}
          <div className="hidden md:flex items-center gap-2.5 rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-xs text-slate-200 backdrop-blur-md shadow-inner">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                state === 'DRAWING'
                  ? 'animate-ping bg-[#fbbf24]'
                  : state === 'REVEAL' || state === 'GROUP_UPDATE'
                    ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                    : state === 'COMPLETE'
                      ? 'bg-blue-400'
                      : 'bg-slate-400'
              )}
            />
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-100">
              {stateLabel[state]}
            </span>
          </div>

          {/* Ações da Barra Superior */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botão Ver Grupos (gaveta em telas menores) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="gap-1.5 border-white/20 bg-slate-900/80 text-xs font-bold hover:border-[#fbbf24]/60 hover:bg-[#fbbf24]/15 text-slate-200"
            >
              <Layers className="h-3.5 w-3.5 text-[#fbbf24]" />
              <span className="hidden sm:inline">Grupos</span>
              <span className="rounded bg-black/70 px-1.5 py-0.2 text-[10px] font-mono text-[#fbbf24]">
                {revealedCount}/{totalReveals}
              </span>
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                title="Sair do Sorteio (Esc)"
                className="text-slate-400 hover:bg-white/10 hover:text-white rounded-xl h-9 w-9"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── PALCO PRINCIPAL (ALAS LATERAIS + PALCO 3D CENTRAL + CARD REVELAÇÃO) ── */}
      <div className="relative flex flex-1 items-stretch justify-between px-3 sm:px-6 py-2 overflow-hidden">
        {/* ── ALA ESQUERDA: GRUPOS (Desktop) ─────────────────────────────────── */}
        <aside className="pointer-events-auto hidden lg:flex flex-col justify-center gap-4 w-64 xl:w-72 shrink-0 z-10">
          {leftGroups.map((card) => {
            const isTarget = card.isCurrentGroup && (state === 'REVEAL' || state === 'GROUP_UPDATE');
            return (
              <div
                key={card.name}
                className={cn(
                  'rounded-2xl border bg-slate-950/75 p-3.5 backdrop-blur-xl transition-all duration-500 shadow-2xl',
                  isTarget
                    ? 'border-[#fbbf24] shadow-[0_0_30px_rgba(245,158,11,0.35)] scale-[1.02]'
                    : 'border-white/10'
                )}
              >
                <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className={cn('h-3.5 w-3.5', isTarget ? 'text-[#fbbf24]' : 'text-slate-400')} />
                    <span className="font-black text-xs uppercase tracking-wider text-white">
                      {card.name}
                    </span>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[9px] font-mono font-bold',
                    isTarget ? 'bg-[#fbbf24] text-slate-950' : 'bg-white/10 text-slate-300'
                  )}>
                    {card.revealedCount}/{card.totalCount}
                  </span>
                </div>

                {/* Slots das equipes no grupo */}
                <div className="space-y-1.5">
                  {Array.from({ length: card.totalCount }).map((_, slotIdx) => {
                    const entry = card.teams[slotIdx];
                    if (entry && entry.revealed) {
                      const team = teams.find((t) => t.id === entry.teamId);
                      const headSeed = headSeedOrdinalOf(
                        entry.teamId,
                        drawResult.config.seedingMode,
                        headSeeds
                      );
                      const isCurrentDraw = resolvedTeam?.id === entry.teamId && (state === 'REVEAL' || state === 'GROUP_UPDATE');

                      return (
                        <div
                          key={entry.teamId}
                          className={cn(
                            'flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] border transition-all duration-300',
                            isCurrentDraw
                              ? 'border-[#fbbf24] bg-[#fbbf24]/20 text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                              : 'border-white/10 bg-slate-900/80 text-slate-200'
                          )}
                        >
                          <span className="truncate flex items-center gap-1.5 font-semibold">
                            <span className="font-mono text-[9px] text-slate-400">
                              {slotIdx + 1}.
                            </span>
                            {team?.name ?? entry.teamId}
                          </span>
                          {headSeed !== undefined && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black uppercase text-[#fbbf24] bg-[#fbbf24]/15 px-1.5 py-0.5 rounded border border-[#fbbf24]/30">
                              <Medal className="h-2.5 w-2.5" />
                              C.{headSeed}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // Vaga ainda em aberto
                    return (
                      <div
                        key={`empty-${slotIdx}`}
                        className="flex items-center justify-between rounded-lg border border-dashed border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] text-slate-500 font-mono"
                      >
                        <span>{slotIdx + 1}. Vaga em aberto</span>
                        <span className="text-[9px] text-slate-600">aguardando</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        {/* ── CENTRO: PALCO DA URNA 3D + GRAFISMO DE REVELAÇÃO TV ─────────────── */}
        <main className="pointer-events-none relative flex flex-1 flex-col items-center justify-end pb-4 sm:pb-6 z-10 px-2">
          {/* ESTADO FINAL: APOTEOSE COM TODOS OS GRUPOS DEFINIDOS */}
          {state === 'COMPLETE' ? (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="pointer-events-auto w-full max-w-4xl rounded-3xl border border-[#fbbf24]/40 bg-black/90 p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] backdrop-blur-2xl"
            >
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#fbbf24]/50 bg-[#fbbf24]/15 px-4 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-[#fbbf24]">
                  <Trophy className="h-4 w-4" />
                  Sorteio Homologado com Sucesso
                </div>
                <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-[0.1em] text-white drop-shadow-md">
                  Chaveamento Oficial Definido
                </h2>
                <p className="mt-1 text-xs text-slate-300 max-w-lg mx-auto">
                  Todas as equipes foram sorteadas e alocadas conforme as diretrizes regulamentares da competição.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 max-h-[46vh] overflow-y-auto pr-1">
                {arenaCards.map((card) => (
                  <div
                    key={card.name}
                    className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 backdrop-blur-md"
                  >
                    <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-black text-xs uppercase tracking-wider text-white">
                        {card.name}
                      </span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-300 font-bold">
                        {card.revealedCount} equipes
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {card.teams.map((entry, idx) => {
                        const team = teams.find((t) => t.id === entry.teamId);
                        const headSeed = headSeedOrdinalOf(
                          entry.teamId,
                          drawResult.config.seedingMode,
                          headSeeds
                        );
                        return (
                          <div
                            key={entry.teamId}
                            className="flex items-center justify-between gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 border border-white/10"
                          >
                            <span className="truncate font-semibold flex items-center gap-1.5">
                              <span className="font-mono text-[9px] text-slate-400">
                                {idx + 1}.
                              </span>
                              {team?.name ?? entry.teamId}
                            </span>
                            {headSeed !== undefined && (
                              <span className="flex items-center gap-0.5 text-[8px] font-black uppercase text-[#fbbf24] bg-[#fbbf24]/15 px-1.5 py-0.2 rounded">
                                C.{headSeed}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10">
                {onReset && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="border-white/20 bg-slate-900 text-xs hover:bg-white/10 font-bold"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Rever Sorteio
                  </Button>
                )}
                {onClose && (
                  <Button
                    size="sm"
                    onClick={onClose}
                    className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider px-6 shadow-[0_0_25px_rgba(245,158,11,0.4)] h-9"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Homologar e Voltar ao Sistema
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            /* ── GRAFISMO DE REVELAÇÃO CENTRAL DE TV ───────────────────────── */
            <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
              <AnimatePresence mode="wait">
                {/* Indicador Inicial quando READY */}
                {state === 'READY' && (
                  <motion.div
                    key="ready-callout"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="pointer-events-auto flex flex-col items-center text-center px-6 py-3 rounded-full border border-[#fbbf24]/40 bg-black/80 shadow-[0_0_30px_rgba(245,158,11,0.2)] backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#fbbf24] animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#fbbf24]">
                        Urna de Cristal Pronta
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-0.5">
                      Pressione <strong className="text-white">INICIAR SORTEIO</strong> ou a barra de <strong className="text-white">[Espaço]</strong> para o sorteio oficial
                    </p>
                  </motion.div>
                )}

                {/* GRAND TV REVEAL BANNER (Lower-Third / Centerpiece) */}
                {(state === 'REVEAL' || state === 'GROUP_UPDATE') && resolvedTeam && (
                  <motion.div
                    key={resolvedTeam.id}
                    initial={{ opacity: 0, scale: 0.85, y: 25 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-auto flex flex-col items-center text-center w-full max-w-xl p-5 sm:p-6 rounded-3xl border-2 border-[#fbbf24]/60 bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-black/95 shadow-[0_0_80px_rgba(245,158,11,0.35)] backdrop-blur-2xl"
                  >
                    {/* Faixa superior do card de revelação */}
                    <div className="flex items-center gap-2.5 mb-2">
                      {currentHeadSeedOrdinal !== undefined && (
                        <span className="flex items-center gap-1 rounded-full border border-[#fbbf24] bg-[#fbbf24]/20 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#fbbf24] shadow-sm">
                          <Medal className="h-3.5 w-3.5 text-[#fbbf24]" />
                          Cabeça de Chave {currentHeadSeedOrdinal}
                        </span>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300">
                        {state === 'REVEAL' ? 'Equipe Sorteada' : 'Alocação Confirmada'}
                      </span>
                    </div>

                    {/* Brasão / Emblema da Equipe */}
                    <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#fbbf24] bg-gradient-to-br from-amber-500/20 to-amber-900/40 text-lg font-black text-white shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                      {resolvedTeam.shortName || resolvedTeam.name.substring(0, 3).toUpperCase()}
                    </div>

                    {/* Nome Principal da Equipe com tipografia televisiva marcante */}
                    <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
                      {resolvedTeam.name}
                    </h2>

                    {/* Destino no Grupo (Callout animado) */}
                    {currentGroup && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-4 py-1.5 text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.3)]"
                      >
                        <ChevronRight className="h-4 w-4 text-emerald-400" />
                        <span>Destino: {currentGroup.name}</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chips contextuais para telas móveis (< lg) */}
              <div className="pointer-events-auto flex lg:hidden flex-wrap items-center justify-center gap-2 mt-2">
                {arenaCards.map((card) => {
                  const isTarget = card.isCurrentGroup && (state === 'REVEAL' || state === 'GROUP_UPDATE');
                  return (
                    <button
                      key={card.name}
                      type="button"
                      onClick={() => setIsDrawerOpen(true)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold backdrop-blur-xl transition-all duration-300',
                        isTarget
                          ? 'border-[#fbbf24] bg-[#fbbf24]/25 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105'
                          : card.revealedCount === card.totalCount && card.totalCount > 0
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/15 bg-black/60 text-slate-200'
                      )}
                    >
                      <span className="uppercase text-[10px] tracking-wider">{card.name}</span>
                      <span className="rounded bg-black/70 px-1.5 font-mono text-[9px] text-[#fbbf24]">
                        {card.revealedCount}/{card.totalCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* ── ALA DIREITA: GRUPOS (Desktop) ─────────────────────────────────── */}
        <aside className="pointer-events-auto hidden lg:flex flex-col justify-center gap-4 w-64 xl:w-72 shrink-0 z-10">
          {rightGroups.map((card) => {
            const isTarget = card.isCurrentGroup && (state === 'REVEAL' || state === 'GROUP_UPDATE');
            return (
              <div
                key={card.name}
                className={cn(
                  'rounded-2xl border bg-slate-950/75 p-3.5 backdrop-blur-xl transition-all duration-500 shadow-2xl',
                  isTarget
                    ? 'border-[#fbbf24] shadow-[0_0_30px_rgba(245,158,11,0.35)] scale-[1.02]'
                    : 'border-white/10'
                )}
              >
                <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className={cn('h-3.5 w-3.5', isTarget ? 'text-[#fbbf24]' : 'text-slate-400')} />
                    <span className="font-black text-xs uppercase tracking-wider text-white">
                      {card.name}
                    </span>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[9px] font-mono font-bold',
                    isTarget ? 'bg-[#fbbf24] text-slate-950' : 'bg-white/10 text-slate-300'
                  )}>
                    {card.revealedCount}/{card.totalCount}
                  </span>
                </div>

                {/* Slots das equipes no grupo */}
                <div className="space-y-1.5">
                  {Array.from({ length: card.totalCount }).map((_, slotIdx) => {
                    const entry = card.teams[slotIdx];
                    if (entry && entry.revealed) {
                      const team = teams.find((t) => t.id === entry.teamId);
                      const headSeed = headSeedOrdinalOf(
                        entry.teamId,
                        drawResult.config.seedingMode,
                        headSeeds
                      );
                      const isCurrentDraw = resolvedTeam?.id === entry.teamId && (state === 'REVEAL' || state === 'GROUP_UPDATE');

                      return (
                        <div
                          key={entry.teamId}
                          className={cn(
                            'flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] border transition-all duration-300',
                            isCurrentDraw
                              ? 'border-[#fbbf24] bg-[#fbbf24]/20 text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                              : 'border-white/10 bg-slate-900/80 text-slate-200'
                          )}
                        >
                          <span className="truncate flex items-center gap-1.5 font-semibold">
                            <span className="font-mono text-[9px] text-slate-400">
                              {slotIdx + 1}.
                            </span>
                            {team?.name ?? entry.teamId}
                          </span>
                          {headSeed !== undefined && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black uppercase text-[#fbbf24] bg-[#fbbf24]/15 px-1.5 py-0.5 rounded border border-[#fbbf24]/30">
                              <Medal className="h-2.5 w-2.5" />
                              C.{headSeed}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // Vaga ainda em aberto
                    return (
                      <div
                        key={`empty-${slotIdx}`}
                        className="flex items-center justify-between rounded-lg border border-dashed border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] text-slate-500 font-mono"
                      >
                        <span>{slotIdx + 1}. Vaga em aberto</span>
                        <span className="text-[9px] text-slate-600">aguardando</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>
      </div>

      {/* ── DOCK INFERIOR: CONSOLE DE PRODUÇÃO TELEVISIVA ────────────────────── */}
      <footer className="pointer-events-auto z-20 border-t border-white/10 bg-gradient-to-t from-black/95 via-black/85 to-transparent px-4 py-3 sm:px-8 sm:py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-3 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Progresso Geral */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span>Equipes Sorteadas</span>
                  <span className="font-mono font-bold text-[#fbbf24]">{progressCount}</span>
                </div>
                <div className="mt-1 h-2 w-28 sm:w-36 overflow-hidden rounded-full bg-white/10 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controles de Reprodução Centrais */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={isAutoPlay ? 'default' : 'outline'}
                onClick={() => onAutoPlayToggle(!isAutoPlay)}
                className={cn(
                  'gap-2 text-xs font-bold h-10 px-3.5 rounded-xl border',
                  isAutoPlay
                    ? 'border-amber-500/40 bg-amber-500/20 text-[#fbbf24] hover:bg-amber-500/30'
                    : 'border-white/15 bg-slate-900/80 text-slate-200'
                )}
              >
                {isAutoPlay ? (
                  <>
                    <Pause className="h-4 w-4 text-[#fbbf24]" />
                    <span className="hidden sm:inline">Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span className="hidden sm:inline">Auto</span>
                  </>
                )}
              </Button>

              {/* Botão de Ação Primário com Brilho Nobre */}
              <Button
                size="sm"
                variant="default"
                onClick={onAdvance}
                disabled={!canAdvance}
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider px-5 sm:px-6 h-10 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.4)] disabled:opacity-40"
              >
                <SkipForward className="h-4 w-4" />
                <span>
                  {state === 'READY'
                    ? 'INICIAR SORTEIO'
                    : state === 'COMPLETE'
                      ? 'FINALIZADO'
                      : 'SORTEAR PRÓXIMO'}
                </span>
              </Button>
            </div>

            {/* Controle de Velocidade e Informações */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Ritmo:</span>
                <input
                  type="range"
                  min={1200}
                  max={5000}
                  step={200}
                  value={revealDurationMs}
                  onChange={(e) => onRevealDurationChange(Number(e.target.value))}
                  className="h-1.5 w-20 cursor-pointer accent-[#fbbf24] bg-white/20 rounded-lg"
                />
                <span className="text-[10px] font-mono text-slate-300 w-8 text-right">
                  {(revealDurationMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé com Atalhos de Teclado e Auditoria */}
          <div className="flex flex-wrap items-center justify-between border-t border-white/5 pt-2 text-[10px] text-slate-400">
            <div className="hidden sm:flex items-center gap-3">
              <span>Atalhos:</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-slate-300">Espaço</span> Pausar
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-slate-300">➔</span> Próximo
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-slate-300">G</span> Ver Grupos
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-slate-300">Esc</span> Sair
            </div>
            {drawId && (
              <span className="font-mono text-[9px] text-slate-500">
                AUDITORIA #{drawId.substring(0, 8).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </footer>

      {/* ── GAVETA MODAL DE GRUPOS (Sob demanda com tecla G ou botão Grupos) ── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setIsDrawerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-3xl border border-white/15 bg-slate-950/95 p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#fbbf24]" />
                  <h3 className="font-black text-sm uppercase tracking-wider text-white">
                    Composição dos Grupos
                  </h3>
                  <span className="rounded-full bg-[#fbbf24]/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#fbbf24]">
                    {revealedCount}/{totalReveals} equipes sorteadas
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-lg h-8 w-8 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                {arenaCards.map((card) => (
                  <div
                    key={card.name}
                    className={cn(
                      'rounded-2xl border p-3.5 backdrop-blur-md',
                      card.isCurrentGroup
                        ? 'border-[#fbbf24]/60 bg-[#fbbf24]/10'
                        : 'border-white/10 bg-slate-900/60'
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-black text-xs uppercase tracking-wider text-white">
                        {card.name}
                      </span>
                      <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-[#fbbf24]">
                        {card.revealedCount}/{card.totalCount}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {Array.from({ length: card.totalCount }).map((_, slotIdx) => {
                        const entry = card.teams[slotIdx];
                        if (entry && entry.revealed) {
                          const team = teams.find((t) => t.id === entry.teamId);
                          const headSeed = headSeedOrdinalOf(
                            entry.teamId,
                            drawResult.config.seedingMode,
                            headSeeds
                          );
                          return (
                            <div
                              key={entry.teamId}
                              className="flex items-center justify-between gap-1 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11px] text-slate-200 border border-white/5"
                            >
                              <span className="truncate font-semibold flex items-center gap-1.5">
                                <span className="font-mono text-[9px] text-slate-500">
                                  {slotIdx + 1}.
                                </span>
                                {team?.name ?? entry.teamId}
                              </span>
                              {headSeed !== undefined && (
                                <span className="text-[8px] font-black uppercase text-[#fbbf24] bg-[#fbbf24]/20 px-1.5 py-0.5 rounded">
                                  C.{headSeed}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={`modal-empty-${slotIdx}`}
                            className="flex items-center justify-between rounded-lg border border-dashed border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] text-slate-500 font-mono"
                          >
                            <span>{slotIdx + 1}. Vaga em aberto</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDrawerOpen(false)}
                  className="border-white/20 bg-slate-900 text-xs font-bold"
                >
                  Voltar ao Sorteio
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
