/**
 * BaseOS — Realtime Match Service
 * 
 * Centraliza a comunicação em tempo real de partidas, homologações,
 * eleição de MVP e alertas aos utilizadores conectados (Portal da Equipe, Admin e Portal Público).
 */

import { toast } from 'sonner';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { MatchRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

export interface MatchHomologationPayload {
  match: MatchRecord;
  mvpAthlete?: {
    id: string;
    name: string;
    jerseyNumber?: number | null;
    teamName: string;
    teamShort?: string;
  };
}

export const MATCH_HOMOLOGATED_EVENT = 'baseos:match-homologated';

/**
 * Monta o texto rico da notificação oficial de homologação
 */
export function formatHomologatedMatchMessage(payload: MatchHomologationPayload): {
  title: string;
  description: string;
  fullText: string;
} {
  const { match, mvpAthlete } = payload;
  const setsA = match.sets?.filter((s) => s.scoreA > s.scoreB).length || 0;
  const setsB = match.sets?.filter((s) => s.scoreB > s.scoreA).length || 0;
  const parciais = (match.sets || []).map((s) => `${s.scoreA}×${s.scoreB}`).join(' · ');

  const title = `🏆 Resultado Oficial: ${match.teamAName} ${setsA} x ${setsB} ${match.teamBName}`;

  const descriptionParts: string[] = [];
  if (parciais) {
    descriptionParts.push(`(${parciais})`);
  }
  if (mvpAthlete) {
    const jersey = mvpAthlete.jerseyNumber != null ? `#${mvpAthlete.jerseyNumber} ` : '';
    descriptionParts.push(`⭐ MVP: ${jersey}${mvpAthlete.name} (${mvpAthlete.teamShort || mvpAthlete.teamName})`);
  }

  const description = descriptionParts.join(' • ');
  const fullText = `${title}${description ? ` — ${description}` : ''}`;

  return { title, description, fullText };
}

/**
 * Dispara o toast rico no cliente
 */
export function showMatchHomologatedToast(payload: MatchHomologationPayload): void {
  const { title, description } = formatHomologatedMatchMessage(payload);
  toast.success(title, {
    description,
    duration: 8000,
  });
}

/**
 * Transmite a homologação de partida para todos os listeners locais e remotos
 */
export function broadcastMatchHomologated(payload: MatchHomologationPayload): void {
  if (typeof window !== 'undefined') {
    // 1. Broadcast local na janela atual para resposta imediata
    window.dispatchEvent(
      new CustomEvent(MATCH_HOMOLOGATED_EVENT, {
        detail: payload,
      })
    );
  }
}

interface SupabaseMatchRow {
  id: string;
  competition_id?: string;
  round?: number;
  match_number?: number;
  team_a_id?: string;
  team_b_id?: string;
  team_a_name?: string;
  team_b_name?: string;
  team_a_short_name?: string;
  team_b_short_name?: string;
  venue?: string;
  court?: string;
  scheduled_time?: string;
  status?: string;
  sets?: MatchRecord['sets'];
  referees?: MatchRecord['referees'];
  winner_id?: string;
  highlight_athlete_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Assina atualizações em tempo real para uma competição específica.
 * Combina eventos locais (CustomEvent) e remotos (Supabase Realtime WebSocket).
 */
export function subscribeToMatchUpdates(
  competitionId: string,
  onHomologated: (payload: MatchHomologationPayload) => void,
  onAnyMatchChange?: (matchId: string) => void,
): () => void {
  let isCleanedUp = false;
  let subscriptionChannel: { unsubscribe: () => void } | null = null;

  // 1. Ouvinte de eventos locais
  const localHandler = (event: Event) => {
    const customEvent = event as CustomEvent<MatchHomologationPayload>;
    if (customEvent.detail && customEvent.detail.match.competitionId === competitionId) {
      onHomologated(customEvent.detail);
      if (onAnyMatchChange) {
        onAnyMatchChange(customEvent.detail.match.id);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(MATCH_HOMOLOGATED_EVENT, localHandler);
  }

  // 2. Ouvinte do Supabase Realtime (se configurado)
  if (isSupabaseConfigured()) {
    (async () => {
      const supabase = await getSupabaseClient();
      if (!supabase || isCleanedUp) return;

      const channelName = `realtime-matches-${competitionId}-${Date.now()}`;
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
            const newRow = payload.new as SupabaseMatchRow | null;
            if (!newRow || !newRow.id) return;

            if (onAnyMatchChange) {
              onAnyMatchChange(newRow.id);
            }

            if (newRow.status === 'homologated' || newRow.status === 'completed') {
              // Converte colunas snake_case para MatchRecord camelCase mínimo
              const mappedMatch: MatchRecord = {
                id: newRow.id,
                competitionId: newRow.competition_id || competitionId,
                round: newRow.round || 1,
                matchNumber: newRow.match_number || 1,
                teamAId: newRow.team_a_id,
                teamBId: newRow.team_b_id,
                teamAName: newRow.team_a_name || 'Equipe A',
                teamBName: newRow.team_b_name || 'Equipe B',
                teamAShortName: newRow.team_a_short_name || '',
                teamBShortName: newRow.team_b_short_name || '',
                venue: newRow.venue || '',
                court: newRow.court || '',
                scheduledTime: newRow.scheduled_time || '',
                status: newRow.status,
                sets: newRow.sets || [],
                referees: newRow.referees || [],
                winnerId: newRow.winner_id,
                highlightAthleteId: newRow.highlight_athlete_id,
                createdAt: newRow.created_at || '',
                updatedAt: newRow.updated_at || '',
              };

              onHomologated({ match: mappedMatch });
            }
          }
        )
        .subscribe();
    })();
  }

  return () => {
    isCleanedUp = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener(MATCH_HOMOLOGATED_EVENT, localHandler);
    }
    if (subscriptionChannel) {
      subscriptionChannel.unsubscribe();
    }
  };
}
