/**
 * BaseOS — CompetitionTemplateService (Serviço de Templates de Formatos Esportivos)
 *
 * Responsável por:
 * 1. Prover presets genéricos de formato de competição (Round Robin, Groups -> Knockout,
 *    Groups -> Play-In -> Knockout, Knockout);
 * 2. Produzir instâncias canônicas e válidas de CompetitionConfig a partir de parâmetros mínimos;
 * 3. Garantir que templates sejam puramente presets em memória (não motores de runtime);
 * 4. Garantir que competições criadas por templates dependam estritamente de CompetitionConfig,
 *    sem acoplamento futuro com o ID do template.
 *
 * MODO: Domínio Puro em Memória (Sem dependência de banco, I/O ou UI).
 */

import type {
  CompetitionConfig,
  CompetitionFormatType,
  ProgressionRoute,
  SetsToWin,
  StageDefinition,
} from '@/types/competitionConfig';
import {
  DEFAULT_BEACH_COMPETITION_CONFIG,
  DEFAULT_INDOOR_COMPETITION_CONFIG,
} from '@/types/competitionConfig';
import { GenericPairingEngine } from './genericPairingEngine';

export interface CompetitionTemplateMetadata {
  id: string;
  formatType: CompetitionFormatType;
  name: string;
  description: string;
  category: 'indoor' | 'beach' | 'all';
  recommendedTeamsMin: number;
  recommendedTeamsMax: number;
  defaultSetsToWin: SetsToWin;
  tags: string[];
}

export interface CreateConfigOptions {
  modality?: 'indoor' | 'beach';
  teamsCount?: number;
  setsToWin?: SetsToWin;
}

export class CompetitionTemplateService {
  /**
   * Lista os templates genéricos homologados no BaseOS.
   */
  public static listTemplates(): CompetitionTemplateMetadata[] {
    return [
      {
        id: 'round-robin-standard',
        formatType: 'round-robin',
        name: 'Todos Contra Todos (Round Robin)',
        description: 'Fase única em grupo onde todas as equipes se enfrentam. Classificação direta por pontos corridos.',
        category: 'all',
        recommendedTeamsMin: 3,
        recommendedTeamsMax: 10,
        defaultSetsToWin: 2,
        tags: ['Fase Única', 'Pontos Corridos', 'Iniciante'],
      },
      {
        id: 'groups-knockout-standard',
        formatType: 'groups-knockout',
        name: 'Fase de Grupos + Mata-Mata',
        description: 'Fase de classificação dividida em grupos (ex: 2 grupos) seguida de semifinais cruzadas e final.',
        category: 'all',
        recommendedTeamsMin: 4,
        recommendedTeamsMax: 16,
        defaultSetsToWin: 2,
        tags: ['Padrão FIVB', 'Grupos', 'Playoffs'],
      },
      {
        id: 'groups-play-in-knockout-standard',
        formatType: 'groups-play-in-knockout',
        name: 'Grupos + Play-In + Mata-Mata (Multi-Estágio)',
        description: 'Grupos preliminares com ranking geral unificado: líderes avançam direto às quartas e demais disputam repescagem (Play-In).',
        category: 'all',
        recommendedTeamsMin: 10,
        recommendedTeamsMax: 24,
        defaultSetsToWin: 2,
        tags: ['Avançado', 'Play-In', 'Ranking Geral', 'Universal'],
      },
      {
        id: 'knockout-pure-standard',
        formatType: 'knockout',
        name: 'Eliminatória Direta (Mata-Mata Puro)',
        description: 'Chaveamento eliminatório simples desde a primeira rodada com chaveamento por cabeças de chave (Seeds) e BYEs automáticos.',
        category: 'all',
        recommendedTeamsMin: 4,
        recommendedTeamsMax: 32,
        defaultSetsToWin: 2,
        tags: ['Mata-Mata', 'Chaveamento Simples', 'Tiro Curto'],
      },
      {
        id: 'double-elimination-standard',
        formatType: 'double-elimination',
        name: 'Eliminatória Dupla (Double Elimination)',
        description: 'Chaveamento com chave principal (Winners) e repescagem (Losers). Uma equipe só é eliminada após sofrer duas derrotas. Os campeões de cada chave disputam a Grande Final.',
        category: 'all',
        recommendedTeamsMin: 4,
        recommendedTeamsMax: 16,
        defaultSetsToWin: 2,
        tags: ['Dupla Eliminação', 'Winners/Losers', 'Oficial'],
      },
    ];
  }

  /**
   * Obtém os metadados de um template por ID.
   */
  public static getTemplate(id: string): CompetitionTemplateMetadata | undefined {
    return this.listTemplates().find(t => t.id === id);
  }

  /**
   * Cria uma configuração declarativa completa (CompetitionConfig) a partir de um template.
   */
  public static createConfigFromTemplate(
    templateId: string,
    options: CreateConfigOptions = {},
  ): CompetitionConfig {
    const isBeach = options.modality === 'beach';
    const baseConfig: CompetitionConfig = JSON.parse(
      JSON.stringify(isBeach ? DEFAULT_BEACH_COMPETITION_CONFIG : DEFAULT_INDOOR_COMPETITION_CONFIG),
    );

    const setsToWin = options.setsToWin ?? baseConfig.format.defaultSetsToWin;
    baseConfig.format.defaultSetsToWin = setsToWin;

    switch (templateId) {
      case 'round-robin':
      case 'round-robin-standard':
        return this.buildRoundRobinConfig(baseConfig, options);

      case 'groups-knockout':
      case 'groups-knockout-standard':
        return this.buildGroupsKnockoutConfig(baseConfig, options);

      case 'groups-play-in-knockout':
      case 'groups-play-in-knockout-standard':
        return this.buildGroupsPlayInKnockoutConfig(baseConfig, options);

      case 'knockout':
      case 'knockout-pure-standard':
        return this.buildKnockoutConfig(baseConfig, options);

      case 'double-elimination':
      case 'double-elimination-standard':
        return this.buildDoubleEliminationConfig(baseConfig, options);

      default:
        // Fallback seguro: grupos + mata-mata
        return this.buildGroupsKnockoutConfig(baseConfig, options);
    }
  }

  // ==========================================================================
  // Construtores Específicos de Configurações de Fases
  // ==========================================================================

  private static buildRoundRobinConfig(
    base: CompetitionConfig,
    options: CreateConfigOptions,
  ): CompetitionConfig {
    const stage: StageDefinition = {
      id: 'fase-unica',
      stageId: 'fase-unica',
      order: 1,
      name: 'Fase Única',
      type: 'round-robin',
      groupConfig: {
        groupsCount: 1,
        teamsPerGroup: options.teamsCount ?? 4,
        rounds: 'single',
      },
      pairingConfig: {
        type: 'round-robin',
        rounds: 'single',
      },
      participantFeeds: [
        { type: 'all-teams' },
      ],
      rounds: [
        { roundId: 'rodada-geral', stageId: 'fase-unica', order: 1, name: 'Rodadas Regulares' },
      ],
    };

    return {
      ...base,
      format: {
        ...base.format,
        formatType: 'round-robin',
        stages: [stage],
      },
      standings: {
        ...base.standings,
        advancingPerGroup: options.teamsCount ?? 4,
      },
    };
  }

  private static buildGroupsKnockoutConfig(
    base: CompetitionConfig,
    options: CreateConfigOptions,
  ): CompetitionConfig {
    const teams = options.teamsCount ?? 6;
    const groupsCount = teams >= 8 ? 4 : 2;
    const teamsPerGroup = Math.ceil(teams / groupsCount);

    const groupStage: StageDefinition = {
      id: 'fase-grupos',
      stageId: 'fase-grupos',
      order: 1,
      name: 'Fase de Grupos',
      type: 'group-stage',
      groupConfig: {
        groupsCount,
        teamsPerGroup,
        rounds: 'single',
      },
      participantFeeds: [
        { type: 'all-teams' },
      ],
      rounds: [
        { roundId: 'rodada-grupos', stageId: 'fase-grupos', order: 1, name: 'Jogos de Grupo' },
      ],
    };

    const knockoutStage: StageDefinition = {
      id: 'playoffs',
      stageId: 'playoffs',
      order: 2,
      name: 'Fase Final (Playoffs)',
      type: 'knockout',
      dependsOnStageIds: ['fase-grupos'],
      eliminationConfig: {
        bracketSize: groupsCount * 2,
        hasThirdPlaceMatch: true,
      },
      pairingConfig: {
        strategy: 'same-position-cross',
      },
      participantFeeds: [
        { type: 'group-position', stageId: 'fase-grupos', groupIndex: 0, position: 1 },
        { type: 'group-position', stageId: 'fase-grupos', groupIndex: 1, position: 2 },
        { type: 'group-position', stageId: 'fase-grupos', groupIndex: 1, position: 1 },
        { type: 'group-position', stageId: 'fase-grupos', groupIndex: 0, position: 2 },
      ],
      rounds: [
        { roundId: 'semifinais', stageId: 'playoffs', order: 1, name: 'Semifinais', slotsCount: 2 },
        { roundId: 'final', stageId: 'playoffs', order: 2, name: 'Final', slotsCount: 1 },
      ],
    };

    const isBeach = options.modality === 'beach';
    return {
      ...base,
      format: {
        ...base.format,
        formatType: 'groups-knockout',
        phaseOverrides: isBeach
          ? undefined
          : {
              groupStage: 2,
              semifinals: 3, // Melhor de 5 nas decisões
              final: 3,
            },
        stages: [groupStage, knockoutStage],
      },
      standings: {
        ...base.standings,
        advancingPerGroup: 2,
        aggregationStrategy: 'by-group-position-first',
      },
    };
  }

  private static buildGroupsPlayInKnockoutConfig(
    base: CompetitionConfig,
    options: CreateConfigOptions,
  ): CompetitionConfig {
    const teamsCount = options.teamsCount ?? 10;
    const isTenTeams = teamsCount <= 10;

    let stageGroups: StageDefinition;
    let stagePlayIn: StageDefinition;
    let stageKnockout: StageDefinition;

    if (isTenTeams) {
      // Formato Oficial 10 Equipes (3 Chaves Assimétricas [4, 3, 3] + Repescagem + Playoffs)
      stageGroups = {
        id: 'fase-grupos',
        stageId: 'fase-grupos',
        order: 1,
        name: 'Fase de Grupos (3 Chaves)',
        type: 'group-stage',
        participantsCount: 10,
        participantsOrigin: 'global',
        groupsCount: 3,
        advancingCount: 6,
        groupConfig: {
          groupsCount: 3,
          teamsPerGroup: 4,
          groupCapacities: [4, 3, 3],
          rounds: 'single',
        },
        participantFeeds: [
          { type: 'all-teams' },
        ],
        rounds: [
          { roundId: 'jogos-grupos', stageId: 'fase-grupos', order: 1, name: 'Classificatória' },
        ],
      };

      stagePlayIn = {
        id: 'play-in',
        stageId: 'play-in',
        order: 2,
        name: 'Repescagem / Play-In (7º ao 10º)',
        type: 'play-in',
        participantsCount: 4,
        participantsOrigin: 'overall-ranking',
        advancingCount: 2,
        dependsOnStageIds: ['fase-grupos'],
        eliminationConfig: {
          bracketSize: 4,
          hasThirdPlaceMatch: false,
        },
        pairingConfig: {
          strategy: 'high-low',
        },
        participantFeeds: [
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 7 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 8 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 9 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 10 },
        ],
        rounds: [
          { roundId: 'rodada-play-in', stageId: 'play-in', order: 1, name: 'Repescagem (Eliminatória)', slotsCount: 2 },
        ],
      };

      stageKnockout = {
        id: 'fase-final',
        stageId: 'fase-final',
        order: 3,
        name: 'Fase Final (Quartas, Semis e Final)',
        type: 'knockout',
        participantsCount: 8,
        participantsOrigin: 'stage-position',
        advancingCount: 1,
        dependsOnStageIds: ['fase-grupos', 'play-in'],
        eliminationConfig: {
          bracketSize: 8,
          hasThirdPlaceMatch: true,
        },
        pairingConfig: {
          strategy: 'seeded-bracket',
          bracketSize: 8,
        },
        participantFeeds: [
          // 1º ao 6º do ranking geral entram diretamente nas Quartas
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 1 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 2 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 3 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 4 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 5 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 6 },
          // Os outros 2 vêm da Repescagem / Play-In (vencedores)
          { type: 'stage-winners', stageId: 'play-in' },
        ],
        rounds: [
          { roundId: 'quartas', stageId: 'fase-final', order: 1, name: 'Quartas de Final', slotsCount: 4 },
          { roundId: 'semifinais', stageId: 'fase-final', order: 2, name: 'Semifinais', slotsCount: 2 },
          { roundId: 'final', stageId: 'fase-final', order: 3, name: 'Grande Final', slotsCount: 1 },
        ],
      };
    } else {
      // Padrão genérico de 4 grupos (ideal para 12 a 16 equipes)
      // 1º ao 4º colocados gerais avançam diretamente às Quartas de Final
      // 5º ao 12º colocados disputam o Play-In (repescagem pré-quartas)
      stageGroups = {
        id: 'fase-grupos',
        stageId: 'fase-grupos',
        order: 1,
        name: 'Fase de Grupos (4 Grupos)',
        type: 'group-stage',
        participantsCount: teamsCount,
        participantsOrigin: 'global',
        groupsCount: 4,
        advancingCount: 4,
        groupConfig: {
          groupsCount: 4,
          teamsPerGroup: Math.ceil(teamsCount / 4),
          rounds: 'single',
        },
        participantFeeds: [
          { type: 'all-teams' },
        ],
        rounds: [
          { roundId: 'jogos-grupos', stageId: 'fase-grupos', order: 1, name: 'Classificatória' },
        ],
      };

      stagePlayIn = {
        id: 'play-in',
        stageId: 'play-in',
        order: 2,
        name: 'Play-In (Repescagem 5º ao 12º)',
        type: 'play-in',
        participantsCount: 8,
        participantsOrigin: 'overall-ranking',
        advancingCount: 4,
        dependsOnStageIds: ['fase-grupos'],
        eliminationConfig: {
          bracketSize: 8,
        },
        pairingConfig: {
          strategy: 'high-low',
        },
        participantFeeds: [
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 5 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 6 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 7 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 8 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 9 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 10 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 11 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 12 },
        ],
        rounds: [
          { roundId: 'rodada-play-in', stageId: 'play-in', order: 1, name: 'Play-In (Eliminatória)', slotsCount: 4 },
        ],
      };

      stageKnockout = {
        id: 'fase-final',
        stageId: 'fase-final',
        order: 3,
        name: 'Fase Final (Quartas, Semis e Final)',
        type: 'knockout',
        participantsCount: 8,
        participantsOrigin: 'stage-position',
        advancingCount: 1,
        dependsOnStageIds: ['fase-grupos', 'play-in'],
        eliminationConfig: {
          bracketSize: 8,
          hasThirdPlaceMatch: true,
        },
        pairingConfig: {
          strategy: 'seeded-bracket',
          bracketSize: 8,
        },
        participantFeeds: [
          // 1º ao 4º do ranking geral entram diretamente nas Quartas
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 1 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 2 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 3 },
          { type: 'overall-ranking', stageId: 'fase-grupos', position: 4 },
          // Os outros 4 vêm do Play-In (vencedores)
          { type: 'stage-winners', stageId: 'play-in' },
        ],
        rounds: [
          { roundId: 'quartas', stageId: 'fase-final', order: 1, name: 'Quartas de Final', slotsCount: 4 },
          { roundId: 'semifinais', stageId: 'fase-final', order: 2, name: 'Semifinais', slotsCount: 2 },
          { roundId: 'final', stageId: 'fase-final', order: 3, name: 'Grande Final', slotsCount: 1 },
        ],
      };
    }

    const isBeach = options.modality === 'beach';
    return {
      ...base,
      format: {
        ...base.format,
        formatType: 'groups-play-in-knockout',
        phaseOverrides: isBeach
          ? undefined
          : {
              groupStage: 2,
              quarterfinals: 2,
              semifinals: 3,
              final: 3,
            },
        stages: [stageGroups, stagePlayIn, stageKnockout],
      },
      standings: {
        ...base.standings,
        advancingPerGroup: 3,
        aggregationStrategy: 'by-group-position-first',
      },
    };
  }

  private static buildKnockoutConfig(
    base: CompetitionConfig,
    options: CreateConfigOptions,
  ): CompetitionConfig {
    const bracketSize = options.teamsCount && options.teamsCount > 8 ? 16 : 8;

    const rounds = bracketSize === 16
      ? [
          { roundId: 'oitavas', stageId: 'mata-mata', order: 1, name: 'Oitavas de Final', slotsCount: 8 },
          { roundId: 'quartas', stageId: 'mata-mata', order: 2, name: 'Quartas de Final', slotsCount: 4 },
          { roundId: 'semifinais', stageId: 'mata-mata', order: 3, name: 'Semifinais', slotsCount: 2 },
          { roundId: 'final', stageId: 'mata-mata', order: 4, name: 'Final', slotsCount: 1 },
        ]
      : [
          { roundId: 'quartas', stageId: 'mata-mata', order: 1, name: 'Quartas de Final', slotsCount: 4 },
          { roundId: 'semifinais', stageId: 'mata-mata', order: 2, name: 'Semifinais', slotsCount: 2 },
          { roundId: 'final', stageId: 'mata-mata', order: 3, name: 'Final', slotsCount: 1 },
        ];

    const feeds = Array.from({ length: bracketSize }, (_, i) => ({
      type: 'seed' as const,
      seedNumber: i + 1,
    }));

    const stage: StageDefinition = {
      id: 'mata-mata',
      stageId: 'mata-mata',
      order: 1,
      name: 'Mata-Mata Eliminatório',
      type: 'knockout',
      eliminationConfig: {
        bracketSize,
        hasThirdPlaceMatch: true,
      },
      pairingConfig: {
        strategy: 'seeded-bracket',
        bracketSize,
      },
      participantFeeds: feeds,
      rounds,
    };

    const isBeach = options.modality === 'beach';
    return {
      ...base,
      format: {
        ...base.format,
        formatType: 'knockout',
        phaseOverrides: isBeach
          ? undefined
          : {
              semifinals: 3,
              final: 3,
            },
        stages: [stage],
      },
      standings: {
        ...base.standings,
        advancingPerGroup: 1,
      },
    };
  }

  private static buildDoubleEliminationConfig(
    base: CompetitionConfig,
    options: CreateConfigOptions,
  ): CompetitionConfig {
    const rawCount = options.teamsCount ?? 8;
    // Determina potência de 2 no bracketSize (4, 8, 16)
    let bracketSize = 4;
    if (rawCount > 8) {
      bracketSize = 16;
    } else if (rawCount > 4) {
      bracketSize = 8;
    }

    const doubleElim = GenericPairingEngine.pairDoubleElimination({
      bracketSize,
      stageWinnersId: 'stage-winners',
      stageLosersId: 'stage-losers',
      stageGrandFinalId: 'stage-grand-final',
    });

    const stageWinners: StageDefinition = {
      id: 'stage-winners',
      stageId: 'stage-winners',
      order: 1,
      name: 'Chave Principal (Winners Bracket)',
      type: 'knockout',
      eliminationConfig: {
        bracketSize,
        hasThirdPlaceMatch: false,
      },
      pairingConfig: {
        strategy: 'seeded-bracket',
        bracketSize,
      },
      participantFeeds: Array.from({ length: bracketSize }, (_, i) => ({
        type: 'seed' as const,
        seedNumber: i + 1,
      })),
      rounds: doubleElim.roundsWinners.map(r => ({
        roundId: r.roundId,
        stageId: 'stage-winners',
        order: r.order,
        name: r.name,
        slotsCount: r.slotsCount,
      })),
      progressionRoutes: doubleElim.winnersSlots
        .map(s => s.progressionRoute)
        .filter(Boolean) as ProgressionRoute[],
    };

    const stageLosers: StageDefinition = {
      id: 'stage-losers',
      stageId: 'stage-losers',
      order: 2,
      name: 'Chave de Repescagem (Losers Bracket)',
      type: 'knockout',
      dependsOnStageIds: ['stage-winners'],
      eliminationConfig: {
        bracketSize,
        hasThirdPlaceMatch: false,
      },
      rounds: doubleElim.roundsLosers.map(r => ({
        roundId: r.roundId,
        stageId: 'stage-losers',
        order: r.order,
        name: r.name,
        slotsCount: r.slotsCount,
      })),
      progressionRoutes: doubleElim.losersSlots
        .map(s => s.progressionRoute)
        .filter(Boolean) as ProgressionRoute[],
    };

    const stageGrandFinal: StageDefinition = {
      id: 'stage-grand-final',
      stageId: 'stage-grand-final',
      order: 3,
      name: 'Grande Final',
      type: 'knockout',
      dependsOnStageIds: ['stage-winners', 'stage-losers'],
      eliminationConfig: {
        bracketSize: 2,
        hasThirdPlaceMatch: false,
      },
      rounds: doubleElim.roundsGrandFinal.map(r => ({
        roundId: r.roundId,
        stageId: 'stage-grand-final',
        order: r.order,
        name: r.name,
        slotsCount: r.slotsCount,
      })),
      progressionRoutes: [],
    };

    const isBeach = options.modality === 'beach';
    return {
      ...base,
      format: {
        ...base.format,
        formatType: 'double-elimination',
        phaseOverrides: isBeach
          ? undefined
          : {
              semifinals: 3,
              final: 3,
            },
        stages: [stageWinners, stageLosers, stageGrandFinal],
      },
      standings: {
        ...base.standings,
        advancingPerGroup: 1,
      },
    };
  }
}
