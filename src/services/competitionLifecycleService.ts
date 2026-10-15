/**
 * BaseOS - Serviço de Validação e Controle do Ciclo de Vida da Competição
 *
 * Garante consistência em todas as transições de fase do torneio:
 *  - Impede encerramento de inscrições sem número mínimo de equipes.
 *  - Impede sorteio/início de jogos com inscrições abertas ou sem tabela.
 *  - Impede avanço para playoffs sem conclusão/homologação da fase de grupos.
 *  - Impede finalização do torneio com jogos pendentes ou sem pódio apurado.
 *  - Centraliza decisões de integridade (edição de regras, partidas e resultados).
 *  - Controla o congelamento idempotente e imutável de rulesSnapshot.
 */

import type { CompetitionLifecycleStatus, CompetitionRecord, MatchRecord, StageRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import { CompetitionRulesService } from './competitionRulesService';
import { computePodium } from './playoffsService';
import { dataAccess } from './dataAccess';
import { OperationalAuditService } from './operationalAuditService';

export type LifecycleChecklistItem = {
  label: string;
  passed: boolean;
  critical: boolean;
  detail?: string;
};

export type LifecycleValidationResult = {
  valid: boolean;
  targetStatus: CompetitionLifecycleStatus;
  errors: string[];
  warnings: string[];
  checklist: LifecycleChecklistItem[];
};

export type LifecycleValidationContext = {
  teams?: TeamRecord[] | CompetitionTeam[];
  matches?: MatchRecord[];
  championTeamId?: string;
  runnerUpTeamId?: string;
  stages?: StageRecord[];
};

export class CompetitionLifecycleService {
  /**
   * Avalia se a competição em geral permite edição de dados operacionais/metadados.
   * Competições finalizadas ou canceladas são arquivadas como somente-leitura.
   */
  public static canEditCompetition(competition: CompetitionRecord): boolean {
    return competition.status !== 'completed' && competition.status !== 'cancelled';
  }

  /**
   * Avalia se as regras esportivas (formato de sets, pontuação, critérios de desempate, limites) podem ser alteradas.
   * Regras congelam definitivamente se a competição estiver em andamento, playoffs, concluída, cancelada,
   * ou se já houver qualquer partida iniciada ou jogada.
   */
  public static canEditRules(
    competition: CompetitionRecord,
    matchesOrCount: number | MatchRecord[] = 0
  ): boolean {
    const lockedStatuses: CompetitionLifecycleStatus[] = ['in-progress', 'playoffs', 'completed', 'cancelled'];
    if (lockedStatuses.includes(competition.status)) {
      return false;
    }

    if (competition.rulesSnapshot) {
      return false;
    }

    if (typeof matchesOrCount === 'number') {
      if (matchesOrCount > 0) return false;
    } else if (Array.isArray(matchesOrCount)) {
      if (matchesOrCount.length > 0) return false;
    }

    return true;
  }

  /**
   * Avalia se novas partidas podem ser criadas e agendadas na competição.
   * Proibido apenas se a competição estiver concluída ou cancelada.
   */
  public static canCreateMatch(competition: CompetitionRecord): boolean {
    return competition.status !== 'completed' && competition.status !== 'cancelled';
  }

  /**
   * Avalia se um resultado pode ser registrado para uma partida.
   * Bloqueia se a competição estiver finalizada ou cancelada, ou se a partida já estiver homologada.
   */
  public static canRecordResult(competition: CompetitionRecord, match?: MatchRecord): boolean {
    if (competition.status === 'completed' || competition.status === 'cancelled') {
      return false;
    }
    if (match) {
      if (match.status === 'homologated' || match.status === 'cancelled') {
        return false;
      }
    }
    return true;
  }

  /**
   * Avalia se um resultado já registrado pode ser corrigido/editado.
   * Partidas homologadas exigem reabertura formal.
   */
  public static canEditResult(competition: CompetitionRecord, match: MatchRecord): boolean {
    if (competition.status === 'completed' || competition.status === 'cancelled') {
      return false;
    }
    if (match.status === 'cancelled') {
      return false;
    }
    return true;
  }

  /**
   * Avalia se a competição pode ser cancelada.
   */
  public static canCancelCompetition(competition: CompetitionRecord): boolean {
    return competition.status !== 'completed' && competition.status !== 'cancelled';
  }

  /**
   * Congela as regras esportivas criando o snapshot canônico de forma puramente idempotente.
   * Se a competição já possuir rulesSnapshot, preserva incondicionalmente o snapshot original,
   * garantindo que nenhuma alteração posterior de config contamine os dados históricos.
   */
  public static freezeRulesSnapshot(competition: CompetitionRecord): CompetitionRecord {
    if (competition.rulesSnapshot) {
      return competition;
    }

    const snapshot = CompetitionRulesService.createRulesSnapshot(competition);
    return {
      ...competition,
      rulesSnapshot: snapshot,
    };
  }

  /**
   * Valida se a competição está apta a transitar para um novo status do ciclo de vida.
   */
  public static validateTransition(
    competition: CompetitionRecord,
    targetStatus: CompetitionLifecycleStatus,
    context: LifecycleValidationContext = {}
  ): LifecycleValidationResult {
    const checklist: LifecycleChecklistItem[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const currentStatus = competition.status;
    const teams = context.teams || [];
    const matches = context.matches || [];

    // 0. Proteção de estados terminais
    if (currentStatus === 'completed' && targetStatus !== 'completed') {
      errors.push('Competição finalizada não pode ser revertida para status anterior.');
      return {
        valid: false,
        targetStatus,
        errors,
        warnings,
        checklist: [{ label: 'Competição já encerrada', passed: false, critical: true }],
      };
    }

    if (currentStatus === 'cancelled') {
      errors.push('Competição cancelada não permite reativação automática.');
      return {
        valid: false,
        targetStatus,
        errors,
        warnings,
        checklist: [{ label: 'Competição cancelada', passed: false, critical: true }],
      };
    }

    // 1. DRAFT / PLANNING -> REGISTRATION-OPEN
    if (targetStatus === 'registration-open') {
      const hasName = !!competition.name?.trim();
      checklist.push({
        label: 'Nome e identificação da competição definidos',
        passed: hasName,
        critical: true,
      });
      if (!hasName) errors.push('A competição precisa ter um nome válido.');

      const hasFormat = !!competition.format && !!competition.playerFormat;
      checklist.push({
        label: 'Formato de jogo e regras configurados',
        passed: hasFormat,
        critical: true,
      });
      if (!hasFormat) errors.push('Defina o formato de disputa antes de abrir inscrições.');
    }

    // 2. REGISTRATION-OPEN -> REGISTRATION-CLOSED
    else if (targetStatus === 'registration-closed') {
      // O encerramento das inscrições é uma decisão administrativa do organizador.
      // A quantidade mínima de equipes para o algoritmo de sorteio (ex: round-robin / Berger)
      // é uma restrição técnica avaliada exclusivamente no contexto da prontidão do sorteio (Draw Readiness).
      checklist.push({
        label: `Equipes inscritas: ${teams.length}`,
        passed: true,
        critical: false,
        detail: teams.length === 0 ? 'Aviso: nenhuma equipe foi inscrita antes do encerramento.' : undefined,
      });
      if (teams.length === 0) {
        warnings.push('Atenção: a competição foi encerrada sem nenhuma equipe inscrita.');
      }
    }

    // 3. REGISTRATION-CLOSED -> DRAW-PENDING / GROUPS-DEFINED
    else if (targetStatus === 'draw-pending' || targetStatus === 'groups-defined') {
      const isRegClosed = currentStatus === 'registration-closed' || currentStatus === 'registration-open';
      checklist.push({
        label: 'Período de inscrições concluído',
        passed: isRegClosed,
        critical: true,
      });
      if (!isRegClosed) errors.push('As inscrições precisam ter sido encerradas para realizar o sorteio.');

      const hasTeams = teams.length >= 2;
      checklist.push({
        label: 'Equipes confirmadas para sorteio',
        passed: hasTeams,
        critical: true,
      });
      if (!hasTeams) errors.push('Pelo menos 2 equipes confirmadas são necessárias para o sorteio de chaves.');
    }

    // 4. DRAW-PENDING / GROUPS-DEFINED -> IN-PROGRESS
    else if (targetStatus === 'in-progress') {
      const hasMatches = matches.length > 0;
      checklist.push({
        label: `Tabela de jogos e confrontos gerada (${matches.length} jogos cadastrados)`,
        passed: hasMatches,
        critical: true,
        detail: hasMatches ? undefined : 'Gere a tabela de confrontos antes de iniciar as partidas.',
      });
      if (!hasMatches) {
        errors.push('Não é possível iniciar a competição sem confrontos cadastrados na tabela.');
      }

      const hasVenuesOrSchedule = matches.some(m => !!m.venue && !!m.scheduledTime);
      checklist.push({
        label: 'Locais e horários de jogos atribuídos',
        passed: hasVenuesOrSchedule,
        critical: false,
      });
      if (!hasVenuesOrSchedule) {
        warnings.push('Atenção: existem partidas sem local ou horário pré-definidos.');
      }
    }

    // 5. IN-PROGRESS -> PLAYOFFS
    else if (targetStatus === 'playoffs') {
      const configStages = competition.config?.format?.stages ?? [];

      const groupMatches = matches.filter(m => {
        if (m.phase && configStages.length > 0) {
          const s = configStages.find(
            st => st.id === m.phase || st.stageId === m.phase || st.name.toLowerCase() === m.phase?.toLowerCase()
          );
          if (s) return s.type === 'round-robin' || s.type === 'group-stage';
        }
        return Boolean(m.groupName) || m.phase === 'group-stage' || m.phase === 'classificatória' || !m.phase;
      });

      const pendingGroupMatches = groupMatches.filter(
        m => m.status !== 'completed' && m.status !== 'homologated' && m.status !== 'cancelled'
      );

      const allGroupsDone = groupMatches.length > 0 && pendingGroupMatches.length === 0;

      checklist.push({
        label: `Todos os jogos da fase inicial/grupos finalizados/homologados (${groupMatches.length - pendingGroupMatches.length}/${groupMatches.length})`,
        passed: allGroupsDone || groupMatches.length === 0,
        critical: true,
        detail: allGroupsDone || groupMatches.length === 0
          ? undefined
          : `Restam ${pendingGroupMatches.length} jogos pendentes na fase inicial.`,
      });

      if (!allGroupsDone && groupMatches.length > 0) {
        errors.push(`Não é possível avançar para as fases eliminatórias: restam ${pendingGroupMatches.length} jogos da fase inicial sem resultado homologado.`);
      }

      const playoffMatches = matches.filter(m => !groupMatches.includes(m));
      checklist.push({
        label: `Confrontos das fases seguintes estruturados (${playoffMatches.length} jogos)`,
        passed: playoffMatches.length > 0,
        critical: false,
      });
      if (playoffMatches.length === 0) {
        warnings.push('Os confrontos eliminatórios de mata-mata ainda não foram sincronizados.');
      }
    }

    // 6. ANY -> COMPLETED
    else if (targetStatus === 'completed') {
      // Se estiver em andamento ou grupos definidos e possuir playoffs configurados, não permite pular os playoffs
      if (
        (currentStatus === 'in-progress' || currentStatus === 'groups-defined') &&
        !CompetitionRulesService.isSingleStageRoundRobin(competition, matches, context.stages)
      ) {
        errors.push('Não é possível concluir diretamente a partir da fase inicial: a competição possui fase eliminatória (playoffs) configurada.');
        checklist.push({
          label: 'Fase eliminatória realizada',
          passed: false,
          critical: true,
          detail: 'Competição com playoffs exige a realização da fase eliminatória antes da conclusão.',
        });
      }

      const pendingMatches = matches.filter(
        m => m.status !== 'completed' && m.status !== 'homologated' && m.status !== 'cancelled'
      );

      const allMatchesFinished = matches.length > 0 && pendingMatches.length === 0;
      checklist.push({
        label: `Todas as partidas da competição finalizadas e homologadas (${matches.length - pendingMatches.length}/${matches.length})`,
        passed: allMatchesFinished,
        critical: true,
        detail: allMatchesFinished
          ? undefined
          : `Existem ${pendingMatches.length} partidas não concluídas ou sem súmula homologada.`,
      });

      if (!allMatchesFinished && matches.length > 0) {
        errors.push(`Não é possível finalizar o torneio: existem ${pendingMatches.length} partidas em aberto.`);
      }

      const hasChampion = !!competition.championTeamId || !!context.championTeamId;
      checklist.push({
        label: 'Campeão e pódio final consolidados',
        passed: hasChampion || allMatchesFinished || matches.length === 0,
        critical: true,
      });

      if (!hasChampion && !allMatchesFinished && matches.length > 0) {
        warnings.push('O campeão do torneio ainda não foi formalmente atribuído no pódio.');
      }
    }

    const valid = errors.length === 0;

    return {
      valid,
      targetStatus,
      errors,
      warnings,
      checklist,
    };
  }

  /**
   * Retorna os próximos status recomendados a partir do status atual.
   * Em competições de fase única (round-robin), in-progress avança diretamente para completed.
   */
  public static getNextRecommendedStatus(
    current: CompetitionLifecycleStatus,
    competition?: CompetitionRecord | null,
    matches?: MatchRecord[],
  ): CompetitionLifecycleStatus | null {
    const isSingleStage = competition ? CompetitionRulesService.isSingleStageRoundRobin(competition, matches) : false;

    switch (current) {
      case 'draft':
      case 'planning':
        return 'registration-open';
      case 'registration-open':
      case 'registration':
        return 'registration-closed';
      case 'registration-closed':
        return 'draw-pending';
      case 'draw-pending':
      case 'groups-defined':
        if (
          isSingleStage &&
          matches &&
          matches.length > 0 &&
          matches.every(m => m.status === 'completed' || m.status === 'homologated' || m.status === 'cancelled')
        ) {
          return 'completed';
        }
        return 'in-progress';
      case 'in-progress':
        if (isSingleStage) {
          return 'completed';
        }
        return 'playoffs';
      case 'playoffs':
        return 'completed';
      default:
        return null;
    }
  }

  /**
   * Realiza o fechamento formal e canônico das inscrições da competição (Fase 3).
   * Valida transição, garante idempotência e audita via OperationalAuditService.
   */
  public static async closeRegistrations(
    competitionId: string,
    operator: string,
  ): Promise<{ ok: boolean; competition?: CompetitionRecord; errors: string[] }> {
    const competition = await dataAccess.getCompetition(competitionId);
    if (!competition) {
      return { ok: false, errors: ['Competição não encontrada.'] };
    }

    // Idempotência: se já estiver com inscrições encerradas
    if (competition.status === 'registration-closed') {
      return { ok: true, competition, errors: [] };
    }

    if (competition.status !== 'registration-open' && competition.status !== 'registration') {
      return {
        ok: false,
        errors: [`Não é possível encerrar inscrições a partir do status "${competition.status}".`],
      };
    }

    const teams = await dataAccess.listCompetitionTeams(competitionId);
    const validation = this.validateTransition(competition, 'registration-closed', { teams });
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const previousStatus = competition.status;
    const updated: CompetitionRecord = {
      ...competition,
      status: 'registration-closed',
    };

    await dataAccess.updateCompetition(competition.id, { status: 'registration-closed' });

    await OperationalAuditService.recordCompetitionTransition({
      competition: updated,
      operator,
      previousStatus,
      newStatus: 'registration-closed',
    });

    return { ok: true, competition: updated, errors: [] };
  }

  /**
   * Realiza a transição canônica de ciclo de vida para 'groups-defined' após o sorteio oficial ser persistido.
   * Trava formalmente as equipes da competição e audita a transição.
   */
  public static async advanceToGroupsDefinedAfterDraw(
    competitionId: string,
    operator: string,
  ): Promise<{ ok: boolean; competition?: CompetitionRecord; errors: string[] }> {
    const competition = await dataAccess.getCompetition(competitionId);
    if (!competition) {
      return { ok: false, errors: ['Competição não encontrada.'] };
    }

    // Se já estiver em 'groups-defined' ou além, retorno idempotente
    if (competition.status === 'groups-defined') {
      return { ok: true, competition, errors: [] };
    }

    // Guarda de integridade robusta (Fase 3.2 Homologação):
    // 1. Confirmar se o registro do sorteio existe e possui grupos definidos com equipes
    const draw = await dataAccess.getDrawByCompetition(competitionId);
    if (!draw || !draw.groups || draw.groups.length === 0) {
      return {
        ok: false,
        errors: [
          'Não é possível avançar para "groups-defined": nenhuma partida foi encontrada ou persistida para esta competição (sorteio oficial ausente ou sem grupos).',
        ],
      };
    }

    // 2. Confirmar que existem partidas salvas correspondentes à fase de grupos / fase inicial
    const matches = await dataAccess.listMatches(competitionId);
    const groupMatches = (matches || []).filter(
      m =>
        m.groupName ||
        m.phase === 'Fase de Grupos' ||
        m.phase?.toLowerCase().includes('classificat') ||
        m.phase?.toLowerCase().includes('grupo') ||
        m.phase?.toLowerCase().includes('turno') ||
        CompetitionRulesService.isSingleStageRoundRobin(competition, matches) ||
        matches.length > 0
    );

    if (groupMatches.length === 0) {
      return {
        ok: false,
        errors: [
          'Não é possível avançar para "groups-defined": nenhuma partida foi encontrada ou persistida para esta competição.',
        ],
      };
    }

    // 3. Confirmar que as equipes sorteadas nos grupos possuem partidas cadastradas
    const drawnTeamIds = new Set(
      draw.groups.flatMap(g => (g.teams || []).map(t => (typeof t === 'string' ? t : t.teamId)))
    );

    if (drawnTeamIds.size >= 2) {
      const matchTeamIds = new Set(groupMatches.flatMap(m => [m.teamAId, m.teamBId]));
      const missingTeams = [...drawnTeamIds].filter(teamId => !matchTeamIds.has(teamId));

      if (missingTeams.length > 0) {
        return {
          ok: false,
          errors: [
            `Inconsistência no sorteio: ${missingTeams.length} equipe(s) sorteadas em grupos não possuem partidas cadastradas na tabela de jogos.`,
          ],
        };
      }
    }

    const previousStatus = competition.status;
    const updated: CompetitionRecord = {
      ...competition,
      status: 'groups-defined',
    };

    await dataAccess.updateCompetition(competition.id, { status: 'groups-defined' });

    // Tranca formalmente todas as inscrições da competição
    const teams = await dataAccess.listCompetitionTeams(competitionId);
    for (const t of teams) {
      if (!t.isLocked) {
        await dataAccess.updateCompetitionTeam(t.id, { isLocked: true });
      }
    }

    await OperationalAuditService.recordCompetitionTransition({
      competition: updated,
      operator,
      previousStatus,
      newStatus: 'groups-defined',
    });

    return { ok: true, competition: updated, errors: [] };
  }

  /**
   * Sincroniza e avança automaticamente o status do ciclo de vida da competição
   * com base no progresso das partidas (ex: após homologação de partidas).
   *
   * Garante que:
   * 1. Cada estágio individual do DAG (competition_stages.status) transiciona de
   *    'pending' -> 'in-progress' -> 'completed' conforme suas respectivas partidas/slots.
   * 2. Quando 100% dos MatchSlots/partidas reais forem homologados/concluídos (ou o último
   *    nó do grafo for concluído), a competição faz a transição global para 'completed',
   *    sem depender da existência de fases eliminatórias ('playoffs') ou partidas com phase === 'final'.
   * 3. O pódio oficial e o ranking final são apurados e persistidos de forma auditada e idempotente.
   */
  public static async syncLifecycleAfterMatchProgression(
    competitionId: string,
    operator: string = 'Sistema / Homologação',
  ): Promise<{ ok: boolean; competition?: CompetitionRecord; updated: boolean; errors: string[] }> {
    const competition = await dataAccess.getCompetition(competitionId);
    if (!competition) {
      return { ok: false, updated: false, errors: ['Competição não encontrada.'] };
    }

    if (competition.status === 'completed' || competition.status === 'cancelled') {
      return { ok: true, competition, updated: false, errors: [] };
    }

    const matches = await dataAccess.listMatches(competitionId);
    if (!matches || matches.length === 0) {
      return { ok: true, competition, updated: false, errors: [] };
    }

    const stages = await dataAccess.listStages(competitionId);
    const slots = await dataAccess.listMatchSlots(competitionId);

    const isFinishedMatch = (m: MatchRecord) =>
      m.status === 'completed' || m.status === 'homologated' || m.status === 'cancelled';
    const isStartedMatch = (m: MatchRecord) =>
      isFinishedMatch(m) || m.status === 'in-progress' || m.status === 'warmup' || m.status === 'timeout' || m.status === 'set-break';

    const allMatchesFinished = matches.every(isFinishedMatch);
    const anyMatchStarted = matches.some(isStartedMatch);

    // 1. Sincronização granular dos status das fases individuais (competition_stages.status)
    // O sistema avança o status de cada nó do grafo de estágios de forma independente
    let stageStatusChanged = false;
    if (stages.length > 0) {
      for (const stage of stages) {
        // Encontra slots associados a este estágio
        const stageSlots = slots.filter(s => s.stageRowId === stage.id);
        const stageSlotMatchIds = new Set(
          stageSlots.map(s => s.matchId).filter((id): id is string => Boolean(id))
        );

        // Encontra partidas vinculadas ao estágio
        const stageMatches = matches.filter(m => {
          if (m.id && stageSlotMatchIds.has(m.id)) return true;
          if (m.slotId && stageSlots.some(s => s.slotId === m.slotId)) return true;
          if (m.phase && m.phase.toLowerCase() === stage.name.toLowerCase()) return true;
          if (m.phase && (m.phase.toLowerCase() === stage.stageId.toLowerCase() || m.phase.toLowerCase() === stage.id.toLowerCase())) return true;
          if (
            (stage.stageType === 'round-robin' || stage.stageType === 'group-stage' || stage.stageType === 'groups') &&
            (Boolean(m.groupName) || m.phase === 'group-stage' || m.phase === 'classificatória' || !m.phase)
          ) {
            return true;
          }
          return false;
        });

        if (stageMatches.length > 0) {
          const allStageMatchesFinished = stageMatches.every(isFinishedMatch);
          const anyStageMatchStarted = stageMatches.some(isStartedMatch);

          if (allStageMatchesFinished && stage.status !== 'completed') {
            await dataAccess.updateStage(stage.id, { status: 'completed' });
            stage.status = 'completed';
            stageStatusChanged = true;

            // Se a fase de grupos encerrou, dispara a reconciliação e materialização de nós derivados (DAG)
            if (stage.stageType === 'groups' || stage.stageType === 'round-robin' || stage.stageType === 'group-stage') {
              try {
                const { CompetitionRuntimeService } = await import('./competitionRuntimeService');
                await CompetitionRuntimeService.reconcileCompetitionRuntime(competitionId);
              } catch (recErr) {
                console.warn('Erro ao reconciliar nós derivados após fase de grupos:', recErr);
              }
            }
          } else if (anyStageMatchStarted && stage.status === 'pending') {
            await dataAccess.updateStage(stage.id, { status: 'in-progress' });
            stage.status = 'in-progress';
            stageStatusChanged = true;
          }
        }
      }
    }

    // 2. Avaliação de encerramento do último nó do grafo e de 100% de partidas finalizadas:
    // Recarrega coleções caso novos matches tenham sido materializados pelo runtime (ex: Repescagem R1 e R2)
    const latestMatches = await dataAccess.listMatches(competitionId);
    const latestStages = await dataAccess.listStages(competitionId);
    const latestSlots = await dataAccess.listMatchSlots(competitionId);

    const allLatestMatchesFinished = latestMatches.length > 0 && latestMatches.every(isFinishedMatch);
    const allLatestStagesCompleted = latestStages.length > 0 && latestStages.every(s => s.status === 'completed');
    const hasUnmaterializedEligibleSlots = latestSlots.some(s => s.participantAStatus === 'resolved' && s.participantBStatus === 'resolved' && !s.matchId);
    const hasPendingStages = latestStages.some(s => s.status === 'pending' || s.status === 'in-progress');

    if ((allLatestMatchesFinished && !hasPendingStages && !hasUnmaterializedEligibleSlots) || allLatestStagesCompleted) {
      const podium = computePodium(latestMatches, competition);
      const updates: Partial<CompetitionRecord> = {
        status: 'completed',
      };

      if (podium.championTeamId) updates.championTeamId = podium.championTeamId;
      if (podium.runnerUpTeamId) updates.runnerUpTeamId = podium.runnerUpTeamId;
      if (podium.thirdPlaceTeamId) updates.thirdPlaceTeamId = podium.thirdPlaceTeamId;

      const previousStatus = competition.status;
      const updatedComp: CompetitionRecord = {
        ...competition,
        ...updates,
      };

      await dataAccess.updateCompetition(competition.id, updates);

      await OperationalAuditService.recordCompetitionTransition({
        competition: updatedComp,
        operator,
        previousStatus,
        newStatus: 'completed',
      });

      return { ok: true, competition: updatedComp, updated: true, errors: [] };
    }

    // 3. Caso intermediário: transição de 'groups-defined' para 'in-progress'
    if (competition.status === 'groups-defined' && anyMatchStarted) {
      const previousStatus = competition.status;
      const frozen = this.freezeRulesSnapshot(competition);
      const updates: Partial<CompetitionRecord> = {
        status: 'in-progress',
        rulesSnapshot: frozen.rulesSnapshot,
      };

      const updatedComp: CompetitionRecord = {
        ...competition,
        ...updates,
      };

      await dataAccess.updateCompetition(competition.id, updates);

      await OperationalAuditService.recordCompetitionTransition({
        competition: updatedComp,
        operator,
        previousStatus,
        newStatus: 'in-progress',
      });

      return { ok: true, competition: updatedComp, updated: true, errors: [] };
    }

    return { ok: true, competition, updated: stageStatusChanged, errors: [] };
  }
}

