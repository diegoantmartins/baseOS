import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Info,
  ListOrdered,
  Sparkles,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { getHelpArticleById } from '@/data/helpArticles';
import { HelpArticle } from '@/types/help';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HelpArticleViewerProps {
  article: HelpArticle;
  onSelectArticle?: (articleId: string) => void;
  onClose?: () => void;
  showBackNavigation?: boolean;
}

export function HelpArticleViewer({
  article,
  onSelectArticle,
  onClose,
  showBackNavigation = true,
}: HelpArticleViewerProps) {
  const navigate = useNavigate();

  const handleNavigateToScreen = (route: string) => {
    if (onClose) onClose();
    navigate(route);
  };

  const handleNextStep = () => {
    if (article.nextStep?.route) {
      handleNavigateToScreen(article.nextStep.route);
    } else if (article.nextStep?.articleId && onSelectArticle) {
      onSelectArticle(article.nextStep.articleId);
    }
  };

  const relatedList = (article.relatedArticles || [])
    .map(id => getHelpArticleById(id))
    .filter((a): a is HelpArticle => Boolean(a));

  return (
    <article className="space-y-6 text-foreground">
      {/* Header & Breadcrumb */}
      <header className="space-y-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{article.categoryTitle}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="truncate">{article.title}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{article.title}</h1>
          <div className="flex items-center gap-2">
            {article.difficulty && (
              <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground border-zinc-700">
                {article.difficulty === 'basic' && 'Iniciante'}
                {article.difficulty === 'intermediate' && 'Intermediário'}
                {article.difficulty === 'advanced' && 'Avançado'}
              </Badge>
            )}
            {article.screenRoute && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800"
                onClick={() => handleNavigateToScreen(article.screenRoute!)}
              >
                <span>{article.screenLabel || 'Ir para esta tela'}</span>
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {article.description}
        </p>
      </header>

      {/* 1. Objetivo */}
      <section className="rounded-lg bg-zinc-900/70 border border-zinc-800 p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
          <Info className="w-3.5 h-3.5" />
          <span>Objetivo</span>
        </div>
        <p className="text-xs text-foreground/90 leading-relaxed font-medium">
          {article.objective}
        </p>
      </section>

      {/* 2. Antes de Começar (Pré-requisitos) */}
      {article.prerequisites && article.prerequisites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Antes de começar
          </h2>
          <ul className="space-y-1.5">
            {article.prerequisites.map((prereq, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-1.5 shrink-0" />
                <span>{prereq}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. Passo a Passo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Passo a passo</span>
        </div>

        <div className="space-y-2.5">
          {article.steps.map((step) => (
            <div
              key={step.stepNumber}
              className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-800 text-xs font-bold text-foreground shrink-0 tabular-nums font-mono border border-zinc-700/60">
                {step.stepNumber}
              </span>
              <div className="space-y-1 text-xs text-foreground/90 flex-1">
                {step.highlight && (
                  <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-semibold text-primary mb-1">
                    {step.highlight}
                  </span>
                )}
                <p className="leading-relaxed">{step.instruction}</p>
                {step.tip && (
                  <p className="text-[11px] text-muted-foreground italic mt-1">
                    💡 Dica: {step.tip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Resultado */}
      <section className="rounded-lg bg-emerald-950/20 border border-emerald-900/40 p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Resultado</span>
        </div>
        <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
          {article.result}
        </p>
      </section>

      {/* 5. Próximo Passo */}
      {article.nextStep && (
        <section className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              Próximo passo recomendado
            </div>
            <div className="text-xs font-medium text-foreground">
              {article.nextStep.label}
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 font-semibold shrink-0 shadow-none"
            onClick={handleNextStep}
          >
            <span>Continuar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </section>
      )}

      {/* 6. Artigos Relacionados */}
      {relatedList.length > 0 && (
        <section className="pt-4 border-t border-border space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Você também pode precisar de
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {relatedList.map((related) => (
              <button
                key={related.id}
                type="button"
                onClick={() => onSelectArticle && onSelectArticle(related.id)}
                className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700 transition-colors text-left group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {related.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {related.categoryTitle}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-primary shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
