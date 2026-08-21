// Motor de validação matemática de sets e resultados do VolleyPro.
//
// Regras Oficiais:
//  1. Melhor de 3 sets:
//     - Placar final válido: 2x0 ou 2x1.
//     - Sets 1 e 2: até 25 pontos (quadra) ou 21 pontos (praia), com diferença mínima de 2 pontos.
//     - Set 3 (Tiebreak): até 15 pontos, com diferença mínima de 2 pontos.
//  2. Melhor de 5 sets:
//     - Placar final válido: 3x0, 3x1 ou 3x2.
//     - Sets 1 a 4: até 25 pontos (quadra) ou 21 pontos (praia), com diferença mínima de 2 pontos.
//     - Set 5 (Tiebreak): até 15 pontos, com diferença mínima de 2 pontos.
//  3. Não permite resultados impossíveis (ex: 3x0 em melhor de 3, 3x2 em melhor de 3, 2x0 em melhor de 5, 25x24 sem vantagem, etc.).
//  4. WO (Walkover):
//     - 3x0 (25-0, 25-0, 25-0) ou 2x0 (25-0, 25-0).

import type { SetScoreRecord } from '@/types/entities';

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
 * Valida um único set de acordo com as regras de pontuação e vantagem mínima.
 */
export function validateSingleSet(
  setNumber: number,
  scoreA: number,
  scoreB: number,
  config: SetValidationConfig,
  isTiebreak: boolean,
): { valid: boolean; error?: string; winner?: 'A' | 'B' } {
  if (scoreA < 0 || scoreB < 0) {
    return { valid: false, error: `Set ${setNumber}: Pontuação não pode ser negativa.` };
  }

  if (scoreA === 0 && scoreB === 0) {
    return { valid: false, error: `Set ${setNumber}: Placar zerado.` };
  }

  const targetPoints = isTiebreak ? config.tiebreakPoints : config.setPoints;
  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);
  const diff = maxScore - minScore;

  if (maxScore < targetPoints) {
    return {
      valid: false,
      error: `Set ${setNumber}: Vencedor deve atingir no mínimo ${targetPoints} pontos (atual: ${maxScore}x${minScore}).`,
    };
  }

  if (diff < config.minAdvantage) {
    return {
      valid: false,
      error: `Set ${setNumber}: Vencedor deve ter vantagem de pelo menos ${config.minAdvantage} pontos (atual: ${scoreA}x${scoreB}).`,
    };
  }

  if (maxScore > targetPoints && diff > config.minAdvantage) {
    return {
      valid: false,
      error: `Set ${setNumber}: Pontuação além de ${targetPoints} deve terminar exatamente com ${config.minAdvantage} pontos de vantagem (atual: ${scoreA}x${scoreB}).`,
    };
  }

  return { valid: true, winner: scoreA > scoreB ? 'A' : 'B' };
}

/**
 * Valida o resultado completo de uma partida (todos os sets).
 */
export function validateMatchResult(
  sets: SetScoreRecord[],
  config: SetValidationConfig,
  isWo = false,
): ValidationResult {
  const errors: string[] = [];

  if (sets.length === 0) {
    return { valid: false, errors: ['Nenhum set preenchido.'], scoreA: 0, scoreB: 0 };
  }

  // Caso especial de WO
  if (isWo) {
    const requiredWins = config.setFormat === '5-sets' ? 3 : 2;
    const winsA = sets.filter(s => s.scoreA > s.scoreB).length;
    const winsB = sets.filter(s => s.scoreB > s.scoreA).length;
    if (winsA === requiredWins && winsB === 0) {
      return { valid: true, errors: [], winner: 'A', scoreA: winsA, scoreB: 0 };
    }
    if (winsB === requiredWins && winsA === 0) {
      return { valid: true, errors: [], winner: 'B', scoreA: 0, scoreB: winsB };
    }
    return {
      valid: false,
      errors: [`Em WO, o placar deve ser ${requiredWins}x0 a favor da equipe vencedora.`],
      scoreA: winsA,
      scoreB: winsB,
    };
  }

  const requiredWins = config.setFormat === '5-sets' ? 3 : 2;
  const maxPossibleSets = config.setFormat === '5-sets' ? 5 : 3;

  let setsWonA = 0;
  let setsWonB = 0;
  let matchFinished = false;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const isTiebreak = (config.setFormat === '5-sets' && i === 4) || (config.setFormat === '3-sets' && i === 2);

    if (matchFinished) {
      errors.push(`Set ${set.setNumber}: A partida já havia sido encerrada antes deste set.`);
      break;
    }

    const singleSetValidation = validateSingleSet(set.setNumber, set.scoreA, set.scoreB, config, isTiebreak);
    if (!singleSetValidation.valid && singleSetValidation.error) {
      errors.push(singleSetValidation.error);
    }

    if (singleSetValidation.winner === 'A') setsWonA++;
    else if (singleSetValidation.winner === 'B') setsWonB++;

    if (setsWonA === requiredWins || setsWonB === requiredWins) {
      matchFinished = true;
    }
  }

  if (!matchFinished) {
    errors.push(
      `Partida incompleta: nenhuma equipe atingiu ${requiredWins} sets vencidos (Placar atual: ${setsWonA}x${setsWonB}).`,
    );
  }

  if (sets.length > maxPossibleSets) {
    errors.push(`Número de sets (${sets.length}) excede o limite do formato (${maxPossibleSets}).`);
  }

  const valid = errors.length === 0 && matchFinished;
  const winner = setsWonA > setsWonB ? 'A' : setsWonB > setsWonA ? 'B' : undefined;

  return {
    valid,
    errors,
    winner,
    scoreA: setsWonA,
    scoreB: setsWonB,
  };
}
