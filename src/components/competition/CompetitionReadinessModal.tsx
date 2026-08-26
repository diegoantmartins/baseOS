import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Trophy,
  Activity,
  Layers,
} from 'lucide-react';
import { CompetitionReadinessReport, EvaluatedJourneyStep, StepStatus } from '@/types/readiness';
import { cn } from '@/lib/utils';

interface CompetitionReadinessModalProps {
  report: CompetitionReadinessReport | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle?: (articleId: string) => void;
}

export function CompetitionReadinessModal({
  report,
  isOpen,
  onClose,
  onSelectArticle,
}: CompetitionReadinessModalProps) {
  const navigate = useNavigate();

  if (!report) return null;

  const handleAction = (route: string) => {
    onClose();
    navigate(route);
  };

  const handleGuide = (articleId: string) => {
    if (onSelectArticle) {
      onSelectArticle(articleId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-border p-6 rounded-xl shadow-2xl scrollbar-thin space-y-5">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
              Checklist de Prontidão — {report.competitionName}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Avaliação operacional em tempo real das 13 etapas da competição.
          </DialogDescription>
        </DialogHeader>

        {/* Global Progress Header in Modal */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              Estágio Global Atual
            </div>
            <div className="text-sm font-semibold text-foreground mt-0.5">
              {report.globalStageLabel}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-xl font-bold font-mono text-foreground tabular-nums">
                {report.percentage}%
              </span>
              <span className="block text-[10px] text-muted-foreground">
                {report.completedStepsCount} de {report.totalStepsCount} etapas
              </span>
            </div>
            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-sm text-primary font-mono border border-zinc-700">
              {report.percentage}%
            </div>
          </div>
        </div>

        {/* 13 Steps List */}
        <div className="space-y-2.5">
          {report.steps.map((step) => {
            return (
              <div
                key={step.stepNumber}
                className={cn(
                  'p-3.5 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3',
                  step.status === 'completed' && 'bg-zinc-900/30 border-zinc-800/80',
                  step.status === 'in_progress' && 'bg-amber-950/20 border-amber-900/40',
                  step.status === 'attention' && 'bg-amber-950/30 border-amber-800/60',
                  step.status === 'blocked' && 'bg-zinc-950 border-zinc-800/60 opacity-70',
                  step.status === 'pending' && 'bg-zinc-900/20 border-zinc-800/60'
                )}
              >
                {/* Step Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono font-bold text-foreground">
                      {step.stepNumber}
                    </span>
                    <h4 className="text-xs font-semibold text-foreground">
                      {step.title}
                    </h4>
                    <StepBadge status={step.status} />
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>

                  {/* Metrics chips */}
                  {step.metrics && step.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {step.metrics.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-mono"
                        >
                          <strong className="text-muted-foreground mr-1">{m.label}:</strong>
                          {m.value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Blockers / Warnings list */}
                  {step.blockers && step.blockers.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {step.blockers.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {step.warnings && step.warnings.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {step.warnings.map((w, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                  {step.articleId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleGuide(step.articleId!)}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-primary gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Guia</span>
                    </Button>
                  )}

                  {step.route && (
                    <Button
                      size="sm"
                      variant={step.status === 'completed' ? 'ghost' : 'outline'}
                      onClick={() => handleAction(step.route!)}
                      className={cn(
                        'h-7 px-2.5 text-xs gap-1 font-medium rounded-md shadow-none',
                        step.status !== 'completed' && 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
                      )}
                    >
                      <span>{step.actionLabel || 'Ir à tela'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepBadge({ status }: { status: StepStatus }) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="text-[9px] uppercase font-semibold h-4 py-0 px-1.5 bg-emerald-950/40 text-emerald-400 border-emerald-900/40">
          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
          Concluído
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="outline" className="text-[9px] uppercase font-semibold h-4 py-0 px-1.5 bg-amber-950/40 text-amber-400 border-amber-900/40">
          <Activity className="w-2.5 h-2.5 mr-1" />
          Em andamento
        </Badge>
      );
    case 'attention':
      return (
        <Badge variant="outline" className="text-[9px] uppercase font-semibold h-4 py-0 px-1.5 bg-amber-950/60 text-amber-300 border-amber-800/60">
          <AlertTriangle className="w-2.5 h-2.5 mr-1" />
          Atenção
        </Badge>
      );
    case 'blocked':
      return (
        <Badge variant="outline" className="text-[9px] uppercase font-semibold h-4 py-0 px-1.5 bg-zinc-900 text-zinc-500 border-zinc-800">
          <Lock className="w-2.5 h-2.5 mr-1" />
          Bloqueado
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="outline" className="text-[9px] uppercase font-semibold h-4 py-0 px-1.5 bg-zinc-900 text-zinc-400 border-zinc-800">
          <Clock className="w-2.5 h-2.5 mr-1" />
          Pendente
        </Badge>
      );
  }
}
