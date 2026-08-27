/**
 * Header — Barra superior do BaseOS
 *
 * Após a Fase 1, o Header é simplificado:
 * - NAV DESKTOP REMOVIDA: a navegação principal agora fica na Sidebar lateral.
 * - O Header mantém: Logo (mobile only, porque desktop mostra o logo na Sidebar),
 *   ações de usuário (perfil, notificações, PWA install, ajuda), e o hamburguer
 *   mobile (que abre o BottomNav Sheet).
 *
 * Em desktop (lg+), o Header exibe apenas o logo compacto e as ações à direita.
 * Em mobile (< lg), exibe o logo completo + hambúrguer.
 *
 * Preservado integralmente:
 * - Autenticação (session, signOut)
 * - Perfil de usuário (nome, role, email no dropdown)
 * - BlankSheetEmitDialog (Emitir Súmula em Branco)
 * - NotificationsMenu
 * - PwaInstallButton
 * - Botão de ajuda
 * - Navegação mobile via BottomNav (Sheet separado)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings,
  LogOut,
  User,
  FileText,
  HelpCircle,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/useAuth';
import { ROLE_LABELS } from '@/types/auth';
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

export function Header() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [blankSheetOpen, setBlankSheetOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur-sm border-b border-border h-14 flex items-center">
        <div className="w-full px-4 sm:px-6 flex items-center justify-between gap-2">

          {/* Logo — visível apenas em mobile (lg+ mostra logo na Sidebar) */}
          <div className="lg:hidden flex items-center gap-2 shrink-0">
            <Link
              to="/competicoes-ativas"
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              aria-label="BaseOS — Ir para Competições Ativas"
            >
              <BaseOsLogo size="md" showSubtitle />
            </Link>
          </div>

          {/* Spacer — empurra ações para a direita em desktop */}
          <div className="hidden lg:block flex-1" />

          {/* ── Ações à direita ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Ajuda */}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 rounded-md"
              onClick={() => navigate('/ajuda')}
              aria-label="Abrir Central de Ajuda"
              title="Central de Ajuda e Guia Operacional"
            >
              <HelpCircle className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="hidden xl:inline-block ml-1 text-xs">Ajuda</span>
            </Button>

            {/* PWA Install */}
            <PwaInstallButton
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 rounded-md"
              showText={false}
            />

            {/* Notificações */}
            <NotificationsMenu />

            {/* Usuário autenticado */}
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 pl-1.5 pr-2.5 py-1 h-8 rounded-md border border-border hover:bg-zinc-800/60"
                    aria-label={`Menu do usuário: ${session.user.name}`}
                  >
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
                  <DropdownMenuItem
                    onClick={() => setBlankSheetOpen(true)}
                    className="text-xs rounded-md cursor-pointer hover:bg-zinc-800/60 focus:bg-zinc-800/80"
                  >
                    <FileText className="w-3.5 h-3.5 mr-2 text-zinc-400" aria-hidden="true" />
                    Emitir Súmula em Branco
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/ajuda')}
                    className="text-xs rounded-md cursor-pointer hover:bg-zinc-800/60 focus:bg-zinc-800/80"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-2 text-primary" aria-hidden="true" />
                    Central de Ajuda e Guia
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/configuracoes')}
                    className="text-xs rounded-md cursor-pointer hover:bg-zinc-800/60 focus:bg-zinc-800/80"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2 text-zinc-400" aria-hidden="true" />
                    Configurações e Usuários
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border my-1" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-xs rounded-md cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/15"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
                    Sair da Conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/login')}
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60"
              >
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Entrar</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Modal Global de Súmula em Branco */}
      <BlankSheetEmitDialog
        open={blankSheetOpen}
        onOpenChange={setBlankSheetOpen}
      />
    </>
  );
}
