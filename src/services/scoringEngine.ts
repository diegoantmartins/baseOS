/**
 * BaseOS — Scoring Engine (Motor Puro de Pontuação)
 *
 * Responsável por calcular a pontuação atribuída a cada equipe em uma partida
 * de acordo com a configuração de regras da competição.
 *
 * PRINCÍPIOS:
 * 1. Função Pura e Determinística: mesma entrada -> mesma saída, sem efeitos colaterais.
 * 2. Consumo de Resultado Canônico: opera sobre o CanonicalMatchResult para evitar
 *    duplicação na interpretação de placares, sets e W.O.
 * 3. Presets como Conveniência: perfis como 'fivb-standard' e 'simple' são pontos de partida;
 *    o regulamento pode sobrescrever qualquer valor ou definir regras customizadas.
 */

import type { CanonicalMatchResult, ScoringSystemConfig } from '@/types/competitionConfig';

export interface MatchPointsResult {
  pointsA: number;
  pointsB: number;
  winnerPoints: number;
  loserPoints: number;
  isWo: boolean;
}

export class ScoringEngine {
  /**
   * Calcula os pontos atribuídos a cada equipe com base na configuração da competição
   * e no resultado canônico da partida.
   */
  public static calculatePoints(
    canonical: CanonicalMatchResult,
    scoringConfig: ScoringSystemConfig,
  ): MatchPointsResult {
    // Se a partida não for válida ou não estiver completada, não concede pontos
    if (!canonical.isValid || !canonical.isCompleted || canonical.winnerSide === null) {
      return {
        pointsA: 0,
        pointsB: 0,
        winnerPoints: 0,
        loserPoints: 0,
        isWo: canonical.isWo,
      };
    }

    // Tratamento de W.O. (Walkover)
    if (canonical.isWo) {
      const winnerPoints = scoringConfig.pointsWoWin;
      const loserPoints = scoringConfig.pointsWoLoss;

      return {
        pointsA: canonical.winnerSide === 'A' ? winnerPoints : loserPoints,
        pointsB: canonical.winnerSide === 'B' ? winnerPoints : loserPoints,
        winnerPoints,
        loserPoints,
        isWo: true,
      };
    }

    const setsWon = canonical.winnerSide === 'A' ? canonical.setsWonA : canonical.setsWonB;
    const setsLost = canonical.winnerSide === 'A' ? canonical.setsWonB : canonical.setsWonA;
    const setDiff = setsWon - setsLost;

    // Se a diferença for de 1 set (ex: 3x2 em melhor de 5, ou 2x1 em melhor de 3),
    // trata-se de vitória apertada / tiebreak.
    const isNarrow = setDiff === 1;

    const winnerPoints = isNarrow ? scoringConfig.pointsWinNarrow : scoringConfig.pointsWinClear;
    const loserPoints = isNarrow ? scoringConfig.pointsLossNarrow : scoringConfig.pointsLossClear;

    return {
      pointsA: canonical.winnerSide === 'A' ? winnerPoints : loserPoints,
      pointsB: canonical.winnerSide === 'B' ? winnerPoints : loserPoints,
      winnerPoints,
      loserPoints,
      isWo: false,
    };
  }

  /**
   * Cria um preset configurável de pontuação.
   * Presets são meras conveniências; qualquer campo pode ser ajustado pela competição.
   */
  public static createPreset(
    type: 'fivb-standard' | 'simple-amateur' | 'win-loss',
    overrides?: Partial<ScoringSystemConfig>,
  ): ScoringSystemConfig {
    let base: ScoringSystemConfig;

    switch (type) {
      case 'fivb-standard':
        base = {
          systemType: 'fivb-standard',
          pointsWinClear: 3,  // 3x0, 3x1, 2x0
          pointsWinNarrow: 2, // 3x2, 2x1
          pointsLossNarrow: 1,// 2x3, 1x2
          pointsLossClear: 0, // 0x3, 1x3, 0x2
          pointsWoWin: 3,
          pointsWoLoss: 0,
        };
        break;

      case 'simple-amateur':
        // Muito comum em torneios amadores/municipais: 2 pts por vitória, 1 por derrota, 0 por WO
        base = {
          systemType: 'simple',
          pointsWinClear: 2,
          pointsWinNarrow: 2,
          pointsLossNarrow: 1,
          pointsLossClear: 1,
          pointsWoWin: 2,
          pointsWoLoss: 0,
        };
        break;

      case 'win-loss':
        // Apenas vitória conta pontos: 1 por vitória, 0 por derrota
        base = {
          systemType: 'win-loss',
          pointsWinClear: 1,
          pointsWinNarrow: 1,
          pointsLossNarrow: 0,
          pointsLossClear: 0,
          pointsWoWin: 1,
          pointsWoLoss: 0,
        };
        break;
    }

    return {
      ...base,
      ...overrides,
    };
  }
}
