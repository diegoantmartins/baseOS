/**
 * BracketStageNav.tsx — Navegação entre Estágios da Competição (Fase 4.9)
 *
 * Responsabilidades:
 * - Permite alternar entre estágios quando a competição possui múltiplos estágios
 *   (ex.: Fase de Grupos -> Play-In -> Fase Final)
 * - Exibe contagem de rodadas e status do estágio
 * - Acessível via teclado (role="tablist")
 */

import React from 'react';
import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StageViewModel } from '@/services/competitionBracketViewModel';

export interface BracketStageNavProps {
  stages: StageViewModel[];
  activeStageId: string;
  onSelectStage: (stageId: string) => void;
  className?: string;
}

export function BracketStageNav({
  stages,
  activeStageId,
  onSelectStage,
  className,
}: BracketStageNavProps) {
  if (stages.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Estágios da competição"
      className={cn(
        'flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/80 overflow-x-auto scrollbar-none',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-muted-foreground mr-1 shrink-0">
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span>Fases:</span>
      </div>

      {stages.map((stage) => {
        const isActive = stage.stageId === activeStageId;
        const totalSlots = stage.rounds.reduce((acc, r) => acc + r.slots.length, 0);

        return (
          <button
            key={stage.stageId}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={`tab-stage-${stage.stageId}`}
            aria-controls={`panel-stage-${stage.stageId}`}
            onClick={() => onSelectStage(stage.stageId)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive
                ? 'bg-zinc-900 text-foreground font-semibold shadow-sm border border-zinc-700'
                : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/40',
            )}
          >
            <span>{stage.name}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] py-0 px-1 font-mono shrink-0',
                isActive ? 'border-primary/40 text-primary' : 'border-zinc-800 text-zinc-500',
              )}
            >
              {totalSlots} {totalSlots === 1 ? 'jogo' : 'jogos'}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
