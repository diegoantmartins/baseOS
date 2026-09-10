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
    const allSlots = await dataAccess.listMatchSlots(competitionId);
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
      for (const stage of stages) {
        if (stage.stageType === 'groups' || stage.stageType === 'round-robin') {
          // Calcula classificação de grupos via computeStandingsByGroup
          const groupMatches = matches.filter(m => m.phase === stage.name || m.phase === 'groups' || m.phase === 'classificatória');

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
          context.standingsByStage![stage.stageId] = groupStandings;

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
            context.overallStandingsByStage![stage.stageId] = overall;
          }
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
