/**
 * BaseOS — Serviço Canônico de Elegibilidade para Sorteio (Fase 3)
 *
 * Responsabilidade Única:
 * Responder de forma canônica, única, explicável e auditável à pergunta:
 * "Esta equipe está oficialmente apta a participar do sorteio desta competição?"
 *
 * Princípios:
 * 1. CompetitionConfig é a FONTE ÚNICA DA VERDADE para limites de elenco (mín/máx atletas).
 *    Consumido exclusivamente via CompetitionRulesService.getRosterLimits(competition).
 * 2. Nenhuma regra de elegibilidade deve ser decidida diretamente na UI (DrawPage/RegistrationsPage).
 * 3. O algoritmo de sorteio (drawService) recebe apenas as equipes canonicamente elegíveis.
 * 4. Separação explícita entre Elegibilidade Individual (Nível 1 - Equipe)
 *    e Prontidão de Sorteio (Nível 2 - Torneio).
 */

import type { CompetitionLifecycleStatus, CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam, RegistrationStatus } from '@/types/registration';
import { CompetitionRulesService } from './competitionRulesService';
import { dataAccess } from './dataAccess';

/**
 * Resultado estruturado da avaliação de elegibilidade individual de uma equipe.
 */
export interface TeamDrawEligibility {
  teamId: string;
  competitionTeamId: string;
  teamName: string;
  teamShortName?: string;
  eligible: boolean;
  reasons: string[];
  blockers: string[];
  athleteCount: number;
  minAthletes: number;
  maxAthletes: number;
  status: RegistrationStatus;
}

/**
 * Relatório global de elegibilidade da competição para o sorteio oficial.
 */
export interface CompetitionDrawEligibilityReport {
  competitionId: string;
  competitionStatus: CompetitionLifecycleStatus;
  canExecuteDraw: boolean;
  drawBlockers: string[];
  totalTeams: number;
  eligibleCount: number;
  blockedCount: number;
  eligibleTeams: TeamDrawEligibility[];
  ineligibleTeams: TeamDrawEligibility[];
  allEvaluations: TeamDrawEligibility[];
}

export class CompetitionDrawEligibilityService {
  /**
   * Avaliação Individual (Nível 1):
   * Determina se uma equipe inscrita está apta a participar do sorteio de chaves.
   *
   * Critérios Canônicos:
   * 1. Competição válida, não cancelada e não finalizada;
   * 2. Vínculo: a inscrição pertence à competição avaliada;
   * 3. Inscrição não rejeitada pela organização;
   * 4. Elenco: quantidade de atletas inscritos atende estritamente ao mínimo
   *    regulamentar definido pela configuração canônica (CompetitionConfig).
   */
  public static evaluateTeamDrawEligibility(
    competition: CompetitionRecord,
    competitionTeam: CompetitionTeam,
    athletes: CompetitionAthlete[],
    _now: Date = new Date(),
  ): TeamDrawEligibility {
    const blockers: string[] = [];
    const reasons: string[] = [];

    // 1. Integridade relacional
    if (competitionTeam.competitionId !== competition.id) {
      blockers.push('Inscrição não pertence a esta competição.');
    }

    // 2. Status da competição
    if (competition.status === 'cancelled') {
      blockers.push('Competição cancelada não permite participação em sorteio.');
    } else if (competition.status === 'completed') {
      blockers.push('Competição já finalizada não aceita novos sorteios.');
    }

    // 3. Status da inscrição da equipe (Regra Sagrada: SOMENTE equipes aprovadas podem participar do sorteio)
    if (competitionTeam.status === 'rejected') {
      blockers.push('Inscrição da equipe foi rejeitada pela organização.');
    } else if (competitionTeam.status !== 'approved') {
      blockers.push(
        `Inscrição não confirmada pela organização (status atual: ${competitionTeam.status}). Apenas equipes aprovadas podem participar do sorteio.`,
      );
    } else {
      reasons.push('Inscrição formalmente aprovada pela organização.');
    }

    // 4. Limites regulamentares de elenco (Fonte Canônica: CompetitionConfig)
    const limits = CompetitionRulesService.getRosterLimits(competition);
    const athleteCount = athletes.length;

    if (athleteCount < limits.min) {
      blockers.push(
        `Elenco incompleto: ${athleteCount}/${limits.min} atleta(s) inscrito(s) (mínimo regulamentar: ${limits.min}).`,
      );
    } else {
      reasons.push(
        `Elenco regular com ${athleteCount} atleta(s) inscrito(s) (mínimo exigido: ${limits.min}).`,
      );
    }

    // Nota sobre bloqueio de elenco (isLocked não impede sorteio; apenas bloqueia edição)
    if (competitionTeam.isLocked) {
      reasons.push('Elenco bloqueado para alterações (fechado para sorteio).');
    }

    const eligible = blockers.length === 0;

    return {
      teamId: competitionTeam.teamId,
      competitionTeamId: competitionTeam.id,
      teamName: competitionTeam.teamName,
      teamShortName: competitionTeam.teamShortName,
      eligible,
      reasons,
      blockers,
      athleteCount,
      minAthletes: limits.min,
      maxAthletes: limits.max,
      status: competitionTeam.status,
    };
  }

  /**
   * Avaliação Coletiva e Prontidão do Sorteio (Nível 2):
   * Avalia todas as equipes e determina se o sorteio oficial pode ser executado agora.
   *
   * Critérios de Prontidão:
   * 1. Competição em fase adequada (inscrições formalmente encerradas ou grupos a definir);
   * 2. Existência do mínimo de equipes elegíveis necessárias (ao menos 2 equipes);
   * 3. Quantidade de equipes elegíveis suficiente para comportar o número de grupos configurado.
   */
  public static evaluateCompetitionDrawEligibility(params: {
    competition: CompetitionRecord;
    competitionTeams: CompetitionTeam[];
    athletes: CompetitionAthlete[] | Map<string, CompetitionAthlete[]>;
    groupsCount?: number;
    now?: Date;
  }): CompetitionDrawEligibilityReport {
    const { competition, competitionTeams, athletes, groupsCount, now = new Date() } = params;

    // Organiza atletas por competitionTeamId
    let athleteMap: Map<string, CompetitionAthlete[]>;
    if (athletes instanceof Map) {
      athleteMap = athletes;
    } else {
      athleteMap = new Map<string, CompetitionAthlete[]>();
      for (const athlete of athletes) {
        const list = athleteMap.get(athlete.competitionTeamId) ?? [];
        list.push(athlete);
        athleteMap.set(athlete.competitionTeamId, list);
      }
    }

    const allEvaluations: TeamDrawEligibility[] = [];
    const eligibleTeams: TeamDrawEligibility[] = [];
    const ineligibleTeams: TeamDrawEligibility[] = [];

    // Avalia cada equipe inscrita da competição
    const relevantTeams = competitionTeams.filter((ct) => ct.competitionId === competition.id);

    for (const ct of relevantTeams) {
      const teamAthletes = athleteMap.get(ct.id) ?? [];
      const evaluation = this.evaluateTeamDrawEligibility(competition, ct, teamAthletes, now);
      allEvaluations.push(evaluation);
      if (evaluation.eligible) {
        eligibleTeams.push(evaluation);
      } else {
        ineligibleTeams.push(evaluation);
      }
    }

    // Avalia Prontidão Geral do Sorteio (Nível 2)
    const drawBlockers: string[] = [];

    // A. Lifecycle da competição
    if (competition.status === 'planning' || competition.status === 'draft') {
      drawBlockers.push('Competição ainda em fase de planejamento.');
    } else if (competition.status === 'registration-open' || competition.status === 'registration') {
      drawBlockers.push(
        'Inscrições ainda abertas. É necessário encerrar formalmente as inscrições antes de realizar o sorteio.',
      );
    } else if (competition.status === 'cancelled') {
      drawBlockers.push('Competição cancelada.');
    } else if (competition.status === 'completed') {
      drawBlockers.push('Competição já finalizada.');
    }

    // B. Mínimo de equipes elegíveis para haver disputa
    if (eligibleTeams.length < 2) {
      drawBlockers.push(
        `Não existem equipes elegíveis suficientes para o sorteio (atual: ${eligibleTeams.length}, mínimo necessário: 2).`,
      );
    }

    // C. Suficiência técnica de equipes para os grupos configurados (Restrição técnica do mecanismo de sorteio)
    const resolvedGroupsCount = groupsCount ?? competition.groupsCount ?? 1;
    const minTeamsForGroups = Math.max(2, resolvedGroupsCount * 2);
    if (eligibleTeams.length < minTeamsForGroups) {
      drawBlockers.push(
        `Quantidade de equipes elegíveis (${eligibleTeams.length}) é insuficiente para ${resolvedGroupsCount} grupo(s) (mínimo técnico necessário para o sorteio: ${minTeamsForGroups} equipes, sendo ao menos 2 por grupo).`,
      );
    }

    const canExecuteDraw = drawBlockers.length === 0;

    return {
      competitionId: competition.id,
      competitionStatus: competition.status,
      canExecuteDraw,
      drawBlockers,
      totalTeams: relevantTeams.length,
      eligibleCount: eligibleTeams.length,
      blockedCount: ineligibleTeams.length,
      eligibleTeams,
      ineligibleTeams,
      allEvaluations,
    };
  }

  /**
   * Helper assíncrono para carregar dados do repositório e avaliar prontidão.
   */
  public static async fetchAndEvaluateCompetitionDrawEligibility(
    competitionId: string,
    groupsCount?: number,
    now: Date = new Date(),
  ): Promise<CompetitionDrawEligibilityReport | null> {
    const competition = await dataAccess.getCompetition(competitionId);
    if (!competition) return null;

    const [competitionTeams, allAthletes] = await Promise.all([
      dataAccess.listCompetitionTeams(competitionId),
      dataAccess.listCompetitionAthletes(),
    ]);

    return this.evaluateCompetitionDrawEligibility({
      competition,
      competitionTeams,
      athletes: allAthletes,
      groupsCount,
      now,
    });
  }
}
