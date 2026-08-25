import { ReactNode } from 'react';
import { Header } from './Header';
import { InactivityTimeoutModal } from '@/components/auth/InactivityTimeoutModal';

interface MainLayoutProps {
  children: ReactNode;
  containerClassName?: string;
}

export function MainLayout({ children, containerClassName = 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6' }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col antialiased text-foreground selection:bg-primary/20 w-full max-w-full overflow-x-hidden">
      <Header />
      <main className={`flex-1 w-full max-w-full min-w-0 ${containerClassName}`}>
        {children}
      </main>
      <footer className="border-t border-zinc-800/80 py-3 text-center text-xs text-zinc-500 bg-zinc-950/80 w-full max-w-full">
        BaseOS · Sistema Operacional de Gestão de Competições Esportivas
      </footer>
      <InactivityTimeoutModal />
    </div>
  );
}
