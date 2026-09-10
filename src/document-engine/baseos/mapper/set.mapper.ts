// =====================================================================
// BaseOS Mapper - Set Mapper (Regra de Tie-Break e Pontos)
// =====================================================================

import type { MatchRecord } from '@/types/entities';
import type { BaseosSetData, RotationData, PointGridData } from '../types/set';
import type { SetFormatConfig } from '@/types/competitionConfig';
import { getSetRuleConfig } from '../domain/set.rules';
import { ROTATION_POSITIONS } from '../domain/rotation.rules';

export function createBlankSetData(
  setNumber: 1 | 2 | 3 | 4 | 5,
  format: '3-sets' | '5-sets',
  rules?: SetFormatConfig,
): BaseosSetData {
  const config = getSetRuleConfig(setNumber, format, rules);

  const blankRotation: RotationData = {
    positions: { I: '', II: '', III: '', IV: '', V: '', VI: '' },
    liberoJersey: '',
  };

  const blankPoints: PointGridData = {
    points: Array.from({ length: config.maxPointsRuler }, (_, i) => ({
      point: i + 1,
      marked: false,
    })),
    currentScore: 0,
  };

  return {
    setNumber,
    status: 'not-started',
    targetPoints: config.targetPoints,
    rotation: {
      teamA: { ...blankRotation },
      teamB: { ...blankRotation },
    },
    points: {
      teamA: { ...blankPoints },
      teamB: { ...blankPoints },
    },
    timeouts: {
      teamA: [],
      teamB: [],
    },
    substitutions: {
      teamA: [],
      teamB: [],
    },
    score: {
      teamA: 0,
      teamB: 0,
    },
    sideChange: config.hasSideChange
      ? {
          required: true,
          atPoint: config.sideChangeTriggerPoint,
          completed: false,
        }
      : undefined,
  };
}

export function mapLiveSetData(
  setNumber: 1 | 2 | 3 | 4 | 5,
  format: '3-sets' | '5-sets',
  match: MatchRecord,
  athleteNumberMap: Map<string, number>,
  rules?: SetFormatConfig,
): BaseosSetData {
  const base = createBlankSetData(setNumber, format, rules);
  const setRecord = match.sets?.find(s => s.setNumber === setNumber);
  if (!setRecord) return base;

  const scoreA = setRecord.scoreA || 0;
  const scoreB = setRecord.scoreB || 0;

  // Marcação dos pontos
  const pointsA = base.points.teamA.points.map(p => ({
    ...p,
    marked: p.point <= scoreA,
  }));
  const pointsB = base.points.teamB.points.map(p => ({
    ...p,
    marked: p.point <= scoreB,
  }));

  // Escalações iniciais se existirem
  const startersA = match.lineups?.teamA?.starterIds || [];
  const startersB = match.lineups?.teamB?.starterIds || [];

  const rotA: RotationData = {
    positions: {
      I: startersA[0] ? athleteNumberMap.get(startersA[0]) ?? '' : '',
      II: startersA[1] ? athleteNumberMap.get(startersA[1]) ?? '' : '',
      III: startersA[2] ? athleteNumberMap.get(startersA[2]) ?? '' : '',
      IV: startersA[3] ? athleteNumberMap.get(startersA[3]) ?? '' : '',
      V: startersA[4] ? athleteNumberMap.get(startersA[4]) ?? '' : '',
      VI: startersA[5] ? athleteNumberMap.get(startersA[5]) ?? '' : '',
    },
    liberoJersey: match.lineups?.teamA?.liberoId ? athleteNumberMap.get(match.lineups.teamA.liberoId) : undefined,
  };

  const rotB: RotationData = {
    positions: {
      I: startersB[0] ? athleteNumberMap.get(startersB[0]) ?? '' : '',
      II: startersB[1] ? athleteNumberMap.get(startersB[1]) ?? '' : '',
      III: startersB[2] ? athleteNumberMap.get(startersB[2]) ?? '' : '',
      IV: startersB[3] ? athleteNumberMap.get(startersB[3]) ?? '' : '',
      V: startersB[4] ? athleteNumberMap.get(startersB[4]) ?? '' : '',
      VI: startersB[5] ? athleteNumberMap.get(startersB[5]) ?? '' : '',
    },
    liberoJersey: match.lineups?.teamB?.liberoId ? athleteNumberMap.get(match.lineups.teamB.liberoId) : undefined,
  };

  return {
    ...base,
    status: match.status === 'completed' ? 'completed' : 'in-progress',
    score: { teamA: scoreA, teamB: scoreB },
    points: {
      teamA: { points: pointsA, currentScore: scoreA },
      teamB: { points: pointsB, currentScore: scoreB },
    },
    rotation: {
      teamA: rotA,
      teamB: rotB,
    },
  };
}
