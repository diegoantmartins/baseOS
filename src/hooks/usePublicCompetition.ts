/**
 * BaseOS — usePublicCompetition & usePublicMatches Hook
 * 
 * Camada de cache reativo (SWR / React Query) e sincronização em tempo real (Supabase Realtime)
 * para o Portal Público e torcedores ao vivo.
 * 
 * Performance & Blindagem para 50+ conexões simultâneas:
 * 1. staleTime de 15 segundos: deduplica chamadas redundantes em rajada
 * 2. refetchInterval de 30 segundos: polling de segurança para dados agregados
 * 3. Supabase Realtime WebSocket: atualizações imediatas de status/placar sem SELECT completo
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  publicCompetitionService,
  type PublicCompetitionBundle,
  type PublicMatchDTO,
} from '@/services/publicCompetitionService';
import { subscribeToMatchUpdates, showMatchHomologatedToast } from '@/services/realtimeMatchService';

export interface UsePublicCompetitionOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

export function usePublicCompetition(
  slug?: string,
  options?: UsePublicCompetitionOptions
) {
  const queryClient = useQueryClient();
  const normalizedSlug = slug?.trim() || '';

  const query = useQuery<PublicCompetitionBundle | null>({
    queryKey: ['public-competition-bundle', normalizedSlug],
    queryFn: () => {
      if (!normalizedSlug) return Promise.resolve(null);
      return publicCompetitionService.getPublicCompetitionBundle(normalizedSlug);
    },
    enabled: Boolean(normalizedSlug) && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 15_000, // 15 segundos
    refetchInterval: options?.refetchInterval ?? 30_000, // 30 segundos
    refetchOnWindowFocus: false,
  });

  const competitionId = query.data?.competition.id;

  // Supabase Realtime & Eventos Locais: Atualização cirúrgica e transmissão de homologação
  useEffect(() => {
    if (!competitionId) return;

    // Escuta tanto eventos locais (mesma aba/janela) quanto remotos (WebSocket)
    const unsubscribe = subscribeToMatchUpdates(
      competitionId,
      (payload) => {
        showMatchHomologatedToast(payload);
        // Invalida e força refetch imediato para atualizar classificação e dados do MVP
        queryClient.invalidateQueries({ queryKey: ['public-competition-bundle', normalizedSlug] });
      },
      (matchId) => {
        queryClient.invalidateQueries({ queryKey: ['public-competition-bundle', normalizedSlug] });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [competitionId, normalizedSlug, queryClient]);

  return {
    ...query,
    bundle: query.data,
  };
}

export function usePublicMatches(
  slug?: string,
  options?: UsePublicCompetitionOptions
) {
  const { bundle, isLoading, isError, refetch } = usePublicCompetition(slug, options);

  return {
    matches: bundle?.matches ?? [],
    competition: bundle?.competition,
    isLoading,
    isError,
    refetch,
  };
}
