import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CompetitionPendingTask } from '@/types/readiness';
import { HelpArticleModal } from '@/components/help/HelpArticleModal';
import { cn } from '@/lib/utils';

interface CompetitionPendingTasksProps {
  tasks: CompetitionPendingTask[];
  className?: string;
}

export function CompetitionPendingTasks({ tasks, className }: CompetitionPendingTasksProps) {
  const navigate = useNavigate();
  const [helpArticleId, setHelpArticleId] = useState<string | null>(null);

  if (!tasks || tasks.length === 0) {
    return (
      <Card className={cn('card-elevated bg-zinc-950 border-border p-4 rounded-xl shadow-none', className)}>
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Nenhuma pendência operacional identificada. Tudo pronto para avançar!</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('card-elevated bg-zinc-950 border-border rounded-xl shadow-none p-4 space-y-3', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Pendências da Competição ({tasks.length})
            </h3>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Ações recomendadas para regularização
          </span>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border transition-colors',
                task.severity === 'blocker' && 'bg-red-950/20 border-red-900/40 hover:border-red-800/60',
                task.severity === 'warning' && 'bg-amber-950/20 border-amber-900/40 hover:border-amber-800/60',
                task.severity === 'info' && 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
              )}
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] uppercase font-semibold py-0 px-1.5 h-4 border-zinc-800',
                      task.severity === 'blocker' && 'bg-red-950/60 text-red-400 border-red-900/60',
                      task.severity === 'warning' && 'bg-amber-950/60 text-amber-400 border-amber-900/60',
                      task.severity === 'info' && 'bg-zinc-800 text-zinc-300'
                    )}
                  >
                    {task.severity === 'blocker' && 'Bloqueio'}
                    {task.severity === 'warning' && 'Atenção'}
                    {task.severity === 'info' && 'Informativo'}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {task.title}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {task.description}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {task.articleId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setHelpArticleId(task.articleId!)}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                  >
                    <HelpCircle className="w-3 h-3 text-primary" />
                    <span>Como fazer?</span>
                  </Button>
                )}

                {task.route && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(task.route!)}
                    className="h-7 px-2.5 text-xs gap-1 font-medium border-zinc-800 bg-zinc-900 hover:bg-zinc-800 shadow-none text-foreground"
                  >
                    <span>{task.actionLabel || 'Resolver'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <HelpArticleModal
        articleId={helpArticleId}
        isOpen={Boolean(helpArticleId)}
        onClose={() => setHelpArticleId(null)}
      />
    </>
  );
}
