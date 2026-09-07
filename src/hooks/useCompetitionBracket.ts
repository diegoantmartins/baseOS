/**
 * useCompetitionBracket.ts — Hook Desacoplado de Ciclo de Dados do Chaveamento (Fase 4.9)
 *
 * Responsabilidades:
 * - Carregamento paralelo e isolado de stages, rounds, slots, matches e teams
 * - Invocação da função pura CompetitionBracketViewModelBuilder.build
 * - Atualização determinística pós-finalização de partida (refetch)
 * - Operação de recuperação segura (reprocessRuntime) via CompetitionRuntimeService
 * - Isolação completa de páginas como CompetitionsPage e MatchesPage de detalhes de banco
 */

import { useCallback, useEffect, useState } from 'react';
import { dataAccess } from '@/services/dataAccess';
import {
  CompetitionBracketViewModelBuilder,
  type CompetitionBracketViewModel,
} from '@/services/competitionBracketViewModel';
import { CompetitionRuntimeService } from '@/services/competitionRuntimeService';

export interface UseCompetitionBracketResult {
  viewModel: CompetitionBracketViewModel | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  reprocessRuntime: () => Promise<{ ok: boolean; message?: string }>;
}

export function useCompetitionBracket(competitionId?: string | null): UseCompetitionBracketResult {
  const [viewModel, setViewModel] = useState<CompetitionBracketViewModel | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(competitionId));
  const [error, setError] = useState<string | null>(null);

  const fetchBracketData = useCallback(async () => {
    if (!competitionId) {
      setViewModel(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [competition, stages, rounds, slots, allMatches, teams] = await Promise.all([
        dataAccess.getCompetition(competitionId),
        dataAccess.listStages(competitionId).catch(() => []),
        dataAccess.listRounds(competitionId).catch(() => []),
        dataAccess.listMatchSlots(competitionId).catch(() => []),
        dataAccess.listMatches().catch(() => []),
        dataAccess.listTeams().catch(() => []),
      ]);

      if (!competition) {
        setError('Competição não encontrada');
        setViewModel(null);
        return;
      }

      const compMatches = allMatches.filter((m) => m.competitionId === competitionId);

      const vm = CompetitionBracketViewModelBuilder.build({
        competition,
        stages,
        rounds,
        slots,
        matches: compMatches,
        teams,
      });

      setViewModel(vm);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar chaveamento da competição';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    fetchBracketData();
  }, [fetchBracketData]);

  /**
   * Operação controlada de recuperação/reconciliação pós-queda.
   * Não cria partidas na UI: invoca CompetitionRuntimeService.reconcileCompetitionRuntime.
   */
  const reprocessRuntime = useCallback(async () => {
    if (!competitionId) return { ok: false, message: 'Nenhuma competição selecionada' };

    try {
      setLoading(true);
      const res = await CompetitionRuntimeService.reconcileCompetitionRuntime(competitionId);
      await fetchBracketData();
      return {
        ok: true,
        message: `Reconciliação concluída: ${res.materializedMatches.length} partidas materializadas, ${res.resolvedSlots} slots resolvidos.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na reconciliação do runtime';
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [competitionId, fetchBracketData]);

  return {
    viewModel,
    loading,
    error,
    refetch: fetchBracketData,
    reprocessRuntime,
  };
}
