// Builder unificado para conversão de dados de partida
// Converte registros da base de dados para formato padronizado do PDF

import type { MatchRecord, CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import type { MatchSheetData, PdfAthlete, TeamInfo, SetResult } from './types';
import { dataAccess } from '@/services/dataAccess';
import { CompetitionRulesService } from '@/services/competitionRulesService';

export type { MatchSheetData };

// --- Constantes de formatação ---

const GENDER_LABEL: Record<NonNullable<CompetitionRecord['genderCategory']>, string> = {
  male: 'Masculino',
  female: 'Feminino',
  mixed: 'Misto',
};


function toPlayerFormat(playerFormat: string | undefined): '6x6' | '4x4' | '2x2' | '3x3' {
  switch (playerFormat) {
    case '4x4': return '4x4';
    case '2x2': return '2x2';
    case '3x3': return '3x3';
    default: return '6x6';
  }
}

/** Formata data e hora para exibição no PDF */
function formatDateTime(scheduledTime: string | undefined): { date: string; time: string } {
  const d = new Date(scheduledTime ?? Date.now());
  if (Number.isNaN(d.getTime())) return { date: '__/__/____', time: '__:__' };
  
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  return { date, time };
}

/** Converte um atleta da base de dados para o formato PDF */
function athleteToPdf(athlete: CompetitionAthlete): PdfAthlete {
  return {
    jerseyNumber: athlete.jerseyNumber,
    name: athlete.name,
    position: athlete.position,
    captain: athlete.isCaptain,
    libero: athlete.isLibero,
    documentNumber: athlete.documentNumber,
  };
}

/** Calcula placares finais a partir dos sets */
function calculateFinalScore(match: MatchRecord, sets: SetResult[], competition?: CompetitionRecord | null): { finalA: number; finalB: number } {
  const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, match);
  if (canonical.isCompleted || match.status === 'completed' || match.status === 'homologated') {
    return { finalA: canonical.setsWonA, finalB: canonical.setsWonB };
  }
  let setsA = 0;
  let setsB = 0;
  sets.forEach(set => {
    if (set.scoreA > set.scoreB) setsA++;
    else if (set.scoreB > set.scoreA) setsB++;
  });
  return { finalA: setsA, finalB: setsB };
}

/** Determina o vencedor da partida */
function determineWinner(match: MatchRecord, competition?: CompetitionRecord | null): 'A' | 'B' | undefined {
  const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, match);
  if (canonical.winnerSide) return canonical.winnerSide;
  if (match.winnerId) {
    return match.winnerId === match.teamAId ? 'A' : 'B';
  }
  return undefined;
}

/** Constrói as informações da equipe */
function buildTeamInfo(
  match: MatchRecord,
  roster: CompetitionAthlete[],
  isTeamA: boolean,
  teamRecord?: TeamRecord
): TeamInfo {
  return {
    name: isTeamA ? match.teamAName : match.teamBName,
    shortName: isTeamA ? match.teamAShortName : match.teamBShortName,
    logoUrl: teamRecord?.logoUrl,
    athletes: roster.map(athleteToPdf),
    coach: teamRecord?.coachName,
    assistantCoach: teamRecord?.assistantCoach,
    physicalTrainer: teamRecord?.physicalTrainer,
    doctor: teamRecord?.doctor,
  };
}

/**
 * Construtor principal unificado para dados de súmula
 * Converte registros da base de dados (MatchRecord, elencos) para o formato PDF
 */
export async function buildMatchSheetData(
  match: MatchRecord,
  competition: CompetitionRecord | null,
  teamARoster: CompetitionAthlete[],
  teamBRoster: CompetitionAthlete[],
  options: { sheetMode?: 'pre' | 'post' } = {}
): Promise<MatchSheetData> {
  const { date, time } = formatDateTime(match.scheduledTime);
  
  const sets: SetResult[] = match.sets.slice(0, 6).map(s => ({
    setNumber: s.setNumber,
    scoreA: s.scoreA,
    scoreB: s.scoreB,
  }));
  
  const { finalA, finalB } = calculateFinalScore(match, sets, competition);
  
  const isPreGame = options.sheetMode === 'pre' || 
    (match.status !== 'completed' && sets.length === 0);
  
  const winner = determineWinner(match, competition);
  
  const category = competition?.genderCategory
    ? GENDER_LABEL[competition.genderCategory]
    : 'Adulto';
  
  const modality = competition?.modality === 'beach' ? 'beach' : 'indoor';
  const formatConfig = competition
    ? CompetitionRulesService.resolveMatchFormat(competition, match.phase, match.customSetFormat)
    : { setsToWin: 2 as const, maxSets: 3 };
  const format =
    formatConfig.setsToWin === 3 ? '5-sets' : formatConfig.setsToWin === 1 ? '1-set' : '3-sets';
  const playerFormat = toPlayerFormat(competition?.playerFormat);
  const city = match.venue.includes(',') 
    ? match.venue.split(',').pop()?.trim() 
    : undefined;

  const teams = await dataAccess.listTeams();
  const teamARecord = teams.find(t => t.id === match.teamAId);
  const teamBRecord = teams.find(t => t.id === match.teamBId);
  
  return {
    orgName: 'BaseOS',
    sheetMode: isPreGame ? 'pre' : 'post',
    competition: competition?.name ?? match.competitionId,
    category,
    genderCategory: competition?.genderCategory,
    modality,
    format,
    playerFormat,
    date,
    time,
    venue: match.venue,
    court: match.court,
    city,
    phase: match.phase,
    groupName: match.groupName,
    round: match.round,
    matchNumber: match.matchNumber,
    teamA: buildTeamInfo(match, teamARoster, true, teamARecord),
    teamB: buildTeamInfo(match, teamBRoster, false, teamBRecord),
    sets,
    finalScoreA: finalA,
    finalScoreB: finalB,
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

/**
 * Construtor otimizado para múltiplas partidas (relatório em lote)
 */
export async function buildMultipleMatchSheetData(
  matches: MatchRecord[],
  competition: CompetitionRecord | null,
  getRoster: (matchId: string, teamId: string) => Promise<CompetitionAthlete[]>
): Promise<MatchSheetData[]> {
  const results = await Promise.all(
    matches.map(async (match) => {
      const teamARoster = await getRoster(match.id, match.teamAId);
      const teamBRoster = await getRoster(match.id, match.teamBId);
      
      return buildMatchSheetData(
        match,
        competition,
        teamARoster,
        teamBRoster
      );
    })
  );
  
  return results;
}