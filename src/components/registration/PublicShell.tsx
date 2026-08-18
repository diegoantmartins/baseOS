// Layout público (sem sidebar) para o portal de inscrição da equipe.

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Volleyball } from 'lucide-react';

interface PublicShellProps {
  children: ReactNode;
}

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="p-2 rounded-lg bg-indoor text-indoor-foreground">
              <Volleyball className="w-5 h-5" />
            </span>
            VolleyPro
          </Link>
          <span className="text-sm text-muted-foreground">Portal de Inscrição de Atletas</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      <footer className="py-8 text-center text-xs text-muted-foreground">
        VolleyPro - Sistema de Gestão de Competições de Voleibol
      </footer>
    </div>
  );
}