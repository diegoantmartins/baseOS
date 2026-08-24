// =====================================================================
// BaseOS Domain - Regras de Rotação e Posições
// =====================================================================

export const ROTATION_POSITIONS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
export type RotationPosition = (typeof ROTATION_POSITIONS)[number];

export interface PositionAssignment {
  position: RotationPosition;
  jerseyNumber?: number | string;
  athleteId?: string;
  athleteName?: string;
}

export function isValidPosition(pos: string): pos is RotationPosition {
  return ROTATION_POSITIONS.includes(pos as RotationPosition);
}
