// =====================================================================
// BaseOS Types - Estrutura dos Sets e Marcações de Jogo
// =====================================================================

import type { RotationPosition } from '../domain/rotation.rules';

export interface RotationData {
  positions: Record<RotationPosition, number | string | undefined>;
  liberoJersey?: number | string;
  servingTeam?: boolean;
}

export interface PointEntry {
  point: number;
  marked: boolean;
  scoreAtMark?: string;
}

export interface PointGridData {
  points: PointEntry[];
  currentScore: number;
}

export interface SubstitutionEntry {
  playerInJersey: number | string;
  playerOutJersey: number | string;
  scoreAtSub: string;
}

export interface BaseosSetData {
  setNumber: 1 | 2 | 3 | 4 | 5;
  status: 'not-started' | 'in-progress' | 'completed';
  targetPoints?: number;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;

  rotation: {
    teamA: RotationData;
    teamB: RotationData;
  };

  points: {
    teamA: PointGridData;
    teamB: PointGridData;
  };

  timeouts: {
    teamA: string[];
    teamB: string[];
  };

  substitutions: {
    teamA: SubstitutionEntry[];
    teamB: SubstitutionEntry[];
  };

  score: {
    teamA: number;
    teamB: number;
  };

  sideChange?: {
    required: boolean;
    atPoint: number;
    completed: boolean;
    pointsAtChange?: {
      teamA: number;
      teamB: number;
    };
  };
}
