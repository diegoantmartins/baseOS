/**
 * BracketRoundColumn.tsx — Coluna de Rodada do Chaveamento (Fase 4.9)
 *
 * Responsabilidades:
 * - Renderização semântica da rodada com título e contador de confrontos
 * - Distribuição vertical flexível dos cards de slots
 * - Suporte a qualquer quantidade arbitrária de confrontos (sem fórmulas rígidas de 2^N)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { RoundViewModel } from '@/services/competitionBracketViewModel';
import { MatchSlotCard } from './MatchSlotCard';

export interface BracketRoundColumnProps {
  round: RoundViewModel;
  onOpenMatch?: (matchId: string) => void;
  className?: string;
}

export function BracketRoundColumn({ round, onOpenMatch, className }: BracketRoundColumnProps) {
  const { name, roundOrder, slots } = round;

  return (
    <section
      aria-label={`Rodada: ${name}`}
      className={`flex flex-col min-w-[290px] sm:min-w-[320px] max-w-sm shrink-0 ${className || ''}`}
    >
      {/* ── Cabeçalho da Rodada ── */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center font-mono">
            {roundOrder}
          </span>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {name}
          </h3>
        </div>

        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-muted-foreground border-zinc-800 bg-zinc-900/60">
          {slots.length} {slots.length === 1 ? 'jogo' : 'jogos'}
        </Badge>
      </div>

      {/* ── Lista Vertical de Confrontos ── */}
      <div className="flex flex-col justify-around gap-4 flex-1 py-1">
        {slots.map((slot) => (
          <MatchSlotCard
            key={slot.slotId}
            slot={slot}
            onOpenMatch={onOpenMatch}
          />
        ))}
      </div>
    </section>
  );
}
