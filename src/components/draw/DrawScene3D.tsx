import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, SkipForward, Trophy, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { buildRevealSequence } from '@/components/draw/drawRevealSequence';
import { ANIMATION_TIMINGS, SCENE3D_REVEAL_MS } from '@/config/drawArenaFeatures';
import type { DrawResult } from '@/types/draw';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

export interface DrawScene3DProps {
  result: DrawResult;
  teams: TeamRecord[];
  competition: CompetitionRecord;
  revealDurationMs?: number;
  onClose?: () => void;
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setReducedMotion(false);
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return reducedMotion;
}

function getBallStyle(teamId: string, index: number, totalCount = 18) {
  const angle = (index / Math.max(1, totalCount)) * Math.PI * 2;
  const radius = 110 + (index % 4) * 16;
  return {
    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
    top: `calc(50% + ${Math.sin(angle) * radius * 0.75}px)`,
    transform: `translate(-50%, -50%) rotate(${index * 28}deg)`,
    background: `radial-gradient(circle at 30% 30%, #f8fafc 0%, #cbd5e1 15%, ${teamId.length % 2 === 0 ? '#0f172a' : '#1e293b'} 55%, #020617 100%)`,
  };
}

export function DrawScene3D({
  result,
  teams,
  competition,
  revealDurationMs = SCENE3D_REVEAL_MS,
  onClose,
}: DrawScene3DProps) {
  const reducedMotion = useReducedMotionPreference();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isRevealing, setIsRevealing] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [autoPlay, setAutoPlay] = useState(true);
  const [speedMs, setSpeedMs] = useState(revealDurationMs);

  const drawSequence = useMemo(() => buildRevealSequence(result.groups), [result.groups]);

  useEffect(() => {
    setCurrentIndex(-1);
    setIsRevealing(false);
  }, [result]);

  useEffect(() => {
    if (drawSequence.length === 0) return;

    if (reducedMotion) {
      setCurrentIndex(0);
      setIsRevealing(true);
      return;
    }

    // Início: mostra a primeira equipe
    if (currentIndex === -1) {
      setCurrentIndex(0);
      setIsRevealing(true);
      return;
    }

    // Fim da sequência
    if (currentIndex >= drawSequence.length - 1) {
      if (autoPlay) setIsRevealing(false);
      return;
    }

    // Pausado: mantém o reveal atual, sem avanço automático
    if (!autoPlay) {
      setIsRevealing(true);
      return;
    }

    // Autoplay: avança após o tempo definido
    setIsRevealing(true);

    const advanceTimer = window.setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, drawSequence.length - 1));
    }, speedMs);

    return () => window.clearTimeout(advanceTimer);
  }, [currentIndex, drawSequence, drawSequence.length, reducedMotion, speedMs, autoPlay]);

  const handleNext = () => {
    if (currentIndex >= drawSequence.length - 1) return;
    setCurrentIndex(prev => Math.min(prev + 1, drawSequence.length - 1));
    if (!reducedMotion) setIsRevealing(true);
  };

  const currentDraw = currentIndex >= 0 ? drawSequence[currentIndex] : null;
  const currentTeam = currentDraw ? teams.find(team => team.id === currentDraw.teamId) : null;
  const currentTargetGroupIndex = currentDraw ? result.groups.findIndex(group => group.name === currentDraw.groupName) : -1;
  const isFinished = currentIndex >= drawSequence.length - 1 && (!isRevealing || !autoPlay);
  const totalTeams = result.groups.reduce((sum, group) => sum + group.teams.length, 0);
  const progressCount = currentIndex >= 0 ? Math.min(currentIndex + 1, totalTeams) : 0;
  const progressLabel = totalTeams > 0 ? `${String(progressCount).padStart(2, '0')} / ${String(totalTeams).padStart(2, '0')}` : '00 / 00';

  const urnTeams = useMemo(() => {
    return result.groups.flatMap(group => group.teams);
  }, [result.groups]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] overflow-hidden bg-[#020816] text-slate-50"
        onMouseMove={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPointer({
            x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
            y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
          });
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.30),_rgba(2,6,23,0.96)_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative z-10 flex items-center justify-between border-b border-[#f6c76b]/30 bg-black/25 p-4 backdrop-blur-sm md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="rounded-xl border border-[#f6c76b]/40 bg-[#f6c76b]/10 p-2.5 shadow-[0_0_30px_rgba(246,199,107,0.2)] md:p-3">
              <Trophy className="h-5 w-5 text-[#f6c76b] md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-[0.18em] text-[#f7f3ec] text-sm md:text-2xl">
                Sorteio Oficial
              </h1>
              <p className="text-[10px] text-slate-300 md:text-sm">{competition.name}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-[#f6c76b]/40 bg-[#07111d]/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#f7d999] md:flex">
            <span>Sorteio</span>
            <span className="text-slate-200">{progressLabel}</span>
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          )}
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center gap-6 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-8 lg:flex-row lg:items-center lg:gap-8 lg:overflow-hidden">
          <div className="relative mx-auto flex w-full max-w-md shrink-0 items-center justify-center lg:max-w-xl lg:flex-1">
            <motion.div
              animate={{
                rotateY: pointer.x * 18,
                rotateX: pointer.y * -10,
                y: reducedMotion ? 0 : [-2, 2, -2],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="relative h-[300px] w-[300px] sm:h-[360px] sm:w-[360px] md:h-[480px] md:w-[480px]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-[15%] rounded-full border border-[#f6c76b]/30 bg-[#050c1d]/80 shadow-[0_0_80px_rgba(59,130,246,0.17)]" />
              <div className="absolute inset-[26%] rounded-full border border-[#f6c76b]/20 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.14),_rgba(15,23,42,0)_60%)]" />

              {urnTeams.map((ball, index) => {
                const team = teams.find(item => item.id === ball.teamId);
                const position = getBallStyle(ball.teamId ?? `ball-${index}`, index, urnTeams.length);

                return (
                  <motion.div
                    key={ball.teamId ?? `seed-${index}`}
                    initial={{ opacity: 0.1, scale: 0.7 }}
                    animate={{
                      opacity: currentTeam?.id === ball.teamId ? 1 : 0.75,
                      scale: currentTeam?.id === ball.teamId ? 1.1 : 0.95,
                      y: reducedMotion ? 0 : [0, -6, 0],
                    }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: (index % 18) * 0.08 }}
                    className="absolute h-8 w-8 rounded-full border border-white/30 shadow-[0_0_14px_rgba(255,255,255,0.18)] md:h-10 md:w-10"
                    style={{
                      ...position,
                      background: `radial-gradient(circle at 30% 30%, #f8fafc 0%, #dbeafe 12%, ${team ? '#1e293b' : '#0f172a'} 52%, #020617 100%)`,
                    }}
                  >
                    <TeamCrest team={team} size="xs" className="h-full w-full rounded-full" />
                  </motion.div>
                );
              })}

              <motion.div
                animate={{
                  scale: isRevealing ? [1, 1.05, 1] : 1,
                  boxShadow: isRevealing ? '0 0 60px rgba(248, 250, 252, 0.4)' : '0 0 35px rgba(59,130,246,0.25)',
                }}
                transition={{ duration: 1.3, ease: 'easeInOut' }}
                className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f6c76b]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.65),rgba(96,165,250,0.28)_18%,rgba(15,23,42,0.8)_55%,rgba(2,6,23,1)_100%)] shadow-[0_0_80px_rgba(96,165,250,0.28)] md:h-[240px] md:w-[240px]"
              >
                <div className="absolute inset-3 rounded-full border border-white/20" />
                <div className="absolute inset-12 rounded-full border border-[#f6c76b]/35" />
              </motion.div>

              <div className="absolute left-1/2 top-[18%] -translate-x-1/2 rounded-full border border-[#f6c76b]/50 bg-[#071325]/80 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.35em] text-[#f7d999] md:px-4 md:text-[10px]">
                BASEOS
              </div>
              <div className="absolute left-1/2 top-[70%] -translate-x-1/2 rounded-full border border-[#f6c76b]/30 bg-[#0a1324]/80 px-3 py-1 text-[9px] uppercase tracking-[0.3em] text-slate-300 md:text-[10px]">
                {currentDraw ? currentDraw.groupName : 'Arena'}
              </div>
              <div className="absolute left-1/2 top-[76%] -translate-x-1/2 rounded-full border border-[#f6c76b]/30 bg-[#081424]/80 px-3 py-1 text-[8px] font-bold uppercase tracking-[0.3em] text-[#f7d999] md:text-[9px]">
                {progressLabel}
              </div>
            </motion.div>
          </div>

          {/* Group Arena — grid adaptativo (responsivo por quantidade/breakpoint) */}
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
            {result.groups.map(group => {
              const isCurrent = group.name === currentDraw?.groupName;
              return (
                <motion.div
                  key={group.name}
                  animate={{ scale: isCurrent ? 1.03 : 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`rounded-2xl border bg-[#060f1a]/85 p-3 shadow-[0_0_40px_rgba(246,199,107,0.12)] backdrop-blur-md ${
                    isCurrent ? 'border-[#f6c76b]/60' : 'border-[#f6c76b]/25'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#f6c76b]/20 pb-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#f7d999]">
                      {group.name}
                    </span>
                    <span className="text-[9px] text-slate-400">{group.teams.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.teams.map((entry, teamIndex) => {
                      const team = teams.find(item => item.id === entry.teamId);
                      const revealed = drawSequence
                        .slice(0, currentIndex + 1)
                        .some(d => d.teamId === entry.teamId && d.groupName === group.name);
                      return (
                        <div
                          key={`${group.name}-${entry.teamId}`}
                          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                            revealed ? 'border-[#f6c76b]/30 bg-slate-800/50' : 'border-white/10 bg-slate-900/40'
                          }`}
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#f6c76b]/35 bg-[#0f172a] text-[7px] font-bold text-slate-200">
                            {revealed ? <Users className="h-3 w-3 text-[#f7d999]" /> : teamIndex + 1}
                          </div>
                          <span className="truncate text-[10px] text-slate-200">{team?.name ?? entry.teamId}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

            <AnimatePresence mode="wait">
              {isRevealing && currentTeam && currentDraw && (
                <motion.div
                  key={`reveal-${currentTeam.id}`} 
                  initial={{ opacity: 0, scale: 0.5, y: 60 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -20 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 13 }}
                  className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
                >
                  <motion.div
                    animate={{
                      x: currentTargetGroupIndex >= 0 && result.groups.length > 1
                        ? Math.round(((currentTargetGroupIndex / (result.groups.length - 1)) - 0.5) * 360)
                        : 0,
                      y: 180,
                      scale: [1, 1.08, 1],
                    }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                    className="flex w-[260px] flex-col items-center rounded-[28px] border border-[#f6c76b]/60 bg-[#09111d]/80 p-4 shadow-[0_0_55px_rgba(246,199,107,0.36)] backdrop-blur-md md:w-[300px]"
                  >
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/25 bg-white/10 p-1 md:h-20 md:w-20">
                      <TeamCrest team={currentTeam} size="lg" className="h-full w-full" />
                    </div>
                    <div className="mb-2 text-center">
                      <div className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#f7d999]">Última equipe</div>
                      <div className="mt-2 text-lg font-black uppercase tracking-[0.12em] text-white md:text-2xl">
                        {currentTeam.name}
                      </div>
                    </div>
                    <Badge className="border border-[#f6c76b]/40 bg-[#f6c76b]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.25em] text-[#f7d999] md:text-[10px]">
                      {currentDraw.groupName}
                    </Badge>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>

        <div className="relative z-10 border-t border-[#f6c76b]/20 bg-black/30 px-4 py-4 backdrop-blur-md md:px-6">
          {!isFinished ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="sm"
                  variant={autoPlay ? 'default' : 'outline'}
                  onClick={() => setAutoPlay(a => !a)}
                  className="gap-2 rounded-full"
                >
                  {autoPlay ? <><Pause className="h-4 w-4" />Pausar</> : <><Play className="h-4 w-4" />Reproduzir</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex >= drawSequence.length - 1}
                  className="gap-2 rounded-full"
                >
                  <SkipForward className="h-4 w-4" />Avançar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentIndex(drawSequence.length - 1);
                    setIsRevealing(false);
                  }}
                  disabled={drawSequence.length === 0}
                  className="rounded-full border-[#f6c76b]/40 bg-transparent text-[#f7d999] hover:bg-[#f6c76b]/10"
                >
                  Pular animação
                </Button>
                <div className="rounded-full border border-[#f6c76b]/35 bg-[#08111b]/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-200">
                  {progressLabel}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  Velocidade
                </label>
                <input
                  type="range"
                  min={ANIMATION_TIMINGS.MIN_REVEAL_MS}
                  max={ANIMATION_TIMINGS.MAX_REVEAL_MS}
                  step={ANIMATION_TIMINGS.STEP_MS}
                  value={speedMs}
                  onChange={(e) => setSpeedMs(parseInt(e.target.value))}
                  className="h-1.5 w-36 cursor-pointer rounded-full bg-slate-700"
                />
                <span className="w-12 text-right font-mono text-xs text-slate-300">{(speedMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="text-xl font-black uppercase tracking-[0.18em] text-[#f7d999] md:text-2xl">
                Sorteio Concluído
              </h3>
              <p className="text-xs text-slate-300 md:text-sm">Todos os grupos foram definidos com sucesso.</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

