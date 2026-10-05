// TeamPortalLayout — Shell exclusivo do Portal da Equipe
// Fornece navegação contextualizada (Início, Elenco, Jogos, Classificação, Avisos) sem elementos administrativos globais.

import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  Bell,
  LogOut,
  Shield,
  Volleyball,
} from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { useTeamPortal } from './useTeamPortal';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeamPortalLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { path: '/portal/equipe', label: 'Início', icon: LayoutDashboard, end: true },
  { path: '/portal/equipe/elenco', label: 'Meu Elenco', icon: Users },
  { path: '/portal/equipe/jogos', label: 'Jogos', icon: Calendar },
  { path: '/portal/equipe/classificacao', label: 'Classificação', icon: Trophy },
  { path: '/portal/equipe/avisos', label: 'Avisos', icon: Bell },
];

export function TeamPortalLayout({ children }: TeamPortalLayoutProps) {
  const { signOut, session } = useAuth();
  const { team, competition, availableTeams, switchTeam } = useTeamPortal();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Lado Esquerdo: Identidade do Sistema e Organização */}
            <div className="flex items-center gap-3">
              <BaseOsLogo size="sm" showSubtitle={false} />
              <div className="hidden sm:block h-4 w-[1px] bg-border" />
              <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
                PORTAL DA EQUIPE
              </Badge>
            </div>

            {/* Centro: Nome da Equipe e Competição / Seletor de Equipe */}
            <div className="flex items-center gap-2 max-w-[200px] sm:max-w-md truncate">
              {availableTeams && availableTeams.length > 1 ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800">
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                  <select
                    value={team.id}
                    onChange={(e) => switchTeam && switchTeam(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                    aria-label="Alternar equipe ativa"
                  >
                    {availableTeams.map((t) => (
                      <option key={t.competitionTeamId} value={t.competitionTeamId} className="bg-zinc-900 text-foreground">
                        {t.teamName} ({t.teamShortName})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800">
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {team.teamName}
                  </span>
                </div>
              )}
              {competition && (
                <span className="hidden md:inline-block text-xs text-muted-foreground truncate">
                  • {competition.name}
                </span>
              )}
            </div>

            {/* Lado Direito: Perfil e Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-medium text-foreground">{session?.user.name}</span>
                <span className="text-[10px] text-muted-foreground">{session?.user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-zinc-800"
                title="Encerrar sessão"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Sub-Header: Navegação por Abas */}
        <div className="border-t border-border/50 bg-card/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none" aria-label="Navegação da Equipe">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/60'
                      )
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer minimalista */}
      <footer className="border-t border-border/40 py-3 text-center text-[11px] text-muted-foreground">
        <span>BaseOS VolleyPro &bull; Painel Exclusivo de Gestão da Equipe</span>
      </footer>
    </div>
  );
}
