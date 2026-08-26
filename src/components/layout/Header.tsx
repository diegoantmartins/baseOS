import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Volleyball,
  Building2,
  Users2,
  FileSpreadsheet,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Plus,
  Users,
  FileText,
  ChevronDown,
  FolderEdit,
  UserCheck,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthContext';
import { ROLE_LABELS } from '@/types/auth';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsMenu } from '@/components/pwa/NotificationsMenu';
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton';
import { BlankSheetEmitDialog } from '@/components/match/BlankSheetEmitDialog';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';

export const CADASTROS_SUBMENU = [
  { label: 'Competições', path: '/competicoes', icon: Trophy, description: 'Gerenciar campeonatos e fases' },
  { label: 'Equipes', path: '/equipes', icon: Users, description: 'Clubes, agremiações e elencos' },
  { label: 'Atletas', path: '/atletas', icon: UserCheck, description: 'Cadastro e documentos dos atletas' },
  { label: 'Locais e Ginásios', path: '/locais', icon: Building2, description: 'Praças esportivas e quadras' },
  { label: 'Árbitros e Oficiais', path: '/pessoas', icon: Users2, description: 'Quadro de arbitragem e apontadores' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [blankSheetOpen, setBlankSheetOpen] = useState(false);

  const isCadastrosActive = CADASTROS_SUBMENU.some(item => location.pathname.startsWith(item.path));
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/competicoes-ativas';
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Logo & Brand BaseOS */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/competicoes-ativas" className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                <BaseOsLogo size="md" showSubtitle />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* 1. Competições Ativas */}
              <Link
                to="/competicoes-ativas"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150',
                  isActive('/competicoes-ativas')
                    ? 'bg-zinc-800/80 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/50',
                )}
              >
                <Flame className={cn('w-3.5 h-3.5', isActive('/competicoes-ativas') ? 'text-primary' : 'text-zinc-400')} />
                Competições Ativas
              </Link>

              {/* 2. Menu Dropdown Cadastros */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 h-auto',
                      isCadastrosActive
                        ? 'bg-zinc-800/80 text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/50',
                    )}
                  >
                    <FolderEdit className={cn('w-3.5 h-3.5', isCadastrosActive ? 'text-primary' : 'text-zinc-400')} />
                    <span>Cadastros</span>
                    <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1.5 bg-zinc-900 border-border shadow-none rounded-lg">
                  <DropdownMenuLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground px-2 py-1">
                    Módulos de Cadastro
                  </DropdownMenuLabel>
                  {CADASTROS_SUBMENU.map(sub => {
                    const SubIcon = sub.icon;
                    const isSubActive = location.pathname.startsWith(sub.path);
                    return (
                      <DropdownMenuItem
                        key={sub.path}
                        onClick={() => navigate(sub.path)}
                        className={cn(
                          'flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors hover:bg-zinc-800/60 focus:bg-zinc-800/80',
                          isSubActive ? 'bg-zinc-800 text-foreground font-medium' : '',
                        )}
                      >
                        <div className={cn('p-1.5 rounded bg-zinc-800 text-zinc-400 mt-0.5 shrink-0', isSubActive && 'bg-zinc-700 text-zinc-200')}>
                          <SubIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-medium leading-none text-foreground">{sub.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub.description}</div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3. Partidas */}
              <Link
                to="/jogos"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150',
                  isActive('/jogos')
                    ? 'bg-zinc-800/80 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/50',
                )}
              >
                <Volleyball className={cn('w-3.5 h-3.5', isActive('/jogos') ? 'text-primary' : 'text-zinc-400')} />
                Partidas
              </Link>

              {/* 4. Relatórios */}
              <Link
                to="/relatorios"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150',
                  isActive('/relatorios')
                    ? 'bg-zinc-800/80 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/50',
                )}
              >
                <FileSpreadsheet className={cn('w-3.5 h-3.5', isActive('/relatorios') ? 'text-primary' : 'text-zinc-400')} />
                Relatórios
              </Link>

              {/* 5. Configurações */}
              <Link
                to="/configuracoes"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150',
                  isActive('/configuracoes')
                    ? 'bg-zinc-800/80 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/50',
                )}
              >
                <Settings className={cn('w-3.5 h-3.5', isActive('/configuracoes') ? 'text-primary' : 'text-zinc-400')} />
                Configurações
              </Link>

              {/* 6. Central de Ajuda */}
              <Link
                to="/ajuda"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150',
                  isActive('/ajuda')
                    ? 'bg-zinc-800/80 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/50',
                )}
              >
                <HelpCircle className={cn('w-3.5 h-3.5', isActive('/ajuda') ? 'text-primary' : 'text-zinc-400')} />
                Ajuda
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 rounded-md"
                onClick={() => navigate('/ajuda')}
                title="Abrir Central de Ajuda e Guia Operacional"
              >
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="hidden xl:inline-block ml-1 text-xs">Ajuda</span>
              </Button>

              <PwaInstallButton
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 rounded-md"
                showText={false}
              />

              <NotificationsMenu />

              {session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 pl-1.5 pr-2.5 py-1 h-8 rounded-md border border-border hover:bg-zinc-800/60">
                      <div className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center justify-center font-medium text-[11px]">
                        {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="text-left hidden md:block">
                        <p className="text-xs font-medium text-foreground leading-none truncate max-w-[100px]">
                          {session.user.name}
                        </p>
                        <p className="text-[9px] text-muted-foreground leading-none mt-0.5">
                          {ROLE_LABELS[session.user.role]}
                        </p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1.5 bg-zinc-900 border-border shadow-none rounded-lg">
                    <DropdownMenuLabel className="px-2 py-1.5">
                      <p className="text-xs font-semibold text-foreground">{session.user.name}</p>
                      <p className="text-[11px] text-muted-foreground font-normal truncate">{session.user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border my-1" />
                    <DropdownMenuItem onClick={() => setBlankSheetOpen(true)} className="text-xs rounded-md cursor-pointer hover:bg-zinc-800/60 focus:bg-zinc-800/80">
                      <FileText className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                      Emitir Súmula em Branco
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/ajuda')} className="text-xs rounded-md cursor-pointer hover:bg-zinc-800/60 focus:bg-zinc-800/80">
                      <HelpCircle className="w-3.5 h-3.5 mr-2 text-primary" />
                      Central de Ajuda e Guia
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="text-xs rounded-md cursor-pointer hover:bg-zinc-800/60 focus:bg-zinc-800/80">
                      <Settings className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                      Configurações e Usuários
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border my-1" />
                    <DropdownMenuItem onClick={handleSignOut} className="text-xs rounded-md cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/15">
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Sair da Conta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60">
                  <User className="w-3.5 h-3.5" />
                  <span>Entrar</span>
                </Button>
              )}

              {/* Mobile Hamburger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 rounded-md hover:bg-zinc-800/60"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-zinc-950 px-4 pt-3 pb-5 space-y-3">
            {/* Seção 1: Geral */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground px-2 py-1">Geral</div>
              <Link
                to="/competicoes-ativas"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium',
                  isActive('/competicoes-ativas') ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:bg-zinc-900',
                )}
              >
                <Flame className="w-3.5 h-3.5 text-primary" />
                Competições Ativas
              </Link>
              <Link
                to="/jogos"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium',
                  isActive('/jogos') ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:bg-zinc-900',
                )}
              >
                <Volleyball className="w-3.5 h-3.5 text-zinc-400" />
                Partidas e Súmulas
              </Link>
            </div>

            {/* Seção 2: Cadastros */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground px-2 py-1">Cadastros</div>
              {CADASTROS_SUBMENU.map(sub => {
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.path}
                    to={sub.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium',
                      location.pathname.startsWith(sub.path) ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:bg-zinc-900',
                    )}
                  >
                    <SubIcon className="w-3.5 h-3.5 text-zinc-400" />
                    {sub.label}
                  </Link>
                );
              })}
            </div>

            {/* Seção 3: Documentos e Sistema */}
            <div className="space-y-1 border-t border-border pt-2">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground px-2 py-1">Documentos e Sistema</div>
              <Link
                to="/relatorios"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium',
                  isActive('/relatorios') ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:bg-zinc-900',
                )}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                Relatórios
              </Link>
              <Link
                to="/configuracoes"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium',
                  isActive('/configuracoes') ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:bg-zinc-900',
                )}
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                Configurações e Usuários
              </Link>
              <Link
                to="/ajuda"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium',
                  isActive('/ajuda') ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:bg-zinc-900',
                )}
              >
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                Central de Ajuda e Guia
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Modal Global de Súmula em Branco */}
      <BlankSheetEmitDialog
        open={blankSheetOpen}
        onOpenChange={setBlankSheetOpen}
      />
    </>
  );
}
