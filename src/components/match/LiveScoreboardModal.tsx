import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Volleyball, MapPin, Trophy, Clock } from 'lucide-react';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';

interface LiveScoreboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRecord | null;
  competition: CompetitionRecord | null;
}

export const LiveScoreboardModal: React.FC<LiveScoreboardModalProps> = ({
  open,
  onOpenChange,
  match,
  competition,
}) => {
  if (!match) return null;

  const sets = match.sets || [];
  const setsWonA = sets.filter(s => s.scoreA > s.scoreB).length;
  const setsWonB = sets.filter(s => s.scoreB > s.scoreA).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-950 text-white border-zinc-800 p-6 shadow-2xl">
        <DialogHeader className="border-b border-zinc-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <DialogTitle className="text-sm font-semibold text-zinc-300">
                {competition?.name || 'BaseOS'} · Jogo #{match.matchNumber} ({match.phase || 'Classificatória'})
              </DialogTitle>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider">
              {match.status === 'in-progress' ? '● AO VIVO' : match.status === 'completed' ? 'FINALIZADO' : 'AGENDADO'}
            </Badge>
          </div>
        </DialogHeader>

        {/* Placar Principal Estilo Telão de Ginásio */}
        <div className="py-6">
          <div className="grid grid-cols-5 items-center gap-4 text-center">
            {/* EQUIPE A */}
            <div className="col-span-2 space-y-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-wide truncate text-zinc-100">
                {match.teamAName}
              </h2>
              <span className="text-xs text-zinc-400 font-mono">{match.teamAShortName}</span>
            </div>

            {/* PLACAR DE SETS */}
            <div className="col-span-1 flex flex-col items-center justify-center bg-zinc-900/90 rounded-2xl py-3 px-4 border border-zinc-800 shadow-inner">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">SETS</span>
              <div className="flex items-center gap-2 font-mono text-3xl sm:text-4xl font-black text-amber-400">
                <span>{setsWonA}</span>
                <span className="text-zinc-600">:</span>
                <span>{setsWonB}</span>
              </div>
            </div>

            {/* EQUIPE B */}
            <div className="col-span-2 space-y-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-wide truncate text-zinc-100">
                {match.teamBName}
              </h2>
              <span className="text-xs text-zinc-400 font-mono">{match.teamBShortName}</span>
            </div>
          </div>
        </div>

        {/* Histórico Parcial dos Sets */}
        {sets.length > 0 && (
          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-center mb-3">
              Pontuação por Set
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center font-mono">
              {sets.map((s, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 font-semibold mb-1">SET {s.setNumber}</div>
                  <div className="text-base font-bold text-zinc-200">
                    <span className={s.scoreA > s.scoreB ? 'text-amber-400 font-black' : ''}>{s.scoreA}</span>
                    <span className="text-zinc-600 mx-1">-</span>
                    <span className={s.scoreB > s.scoreA ? 'text-amber-400 font-black' : ''}>{s.scoreB}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local e Horário */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-zinc-500" />
            <span>{match.venue} {match.court ? `· ${match.court}` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span>{new Date(match.scheduledTime).toLocaleDateString('pt-BR')} às {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
