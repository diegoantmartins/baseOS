import React from 'react';
import { Volleyball, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { SectionCard } from '@/components/ui/Section';

export interface MatchMetricsCardsProps {
  totalCount: number;
  scheduledCount: number;
  liveCount: number;
  completedCount: number;
}

export function MatchMetricsCards({
  totalCount,
  scheduledCount,
  liveCount,
  completedCount,
}: MatchMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SectionCard density="dense" className="bg-card/70 border-border/80">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
          <span>Total de Partidas</span>
          <Volleyball className="w-3.5 h-3.5 text-primary" />
        </div>
        <p className="text-xl font-bold font-mono tabular-nums text-foreground">{totalCount}</p>
      </SectionCard>

      <SectionCard density="dense" className="bg-card/70 border-border/80">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
          <span>Agendadas</span>
          <Clock className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <p className="text-xl font-bold font-mono tabular-nums text-foreground">{scheduledCount}</p>
      </SectionCard>

      <SectionCard density="dense" className="bg-card/70 border-border/80">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
          <span>Ao Vivo</span>
          <Activity className="w-3.5 h-3.5 text-rose-500" />
        </div>
        <p className="text-xl font-bold font-mono tabular-nums text-foreground">{liveCount}</p>
      </SectionCard>

      <SectionCard density="dense" className="bg-card/70 border-border/80">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
          <span>Encerradas</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <p className="text-xl font-bold font-mono tabular-nums text-foreground">{completedCount}</p>
      </SectionCard>
    </div>
  );
}
