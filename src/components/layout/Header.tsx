import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
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
  PenLine,
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

export const GLOBAL_MENU_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Competições', path: '/competicoes', aliases: ['/competitions'], icon: Trophy },
  { label: 'Partidas', path: '/jogos', aliases: ['/matches'], icon: Volleyball },
  { label: 'Equipes', path: '/equipes', aliases: ['/teams'], icon: Users },
  { label: 'Locais', path: '/locais', aliases: ['/venues'], icon: Building2 },
  { label: 'Pessoas', path: '/pessoas', aliases: ['/athletes', '/referees', '/arbitros'], icon: Users2 },
  { label: 'Relatórios', path: '/relatorios', aliases: ['/reports'], icon: FileSpreadsheet },
  { label: 'Configurações', path: '/configuracoes', aliases: ['/settings'], icon: Settings },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [blankSheetOpen, setBlankSheetOpen] = useState(false);

  const isCurrentActive = (item: (typeof GLOBAL_MENU_ITEMS)[0]) => {
    if (item.path === '/') return location.pathname === '/';
    if (location.pathname.startsWith(item.path)) return true;
    if (item.aliases?.some(alias => location.pathname.startsWith(alias))) return true;
    return false;
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
              <Link to="/" className="flex items-center gap-2.5 group">
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
            <nav className="hidden xl:flex items-center gap-0.5">
              {GLOBAL_MENU_ITEMS.map(item => {
                const active = isCurrentActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                      active
                        ? 'bg-primary/10 text-primary font-bold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <PwaInstallButton
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex text-xs h-9 px-2.5 text-muted-foreground hover:text-foreground"
                showText={false}
              />

              <Button
                variant="outline"
                size="sm"
                className="hidden lg:inline-flex gap-1.5 text-xs h-9 px-2.5"
                onClick={() => setBlankSheetOpen(true)}
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Súmula em Branco</span>
              </Button>

              <NotificationsMenu />

              <Button
                variant="accent"
                size="sm"
                className="gap-1.5 text-xs h-9 px-3 hidden sm:inline-flex"
                onClick={() => navigate('/competicoes?new=1')}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Competição</span>
              </Button>

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
                  <DropdownMenuContent align="end" className="w-56">
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
                      Configurações do Sistema
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
                className="xl:hidden h-9 w-9 rounded-xl"
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
          <div className="xl:hidden border-t border-border bg-card px-4 pt-3 pb-5 space-y-1 shadow-xl animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-1 pb-2 mb-2 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setMobileMenuOpen(false); setBlankSheetOpen(true); }}
                className="text-xs gap-1.5 justify-start"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                Súmula em Branco
              </Button>
              <PwaInstallButton
                variant="outline"
                size="sm"
                className="text-xs justify-start"
              />
            </div>

            {GLOBAL_MENU_ITEMS.map(item => {
              const active = isCurrentActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-3 border-t border-border mt-3">
              <Button
                variant="accent"
                size="sm"
                className="w-full justify-center gap-2 text-xs font-semibold"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/competicoes?new=1');
                }}
              >
                <Plus className="w-4 h-4" />
                Nova Competição
              </Button>
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
