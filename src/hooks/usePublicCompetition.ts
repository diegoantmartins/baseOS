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
  updatePublicMatchInCache,
  type PublicCompetitionBundle,
  type PublicMatchDTO,
} from '@/services/publicCompetitionService';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

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

interface RealtimeMatchPayload {
  id: string;
  court?: string;
  status?: string;
  scheduled_time?: string;
  winner_id?: string;
}

  // Supabase Realtime: Atualização cirúrgica via WebSocket sem SELECT completo
  useEffect(() => {
    if (!competitionId || !isSupabaseConfigured()) return;

    let isMounted = true;
    let subscriptionChannel: { unsubscribe: () => void } | null = null;

    (async () => {
      const supabase = await getSupabaseClient();
      if (!supabase || !isMounted) return;

      const channelName = `realtime-public-matches-${competitionId}`;
      subscriptionChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `competition_id=eq.${competitionId}`,
          },
          (payload) => {
            const newRow = payload.new as RealtimeMatchPayload | null;
            if (!newRow || !newRow.id) return;

            // Atualização cirúrgica do cache do React Query em memória
            queryClient.setQueryData(
              ['public-competition-bundle', normalizedSlug],
              (prevBundle: PublicCompetitionBundle | null | undefined) => {
                if (!prevBundle) return prevBundle;

                const updatedMatches = prevBundle.matches.map((m) => {
                  if (m.id === newRow.id) {
                    const partialMatch: Partial<PublicMatchDTO> = {
                      court: newRow.court ?? m.court,
                      status: newRow.status ?? m.status,
                      scheduledTime: newRow.scheduled_time ?? m.scheduledTime,
                      winnerId: newRow.winner_id ?? m.winnerId,
                      isCompleted: newRow.status === 'completed' || newRow.status === 'homologated',
                      isHomologated: newRow.status === 'homologated',
                    };
                    return { ...m, ...partialMatch };
                  }
                  return m;
                });

                return {
                  ...prevBundle,
                  matches: updatedMatches,
                };
              }
            );

            // Sincroniza também o cache estático em memória do serviço
            updatePublicMatchInCache(newRow.id, {
              court: newRow.court,
              status: newRow.status,
              scheduledTime: newRow.scheduled_time,
              winnerId: newRow.winner_id,
            });
          }
        )
        .subscribe();
    })();

    return () => {
      isMounted = false;
      if (subscriptionChannel) {
        subscriptionChannel.unsubscribe();
      }
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
