/**
 * PublicMatchModal — Modal oficial de detalhes do confronto no Portal Público
 * Exibe placar de sets, informações de quadra/local e destaque de MVP da partida
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Clock, MapPin, Shield, CheckCircle2 } from 'lucide-react';
import type { PublicMatchDTO } from '@/services/publicCompetitionService';

export interface PublicMatchModalProps {
  match: PublicMatchDTO | null;
  competitionName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublicMatchModal({
  match,
  competitionName,
  open,
  onOpenChange,
}: PublicMatchModalProps) {
  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        {/* Cabeçalho do Confronto */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 border-b border-zinc-800/80">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
                  {match.groupName ? match.groupName : 'Confronto'}
                </Badge>
                {match.matchNumber && (
                  <span className="text-xs font-mono font-medium text-zinc-400">
                    Jogo #{match.matchNumber}
                  </span>
                )}
                {match.court && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold px-2 py-0.5 ${
                      match.court.includes('2')
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                        : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    📍 {match.court}
                  </Badge>
                )}
                {match.round && (
                  <span className="text-xs text-zinc-500">
                    • Rodada {match.round}
                  </span>
                )}
              </div>

              {match.isCompleted ? (
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Oficializado
                </Badge>
              ) : (
                <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 text-zinc-400 text-xs">
                  Agendado
                </Badge>
              )}
            </div>

            <DialogTitle className="text-base sm:text-lg font-bold text-white pt-1">
              {match.teamAName} vs {match.teamBName}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {competitionName || 'Competição Oficial'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-5">
          {/* Placar Central com Sets */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
            <div className="grid grid-cols-5 items-center gap-2 text-center">
              {/* Equipe A */}
              <div className="col-span-2 text-left space-y-1">
                <span className="text-xs font-semibold text-zinc-200 block truncate">
                  {match.teamAName}
                </span>
                {match.winnerSide === 'A' && (
                  <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-amber-400">
                    Vencedor
                  </span>
                )}
              </div>

              {/* Placar em Sets */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 font-mono text-xl sm:text-2xl font-black">
                  <span className={match.winnerSide === 'A' ? 'text-amber-400' : 'text-zinc-200'}>
                    {match.setsWonA}
                  </span>
                  <span className="text-zinc-600">:</span>
                  <span className={match.winnerSide === 'B' ? 'text-amber-400' : 'text-zinc-200'}>
                    {match.setsWonB}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                  Sets
                </span>
              </div>

              {/* Equipe B */}
              <div className="col-span-2 text-right space-y-1">
                <span className="text-xs font-semibold text-zinc-200 block truncate">
                  {match.teamBName}
                </span>
                {match.winnerSide === 'B' && (
                  <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-amber-400">
                    Vencedor
                  </span>
                )}
              </div>
            </div>

            {/* Parciais dos Sets */}
            {match.setScores && match.setScores.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-[11px] text-zinc-500 font-mono">Parciais:</span>
                {match.setScores.map((s, idx) => (
                  <span
                    key={idx}
                    className={`text-xs font-mono px-2 py-0.5 rounded border ${
                      s.scoreA > s.scoreB
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400'
                    }`}
                  >
                    {s.scoreA}x{s.scoreB}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Destaque da Partida (MVP) — Pílula Premium Gold/Amber */}
          {match.highlightAthlete && (
            <div
              className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border border-amber-500/40 text-xs text-amber-200 shadow-sm space-y-1.5"
              data-testid="public-modal-match-highlight"
            >
              <div className="flex items-center gap-2 text-amber-400">
                <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="font-black text-xs uppercase tracking-wider">
                  ⭐ MVP da Partida (Melhor do Jogo)
                </span>
              </div>
              <div className="pl-8 flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-bold text-white">
                  {match.highlightAthlete.jerseyNumber != null ? `[#${match.highlightAthlete.jerseyNumber}] ` : ''}
                  {match.highlightAthlete.name}
                </span>
                <span className="text-xs text-amber-300/80 font-medium">
                  ({match.highlightAthlete.teamName})
                </span>
              </div>
            </div>
          )}

          {/* Detalhes de Local e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-400 bg-zinc-900/30 rounded-lg p-3 border border-zinc-800/40">
            {match.scheduledTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>Horário: {match.scheduledTime.slice(11, 16)}</span>
              </div>
            )}
            {match.court && (
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>Quadra: {match.court}</span>
              </div>
            )}
            {match.venue && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">Local: {match.venue}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/60 border-t border-zinc-800/80 px-5 py-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 border-zinc-700 bg-zinc-800 text-zinc-200 hover:text-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
