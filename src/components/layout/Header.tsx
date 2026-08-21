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

export const CADASTROS_SUBMENU = [
  { label: 'Competições', path: '/competicoes', icon: Trophy, description: 'Gerenciar campeonatos e fases' },
  { label: 'Equipes', path: '/equipes', icon: Users, description: 'Clubes, agremiações e elencos' },
  { label: 'Atletas', path: '/atletas', icon: UserCheck, description: 'Cadastro e documentos dos atletas' },
  { label: 'Locais & Ginásios', path: '/locais', icon: Building2, description: 'Praças esportivas e quadras' },
  { label: 'Árbitros & Oficiais', path: '/arbitros', icon: Users2, description: 'Quadro de arbitragem e apontadores' },
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
      <header className="sticky top-0 z-40 w-full bg-card/95 backdrop-blur border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/competicoes-ativas" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md transition-transform group-hover:scale-105">
                  <Volleyball className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-foreground text-base sm:text-lg leading-tight tracking-tight">
                    VolleyPro
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-primary tracking-wider">
                    Competições CBV/FPV
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* 1. Competições Ativas */}
              <Link
                to="/competicoes-ativas"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive('/competicoes-ativas')
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <Flame className={cn('w-3.5 h-3.5', isActive('/competicoes-ativas') ? 'text-primary' : 'text-muted-foreground')} />
                Competições Ativas
              </Link>

              {/* 2. Menu Dropdown Cadastros */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 h-auto',
                      isCadastrosActive
                        ? 'bg-primary/10 text-primary font-bold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    )}
                  >
                    <FolderEdit className={cn('w-3.5 h-3.5', isCadastrosActive ? 'text-primary' : 'text-muted-foreground')} />
                    <span>Cadastros</span>
                    <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-2 shadow-xl border-border">
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
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
                          'flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors',
                          isSubActive ? 'bg-primary/10 text-primary font-semibold' : '',
                        )}
                      >
                        <div className={cn('p-1.5 rounded-md bg-muted text-muted-foreground mt-0.5', isSubActive && 'bg-primary text-primary-foreground')}>
                          <SubIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-medium leading-none">{sub.label}</div>
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
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive('/jogos')
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <Volleyball className={cn('w-3.5 h-3.5', isActive('/jogos') ? 'text-primary' : 'text-muted-foreground')} />
                Partidas
              </Link>

              {/* 4. Relatórios */}
              <Link
                to="/relatorios"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive('/relatorios')
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <FileSpreadsheet className={cn('w-3.5 h-3.5', isActive('/relatorios') ? 'text-primary' : 'text-muted-foreground')} />
                Relatórios
              </Link>

              {/* 5. Configurações */}
              <Link
                to="/configuracoes"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive('/configuracoes')
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <Settings className={cn('w-3.5 h-3.5', isActive('/configuracoes') ? 'text-primary' : 'text-muted-foreground')} />
                Configurações
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <PwaInstallButton
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex text-xs h-9 px-2.5 text-muted-foreground hover:text-foreground"
                showText={false}
              />

              <NotificationsMenu />

              {session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 pl-1.5 pr-2.5 py-1 h-9 rounded-full border border-border/60 hover:bg-muted">
                      <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                        {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="text-left hidden md:block">
                        <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[100px]">
                          {session.user.name}
                        </p>
                        <p className="text-[9px] text-muted-foreground leading-none mt-0.5">
                          {ROLE_LABELS[session.user.role]}
                        </p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 shadow-xl border-border">
                    <DropdownMenuLabel>
                      <p className="text-sm font-semibold">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground font-normal">{session.user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setBlankSheetOpen(true)}>
                      <FileText className="w-4 h-4 mr-2 text-primary" />
                      Emitir Súmula em Branco
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações & Usuários
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair da Conta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="gap-1.5 text-xs h-9">
                  <User className="w-3.5 h-3.5" />
                  <span>Entrar</span>
                </Button>
              )}

              {/* Mobile Hamburger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 rounded-xl"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card px-4 pt-3 pb-5 space-y-3 shadow-xl animate-in slide-in-from-top-2">
            {/* Seção 1: Geral */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">Geral</div>
              <Link
                to="/competicoes-ativas"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium',
                  isActive('/competicoes-ativas') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Flame className="w-4 h-4 text-primary" />
                Competições Ativas
              </Link>
              <Link
                to="/jogos"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium',
                  isActive('/jogos') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Volleyball className="w-4 h-4" />
                Partidas & Súmulas
              </Link>
            </div>

            {/* Seção 2: Cadastros */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">Cadastros</div>
              {CADASTROS_SUBMENU.map(sub => {
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.path}
                    to={sub.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium',
                      location.pathname.startsWith(sub.path) ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <SubIcon className="w-4 h-4" />
                    {sub.label}
                  </Link>
                );
              })}
            </div>

            {/* Seção 3: Documentos & Sistema */}
            <div className="space-y-1 border-t pt-2">
              <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">Documentos & Sistema</div>
              <Link
                to="/relatorios"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium',
                  isActive('/relatorios') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Relatórios
              </Link>
              <Link
                to="/configuracoes"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium',
                  isActive('/configuracoes') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Settings className="w-4 h-4" />
                Configurações & Usuários
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
