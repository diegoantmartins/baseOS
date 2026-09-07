/**
 * MatchSlotCard.tsx — Card Semântico de Confronto / Slot do Chaveamento (Fase 4.9)
 *
 * Responsabilidades:
 * - Renderização do confronto estrutural (MatchSlot) e do evento esportivo (Match)
 * - Diferenciação visual de status (Pendente, Materializada, Ao Vivo, Finalizada, BYE, Inconsistente)
 * - Exibição de sets parciais e metadados de agendamento (Horário, Quadra)
 * - Botão de ação semântico <button> para abrir a Mesa do Apontador quando canOpenMatch for true
 * - Banner de auditoria caso seja detectada inconsistência entre Slot e Match
 * - Acessibilidade completa por teclado (WCAG / Web Guidelines)
 */

import React from 'react';
import { Clock, MapPin, Volleyball, AlertTriangle, CheckCircle2, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MatchSlotViewModel } from '@/services/competitionBracketViewModel';
import { ParticipantSlotRow } from './ParticipantSlotRow';

export interface MatchSlotCardProps {
  slot: MatchSlotViewModel;
  onOpenMatch?: (matchId: string) => void;
  className?: string;
}

export function MatchSlotCard({ slot, onOpenMatch, className }: MatchSlotCardProps) {
  const {
    label,
    matchNumber,
    visualState,
    participantA,
    participantB,
    scoreA,
    scoreB,
    sets,
    scheduledTime,
    court,
    venue,
    winnerSide,
    canOpenMatch,
    matchId,
    isInconsistent,
    inconsistencyReason,
  } = slot;

  const isCompleted = visualState === 'completed';
  const isInProgress = visualState === 'in_progress';
  const isBye = visualState === 'bye';

  return (
    <div
      role="region"
      aria-label={`Confronto ${label}`}
      className={cn(
        'w-72 sm:w-80 rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col transition-all duration-150',
        isInconsistent && 'border-destructive/60 bg-destructive/5 ring-1 ring-destructive/40',
        isInProgress && 'border-amber-500/60 ring-1 ring-amber-500/30 bg-amber-950/10',
        isCompleted && 'border-border hover:border-zinc-600',
        !isInconsistent && !isInProgress && !isCompleted && 'border-border/80',
        className,
      )}
    >
      {/* ── Cabeçalho do Slot ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/40 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-foreground font-mono truncate">
            {matchNumber ? `#${matchNumber}` : ''} {label}
          </span>
        </div>

        {/* Badge de Estado Visual */}
        <div className="shrink-0">
          {isInconsistent ? (
            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 gap-1 font-mono">
              <AlertTriangle className="w-3 h-3" />
              Inconsistente
            </Badge>
          ) : isInProgress ? (
            <Badge className="text-[10px] py-0 px-1.5 gap-1 bg-amber-500 text-black font-semibold animate-pulse">
              <Radio className="w-3 h-3" />
              Ao Vivo
            </Badge>
          ) : isCompleted ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 text-emerald-400 border-emerald-800 bg-emerald-950/30 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Encerrado
            </Badge>
          ) : isBye ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-zinc-400 border-zinc-700 bg-zinc-800/40">
              Isenção
            </Badge>
          ) : visualState === 'materialized' ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-blue-400 border-blue-800/50 bg-blue-950/20">
              Agendado
            </Badge>
          ) : visualState === 'resolved_unmaterialized' ? (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-zinc-400 border-zinc-700 bg-zinc-800/40">
              Pronto
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-zinc-500 border-zinc-800 bg-zinc-900/60">
              Pendente
            </Badge>
          )}
        </div>
      </div>

      {/* ── Banner de Inconsistência (Auditoria) ── */}
      {isInconsistent && inconsistencyReason && (
        <div className="px-3 py-1.5 bg-destructive/15 border-b border-destructive/30 text-[10px] text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{inconsistencyReason}</span>
        </div>
      )}

      {/* ── Participantes Lado A e Lado B ── */}
      <div className="divide-y divide-border/40">
        <ParticipantSlotRow
          participant={participantA}
          isWinner={winnerSide === 'A'}
          isLoser={winnerSide === 'B'}
          score={scoreA}
          isCompleted={isCompleted}
        />
        <ParticipantSlotRow
          participant={participantB}
          isWinner={winnerSide === 'B'}
          isLoser={winnerSide === 'A'}
          score={scoreB}
          isCompleted={isCompleted}
        />
      </div>

      {/* ── Parciais de Sets (quando disponíveis) ── */}
      {sets && sets.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border/40 bg-zinc-950/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500">Parciais:</span>
          <div className="flex items-center gap-1 tabular-nums">
            {sets.map((s, idx) => (
              <span key={idx} className="px-1 py-0.2 rounded bg-zinc-800/80 text-foreground">
                {s.a}-{s.b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Rodapé com Agendamento e Ação ── */}
      <div className="px-3 py-2 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-2 text-[11px] mt-auto">
        <div className="flex flex-col min-w-0 text-muted-foreground text-[10px]">
          {scheduledTime ? (
            <span className="flex items-center gap-1 truncate text-foreground font-medium font-mono">
              <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
              {new Date(scheduledTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
              {new Date(scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-zinc-500 italic">Horário a definir</span>
          )}

          {(court || venue) && (
            <span className="flex items-center gap-1 truncate mt-0.5">
              <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
              {court ? `${court} · ` : ''}{venue || ''}
            </span>
          )}
        </div>

        {/* Botão de Ação Acessível */}
        {canOpenMatch && matchId && onOpenMatch && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs gap-1 font-medium bg-zinc-900 hover:bg-zinc-800 text-foreground border-zinc-700/80 shrink-0 shadow-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => onOpenMatch(matchId)}
            aria-label={`Abrir mesa ou súmula da partida #${matchNumber || ''}`}
          >
            <Volleyball className="w-3 h-3 text-primary" />
            <span>Mesa</span>
          </Button>
        )}
      </div>
    </div>
  );
}
