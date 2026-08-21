// Converte registros persistentes (MatchRecord + elencos) no shape usado
// pelo gerador de PDF (MatchSheetData).

import type { MatchRecord } from '@/types/entities';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import { dataAccess } from '@/services/dataAccess';

export type MatchSheetData = Parameters<typeof import('./matchSheetPdf').generateMatchSheetPdf>[0];

export type SheetMode = NonNullable<MatchSheetData['sheetMode']>;

function toSetFormat(setFormat: string): '3-sets' | '5-sets' | '1-set' | '2-sets' {
  if (setFormat === '5-sets') return '5-sets';
  if (setFormat === '2-sets') return '2-sets';
  if (setFormat === '1-set') return '1-set';
  return '3-sets';
}

function toPlayerFormat(playerFormat: string): '6x6' | '4x4' | '2x2' | '3x3' {
  if (playerFormat === '4x4') return '4x4';
  if (playerFormat === '2x2') return '2x2';
  if (playerFormat === '3x3') return '3x3';
  return '6x6';
}

function formatMatchDate(scheduledTime: string): { date: string; time: string } {
  const d = new Date(scheduledTime);
  if (Number.isNaN(d.getTime())) return { date: '-', time: '-' };
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function athleteToPdf(athlete: CompetitionAthlete): {
  jerseyNumber?: number;
  name: string;
  position?: string;
  captain?: boolean;
  libero?: boolean;
  documentNumber?: string;
} {
  return {
    jerseyNumber: athlete.jerseyNumber,
    name: athlete.name,
    position: athlete.position,
    captain: athlete.isCaptain,
    libero: athlete.isLibero,
    documentNumber: athlete.documentNumber,
  };
}

/**
 * Monta o MatchSheetData de uma partida a partir dos elencos inscritos.
 */
export async function buildMatchSheetData(
  match: MatchRecord,
  competition: CompetitionRecord | null,
  teamARoster: CompetitionAthlete[],
  teamBRoster: CompetitionAthlete[],
  options: { sheetMode?: SheetMode } = {},
): Promise<MatchSheetData> {
  const { date, time } = formatMatchDate(match.scheduledTime);
  const sets = match.sets.slice(0, 6).map(s => ({ setNumber: s.setNumber, scoreA: s.scoreA, scoreB: s.scoreB }));
  const finalScoreA = sets.filter(s => s.scoreA > s.scoreB).length;
  const finalScoreB = sets.filter(s => s.scoreB > s.scoreA).length;
  const isPreGame = options.sheetMode === 'pre' || (match.status !== 'completed' && sets.length === 0);

  let winner: 'A' | 'B' | undefined;
  if (!isPreGame) {
    if ((match.winnerId ?? null) === match.teamAId) winner = 'A';
    else if ((match.winnerId ?? null) === match.teamBId) winner = 'B';
    else if (match.status === 'completed' && finalScoreA !== finalScoreB) {
      winner = finalScoreA > finalScoreB ? 'A' : 'B';
    }
  }

  const [settings, teams, venues] = await Promise.all([dataAccess.getSettings(), dataAccess.listTeams(), dataAccess.listVenues()]);
  const venueRecord = venues.find(v => v.name === match.venue);
  const city = venueRecord?.address ? venueRecord.address.split('-').pop()?.trim() : undefined;
  const teamAData = await (async () => {
    const team = teams.find(t => t.id === match.teamAId);
    return {
      name: match.teamAName,
      shortName: match.teamAShortName,
      logoUrl: team?.logoUrl,
      athletes: teamARoster.map(athleteToPdf),
      coach: team?.coachName,
    };
  })();

  const teamBData = await (async () => {
    const team = teams.find(t => t.id === match.teamBId);
    return {
      name: match.teamBName,
      shortName: match.teamBShortName,
      logoUrl: team?.logoUrl,
      athletes: teamBRoster.map(athleteToPdf),
      coach: team?.coachName,
    };
  })();

  return {
    orgName: settings.orgName || 'VolleyPro',
    sheetMode: isPreGame ? 'pre' : 'post',
    competition: competition?.name ?? match.competitionId,
    category: competition?.genderCategory === 'male'
      ? 'Masculino'
      : competition?.genderCategory === 'mixed'
        ? 'Misto'
        : competition?.genderCategory === 'female'
          ? 'Feminino'
          : 'Adulto',
    genderCategory: competition?.genderCategory,
    modality: 'indoor',
    format: toSetFormat(competition?.setFormat ?? '3-sets'),
    playerFormat: toPlayerFormat(competition?.playerFormat ?? '6x6'),
    date,
    time,
    venue: match.venue,
    court: match.court,
    city,
    phase: match.phase,
    groupName: match.groupName,
    round: match.round,
    matchNumber: match.matchNumber,
    teamA: teamAData,
    teamB: teamBData,
    sets,
    finalScoreA,
    finalScoreB,
    winner,
    referees: match.referees,
    timeouts: [],
    substitutions: [],
    sanctions: [],
    observations: match.observations,
    startTime: match.status === 'completed' ? time : undefined,
    endTime: undefined,
  };
}