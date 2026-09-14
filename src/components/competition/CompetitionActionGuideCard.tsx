import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Lock,
  Unlock,
  Users,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { HelpArticleModal } from '@/components/help/HelpArticleModal';
import type { CompetitionActionGuide } from '@/services/competitionActionGuideService';
import { cn } from '@/lib/utils';

export interface CompetitionActionGuideCardProps {
  guide: CompetitionActionGuide;
  canEdit?: boolean;
  onCloseRegistrations?: () => Promise<void> | void;
  onReopenRegistrations?: () => Promise<void> | void;
  className?: string;
}

export function CompetitionActionGuideCard({
  guide,
  canEdit = true,
  onCloseRegistrations,
  onReopenRegistrations,
  className,
}: CompetitionActionGuideCardProps) {
  const navigate = useNavigate();
  const [helpArticleId, setHelpArticleId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePrimaryAction = async () => {
    if (guide.primaryAction.actionType === 'close_registrations' && onCloseRegistrations) {
      setIsProcessing(true);
      try {
        await onCloseRegistrations();
      } finally {
        setIsProcessing(false);
      }
    } else if (guide.primaryAction.route) {
      navigate(guide.primaryAction.route);
    }
  };

  const handleReopen = async () => {
    if (!onReopenRegistrations) return;
    setIsProcessing(true);
    try {
      await onReopenRegistrations();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card
        className={cn(
          'card-elevated bg-zinc-950 border-zinc-800 p-5 rounded-xl shadow-none space-y-4 relative overflow-hidden',
          className,
        )}
      >
        {/* Glow sutil âmbar para guiar a atenção do organizador */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── Cabeçalho Operacional: "Onde estou?" ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Onde estou
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-semibold py-0.5 px-2 rounded-md',
                guide.statusBadge.className,
              )}
            >
              {guide.statusBadge.label}
            </Badge>

            <span className="text-zinc-600 dark:text-zinc-500">·</span>

            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>{guide.capacity.displayText}</span>
            </span>
          </div>

          {guide.secondaryAction?.articleId && (
            <button
              type="button"
              onClick={() => setHelpArticleId(guide.secondaryAction!.articleId!)}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 self-start sm:self-auto font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{guide.secondaryAction.label || 'Como funciona este passo?'}</span>
            </button>
          )}
        </div>

        {/* ── Bloco Principal: "Qual é a Próxima Ação?" ── */}
        <div className="p-4 sm:p-5 rounded-lg bg-zinc-900/60 border border-zinc-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                <Sparkles className="w-3 h-3" />
                Próxima Ação Recomendada
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
              {guide.title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium">
              {guide.subtitle}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {guide.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
            <Button
              size="default"
              disabled={!canEdit || isProcessing}
              onClick={handlePrimaryAction}
              className="h-9 sm:h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold gap-2 bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-md shadow-none"
            >
              <span>{guide.primaryAction.label}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Central de Pendências e Conquistas Operacionais ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Pendências Reais */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              O que precisa de atenção ({guide.pendingPoints.length})
            </span>
            {guide.pendingPoints.length === 0 ? (
              <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Nenhuma pendência operacional identificada.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {guide.pendingPoints.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2',
                      item.severity === 'blocker' && 'bg-rose-950/20 border-rose-900/40 text-rose-200',
                      item.severity === 'warning' && 'bg-amber-950/20 border-amber-900/40 text-amber-200',
                      item.severity === 'info' && 'bg-zinc-900/40 border-zinc-800 text-zinc-300',
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {item.severity === 'blocker' ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : item.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-relaxed">{item.message}</span>
                    </div>
                    {item.route && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(item.route!)}
                        className="h-6 px-2 text-[10px] font-semibold text-foreground hover:bg-zinc-800 shrink-0"
                      >
                        {item.actionLabel || 'Resolver'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* O que já está resolvido */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              O que já está resolvido ({guide.resolvedPoints.length})
            </span>
            <div className="space-y-1.5">
              {guide.resolvedPoints.length === 0 ? (
                <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-xs text-muted-foreground">
                  Nenhuma etapa regulamentar concluída ainda.
                </div>
              ) : (
                guide.resolvedPoints.map((point, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg border border-zinc-800/50 bg-zinc-900/30 text-xs text-zinc-300 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{point}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Ação de Exceção Contextual: Reabertura de Inscrições ── */}
        {guide.canReopenRegistrations && onReopenRegistrations && (
          <div className="pt-2 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/20 p-3 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                Inscrições atualmente encerradas
              </span>
              <p className="text-[11px] text-muted-foreground">
                Caso precise cadastrar uma nova equipe ou permitir alterações de elenco, você pode reabrir as inscrições.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit || isProcessing}
              onClick={handleReopen}
              className="h-7 text-xs px-3 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 self-start sm:self-auto shrink-0 font-medium"
            >
              Reabrir Inscrições
            </Button>
          </div>
        )}
      </Card>

      {/* Modal de Artigo de Ajuda Contextual */}
      <HelpArticleModal
        articleId={helpArticleId}
        isOpen={Boolean(helpArticleId)}
        onClose={() => setHelpArticleId(null)}
      />
    </>
  );
}
