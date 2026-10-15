/**
 * CourtsSplitView — Visualização cronológica paralela de Quadra 1 e Quadra 2
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Clock, MapPin, Volleyball, MoreHorizontal, Award, CheckCircle2 } from 'lucide-react';
import type { MatchView } from '@/pages/MatchesPage';
import type { MatchRecord } from '@/types/entities';

export interface CourtsSplitViewProps {
  matches: MatchView[];
  onSetCourt: (matchId: string, court: string) => Promise<void>;
  onOpenLiveScorer: (match: MatchRecord) => void;
  onOpenHomologate: (match: MatchRecord) => void;
  canEdit: boolean;
  canFinalize: boolean;
}

export function CourtsSplitView({
  matches,
  onSetCourt,
  onOpenLiveScorer,
  onOpenHomologate,
  canEdit,
  canFinalize,
}: CourtsSplitViewProps) {
  const court1Matches = matches.filter((m) => m.court === 'Quadra 1');
  const court2Matches = matches.filter((m) => m.court === 'Quadra 2');
  const unassignedMatches = matches.filter((m) => !m.court || (m.court !== 'Quadra 1' && m.court !== 'Quadra 2'));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── COLUNA QUADRA 1 ── */}
        <div className="bg-zinc-950/70 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-zinc-950 font-bold text-xs px-2.5 py-0.5">
                📍 Quadra 1
              </Badge>
              <span className="text-xs font-semibold text-zinc-200">Cronograma Oficial</span>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold">
              {court1Matches.length} partida(s)
            </span>
          </div>

          {court1Matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 italic">
              Nenhuma partida alocada para a Quadra 1 no momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {court1Matches.map((m) => (
                <CourtMatchCard
                  key={m.id}
                  matchView={m}
                  courtColor="amber"
                  onSetCourt={onSetCourt}
                  onOpenLiveScorer={onOpenLiveScorer}
                  onOpenHomologate={onOpenHomologate}
                  canEdit={canEdit}
                  canFinalize={canFinalize}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── COLUNA QUADRA 2 ── */}
        <div className="bg-zinc-950/70 border border-sky-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-500 text-zinc-950 font-bold text-xs px-2.5 py-0.5">
                📍 Quadra 2
              </Badge>
              <span className="text-xs font-semibold text-zinc-200">Cronograma Oficial</span>
            </div>
            <span className="text-xs font-mono text-sky-400 font-semibold">
              {court2Matches.length} partida(s)
            </span>
          </div>

          {court2Matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 italic">
              Nenhuma partida alocada para a Quadra 2 no momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {court2Matches.map((m) => (
                <CourtMatchCard
                  key={m.id}
                  matchView={m}
                  courtColor="sky"
                  onSetCourt={onSetCourt}
                  onOpenLiveScorer={onOpenLiveScorer}
                  onOpenHomologate={onOpenHomologate}
                  canEdit={canEdit}
                  canFinalize={canFinalize}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SEÇÃO INFERIOR: SEM QUADRA DEFINIDA ── */}
      {unassignedMatches.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              Partidas sem Quadra Atribuída ({unassignedMatches.length})
            </span>
            <span className="text-[11px] text-zinc-500">
              Alocação rápida disponível em cada card
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {unassignedMatches.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>Jogo #{m.record.matchNumber}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {m.time}
                  </span>
                </div>
                <div className="font-semibold text-zinc-200 truncate">
                  {m.teamA.name} vs {m.teamB.name}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500">Atribuir a:</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                      onClick={() => onSetCourt(m.record.id, 'Quadra 1')}
                    >
                      Quadra 1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] border-sky-500/40 text-sky-300 hover:bg-sky-500/20"
                      onClick={() => onSetCourt(m.record.id, 'Quadra 2')}
                    >
                      Quadra 2
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CourtMatchCard({
  matchView,
  courtColor,
  onSetCourt,
  onOpenLiveScorer,
  onOpenHomologate,
  canEdit,
  canFinalize,
}: {
  matchView: MatchView;
  courtColor: 'amber' | 'sky';
  onSetCourt: (matchId: string, court: string) => Promise<void>;
  onOpenLiveScorer: (match: MatchRecord) => void;
  onOpenHomologate: (match: MatchRecord) => void;
  canEdit: boolean;
  canFinalize: boolean;
}) {
  const m = matchView;
  const isHomologated = m.status === 'homologated';
  const isCompleted = m.status === 'completed';
  const isInProgress = m.status === 'in-progress';

  return (
    <div className="p-3 bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-lg text-xs space-y-2 transition-all">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800/60 pb-1.5 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-300">Jogo #{m.record.matchNumber}</span>
          {m.groupName && (
            <span className="text-zinc-500">&bull; {m.groupName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-zinc-300 font-medium">
            <Clock className="w-3 h-3 text-zinc-400" />
            {m.time}
          </span>
          <StatusBadge status={m.status} className="text-[9px] h-4 px-1" />
        </div>
      </div>

      {/* Confronto e Placar */}
      <div className="flex items-center justify-between py-1">
        <div className="space-y-1 max-w-[65%] truncate">
          <div className="font-semibold text-zinc-200 truncate">{m.teamA.name}</div>
          <div className="font-semibold text-zinc-200 truncate">{m.teamB.name}</div>
        </div>

        <div className="text-right">
          {isCompleted || isHomologated || isInProgress ? (
            <div className="font-mono font-bold text-sm text-amber-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              {m.teamA.score ?? 0} x {m.teamB.score ?? 0}
            </div>
          ) : (
            <div className="font-mono text-xs text-zinc-500">vs</div>
          )}
        </div>
      </div>

      {/* Ações e Mudar Quadra */}
      <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/60 text-[10px]">
        {/* Seletor Rápido de Mudança de Quadra */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-500 mr-0.5">Mover:</span>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onSetCourt(m.record.id, courtColor === 'amber' ? 'Quadra 2' : 'Quadra 1')}
            className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
          >
            {courtColor === 'amber' ? 'Ir p/ Quadra 2' : 'Ir p/ Quadra 1'}
          </button>
        </div>

        {/* Ações Operacionais */}
        <div className="flex items-center gap-1.5">
          {isCompleted && canFinalize && (
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
              onClick={() => onOpenHomologate(m.record)}
            >
              <CheckCircle2 className="w-3 h-3" />
              Homologar
            </Button>
          )}

          {(!isCompleted && !isHomologated) && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px] border-zinc-700 hover:bg-zinc-800 text-zinc-300 gap-1"
              onClick={() => onOpenLiveScorer(m.record)}
            >
              <Volleyball className="w-3 h-3 text-amber-400" />
              Mesa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
