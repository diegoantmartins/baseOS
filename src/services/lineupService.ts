// =====================================================================
// Lineup Service — rotação e escalação da ordem de saque
//
// Regras (CBV/FIVB): após a perda do saque, a equipe rota no sentido
// horário — o jogador da posição I (saque) vai para VI, o de VI para V,
// o de V para IV, o de IV para III, o de III para II e o de II passa a
// sacar (ocupa a posição I).
// =====================================================================

import {
  PLAYER_POSITIONS,
  ROTATION_ORDER,
  type Lineup,
  type PlayerPosition,
} from '../document-engine/schemas/match.schema';

/**
 * Rotaciona a escalação: o jogador da posição I vai para VI e os
 * demais avançam (II→I, III→II, ..., VI→V). É a rotação regulamentar
 * pós-perda de saque.
 */
export function rotateLineup(lineup: Lineup): Lineup {
  const rotated = {} as Record<PlayerPosition, string>;
  for (const pos of PLAYER_POSITIONS) {
    rotated[pos] = lineup.positions[ROTATION_ORDER[pos]];
  }
  return { ...lineup, positions: rotated };
}

/**
 * Cria a escalação inicial (posições I..VI) a partir de uma lista de
 * jogadores. A lista deve conter 6 jogadores; a ordem informada é
 * usada tal qual (I = primeiro da lista = posição de saque).
 */
export function createInitialLineup(
  setNumber: number,
  teamId: string,
  playerIds: string[],
  servingPosition: PlayerPosition = 'I',
): Lineup | undefined {
  if (playerIds.length !== 6) return undefined;
  const positions = {} as Record<PlayerPosition, string>;
  PLAYER_POSITIONS.forEach((pos, i) => {
    positions[pos] = playerIds[i];
  });
  return { setNumber, teamId, positions, servingPosition };
}

/**
 * Verifica se a escalação está completa (todas as posições I..VI com
 * jogador distinto).
 */
export function isLineupComplete(lineup?: Lineup): boolean {
  if (!lineup) return false;
  const seen = new Set<string>();
  for (const pos of PLAYER_POSITIONS) {
    const playerId = lineup.positions[pos];
    if (!playerId || seen.has(playerId)) return false;
    seen.add(playerId);
  }
  return true;
}