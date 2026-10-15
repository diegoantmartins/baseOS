/**
 * DrawArenaHUD
 *
 * Camada de Informação e Grafismo Oficial de Transmissão Broadcast Studio
 * Padrão UEFA TV / FIVB World Gala / CBV.
 *
 * Arquitetura de Transmissão:
 *  1. Top Bar: Identidade oficial da competição, status da transmissão e controle de saída.
 *  2. Pote de Equipes (Pot Strip): Roleta visual com escudos de todas as equipes no topo.
 *  3. Palco Central: Grid Simétrico de Colunas (Grupos A, B, C lado a lado) com escudos 44x44px
 *     e indicador pulsante âmbar da vaga alvo ("Sorteando agora...").
 *  4. Spotlight Hero Card: Revelação central elegante com escudo gigante (96px+) e pílula de destino.
 *  5. Dock Inferior: Console de controle com ritmo, autoplay, atalhos e confetes.
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
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { TeamCrest } from '@/components/ui/TeamCrest';
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
  isSimulation?: boolean;
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
  isSimulation = false,
}: DrawArenaHUDProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Confetti comemorativo ao concluir sorteio
  useEffect(() => {
    if (state === 'COMPLETE') {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#ffffff', '#10b981'],
        });

        const timer1 = setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0.05, y: 0.65 },
            colors: ['#fbbf24', '#d97706', '#ffffff'],
          });
        }, 220);

        const timer2 = setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 0.95, y: 0.65 },
            colors: ['#38bdf8', '#1d4ed8', '#ffffff'],
          });
        }, 400);

        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } catch (err) {
        console.warn('[DrawArenaHUD] Falha ao disparar confetes:', err);
      }
    }
  }, [state]);

  // Eventos acumulados até o índice atual
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

  // Próximo evento a ser sorteado
  const nextRevealEvent = useMemo(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= 0 && nextIdx < revealSequence.length) {
      return revealSequence[nextIdx];
    }
    return null;
  }, [currentIndex, revealSequence]);

  // Mapeamento de quais equipes já foram sorteadas e para qual grupo foram
  const drawnTeamInfoMap = useMemo(() => {
    const map = new Map<string, { groupName: string; badge: string }>();
    activeRevealedEvents.forEach((ev) => {
      const badge = ev.groupName.replace(/Grupo\s*/i, 'G').trim().toUpperCase();
      map.set(ev.teamId, { groupName: ev.groupName, badge });
    });
    return map;
  }, [activeRevealedEvents]);

  // Equipes restantes no pote
  const remainingPotTeams = useMemo(() => {
    return teams.filter((t) => !drawnTeamInfoMap.has(t.id));
  }, [teams, drawnTeamInfoMap]);

  // Roleta de destaque no pote durante DRAWING (110ms por passo)
  const [rouletteIndex, setRouletteIndex] = useState(0);
  useEffect(() => {
    if (state !== 'DRAWING' || remainingPotTeams.length === 0) return;
    const interval = setInterval(() => {
      setRouletteIndex((prev) => (prev + 1) % remainingPotTeams.length);
    }, 110);
    return () => clearInterval(interval);
  }, [state, remainingPotTeams.length]);

  const highlightedPotTeamId = useMemo(() => {
    if (state === 'DRAWING' && remainingPotTeams.length > 0) {
      return remainingPotTeams[rouletteIndex]?.id ?? null;
    }
    if ((state === 'REVEAL' || state === 'GROUP_UPDATE') && resolvedTeam) {
      return resolvedTeam.id;
    }
    return null;
  }, [state, remainingPotTeams, rouletteIndex, resolvedTeam]);

  // Posição alvo da vaga para a revelação hero
  const targetSlotOrdinal = useMemo(() => {
    if (!currentGroup || !resolvedTeam) return 1;
    const idx = currentGroup.teams.findIndex((t) => t.teamId === resolvedTeam.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [currentGroup, resolvedTeam]);

  // Status visual da transmissão
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

  const revealedCount = Math.max(0, Math.min(currentIndex + 1, totalReveals));

  // Determina número de colunas da grade de grupos
  const gridColsClass = useMemo(() => {
    if (arenaCards.length === 1) return 'grid-cols-1 max-w-md';
    if (arenaCards.length === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-3xl';
    if (arenaCards.length === 3) return 'grid-cols-1 md:grid-cols-3 max-w-4xl lg:max-w-5xl';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl';
  }, [arenaCards.length]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between select-none overflow-hidden text-slate-50">
      {/* ── TOP BAR: IDENTIDADE DE TRANSMISSÃO OFICIAL ──────────────────────── */}
      <header className="pointer-events-auto z-30 border-b border-white/10 bg-slate-950/90 px-4 py-2.5 sm:px-6 backdrop-blur-md">
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
                  {isSimulation ? 'Simulação de Sorteio' : 'Sorteio Oficial de Grupos'}
                </p>
                {isSimulation ? (
                  <span className="rounded-full border border-amber-400/60 bg-amber-500/20 px-2 py-0.2 text-[8px] font-bold uppercase tracking-wider text-amber-300">
                    Modo Simulação
                  </span>
                ) : isOfficial ? (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.2 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                    Homologado
                  </span>
                ) : null}
              </div>
              <h1 className="truncate font-black uppercase tracking-[0.08em] text-white text-xs sm:text-sm md:text-base">
                {competition.name}
              </h1>
            </div>
          </div>

          {/* Status em Tempo Real da Transmissão */}
          <div className="hidden md:flex items-center gap-2.5 rounded-full border border-white/15 bg-black/60 px-4 py-1.5 text-xs text-slate-200 backdrop-blur-md shadow-inner">
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

      {/* ── FAIXA DO POTE: "POTE DO SORTEIO (EQUIPES)" COM ROLETA DE ESCUDOS ── */}
      <section className="pointer-events-auto z-20 border-b border-white/10 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-transparent px-3 py-2 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                Pote do Sorteio ({remainingPotTeams.length} restantes de {teams.length})
              </span>
            </div>
            {state === 'DRAWING' && (
              <span className="text-[10px] font-bold text-amber-400 animate-pulse uppercase tracking-wider">
                Embaralhando urnas...
              </span>
            )}
          </div>

          {/* Lista Horizontal de Equipes com Escudos e Roleta Luminosa */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {teams.map((team) => {
              const drawnInfo = drawnTeamInfoMap.get(team.id);
              const isDrawn = !!drawnInfo;
              const isHighlighted = highlightedPotTeamId === team.id;

              return (
                <div
                  key={team.id}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-200 border shrink-0',
                    isDrawn
                      ? 'opacity-35 bg-slate-950/40 border-white/5 text-slate-400'
                      : isHighlighted
                        ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.45)] scale-105 text-white'
                        : 'bg-slate-900/80 border-white/15 text-slate-200 hover:border-white/30'
                  )}
                >
                  <TeamCrest
                    team={team}
                    size="xs"
                    showBorder={!isDrawn}
                    className={cn(isDrawn && 'grayscale')}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate max-w-[85px] sm:max-w-[110px] text-xs font-bold leading-tight">
                      {team.shortName || team.name}
                    </span>
                    {isDrawn ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                        <Check className="h-2.5 w-2.5" />
                        {drawnInfo.badge}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">No pote</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CENTRO DO PALCO: GRADE SIMÉTRICA DE CHAVES (GRUPOS A, B, C LADO A LADO) ── */}
      <main className="pointer-events-auto relative flex flex-1 flex-col items-center justify-start px-4 py-3 sm:py-4 overflow-y-auto">
        <div className={cn('grid gap-3.5 sm:gap-4 w-full mx-auto my-auto', gridColsClass)}>
          {arenaCards.map((card) => {
            const isCurrentGroupCard = card.name === currentGroup?.name && (state === 'REVEAL' || state === 'GROUP_UPDATE');
            const isNextTargetGroup = (state === 'DRAWING' || state === 'READY') && nextRevealEvent?.groupName === card.name;

            return (
              <div
                key={card.name}
                className={cn(
                  'rounded-2xl sm:rounded-3xl border bg-slate-950/85 p-3 sm:p-3.5 backdrop-blur-xl transition-all duration-300 shadow-xl flex flex-col',
                  isCurrentGroupCard
                    ? 'border-amber-400/80 ring-1.5 ring-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                    : isNextTargetGroup
                      ? 'border-amber-500/40'
                      : 'border-white/15'
                )}
              >
                {/* Cabeçalho do Grupo */}
                <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2 px-0.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-md border',
                        isCurrentGroupCard
                          ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                          : 'border-white/15 bg-white/5 text-slate-300'
                      )}
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200">
                        {card.name}
                      </h2>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-mono font-bold border',
                      isCurrentGroupCard
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-white/10 bg-white/10 text-slate-200'
                    )}
                  >
                    {card.revealedCount} / {card.totalCount} vagas
                  </span>
                </div>

                {/* Vagas do Grupo (Slots Compactos h-11 / h-12) */}
                <div className="space-y-1.5 flex-1">
                  {Array.from({ length: card.totalCount }).map((_, slotIdx) => {
                    const entry = card.teams[slotIdx];
                    const isRevealed = entry && entry.revealed;

                    if (isRevealed) {
                      const team = teams.find((t) => t.id === entry.teamId);
                      const headSeed = headSeedOrdinalOf(
                        entry.teamId,
                        drawResult.config.seedingMode,
                        headSeeds
                      );
                      const isCurrentDrawTeam =
                        resolvedTeam?.id === entry.teamId &&
                        (state === 'REVEAL' || state === 'GROUP_UPDATE');

                      return (
                        <div
                          key={entry.teamId}
                          className={cn(
                            'h-11 sm:h-12 flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 border transition-all duration-300',
                            isCurrentDrawTeam
                              ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                              : 'border-white/10 bg-slate-900/80 hover:border-white/20'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold text-slate-400 w-5 shrink-0 text-center">
                              {String(slotIdx + 1).padStart(2, '0')}
                            </span>
                            <TeamCrest
                              team={team}
                              size="xs"
                              className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="truncate text-xs font-semibold text-slate-200">
                                {team?.name ?? entry.teamId}
                              </span>
                              <span className="truncate text-[10px] text-slate-500 font-medium">
                                {team?.city || team?.shortName || 'Voleibol'}
                              </span>
                            </div>
                          </div>

                          {headSeed !== undefined && (
                            <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0">
                              <Medal className="h-3 w-3 text-amber-400" />
                              C.{headSeed}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // Vaga não preenchida: verificar se é a PRÓXIMA a ser sorteada!
                    const firstUnrevealedIdx = card.teams.findIndex((t) => !t.revealed);
                    const isNextTargetSlot =
                      (state === 'DRAWING' || state === 'READY') &&
                      nextRevealEvent?.groupName === card.name &&
                      slotIdx === firstUnrevealedIdx;

                    if (isNextTargetSlot) {
                      return (
                        <div
                          key={`target-${slotIdx}`}
                          className="h-11 sm:h-12 flex items-center justify-between gap-2 rounded-xl border-2 border-dashed border-amber-500/80 bg-amber-500/15 px-2.5 py-1.5 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-amber-400 w-5 shrink-0 text-center">
                              {String(slotIdx + 1).padStart(2, '0')}
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/50 bg-amber-400/20 text-amber-300">
                              <Sparkles className="h-3.5 w-3.5 animate-spin" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold uppercase tracking-wide text-amber-200 truncate">
                                Sorteando agora...
                              </span>
                              <span className="text-[10px] text-amber-300/80 font-medium truncate">
                                Próxima vaga do grupo
                              </span>
                            </div>
                          </div>
                          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-400/40 shrink-0">
                            Aguardando
                          </span>
                        </div>
                      );
                    }

                    // Vaga futura em aberto
                    return (
                      <div
                        key={`empty-${slotIdx}`}
                        className="h-11 sm:h-12 flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-black/30 px-2.5 py-1.5 text-slate-500"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-400 w-5 shrink-0 text-center">
                            {String(slotIdx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-600">
                            <Shield className="h-3.5 w-3.5 opacity-40" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-slate-400 truncate">
                              Vaga em aberto
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium truncate">
                              Aguardando sorteio
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── REVELAÇÃO HERO DA EQUIPE SORTEADA (SPOTLIGHT LIMPO E IMPACTANTE) ── */}
        <AnimatePresence>
          {state === 'REVEAL' && resolvedTeam && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
              onClick={onAdvance}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative flex flex-col items-center text-center w-full max-w-lg p-6 sm:p-8 rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-900/98 via-slate-950/95 to-black/98 shadow-[0_0_100px_rgba(245,158,11,0.45)] backdrop-blur-2xl"
              >
                {/* Tag de cabeçalho do Hero */}
                <div className="flex items-center gap-2 mb-3">
                  {currentHeadSeedOrdinal !== undefined ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-400/20 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 shadow-sm">
                      <Medal className="h-3.5 w-3.5 text-amber-400" />
                      Cabeça de Chave {currentHeadSeedOrdinal}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Equipe Sorteada
                    </span>
                  )}
                </div>

                {/* Escudo Gigante com Brilho de Estúdio */}
                <div className="my-2 relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl scale-125" />
                  <TeamCrest
                    team={resolvedTeam}
                    size="xl"
                    className="h-28 w-28 sm:h-32 sm:w-32 border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.6)]"
                  />
                </div>

                {/* Nome Oficial da Equipe */}
                <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)]">
                  {resolvedTeam.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  {resolvedTeam.city ? `${resolvedTeam.city} • ` : ''}
                  {resolvedTeam.modality === 'beach' ? 'Vôlei de Praia' : 'Voleibol de Quadra'}
                </p>

                {/* Pílula Clara de Destino */}
                {currentGroup && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/20 px-5 py-2 text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.35)]">
                    <ChevronRight className="h-4 w-4 text-emerald-400" />
                    <span>
                      Alocado no {currentGroup.name} • {targetSlotOrdinal}ª Vaga
                    </span>
                  </div>
                )}

                {/* Botão de avanço rápido */}
                <div className="mt-6 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={onAdvance}
                    className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider px-6 h-9 rounded-xl shadow-lg"
                  >
                    Confirmar Alocação ➔
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ESTADO FINAL: APOTEOSE COM TODOS OS GRUPOS DEFINIDOS ── */}
        <AnimatePresence>
          {state === 'COMPLETE' && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            >
              <div className="w-full max-w-4xl rounded-3xl border border-amber-400/50 bg-slate-950/95 p-6 sm:p-8 shadow-[0_0_100px_rgba(245,158,11,0.35)]">
                <div className="mb-6 text-center">
                  {isSimulation ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-4 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-amber-300">
                      <Sparkles className="h-4 w-4" />
                      Simulação Concluída com Sucesso
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-4 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-amber-300">
                      <Trophy className="h-4 w-4" />
                      Sorteio Homologado Oficialmente
                    </div>
                  )}
                  <h2 className="mt-3 text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                    {isSimulation ? 'Chaveamento Simulado Definido' : 'Chaveamento Oficial Definido'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-300 max-w-lg mx-auto">
                    {isSimulation
                      ? 'Simulação demonstrativa com as equipes. Nenhum dado do torneio foi alterado.'
                      : 'Todas as equipes foram sorteadas e alocadas conforme as diretrizes regulamentares da competição.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[46vh] overflow-y-auto pr-1">
                  {arenaCards.map((card) => (
                    <div
                      key={card.name}
                      className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 backdrop-blur-md"
                    >
                      <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="font-black text-xs uppercase tracking-wider text-white">
                          {card.name}
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-300 font-bold border border-emerald-500/30">
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
                              className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100 border border-white/10"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] text-slate-400 font-bold w-4">
                                  {idx + 1}.
                                </span>
                                <TeamCrest team={team} size="xs" />
                                <span className="truncate font-bold text-xs text-white">
                                  {team?.name ?? entry.teamId}
                                </span>
                              </div>
                              {headSeed !== undefined && (
                                <span className="text-[8px] font-black uppercase text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 shrink-0">
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
                      className="border-white/20 bg-slate-900 text-xs hover:bg-white/10 font-bold rounded-xl h-10 px-4"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Rever Sorteio
                    </Button>
                  )}
                  {onClose && (
                    <Button
                      size="sm"
                      onClick={onClose}
                      className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider px-6 h-10 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.45)]"
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      {isSimulation ? 'Concluir Simulação' : 'Confirmar e Voltar ao Sistema'}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── DOCK INFERIOR: CONSOLE DE PRODUÇÃO SIMPLIFICADO E INTUITIVO ─────── */}
      <footer className="pointer-events-auto z-30 border-t border-white/10 bg-slate-950/95 px-4 py-3 sm:px-8 backdrop-blur-xl">
        <div className="flex flex-col gap-2.5 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Progresso Geral */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span>Equipes Sorteadas</span>
                  <span className="font-mono font-bold text-amber-400">{progressCount}</span>
                </div>
                <div className="mt-1 h-2 w-28 sm:w-36 overflow-hidden rounded-full bg-white/10 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controles Principais de Sorteio */}
            <div className="flex items-center gap-3">
              {/* Botão de Reinício */}
              {onReset && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReset}
                  title="Reiniciar Sorteio"
                  className="border-white/15 bg-slate-900/80 text-slate-300 hover:bg-white/10 h-10 w-10 p-0 rounded-xl"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}

              {/* Botão Auto (Play / Pause) */}
              <Button
                size="sm"
                variant={isAutoPlay ? 'default' : 'outline'}
                onClick={() => onAutoPlayToggle(!isAutoPlay)}
                className={cn(
                  'gap-2 text-xs font-bold h-10 px-4 rounded-xl border',
                  isAutoPlay
                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    : 'border-white/15 bg-slate-900/80 text-slate-200'
                )}
              >
                {isAutoPlay ? (
                  <>
                    <Pause className="h-4 w-4 text-amber-400" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Auto</span>
                  </>
                )}
              </Button>

              {/* Botão Primário Hero com Brilho Nobre */}
              <Button
                size="sm"
                variant="default"
                onClick={onAdvance}
                disabled={!canAdvance}
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider px-6 sm:px-8 h-10 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.45)] disabled:opacity-40"
              >
                <SkipForward className="h-4 w-4" />
                <span>
                  {state === 'READY'
                    ? 'Iniciar Sorteio'
                    : state === 'DRAWING'
                      ? 'Sorteando...'
                      : state === 'REVEAL'
                        ? 'Alocar no Grupo'
                        : state === 'COMPLETE'
                          ? 'Sorteio Finalizado'
                          : 'Sortear Próxima Equipe'}
                </span>
              </Button>
            </div>

            {/* Ritmo do Sorteio Automático */}
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
                  className="h-1.5 w-20 cursor-pointer accent-amber-400 bg-white/20 rounded-lg"
                />
                <span className="text-[10px] font-mono text-slate-300 w-8 text-right">
                  {(revealDurationMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos e Auditoria */}
          <div className="flex flex-wrap items-center justify-between border-t border-white/5 pt-1.5 text-[10px] text-slate-400">
            <div className="hidden sm:flex items-center gap-3">
              <span>Atalhos:</span>
              <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-slate-300">Espaço</span> Iniciar / Auto
              <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-slate-300">➔</span> Próximo
              <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-slate-300">Esc</span> Fechar
            </div>
            {drawId && (
              <span className="font-mono text-[9px] text-slate-500">
                AUDITORIA #{drawId.substring(0, 8).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
