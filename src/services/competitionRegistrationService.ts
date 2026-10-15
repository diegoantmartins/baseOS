/**
 * CompetitionRegistrationService — Serviço Canônico de Integridade de Inscrições e Participantes
 *
 * Responsabilidades:
 * - Centralização de todas as regras de integridade esportiva de agremiações, elencos e atletas
 * - Proteção contra duplicidade de atletas no mesmo torneio (por documento oficial ou nome)
 * - Garantia dos limites canônicos de elenco, capitães e líberos via CompetitionRulesService
 * - Proteção do histórico competitivo: impede remoção de equipes ou atletas com partidas jogadas
 * - Alinhamento estrito ao ciclo de vida da competição (CompetitionLifecycleService)
 */

import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type {
  CompetitionAthlete,
  CompetitionAthleteInput,
  CompetitionTeam,
  RegistrationValidationResult,
} from '@/types/registration';
import { CompetitionRulesService } from './competitionRulesService';
import { isRegistrationLocked } from './registrationService';
import { normalizeCpf } from './identityService';

export interface IntegrityCheckResult {
  ok: boolean;
  errors: string[];
}

export class CompetitionRegistrationService {
  /**
   * Avalia se uma equipe pode ser inscrita em uma competição.
   * Regras:
   * 1. Competição não pode estar concluída ou cancelada.
   * 2. Equipe não pode já estar inscrita na mesma competição (unicidade competitionId + teamId).
   */
  public static canRegisterTeam(
    competition: CompetitionRecord,
    teamId: string,
    existingRegistrations: CompetitionTeam[] = [],
  ): IntegrityCheckResult {
    const errors: string[] = [];

    if (competition.status === 'completed' || competition.status === 'cancelled') {
      const statusLabel = competition.status === 'completed' ? 'concluída' : 'cancelada';
      errors.push(`Competição está ${statusLabel} e não aceita novas inscrições.`);
    }

    const alreadyRegistered = existingRegistrations.some(
      (r) => r.competitionId === competition.id && r.teamId === teamId,
    );
    if (alreadyRegistered) {
      errors.push('Esta equipe já está inscrita nesta competição.');
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Avalia se a inscrição de uma equipe pode ser removida/cancelada.
   * Regras:
   * 1. Competição não pode estar concluída ou cancelada.
   * 2. Equipe não pode possuir partidas criadas ou disputadas na competição.
   */
  public static canRemoveRegistration(
    competition: CompetitionRecord,
    registration: CompetitionTeam,
    matches: MatchRecord[] = [],
  ): IntegrityCheckResult {
    const errors: string[] = [];

    if (competition.status === 'completed' || competition.status === 'cancelled') {
      errors.push(`Competição está ${competition.status === 'completed' ? 'finalizada' : 'cancelada'}.`);
    }

    const hasMatches = matches.some(
      (m) =>
        m.competitionId === competition.id &&
        (m.teamAId === registration.teamId || m.teamBId === registration.teamId),
    );

    if (hasMatches) {
      errors.push(
        `Não é possível remover a equipe "${registration.teamName}" pois ela já possui partidas associadas nesta competição.`,
      );
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Avalia se uma agremiação (TeamRecord global) pode ser excluída permanentemente.
   * Regras:
   * 1. Não pode possuir partidas em nenhuma competição no histórico do sistema.
   * 2. Não pode possuir inscrições ativas em competições em andamento ou futuras.
   */
  public static canDeleteTeam(
    teamId: string,
    matches: MatchRecord[] = [],
    competitionTeams: CompetitionTeam[] = [],
  ): IntegrityCheckResult {
    const errors: string[] = [];

    const matchesCount = matches.filter((m) => m.teamAId === teamId || m.teamBId === teamId).length;
    if (matchesCount > 0) {
      errors.push(
        `Esta agremiação não pode ser excluída pois possui ${matchesCount} partida(s) registradas no histórico esportivo.`,
      );
    }

    const regCount = competitionTeams.filter((ct) => ct.teamId === teamId).length;
    if (regCount > 0) {
      errors.push(
        `Esta agremiação está vinculada a ${regCount} inscrição(ões) de competição. Remova as inscrições antes de excluir a equipe.`,
      );
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Obtém a capacidade máxima determinística de equipes configurada para a competição.
   * Ordem canônica de resolução:
   * 1. competition.maxTeams
   * 2. competition.config.registration.maxTeams
   * 3. competition.config.rules.maxTeams
   * 4. competition.config.format.stages[0].participantsCount
   * 5. Soma de groupCapacities da Fase 1 ou (groupsCount * teamsPerGroup)
   * 6. competition.teamsCount (se numérico válido > 0)
   */
  public static getCapacity(competition: CompetitionRecord): {
    maxTeams: number;
    isConfigured: boolean;
    source?: 'explicit' | 'registration' | 'rules' | 'stage-participants' | 'stage-groups' | 'teams-count' | 'none';
  } {
    // 1. Campo explícito na entidade da competição
    if (typeof competition.maxTeams === 'number' && competition.maxTeams > 0) {
      return { maxTeams: competition.maxTeams, isConfigured: true, source: 'explicit' };
    }

    // 2. Configuração de registro
    const regMax = competition.config?.registration?.maxTeams;
    if (typeof regMax === 'number' && regMax > 0) {
      return { maxTeams: regMax, isConfigured: true, source: 'registration' };
    }

    // 3. Configuração legado de rules
    const rawConfig = competition.config as unknown as { rules?: { maxTeams?: number } } | undefined;
    const rulesMax = rawConfig?.rules?.maxTeams;
    if (typeof rulesMax === 'number' && rulesMax > 0) {
      return { maxTeams: rulesMax, isConfigured: true, source: 'rules' };
    }

    // 4. Contagem declarativa de participantes da 1ª Fase do motor
    const firstStage = competition.config?.format?.stages?.[0];
    if (firstStage) {
      if (typeof firstStage.participantsCount === 'number' && firstStage.participantsCount > 0) {
        return { maxTeams: firstStage.participantsCount, isConfigured: true, source: 'stage-participants' };
      }

      // 5. Soma de capacidades dos grupos da 1ª Fase
      if (firstStage.groupConfig) {
        const capacities = firstStage.groupConfig.groupCapacities;
        if (Array.isArray(capacities) && capacities.length > 0) {
          const sum = capacities.reduce((acc, c) => acc + (typeof c === 'number' ? c : 0), 0);
          if (sum > 0) {
            return { maxTeams: sum, isConfigured: true, source: 'stage-groups' };
          }
        }
        if (
          typeof firstStage.groupConfig.groupsCount === 'number' &&
          typeof firstStage.groupConfig.teamsPerGroup === 'number' &&
          firstStage.groupConfig.groupsCount > 0 &&
          firstStage.groupConfig.teamsPerGroup > 0
        ) {
          return {
            maxTeams: firstStage.groupConfig.groupsCount * firstStage.groupConfig.teamsPerGroup,
            isConfigured: true,
            source: 'stage-groups',
          };
        }
      }
    }

    // 6. teamsCount declarado na entidade
    if (typeof competition.teamsCount === 'number' && competition.teamsCount > 0) {
      return { maxTeams: competition.teamsCount, isConfigured: true, source: 'teams-count' };
    }

    return { maxTeams: 0, isConfigured: false, source: 'none' };
  }

  /**
   * Avalia se uma equipe inscrita pode ser formalmente aprovada/confirmada na competição.
   * Regras:
   * 1. Competição não pode estar concluída ou cancelada.
   * 2. Status deve ser 'submitted' (elenco preenchido e finalizado pela equipe).
   * 3. Elenco atende estritamente ao mínimo regulamentar (CompetitionRulesService).
   * 4. Capacidade deve estar explicitamente configurada e não ter sido esgotada (sem overbooking).
   */
  public static canApproveTeam(
    competition: CompetitionRecord,
    registration: CompetitionTeam,
    allRegistrations: CompetitionTeam[] = [],
    athletes: CompetitionAthlete[] = [],
  ): IntegrityCheckResult {
    const errors: string[] = [];

    // 1. Status da competição
    if (competition.status === 'completed' || competition.status === 'cancelled') {
      errors.push(`Competição está ${competition.status === 'completed' ? 'concluída' : 'cancelada'} e não aceita alterações.`);
    }

    // 2. Status da inscrição
    if (registration.status !== 'submitted') {
      errors.push(
        `A equipe "${registration.teamName}" está com status "${registration.status}". Apenas equipes com elenco enviado (status: finalizado / submitted) podem ser aprovadas.`,
      );
    }

    // 3. Quantidade mínima de atletas
    const teamAthletes = athletes.filter((a) => a.competitionTeamId === registration.id);
    const limits = CompetitionRulesService.getRosterLimits(competition);
    if (teamAthletes.length < limits.min) {
      errors.push(
        `Elenco incompleto: a equipe possui ${teamAthletes.length}/${limits.min} atletas cadastrados. O mínimo regulamentar deve ser atingido antes da aprovação.`,
      );
    }

    // 4. Capacidade explícita configurada (SEM INFERÊNCIA SILENCIOSA)
    const capacity = this.getCapacity(competition);
    if (!capacity.isConfigured) {
      errors.push(
        'A capacidade máxima de equipes (maxTeams) não foi configurada para esta competição. Defina a capacidade nas configurações antes de aprovar inscrições.',
      );
    } else {
      const approvedCount = allRegistrations.filter(
        (r) => r.competitionId === competition.id && r.status === 'approved' && r.id !== registration.id,
      ).length;
      if (approvedCount >= capacity.maxTeams) {
        errors.push(
          `Capacidade máxima de equipes atingida (${approvedCount}/${capacity.maxTeams} confirmadas). Não é possível aprovar novas equipes sem expandir as vagas.`,
        );
      }
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Avalia se uma inscrição pode ser rejeitada pela organização.
   */
  public static canRejectTeam(
    competition: CompetitionRecord,
    _registration: CompetitionTeam,
  ): IntegrityCheckResult {
    const errors: string[] = [];
    if (competition.status === 'completed' || competition.status === 'cancelled') {
      errors.push(`Competição está ${competition.status === 'completed' ? 'concluída' : 'cancelada'}.`);
    }
    return { ok: errors.length === 0, errors };
  }

  /**
   * Valida a adição ou edição de um atleta no elenco de uma equipe inscrita.
   * Regras:
   * 1. Competição aberta (não cancelada e não finalizada).
   * 2. Prazo e bloqueio de elenco (isRegistrationLocked).
   * 3. Limites de elenco canônicos via CompetitionRulesService (mín/máx atletas, líberos, capitães).
   * 4. Número de camisa único na equipe (1-99, opcional até o jogo).
   * 5. Unicidade de atleta no torneio: um atleta não pode defender duas equipes na mesma competição!
   */
  public static validateAthleteRegistration(
    competition: CompetitionRecord,
    competitionTeam: CompetitionTeam,
    input: CompetitionAthleteInput,
    currentRoster: CompetitionAthlete[] = [],
    allCompetitionAthletes: CompetitionAthlete[] = [],
    excludeAthleteId?: string,
  ): RegistrationValidationResult {
    const errors: string[] = [];

    // 1. Ciclo de vida da competição
    if (competition.status === 'completed' || competition.status === 'cancelled') {
      errors.push(`A competição está ${competition.status === 'completed' ? 'concluída' : 'cancelada'}. Alterações de elenco bloqueadas.`);
    } else if (competition.status === 'registration-closed' || competition.status === 'groups-defined') {
      errors.push('As inscrições para esta competição estão formalmente encerradas. Alterações de elenco bloqueadas.');
    }

    // 2. Bloqueio de prazo da equipe
    if (isRegistrationLocked(competitionTeam, competition)) {
      errors.push('Prazo de inscrição do elenco desta equipe encerrado ou bloqueado.');
    }

    // 3. Campos obrigatórios
    if (!input.name || !input.name.trim()) {
      errors.push('Nome do atleta é obrigatório.');
    }
    if (!input.position || !input.position.trim()) {
      errors.push('Posição do atleta é obrigatória.');
    }

    // 4. Limites canônicos de elenco
    const limits = CompetitionRulesService.getRosterLimits(competition);
    const otherSiblings = currentRoster.filter((a) => a.id !== excludeAthleteId);

    if (otherSiblings.length + 1 > limits.max) {
      errors.push(`Limite máximo de ${limits.max} atletas por equipe atingido para esta competição.`);
    }

    // 5. Número de camisa
    if (input.jerseyNumber !== undefined && input.jerseyNumber !== null) {
      if (!Number.isInteger(input.jerseyNumber) || input.jerseyNumber < 1 || input.jerseyNumber > 99) {
        errors.push('Número da camisa deve ser um número inteiro entre 1 e 99.');
      } else if (otherSiblings.some((a) => a.jerseyNumber === input.jerseyNumber)) {
        errors.push(`Já existe atleta com a camisa ${input.jerseyNumber} nesta equipe.`);
      }
    }

    // 6. Capitão e Líberos
    const currentCaptains = otherSiblings.filter((a) => a.isCaptain).length;
    const currentLiberos = otherSiblings.filter((a) => a.isLibero).length;

    if (input.isCaptain && currentCaptains >= limits.maxCaptains) {
      errors.push(`Só é permitido ${limits.maxCaptains} capitão por equipe.`);
    }
    if (input.isLibero && currentLiberos >= limits.maxLiberos) {
      errors.push(`Máximo de ${limits.maxLiberos} líberos permitidos para esta modalidade.`);
    }

    // 7. Unicidade de atleta no elenco da própria equipe (impede cadastrar o mesmo atleta duas vezes)
    let inputCpf: string | undefined;
    try {
      inputCpf = normalizeCpf(input.documentNumber);
    } catch {
      inputCpf = undefined;
    }
    const rawInputDoc = input.documentNumber?.trim().toLowerCase();

    for (const sibling of otherSiblings) {
      let siblingCpf: string | undefined;
      try {
        siblingCpf = normalizeCpf(sibling.documentNumber);
      } catch {
        siblingCpf = undefined;
      }
      const rawSiblingDoc = sibling.documentNumber?.trim().toLowerCase();
      const sameCpf = Boolean(inputCpf && siblingCpf && inputCpf === siblingCpf);
      const sameAthleteId = Boolean(input.athleteId && sibling.athleteId && input.athleteId === sibling.athleteId);
      const sameExactDoc = Boolean(rawInputDoc && rawSiblingDoc && rawInputDoc === rawSiblingDoc);

      if (sameCpf || sameAthleteId || sameExactDoc) {
        errors.push(`O atleta "${input.name}" já está cadastrado no elenco desta equipe.`);
        break;
      }
    }

    // 8. Unicidade de atleta no mesmo torneio (não pode jogar por duas equipes distintas)
    for (const otherAthlete of allCompetitionAthletes) {
      if (otherAthlete.competitionTeamId === competitionTeam.id) continue;
      if (otherAthlete.id === excludeAthleteId) continue;

      let otherCpf: string | undefined;
      try {
        otherCpf = normalizeCpf(otherAthlete.documentNumber);
      } catch {
        otherCpf = undefined;
      }
      const rawOtherDoc = otherAthlete.documentNumber?.trim().toLowerCase();

      const sameCpf = Boolean(inputCpf && otherCpf && inputCpf === otherCpf);
      const sameAthleteId = Boolean(input.athleteId && otherAthlete.athleteId && input.athleteId === otherAthlete.athleteId);
      const sameExactDoc = Boolean(rawInputDoc && rawOtherDoc && rawInputDoc === rawOtherDoc);

      if (sameCpf || sameAthleteId || sameExactDoc) {
        errors.push(`O atleta "${input.name}" já está inscrito por outra equipe nesta mesma competição.`);
        break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Avalia se um atleta pode ser removido do elenco.
   * Regras:
   * 1. Competição não finalizada/cancelada.
   * 2. Prazo da equipe aberto.
   * 3. Atleta NÃO pode ter participado de partidas jogadas ou homologadas no torneio.
   */
  public static canRemoveAthleteFromRoster(
    competition: CompetitionRecord,
    competitionTeam: CompetitionTeam,
    athleteId: string,
    matches: MatchRecord[] = [],
  ): IntegrityCheckResult {
    const errors: string[] = [];

    if (competition.status === 'completed' || competition.status === 'cancelled') {
      errors.push(`Competição está ${competition.status === 'completed' ? 'concluída' : 'cancelada'}.`);
    } else if (competition.status === 'registration-closed' || competition.status === 'groups-defined') {
      errors.push('As inscrições para esta competição estão formalmente encerradas.');
    }

    if (isRegistrationLocked(competitionTeam, competition)) {
      errors.push('O prazo de inscrição está encerrado ou bloqueado para edições.');
    }

    // Verifica integridade histórica com partidas jogadas
    const playedMatches = matches.filter(
      (m) =>
        m.competitionId === competition.id &&
        (m.status === 'completed' || m.status === 'homologated' || m.status === 'in-progress'),
    );

    const participated = playedMatches.some((m) => {
      if (m.checkedInAthleteIds?.includes(athleteId)) return true;
      const inLineupA =
        m.lineups?.teamA?.starterIds?.includes(athleteId) ||
        m.lineups?.teamA?.captainId === athleteId ||
        m.lineups?.teamA?.liberoId === athleteId;
      const inLineupB =
        m.lineups?.teamB?.starterIds?.includes(athleteId) ||
        m.lineups?.teamB?.captainId === athleteId ||
        m.lineups?.teamB?.liberoId === athleteId;
      return Boolean(inLineupA || inLineupB);
    });

    if (participated) {
      errors.push(
        'Este atleta não pode ser removido pois já participou de partidas oficiais disputadas nesta competição.',
      );
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Avalia se um atleta pode ser transferido de uma equipe para outra.
   */
  public static canTransferAthlete(
    athlete: CompetitionAthlete,
    sourceTeam: CompetitionTeam,
    targetTeam: CompetitionTeam,
    targetCompetition: CompetitionRecord,
    targetRoster: CompetitionAthlete[] = [],
    matches: MatchRecord[] = [],
  ): IntegrityCheckResult {
    const errors: string[] = [];

    // 1. Origem pode liberar?
    const removeCheck = this.canRemoveAthleteFromRoster(targetCompetition, sourceTeam, athlete.id, matches);
    if (!removeCheck.ok) {
      errors.push(...removeCheck.errors);
    }

    // 2. Destino pode receber?
    const addCheck = this.validateAthleteRegistration(
      targetCompetition,
      targetTeam,
      {
        name: athlete.name,
        position: athlete.position,
        jerseyNumber: athlete.jerseyNumber,
        documentNumber: athlete.documentNumber,
        birthDate: athlete.birthDate,
        isCaptain: false, // Ao transferir, perde braçadeira de capitão da equipe anterior
        isLibero: athlete.isLibero,
        gender: athlete.gender,
      },
      targetRoster,
      [],
      athlete.id,
    );

    if (!addCheck.valid) {
      errors.push(...addCheck.errors);
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Valida se o elenco atinge o mínimo regulamentar para o formato da competição.
   */
  public static validateRosterMinimum(
    athletes: CompetitionAthlete[],
    competition: CompetitionRecord,
  ): RegistrationValidationResult {
    const limits = CompetitionRulesService.getRosterLimits(competition);
    if (athletes.length < limits.min) {
      return {
        valid: false,
        errors: [`Mínimo de ${limits.min} atletas exigidos para a modalidade (atual: ${athletes.length}).`],
      };
    }
    return { valid: true, errors: [] };
  }
}
