// TeamPortalGuard — Guarda de rota exclusiva para o Portal da Equipe (/portal/equipe)
// Garante autenticação de role='team', resolução de memberships da Fase 11 e contexto seguro.

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { dataAccess } from '@/services/dataAccess';
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback';
import { TeamContext } from './useTeamPortal';
import { TeamContextService, type UserAvailableTeamContext } from '@/services/teamContextService';
import type { CompetitionTeam } from '@/types/registration';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

interface TeamPortalGuardProps {
  children: ReactNode;
}

export function TeamPortalGuard({ children }: TeamPortalGuardProps) {
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();

  const [availableTeams, setAvailableTeams] = useState<UserAvailableTeamContext[]>([]);
  const [activeTeamContext, setActiveTeamContextState] = useState<UserAvailableTeamContext | null>(null);
  const [team, setTeam] = useState<CompetitionTeam | null>(null);
  const [teamRecord, setTeamRecord] = useState<TeamRecord | null>(null);
  const [competition, setCompetition] = useState<CompetitionRecord | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!session?.user) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setError(null);

    try {
      // 1. Resolve equipes disponíveis através de memberships ativas e fallback legado
      const teams = await TeamContextService.getUserAvailableTeams(session.user);
      if (teams.length === 0) {
        setError('Equipe não encontrada ou desvinculada.');
        setDataLoading(false);
        return;
      }

      setAvailableTeams(teams);

      // 2. Resolve equipe ativa segura
      const active = TeamContextService.getActiveTeamContext(session.user.id, teams);
      if (!active) {
        setError('Nenhuma equipe ativa selecionada.');
        setDataLoading(false);
        return;
      }

      setActiveTeamContextState(active);

      // 3. Carrega entidades esportivas da equipe ativa
      const ct = await dataAccess.getCompetitionTeamById(active.competitionTeamId);
      if (!ct) {
        setError('Equipe não encontrada ou desvinculada.');
        setDataLoading(false);
        return;
      }
      setTeam(ct);

      const [allTeams, comp] = await Promise.all([
        dataAccess.listTeams(),
        dataAccess.getCompetition(ct.competitionId),
      ]);
      const tr = allTeams.find((t) => t.id === ct.teamId) || null;
      setTeamRecord(tr);
      setCompetition(comp);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar dados da equipe.';
      setError(msg);
    } finally {
      setDataLoading(false);
    }
  }, [session?.user]);

  const switchTeam = useCallback(
    async (targetCompetitionTeamId: string) => {
      if (!session?.user?.id) return;
      try {
        const selected = TeamContextService.setActiveTeamContext(
          session.user.id,
          targetCompetitionTeamId,
          availableTeams
        );
        setActiveTeamContextState(selected);

        const ct = await dataAccess.getCompetitionTeamById(selected.competitionTeamId);
        if (!ct) return;
        setTeam(ct);

        const [allTeams, comp] = await Promise.all([
          dataAccess.listTeams(),
          dataAccess.getCompetition(ct.competitionId),
        ]);
        setTeamRecord(allTeams.find((t) => t.id === ct.teamId) || null);
        setCompetition(comp);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Não foi possível alternar de equipe.';
        setError(msg);
      }
    },
    [session?.user?.id, availableTeams]
  );

  useEffect(() => {
    if (session?.user?.role === 'team') {
      loadData();
    }
  }, [session?.user?.role, loadData]);

  if (authLoading) {
    return <RouteLoadingFallback />;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const role = session.user.role;

  // Redireciona perfis administrativos ou de arbitragem para seus sistemas correspondentes
  if (role === 'admin' || role === 'organizer') {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === 'referee' || role === 'scorer') {
    return <Navigate to="/jogos" replace />;
  }

  if (role !== 'team') {
    return <Navigate to="/login" replace />;
  }

  if (dataLoading) {
    return <RouteLoadingFallback />;
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-card border border-border rounded-lg text-center space-y-4">
          <h2 className="text-lg font-semibold text-destructive">Contexto de Equipe Indisponível</h2>
          <p className="text-sm text-muted-foreground">{error || 'Não foi possível carregar a equipe vinculada.'}</p>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <TeamContext.Provider
      value={{
        team,
        teamRecord,
        competition,
        loading: dataLoading,
        refresh: loadData,
        availableTeams,
        activeTeamContext,
        switchTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
