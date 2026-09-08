/**
 * CompetitionRulesService — BaseOS
 *
 * Motor Único da Verdade para as Regras Esportivas de Competição.
 *
 * Responsabilidades:
 *  1. Normalizar configurações legadas em memória sem mutação destrutiva;
 *  2. Resolver o formato exato de sets (setsToWin, maxSets, tiebreak) por fase;
 *  3. Calcular pontos atribuídos para a tabela de classificação;
 *  4. Validar matematicamente placares e parciais de sets de forma unificada;
 *  5. Prover limites de elenco (atletas, capitães e líberos) baseados na regra;
 *  6. Controlar a trava de congelamento de regras (rulesSnapshot) para competições ativas.
 *
 * Este serviço é PURO, determinístico e não possui dependências de UI/React.
 */

import type { CompetitionRecord, MatchRecord, SetScoreRecord } from '@/types/entities';
import type {
  CanonicalMatchResult,
  CompetitionConfig,
  SetFormatConfig,
  SetsToWin,
} from '@/types/competitionConfig';
import {
  DEFAULT_BEACH_COMPETITION_CONFIG,
  DEFAULT_INDOOR_COMPETITION_CONFIG,
  deriveMaxSets,
  parseLegacySetFormat,
} from '@/types/competitionConfig';
import { DEFAULT_TIEBREAK_CRITERIA } from './standingsService';

export type RuleValidationResult = {
  valid: boolean;
  errors: string[];
  winner?: 'A' | 'B';
  scoreA: number;
  scoreB: number;
};

export class CompetitionRulesService {
  /**
   * Obtém a configuração canônica da competição.
   * Dá preferência estrita ao `rulesSnapshot` (regras congeladas para competições ativas/concluídas).
   * Caso não haja `config` explícito, normaliza transparentemente a partir dos campos legados.
   */
  public static getConfig(competition: CompetitionRecord): CompetitionConfig {
    if (competition.rulesSnapshot) {
      return competition.rulesSnapshot;
    }
    if (competition.config) {
      return competition.config;
    }
    return this.normalizeLegacyToConfig(competition);
  }

  /**
   * Normaliza um CompetitionRecord legado para o contrato moderno CompetitionConfig.
   */
  public static normalizeLegacyToConfig(competition: CompetitionRecord): CompetitionConfig {
    const isBeach = competition.modality === 'beach';
    const base = isBeach ? DEFAULT_BEACH_COMPETITION_CONFIG : DEFAULT_INDOOR_COMPETITION_CONFIG;

    const defaultSetsToWin: SetsToWin = parseLegacySetFormat(competition.setFormat);

    const phaseRules = competition.phaseSetRules;
    const phaseOverrides = phaseRules
      ? {
          groupStage: phaseRules.groupStage ? parseLegacySetFormat(phaseRules.groupStage) : defaultSetsToWin,
          playoffs: phaseRules.playoffs ? parseLegacySetFormat(phaseRules.playoffs) : defaultSetsToWin,
          quarterfinals: phaseRules.playoffs ? parseLegacySetFormat(phaseRules.playoffs) : defaultSetsToWin,
          semifinals: phaseRules.semifinals ? parseLegacySetFormat(phaseRules.semifinals) : 3, // Padrão: melhor de 5 nas semis
          final: phaseRules.final ? parseLegacySetFormat(phaseRules.final) : 3,               // Padrão: melhor de 5 na final
        }
      : base.format.phaseOverrides;

    const tiebreakOrder =
      competition.tiebreakCriteriaOrder && competition.tiebreakCriteriaOrder.length > 0
        ? competition.tiebreakCriteriaOrder
        : DEFAULT_TIEBREAK_CRITERIA;

    const minAthletes = isBeach ? 2 : 6;
    const maxAthletes = isBeach ? 4 : 14;

    return {
      version: 1,
      format: {
        defaultSetsToWin,
        phaseOverrides,
        setRules: {
          regularSetPoints: isBeach ? 21 : 25,
          tiebreakPoints: 15,
          minAdvantage: 2,
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
        tiebreakCriteriaOrder: tiebreakOrder,
        advancingPerGroup: competition.advancingPerGroup ?? 2,
        bestThirds: {
          enabled: Boolean(competition.useBestThirds && (competition.bestThirdsCount ?? 0) > 0),
          count: competition.bestThirdsCount ?? 0,
        },
      },
      registration: {
        minAthletes,
        maxAthletes,
        maxCaptains: 1,
        maxLiberos: isBeach ? 0 : 2,
        requireJerseyNumberOnRegistration: false,
      },
    };
  }

  /**
   * Resolve o formato e parâmetros de sets para uma partida com base na sua fase e configuração.
   */
  public static resolveMatchFormat(
    competition: CompetitionRecord,
    phase?: string | null,
    customSetFormat?: string | null,
  ): SetFormatConfig {
    const config = this.getConfig(competition);

    let setsToWin: SetsToWin = config.format.defaultSetsToWin;

    // Se a partida tiver uma sobrescrita explícita
    if (customSetFormat) {
      setsToWin = parseLegacySetFormat(customSetFormat);
    } else if (phase) {
      const p = phase.trim().toLowerCase();
      const overrides = config.format.phaseOverrides;

      if (overrides) {
        if ((p === 'final' || p === 'finais') && overrides.final) {
          setsToWin = overrides.final;
        } else if ((p === 'semifinal' || p === 'semifinais' || p === 'semifinals') && overrides.semifinals) {
          setsToWin = overrides.semifinals;
        } else if ((p === 'terceiro_lugar' || p === 'thirdplace' || p === 'third-place' || p === 'third_place') && (overrides.thirdPlace || overrides.semifinals)) {
          setsToWin = overrides.thirdPlace ?? overrides.semifinals!;
        } else if ((p === 'quartas' || p === 'quarterfinals' || p === 'playoffs') && (overrides.quarterfinals || overrides.playoffs)) {
          setsToWin = overrides.quarterfinals ?? overrides.playoffs!;
        } else if ((p === 'oitavas' || p === 'roundof16' || p === 'round-of-16') && overrides.roundOf16) {
          setsToWin = overrides.roundOf16;
        } else if ((p === 'group-stage' || p === 'groupstage' || p === 'groups' || p === 'classificatória' || p === 'classificatoria') && overrides.groupStage) {
          setsToWin = overrides.groupStage;
        }
      }
    }

    return {
      setsToWin,
      maxSets: deriveMaxSets(setsToWin),
      regularSetPoints: config.format.setRules.regularSetPoints,
      tiebreakPoints: config.format.setRules.tiebreakPoints,
      minAdvantage: config.format.setRules.minAdvantage,
    };
  }

  /**
   * Calcula a pontuação na tabela de classificação de acordo com o regulamento da competição.
   */
  public static calculateCompetitionPoints(
    competition: CompetitionRecord,
    setsWon: number,
    setsLost: number,
    isWo = false,
  ): number {
    const config = this.getConfig(competition);
    const scoring = config.scoring;

    if (isWo) {
      return setsWon > setsLost ? scoring.pointsWoWin : scoring.pointsWoLoss;
    }

    if (setsWon === setsLost) return 0;

    // Vitória
    if (setsWon > setsLost) {
      const diff = setsWon - setsLost;
      // Vitória com placar apertado / tiebreak (diferença de 1 set: 3x2 ou 2x1)
      if (diff === 1) {
        return scoring.pointsWinNarrow;
      }
      // Vitória limpa (diferença >= 2 sets: 3x0, 3x1, 2x0)
      return scoring.pointsWinClear;
    }

    // Derrota
    const diff = setsLost - setsWon;
    // Derrota no tiebreak (diferença de 1 set: 2x3 ou 1x2)
    if (diff === 1) {
      return scoring.pointsLossNarrow;
    }
    // Derrota limpa (diferença >= 2 sets: 0x3, 1x3, 0x2)
    return scoring.pointsLossClear;
  }

  /**
   * Valida um único set de acordo com as regras de pontuação da competição.
   */
  public static validateSingleSet(
    setNumber: number,
    scoreA: number,
    scoreB: number,
    formatConfig: SetFormatConfig,
    isTiebreak: boolean,
  ): { valid: boolean; error?: string; winner?: 'A' | 'B' } {
    if (scoreA < 0 || scoreB < 0) {
      return { valid: false, error: `Set ${setNumber}: Pontuação não pode ser negativa.` };
    }

    if (scoreA === 0 && scoreB === 0) {
      return { valid: false, error: `Set ${setNumber}: Placar zerado.` };
    }

    const targetPoints = isTiebreak ? formatConfig.tiebreakPoints : formatConfig.regularSetPoints;
    const maxScore = Math.max(scoreA, scoreB);
    const minScore = Math.min(scoreA, scoreB);
    const diff = maxScore - minScore;

    if (maxScore < targetPoints) {
      return {
        valid: false,
        error: `Set ${setNumber}: Vencedor deve atingir no mínimo ${targetPoints} pontos (atual: ${maxScore}x${minScore}).`,
      };
    }

    if (diff < formatConfig.minAdvantage) {
      return {
        valid: false,
        error: `Set ${setNumber}: Vencedor deve ter vantagem de pelo menos ${formatConfig.minAdvantage} pontos (atual: ${scoreA}x${scoreB}).`,
      };
    }

    if (maxScore > targetPoints && diff > formatConfig.minAdvantage) {
      return {
        valid: false,
        error: `Set ${setNumber}: Pontuação além de ${targetPoints} deve terminar exatamente com ${formatConfig.minAdvantage} pontos de vantagem (atual: ${scoreA}x${scoreB}).`,
      };
    }

    return { valid: true, winner: scoreA > scoreB ? 'A' : 'B' };
  }

  /**
   * Valida o resultado completo de uma partida.
   */
  public static validateMatchScore(
    competition: CompetitionRecord,
    sets: SetScoreRecord[],
    phase?: string | null,
    isWo = false,
    customSetFormat?: string | null,
  ): RuleValidationResult {
    const formatConfig = this.resolveMatchFormat(competition, phase, customSetFormat);
    const errors: string[] = [];

    if (!sets || sets.length === 0) {
      return { valid: false, errors: ['Nenhum set preenchido.'], scoreA: 0, scoreB: 0 };
    }

    const requiredWins = formatConfig.setsToWin;
    const maxPossibleSets = formatConfig.maxSets;

    // Caso de W.O.
    if (isWo) {
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
        errors: [`Em W.O., o placar deve ser ${requiredWins}x0 a favor da equipe vencedora.`],
        scoreA: winsA,
        scoreB: winsB,
      };
    }

    let setsWonA = 0;
    let setsWonB = 0;
    let matchFinished = false;

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const isTiebreak = i === maxPossibleSets - 1;

      if (matchFinished) {
        errors.push(`Set ${set.setNumber}: A partida já havia sido encerrada antes deste set.`);
        break;
      }

      const singleResult = this.validateSingleSet(set.setNumber, set.scoreA, set.scoreB, formatConfig, isTiebreak);
      if (!singleResult.valid && singleResult.error) {
        errors.push(singleResult.error);
      }

      if (singleResult.winner === 'A') setsWonA++;
      else if (singleResult.winner === 'B') setsWonB++;

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

  /**
   * Retorna os limites regulamentares de elenco para a competição.
   */
  public static getRosterLimits(competition: CompetitionRecord): {
    min: number;
    max: number;
    maxLiberos: number;
    maxCaptains: number;
  } {
    const config = this.getConfig(competition);
    return {
      min: config.registration.minAthletes,
      max: config.registration.maxAthletes,
      maxLiberos: config.registration.maxLiberos,
      maxCaptains: config.registration.maxCaptains,
    };
  }

  /**
   * Avalia se as regras esportivas da competição estão congeladas para edição.
   * Regras congelam se houver partidas iniciadas/homologadas ou se o status estiver em andamento.
   */
  public static areRulesLocked(competition: CompetitionRecord, playedMatchesCount = 0): boolean {
    if (competition.rulesSnapshot) return true;
    if (playedMatchesCount > 0) return true;
    const lockedStatuses = ['in-progress', 'playoffs', 'completed', 'cancelled'];
    return lockedStatuses.includes(competition.status);
  }

  /**
   * Cria um snapshot imutável da configuração atual para congelamento.
   */
  public static createRulesSnapshot(competition: CompetitionRecord): CompetitionConfig {
    const config = this.getConfig(competition);
    return JSON.parse(JSON.stringify(config)) as CompetitionConfig;
  }

  /**
   * Obtém a representação canônica oficial e completa do resultado de uma partida.
   * Deriva o vencedor oficial, sets ganhos, pontos marcados e valida inconsistências.
   */
  public static getCanonicalMatchResult(
    competition?: CompetitionRecord | null,
    match?: MatchRecord | null,
  ): CanonicalMatchResult {
    if (!match) {
      return {
        isValid: false,
        status: 'awaiting_schedule',
        winnerId: null,
        loserId: null,
        winnerSide: null,
        setsWonA: 0,
        setsWonB: 0,
        pointsScoredA: 0,
        pointsScoredB: 0,
        setScores: [],
        isWo: false,
        isCompleted: false,
        isHomologated: false,
        isInconsistent: false,
      };
    }

    const isHomologated = match.status === 'homologated';
    const isCompleted = match.status === 'completed' || isHomologated;
    const isWo = Boolean(match.isWo || match.status === 'wo');

    const inferredFormat = match.customSetFormat
      ? match.customSetFormat
      : match.sets &&
        (match.sets.length > 3 ||
          match.sets.filter((s) => s.scoreA > s.scoreB).length >= 3 ||
          match.sets.filter((s) => s.scoreB > s.scoreA).length >= 3)
      ? '5-sets'
      : '3-sets';

    const formatConfig = competition
      ? this.resolveMatchFormat(competition, match.phase, match.customSetFormat)
      : this.resolveMatchFormat(
          {
            id: match.competitionId,
            name: '',
            modality: 'indoor',
            format: 'groups',
            playerFormat: '6x6',
            genderCategory: 'male',
            status: 'in-progress',
            setFormat: inferredFormat,
          } as CompetitionRecord,
          match.phase,
          match.customSetFormat,
        );

    // Caso de W.O.
    if (isWo) {
      const requiredWins = formatConfig.setsToWin;
      const regularPoints = formatConfig.regularSetPoints;

      let winnerSide: 'A' | 'B' | null = null;
      if (match.winnerId === match.teamAId) {
        winnerSide = 'A';
      } else if (match.winnerId === match.teamBId) {
        winnerSide = 'B';
      } else if (match.sets && match.sets.length > 0) {
        const winsA = match.sets.filter((s) => s.scoreA > s.scoreB).length;
        const winsB = match.sets.filter((s) => s.scoreB > s.scoreA).length;
        if (winsA > winsB) winnerSide = 'A';
        else if (winsB > winsA) winnerSide = 'B';
      }

      if (!winnerSide) {
        return {
          isValid: false,
          status: match.status,
          winnerId: null,
          loserId: null,
          winnerSide: null,
          setsWonA: 0,
          setsWonB: 0,
          pointsScoredA: 0,
          pointsScoredB: 0,
          setScores: match.sets || [],
          isWo: true,
          isCompleted,
          isHomologated,
          isInconsistent: true,
          inconsistencyReason: 'Partida com W.O. sem equipe vencedora identificada.',
          homologatedAt: match.homologatedAt,
          homologatedBy: match.homologatedBy,
        };
      }

      const winnerId = winnerSide === 'A' ? match.teamAId : match.teamBId;
      const loserId = winnerSide === 'A' ? match.teamBId : match.teamAId;
      const setsWonA = winnerSide === 'A' ? requiredWins : 0;
      const setsWonB = winnerSide === 'B' ? requiredWins : 0;
      const pointsScoredA = winnerSide === 'A' ? requiredWins * regularPoints : 0;
      const pointsScoredB = winnerSide === 'B' ? requiredWins * regularPoints : 0;

      return {
        isValid: true,
        status: match.status,
        winnerId,
        loserId,
        winnerSide,
        setsWonA,
        setsWonB,
        pointsScoredA,
        pointsScoredB,
        setScores: match.sets || [],
        isWo: true,
        isCompleted,
        isHomologated,
        isInconsistent: false,
        homologatedAt: match.homologatedAt,
        homologatedBy: match.homologatedBy,
      };
    }

    // Partida normal (sem sets)
    if (!match.sets || match.sets.length === 0) {
      const isInconsistent = isCompleted;
      return {
        isValid: false,
        status: match.status,
        winnerId: null,
        loserId: null,
        winnerSide: null,
        setsWonA: 0,
        setsWonB: 0,
        pointsScoredA: 0,
        pointsScoredB: 0,
        setScores: [],
        isWo: false,
        isCompleted,
        isHomologated,
        isInconsistent,
        inconsistencyReason: isInconsistent
          ? 'Partida marcada como concluída/homologada sem nenhum set registrado.'
          : undefined,
        homologatedAt: match.homologatedAt,
        homologatedBy: match.homologatedBy,
      };
    }

    // Validação matemática dos sets
    const validation = competition
      ? this.validateMatchScore(competition, match.sets, match.phase, false, match.customSetFormat)
      : this.validateMatchScore(
          {
            id: match.competitionId,
            name: '',
            modality: 'indoor',
            format: 'groups',
            playerFormat: '6x6',
            genderCategory: 'male',
            status: 'in-progress',
            setFormat: inferredFormat,
          } as CompetitionRecord,
          match.sets,
          match.phase,
          false,
          match.customSetFormat,
        );

    const pointsScoredA = match.sets.reduce((acc, s) => acc + (s.scoreA || 0), 0);
    const pointsScoredB = match.sets.reduce((acc, s) => acc + (s.scoreB || 0), 0);
    const actualSetsWonA = match.sets.filter((s) => s.scoreA > s.scoreB).length;
    const actualSetsWonB = match.sets.filter((s) => s.scoreB > s.scoreA).length;
    const setsWonA = Math.max(validation.scoreA, actualSetsWonA);
    const setsWonB = Math.max(validation.scoreB, actualSetsWonB);
    const derivedWinnerSide = validation.winner ?? (setsWonA > setsWonB ? 'A' : setsWonB > setsWonA ? 'B' : null);
    const derivedWinnerId =
      derivedWinnerSide === 'A' ? match.teamAId : derivedWinnerSide === 'B' ? match.teamBId : null;
    const derivedLoserId =
      derivedWinnerSide === 'A' ? match.teamBId : derivedWinnerSide === 'B' ? match.teamAId : null;

    let isInconsistent = false;
    let inconsistencyReason: string | undefined;

    if (!validation.valid) {
      if (isCompleted) {
        isInconsistent = true;
        inconsistencyReason =
          validation.errors[0] || 'Sets matematicamente inválidos ou incompletos para partida finalizada.';
      }
    } else if (match.winnerId && match.winnerId !== derivedWinnerId) {
      isInconsistent = true;
      inconsistencyReason = `winnerId registrado (${match.winnerId}) diverge do vencedor apurado pelos sets (${derivedWinnerId}).`;
    }

    return {
      isValid: validation.valid,
      status: match.status,
      winnerId: derivedWinnerId ?? (isCompleted ? match.winnerId ?? null : null),
      loserId: derivedLoserId,
      winnerSide: derivedWinnerSide,
      setsWonA,
      setsWonB,
      pointsScoredA,
      pointsScoredB,
      setScores: match.sets,
      isWo: false,
      isCompleted,
      isHomologated,
      isInconsistent,
      inconsistencyReason,
      homologatedAt: match.homologatedAt,
      homologatedBy: match.homologatedBy,
    };
  }
}
