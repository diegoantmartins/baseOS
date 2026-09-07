/**
 * ParticipantSlotRow.tsx — Linha Semântica de Participante do Confronto (Fase 4.9)
 *
 * Responsabilidades:
 * - Renderização clara de participante (Equipe real, placeholder estrutural ou BYE)
 * - Destaque visual acessível para vencedor e perdedor (cor + ícone/peso)
 * - Badges com semente (seed) e sigla oficial
 * - Nunca exibe IDs artificiais como 'TBD'
 */

import React from 'react';
import { Trophy, Shield, Minus, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ParticipantViewModel } from '@/services/competitionBracketViewModel';

export interface ParticipantSlotRowProps {
  participant: ParticipantViewModel;
  isWinner?: boolean;
  isLoser?: boolean;
  score?: number;
  isCompleted?: boolean;
  className?: string;
}

export function ParticipantSlotRow({
  participant,
  isWinner = false,
  isLoser = false,
  score,
  isCompleted = false,
  className,
}: ParticipantSlotRowProps) {
  const { isResolved, isBye, displayName, shortName, seed, logoUrl } = participant;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 text-xs transition-colors duration-150 select-none',
        isWinner && 'bg-primary/10 font-bold text-foreground',
        isLoser && 'opacity-60 text-muted-foreground',
        !isWinner && !isLoser && 'text-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        {/* Ícone ou Escudo */}
        {isBye ? (
          <span className="w-5 h-5 rounded flex items-center justify-center bg-zinc-800/80 text-zinc-500 shrink-0">
            <Ban className="w-3 h-3" />
          </span>
        ) : logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            className="w-5 h-5 rounded object-cover shrink-0 border border-zinc-700/50 bg-zinc-900"
          />
        ) : isResolved ? (
          <span className="w-5 h-5 rounded flex items-center justify-center bg-zinc-800 text-zinc-400 font-mono text-[10px] shrink-0 border border-zinc-700/40">
            {seed ? (
              <span className="text-primary font-bold">{seed}</span>
            ) : (
              <Shield className="w-3 h-3 text-zinc-400" />
            )}
          </span>
        ) : (
          <span className="w-5 h-5 rounded flex items-center justify-center bg-zinc-900 border border-dashed border-zinc-700 text-zinc-500 font-mono text-[10px] shrink-0">
            <Minus className="w-3 h-3" />
          </span>
        )}

        {/* Nome ou Placeholder Estrutural */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              'truncate max-w-[140px] sm:max-w-[160px]',
              !isResolved && !isBye && 'italic text-zinc-400 font-normal',
              isBye && 'font-mono text-zinc-500 tracking-wider',
            )}
            title={displayName}
          >
            {displayName}
          </span>

          {/* Sigla ou Badge */}
          {isResolved && shortName && !isBye && (
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 font-mono border-zinc-800 bg-zinc-900/90 text-zinc-400 shrink-0"
            >
              {shortName}
            </Badge>
          )}

          {isBye && (
            <Badge
              variant="secondary"
              className="text-[9px] py-0 px-1 font-mono bg-zinc-800 text-zinc-400 shrink-0"
            >
              BYE
            </Badge>
          )}
        </div>
      </div>

      {/* Placar ou Indicador */}
      <div className="flex items-center gap-1 shrink-0 font-mono">
        {isWinner && <Trophy className="w-3 h-3 text-amber-500 shrink-0" aria-label="Vencedor" />}
        {score !== undefined && (
          <span
            className={cn(
              'text-sm font-bold tabular-nums px-1.5 py-0.5 rounded',
              isWinner ? 'bg-primary text-primary-foreground' : 'bg-zinc-800/80 text-foreground',
            )}
          >
            {score}
          </span>
        )}
        {score === undefined && isCompleted && (
          <span className="text-zinc-500 text-xs">—</span>
        )}
      </div>
    </div>
  );
}
