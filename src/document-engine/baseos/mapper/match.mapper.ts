// =====================================================================
// BaseOS Mapper - Match Mapper Central (3 Estados: blank, prefilled, completed)
// =====================================================================

import type { MatchRecord, TeamRecord, CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import type { BaseosScoresheetData, ScoresheetFormat, DocumentState, ScoresheetOutput } from '../types/scoresheet';
import { mapTeam, createBlankTeam } from './team.mapper';
import { createBlankSetData, mapLiveSetData } from './set.mapper';

export function createBlankBaseosScoresheetData(
  format: ScoresheetFormat = '3-sets',
  output: ScoresheetOutput = 'print-a4',
): BaseosScoresheetData {
  return {
    document: {
      type: 'BASEOS_VOLLEYBALL_SCORESHEET',
      version: '1.0',
      state: 'blank',
      format,
      output,
      generatedAt: new Date().toISOString(),
    },
    competition: {
      name: '',
      phase: '',
      round: '',
      date: '',
      location: '',
      court: '',
      city: '',
    },
    match: {
      id: 'blank-match',
      number: '',
      category: '',
      gender: 'mixed',
      scheduledTime: '',
    },
    teams: {
      A: createBlankTeam('A'),
      B: createBlankTeam('B'),
    },
    sets: {
      set1: createBlankSetData(1, format),
      set2: createBlankSetData(2, format),
      set3: createBlankSetData(3, format),
      ...(format === '5-sets'
        ? {
            set4: createBlankSetData(4, format),
            set5: createBlankSetData(5, format),
          }
        : {}),
    },
    sanctions: [],
    improperRequests: { teamA: false, teamB: false },
    officials: {},
    signatures: {},
    observations: '',
  };
}

export function mapMatchRecordToBaseosScoresheet(
  match: MatchRecord,
  competition: CompetitionRecord | null | undefined,
  teamA: TeamRecord | undefined,
  teamB: TeamRecord | undefined,
  rosterA: CompetitionAthlete[],
  rosterB: CompetitionAthlete[],
  forcedState?: DocumentState,
  output: ScoresheetOutput = 'print-a4',
): BaseosScoresheetData {
  const is5Sets =
    competition?.setFormat === '5-sets' || (match.sets?.length || 0) > 3;
  const format: ScoresheetFormat = is5Sets ? '5-sets' : '3-sets';

  const state: DocumentState =
    forcedState || (match.status === 'completed' ? 'completed' : 'prefilled');

  // Mapeamento de números de atletas para preenchimento de rotação
  const athleteNumberMap = new Map<string, number>();
  [...rosterA, ...rosterB].forEach((a, idx) => {
    if (a.id) {
      athleteNumberMap.set(a.id, a.jerseyNumber ?? idx + 1);
    }
  });

  const teamAData = mapTeam(teamA, match.teamAName, match.teamAShortName, rosterA);
  const teamBData = mapTeam(teamB, match.teamBName, match.teamBShortName, rosterB);

  const phaseLabel = match.phase
    ? match.phase.toUpperCase()
    : match.groupName
      ? match.groupName.toUpperCase()
      : 'FASE REGULAR';

  const formattedDate = match.scheduledTime ? match.scheduledTime.slice(0, 10) : '';
  const formattedTime =
    match.scheduledTime && match.scheduledTime.length >= 16
      ? match.scheduledTime.slice(11, 16)
      : '';

  const setsData = {
    set1: state === 'completed' ? mapLiveSetData(1, format, match, athleteNumberMap) : createBlankSetData(1, format),
    set2: state === 'completed' ? mapLiveSetData(2, format, match, athleteNumberMap) : createBlankSetData(2, format),
    set3: state === 'completed' ? mapLiveSetData(3, format, match, athleteNumberMap) : createBlankSetData(3, format),
    ...(format === '5-sets'
      ? {
          set4: state === 'completed' ? mapLiveSetData(4, format, match, athleteNumberMap) : createBlankSetData(4, format),
          set5: state === 'completed' ? mapLiveSetData(5, format, match, athleteNumberMap) : createBlankSetData(5, format),
        }
      : {}),
  };

  const setsA = match.sets?.filter(s => s.scoreA > s.scoreB).length ?? 0;
  const setsB = match.sets?.filter(s => s.scoreB > s.scoreA).length ?? 0;

  const resultData =
    state === 'completed' && (match.sets?.length || 0) > 0
      ? {
          winnerTeamName:
            match.winnerId === match.teamAId
              ? match.teamAName
              : match.winnerId === match.teamBId
                ? match.teamBName
                : setsA > setsB
                  ? match.teamAName
                  : match.teamBName,
          winnerSide:
            match.winnerId === match.teamAId || setsA > setsB
              ? ('A' as const)
              : ('B' as const),
          finalScoreSetsA: setsA,
          finalScoreSetsB: setsB,
          setResults: (match.sets || []).map(s => ({
            setNumber: s.setNumber,
            scoreA: s.scoreA,
            scoreB: s.scoreB,
            timeOutsA: 0,
            timeOutsB: 0,
            substitutionsA: 0,
            substitutionsB: 0,
          })),
        }
      : undefined;

  return {
    document: {
      type: 'BASEOS_VOLLEYBALL_SCORESHEET',
      version: '1.0',
      state,
      format,
      output,
      generatedAt: new Date().toISOString(),
    },
    competition: {
      name: competition?.name || '',
      phase: phaseLabel,
      round: match.round || 1,
      date: formattedDate,
      location: match.venue || '',
      court: match.court || '',
      city: match.venue || '',
    },
    match: {
      id: match.id,
      number: match.matchNumber || 1,
      category: competition?.playerFormat || '6x6',
      gender: (competition?.genderCategory as 'male' | 'female' | 'mixed') || 'mixed',
      scheduledTime: formattedTime,
    },
    teams: {
      A: teamAData,
      B: teamBData,
    },
    sets: setsData,
    sanctions: [],
    improperRequests: { teamA: false, teamB: false },
    officials: {
      referee1: match.referees?.find(r => r.role.includes('1'))?.name,
      referee2: match.referees?.find(r => r.role.includes('2'))?.name,
      scorer: match.referees?.find(r => r.role.toLowerCase().includes('pont') || r.role.toLowerCase().includes('anot'))?.name,
    },
    signatures: {},
    result: resultData,
    observations: match.observations,
  };
}
