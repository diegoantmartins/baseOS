/**
 * OperationalAuditService — BaseOS
 *
 * Motor Canônico de Trilha de Auditoria Operacional (Fase 4.9.1 / FINDING-01).
 *
 * Responsabilidades:
 *  1. Registrar de forma estruturada, confiável e persistente todas as mutações
 *     administrativas e desportivas críticas da operação de competições.
 *  2. Responder de forma inequívoca às 7 perguntas canônicas:
 *     - Quem fez? (user / operator)
 *     - Quando fez? (timestamp ISO)
 *     - O que fez? (action)
 *     - Em qual competição? (competitionId / competitionName)
 *     - Em qual entidade? (entityType / entityId)
 *     - Qual era o estado anterior? (previousValue)
 *     - Qual foi o novo estado? (newValue)
 *  3. Integrar à persistência unificada via dataAccess.addAuditLog (LocalStorage/Supabase).
 *  4. Manter sincronismo com o AuditService de segurança para retrocompatibilidade
 *     e visualização unificada na UI de configurações.
 */

import { dataAccess } from '@/services/dataAccess';
import { AuditService } from '@/lib/security';
import type { CompetitionRecord, MatchAuditEntry, MatchRecord } from '@/types/entities';

export type OperationalAuditAction =
  | 'MATCH_HOMOLOGATED'
  | 'MATCH_RESULT_RECORDED'
  | 'MATCH_REOPENED'
  | 'MATCH_CANCELLED'
  | 'MATCH_SCHEDULE_UPDATED'
  | 'MATCH_CHECKIN'
  | 'REFEREE_ASSIGNED'
  | 'PLAYOFFS_SYNCED'
  | 'COMPETITION_CREATED'
  | 'COMPETITION_STATUS_CHANGED'
  | 'COMPETITION_CONFIG_UPDATED'
  | 'DRAW_EXECUTED'
  | 'TEAM_REGISTERED'
  | 'TEAM_REGISTERED_IN_COMPETITION'
  | 'ATHLETE_REGISTERED'
  | 'SYSTEM_CONFIG_UPDATED';

export interface OperationalAuditInput {
  user: string;
  action: OperationalAuditAction;
  entityType: 'match' | 'competition' | 'team' | 'competition_team' | 'athlete' | 'draw' | 'system';
  entityId: string;
  competitionId?: string;
  competitionName?: string;
  previousValue?: unknown;
  newValue?: unknown;
  details: string;
  note?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

function stringifyState(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

export class OperationalAuditService {
  /**
   * Registra um evento canônico de auditoria no repositório persistido (dataAccess)
   * e notifica o AuditService legado para apresentação imediata no frontend.
   */
  public static async recordEvent(input: OperationalAuditInput): Promise<MatchAuditEntry> {
    const prevStr = stringifyState(input.previousValue);
    const newStr = stringifyState(input.newValue);

    // 1. Grava no repositório canônico de dados (LocalStorage ou Supabase via adapter)
    const entry = await dataAccess.addAuditLog({
      user: input.user || 'Sistema / Operador Anônimo',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      competitionId: input.competitionId,
      competitionName: input.competitionName,
      previousValue: prevStr,
      newValue: newStr,
      details: input.details,
      note: input.note,
    });

    // 2. Sincroniza com a trilha visual do AuditService para visualização em SettingsPage
    try {
      const eventTitle = input.details.length > 50 ? input.action : input.details;
      AuditService.logEvent(
        eventTitle,
        input.user,
        input.type || 'info',
        input.details
      );
    } catch {
      // Ignora falha eventual de sincronismo com storage legado
    }

    return entry;
  }

  // --------------------------------------------------------------------------
  // DOMÍNIO: PARTIDAS (MATCHES)
  // --------------------------------------------------------------------------

  /**
   * Registra a homologação oficial de uma partida.
   */
  public static async recordMatchHomologation(params: {
    match: MatchRecord;
    competition?: CompetitionRecord | null;
    operator: string;
    winnerName?: string;
  }): Promise<MatchAuditEntry> {
    const { match, competition, operator, winnerName } = params;
    const prevSets = match.sets?.map(s => `${s.scoreA}x${s.scoreB}`).join(', ') || 'Sem sets';
    
    return this.recordEvent({
      user: operator,
      action: 'MATCH_HOMOLOGATED',
      entityType: 'match',
      entityId: match.id,
      competitionId: match.competitionId,
      competitionName: competition?.name,
      previousValue: {
        status: match.status,
        winnerId: match.winnerId,
        sets: match.sets,
      },
      newValue: {
        status: 'homologated',
        winnerId: match.winnerId,
        winnerName,
        sets: match.sets,
      },
      details: `Jogo #${match.matchNumber} (${match.teamAName} x ${match.teamBName}) homologado oficialmente por ${operator}. Placar: ${prevSets}. Vencedor: ${winnerName || match.winnerId || 'Não definido'}.`,
      type: 'success',
    });
  }

  /**
   * Registra lançamento ou edição de resultado na partida (Mesa ou Validação Manual).
   */
  public static async recordMatchResult(params: {
    match: MatchRecord;
    competition?: CompetitionRecord | null;
    operator: string;
    newSets: MatchRecord['sets'];
    winnerId?: string;
    winnerName?: string;
    isQuickFinalize?: boolean;
  }): Promise<MatchAuditEntry> {
    const { match, competition, operator, newSets, winnerId, winnerName, isQuickFinalize } = params;
    const prevSetsSummary = match.sets?.map(s => `${s.scoreA}x${s.scoreB}`).join(', ') || 'Nenhum';
    const newSetsSummary = newSets.map(s => `${s.scoreA}x${s.scoreB}`).join(', ');

    return this.recordEvent({
      user: operator,
      action: 'MATCH_RESULT_RECORDED',
      entityType: 'match',
      entityId: match.id,
      competitionId: match.competitionId,
      competitionName: competition?.name,
      previousValue: {
        status: match.status,
        winnerId: match.winnerId,
        sets: match.sets,
      },
      newValue: {
        status: 'completed',
        winnerId,
        winnerName,
        sets: newSets,
      },
      details: `Resultado lançado para o Jogo #${match.matchNumber} (${match.teamAName} x ${match.teamBName}) por ${operator}. Parciais anteriores: [${prevSetsSummary}] -> Novas parciais: [${newSetsSummary}]. ${isQuickFinalize ? '(Encerramento rápido)' : ''}`,
      type: 'success',
    });
  }

  /**
   * Registra a reabertura de uma partida homologada para ajustes.
   */
  public static async recordMatchReopen(params: {
    match: MatchRecord;
    competition?: CompetitionRecord | null;
    operator: string;
  }): Promise<MatchAuditEntry> {
    const { match, competition, operator } = params;

    return this.recordEvent({
      user: operator,
      action: 'MATCH_REOPENED',
      entityType: 'match',
      entityId: match.id,
      competitionId: match.competitionId,
      competitionName: competition?.name,
      previousValue: { status: match.status, homologatedAt: match.homologatedAt, homologatedBy: match.homologatedBy },
      newValue: { status: 'completed', homologatedAt: null, homologatedBy: null },
      details: `Jogo #${match.matchNumber} (${match.teamAName} x ${match.teamBName}) reaberto de 'homologated' para 'completed' por ${operator}.`,
      type: 'warning',
    });
  }

  /**
   * Registra o cancelamento de uma partida.
   */
  public static async recordMatchCancellation(params: {
    match: MatchRecord;
    competition?: CompetitionRecord | null;
    operator: string;
    reason?: string;
  }): Promise<MatchAuditEntry> {
    const { match, competition, operator, reason } = params;

    return this.recordEvent({
      user: operator,
      action: 'MATCH_CANCELLED',
      entityType: 'match',
      entityId: match.id,
      competitionId: match.competitionId,
      competitionName: competition?.name,
      previousValue: { status: match.status },
      newValue: { status: 'cancelled', reason },
      details: `Jogo #${match.matchNumber} (${match.teamAName} x ${match.teamBName}) cancelado por ${operator}. Motivo: ${reason || 'Não informado'}.`,
      type: 'error',
    });
  }

  /**
   * Registra a edição de metadados de agendamento (data, local, quadra, rodada).
   */
  public static async recordMatchEdit(params: {
    match: MatchRecord;
    competition?: CompetitionRecord | null;
    operator: string;
    updates: Partial<MatchRecord>;
  }): Promise<MatchAuditEntry> {
    const { match, competition, operator, updates } = params;
    const changedKeys = Object.keys(updates);
    const changedPairs = Object.entries(updates)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ');

    return this.recordEvent({
      user: operator,
      action: 'MATCH_SCHEDULE_UPDATED',
      entityType: 'match',
      entityId: match.id,
      competitionId: match.competitionId,
      competitionName: competition?.name,
      previousValue: Object.fromEntries(changedKeys.map(k => [k, (match as Record<string, unknown>)[k]])),
      newValue: updates,
      details: `Jogo #${match.matchNumber} teve dados administrativos atualizados por ${operator} (${changedPairs}).`,
      type: 'info',
    });
  }

  /**
   * Registra geração ou sincronização automática de confrontos eliminatórios (playoffs).
   */
  public static async recordPlayoffSync(params: {
    competition: CompetitionRecord;
    operator: string;
    createdCount: number;
    updatedCount: number;
  }): Promise<MatchAuditEntry> {
    const { competition, operator, createdCount, updatedCount } = params;

    return this.recordEvent({
      user: operator,
      action: 'PLAYOFFS_SYNCED',
      entityType: 'competition',
      entityId: competition.id,
      competitionId: competition.id,
      competitionName: competition.name,
      newValue: { createdCount, updatedCount },
      details: `Chaveamento eliminatório de "${competition.name}" sincronizado por ${operator}: ${createdCount} jogos criados e ${updatedCount} atualizados.`,
      type: 'info',
    });
  }

  // --------------------------------------------------------------------------
  // DOMÍNIO: COMPETIÇÃO (COMPETITIONS)
  // --------------------------------------------------------------------------

  /**
   * Registra transição de status no ciclo de vida da competição.
   */
  public static async recordCompetitionTransition(params: {
    competition: CompetitionRecord;
    operator: string;
    previousStatus: string;
    newStatus: string;
  }): Promise<MatchAuditEntry> {
    const { competition, operator, previousStatus, newStatus } = params;

    return this.recordEvent({
      user: operator,
      action: 'COMPETITION_STATUS_CHANGED',
      entityType: 'competition',
      entityId: competition.id,
      competitionId: competition.id,
      competitionName: competition.name,
      previousValue: { status: previousStatus },
      newValue: { status: newStatus },
      details: `Competição "${competition.name}" transitou de status '${previousStatus}' para '${newStatus}' por ${operator}.`,
      type: 'info',
    });
  }

  /**
   * Registra criação de nova competição.
   */
  public static async recordCompetitionCreation(params: {
    competition: CompetitionRecord;
    operator: string;
  }): Promise<MatchAuditEntry> {
    const { competition, operator } = params;

    return this.recordEvent({
      user: operator,
      action: 'COMPETITION_CREATED',
      entityType: 'competition',
      entityId: competition.id,
      competitionId: competition.id,
      competitionName: competition.name,
      newValue: {
        id: competition.id,
        name: competition.name,
        modality: competition.modality,
        format: competition.format,
      },
      details: `Nova competição "${competition.name}" (${competition.modality}, ${competition.format}) cadastrada por ${operator}.`,
      type: 'success',
    });
  }

  // --------------------------------------------------------------------------
  // DOMÍNIO: SORTEIO (DRAW)
  // --------------------------------------------------------------------------

  /**
   * Registra a oficialização e persistência de um sorteio de grupos e partidas.
   */
  public static async recordDrawExecution(params: {
    competition: CompetitionRecord;
    operator: string;
    mode: string;
    groupsCount: number;
    matchesCount: number;
  }): Promise<MatchAuditEntry> {
    const { competition, operator, mode, groupsCount, matchesCount } = params;

    return this.recordEvent({
      user: operator,
      action: 'DRAW_EXECUTED',
      entityType: 'draw',
      entityId: competition.id,
      competitionId: competition.id,
      competitionName: competition.name,
      newValue: { mode, groupsCount, matchesCount },
      details: `Sorteio oficial executado para "${competition.name}" por ${operator} (modo: ${mode}, ${groupsCount} grupos, ${matchesCount} confrontos gerados).`,
      type: 'success',
    });
  }

  // --------------------------------------------------------------------------
  // DOMÍNIO: INSCRIÇÕES E EQUIPES (REGISTRATION / TEAMS)
  // --------------------------------------------------------------------------

  /**
   * Registra a inscrição oficial de uma equipe em uma competição (Fase 2).
   */
  public static async recordTeamRegistration(params: {
    competition: CompetitionRecord;
    competitionTeam: import('@/types/registration').CompetitionTeam;
    team: import('@/types/entities').TeamRecord;
    managerName?: string;
    operator: string;
    isExistingTeamReused: boolean;
  }): Promise<MatchAuditEntry> {
    const { competition, competitionTeam, team, managerName, operator, isExistingTeamReused } = params;

    return this.recordEvent({
      user: operator,
      action: 'TEAM_REGISTERED_IN_COMPETITION',
      entityType: 'competition_team',
      entityId: competitionTeam.id,
      competitionId: competition.id,
      competitionName: competition.name,
      newValue: {
        competitionTeamId: competitionTeam.id,
        teamId: team.id,
        teamName: team.name,
        teamShortName: team.shortName,
        registrationDeadline: competitionTeam.registrationDeadline,
        status: competitionTeam.status,
        managerName,
        isExistingTeamReused,
      },
      details: `Equipe "${team.name}" (${team.shortName}) inscrita na competição "${competition.name}" por ${operator}. ${
        isExistingTeamReused ? '(Agremiação existente reutilizada)' : '(Nova agremiação cadastrada)'
      } Prazo: ${competitionTeam.registrationDeadline}.`,
      type: 'success',
    });
  }

  // --------------------------------------------------------------------------
  // CONSULTA
  // --------------------------------------------------------------------------

  /**
   * Consulta os logs de auditoria persistidos com filtros opcionais.
   */
  public static async listAuditLogs(filters?: {
    competitionId?: string;
    entityType?: string;
    entityId?: string;
  }): Promise<MatchAuditEntry[]> {
    return dataAccess.listAuditLogs(filters);
  }
}
