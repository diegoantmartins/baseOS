/**
 * BaseOS — CompetitionFormatBuilder (Serviço de Construção e Autoria de Formatos)
 *
 * Responsável por:
 * 1. Manipular o rascunho (Draft State) de configuração de uma competição de forma imutável;
 * 2. Permitir adição, edição, reordenação e remoção de fases (StageDefinition);
 * 3. Configurar feeds, pareamentos, progressões e rodadas;
 * 4. Normalizar regras de sets, pontuação, desempate e inscrição;
 * 5. Gerar slots simulados em memória para pré-visualização (Preview) SEM PERSISTÊNCIA;
 * 6. Construir e entregar a instância final canônica de CompetitionConfig.
 *
 * MODO: Domínio Puro em Memória (Sem dependência de banco, I/O ou UI).
 */

import type {
  CompetitionConfig,
  CompetitionFormatType,
  MatchSlot,
  PairingStrategyType,
  ParticipantFeedDefinition,
  ParticipantSlotState,
  PhaseFormatOverrides,
  ProgressionRoute,
  RegistrationRulesConfig,
  RoundDefinition,
  ScoringSystemConfig,
  SetsToWin,
  StageDefinition,
  StandingsConfig,
} from '@/types/competitionConfig';
import {
  DEFAULT_INDOOR_COMPETITION_CONFIG,
  createByeParticipantSlot,
  createUnresolvedParticipantSlot,
  getStageId,
  normalizeCompetitionConfig,
} from '@/types/competitionConfig';
import { GenericPairingEngine } from './genericPairingEngine';

export class CompetitionFormatBuilder {
  private config: CompetitionConfig;

  constructor(initialConfig?: CompetitionConfig) {
    this.config = normalizeCompetitionConfig(initialConfig);
  }

  public static fromConfig(config: CompetitionConfig): CompetitionFormatBuilder {
    return new CompetitionFormatBuilder(config);
  }

  public getConfig(): CompetitionConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  // ==========================================================================
  // Gestão de Formato Geral e Sets
  // ==========================================================================

  public setFormatType(type: CompetitionFormatType): this {
    this.config.format.formatType = type;
    return this;
  }

  public setDefaultSetsToWin(setsToWin: SetsToWin): this {
    this.config.format.defaultSetsToWin = setsToWin;
    return this;
  }

  public setSetRules(setRules: { regularSetPoints: number; tiebreakPoints: number; minAdvantage: number }): this {
    this.config.format.setRules = { ...setRules };
    return this;
  }

  public setPhaseOverrides(overrides: PhaseFormatOverrides): this {
    this.config.format.phaseOverrides = { ...overrides };
    return this;
  }

  // ==========================================================================
  // Gestão de Fases (Stages)
  // ==========================================================================

  public getStages(): StageDefinition[] {
    return this.config.format.stages ?? [];
  }

  public getStage(stageId: string): StageDefinition | undefined {
    return this.getStages().find(s => getStageId(s) === stageId);
  }

  public addStage(stage: StageDefinition): this {
    if (!this.config.format.stages) {
      this.config.format.stages = [];
    }
    const id = getStageId(stage);
    const existingIdx = this.config.format.stages.findIndex(s => getStageId(s) === id);
    if (existingIdx !== -1) {
      this.config.format.stages[existingIdx] = { ...stage };
    } else {
      const order = stage.order || this.config.format.stages.length + 1;
      this.config.format.stages.push({ ...stage, order });
    }
    return this;
  }

  public updateStage(stageId: string, updates: Partial<StageDefinition>): this {
    if (!this.config.format.stages) return this;
    const idx = this.config.format.stages.findIndex(s => getStageId(s) === stageId);
    if (idx !== -1) {
      this.config.format.stages[idx] = {
        ...this.config.format.stages[idx],
        ...updates,
      };
    }
    return this;
  }

  public removeStage(stageId: string): this {
    if (!this.config.format.stages) return this;
    this.config.format.stages = this.config.format.stages
      .filter(s => getStageId(s) !== stageId)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    return this;
  }

  public reorderStages(orderedStageIds: string[]): this {
    if (!this.config.format.stages) return this;
    const stagesMap = new Map(this.config.format.stages.map(s => [getStageId(s), s]));
    const reordered: StageDefinition[] = [];

    for (let i = 0; i < orderedStageIds.length; i++) {
      const id = orderedStageIds[i];
      const stage = stagesMap.get(id);
      if (stage) {
        reordered.push({ ...stage, order: i + 1 });
        stagesMap.delete(id);
      }
    }
    // Adiciona fases remanescentes se houver
    for (const remaining of stagesMap.values()) {
      reordered.push({ ...remaining, order: reordered.length + 1 });
    }

    this.config.format.stages = reordered;
    return this;
  }

  // ==========================================================================
  // Gestão de Rodadas e Feeds
  // ==========================================================================

  public setStageRounds(stageId: string, rounds: RoundDefinition[]): this {
    return this.updateStage(stageId, { rounds });
  }

  public setStageFeeds(stageId: string, feeds: ParticipantFeedDefinition[]): this {
    return this.updateStage(stageId, { participantFeeds: feeds });
  }

  public setStageProgressionRoutes(stageId: string, routes: ProgressionRoute[]): this {
    return this.updateStage(stageId, { progressionRoutes: routes });
  }

  // ==========================================================================
  // Gestão de Pontuação, Classificação e Inscrição
  // ==========================================================================

  public setScoring(scoring: Partial<ScoringSystemConfig>): this {
    this.config.scoring = {
      ...this.config.scoring,
      ...scoring,
    };
    return this;
  }

  public setStandings(standings: Partial<StandingsConfig>): this {
    this.config.standings = {
      ...this.config.standings,
      ...standings,
    };
    return this;
  }

  public setRegistration(registration: Partial<RegistrationRulesConfig>): this {
    this.config.registration = {
      ...this.config.registration,
      ...registration,
    };
    return this;
  }

  // ==========================================================================
  // Finalização do Build
  // ==========================================================================

  public build(): CompetitionConfig {
    return this.getConfig();
  }

  // ==========================================================================
  // Geração de Preview Local em Memória (Sem Persistência)
  // ==========================================================================

  /**
   * Constrói a árvore simulada de MatchSlots para a pré-visualização gráfica
   * com base nas definições das fases e pareamentos configurados.
   * Totalmente em memória, sem persistir no banco de dados.
   */
  public static generatePreviewSlots(config?: CompetitionConfig | null): {
    stages: StageDefinition[];
    slots: MatchSlot[];
  } {
    const stages = config?.format?.stages ?? [];
    const allSlots: MatchSlot[] = [];

    for (const stage of stages) {
      const stageId = getStageId(stage);
      const rounds = stage.rounds ?? [];

      if (stage.type === 'round-robin' || stage.type === 'group-stage') {
        const roundId = rounds[0]?.roundId ?? `${stageId}-r1`;
        const groupsCount = stage.groupConfig?.groupsCount ?? 1;
        const defaultTeamsPerGroup = stage.groupConfig?.teamsPerGroup ?? 4;
        let slotCounter = 1;

        for (let g = 0; g < groupsCount; g++) {
          const groupName = String.fromCharCode(65 + g);
          const teamsPerGroup = stage.groupConfig?.groupCapacities?.[g] ?? defaultTeamsPerGroup;
          // Simulação de confrontos do grupo
          for (let i = 1; i <= teamsPerGroup; i++) {
            for (let j = i + 1; j <= teamsPerGroup; j++) {
              allSlots.push({
                slotId: `${stageId}-G${groupName}-M${slotCounter}`,
                stageId,
                roundId,
                position: slotCounter,
                label: `Gr. ${groupName}: ${i}º vs ${j}º`,
                participantA: createUnresolvedParticipantSlot(
                  'A',
                  { type: 'group-position', stageId, groupIndex: g, position: i },
                  `${i}º Grupo ${groupName}`,
                ),
                participantB: createUnresolvedParticipantSlot(
                  'B',
                  { type: 'group-position', stageId, groupIndex: g, position: j },
                  `${j}º Grupo ${groupName}`,
                ),
              });
              slotCounter++;
            }
          }
        }
      } else if (stage.type === 'knockout' || stage.type === 'play-in') {
        const bracketSize = stage.eliminationConfig?.bracketSize ?? 8;
        const pairingStrategy: PairingStrategyType =
          stage.pairingConfig && 'strategy' in stage.pairingConfig
            ? (stage.pairingConfig as { strategy: PairingStrategyType }).strategy
            : stage.pairing?.strategy ?? 'seeded-bracket';
        const rawFeeds = stage.participantFeeds ?? stage.participantFeed ?? [];

        // Expande feeds, resolvendo referências de 'stage-winners' para os slots reais da fase anterior
        const expandedFeeds: ParticipantFeedDefinition[] = [];
        for (const feed of rawFeeds) {
          if (feed.type === 'stage-winners') {
            const sourceSlots = allSlots.filter((s) => s.stageId === feed.stageId);
            const sourceStage = stages.find((st) => getStageId(st) === feed.stageId);
            const sourceRounds = sourceStage?.rounds ?? [];
            const lastRoundId = sourceRounds.length > 0 ? sourceRounds[sourceRounds.length - 1].roundId : undefined;
            const targetSourceSlots = lastRoundId
              ? sourceSlots.filter((s) => s.roundId === lastRoundId)
              : sourceSlots;

            if (targetSourceSlots.length > 0) {
              for (const srcSlot of targetSourceSlots) {
                expandedFeeds.push({
                  type: 'match-winner',
                  slotId: srcSlot.slotId,
                });
              }
            } else {
              expandedFeeds.push(feed);
            }
          } else {
            expandedFeeds.push(feed);
          }
        }

        // Constrói participantes iniciais da fase a partir dos feeds declarados/expandidos
        const participants: ParticipantSlotState[] = [];
        for (let i = 0; i < bracketSize; i++) {
          const feed = expandedFeeds[i];
          if (feed) {
            if (feed.type === 'bye') {
              participants.push(createByeParticipantSlot('A'));
            } else if (feed.type === 'seed') {
              participants.push(
                createUnresolvedParticipantSlot('A', { type: 'seed', seedNumber: feed.seedNumber }, `Seed #${feed.seedNumber}`),
              );
            } else if (feed.type === 'overall-ranking') {
              participants.push(
                createUnresolvedParticipantSlot('A', { type: 'overall-ranking', stageId: feed.stageId, position: feed.position }, `${feed.position}º Geral`),
              );
            } else if (feed.type === 'group-position') {
              const grpName = String.fromCharCode(65 + feed.groupIndex);
              participants.push(
                createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: feed.stageId, groupIndex: feed.groupIndex, position: feed.position }, `${feed.position}º Grupo ${grpName}`),
              );
            } else if (feed.type === 'match-winner') {
              const srcSlot = allSlots.find((s) => s.slotId === feed.slotId);
              participants.push(
                createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: feed.slotId }, srcSlot ? `Vencedor ${srcSlot.label || srcSlot.slotId}` : `Vencedor ${feed.slotId}`),
              );
            } else if (feed.type === 'match-loser') {
              const srcSlot = allSlots.find((s) => s.slotId === feed.slotId);
              participants.push(
                createUnresolvedParticipantSlot('A', { type: 'match-loser', slotId: feed.slotId }, srcSlot ? `Perdedor ${srcSlot.label || srcSlot.slotId}` : `Perdedor ${feed.slotId}`),
              );
            } else if (feed.type === 'stage-position') {
              participants.push(
                createUnresolvedParticipantSlot('A', { type: 'stage-position', stageId: feed.stageId, position: feed.position }, `${feed.position}º da Fase`),
              );
            } else {
              participants.push(
                createUnresolvedParticipantSlot('A', { type: 'seed', seedNumber: i + 1 }, `Classificado #${i + 1}`),
              );
            }
          } else {
            participants.push(
              createUnresolvedParticipantSlot('A', { type: 'seed', seedNumber: i + 1 }, `Participante #${i + 1}`),
            );
          }
        }

        // Utiliza o GenericPairingEngine puro para gerar os slots da primeira rodada da fase
        const firstRound = rounds[0] ?? { roundId: `${stageId}-r1`, stageId, order: 1, name: 'Rodada 1' };
        try {
          const firstRoundSlots = GenericPairingEngine.pair(
            participants,
            { strategy: pairingStrategy, bracketSize },
            { stageId, roundId: firstRound.roundId, slotIdPrefix: `${stageId}-slot` },
          );
          allSlots.push(...firstRoundSlots);

          // Conecta progressionRoutes nos slots de origem referenciados via match-winner na primeira rodada
          for (const targetSlot of firstRoundSlots) {
            if (targetSlot.participantA.reference.type === 'match-winner') {
              const srcSlot = allSlots.find((s) => s.slotId === (targetSlot.participantA.reference as { slotId: string }).slotId);
              if (srcSlot) {
                srcSlot.progressionRoute = {
                  sourceSlotId: srcSlot.slotId,
                  ...srcSlot.progressionRoute,
                  onWinner: {
                    targetStageId: targetSlot.stageId,
                    targetRoundId: targetSlot.roundId,
                    targetSlotId: targetSlot.slotId,
                    targetSide: 'A',
                  },
                };
              }
            }
            if (targetSlot.participantB.reference.type === 'match-winner') {
              const srcSlot = allSlots.find((s) => s.slotId === (targetSlot.participantB.reference as { slotId: string }).slotId);
              if (srcSlot) {
                srcSlot.progressionRoute = {
                  sourceSlotId: srcSlot.slotId,
                  ...srcSlot.progressionRoute,
                  onWinner: {
                    targetStageId: targetSlot.stageId,
                    targetRoundId: targetSlot.roundId,
                    targetSlotId: targetSlot.slotId,
                    targetSide: 'B',
                  },
                };
              }
            }
          }

          // Gera slots encadeados para as rodadas seguintes (Semifinais, Final, etc.)
          for (let r = 1; r < rounds.length; r++) {
            const currentRound = rounds[r];
            const prevRound = rounds[r - 1];
            const prevSlots = allSlots.filter((s) => s.stageId === stageId && s.roundId === prevRound.roundId);
            const slotsCount = Math.max(1, Math.floor(prevSlots.length / 2));

            for (let s = 0; s < slotsCount; s++) {
              const srcA = prevSlots[s * 2];
              const srcB = prevSlots[s * 2 + 1];
              const slotId = `${stageId}-${currentRound.roundId}-M${s + 1}`;

              const newSlot: MatchSlot = {
                slotId,
                stageId,
                roundId: currentRound.roundId,
                position: s + 1,
                label: `${currentRound.name} #${s + 1}`,
                participantA: createUnresolvedParticipantSlot(
                  'A',
                  srcA ? { type: 'match-winner', slotId: srcA.slotId } : { type: 'seed', seedNumber: 1 },
                  srcA ? `Vencedor ${srcA.label || srcA.slotId}` : 'A definir',
                ),
                participantB: createUnresolvedParticipantSlot(
                  'B',
                  srcB ? { type: 'match-winner', slotId: srcB.slotId } : { type: 'seed', seedNumber: 2 },
                  srcB ? `Vencedor ${srcB.label || srcB.slotId}` : 'A definir',
                ),
              };

              allSlots.push(newSlot);

              // Conecta progressionRoute.onWinner nos slots da rodada anterior
              if (srcA) {
                srcA.progressionRoute = {
                  sourceSlotId: srcA.slotId,
                  ...srcA.progressionRoute,
                  onWinner: {
                    targetStageId: stageId,
                    targetRoundId: currentRound.roundId,
                    targetSlotId: slotId,
                    targetSide: 'A',
                  },
                };
              }
              if (srcB) {
                srcB.progressionRoute = {
                  sourceSlotId: srcB.slotId,
                  ...srcB.progressionRoute,
                  onWinner: {
                    targetStageId: stageId,
                    targetRoundId: currentRound.roundId,
                    targetSlotId: slotId,
                    targetSide: 'B',
                  },
                };
              }
            }

            // Se for a última rodada eliminatória e tiver disputa de 3º lugar (hasThirdPlaceMatch)
            // e a rodada anterior tiver exatamente 2 partidas (Semifinais), gera a Disputa de 3º Lugar
            const isLastRound = r === rounds.length - 1;
            const hasThirdPlace = stage.eliminationConfig?.hasThirdPlaceMatch ?? false;
            if (isLastRound && hasThirdPlace && prevSlots.length === 2) {
              const sf1 = prevSlots[0];
              const sf2 = prevSlots[1];
              const thirdPlaceSlotId = `${stageId}-${currentRound.roundId}-3RD`;

              const thirdPlaceSlot: MatchSlot = {
                slotId: thirdPlaceSlotId,
                stageId,
                roundId: currentRound.roundId,
                position: slotsCount + 1,
                label: 'Disputa de 3º Lugar',
                participantA: createUnresolvedParticipantSlot(
                  'A',
                  { type: 'match-loser', slotId: sf1.slotId },
                  `Perdedor ${sf1.label || sf1.slotId}`,
                ),
                participantB: createUnresolvedParticipantSlot(
                  'B',
                  { type: 'match-loser', slotId: sf2.slotId },
                  `Perdedor ${sf2.label || sf2.slotId}`,
                ),
              };

              allSlots.push(thirdPlaceSlot);

              // Atualiza onLoser nas semifinais
              if (sf1) {
                sf1.progressionRoute = {
                  sourceSlotId: sf1.slotId,
                  ...sf1.progressionRoute,
                  onLoser: {
                    targetStageId: stageId,
                    targetRoundId: currentRound.roundId,
                    targetSlotId: thirdPlaceSlotId,
                    targetSide: 'A',
                  },
                };
              }
              if (sf2) {
                sf2.progressionRoute = {
                  sourceSlotId: sf2.slotId,
                  ...sf2.progressionRoute,
                  onLoser: {
                    targetStageId: stageId,
                    targetRoundId: currentRound.roundId,
                    targetSlotId: thirdPlaceSlotId,
                    targetSide: 'B',
                  },
                };
              }
            }
          }
        } catch {
          // Se o pareamento estrito falhar na simulação de preview, gera estrutura fallback limpa
          for (let r = 0; r < rounds.length; r++) {
            const rnd = rounds[r];
            const slotsCount = rnd.slotsCount ?? Math.max(1, Math.pow(2, rounds.length - r - 1));
            for (let s = 1; s <= slotsCount; s++) {
              allSlots.push({
                slotId: `${stageId}-${rnd.roundId}-S${s}`,
                stageId,
                roundId: rnd.roundId,
                position: s,
                label: `${rnd.name} ${s}`,
                participantA: createUnresolvedParticipantSlot('A', { type: 'seed', seedNumber: s * 2 - 1 }, `Participante A`),
                participantB: createUnresolvedParticipantSlot('B', { type: 'seed', seedNumber: s * 2 }, `Participante B`),
              });
            }
          }
        }
      }
    }

    return { stages, slots: allSlots };
  }
}
