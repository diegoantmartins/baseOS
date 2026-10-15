/**
 * BaseOS — CompetitionConfigValidator (Validador Central de Configuração Esportiva)
 *
 * Responsável por:
 * 1. Validar a integridade estrutural, esportiva e de regras de um CompetitionConfig;
 * 2. Integrar a validação de Grafo Acíclico Dirigido (DAG) via StageGraph.validate();
 * 3. Validar feeds de participantes, pareamentos e progressões;
 * 4. Validar sistemas de pontuação, regras de sets e limites de inscrição;
 * 5. Segregar mensagens em: Válido, Avisos (Warnings) e Erros Bloqueantes (Errors).
 *
 * MODO: Domínio Puro em Memória (Sem dependência de banco, I/O ou UI).
 */

import type {
  CompetitionConfig,
  ParticipantFeedDefinition,
  StageDefinition,
  SetsToWin,
} from '@/types/competitionConfig';
import { getStageId, parseLegacySetFormat } from '@/types/competitionConfig';
import { StageGraph } from './stageGraphEngine';

export interface ConfigValidationIssue {
  field: string;
  message: string;
  stageId?: string;
  roundId?: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
}

export class CompetitionConfigValidator {
  /**
   * Valida integralmente um CompetitionConfig para salvamento ou publicação.
   */
  public static validate(config: CompetitionConfig): ConfigValidationResult {
    const errors: ConfigValidationIssue[] = [];
    const warnings: ConfigValidationIssue[] = [];

    if (!config) {
      return {
        isValid: false,
        errors: [{ field: 'config', message: 'Configuração da competição não fornecida ou indefinida.' }],
        warnings: [],
      };
    }

    // 1. Validação de Versão
    if (typeof config.version !== 'number' || config.version < 1) {
      errors.push({ field: 'version', message: 'Versão da configuração deve ser um número inteiro positivo.' });
    }

    // 2. Validação do Formato e Sets
    if (!config.format) {
      errors.push({ field: 'format', message: 'Seção de formato não fornecida.' });
    } else {
      const defaultSets = config.format.defaultSetsToWin;
      if (![1, 2, 3].includes(defaultSets)) {
        errors.push({
          field: 'format.defaultSetsToWin',
          message: `Sets para vitória inválidos (${defaultSets}). Deve ser 1 (set único), 2 (melhor de 3) ou 3 (melhor de 5).`,
        });
      }

      if (!config.format.setRules) {
        errors.push({ field: 'format.setRules', message: 'Regras de pontuação de sets não definidas.' });
      } else {
        const { regularSetPoints, tiebreakPoints, minAdvantage } = config.format.setRules;
        if (typeof regularSetPoints !== 'number' || regularSetPoints < 10) {
          errors.push({
            field: 'format.setRules.regularSetPoints',
            message: 'Pontuação mínima do set regular deve ser pelo menos 10 pontos.',
          });
        }
        if (typeof tiebreakPoints !== 'number' || tiebreakPoints < 5) {
          errors.push({
            field: 'format.setRules.tiebreakPoints',
            message: 'Pontuação mínima do tiebreak deve ser pelo menos 5 pontos.',
          });
        }
        if (typeof minAdvantage !== 'number' || minAdvantage < 1) {
          errors.push({
            field: 'format.setRules.minAdvantage',
            message: 'Vantagem mínima necessária para fechar o set deve ser de pelo menos 1 ponto.',
          });
        }
      }

      // Validação e Normalização de Sobrescritas por Fase
      if (config.format.phaseOverrides) {
        for (const [phaseKey, setsWin] of Object.entries(config.format.phaseOverrides)) {
          if (setsWin !== undefined && setsWin !== null) {
            const normalized =
              typeof setsWin === 'number' && [1, 2, 3].includes(setsWin)
                ? (setsWin as SetsToWin)
                : parseLegacySetFormat(setsWin);

            // Normaliza em memória no objeto de configuração
            (config.format.phaseOverrides as Record<string, SetsToWin>)[phaseKey] = normalized;

            if (![1, 2, 3].includes(normalized)) {
              errors.push({
                field: `format.phaseOverrides.${phaseKey}`,
                message: `Sobrescrita de sets para "${phaseKey}" inválida (${setsWin}).`,
              });
            }
          }
        }
      }
    }

    // 3. Validação do Sistema de Pontuação (Scoring)
    if (!config.scoring) {
      errors.push({ field: 'scoring', message: 'Configuração de pontuação não fornecida.' });
    } else {
      const { pointsWinClear, pointsWinNarrow, pointsLossNarrow, pointsLossClear, pointsWoWin } = config.scoring;
      if (pointsWinClear < pointsWinNarrow) {
        errors.push({
          field: 'scoring.pointsWinClear',
          message: 'Pontos por vitória limpa devem ser maiores ou iguais a vitória no tiebreak.',
        });
      }
      if (pointsWinNarrow < pointsLossNarrow) {
        errors.push({
          field: 'scoring.pointsWinNarrow',
          message: 'Pontos por vitória no tiebreak devem ser maiores ou iguais a derrota no tiebreak.',
        });
      }
      if (pointsLossNarrow < pointsLossClear) {
        errors.push({
          field: 'scoring.pointsLossNarrow',
          message: 'Pontos por derrota no tiebreak devem ser maiores ou iguais a derrota limpa.',
        });
      }
      if (pointsWoWin < pointsWinClear) {
        warnings.push({
          field: 'scoring.pointsWoWin',
          message: 'Pontuação de W.O. é menor do que a pontuação por vitória regular.',
        });
      }
    }

    // 4. Validação de Classificação e Desempates (Standings)
    if (!config.standings) {
      errors.push({ field: 'standings', message: 'Configuração de classificação não fornecida.' });
    } else {
      const { tiebreakCriteriaOrder, advancingPerGroup, bestThirds } = config.standings;
      if (!Array.isArray(tiebreakCriteriaOrder) || tiebreakCriteriaOrder.length === 0) {
        errors.push({
          field: 'standings.tiebreakCriteriaOrder',
          message: 'A lista de critérios de desempate deve conter pelo menos um critério.',
        });
      }
      if (typeof advancingPerGroup !== 'number' || advancingPerGroup < 1) {
        errors.push({
          field: 'standings.advancingPerGroup',
          message: 'Número de classificados por grupo deve ser no mínimo 1.',
        });
      }
      if (bestThirds?.enabled && (typeof bestThirds.count !== 'number' || bestThirds.count < 1)) {
        errors.push({
          field: 'standings.bestThirds.count',
          message: 'Quando habilitado, a quantidade de melhores terceiros deve ser no mínimo 1.',
        });
      }
    }

    // 5. Validação de Inscrições (Registration)
    if (!config.registration) {
      errors.push({ field: 'registration', message: 'Regras de inscrição não fornecidas.' });
    } else {
      const { minAthletes, maxAthletes, maxCaptains, maxLiberos } = config.registration;
      if (typeof minAthletes !== 'number' || minAthletes < 1) {
        errors.push({ field: 'registration.minAthletes', message: 'Mínimo de atletas deve ser no mínimo 1.' });
      }
      if (typeof maxAthletes !== 'number' || maxAthletes < minAthletes) {
        errors.push({
          field: 'registration.maxAthletes',
          message: 'Máximo de atletas não pode ser menor que o mínimo de atletas.',
        });
      }
      if (typeof maxCaptains !== 'number' || maxCaptains < 1) {
        errors.push({ field: 'registration.maxCaptains', message: 'Deve ser permitido pelo menos 1 capitão.' });
      }
      if (typeof maxLiberos !== 'number' || maxLiberos < 0) {
        errors.push({ field: 'registration.maxLiberos', message: 'Quantidade máxima de líberos não pode ser negativa.' });
      }
    }

    // 6. Validação Estrutural de Fases (Stages)
    const stages = config.format?.stages;
    if (stages && stages.length > 0) {
      this.validateStages(stages, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Valida a estrutura, dependências, DAG e feeds das fases declaradas.
   */
  private static validateStages(
    stages: StageDefinition[],
    errors: ConfigValidationIssue[],
    warnings: ConfigValidationIssue[],
  ): void {
    const stageIds = new Set<string>();

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const stageId = getStageId(stage);

      if (!stageId || stageId.trim() === '') {
        errors.push({
          field: `stages[${i}].id`,
          message: `Fase na posição ${i + 1} possui identificador vazio.`,
        });
        continue;
      }

      if (stageIds.has(stageId)) {
        errors.push({
          field: `stages[${i}].id`,
          message: `Identificador de fase duplicado: "${stageId}".`,
          stageId,
        });
      }
      stageIds.add(stageId);

      if (!stage.name || stage.name.trim() === '') {
        errors.push({
          field: `stages[${i}].name`,
          message: `Fase "${stageId}" possui nome de exibição vazio.`,
          stageId,
        });
      }

      // Validação de grupos se for group-stage
      if (stage.type === 'group-stage') {
        if (stage.groupConfig) {
          if (stage.groupConfig.groupsCount < 1) {
            errors.push({
              field: `stages[${i}].groupConfig.groupsCount`,
              message: `Fase de grupos "${stageId}" deve possuir ao menos 1 grupo.`,
              stageId,
            });
          }
          if (stage.groupConfig.teamsPerGroup < 2) {
            errors.push({
              field: `stages[${i}].groupConfig.teamsPerGroup`,
              message: `Fase de grupos "${stageId}" deve possuir ao menos 2 equipes por grupo.`,
              stageId,
            });
          }
        }
      }

      // Validação de eliminação se for knockout ou play-in
      if (stage.type === 'knockout' || stage.type === 'play-in') {
        if (stage.eliminationConfig) {
          if (stage.eliminationConfig.bracketSize < 2) {
            errors.push({
              field: `stages[${i}].eliminationConfig.bracketSize`,
              message: `Fase eliminatória "${stageId}" deve comportar no mínimo 2 participantes.`,
              stageId,
            });
          }
        }
      }

      // Validação de feeds
      const feeds: ParticipantFeedDefinition[] = stage.participantFeeds ?? stage.participantFeed ?? [];
      for (let j = 0; j < feeds.length; j++) {
        const feed = feeds[j];
        this.validateFeed(feed, stageId, j, stageIds, errors, warnings);
      }

      // Validação de rodadas
      if (stage.rounds) {
        const roundIds = new Set<string>();
        for (const round of stage.rounds) {
          if (!round.roundId || round.roundId.trim() === '') {
            errors.push({
              field: `stages[${i}].rounds`,
              message: `Fase "${stageId}" contém rodada com identificador vazio.`,
              stageId,
            });
          } else if (roundIds.has(round.roundId)) {
            errors.push({
              field: `stages[${i}].rounds`,
              message: `Fase "${stageId}" contém identificador de rodada duplicado: "${round.roundId}".`,
              stageId,
              roundId: round.roundId,
            });
          }
          roundIds.add(round.roundId);
        }
      }
    }

    // Executa validação de DAG via StageGraphEngine
    const dagResult = StageGraph.validate(stages, []);
    for (const dagErr of dagResult.errors) {
      errors.push({
        field: `stages.dag.${dagErr.code.toLowerCase()}`,
        message: dagErr.message,
        stageId: dagErr.stageId,
        roundId: dagErr.roundId,
      });
    }
  }

  /**
   * Valida individualmente uma definição de feed de participantes.
   */
  private static validateFeed(
    feed: ParticipantFeedDefinition,
    stageId: string,
    index: number,
    knownStageIds: Set<string>,
    errors: ConfigValidationIssue[],
    warnings: ConfigValidationIssue[],
  ): void {
    if (!feed || !feed.type) {
      errors.push({
        field: `stages[${stageId}].feeds[${index}]`,
        message: `Feed ${index + 1} da fase "${stageId}" não possui tipo definido.`,
        stageId,
      });
      return;
    }

    switch (feed.type) {
      case 'group-position':
        if (!feed.stageId || !knownStageIds.has(feed.stageId)) {
          errors.push({
            field: `stages[${stageId}].feeds[${index}].stageId`,
            message: `Feed de posição de grupo na fase "${stageId}" aponta para fase de origem desconhecida ou não declarada previamente: "${feed.stageId}".`,
            stageId,
          });
        }
        if (typeof feed.position !== 'number' || feed.position < 1) {
          errors.push({
            field: `stages[${stageId}].feeds[${index}].position`,
            message: `Posição do feed de grupo na fase "${stageId}" deve ser no mínimo 1.`,
            stageId,
          });
        }
        break;

      case 'overall-ranking':
        if (!feed.stageId || !knownStageIds.has(feed.stageId)) {
          errors.push({
            field: `stages[${stageId}].feeds[${index}].stageId`,
            message: `Feed de ranking geral na fase "${stageId}" aponta para fase de origem desconhecida: "${feed.stageId}".`,
            stageId,
          });
        }
        if (typeof feed.position !== 'number' || feed.position < 1) {
          errors.push({
            field: `stages[${stageId}].feeds[${index}].position`,
            message: `Posição do ranking geral deve ser maior ou igual a 1 na fase "${stageId}".`,
            stageId,
          });
        }
        break;

      case 'overall-ranking-range':
        if (!feed.stageId || !knownStageIds.has(feed.stageId)) {
          errors.push({
            field: `stages[${stageId}].feeds[${index}].stageId`,
            message: `Faixa de ranking geral aponta para fase de origem inexistente: "${feed.stageId}".`,
            stageId,
          });
        }
        if (feed.startRank > feed.endRank) {
          errors.push({
            field: `stages[${stageId}].feeds[${index}].range`,
            message: `Início da faixa (${feed.startRank}) é maior que o fim (${feed.endRank}) na fase "${stageId}".`,
            stageId,
          });
        }
        break;

      case 'seed':
        if (typeof feed.seedNumber !== 'number' || feed.seedNumber < 1) {
          errors.push({
            field: `stages[${stageId}].feeds[${index}].seedNumber`,
            message: `Número do Seed na fase "${stageId}" deve ser no mínimo 1.`,
            stageId,
          });
        }
        break;

      case 'bye':
        warnings.push({
          field: `stages[${stageId}].feeds[${index}]`,
          message: `A fase "${stageId}" contém uma entrada configurada como BYE permanente.`,
          stageId,
        });
        break;
    }
  }
}
