import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ListOrdered,
  Trophy,
  Flame,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CompetitionReadinessReport } from '@/types/readiness';
import { CompetitionReadinessModal } from './CompetitionReadinessModal';
import { HelpArticleModal } from '@/components/help/HelpArticleModal';
import { cn } from '@/lib/utils';

interface CompetitionProgressProps {
  report: CompetitionReadinessReport;
  className?: string;
  onRefresh?: () => void;
}

export function CompetitionProgress({ report, className, onRefresh }: CompetitionProgressProps) {
  const navigate = useNavigate();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [helpArticleId, setHelpArticleId] = useState<string | null>(null);

  const completedCount = report.steps.filter((s) => s.status === 'completed').length;
  const attentionCount = report.steps.filter((s) => s.status === 'attention').length;
  const inProgressCount = report.steps.filter((s) => s.status === 'in_progress').length;
  const blockedCount = report.steps.filter((s) => s.status === 'blocked').length;

  return (
    <>
      <Card className={cn('card-elevated bg-zinc-950 border-border p-5 rounded-xl shadow-none space-y-4', className)}>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Progresso Operacional
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] uppercase font-semibold border-zinc-800',
                  report.globalStage === 'HOMOLOGADA' && 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40',
                  report.globalStage === 'PRONTA_PARA_HOMOLOGACAO' && 'bg-amber-950/40 text-amber-300 border-amber-900/40',
                  report.globalStage === 'EM_ANDAMENTO' && 'bg-amber-950/40 text-amber-400 border-amber-900/40',
                  report.globalStage === 'PRONTA_PARA_INICIAR' && 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40',
                  report.globalStage === 'PREPARACAO' && 'bg-zinc-900 text-zinc-400'
                )}
              >
                {report.globalStageLabel}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tabular-nums font-mono text-foreground">
                {report.percentage}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({completedCount} de {report.totalStepsCount} etapas concluídas)
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setChecklistOpen(true)}
            className="h-8 text-xs gap-1.5 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-md font-medium text-foreground self-start sm:self-auto"
          >
            <ListOrdered className="w-3.5 h-3.5 text-primary" />
            <span>Ver Checklist Completo</span>
          </Button>
        </div>

        {/* Progress Bars */}
        <div className="space-y-1.5">
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/80">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                report.percentage === 100 ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{ width: `${report.percentage}%` }}
            />
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>{completedCount} concluídas</span>
              </span>
              {attentionCount > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{attentionCount} pendências</span>
                </span>
              )}
              {inProgressCount > 0 && (
                <span className="flex items-center gap-1 text-zinc-300">
                  <Activity className="w-3 h-3 text-primary" />
                  <span>{inProgressCount} em andamento</span>
                </span>
              )}
            </div>

            {report.matchesStats.total > 0 && (
              <span className="text-zinc-400 font-mono">
                Jogos: {report.matchesStats.completed}/{report.matchesStats.total} ({report.matchesStats.percentageCompleted}%)
              </span>
            )}
          </div>
        </div>

        {/* Highlighted Next Action */}
        {report.nextAction && (
          <div className="rounded-lg bg-zinc-900/70 border border-zinc-800 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-semibold text-primary tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Próxima Ação Recomendada
              </span>
              {report.nextAction.articleId && (
                <button
                  type="button"
                  onClick={() => setHelpArticleId(report.nextAction!.articleId!)}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>{report.nextAction.guideLabel || 'Como fazer?'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-foreground leading-tight">
                  {report.nextAction.title}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-1">
                  {report.nextAction.description}
                </p>
              </div>

              {report.nextAction.route && (
                <Button
                  size="sm"
                  onClick={() => navigate(report.nextAction!.route!)}
                  className="h-7 px-3 text-xs gap-1.5 font-semibold shrink-0 rounded-md shadow-none"
                >
                  <span>{report.nextAction.actionLabel || 'Executar Ação'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Modal do Checklist Completo das 13 Etapas */}
      <CompetitionReadinessModal
        report={report}
        isOpen={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        onSelectArticle={(artId) => {
          setChecklistOpen(false);
          setHelpArticleId(artId);
        }}
      />

      {/* Modal de Artigo de Ajuda Contextual */}
      <HelpArticleModal
        articleId={helpArticleId}
        isOpen={Boolean(helpArticleId)}
        onClose={() => setHelpArticleId(null)}
      />
    </>
  );
}
