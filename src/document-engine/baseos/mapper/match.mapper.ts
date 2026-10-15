// =====================================================================
// BaseOS Mapper - Match Mapper Central (3 Estados: blank, prefilled, completed)
// =====================================================================

import type { MatchRecord, TeamRecord, CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import type { SetFormatConfig } from '@/types/competitionConfig';
import type { BaseosScoresheetData, ScoresheetFormat, DocumentState, ScoresheetOutput, MatchResultData } from '../types/scoresheet';
import type { MatchSheetData, PdfAthlete } from '@/lib/pdf/types';
import { mapTeam, createBlankTeam } from './team.mapper';
import { createBlankSetData, mapLiveSetData } from './set.mapper';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { formatCourtDisplay } from '../domain/court.rules';

export function createBlankBaseosScoresheetData(
  format: ScoresheetFormat = '3-sets',
  output: ScoresheetOutput = 'print-a4',
  rules?: SetFormatConfig,
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
      set1: createBlankSetData(1, format, rules),
      set2: createBlankSetData(2, format, rules),
      set3: createBlankSetData(3, format, rules),
      ...(format === '5-sets'
        ? {
            set4: createBlankSetData(4, format, rules),
            set5: createBlankSetData(5, format, rules),
          }
        : {}),
    },
    sanctions: [],
    improperRequests: { teamA: false, teamB: false },
    officials: {},
    signatures: {},
    observations: '',
    rules,
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
  let is5Sets = false;
  let formatConfig: SetFormatConfig | undefined;
  if (competition) {
    formatConfig = CompetitionRulesService.resolveMatchFormat(
      competition,
      match.phase,
      match.customSetFormat,
    );
    is5Sets = formatConfig.setsToWin === 3 || formatConfig.maxSets === 5;
  } else {
    is5Sets = false;
  }
  if ((match.sets?.length || 0) > 3) {
    is5Sets = true;
  }
  const format: ScoresheetFormat = is5Sets ? '5-sets' : '3-sets';

  const state: DocumentState =
    forcedState ||
    (match.status === 'completed' || match.status === 'homologated' || match.status === 'wo' || match.isWo
      ? 'completed'
      : 'prefilled');

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

  const formattedDate = match.scheduledTime
    ? match.scheduledTime.slice(0, 10)
    : competition?.startDate
      ? competition.startDate.slice(0, 10)
      : '';
  const formattedTime =
    match.scheduledTime && match.scheduledTime.length >= 16
      ? match.scheduledTime.slice(11, 16)
      : match.scheduledTime || '';

  const rawVenue = (match as unknown as { venueName?: string })?.venueName || match.venue || competition?.venue || '';
  const rawCourt = match.court || (match as unknown as { courtName?: string })?.courtName || '';
  const displayCourt = formatCourtDisplay(rawCourt);

  const setsData = {
    set1: state === 'completed' ? mapLiveSetData(1, format, match, athleteNumberMap, formatConfig) : createBlankSetData(1, format, formatConfig),
    set2: state === 'completed' ? mapLiveSetData(2, format, match, athleteNumberMap, formatConfig) : createBlankSetData(2, format, formatConfig),
    set3: state === 'completed' ? mapLiveSetData(3, format, match, athleteNumberMap, formatConfig) : createBlankSetData(3, format, formatConfig),
    ...(format === '5-sets'
      ? {
          set4: state === 'completed' ? mapLiveSetData(4, format, match, athleteNumberMap, formatConfig) : createBlankSetData(4, format, formatConfig),
          set5: state === 'completed' ? mapLiveSetData(5, format, match, athleteNumberMap, formatConfig) : createBlankSetData(5, format, formatConfig),
        }
      : {}),
  };

  const isMatchFinished =
    state === 'completed' ||
    match.status === 'completed' ||
    match.status === 'homologated' ||
    match.status === 'wo' ||
    Boolean(match.isWo);

  let resultData: MatchResultData | undefined = undefined;

  if (isMatchFinished && ((match.sets && match.sets.length > 0) || match.isWo || match.status === 'wo')) {
    const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, match);
    const winnerSide = canonical.winnerSide;
    const winnerTeamName =
      winnerSide === 'A'
        ? match.teamAName
        : winnerSide === 'B'
          ? match.teamBName
          : canonical.winnerId === match.teamAId
            ? match.teamAName
            : canonical.winnerId === match.teamBId
              ? match.teamBName
              : undefined;

    const rawSets = canonical.setScores && canonical.setScores.length > 0 ? canonical.setScores : match.sets || [];

    resultData = {
      winnerTeamName,
      winnerSide: winnerSide ?? undefined,
      finalScoreSetsA: canonical.setsWonA,
      finalScoreSetsB: canonical.setsWonB,
      setResults: rawSets.map(s => ({
        setNumber: s.setNumber,
        scoreA: s.scoreA,
        scoreB: s.scoreB,
        timeOutsA: 0,
        timeOutsB: 0,
        substitutionsA: 0,
        substitutionsB: 0,
      })),
    };
  }

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
      location: rawVenue,
      court: displayCourt,
      city: rawVenue || competition?.venue || '',
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
    observations: (() => {
      let text = match.observations || '';
      if (match.highlightAthleteId) {
        const athleteInA = rosterA.find((a) => a.id === match.highlightAthleteId);
        const athleteInB = rosterB.find((a) => a.id === match.highlightAthleteId);
        const athlete = athleteInA || athleteInB;
        if (athlete) {
          const teamShort = athleteInA
            ? match.teamAShortName || teamA?.shortName || teamAData.shortName || 'A'
            : match.teamBShortName || teamB?.shortName || teamBData.shortName || 'B';
          const jerseyPrefix = athlete.jerseyNumber != null ? `#${athlete.jerseyNumber} ` : '';
          const highlightNote = `Destaque da Partida (MVP): ${jerseyPrefix}${athlete.name} (${teamShort})`;
          text = text ? `${text} | ${highlightNote}` : highlightNote;
        }
      }
      return text;
    })(),
    rules: formatConfig,
  };
}

/**
 * Converte a estrutura MatchSheetData (legado/unificado) para a estrutura canônica BaseosScoresheetData
 * permitindo que qualquer emissão de súmula no sistema use o motor oficial BaseOS.
 */
export function mapMatchSheetDataToBaseos(
  data: MatchSheetData,
  forcedState?: DocumentState,
  output: ScoresheetOutput = 'print-a4',
): BaseosScoresheetData {
  const is5Sets = data.format === '5-sets';
  const format: ScoresheetFormat = is5Sets ? '5-sets' : '3-sets';
  const state: DocumentState =
    forcedState ||
    (data.sheetMode === 'post' || data.winner || (data.finalScoreA > 0 || data.finalScoreB > 0)
      ? 'completed'
      : data.sheetMode === 'pre'
      ? 'prefilled'
      : 'prefilled');

  const regularA = (data.teamA.athletes || []).filter((a) => !a.libero);
  const liberosA = (data.teamA.athletes || []).filter((a) => a.libero);
  const regularB = (data.teamB.athletes || []).filter((a) => !a.libero);
  const liberosB = (data.teamB.athletes || []).filter((a) => a.libero);

  const mapAthletes = (athletes: PdfAthlete[]) =>
    athletes.map((ath, idx) => ({
      id: `ath-${idx + 1}`,
      jerseyNumber: ath.jerseyNumber,
      name: ath.name,
      isCaptain: Boolean(ath.captain),
      isLibero: Boolean(ath.libero),
      position: ath.position,
      documentNumber: ath.documentNumber,
    }));

  const setsData: BaseosScoresheetData['sets'] = {
    set1: createBlankSetData(1, format),
    set2: createBlankSetData(2, format),
    set3: createBlankSetData(3, format),
    ...(format === '5-sets'
      ? {
          set4: createBlankSetData(4, format),
          set5: createBlankSetData(5, format),
        }
      : {}),
  };

  if (data.sets && data.sets.length > 0) {
    data.sets.forEach((set) => {
      const key = `set${set.setNumber}` as keyof typeof setsData;
      if (setsData[key]) {
        const existing = setsData[key]!;
        setsData[key] = {
          ...existing,
          status: set.scoreA > 0 || set.scoreB > 0 ? 'completed' : 'not-started',
          score: { teamA: set.scoreA, teamB: set.scoreB },
          points: {
            teamA: { ...existing.points.teamA, currentScore: set.scoreA },
            teamB: { ...existing.points.teamB, currentScore: set.scoreB },
          },
        };
      }
    });
  }

  const resultData: MatchResultData | undefined =
    state === 'completed' || data.finalScoreA > 0 || data.finalScoreB > 0 || data.winner
      ? {
          winnerSide: data.winner,
          winnerTeamName: data.winner === 'A' ? data.teamA.name : data.winner === 'B' ? data.teamB.name : undefined,
          finalScoreSetsA: data.finalScoreA,
          finalScoreSetsB: data.finalScoreB,
          setResults: (data.sets || []).map((s) => ({
            setNumber: s.setNumber,
            scoreA: s.scoreA,
            scoreB: s.scoreB,
            timeOutsA: data.timeouts?.filter((t) => t.team === 'A' && t.set === s.setNumber).length || 0,
            timeOutsB: data.timeouts?.filter((t) => t.team === 'B' && t.set === s.setNumber).length || 0,
            substitutionsA: data.substitutions?.filter((sub) => sub.team === 'A' && sub.set === s.setNumber).length || 0,
            substitutionsB: data.substitutions?.filter((sub) => sub.team === 'B' && sub.set === s.setNumber).length || 0,
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
      name: data.competition || '',
      phase: data.phase || '',
      round: data.round || 1,
      date: data.date || '',
      location: data.venue || '',
      court: formatCourtDisplay(data.court),
      city: data.city || data.venue || '',
    },
    match: {
      id: `match-${data.matchNumber || 1}`,
      number: data.matchNumber || 1,
      category: data.category || data.playerFormat || '6x6',
      gender: data.genderCategory || 'mixed',
      scheduledTime: data.time || '',
    },
    teams: {
      A: {
        id: 'team-a',
        name: data.teamA.name,
        shortName: data.teamA.shortName,
        logoUrl: data.teamA.logoUrl,
        athletes: mapAthletes(regularA),
        liberos: mapAthletes(liberosA),
        staff: [
          ...(data.teamA.coach ? [{ roleCode: 'T' as const, roleLabel: 'Técnico', name: data.teamA.coach }] : []),
          ...(data.teamA.assistantCoach ? [{ roleCode: 'AT1' as const, roleLabel: 'Assistente', name: data.teamA.assistantCoach }] : []),
          ...(data.teamA.physicalTrainer ? [{ roleCode: 'PF' as const, roleLabel: 'Prep. Físico', name: data.teamA.physicalTrainer }] : []),
          ...(data.teamA.doctor ? [{ roleCode: 'M/F' as const, roleLabel: 'Médico', name: data.teamA.doctor }] : []),
        ],
      },
      B: {
        id: 'team-b',
        name: data.teamB.name,
        shortName: data.teamB.shortName,
        logoUrl: data.teamB.logoUrl,
        athletes: mapAthletes(regularB),
        liberos: mapAthletes(liberosB),
        staff: [
          ...(data.teamB.coach ? [{ roleCode: 'T' as const, roleLabel: 'Técnico', name: data.teamB.coach }] : []),
          ...(data.teamB.assistantCoach ? [{ roleCode: 'AT1' as const, roleLabel: 'Assistente', name: data.teamB.assistantCoach }] : []),
          ...(data.teamB.physicalTrainer ? [{ roleCode: 'PF' as const, roleLabel: 'Prep. Físico', name: data.teamB.physicalTrainer }] : []),
          ...(data.teamB.doctor ? [{ roleCode: 'M/F' as const, roleLabel: 'Médico', name: data.teamB.doctor }] : []),
        ],
      },
    },
    sets: setsData,
    sanctions: (data.sanctions || []).map((s) => ({
      type: s.type.toLowerCase().includes('vermelh') ? ('penalty' as const) : ('warning' as const),
      typeCode: s.type.toLowerCase().includes('vermelh') ? ('P' as const) : ('A' as const),
      teamSide: s.team,
      teamName: s.team === 'A' ? data.teamA.name : data.teamB.name,
      individualNameOrJersey: s.player,
      setNumber: s.set,
      scoreAtSanction: '00:00',
    })),
    improperRequests: { teamA: false, teamB: false },
    officials: {
      referee1: data.referees?.find((r) => r.role.includes('1'))?.name,
      referee2: data.referees?.find((r) => r.role.includes('2'))?.name,
      scorer: data.referees?.find((r) => r.role.toLowerCase().includes('pont') || r.role.toLowerCase().includes('anot'))?.name,
      assistantScorer: data.referees?.find((r) => r.role.toLowerCase().includes('assist'))?.name,
    },
    signatures: {},
    result: resultData,
    observations: data.observations || '',
  };
}
