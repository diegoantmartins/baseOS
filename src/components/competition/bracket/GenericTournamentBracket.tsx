/**
 * GenericTournamentBracket.tsx — Componente Universal de Chaveamento do BaseOS (Fase 4.9)
 *
 * Responsabilidades:
 * - Renderização responsiva e genérica de qualquer StageGraph (1 a N rodadas)
 * - Suporte a múltiplos estágios (Play-In, Quartas, Semifinais, Final, etc.)
 * - Apuração e comemoração de pódio oficial quando a competição for concluída
 * - Acessibilidade completa por teclado e leitores de tela
 * - Suporte à Mesa do Apontador via callback onOpenMatch
 * - Zero lógica esportiva no frontend: consome estritamente o CompetitionBracketViewModel
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RefreshCw, GitBranch, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { CompetitionBracketViewModel } from '@/services/competitionBracketViewModel';
import { BracketStageNav } from './BracketStageNav';
import { BracketRoundColumn } from './BracketRoundColumn';

export interface GenericTournamentBracketProps {
  viewModel: CompetitionBracketViewModel;
  title?: string;
  onOpenMatch?: (matchId: string) => void;
  onReprocessRuntime?: () => Promise<{ ok: boolean; message?: string }>;
  className?: string;
}

export function GenericTournamentBracket({
  viewModel,
  title,
  onOpenMatch,
  onReprocessRuntime,
  className,
}: GenericTournamentBracketProps) {
  const { stages, competitionName, podium } = viewModel;

  // Estágio ativo (padrão: primeiro estágio com status em andamento, ou o primeiro)
  const [activeStageId, setActiveStageId] = useState<string>(() => {
    const inProgress = stages.find((s) => s.status === 'in-progress');
    return inProgress?.stageId || stages[0]?.stageId || '';
  });

  const [isReprocessing, setIsReprocessing] = useState(false);

  // Garante que o activeStageId exista caso os stages mudem
  const currentStage = useMemo(() => {
    return stages.find((s) => s.stageId === activeStageId) || stages[0];
  }, [stages, activeStageId]);

  const handleReprocess = async () => {
    if (!onReprocessRuntime) return;
    try {
      setIsReprocessing(true);
      const res = await onReprocessRuntime();
      if (res.ok) {
        toast.success(res.message || 'Chaveamento reconciliado com sucesso!');
      } else {
        toast.error(res.message || 'Falha na reconciliação do chaveamento.');
      }
    } catch {
      toast.error('Erro ao executar reconciliação do chaveamento.');
    } finally {
      setIsReprocessing(false);
    }
  };

  // Se não houver nenhum estágio ou rodada
  if (!stages || stages.length === 0 || !currentStage) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-card/40 my-4">
        <GitBranch className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-foreground">Chaveamento ainda não gerado</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Os confrontos desta competição serão exibidos automaticamente assim que a fase classificatória for concluída e os estágios forem gerados.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className || ''}`}>
      {/* ── Barra Superior com Título, Fases e Ação de Reconciliação ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              {title || `Chaveamento — ${competitionName}`}
            </h2>
            {viewModel.isLegacy && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-zinc-400 border-zinc-700 bg-zinc-800/40">
                Modo Compatibilidade
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Avanço automático orquestrado pelo Runtime. Clique em uma partida agendada para lançar o placar na Mesa.
          </p>
        </div>

        {/* Botão de Recuperação/Reconciliação (quando provido) */}
        {onReprocessRuntime && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isReprocessing}
            onClick={handleReprocess}
            className="h-8 text-xs gap-1.5 shrink-0 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin text-primary' : ''}`} />
            <span>Reconciliar Chaves</span>
          </Button>
        )}
      </div>

      {/* ── Navegação entre Múltiplos Estágios (se houver mais de 1) ── */}
      <BracketStageNav
        stages={stages}
        activeStageId={currentStage.stageId}
        onSelectStage={setActiveStageId}
      />

      {/* ── Exibição Comemorativa do Pódio Oficial (se decidido) ── */}
      {podium?.isDecided && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-zinc-900 to-amber-950/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-mono">
                Pódio Homologado da Competição
              </span>
              <h4 className="text-sm font-bold text-foreground">
                Campeão: {podium.champion?.name || 'A definir'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {podium.runnerUp && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Medal className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500">Vice:</span>
                <span className="font-semibold text-foreground">{podium.runnerUp.name}</span>
              </div>
            )}
            {podium.thirdPlace && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Medal className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-zinc-500">3º Lugar:</span>
                <span className="font-semibold text-foreground">{podium.thirdPlace.name}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Grade Horizontal das Rodadas (Colunas) ── */}
      <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="flex items-stretch gap-8 min-w-max px-1 py-2">
          {currentStage.rounds.map((round) => (
            <BracketRoundColumn
              key={round.roundId}
              round={round}
              onOpenMatch={onOpenMatch}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
