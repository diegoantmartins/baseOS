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

import type { CompetitionRecord, MatchRecord, SetScoreRecord, StageRecord } from '@/types/entities';
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
  normalizeCompetitionConfig,
  parseLegacySetFormat,
} from '@/types/competitionConfig';
import { DEFAULT_TIEBREAK_CRITERIA } from './standingsService';
import { ScoringEngine, type MatchPointsResult } from './scoringEngine';
import { CompetitionTemplateService } from './competitionTemplateService';

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
   * Caso não haja `config` explícito ou seja parcial, normaliza transparentemente a partir dos campos legados
   * e deriva a árvore de fases estruturada do template correspondente.
   */
  public static getConfig(competition: CompetitionRecord): CompetitionConfig {
    if (competition.rulesSnapshot) {
      return normalizeCompetitionConfig(competition.rulesSnapshot, competition.modality);
    }
    const legacy = this.normalizeLegacyToConfig(competition);
    if (!competition.config || typeof competition.config !== 'object') {
      return legacy;
    }

    // Se o config possuir fases explícitas configuradas, preserva-as; caso contrário, usa as fases do template
    const rawStages =
      competition.config.format &&
      typeof competition.config.format === 'object' &&
      Array.isArray(competition.config.format.stages)
        ? competition.config.format.stages
        : [];
    const resolvedStages = rawStages.length > 0 ? rawStages : legacy.format.stages ?? [];

    const finalPhaseOverrides =
      competition.modality === 'beach'
        ? undefined
        : competition.config.format?.phaseOverrides ?? legacy.format.phaseOverrides;

    return normalizeCompetitionConfig(
      {
        ...legacy,
        ...competition.config,
        format: {
          ...legacy.format,
          ...(competition.config.format && typeof competition.config.format === 'object'
            ? competition.config.format
            : {}),
          phaseOverrides: finalPhaseOverrides,
          stages: resolvedStages,
        },
        scoring: {
          ...legacy.scoring,
          ...(competition.config.scoring && typeof competition.config.scoring === 'object'
            ? competition.config.scoring
            : {}),
        },
        standings: {
          ...legacy.standings,
          ...(competition.config.standings && typeof competition.config.standings === 'object'
            ? competition.config.standings
            : {}),
        },
        registration: {
          ...legacy.registration,
          ...(competition.config.registration && typeof competition.config.registration === 'object'
            ? competition.config.registration
            : {}),
        },
      },
      competition.modality,
    );
  }

  /**
   * Normaliza um CompetitionRecord legado para o contrato moderno CompetitionConfig,
   * gerando a árvore canônica de fases (stages) a partir do template correspondente ao formato.
   */
  public static normalizeLegacyToConfig(competition: CompetitionRecord): CompetitionConfig {
    const isBeach = competition.modality === 'beach';
    const defaultSetsToWin: SetsToWin = parseLegacySetFormat(competition.setFormat);
    const formatIdentifier = competition.format || 'round-robin';

    // Cria a configuração canônica base com a árvore de fases (stages) derivada do template de disputa
    const templateConfig = CompetitionTemplateService.createConfigFromTemplate(formatIdentifier, {
      modality: competition.modality,
      setsToWin: defaultSetsToWin,
      teamsCount: competition.groupsCount ? competition.groupsCount * 4 : undefined,
    });

    const phaseRules = competition.phaseSetRules as Record<string, unknown> | undefined;
    const phaseOverrides = isBeach
      ? undefined
      : phaseRules
        ? {
            groupStage: phaseRules.groupStage !== undefined ? parseLegacySetFormat(phaseRules.groupStage) : defaultSetsToWin,
            playoffs: phaseRules.playoffs !== undefined ? parseLegacySetFormat(phaseRules.playoffs) : defaultSetsToWin,
            quarterfinals: phaseRules.quarterfinals !== undefined
              ? parseLegacySetFormat(phaseRules.quarterfinals)
              : (phaseRules.playoffs !== undefined ? parseLegacySetFormat(phaseRules.playoffs) : defaultSetsToWin),
            semifinals: phaseRules.semifinals !== undefined ? parseLegacySetFormat(phaseRules.semifinals) : 3, // Padrão: melhor de 5 nas semis
            final: phaseRules.final !== undefined ? parseLegacySetFormat(phaseRules.final) : 3, // Padrão: melhor de 5 na final
          }
        : templateConfig.format.phaseOverrides;

    const tiebreakOrder =
      competition.tiebreakCriteriaOrder && competition.tiebreakCriteriaOrder.length > 0
        ? competition.tiebreakCriteriaOrder
        : DEFAULT_TIEBREAK_CRITERIA;

    const minAthletes = isBeach ? 2 : 6;
    const maxAthletes = isBeach ? 4 : 14;

    return {
      ...templateConfig,
      format: {
        ...templateConfig.format,
        defaultSetsToWin,
        phaseOverrides,
        setRules: {
          regularSetPoints: isBeach ? 21 : 25,
          tiebreakPoints: 15,
          minAdvantage: 2,
        },
        stages: templateConfig.format.stages ?? [],
      },
      standings: {
        ...templateConfig.standings,
        tiebreakCriteriaOrder: tiebreakOrder,
        advancingPerGroup: competition.advancingPerGroup ?? templateConfig.standings.advancingPerGroup,
        bestThirds: {
          enabled: Boolean(competition.useBestThirds && (competition.bestThirdsCount ?? 0) > 0),
          count: competition.bestThirdsCount ?? 0,
        },
      },
      registration: {
        ...templateConfig.registration,
        minAthletes,
        maxAthletes,
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
      const phaseStr = typeof phase === 'string' ? phase.trim().toLowerCase() : String(phase).trim().toLowerCase();
      // 1. Prioriza sobrescrita de regras definida no próprio estágio do DAG
      const matchedStage = config.format.stages?.find(
        s => s.id === phase || s.stageId === phase || (typeof s.name === 'string' && s.name.trim().toLowerCase() === phaseStr)
      );
      if (matchedStage?.matchRulesOverride?.setsToWin) {
        setsToWin = matchedStage.matchRulesOverride.setsToWin;
      } else {
        const p = phaseStr;
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
          } else if ((p === 'repescagem' || p === 'play-in' || p === 'playin') && (overrides.quarterfinals || overrides.playoffs || overrides.groupStage)) {
            setsToWin = overrides.quarterfinals ?? overrides.playoffs ?? overrides.groupStage!;
          } else if ((p === 'group-stage' || p === 'groupstage' || p === 'groups' || p === 'classificatória' || p === 'classificatoria') && overrides.groupStage) {
            setsToWin = overrides.groupStage;
          }
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
   * Atua como fachada normativa (SSOT), resolvendo o ScoringSystemConfig oficial da competição
   * e delegando o cálculo aritmético puro ao ScoringEngine.
   */
  public static calculateCompetitionPoints(
    competition: CompetitionRecord,
    setsWon: number,
    setsLost: number,
    isWo = false,
  ): number {
    const config = this.getConfig(competition);
    return ScoringEngine.calculateTeamPoints(setsWon, setsLost, isWo, config.scoring);
  }

  /**
   * Calcula a distribuição de pontos da partida para ambas as equipes de acordo com
   * o regulamento da competição e o resultado canônico oficial.
   */
  public static calculateMatchPoints(
    competition: CompetitionRecord,
    canonical: CanonicalMatchResult,
  ): MatchPointsResult {
    const config = this.getConfig(competition);
    return ScoringEngine.calculatePoints(canonical, config.scoring);
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

  /**
   * Avalia de forma canônica e determinística se a competição é de fase única (Round-Robin).
   *
   * Regras estritas do domínio BaseOS (Configuration-Driven via DAG de Fases):
   * 1. Se houver estágios persistidos (competition_stages) ou estágios declarados no DAG da configuração:
   *    - Rejeita se houver qualquer estágio do tipo eliminatório ('knockout', 'play-in', 'third-place').
   *    - Rejeita se houver mais de 1 estágio (ex: grupos + mata-mata, repescagem, etc.).
   *    - Confirma se houver exatamente 1 estágio e for do tipo 'round-robin' ou 'group-stage'.
   * 2. Se não houver estágios explícitos no DAG, avalia o formato macro declarado:
   *    - Rejeita formatos com eliminatórias ('groups-knockout', 'knockout', 'groups-play-in-knockout', 'double-elimination', 'playoffs').
   *    - Confirma se o formato macro for 'round-robin'.
   * 3. Fallback de compatibilidade segura para competições legadas sem estágios explícitos.
   *
   * NUNCA depende de "match strings" ou traduções em português (ex: 'oitavas', 'quartas', 'semi', 'final').
   */
  public static isSingleStageRoundRobin(
    competition?: CompetitionRecord | null,
    matchesOrStages?: MatchRecord[] | StageRecord[],
    persistedStages?: StageRecord[],
  ): boolean {
    if (!competition) {
      return false;
    }

    // 1. Decisão estrita com base nos estágios reais do banco (competition_stages)
    const stageRecords: StageRecord[] = Array.isArray(persistedStages)
      ? persistedStages
      : Array.isArray(matchesOrStages) && matchesOrStages.length > 0 && 'stageType' in matchesOrStages[0]
      ? (matchesOrStages as StageRecord[])
      : [];

    if (stageRecords.length > 0) {
      const hasKnockout = stageRecords.some(
        s => s.stageType === 'knockout' || s.stageType === 'play-in' || s.stageType === 'third-place'
      );
      if (hasKnockout) {
        return false;
      }
      if (
        stageRecords.length === 1 &&
        (stageRecords[0].stageType === 'round-robin' || stageRecords[0].stageType === 'group-stage')
      ) {
        return true;
      }
      if (stageRecords.length > 1) {
        return false;
      }
    }

    // 2. Decisão estrita orientada a metadados do DAG de Estágios da configuração
    const config = competition.rulesSnapshot || competition.config;
    const stages = config?.format?.stages || [];

    if (stages.length > 0) {
      const hasKnockoutStage = stages.some(
        s => s.type === 'knockout' || s.type === 'play-in' || s.type === 'third-place'
      );
      if (hasKnockoutStage) {
        return false;
      }

      if (stages.length === 1 && (stages[0].type === 'round-robin' || stages[0].type === 'group-stage')) {
        return true;
      }

      if (stages.length > 1) {
        return false;
      }
    }

    // 3. Decisão baseada no Formato Macro oficial
    const macroFormat = (config?.format?.formatType || competition.format || '').toLowerCase();
    const knockoutFormats = [
      'groups-knockout',
      'knockout',
      'groups-play-in-knockout',
      'double-elimination',
      'playoffs',
    ];
    if (knockoutFormats.includes(macroFormat)) {
      return false;
    }

    if (macroFormat === 'round-robin' || competition.format === 'round-robin') {
      return true;
    }

    // 4. Fallback seguro para competições legadas sem estágios explícitos
    const matchesList =
      Array.isArray(matchesOrStages) && matchesOrStages.length > 0 && !('stageType' in matchesOrStages[0])
        ? (matchesOrStages as MatchRecord[])
        : [];

    if (
      stages.length === 0 &&
      !competition.format?.toLowerCase().includes('knockout') &&
      !competition.format?.toLowerCase().includes('playoff') &&
      matchesList.length > 0
    ) {
      return macroFormat === 'round-robin';
    }

    return false;
  }
}

export const isSingleStageRoundRobin = CompetitionRulesService.isSingleStageRoundRobin;
