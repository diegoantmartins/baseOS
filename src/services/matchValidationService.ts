// Motor de validação matemática de sets e resultados do BaseOS.
//
// FASE 4.3: Totalmente migrado para delegar ao motor canônico CompetitionRulesService.
// Mantém exportações e assinaturas intactas para total compatibilidade retroativa.

import type { CompetitionRecord, MatchRecord, SetScoreRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import { CompetitionRulesService } from './competitionRulesService';
import { deriveMaxSets, parseLegacySetFormat } from '@/types/competitionConfig';

export type SetValidationConfig = {
  setFormat: '3-sets' | '5-sets' | '1-set' | '2-sets';
  setPoints: number; // ex: 25 ou 21
  tiebreakPoints: number; // ex: 15
  minAdvantage: number; // ex: 2
};

export const DEFAULT_INDOOR_CONFIG: SetValidationConfig = {
  setFormat: '3-sets',
  setPoints: 25,
  tiebreakPoints: 15,
  minAdvantage: 2,
};

export const DEFAULT_BEACH_CONFIG: SetValidationConfig = {
  setFormat: '3-sets',
  setPoints: 21,
  tiebreakPoints: 15,
  minAdvantage: 2,
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  winner?: 'A' | 'B';
  scoreA: number;
  scoreB: number;
};

/**
 * Valida um único set delegando ao motor canônico CompetitionRulesService.
 */
export function validateSingleSet(
  setNumber: number,
  scoreA: number,
  scoreB: number,
  config: SetValidationConfig,
  isTiebreak: boolean,
): { valid: boolean; error?: string; winner?: 'A' | 'B' } {
  const setsToWin = parseLegacySetFormat(config.setFormat);
  return CompetitionRulesService.validateSingleSet(
    setNumber,
    scoreA,
    scoreB,
    {
      setsToWin,
      maxSets: deriveMaxSets(setsToWin),
      regularSetPoints: config.setPoints,
      tiebreakPoints: config.tiebreakPoints,
      minAdvantage: config.minAdvantage,
    },
    isTiebreak,
  );
}

/**
 * Valida o resultado completo de uma partida delegando ao motor canônico CompetitionRulesService.
 */
export function validateMatchResult(
  sets: SetScoreRecord[],
  config: SetValidationConfig,
  isWo = false,
): ValidationResult {
  const setsToWin = parseLegacySetFormat(config.setFormat);
  const syntheticComp: CompetitionRecord = {
    id: 'synthetic-val-comp',
    name: 'Synthetic Validation Competition',
    modality: config.setPoints === 21 ? 'beach' : 'indoor',
    format: 'group-stage-knockout',
    playerFormat: '6x6',
    setFormat: config.setFormat,
    genderCategory: 'male',
    status: 'in-progress',
    config: {
      version: 1,
      format: {
        defaultSetsToWin: setsToWin,
        setRules: {
          regularSetPoints: config.setPoints,
          tiebreakPoints: config.tiebreakPoints,
          minAdvantage: config.minAdvantage,
        },
      },
      scoring: {
        systemType: 'fivb-standard',
        pointsWinClear: 3,
        pointsWinNarrow: 2,
        pointsLossNarrow: 1,
        pointsLossClear: 0,
        pointsWoWin: 3,
        pointsWoLoss: 0,
      },
      standings: {
        tiebreakCriteriaOrder: [],
        advancingPerGroup: 2,
      },
      registration: {
        minAthletes: 6,
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
        requireJerseyNumberOnRegistration: false,
      },
    },
  };

  return CompetitionRulesService.validateMatchScore(syntheticComp, sets, undefined, isWo);
}

export type HighlightAthleteInfo = {
  athlete: CompetitionAthlete;
  teamId: string;
  teamName: string;
  teamShortName: string;
  side: 'A' | 'B';
};

/**
 * Validação canônica de elegibilidade do Destaque da Partida (MVP).
 * 
 * Regras do Domínio:
 * 1. O destaque é opcional (highlightAthleteId vazio ou undefined é válido).
 * 2. Partidas W.O. (isWo === true) não permitem destaque esportivo.
 * 3. O atleta deve pertencer ao elenco inscrito da Equipe A ou Equipe B.
 * 4. Se houver check-in presencial registrado (checkedInAthleteIds?.length > 0),
 *    o atleta deve constar na lista de presentes.
 * 5. O atleta pode pertencer tanto à equipe vencedora quanto à perdedora.
 */
export function validateMatchHighlight(
  match: MatchRecord,
  highlightAthleteId: string | undefined | null,
  teamAAthletes: CompetitionAthlete[],
  teamBAthletes: CompetitionAthlete[],
): { valid: boolean; error?: string } {
  if (!highlightAthleteId || highlightAthleteId.trim() === '') {
    return { valid: true };
  }

  if (match.isWo) {
    return { valid: false, error: 'Partidas finalizadas por W.O. não permitem Destaque da Partida.' };
  }

  const athleteInA = teamAAthletes.find(a => a.id === highlightAthleteId);
  const athleteInB = teamBAthletes.find(a => a.id === highlightAthleteId);

  if (!athleteInA && !athleteInB) {
    return {
      valid: false,
      error: 'O atleta selecionado para Destaque da Partida não pertence aos elencos deste confronto.',
    };
  }

  if (match.checkedInAthleteIds && match.checkedInAthleteIds.length > 0) {
    if (!match.checkedInAthleteIds.includes(highlightAthleteId)) {
      return {
        valid: false,
        error: 'O atleta selecionado para Destaque da Partida não consta na lista de check-in presencial.',
      };
    }
  }

  return { valid: true };
}

/**
 * Derivação segura e canônica das informações do Destaque da Partida.
 * A equipe é 100% derivada do relacionamento do atleta com a partida (SSOT),
 * eliminando qualquer necessidade de persistir dados redundantes de equipe (highlightTeamId).
 */
export function deriveHighlightAthleteInfo(
  highlightAthleteId: string | undefined | null,
  teamAAthletes: CompetitionAthlete[],
  teamBAthletes: CompetitionAthlete[],
  match: MatchRecord,
): HighlightAthleteInfo | null {
  if (!highlightAthleteId || highlightAthleteId.trim() === '') {
    return null;
  }

  const athleteInA = teamAAthletes.find(a => a.id === highlightAthleteId);
  if (athleteInA) {
    return {
      athlete: athleteInA,
      teamId: match.teamAId,
      teamName: match.teamAName,
      teamShortName: match.teamAShortName || match.teamAName,
      side: 'A',
    };
  }

  const athleteInB = teamBAthletes.find(a => a.id === highlightAthleteId);
  if (athleteInB) {
    return {
      athlete: athleteInB,
      teamId: match.teamBId,
      teamName: match.teamBName,
      teamShortName: match.teamBShortName || match.teamBName,
      side: 'B',
    };
  }

  return null;
}

