/**
 * delegationReportService.ts
 *
 * Serviço desacoplado para geração do View Model da
 * Relação Oficial de Delegações & Responsáveis (BaseOS Fase 7.5 Prompt 7).
 *
 * Consolida dados reais de:
 * - Competição (nome, modalidade)
 * - Equipes inscritas (CompetitionTeam + TeamRecord)
 * - Situação na competição (draft, pending, approved, rejected)
 * - Responsável / Gestor (managerName, managerEmail, managerPhone)
 * - Comissão Técnica declarada (coachName, assistantCoach, physicalTrainer, doctor)
 * - Elenco oficial de atletas (CompetitionAthlete) com ordenação canônica
 *
 * REGRA CENTRAL: Não inventa dados de credenciamento inexistentes (sem crachás,
 * sem QR codes, sem permissões artificiais).
 */

import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type {
  DelegationReportData,
  DelegationTeamRow,
  DelegationAthleteRow,
} from '@/lib/pdf/types';

export interface BuildDelegationReportParams {
  competition: CompetitionRecord | null | undefined;
  teams: TeamRecord[];
  athletes: CompetitionAthlete[];
  competitionTeams: CompetitionTeam[];
}

/**
 * Traduz o status técnico de inscrição da equipe para label amigável em português
 */
export function formatRegistrationStatus(status: string): string {
  switch (status) {
    case 'approved':
      return 'Aprovada';
    case 'pending':
    case 'invited':
      return 'Pendente';
    case 'draft':
      return 'Rascunho';
    case 'in_progress':
      return 'Em Preenchimento';
    case 'submitted':
      return 'Finalizada';
    case 'rejected':
      return 'Rejeitada';
    default:
      return status || 'Pendente';
  }
}

/**
 * Ordena os atletas do elenco de acordo com as regras oficiais:
 * 1. Número da camisa ASC (números definidos primeiro)
 * 2. Atletas sem camisa ordenados por nome ASC
 * 3. ID ASC como desempate determinístico
 */
export function sortDelegationAthletes(
  athletes: DelegationAthleteRow[],
): DelegationAthleteRow[] {
  return athletes.slice().sort((a, b) => {
    const numA = a.jerseyNumber;
    const numB = b.jerseyNumber;

    if (numA != null && numB != null) {
      if (numA !== numB) return numA - numB;
    } else if (numA != null && numB == null) {
      return -1;
    } else if (numA == null && numB != null) {
      return 1;
    }

    const nameComp = a.name.localeCompare(b.name, 'pt-BR');
    if (nameComp !== 0) return nameComp;

    return a.athleteId.localeCompare(b.athleteId);
  });
}

/**
 * Constrói o View Model completo e unificado para a Relação Oficial de Delegações & Responsáveis
 */
export function buildDelegationReportData({
  competition,
  teams,
  athletes,
  competitionTeams,
}: BuildDelegationReportParams): DelegationReportData {
  if (!competition) {
    return {
      competitionId: '',
      competitionName: 'Competição',
      metrics: {
        totalTeams: 0,
        approvedTeams: 0,
        pendingTeams: 0,
        totalAthletes: 0,
        teamsWithManager: 0,
        teamsWithCoach: 0,
      },
      teams: [],
    };
  }

  // Índices em memória O(1)
  const teamMap = new Map<string, TeamRecord>(teams.map((t) => [t.id, t]));

  // Agrupa atletas por competition_team_id
  const athletesByCompTeam = new Map<string, CompetitionAthlete[]>();
  for (const ath of athletes) {
    const list = athletesByCompTeam.get(ath.competitionTeamId);
    if (list) {
      list.push(ath);
    } else {
      athletesByCompTeam.set(ath.competitionTeamId, [ath]);
    }
  }

  // Filtra equipes inscritas na competição ativa
  const compTeams = competitionTeams.filter(
    (ct) => ct.competitionId === competition.id,
  );

  const teamRows: DelegationTeamRow[] = compTeams.map((ct) => {
    const masterTeam = teamMap.get(ct.teamId);
    const rawAthletes = athletesByCompTeam.get(ct.id) || [];

    const mappedAthletes: DelegationAthleteRow[] = rawAthletes.map((a) => ({
      athleteId: a.id,
      name: a.name,
      jerseyNumber: a.jerseyNumber,
      position: a.position || 'Atleta',
      documentNumber: a.documentNumber,
      birthDate: a.birthDate,
      isCaptain: Boolean(a.isCaptain),
      isLibero: Boolean(a.isLibero),
    }));

    const sortedAthletes = sortDelegationAthletes(mappedAthletes);

    return {
      teamId: ct.teamId,
      competitionTeamId: ct.id,
      teamName: masterTeam?.name || ct.teamName || 'Equipe',
      teamShortName: masterTeam?.shortName || ct.teamShortName,
      teamLogoUrl: masterTeam?.logoUrl,
      city: masterTeam?.city,
      state: masterTeam?.state,
      modality: masterTeam?.modality || competition.modality,
      registrationStatus: formatRegistrationStatus(ct.status),
      rawStatus: ct.status || 'pending',
      isLocked: Boolean(ct.isLocked),
      managerName: masterTeam?.managerName?.trim() || undefined,
      managerEmail: masterTeam?.managerEmail?.trim() || undefined,
      managerPhone: masterTeam?.managerPhone?.trim() || undefined,
      coachName: masterTeam?.coachName?.trim() || undefined,
      assistantCoach: masterTeam?.assistantCoach?.trim() || undefined,
      physicalTrainer: masterTeam?.physicalTrainer?.trim() || undefined,
      doctor: masterTeam?.doctor?.trim() || undefined,
      athleteCount: sortedAthletes.length,
      athletes: sortedAthletes,
    };
  });

  // Ordenação determinística das equipes:
  // 1. Nome da equipe ASC
  // 2. ID da equipe ASC
  const sortedTeamRows = teamRows.slice().sort((a, b) => {
    const nameComp = a.teamName.localeCompare(b.teamName, 'pt-BR');
    if (nameComp !== 0) return nameComp;
    return a.teamId.localeCompare(b.teamId);
  });

  // Métricas operacionais consolidadas
  const totalTeams = sortedTeamRows.length;
  const approvedTeams = sortedTeamRows.filter(
    (t) => t.rawStatus === 'approved',
  ).length;
  const pendingTeams = sortedTeamRows.filter(
    (t) =>
      t.rawStatus === 'pending' ||
      t.rawStatus === 'draft' ||
      t.rawStatus === 'invited' ||
      t.rawStatus === 'in_progress',
  ).length;
  const totalAthletes = sortedTeamRows.reduce(
    (acc, t) => acc + t.athleteCount,
    0,
  );
  const teamsWithManager = sortedTeamRows.filter((t) => Boolean(t.managerName))
    .length;
  const teamsWithCoach = sortedTeamRows.filter((t) => Boolean(t.coachName))
    .length;

  return {
    competitionId: competition.id,
    competitionName: competition.name,
    competitionModality: competition.modality,
    metrics: {
      totalTeams,
      approvedTeams,
      pendingTeams,
      totalAthletes,
      teamsWithManager,
      teamsWithCoach,
    },
    teams: sortedTeamRows,
  };
}
