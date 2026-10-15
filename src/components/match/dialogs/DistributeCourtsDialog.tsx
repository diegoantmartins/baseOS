/**
 * DistributeCourtsDialog — Diálogo de visualização e confirmação da alocação de quadras
 */

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, MapPin, AlertTriangle, CheckCircle2, Split, Layers } from 'lucide-react';
import {
  distributeCourtsDynamically,
  type CourtDistributionProposal,
  type RestWarning,
} from '@/services/courtDistributionService';
import type { MatchRecord } from '@/types/entities';

export interface DistributeCourtsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: MatchRecord[];
  onConfirm: (proposals: CourtDistributionProposal[]) => Promise<void>;
}

export function DistributeCourtsDialog({
  open,
  onOpenChange,
  matches,
  onConfirm,
}: DistributeCourtsDialogProps) {
  const [applying, setApplying] = React.useState(false);

  const distribution = useMemo(() => {
    return distributeCourtsDynamically(matches, 'group-stage');
  }, [matches]);

  const court1Matches = useMemo(() => {
    return distribution.proposals.filter((p) => p.assignedCourt === 'Quadra 1');
  }, [distribution]);

  const court2Matches = useMemo(() => {
    return distribution.proposals.filter((p) => p.assignedCourt === 'Quadra 2');
  }, [distribution]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await onConfirm(distribution.proposals);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Split className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Distribuir Quadras Automaticamente
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Aloca as {distribution.proposals.length} partidas da fase de grupos alternadamente entre Quadra 1 e Quadra 2.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Alertas de Descanso / Conflito */}
          {distribution.warnings.length > 0 && (
            <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-300 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
              <AlertTitle className="text-xs font-bold text-amber-300">
                {distribution.warnings.length} alerta(s) de descanso / jogos consecutivos
              </AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-1 text-amber-200/90">
                {distribution.warnings.map((w, idx) => (
                  <p key={idx} className="text-[11px] leading-tight">
                    &bull; {w.reason}
                  </p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Resumo de Alocação */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-zinc-950 font-bold text-xs">Quadra 1</Badge>
                <span className="text-zinc-300 font-medium">Alocação Primária</span>
              </div>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {court1Matches.length} jogos
              </span>
            </div>

            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-500 text-zinc-950 font-bold text-xs">Quadra 2</Badge>
                <span className="text-zinc-300 font-medium">Alocação Simultânea</span>
              </div>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {court2Matches.length} jogos
              </span>
            </div>
          </div>

          {/* Visualização Dividida em Duas Colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Coluna Quadra 1 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 px-1">
                <span>📍 Sequência da Quadra 1</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {court1Matches.length} jogos
                </span>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {court1Matches.map((p) => (
                  <div
                    key={p.matchId}
                    className="p-2 rounded bg-zinc-900 border border-zinc-800 text-xs space-y-1 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Jogo #{p.matchNumber}</span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-2.5 h-2.5" />
                        {p.scheduledTime ? p.scheduledTime.slice(11, 16) : 'S/H'}
                      </span>
                    </div>
                    <div className="font-semibold text-zinc-200 truncate">
                      {p.teamAName} vs {p.teamBName}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna Quadra 2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-sky-400 px-1">
                <span>📍 Sequência da Quadra 2</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {court2Matches.length} jogos
                </span>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {court2Matches.map((p) => (
                  <div
                    key={p.matchId}
                    className="p-2 rounded bg-zinc-900 border border-zinc-800 text-xs space-y-1 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Jogo #{p.matchNumber}</span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-2.5 h-2.5" />
                        {p.scheduledTime ? p.scheduledTime.slice(11, 16) : 'S/H'}
                      </span>
                    </div>
                    <div className="font-semibold text-zinc-200 truncate">
                      {p.teamAName} vs {p.teamBName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-zinc-900/60 border-t border-zinc-800 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={applying}
            className="text-xs h-8 border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={applying || distribution.proposals.length === 0}
            className="text-xs h-8 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {applying ? 'Salvando...' : 'Confirmar e Aplicar Distribuição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
