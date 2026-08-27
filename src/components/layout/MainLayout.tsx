/**
 * MainLayout — Container estrutural principal das páginas autenticadas do BaseOS.
 *
 * Coordena:
 * - DemoModeBanner (topo, sticky)
 * - Header (topbar fixa)
 * - Sidebar (coluna lateral, desktop lg+)
 * - Área de conteúdo principal (scrollável)
 * - BottomNav (mobile, fixo na base)
 * - InactivityTimeoutModal (global)
 *
 * Regras:
 * - Sidebar: apenas em lg+; a nav mobile é coberta pelo BottomNav + menu do Header
 * - containerClassName permite páginas definirem padding/max-width próprios
 * - footer removido para layout sidebar-first (espaço é premium em SaaS)
 */

import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DemoModeBanner } from './DemoModeBanner';
import { InactivityTimeoutModal } from '@/components/auth/InactivityTimeoutModal';
import { BottomNav } from '@/components/navigation/BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  /** Classe CSS aplicada ao container interno do conteúdo (max-width, padding) */
  containerClassName?: string;
}

export function MainLayout({
  children,
  containerClassName = 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6',
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background antialiased text-foreground selection:bg-primary/20 w-full max-w-full overflow-x-hidden">
      {/* Banner de modo demo — topo absoluto, aparece apenas quando sem Supabase */}
      <DemoModeBanner />

      {/* Sidebar — visível apenas em lg+ (desktop); mobile usa BottomNav + Header menu */}
      <Sidebar />

      {/* Layout principal: Offset à direita da sidebar em desktop */}
      <div className="flex flex-col min-h-screen lg:pl-[240px] transition-[padding-left] duration-200 ease-out">
        {/* Header fixo — logo + ações de usuário + mobile hamburger */}
        <Header />

        {/* Conteúdo da página */}
        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 w-full max-w-full min-w-0 ${containerClassName} pb-20 lg:pb-6`}
        >
          {children}
        </main>
      </div>

      {/* Bottom Navigation — apenas em mobile (oculto em lg+) */}
      <BottomNav />

      {/* Modal de sessão expirada — global */}
      <InactivityTimeoutModal />
    </div>
  );
}
