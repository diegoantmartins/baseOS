/**
 * BaseOS - Serviço de Validação e Controle do Ciclo de Vida da Competição
 *
 * Garante consistência em todas as transições de fase do torneio:
 *  - Impede encerramento de inscrições sem número mínimo de equipes.
 *  - Impede sorteio/início de jogos com inscrições abertas ou sem tabela.
 *  - Impede avanço para playoffs sem conclusão/homologação da fase de grupos.
 *  - Impede finalização do torneio com jogos pendentes ou sem pódio apurado.
 */

import type { CompetitionLifecycleStatus, CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

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
};

export class CompetitionLifecycleService {
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

    // 1. DRAFT -> REGISTRATION-OPEN
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
      const minTeams = (competition.groupsCount ?? 1) * 2;
      const hasMinTeams = teams.length >= minTeams;
      checklist.push({
        label: `Mínimo de equipes inscritas (${teams.length}/${minTeams})`,
        passed: hasMinTeams,
        critical: true,
        detail: hasMinTeams ? undefined : `Requer ao menos ${minTeams} equipes para comportar os grupos.`,
      });
      if (!hasMinTeams) {
        errors.push(`Não é possível encerrar inscrições: mínimo de ${minTeams} equipes necessárias (atual: ${teams.length}).`);
      }
    }

    // 3. REGISTRATION-CLOSED -> DRAW-PENDING
    else if (targetStatus === 'draw-pending') {
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

    // 4. DRAW-PENDING -> IN-PROGRESS
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
      const groupMatches = matches.filter(
        m => m.phase === 'group-stage' || m.phase === 'classificatória' || !m.phase
      );

      const pendingGroupMatches = groupMatches.filter(
        m => m.status !== 'completed' && m.status !== 'homologated' && m.status !== 'cancelled'
      );

      const allGroupsDone = groupMatches.length > 0 && pendingGroupMatches.length === 0;

      checklist.push({
        label: `Todos os jogos da fase de grupos finalizados/homologados (${groupMatches.length - pendingGroupMatches.length}/${groupMatches.length})`,
        passed: allGroupsDone,
        critical: true,
        detail: allGroupsDone
          ? undefined
          : `Restam ${pendingGroupMatches.length} jogos pendentes na fase de grupos.`,
      });

      if (!allGroupsDone && groupMatches.length > 0) {
        errors.push(`Não é possível avançar para os Playoffs: restam ${pendingGroupMatches.length} jogos da fase de grupos sem resultado homologado.`);
      }

      const playoffMatches = matches.filter(
        m => m.phase && m.phase !== 'group-stage' && m.phase !== 'classificatória'
      );
      checklist.push({
        label: `Confrontos de mata-mata estruturados (${playoffMatches.length} jogos)`,
        passed: playoffMatches.length > 0,
        critical: false,
      });
      if (playoffMatches.length === 0) {
        warnings.push('Os confrontos eliminatórios de mata-mata ainda não foram sincronizados.');
      }
    }

    // 6. ANY -> COMPLETED
    else if (targetStatus === 'completed') {
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
        passed: hasChampion || matches.length === 0,
        critical: true,
      });

      if (!hasChampion && matches.length > 0) {
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
   */
  public static getNextRecommendedStatus(current: CompetitionLifecycleStatus): CompetitionLifecycleStatus | null {
    switch (current) {
      case 'draft':
        return 'registration-open';
      case 'registration-open':
        return 'registration-closed';
      case 'registration-closed':
        return 'draw-pending';
      case 'draw-pending':
        return 'in-progress';
      case 'in-progress':
        return 'playoffs';
      case 'playoffs':
        return 'completed';
      default:
        return null;
    }
  }
}
