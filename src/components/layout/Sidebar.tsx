import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCheck,
  Volleyball,
  ClipboardList,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Waves,
  Building2,
  LogOut,
  UserRound,
  FileSpreadsheet,
  Dices,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthContext';
import { ROLE_LABELS } from '@/types/auth';

const menuItems = [
  { icon: LayoutDashboard, label: 'Painel', path: '/competicoes-ativas' },
  { icon: Trophy, label: 'Competições', path: '/competicoes' },
  { icon: Calendar, label: 'Partidas', path: '/jogos' },
  { icon: ClipboardList, label: 'Súmulas', path: '/sumulas' },
  { icon: Users, label: 'Equipes', path: '/equipes' },
  { icon: UserCheck, label: 'Atletas', path: '/atletas' },
  { icon: Building2, label: 'Locais', path: '/locais' },
  { icon: Dices, label: 'Sorteio', path: '/sorteio' },
  { icon: Building2, label: 'Pessoas', path: '/pessoas' },
  { icon: BarChart3, label: 'Estatísticas', path: '/estatisticas' },
  { icon: FileSpreadsheet, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
  { icon: HelpCircle, label: 'Central de Ajuda', path: '/ajuda' },
];

/** Itens restritos ao perfil de organizador. */
const ORGANIZER_ONLY = new Set(['/competicoes', '/equipes', '/atletas', '/locais', '/sorteio', '/pessoas', '/estatisticas', '/relatorios', '/configuracoes', '/settings']);

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  const visibleItems = menuItems.filter(item => {
    if (!session) return true;
    return session.user.role === 'organizer' || !ORGANIZER_ONLY.has(item.path) || item.path === '/';
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="fixed left-0 top-0 h-screen bg-sidebar z-50 flex flex-col border-r border-sidebar-border"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Volleyball className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="font-display font-bold text-sidebar-foreground text-lg leading-tight">
                  VolleyPro
                </span>
                <span className="text-xs text-sidebar-foreground/60">
                  Sistema de Gestão
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive
                        ? 'text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                    )}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Quick Access */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 pt-6 border-t border-sidebar-border"
            >
              <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3">
                Acesso Rápido
              </p>
              <div className="space-y-2 px-3">
                <Button variant="indoor" size="sm" className="w-full justify-start gap-2">
                  <Volleyball className="w-4 h-4" />
                  Quadra
                </Button>
                <Button variant="beach" size="sm" className="w-full justify-start gap-2">
                  <Waves className="w-4 h-4" />
                  Praia
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Usuário e sair */}
      <div className="p-3 border-t border-sidebar-border">
        {session ? (
          <div className="space-y-2">
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-2"
                >
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">{session.user.name}</p>
                  <p className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[session.user.role]}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'default'}
                onClick={handleSignOut}
                className="flex-1 justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="w-4 h-4" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm"
                    >
                      Sair
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={() => navigate('/login')}
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <UserRound className="w-4 h-4" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm"
                >
                  Entrar
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-9 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
