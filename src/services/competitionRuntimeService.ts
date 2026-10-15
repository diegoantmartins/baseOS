/**
 * BaseOS — CompetitionRuntimeService (Orquestrador Runtime de Competição)
 *
 * Responsável por:
 * 1. Coordenar a integração runtime do Competition Format Engine;
 * 2. Consumir CanonicalMatchResult oficial emitido por CompetitionRulesService;
 * 3. Delegar a avaliação esportiva ao GenericProgressionEngine e ParticipantResolutionEngine;
 * 4. Propagar resultados de forma transacional e idempotente via dataAccess.propagateSlotOutcome;
 * 5. Processar seletivamente slots afluentes (processAffectedSlots) e reconciliar (reconcileCompetitionRuntime);
 * 6. Materializar partidas reais (Match) somente quando ambos os participantes estiverem resolvidos,
 *    delegando a autoridade de concorrência e integridade ao dataAccess.materializeSlotMatch;
 * 7. Orquestrar avanço por BYE estritamente a partir das decisões do engine puro;
 * 8. NUNCA duplicar regras esportivas, recriar motores ou criar equipes fictícias.
 */

import type {
  CanonicalMatchResult,
  MatchSlot,
  ParticipantReference,
  ProgressionRoute,
  StageDefinition,
} from '@/types/competitionConfig';
import type { CompetitionRecord, MatchRecord, MatchSlotRecord, TeamRecord } from '@/types/entities';
import { CompetitionLifecycleService } from './competitionLifecycleService';
import { CompetitionRulesService } from './competitionRulesService';
import { dataAccess, isArtificialTeamId, type MaterializeSlotMatchResult, type PropagateSlotOutcomeResult } from './dataAccess';
import { GenericProgressionEngine, type AdvancementEntry } from './genericProgressionEngine';
import { OverallStandingsEngine, type OverallStandingResult } from './overallStandingsEngine';
import { ParticipantResolutionEngine, type ResolutionContext } from './participantResolutionEngine';
import { StageGraph } from './stageGraphEngine';
import { computeStandingsByGroup, type StandingInput, type StandingsByGroup } from './standingsService';

export interface RuntimeExecutionSummary {
  ok: boolean;
  competitionId: string;
  sourceSlotId?: string;
  matchId?: string;
  canonicalResult?: CanonicalMatchResult;
  propagation?: PropagateSlotOutcomeResult;
  affectedSlotsCount: number;
  materializedMatches: MaterializeSlotMatchResult[];
  byeAdvancementsCount: number;
  idempotent?: boolean;
  message?: string;
}

export interface ReconcileRuntimeSummary {
  ok: boolean;
  competitionId: string;
  totalSlots: number;
  resolvedSlots: number;
  materializedMatches: MaterializeSlotMatchResult[];
  byeAdvancementsCount: number;
  message?: string;
}

export class CompetitionRuntimeService {
  /**
   * 1. Resolução Canônica Oficial do Resultado
   * Consome o resultado oficial da partida sem recalcular regras esportivas.
   */
  public static resolveMatchResult(
    competition: CompetitionRecord,
    match: MatchRecord,
  ): CanonicalMatchResult {
    return CompetitionRulesService.getCanonicalMatchResult(competition, match);
  }

  /**
   * 2. Avaliação Pura de Progressão
   * Delega ao GenericProgressionEngine para derivar rotas de avanço esportivo.
   */
  public static resolveProgression(
    slots: MatchSlot[],
    canonicalResultsBySlot: Record<string, CanonicalMatchResult>,
    teams?: TeamRecord[],
    routes?: ProgressionRoute[],
  ) {
    return GenericProgressionEngine.evaluate(slots, {
      canonicalResultsBySlot,
      teams,
      routes,
    });
  }

  /**
   * 3. Persistência Transacional de Propagação
   * Executa a propagação com locks ordenados e idempotência via dataAccess.
   */
  public static async persistProgression(
    competitionId: string,
    slotId: string,
    winnerTeamId?: string | null,
    loserTeamId?: string | null,
    matchId?: string | null,
  ): Promise<PropagateSlotOutcomeResult> {
    return dataAccess.propagateSlotOutcome({
      competitionId,
      slotId,
      winnerTeamId,
      loserTeamId,
      matchId,
    });
  }

  /**
   * 4. Processamento Seletivo dos Slots Afluentes
   * Otimização de runtime: processa exclusivamente os slots de destino afetados
   * pela progressão de uma partida concluída.
   */
  public static async processAffectedSlots(
    competitionId: string,
    affectedSlotIds: string[],
  ): Promise<MaterializeSlotMatchResult[]> {
    if (!affectedSlotIds || affectedSlotIds.length === 0) {
      return [];
    }

    const uniqueSlotIds = Array.from(new Set(affectedSlotIds));
    const allSlots = await dataAccess.listMatchSlots(competitionId);
    const affectedSlots = allSlots.filter(s => uniqueSlotIds.includes(s.slotId));

    if (affectedSlots.length === 0) {
      return [];
    }

    // Carrega contexto da competição para resolução
    const competition = await dataAccess.getCompetition(competitionId);
    const teams = await dataAccess.listTeams();
    const matches = await dataAccess.listMatches(competitionId);

    const context = await this.buildResolutionContext(competition, allSlots, teams, matches);

    // Converte registros para MatchSlot de domínio puro e resolve
    const domainSlots = affectedSlots.map(r => this.recordToMatchSlot(r));
    const resolvedDomainSlots = ParticipantResolutionEngine.resolveSlots(domainSlots, context);

    // Atualiza projeções resolvidas nos slots do banco
    for (const resSlot of resolvedDomainSlots) {
      const orig = affectedSlots.find(s => s.slotId === resSlot.slotId);
      if (!orig) continue;

      const updates: Partial<MatchSlotRecord> = {};
      let changed = false;

      if (resSlot.participantA.status === 'resolved' && resSlot.participantA.resolvedTeamId) {
        if (orig.resolvedTeamAId !== resSlot.participantA.resolvedTeamId || orig.participantAStatus !== 'resolved') {
          updates.resolvedTeamAId = resSlot.participantA.resolvedTeamId;
          updates.participantAStatus = 'resolved';
          changed = true;
        }
      }
      if (resSlot.participantB.status === 'resolved' && resSlot.participantB.resolvedTeamId) {
        if (orig.resolvedTeamBId !== resSlot.participantB.resolvedTeamId || orig.participantBStatus !== 'resolved') {
          updates.resolvedTeamBId = resSlot.participantB.resolvedTeamId;
          updates.participantBStatus = 'resolved';
          changed = true;
        }
      }

      if (changed) {
        await dataAccess.updateMatchSlot(orig.id, updates);
        orig.resolvedTeamAId = updates.resolvedTeamAId ?? orig.resolvedTeamAId;
        orig.resolvedTeamBId = updates.resolvedTeamBId ?? orig.resolvedTeamBId;
        orig.participantAStatus = updates.participantAStatus ?? orig.participantAStatus;
        orig.participantBStatus = updates.participantBStatus ?? orig.participantBStatus;
      }
    }

    // Materializa partidas para os slots elegíveis
    return this.materializeEligibleMatches(competitionId, affectedSlots);
  }

  /**
   * 5. Materialização de Partidas Elegíveis
   * Identifica slots onde ambos os participantes foram resolvidos e cria o Match correspondente,
   * delegando a atomicidade e concorrência para dataAccess.materializeSlotMatch.
   */
  public static async materializeEligibleMatches(
    competitionId: string,
    slots: MatchSlotRecord[],
  ): Promise<MaterializeSlotMatchResult[]> {
    const results: MaterializeSlotMatchResult[] = [];

    for (const slot of slots) {
      // Elegibilidade: ambos os lados resolvidos com equipes legítimas e sem Match já criado
      const aResolved = slot.participantAStatus === 'resolved' && Boolean(slot.resolvedTeamAId);
      const bResolved = slot.participantBStatus === 'resolved' && Boolean(slot.resolvedTeamBId);

      if (!aResolved || !bResolved) {
        continue;
      }

      // Rejeição rigorosa anti-fake team
      if (isArtificialTeamId(slot.resolvedTeamAId) || isArtificialTeamId(slot.resolvedTeamBId)) {
        continue;
      }

      const matResult = await dataAccess.materializeSlotMatch({
        competitionId,
        slotId: slot.slotId,
        phase: slot.label ?? undefined,
      });

      if (matResult.ok) {
        slot.matchId = matResult.matchId;
        results.push(matResult);
      }
    }

    return results;
  }

  /**
   * 6. Orquestração de Folgas Esportivas (BYE)
   * Delega integralmente ao GenericProgressionEngine a identificação de folgas.
   * O runtime apenas executa a propagação do avanço determinado pelo motor puro.
   */
  public static async advanceByes(
    competitionId: string,
    stageId?: string,
  ): Promise<number> {
    const allSlots = await dataAccess.listMatchSlots(competitionId);
    const candidateSlots = stageId
      ? allSlots.filter(s => s.stageRowId === stageId)
      : allSlots;

    if (candidateSlots.length === 0) return 0;

    const domainSlots = candidateSlots.map(s => this.recordToMatchSlot(s));
    const teams = await dataAccess.listTeams();

    // GenericProgressionEngine avalia BYE nativamente
    const evalResult = GenericProgressionEngine.evaluate(domainSlots, {
      canonicalResultsBySlot: {},
      teams,
    });

    const byeAdvancements = evalResult.advancements.filter(a => a.type === 'bye-advance');
    let advancedCount = 0;

    for (const byeAdv of byeAdvancements) {
      const sourceRecord = candidateSlots.find(s => s.slotId === byeAdv.sourceSlotId);
      const targetRecord = allSlots.find(s => s.slotId === byeAdv.targetSlotId);

      if (!sourceRecord || !targetRecord) continue;

      // Se o destino já tiver esta equipe resolvida no lado correto, já avançou
      const alreadySet = byeAdv.targetSide === 'A'
        ? targetRecord.resolvedTeamAId === byeAdv.teamId && targetRecord.participantAStatus === 'resolved'
        : targetRecord.resolvedTeamBId === byeAdv.teamId && targetRecord.participantBStatus === 'resolved';

      if (alreadySet) continue;

      // Propaga avanço via dataAccess
      const propResult = await dataAccess.propagateSlotOutcome({
        competitionId,
        slotId: byeAdv.sourceSlotId,
        winnerTeamId: byeAdv.teamId,
      });

      if (propResult.ok) {
        advancedCount++;
        // Processa slots afluentes ao destino
        await this.processAffectedSlots(competitionId, [byeAdv.targetSlotId]);
      }
    }

    return advancedCount;
  }

  /**
   * 7. Orquestrador Principal do Ciclo de Vida da Partida Concluída
   * Encadeia:
   * Match -> CanonicalMatchResult -> GenericProgressionEngine ->
   * rpc_propagate_slot_outcome -> processAffectedSlots ->
   * rpc_materialize_slot_match -> advanceByes.
   */
  public static async handleMatchCompleted(
    competitionId: string,
    matchId: string,
  ): Promise<RuntimeExecutionSummary> {
    const match = await dataAccess.getMatch(matchId);
    if (!match) {
      return {
        ok: false,
        competitionId,
        matchId,
        affectedSlotsCount: 0,
        materializedMatches: [],
        byeAdvancementsCount: 0,
        message: `Partida ${matchId} não encontrada`,
      };
    }

    const competition = await dataAccess.getCompetition(competitionId);
    if (!competition) {
      return {
        ok: false,
        competitionId,
        matchId,
        affectedSlotsCount: 0,
        materializedMatches: [],
        byeAdvancementsCount: 0,
        message: `Competição ${competitionId} não encontrada`,
      };
    }

    // 7.1. Resultado Canônico
    const canonical = this.resolveMatchResult(competition, match);
    if (!canonical.isValid || !canonical.isCompleted || !canonical.winnerId) {
      return {
        ok: false,
        competitionId,
        matchId,
        canonicalResult: canonical,
        affectedSlotsCount: 0,
        materializedMatches: [],
        byeAdvancementsCount: 0,
        message: 'Partida não completada ou com resultado canônico inválido/inconsistente',
      };
    }

    // 7.2. Identificação do Slot de Origem
    const allSlots = await dataAccess.listMatchSlots(competitionId);
    const sourceSlot = allSlots.find(s => s.matchId === matchId || s.slotId === match.slotId);

    if (!sourceSlot) {
      // Competição ou fase legada sem slots de chaveamento
      return {
        ok: true,
        competitionId,
        matchId,
        canonicalResult: canonical,
        affectedSlotsCount: 0,
        materializedMatches: [],
        byeAdvancementsCount: 0,
        idempotent: true,
        message: 'Nenhum MatchSlot associado ao match. Ignorando progressão por slots.',
      };
    }

    // 7.3. Persistência Transacional via RPC
    const propagation = await this.persistProgression(
      competitionId,
      sourceSlot.slotId,
      canonical.winnerId,
      canonical.loserId,
      matchId,
    );

    // 7.4. Mapeamento de Slots Afetados
    const affectedSlotIds: string[] = [];

    // Rota explícita no slot de origem
    if (sourceSlot.progressionRoute) {
      if (sourceSlot.progressionRoute.onWinner?.targetSlotId) {
        affectedSlotIds.push(sourceSlot.progressionRoute.onWinner.targetSlotId);
      }
      if (sourceSlot.progressionRoute.onLoser?.targetSlotId) {
        affectedSlotIds.push(sourceSlot.progressionRoute.onLoser.targetSlotId);
      }
    }

    // Slots que referenciam match-winner ou match-loser do slot de origem
    for (const slot of allSlots) {
      const partA = slot.participantAReference as Record<string, unknown>;
      const partB = slot.participantBReference as Record<string, unknown>;
      if (partA && (partA.type === 'match-winner' || partA.type === 'match-loser')) {
        if (partA.slotId === sourceSlot.slotId || partA.slot_id === sourceSlot.slotId) {
          affectedSlotIds.push(slot.slotId);
        }
      }
      if (partB && (partB.type === 'match-winner' || partB.type === 'match-loser')) {
        if (partB.slotId === sourceSlot.slotId || partB.slot_id === sourceSlot.slotId) {
          affectedSlotIds.push(slot.slotId);
        }
      }
    }

    // 7.5. Processamento Seletivo dos Destinos e Materialização dos Próximos Matches
    const materializedMatches = await this.processAffectedSlots(competitionId, affectedSlotIds);

    // 7.6. Avaliação de eventuais BYEs desbloqueados
    const byeCount = await this.advanceByes(competitionId);

    // 7.7. Sincronização do ciclo de vida da competição (Turno Único auto-conclusão / groups-defined)
    await CompetitionLifecycleService.syncLifecycleAfterMatchProgression(
      competitionId,
      'Runtime Progression Engine',
    );

    return {
      ok: true,
      competitionId,
      sourceSlotId: sourceSlot.slotId,
      matchId,
      canonicalResult: canonical,
      propagation,
      affectedSlotsCount: affectedSlotIds.length,
      materializedMatches,
      byeAdvancementsCount: byeCount,
      idempotent: propagation.idempotent,
    };
  }

  /**
   * 8. Reconciliação Global do Runtime
   * Ferramenta de auditoria, recuperação de falhas parciais e bootstrap de fases.
   * Recalcula o grafo de slots e materializa qualquer partida pendente elegível.
   */
  public static async reconcileCompetitionRuntime(
    competitionId: string,
  ): Promise<ReconcileRuntimeSummary> {
    // Se não houver slots cadastrados, avalia inicialização automática do DAG para formatos de 3 grupos com Play-In
    let allSlots = await dataAccess.listMatchSlots(competitionId);
    if (allSlots.length === 0) {
      allSlots = await this.ensureDAGSlotsForThreeGroupPlayIn(competitionId);
    }

    if (allSlots.length === 0) {
      return {
        ok: true,
        competitionId,
        totalSlots: 0,
        resolvedSlots: 0,
        materializedMatches: [],
        byeAdvancementsCount: 0,
        message: 'Nenhum slot para reconciliar',
      };
    }

    const competition = await dataAccess.getCompetition(competitionId);
    const teams = await dataAccess.listTeams();
    const matches = await dataAccess.listMatches(competitionId);

    const context = await this.buildResolutionContext(competition, allSlots, teams, matches);

    // Resolve todos os slots
    const domainSlots = allSlots.map(r => this.recordToMatchSlot(r));
    const resolvedDomainSlots = ParticipantResolutionEngine.resolveSlots(domainSlots, context);

    let resolvedCount = 0;
    for (const resSlot of resolvedDomainSlots) {
      const orig = allSlots.find(s => s.slotId === resSlot.slotId);
      if (!orig) continue;

      const updates: Partial<MatchSlotRecord> = {};
      let changed = false;

      if (resSlot.participantA.status === 'resolved' && resSlot.participantA.resolvedTeamId) {
        if (orig.resolvedTeamAId !== resSlot.participantA.resolvedTeamId || orig.participantAStatus !== 'resolved') {
          updates.resolvedTeamAId = resSlot.participantA.resolvedTeamId;
          updates.participantAStatus = 'resolved';
          changed = true;
        }
      }
      if (resSlot.participantB.status === 'resolved' && resSlot.participantB.resolvedTeamId) {
        if (orig.resolvedTeamBId !== resSlot.participantB.resolvedTeamId || orig.participantBStatus !== 'resolved') {
          updates.resolvedTeamBId = resSlot.participantB.resolvedTeamId;
          updates.participantBStatus = 'resolved';
          changed = true;
        }
      }

      if (changed) {
        await dataAccess.updateMatchSlot(orig.id, updates);
        orig.resolvedTeamAId = updates.resolvedTeamAId ?? orig.resolvedTeamAId;
        orig.resolvedTeamBId = updates.resolvedTeamBId ?? orig.resolvedTeamBId;
        orig.participantAStatus = updates.participantAStatus ?? orig.participantAStatus;
        orig.participantBStatus = updates.participantBStatus ?? orig.participantBStatus;
      }

      if (orig.participantAStatus === 'resolved' && orig.participantBStatus === 'resolved') {
        resolvedCount++;
      }
    }

    // Materializa partidas pendentes
    const materializedMatches = await this.materializeEligibleMatches(competitionId, allSlots);

    // Trata BYEs pendentes
    const byeAdvancementsCount = await this.advanceByes(competitionId);

    return {
      ok: true,
      competitionId,
      totalSlots: allSlots.length,
      resolvedSlots: resolvedCount,
      materializedMatches,
      byeAdvancementsCount,
      message: 'Reconciliação runtime concluída com sucesso',
    };
  }

  /**
   * Inicializa deterministicamente os nós de estágios, rodadas e MatchSlots do Grafo DAG
   * para competições de 3 chaves [4, 3, 3] com Repescagem (7º-10º) e Quartas de Final.
   */
  public static async ensureDAGSlotsForThreeGroupPlayIn(
    competitionId: string,
  ): Promise<MatchSlotRecord[]> {
    const existingSlots = await dataAccess.listMatchSlots(competitionId);
    if (existingSlots.length > 0) {
      return existingSlots;
    }

    const comp = await dataAccess.getCompetition(competitionId);
    if (!comp) return [];

    const isThreeGroupsFormat =
      comp.format === 'groups-play-in-knockout' ||
      comp.groupsCount === 3 ||
      comp.config?.format?.formatType === 'groups-play-in-knockout' ||
      Boolean(comp.config?.format?.stages?.some((s) => s.type === 'play-in' || s.id === 'play-in'));

    if (!isThreeGroupsFormat) {
      return [];
    }

    const stages = await dataAccess.listStages(competitionId);

    // 1. Fase de Grupos
    let groupStage = stages.find(
      (s) =>
        s.stageId === 'fase-grupos' ||
        s.stageType === 'groups' ||
        s.stageType === 'group-stage' ||
        s.stageType === 'round-robin',
    );
    if (!groupStage) {
      groupStage = await dataAccess.createStage({
        competitionId,
        stageId: 'fase-grupos',
        name: 'Fase de Grupos (3 Chaves)',
        stageOrder: 1,
        stageType: 'group-stage',
        status: 'in-progress',
        isLocked: false,
        metadata: {},
      });
    }

    // 2. Repescagem / Play-In
    let playInStage = stages.find((s) => s.stageId === 'play-in' || s.stageType === 'play-in');
    if (!playInStage) {
      playInStage = await dataAccess.createStage({
        competitionId,
        stageId: 'play-in',
        name: 'Repescagem / Play-In (7º ao 10º)',
        stageOrder: 2,
        stageType: 'play-in',
        status: 'pending',
        isLocked: false,
        metadata: {},
      });
    }

    // 3. Fase Final (Quartas, Semis, Final)
    let finalStage = stages.find(
      (s) =>
        s.stageId === 'fase-final' ||
        s.stageId === 'playoffs' ||
        s.stageType === 'knockout' ||
        s.stageType === 'playoffs',
    );
    if (!finalStage) {
      finalStage = await dataAccess.createStage({
        competitionId,
        stageId: 'fase-final',
        name: 'Fase Final (Quartas, Semis e Final)',
        stageOrder: 3,
        stageType: 'knockout',
        status: 'pending',
        isLocked: false,
        metadata: {},
      });
    }

    // Garante rodadas
    const rounds = await dataAccess.listRounds(competitionId);

    let roundPlayIn = rounds.find(
      (r) => r.stageRowId === playInStage!.id && (r.roundId === 'rodada-play-in' || r.roundOrder === 1),
    );
    if (!roundPlayIn) {
      roundPlayIn = await dataAccess.createRound({
        competitionId,
        stageRowId: playInStage!.id,
        roundId: 'rodada-play-in',
        name: 'Repescagem (Eliminatória)',
        roundOrder: 1,
        slotsCount: 2,
        status: 'pending',
      });
    }

    let roundQF = rounds.find(
      (r) => r.stageRowId === finalStage!.id && (r.roundId === 'quartas' || r.roundOrder === 1),
    );
    if (!roundQF) {
      roundQF = await dataAccess.createRound({
        competitionId,
        stageRowId: finalStage!.id,
        roundId: 'quartas',
        name: 'Quartas de Final',
        roundOrder: 1,
        slotsCount: 4,
        status: 'pending',
      });
    }

    let roundSF = rounds.find(
      (r) => r.stageRowId === finalStage!.id && (r.roundId === 'semifinais' || r.roundOrder === 2),
    );
    if (!roundSF) {
      roundSF = await dataAccess.createRound({
        competitionId,
        stageRowId: finalStage!.id,
        roundId: 'semifinais',
        name: 'Semifinais',
        roundOrder: 2,
        slotsCount: 2,
        status: 'pending',
      });
    }

    let roundBronze = rounds.find(
      (r) => r.stageRowId === finalStage!.id && (r.roundId === 'terceiro-lugar' || r.roundOrder === 3),
    );
    if (!roundBronze) {
      roundBronze = await dataAccess.createRound({
        competitionId,
        stageRowId: finalStage!.id,
        roundId: 'terceiro-lugar',
        name: 'Disputa de 3º Lugar',
        roundOrder: 3,
        slotsCount: 1,
        status: 'pending',
      });
    }

    let roundFinal = rounds.find(
      (r) => r.stageRowId === finalStage!.id && (r.roundId === 'final' || r.roundOrder === 4),
    );
    if (!roundFinal) {
      roundFinal = await dataAccess.createRound({
        competitionId,
        stageRowId: finalStage!.id,
        roundId: 'final',
        name: 'Grande Final',
        roundOrder: 4,
        slotsCount: 1,
        status: 'pending',
      });
    }

    // Topologia dos 10 Slots do Grafo DAG Relacional
    const slotsToCreate = [
      // 1. Repescagem / Play-In
      {
        slotId: 'R1',
        stageRowId: playInStage!.id,
        roundRowId: roundPlayIn.id,
        position: 1,
        label: 'Repescagem 1 (7º x 10º)',
        participantAReference: { type: 'overall-ranking' as const, position: 7, stageId: groupStage.stageId },
        participantBReference: { type: 'overall-ranking' as const, position: 10, stageId: groupStage.stageId },
        progressionRoute: {
          sourceSlotId: 'R1',
          onWinner: { targetStageId: finalStage!.id, targetRoundId: roundQF.id, targetSlotId: 'QF-03', targetSide: 'B' as const },
        },
      },
      {
        slotId: 'R2',
        stageRowId: playInStage!.id,
        roundRowId: roundPlayIn.id,
        position: 2,
        label: 'Repescagem 2 (8º x 9º)',
        participantAReference: { type: 'overall-ranking' as const, position: 8, stageId: groupStage.stageId },
        participantBReference: { type: 'overall-ranking' as const, position: 9, stageId: groupStage.stageId },
        progressionRoute: {
          sourceSlotId: 'R2',
          onWinner: { targetStageId: finalStage!.id, targetRoundId: roundQF.id, targetSlotId: 'QF-01', targetSide: 'B' as const },
        },
      },

      // 2. Quartas de Final
      {
        slotId: 'QF-01',
        stageRowId: finalStage!.id,
        roundRowId: roundQF.id,
        position: 1,
        label: 'Quartas 1 (1º Geral x Venc. Repescagem 2)',
        participantAReference: { type: 'overall-ranking' as const, position: 1, stageId: groupStage.stageId },
        participantBReference: { type: 'match-winner' as const, slotId: 'R2' },
        progressionRoute: {
          sourceSlotId: 'QF-01',
          onWinner: { targetStageId: finalStage!.id, targetRoundId: roundSF.id, targetSlotId: 'SF-01', targetSide: 'A' as const },
        },
      },
      {
        slotId: 'QF-02',
        stageRowId: finalStage!.id,
        roundRowId: roundQF.id,
        position: 2,
        label: 'Quartas 2 (4º Geral x 5º Geral)',
        participantAReference: { type: 'overall-ranking' as const, position: 4, stageId: groupStage.stageId },
        participantBReference: { type: 'overall-ranking' as const, position: 5, stageId: groupStage.stageId },
        progressionRoute: {
          sourceSlotId: 'QF-02',
          onWinner: { targetStageId: finalStage!.id, targetRoundId: roundSF.id, targetSlotId: 'SF-01', targetSide: 'B' as const },
        },
      },
      {
        slotId: 'QF-03',
        stageRowId: finalStage!.id,
        roundRowId: roundQF.id,
        position: 3,
        label: 'Quartas 3 (2º Geral x Venc. Repescagem 1)',
        participantAReference: { type: 'overall-ranking' as const, position: 2, stageId: groupStage.stageId },
        participantBReference: { type: 'match-winner' as const, slotId: 'R1' },
        progressionRoute: {
          sourceSlotId: 'QF-03',
          onWinner: { targetStageId: finalStage!.id, targetRoundId: roundSF.id, targetSlotId: 'SF-02', targetSide: 'A' as const },
        },
      },
      {
        slotId: 'QF-04',
        stageRowId: finalStage!.id,
        roundRowId: roundQF.id,
        position: 4,
        label: 'Quartas 4 (3º Geral x 6º Geral)',
        participantAReference: { type: 'overall-ranking' as const, position: 3, stageId: groupStage.stageId },
        participantBReference: { type: 'overall-ranking' as const, position: 6, stageId: groupStage.stageId },
        progressionRoute: {
          sourceSlotId: 'QF-04',
          onWinner: { targetStageId: finalStage!.id, targetRoundId: roundSF.id, targetSlotId: 'SF-02', targetSide: 'B' as const },
        },
      },

      // 3. Semifinais
      {
        slotId: 'SF-01',
        stageRowId: finalStage!.id,
        roundRowId: roundSF.id,
        position: 1,
        label: 'Semifinal 1',
        participantAReference: { type: 'match-winner' as const, slotId: 'QF-01' },
        participantBReference: { type: 'match-winner' as const, slotId: 'QF-02' },
        progressionRoute: {
          sourceSlotId: 'SF-01',
          onWinner: { targetStageId: finalStage!.id, targetRoundId: roundFinal.id, targetSlotId: 'FINAL-01', targetSide: 'A' as const },
          onLoser: { targetStageId: finalStage!.id, targetRoundId: roundBronze.id, targetSlotId: 'BRONZE-01', targetSide: 'A' as const },
        },
      },
      {
        slotId: 'SF-02',
        stageRowId: finalStage!.id,
        roundRowId: roundSF.id,
        position: 2,
        label: 'Semifinal 2',
        participantAReference: { type: 'match-winner' as const, slotId: 'QF-03' },
        participantBReference: { type: 'match-winner' as const, slotId: 'QF-04' },
        progressionRoute: {
          sourceSlotId: 'SF-02',
          onWinner: { targetStageId: finalStage!.id, targetRoundId: roundFinal.id, targetSlotId: 'FINAL-01', targetSide: 'B' as const },
          onLoser: { targetStageId: finalStage!.id, targetRoundId: roundBronze.id, targetSlotId: 'BRONZE-01', targetSide: 'B' as const },
        },
      },

      // 4. Disputa de 3º Lugar e Final
      {
        slotId: 'BRONZE-01',
        stageRowId: finalStage!.id,
        roundRowId: roundBronze.id,
        position: 1,
        label: 'Disputa de 3º Lugar',
        participantAReference: { type: 'match-loser' as const, slotId: 'SF-01' },
        participantBReference: { type: 'match-loser' as const, slotId: 'SF-02' },
      },
      {
        slotId: 'FINAL-01',
        stageRowId: finalStage!.id,
        roundRowId: roundFinal.id,
        position: 1,
        label: 'Grande Final',
        participantAReference: { type: 'match-winner' as const, slotId: 'SF-01' },
        participantBReference: { type: 'match-winner' as const, slotId: 'SF-02' },
      },
    ];

    const createdSlots: MatchSlotRecord[] = [];
    for (const slotDef of slotsToCreate) {
      const created = await dataAccess.createMatchSlot({
        competitionId,
        stageRowId: slotDef.stageRowId,
        roundRowId: slotDef.roundRowId,
        slotId: slotDef.slotId,
        position: slotDef.position,
        label: slotDef.label,
        participantAReference: slotDef.participantAReference,
        participantBReference: slotDef.participantBReference,
        progressionRoute: slotDef.progressionRoute,
      });
      createdSlots.push(created);
    }

    return createdSlots;
  }

  // ============================================================================
  // Helpers Privados de Resolução e Mapeamento
  // ============================================================================

  private static async buildResolutionContext(
    competition: CompetitionRecord | null,
    slots: MatchSlotRecord[],
    teams: TeamRecord[],
    matches: MatchRecord[],
  ): Promise<ResolutionContext> {
    const context: ResolutionContext = {
      teams,
      canonicalResultsBySlot: {},
      standingsByStage: {},
      overallStandingsByStage: {},
    };

    // Mapeia CanonicalMatchResult para cada partida com slot
    for (const match of matches) {
      if (match.status === 'completed' || match.status === 'homologated') {
        const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, match);
        if (match.slotId) {
          context.canonicalResultsBySlot![match.slotId] = canonical;
        }
        const associatedSlot = slots.find(s => s.matchId === match.id);
        if (associatedSlot) {
          context.canonicalResultsBySlot![associatedSlot.slotId] = canonical;
        }
      }
    }

    // Se houver estágios com fase de grupos, calcula Standings
    if (competition) {
      const stages = await dataAccess.listStages(competition.id);
      const groupStages = stages.filter(
        s => s.stageType === 'groups' || s.stageType === 'round-robin' || s.stageType === 'group-stage',
      );

      const processGroupMatches = (stageKeys: string[], groupMatches: MatchRecord[]) => {
        // Mapeia os grupos das equipes a partir dos matches ou metadados
        const teamGroupMap = new Map<string, string>();
        for (const m of groupMatches) {
          if (m.groupName) {
            if (m.teamAId && !teamGroupMap.has(m.teamAId)) teamGroupMap.set(m.teamAId, m.groupName);
            if (m.teamBId && !teamGroupMap.has(m.teamBId)) teamGroupMap.set(m.teamBId, m.groupName);
          }
        }

        // Garante ordem determinística dos grupos (Grupo A, Grupo B, etc.)
        const sortedGroupNames = Array.from(new Set(teamGroupMap.values())).sort((a, b) => a.localeCompare(b));
        const standingInputs: StandingInput[] = [];

        if (sortedGroupNames.length > 0) {
          for (const grp of sortedGroupNames) {
            for (const [tId, gName] of teamGroupMap.entries()) {
              if (gName === grp) {
                const t = teams.find(team => team.id === tId);
                if (t) standingInputs.push({ team: t, groupName: grp });
              }
            }
          }
        } else {
          for (const t of teams) {
            standingInputs.push({ team: t, groupName: undefined });
          }
        }

        const groupStandings = computeStandingsByGroup(standingInputs, groupMatches, { competition });
        for (const key of stageKeys) {
          context.standingsByStage![key] = groupStandings;
        }

        // Se configurado ranking geral intergrupos, calcula via OverallStandingsEngine
        const allStandingsRows = groupStandings.flatMap(g => g.standings);
        if (allStandingsRows.length > 0) {
          const canonicalConfig = CompetitionRulesService.getConfig(competition);
          const criteria = canonicalConfig.standings.tiebreakCriteriaOrder;
          const overall = OverallStandingsEngine.computeOverallStandings(
            groupStandings,
            {
              competition,
              matches: groupMatches,
              criteria,
            },
          );
          for (const key of stageKeys) {
            context.overallStandingsByStage![key] = overall;
          }
        }
      };

      if (groupStages.length > 0) {
        for (const stage of groupStages) {
          const groupMatches = matches.filter(
            m =>
              m.phase === stage.name ||
              m.phase === stage.stageId ||
              m.phase === 'groups' ||
              m.phase === 'group_stage' ||
              m.phase === 'group-stage' ||
              m.phase === 'classificatória' ||
              m.phase === 'classificatoria' ||
              Boolean(m.groupName) ||
              (m.slotId && slots.some(s => s.slotId === m.slotId && s.stageRowId === stage.id)),
          );
          processGroupMatches([stage.stageId, stage.id, 'fase-grupos', 'default'], groupMatches);
        }
      } else {
        // Fallback para competições onde stages relacionais ainda não foram inseridos
        const fallbackGroupMatches = matches.filter(
          m =>
            Boolean(m.groupName) ||
            m.phase === 'groups' ||
            m.phase === 'group_stage' ||
            m.phase === 'group-stage' ||
            m.phase === 'classificatória' ||
            m.phase === 'classificatoria' ||
            m.phase === 'fase-grupos',
        );
        if (fallbackGroupMatches.length > 0) {
          processGroupMatches(['fase-grupos', 'default', competition.id], fallbackGroupMatches);
        }
      }
    }

    return context;
  }

  private static recordToMatchSlot(r: MatchSlotRecord): MatchSlot {
    return {
      slotId: r.slotId,
      stageId: r.stageRowId,
      roundId: r.roundRowId,
      position: r.position,
      label: r.label ?? undefined,
      matchRecordId: r.matchId ?? undefined,
      progressionRoute: r.progressionRoute ?? undefined,
      participantA: {
        side: 'A',
        reference: r.participantAReference,
        status: r.participantAStatus,
        resolvedTeamId: r.resolvedTeamAId ?? null,
        displayPlaceholder: r.resolvedTeamAId ?? (r.participantAReference.type === 'bye' ? 'BYE' : 'TBD'),
        isBye: r.participantAReference.type === 'bye',
      },
      participantB: {
        side: 'B',
        reference: r.participantBReference,
        status: r.participantBStatus,
        resolvedTeamId: r.resolvedTeamBId ?? null,
        displayPlaceholder: r.resolvedTeamBId ?? (r.participantBReference.type === 'bye' ? 'BYE' : 'TBD'),
        isBye: r.participantBReference.type === 'bye',
      },
    };
  }
}
