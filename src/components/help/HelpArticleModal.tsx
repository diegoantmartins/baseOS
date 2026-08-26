import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { HelpArticleViewer } from './HelpArticleViewer';
import { getHelpArticleById } from '@/data/helpArticles';
import { HelpArticle } from '@/types/help';

interface HelpArticleModalProps {
  articleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle?: (newArticleId: string) => void;
}

export function HelpArticleModal({
  articleId,
  isOpen,
  onClose,
  onSelectArticle,
}: HelpArticleModalProps) {
  const article: HelpArticle | undefined = articleId ? getHelpArticleById(articleId) : undefined;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!article) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-zinc-950 border-border p-6 rounded-xl shadow-2xl scrollbar-thin">
        <DialogHeader className="sr-only">
          <DialogTitle>{article.title}</DialogTitle>
          <DialogDescription>{article.description}</DialogDescription>
        </DialogHeader>

        <HelpArticleViewer
          article={article}
          onClose={onClose}
          onSelectArticle={(newId) => {
            if (onSelectArticle) {
              onSelectArticle(newId);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
