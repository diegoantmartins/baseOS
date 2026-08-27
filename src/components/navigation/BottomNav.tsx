/**
 * BottomNav — Navegação rápida mobile para uso em quadra/praia
 *
 * Visível apenas em viewports abaixo de lg (< 1024px).
 * Prioriza as 4 ações mais frequentes em ambiente de quadra:
 * - Início (Competições Ativas)
 * - Jogos (Partidas)
 * - Súmulas
 * - Menu (acesso ao restante via Sheet/Drawer)
 *
 * Regras:
 * - CSS puro para visibilidade (lg:hidden); sem JS para detectar viewport
 * - Respeita safe-area-inset-bottom (iOS notch/home indicator)
 * - Touch targets mínimos de 44px (WCAG 2.5.5)
 * - aria-current="page" no item ativo
 * - Não sobrepõe conteúdo — MainLayout já aplica pb-20 em mobile
 */

import { Link, useLocation } from 'react-router-dom';
import {
  Flame,
  Calendar,
  ClipboardList,
  Menu,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/components/auth/useAuth';
import { Settings, HelpCircle, Trophy, Users, UserCheck, Building2, Dices, BarChart3, FileSpreadsheet, Users2, Volleyball } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Itens principais do BottomNav (máx. 4 ações primárias)
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY_ITEMS = [
  {
    icon: Flame,
    label: 'Início',
    path: '/competicoes-ativas',
    matchPaths: ['/competicoes-ativas', '/'],
  },
  {
    icon: Calendar,
    label: 'Jogos',
    path: '/jogos',
    matchPaths: ['/jogos'],
  },
  {
    icon: ClipboardList,
    label: 'Súmulas',
    path: '/sumulas',
    matchPaths: ['/sumulas'],
  },
] as const;

// Itens secundários — acessíveis pelo Sheet "Menu"
const SECONDARY_GROUPS = [
  {
    label: 'Painel',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Trophy, label: 'Campeonatos', path: '/competicoes' },
      { icon: Dices, label: 'Sorteio', path: '/sorteio' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { icon: Users, label: 'Equipes', path: '/equipes' },
      { icon: UserCheck, label: 'Atletas', path: '/atletas' },
      { icon: Building2, label: 'Locais', path: '/locais' },
      { icon: Users2, label: 'Oficiais', path: '/pessoas' },
      { icon: Volleyball, label: 'Modalidades', path: '/modalidades' },
    ],
  },
  {
    label: 'Documentos',
    items: [
      { icon: BarChart3, label: 'Estatísticas', path: '/estatisticas' },
      { icon: FileSpreadsheet, label: 'Relatórios', path: '/relatorios' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { icon: Settings, label: 'Configurações', path: '/configuracoes' },
      { icon: HelpCircle, label: 'Central de Ajuda', path: '/ajuda' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export function BottomNav() {
  const location = useLocation();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isItemActive = (matchPaths: readonly string[]) =>
    matchPaths.some((p) =>
      p === '/' || p === '/competicoes-ativas'
        ? location.pathname === '/' || location.pathname === '/competicoes-ativas'
        : location.pathname.startsWith(p),
    );

  const isMenuActive =
    !isItemActive(PRIMARY_ITEMS[0].matchPaths) &&
    !isItemActive(PRIMARY_ITEMS[1].matchPaths) &&
    !isItemActive(PRIMARY_ITEMS[2].matchPaths);

  return (
    <>
      {/* ── Bottom Nav Bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegação rápida"
      >
        <div className="flex items-stretch">
          {/* Itens primários */}
          {PRIMARY_ITEMS.map((item) => {
            const active = isItemActive(item.matchPaths);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-2 px-1 text-[10px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon
                  className={cn('w-5 h-5', active ? 'text-primary' : 'text-zinc-500')}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Botão "Menu" — abre Sheet com navegação completa */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Abrir menu completo"
            aria-haspopup="dialog"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-2 px-1 text-[10px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              isMenuActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Menu
              className={cn('w-5 h-5', isMenuActive ? 'text-primary' : 'text-zinc-500')}
              aria-hidden="true"
            />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* ── Sheet: Menu completo mobile ── */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl bg-zinc-950 border-t border-border p-0 lg:hidden">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SheetTitle className="text-sm font-semibold text-foreground text-left">
              Menu
            </SheetTitle>
          </SheetHeader>

          <nav className="overflow-y-auto h-[calc(80vh-64px)] py-2 scrollbar-thin" aria-label="Menu completo">
            {SECONDARY_GROUPS.map((group) => (
              <div key={group.label} className="px-3 py-2">
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
                  {group.label}
                </p>
                <ul className="space-y-0.5" role="list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname.startsWith(item.path);
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setMenuOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-zinc-800/60 hover:text-foreground',
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Logout no final do Sheet */}
            {session && (
              <div className="px-6 pt-4 pb-2 border-t border-border mt-2">
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.name} · {session.user.email}
                </p>
              </div>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
