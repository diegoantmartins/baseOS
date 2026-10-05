// TeamContextRedirector.tsx — Resolve o contexto canônico da equipe (/equipe -> /equipe/:token)
// Consolidação da Fase 11 (Identidade e Contexto Multi-Equipe) preservando o Gate 2A.3.
// Não expõe nem loga tokens de acesso.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, LogOut, Shield, ChevronRight } from 'lucide-react';
import { TeamContextService, type UserAvailableTeamContext } from '@/services/teamContextService';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';

export function TeamContextRedirector() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [availableTeams, setAvailableTeams] = useState<UserAvailableTeamContext[]>([]);

  useEffect(() => {
    let active = true;

    async function resolveTeamContext() {
      if (loading) return;

      // 1. Usuário anônimo/não autenticado -> Redireciona para /login
      if (!session) {
        navigate('/login', { replace: true, state: { from: '/equipe' } });
        return;
      }

      // 2. Perfis administrativos/operacionais -> Redireciona para sua área própria
      if (session.user.role === 'admin' || session.user.role === 'organizer') {
        navigate('/competicoes-ativas', { replace: true });
        return;
      }

      if (session.user.role === 'referee' || session.user.role === 'scorer') {
        navigate('/jogos', { replace: true });
        return;
      }

      if (session.user.role !== 'team') {
        navigate('/login', { replace: true });
        return;
      }

      // 3. Usuário com role='team': busca equipes disponíveis via TeamContextService
      try {
        const teams = await TeamContextService.getUserAvailableTeams(session.user);
        if (!active) return;

        if (teams.length === 0) {
          setError('Sua conta de representante não possui uma equipe vinculada no sistema.');
          setResolving(false);
          return;
        }

        if (teams.length === 1) {
          // Exatamente uma equipe: redireciona direto para o portal canônico
          TeamContextService.setActiveTeamContext(session.user.id, teams[0].competitionTeamId, teams);
          navigate(`/equipe/${teams[0].accessToken}`, { replace: true });
          return;
        }

        // Múltiplas equipes: exibe seletor de contexto
        setAvailableTeams(teams);
        setResolving(false);
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Falha ao buscar dados da equipe.';
        setError(msg);
        setResolving(false);
      }
    }

    resolveTeamContext();

    return () => {
      active = false;
    };
  }, [session, loading, navigate]);

  const handleSelectTeam = (target: UserAvailableTeamContext) => {
    if (!session) return;
    TeamContextService.setActiveTeamContext(session.user.id, target.competitionTeamId, availableTeams);
    navigate(`/equipe/${target.accessToken}`, { replace: true });
  };

  if (loading || resolving) {
    return <RouteLoadingFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border bg-card">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <CardTitle className="text-base font-semibold text-foreground">
              Acesso à Equipe Indisponível
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-xs text-muted-foreground">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut().then(() => navigate('/login', { replace: true }))}
                className="text-xs gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair da conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Seletor de Equipe Ativa (quando usuário possui múltiplas memberships)
  if (availableTeams.length > 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-border bg-card shadow-lg">
          <CardHeader className="text-center pb-3">
            <div className="flex justify-center mb-2">
              <BaseOsLogo size="sm" showSubtitle={false} />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
                PORTAL DA EQUIPE
              </Badge>
            </div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Selecione a Equipe
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Sua conta possui vínculo ativo com mais de uma equipe. Selecione qual deseja gerenciar:
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {availableTeams.map((t) => (
                <button
                  key={t.competitionTeamId}
                  onClick={() => handleSelectTeam(t)}
                  className="w-full flex items-center justify-between p-3.5 rounded-lg border border-border bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-amber-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-primary shrink-0 group-hover:border-amber-500/50">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground group-hover:text-amber-400 transition-colors">
                          {t.teamName}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {t.teamShortName}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {t.competitionName}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
              <span>{session?.user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut().then(() => navigate('/login', { replace: true }))}
                className="text-xs gap-1.5 h-7 px-2 hover:text-foreground"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair da conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
