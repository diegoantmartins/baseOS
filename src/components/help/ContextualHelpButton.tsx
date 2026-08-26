import { useState } from 'react';
import { HelpCircle, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HelpArticleModal } from './HelpArticleModal';
import { getHelpArticleById } from '@/data/helpArticles';
import { cn } from '@/lib/utils';

interface ContextualHelpItem {
  articleId: string;
  label?: string;
}

interface ContextualHelpButtonProps {
  articleId?: string;
  articles?: ContextualHelpItem[];
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'xs';
  className?: string;
}

export function ContextualHelpButton({
  articleId,
  articles,
  label = 'Ajuda nesta tela',
  variant = 'outline',
  size = 'sm',
  className,
}: ContextualHelpButtonProps) {
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  // If a single article is passed
  if (articleId && (!articles || articles.length === 0)) {
    return (
      <>
        <Button
          type="button"
          variant={variant}
          size={size === 'xs' ? 'sm' : size}
          onClick={() => setActiveArticleId(articleId)}
          className={cn(
            'h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-md font-medium shadow-none',
            className
          )}
          title="Abrir guia operacional passo a passo desta tela"
        >
          <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{label}</span>
        </Button>

        <HelpArticleModal
          articleId={activeArticleId}
          isOpen={Boolean(activeArticleId)}
          onClose={() => setActiveArticleId(null)}
          onSelectArticle={(newId) => setActiveArticleId(newId)}
        />
      </>
    );
  }

  // Multi-article dropdown menu
  if (articles && articles.length > 0) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={variant}
              size={size === 'xs' ? 'sm' : size}
              className={cn(
                'h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-md font-medium shadow-none',
                className
              )}
            >
              <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{label}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-1.5 bg-zinc-900 border-border shadow-xl rounded-lg">
            <DropdownMenuLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground px-2 py-1 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-primary" />
              <span>Guias desta tela</span>
            </DropdownMenuLabel>
            {articles.map((item) => {
              const article = getHelpArticleById(item.articleId);
              const displayLabel = item.label || article?.title || item.articleId;
              return (
                <DropdownMenuItem
                  key={item.articleId}
                  onClick={() => setActiveArticleId(item.articleId)}
                  className="flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs text-foreground hover:bg-zinc-800/70 focus:bg-zinc-800"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                  <span className="truncate">{displayLabel}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <HelpArticleModal
          articleId={activeArticleId}
          isOpen={Boolean(activeArticleId)}
          onClose={() => setActiveArticleId(null)}
          onSelectArticle={(newId) => setActiveArticleId(newId)}
        />
      </>
    );
  }

  return null;
}
