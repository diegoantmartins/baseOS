/**
 * Sidebar — Navegação lateral principal do BaseOS
 *
 * 5 grupos operacionais conforme o Blueprint:
 * 1. Painel & Competições
 * 2. Operação de Quadra
 * 3. Cadastros de Base
 * 4. Documentos Oficiais
 * 5. Sistema
 *
 * Regras de implementação:
 * - Item ativo detectado por `startsWith` para suportar subrotas
 * - RBAC preservado: itens filtrados pela mesma lógica de session.user.role
 * - Sem ARIA redundante; usa nav semântico + aria-current="page"
 * - Collapse persiste em memória (sem localStorage nesta fase)
 * - Tooltip no estado colapsado via title (nativo, zero overhead)
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  Flame,
  Calendar,
  ClipboardList,
  Dices,
  Users,
  UserCheck,
  Building2,
  Users2,
  BarChart3,
  FileSpreadsheet,
  FileEdit,
  Settings,
  HelpCircle,
  LogOut,
  UserRound,
  ChevronLeft,
  ChevronRight,
  Volleyball,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/useAuth';
import { ROLE_LABELS } from '@/types/auth';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';

// ─────────────────────────────────────────────────────────────────────────────
// Definição dos grupos e itens de navegação
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  /** Se true, requer session.user.role === 'organizer' */
  requiresOrganizer?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'painel',
    label: 'Painel & Competições',
    items: [
      { icon: Flame, label: 'Competições Ativas', path: '/competicoes-ativas' },
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Trophy, label: 'Campeonatos', path: '/competicoes', requiresOrganizer: true },
    ],
  },
  {
    id: 'operacao',
    label: 'Operação de Quadra',
    items: [
      { icon: Calendar, label: 'Partidas', path: '/jogos' },
      { icon: Trophy, label: 'Classificação', path: '/classificacao' },
      { icon: ClipboardList, label: 'Súmulas', path: '/sumulas' },
      { icon: Dices, label: 'Sorteio', path: '/sorteio', requiresOrganizer: true },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros de Base',
    items: [
      { icon: Users, label: 'Equipes', path: '/equipes', requiresOrganizer: true },
      { icon: UserCheck, label: 'Atletas', path: '/atletas', requiresOrganizer: true },
      { icon: Building2, label: 'Locais', path: '/locais', requiresOrganizer: true },
      { icon: Users2, label: 'Oficiais', path: '/pessoas', requiresOrganizer: true },
      { icon: Volleyball, label: 'Modalidades', path: '/modalidades', requiresOrganizer: true },
    ],
  },
  {
    id: 'documentos',
    label: 'Documentos Oficiais',
    items: [
      { icon: BarChart3, label: 'Estatísticas', path: '/estatisticas', requiresOrganizer: true },
      { icon: FileSpreadsheet, label: 'Relatórios', path: '/relatorios', requiresOrganizer: true },
      { icon: FileEdit, label: 'Editor de Súmulas', path: '/documentos/editor', requiresOrganizer: true },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { icon: Settings, label: 'Configurações', path: '/configuracoes', requiresOrganizer: true },
      { icon: HelpCircle, label: 'Central de Ajuda', path: '/ajuda' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Item de navegação
// ─────────────────────────────────────────────────────────────────────────────

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function SidebarNavItem({ item, isActive, collapsed }: NavItemProps) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.path}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar group',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4 shrink-0',
            isActive
              ? 'text-sidebar-primary-foreground'
              : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground',
          )}
          aria-hidden="true"
        />
        {!collapsed && (
          <span className="truncate">{item.label}</span>
        )}
      </Link>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const isOrganizer =
    session?.user?.role === 'organizer' || session?.user?.role === 'admin';

  /** Determina se um item está ativo — usa startsWith para suportar subrotas */
  const isItemActive = (path: string): boolean => {
    if (path === '/competicoes-ativas' || path === '/') {
      return (
        location.pathname === '/competicoes-ativas' ||
        location.pathname === '/'
      );
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 transition-[width] duration-200 ease-out',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
      aria-label="Navegação principal"
    >
      {/* ── Logo / Branding ── */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link
          to="/competicoes-ativas"
          className={cn('flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md', collapsed && 'justify-center w-full')}
          aria-label="BaseOS — Ir para Competições Ativas"
        >
          <BaseOsLogo size="md" showText={!collapsed} showSubtitle={!collapsed} />
        </Link>
      </div>

      {/* ── Navegação por grupos ── */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3" aria-label="Menu de navegação">
        {NAV_GROUPS.map((group) => {
          // Filtra itens de acordo com o papel do usuário
          const visibleItems = group.items.filter(
            (item) => !item.requiresOrganizer || isOrganizer,
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id} className="mb-4 px-2">
              {/* Label do grupo — oculto quando colapsado, visível para leitores de tela */}
              {!collapsed ? (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 select-none">
                  {group.label}
                </p>
              ) : (
                <div className="mb-1 border-t border-sidebar-border/50 mx-1" aria-hidden="true" />
              )}
              <ul className="space-y-0.5" role="list">
                {visibleItems.map((item) => (
                  <SidebarNavItem
                    key={item.path}
                    item={item}
                    isActive={isItemActive(item.path)}
                    collapsed={collapsed}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── Usuário e Logout ── */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        {session ? (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 py-1.5">
                <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                  {session.user.name}
                </p>
                <p className="text-[10px] text-sidebar-foreground/50 leading-tight mt-0.5">
                  {ROLE_LABELS[session.user.role]}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'sm'}
              onClick={handleSignOut}
              title={collapsed ? 'Sair da conta' : undefined}
              aria-label="Sair da conta"
              className={cn(
                'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed ? 'w-full h-9 rounded-lg' : 'w-full justify-start gap-2 h-8 rounded-lg text-xs',
              )}
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Sair</span>}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={() => navigate('/login')}
            title={collapsed ? 'Entrar' : undefined}
            aria-label="Entrar na conta"
            className={cn(
              'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
              collapsed ? 'w-full h-9 rounded-lg' : 'w-full justify-start gap-2 h-8 rounded-lg text-xs',
            )}
          >
            <UserRound className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Entrar</span>}
          </Button>
        )}
      </div>

      {/* ── Toggle Collapse ── */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-expanded={!collapsed}
          className="w-full h-8 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </aside>
  );
}

/** Largura da sidebar em estado expandido — usada pelo MainLayout para calcular margin-left */
export const SIDEBAR_WIDTH = 240;
/** Largura da sidebar em estado colapsado */
export const SIDEBAR_COLLAPSED_WIDTH = 72;
