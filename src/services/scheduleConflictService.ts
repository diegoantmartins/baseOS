// Motor de prevenção e detecção de conflitos de agendamento do VolleyPro.
//
// Regras:
//  1. Quadra em uso: duas partidas na mesma quadra no mesmo horário ou com intervalo insuficiente.
//  2. Equipe em quadra: a mesma equipe jogando duas partidas simultaneamente.
//  3. Descanso mínimo: a mesma equipe com intervalo entre partidas menor que `minTeamRestMinutes` (ex: 30 a 60 min).
//  4. Quadra bloqueada/indisponível.

import type { CompetitionRecord, MatchRecord, VenueRecord } from '@/types/entities';

export type ConflictSeverity = 'error' | 'warning';

export type ScheduleConflict = {
  id: string;
  severity: ConflictSeverity;
  type: 'court_overlap' | 'team_overlap' | 'team_rest_time' | 'court_unavailable';
  message: string;
  matchIdA: string;
  matchIdB?: string;
  involvedTeamId?: string;
  involvedCourt?: string;
};

/** Duração estimada padrão de uma partida de vôlei em minutos (para cálculo de sobreposição). */
export const ESTIMATED_MATCH_DURATION_MINUTES = 75;

export type ValidateScheduleParams = {
  matchId: string;
  scheduledTime: string;
  venueName: string;
  courtName?: string;
  teamAId: string;
  teamBId: string;
  competition: CompetitionRecord;
  allMatches: MatchRecord[];
  venues?: VenueRecord[];
};

/**
 * Valida o agendamento de uma partida contra todas as demais da competição / locais.
 */
export function detectScheduleConflicts(params: ValidateScheduleParams): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const targetTime = new Date(params.scheduledTime).getTime();
  if (Number.isNaN(targetTime)) return conflicts;

  const minRestMs = (params.competition.minTeamRestMinutes ?? 30) * 60 * 1000;
  const matchDurationMs = (params.competition.defaultMatchIntervalMinutes ?? ESTIMATED_MATCH_DURATION_MINUTES) * 60 * 1000;

  // 1. Verifica se a quadra está marcada como bloqueada/indisponível no cadastro de locais
  if (params.venues && params.courtName) {
    const venue = params.venues.find(v => v.name.toLowerCase() === params.venueName.toLowerCase());
    if (venue?.courtDetails) {
      const courtDetail = venue.courtDetails.find(c => c.name.toLowerCase() === params.courtName?.toLowerCase());
      if (courtDetail && courtDetail.status !== 'active') {
        conflicts.push({
          id: `court-unavail-${params.matchId}`,
          severity: 'error',
          type: 'court_unavailable',
          message: `A quadra "${params.courtName}" no local "${params.venueName}" está marcada como ${courtDetail.status.toUpperCase()} (${courtDetail.notes || 'Indisponível'}).`,
          matchIdA: params.matchId,
          involvedCourt: params.courtName,
        });
      }
    }
  }

  // 2. Compara contra as outras partidas
  for (const other of params.allMatches) {
    if (other.id === params.matchId) continue;
    if (other.status === 'cancelled' || other.status === 'completed' || other.status === 'homologated') continue;

    const otherTime = new Date(other.scheduledTime).getTime();
    if (Number.isNaN(otherTime)) continue;

    const timeDiffMs = Math.abs(targetTime - otherTime);

    // Conflito de Quadra: mesmo local + mesma quadra
    const sameVenue = other.venue?.trim().toLowerCase() === params.venueName.trim().toLowerCase();
    const sameCourt = other.court && params.courtName && other.court.trim().toLowerCase() === params.courtName.trim().toLowerCase();

    if (sameVenue && sameCourt) {
      if (timeDiffMs === 0) {
        conflicts.push({
          id: `court-same-${params.matchId}-${other.id}`,
          severity: 'error',
          type: 'court_overlap',
          message: `Conflito de quadra: Jogo #${other.matchNumber} (${other.teamAName} x ${other.teamBName}) já está agendado exatamente no mesmo horário na ${params.courtName}.`,
          matchIdA: params.matchId,
          matchIdB: other.id,
          involvedCourt: params.courtName,
        });
      } else if (timeDiffMs < matchDurationMs) {
        conflicts.push({
          id: `court-near-${params.matchId}-${other.id}`,
          severity: 'warning',
          type: 'court_overlap',
          message: `Aviso de quadra: Jogo #${other.matchNumber} está agendado na ${params.courtName} com intervalo de apenas ${Math.round(timeDiffMs / 60000)} min (estimado: ${Math.round(matchDurationMs / 60000)} min).`,
          matchIdA: params.matchId,
          matchIdB: other.id,
          involvedCourt: params.courtName,
        });
      }
    }

    // Conflito de Equipe: Team A ou Team B jogando
    const targetTeams = [params.teamAId, params.teamBId];
    const otherTeams = [other.teamAId, other.teamBId];
    const commonTeams = targetTeams.filter(t => otherTeams.includes(t) && t && !t.startsWith('TBD'));

    for (const commonTeamId of commonTeams) {
      const commonTeamName = commonTeamId === params.teamAId ? 'Equipe A' : 'Equipe B';
      if (timeDiffMs === 0) {
        conflicts.push({
          id: `team-simul-${params.matchId}-${other.id}-${commonTeamId}`,
          severity: 'error',
          type: 'team_overlap',
          message: `Conflito de equipe: A mesma equipe (${commonTeamName}) possui outro jogo (#${other.matchNumber}) no mesmo horário!`,
          matchIdA: params.matchId,
          matchIdB: other.id,
          involvedTeamId: commonTeamId,
        });
      } else if (timeDiffMs < (matchDurationMs + minRestMs)) {
        conflicts.push({
          id: `team-rest-${params.matchId}-${other.id}-${commonTeamId}`,
          severity: 'warning',
          type: 'team_rest_time',
          message: `Aviso de descanso: A equipe (${commonTeamName}) tem jogo #${other.matchNumber} com intervalo de apenas ${Math.round(timeDiffMs / 60000)} min (mínimo regulamentar: ${Math.round(minRestMs / 60000)} min de descanso).`,
          matchIdA: params.matchId,
          matchIdB: other.id,
          involvedTeamId: commonTeamId,
        });
      }
    }
  }

  return conflicts;
}
