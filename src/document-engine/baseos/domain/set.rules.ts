// =====================================================================
// BaseOS Domain - Regras Esportivas de Voleibol
// =====================================================================

import type { SetFormatConfig } from '@/types/competitionConfig';

export const VOLLEYBALL_RULES = {
  REGULAR_SET_POINTS: 25,
  DECIDING_SET_POINTS: 15,
  MIN_POINT_DIFFERENCE: 2,
  MAX_SUBSTITUTIONS_PER_SET: 6,
  MAX_TIMEOUTS_PER_SET: 2,
  TIMEOUT_DURATION_SECONDS: 30,
  TIE_BREAK_SIDE_CHANGE_POINT: 8,
  POINTS_RULER_MAX_REGULAR: 36,
  POINTS_RULER_MAX_DECIDING: 30,
} as const;

export interface SetRuleConfig {
  setNumber: number;
  targetPoints: number;
  isDecidingSet: boolean;
  hasSideChange: boolean;
  sideChangeTriggerPoint: number;
  maxPointsRuler: number;
}

/** Determina as regras esportivas de um set com base no formato da partida e nas regras da competição. */
export function getSetRuleConfig(
  setNumber: number,
  totalSetsFormat: '3-sets' | '5-sets',
  rules?: Partial<Pick<SetFormatConfig, 'regularSetPoints' | 'tiebreakPoints' | 'minAdvantage'>>,
): SetRuleConfig {
  const isDecidingSet = (totalSetsFormat === '3-sets' && setNumber === 3) || (totalSetsFormat === '5-sets' && setNumber === 5);
  
  const regularPoints = rules?.regularSetPoints ?? VOLLEYBALL_RULES.REGULAR_SET_POINTS;
  const tiebreakPoints = rules?.tiebreakPoints ?? VOLLEYBALL_RULES.DECIDING_SET_POINTS;
  const sideChangeTriggerPoint = isDecidingSet
    ? (rules?.tiebreakPoints ? Math.ceil(rules.tiebreakPoints / 2) : VOLLEYBALL_RULES.TIE_BREAK_SIDE_CHANGE_POINT)
    : 0;

  return {
    setNumber,
    targetPoints: isDecidingSet ? tiebreakPoints : regularPoints,
    isDecidingSet,
    hasSideChange: isDecidingSet,
    sideChangeTriggerPoint,
    maxPointsRuler: isDecidingSet ? VOLLEYBALL_RULES.POINTS_RULER_MAX_DECIDING : VOLLEYBALL_RULES.POINTS_RULER_MAX_REGULAR,
  };
}
