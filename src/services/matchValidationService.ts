// Motor de validação matemática de sets e resultados do VolleyPro.
//
// FASE 4.3: Totalmente migrado para delegar ao motor canônico CompetitionRulesService.
// Mantém exportações e assinaturas intactas para total compatibilidade retroativa.

import type { CompetitionRecord, SetScoreRecord } from '@/types/entities';
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
