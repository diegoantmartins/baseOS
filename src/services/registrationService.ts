// Serviço de Inscrição Online por Equipe.
//
// Regras de negócio:
//  - Validação de prazo limite (aberto antes, bloqueado depois)
//  - Limites de elenco por formato (mínimo 6 / máximo 14-18 atletas em quadra)
//  - Duplicidade de número de camisa na mesma equipe
//  - Máximo de 2 líberos e 1 capitão por equipe
//  - Busca de elenco inscrito por partida (via equipes do confronto)

import type { CompetitionAthlete, CompetitionAthleteInput, CompetitionTeam, RegistrationValidationResult } from '@/types/registration';
import { MAX_CAPTAINS, MAX_LIBEROS, ROSTER_LIMITS } from '@/types/registration';
import type { CompetitionLifecycleStatus, CompetitionRecord, TeamRecord } from '@/types/entities';
import { CompetitionRulesService } from './competitionRulesService';
import { CompetitionRegistrationService } from './competitionRegistrationService';
import { dataAccess, generateToken } from './dataAccess';
import { OperationalAuditService } from './operationalAuditService';
import { getOrCreateAthleteIdentity } from './identityService';

export function isDeadlineExpired(competitionTeam: CompetitionTeam, now: Date = new Date()): boolean {
  return now.getTime() > new Date(competitionTeam.registrationDeadline).getTime();
}

export function isRegistrationLocked(
  competitionTeam: CompetitionTeam,
  competitionOrNow?: CompetitionRecord | null | Date,
  maybeNow?: Date,
): boolean {
  let competition: CompetitionRecord | null | undefined;
  let now: Date;

  if (competitionOrNow instanceof Date) {
    now = competitionOrNow;
  } else {
    competition = competitionOrNow;
    now = maybeNow instanceof Date ? maybeNow : new Date();
  }

  if (competitionTeam.isLocked) return true;
  if (isDeadlineExpired(competitionTeam, now)) return true;

  if (competition) {
    const lockedStatuses: CompetitionLifecycleStatus[] = [
      'planning',
      'draft',
      'registration-closed',
      'draw-pending',
      'groups-defined',
      'in-progress',
      'playoffs',
      'completed',
      'cancelled',
    ];
    if (lockedStatuses.includes(competition.status)) {
      return true;
    }
  }

  return false;
}

export function getRosterLimits(
  playerFormat: string,
  competition?: CompetitionRecord,
): { min: number; max: number; maxLiberos: number; maxCaptains: number } {
  if (competition) {
    return CompetitionRulesService.getRosterLimits(competition);
  }
  const base = ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6'];
  return {
    min: base.min,
    max: base.max,
    maxLiberos: MAX_LIBEROS,
    maxCaptains: MAX_CAPTAINS,
  };
}

export function validateAthleteInput(
  input: CompetitionAthleteInput,
  existing: CompetitionAthlete[],
  playerFormat: string,
  excludeId?: string,
  competition?: CompetitionRecord,
): RegistrationValidationResult {
  const errors: string[] = [];
  const limits = getRosterLimits(playerFormat, competition);

  if (!input.name.trim()) errors.push('Nome do atleta é obrigatório.');
  if (!input.position.trim()) errors.push('Posição é obrigatória.');

  if (input.jerseyNumber === undefined || input.jerseyNumber === null) {
    // Número opcional: confirmado no dia da competição.
  } else if (!Number.isInteger(input.jerseyNumber) || input.jerseyNumber < 1 || input.jerseyNumber > 99) {
    errors.push('Número da camisa deve estar entre 1 e 99.');
  } else if (existing.some(a => a.jerseyNumber === input.jerseyNumber && a.id !== excludeId)) {
    errors.push(`Já existe atleta com a camisa ${input.jerseyNumber} nesta equipe.`);
  }

  const captainCount = existing.filter(a => a.isCaptain).length;
  const liberoCount = existing.filter(a => a.isLibero).length;

  if (input.isCaptain && captainCount >= limits.maxCaptains) {
    errors.push(`Só é permitido ${limits.maxCaptains} capitão por equipe.`);
  }
  if (input.isLibero && liberoCount >= limits.maxLiberos) {
    errors.push(`Máximo de ${limits.maxLiberos} líberos por equipe.`);
  }

  // Limite máximo de atletas (adicionando o novo)
  if (existing.length + 1 > limits.max) {
    errors.push(`Limite máximo de ${limits.max} atletas por equipe atingido.`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateRosterMinimum(
  athletes: CompetitionAthlete[],
  playerFormat: string,
  competition?: CompetitionRecord,
): RegistrationValidationResult {
  const limits = getRosterLimits(playerFormat, competition);
  if (athletes.length < limits.min) {
    return {
      valid: false,
      errors: [`Mínimo de ${limits.min} atletas para ${playerFormat} (atual: ${athletes.length}).`],
    };
  }
  return { valid: true, errors: [] };
}

export function formatDeadline(deadlineIso: string): string {
  return new Date(deadlineIso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Operações de domínio
// ============================================================================

export async function getCompetitionTeamByToken(token: string): Promise<CompetitionTeam | null> {
  return dataAccess.getCompetitionTeamByToken(token);
}

export async function getCompetitionTeam(id: string): Promise<CompetitionTeam | null> {
  return dataAccess.getCompetitionTeamById(id);
}

/**
 * Ordenação determinística canônica do elenco:
 * 1. Número da camisa (ascendente) — atletas sem número vão para o fim;
 * 2. Nome do atleta (ordem alfabética pt-BR);
 * 3. ID do atleta como critério de desempate final.
 */
export function sortRosterAthletes<T extends { jerseyNumber?: number | null; name: string; id: string }>(
  athletes: T[]
): T[] {
  return [...athletes].sort((a, b) => {
    const aHasNum = a.jerseyNumber !== undefined && a.jerseyNumber !== null;
    const bHasNum = b.jerseyNumber !== undefined && b.jerseyNumber !== null;

    if (aHasNum && !bHasNum) return -1;
    if (!aHasNum && bHasNum) return 1;

    if (aHasNum && bHasNum) {
      const diff = Number(a.jerseyNumber) - Number(b.jerseyNumber);
      if (diff !== 0) return diff;
    }

    const nameDiff = a.name.localeCompare(b.name, 'pt-BR');
    if (nameDiff !== 0) return nameDiff;

    return a.id.localeCompare(b.id);
  });
}

export async function listRoster(competitionTeamId: string): Promise<CompetitionAthlete[]> {
  const all = await dataAccess.listCompetitionAthletes(competitionTeamId);
  return sortRosterAthletes(all);
}

export async function addAthlete(
  competitionTeamId: string,
  input: CompetitionAthleteInput,
  playerFormat?: string,
  competition?: CompetitionRecord,
): Promise<{ ok: boolean; errors: string[]; athlete?: CompetitionAthlete }> {
  const team = await dataAccess.getCompetitionTeamById(competitionTeamId);
  if (!team) return { ok: false, errors: ['Convite de equipe não encontrado.'] };

  const comp = competition ?? (await dataAccess.getCompetition(team.competitionId));
  if (!comp) return { ok: false, errors: ['Competição não encontrada.'] };

  if (isRegistrationLocked(team, comp)) {
    return { ok: false, errors: ['Prazo de inscrição do elenco desta equipe encerrado ou bloqueado pela organização.'] };
  }

  const [existing, compTeams, allAthletes] = await Promise.all([
    listRoster(competitionTeamId),
    dataAccess.listCompetitionTeams(team.competitionId),
    dataAccess.listCompetitionAthletes(),
  ]);

  const compTeamIds = new Set(compTeams.map(t => t.id));
  const sameCompAthletes = allAthletes.filter(a => compTeamIds.has(a.competitionTeamId));

  const validation = CompetitionRegistrationService.validateAthleteRegistration(
    comp,
    team,
    input,
    existing,
    sameCompAthletes,
  );
  if (!validation.valid) return { ok: false, errors: validation.errors };

  let athlete: CompetitionAthlete;
  if (team.accessToken && typeof dataAccess.registerAthletePublic === 'function') {
    const res = await dataAccess.registerAthletePublic(team.accessToken, {
      ...input,
      name: input.name.trim(),
      position: input.position.trim(),
    });
    if (!res.ok || !res.athlete) {
      return { ok: false, errors: [res.error || 'Falha ao registrar atleta via inscrição pública.'] };
    }
    athlete = res.athlete;
  } else if (typeof dataAccess.registerCompetitionAthleteAuth === 'function') {
    const res = await dataAccess.registerCompetitionAthleteAuth(competitionTeamId, {
      ...input,
      name: input.name.trim(),
      position: input.position.trim(),
    });
    if (!res.ok || !res.athlete) {
      return { ok: false, errors: [res.error || 'Falha ao registrar atleta.'] };
    }
    athlete = res.athlete;
  } else {
    athlete = await dataAccess.createCompetitionAthlete({
      ...input,
      competitionTeamId,
      name: input.name.trim(),
      position: input.position.trim(),
    });
  }

  if (team.status === 'invited') {
    await dataAccess.updateCompetitionTeam(team.id, { status: 'in_progress' });
  }

  return { ok: true, errors: [], athlete };
}

export async function updateAthlete(
  id: string,
  input: CompetitionAthleteInput,
  playerFormat?: string,
  competition?: CompetitionRecord,
): Promise<{ ok: boolean; errors: string[]; athlete?: CompetitionAthlete }> {
  const current = await dataAccess.listCompetitionAthletes().then(list => list.find(a => a.id === id));
  if (!current) return { ok: false, errors: ['Atleta não encontrado.'] };

  const team = await dataAccess.getCompetitionTeamById(current.competitionTeamId);
  if (!team) return { ok: false, errors: ['Equipe não encontrada.'] };

  const comp = competition ?? (await dataAccess.getCompetition(team.competitionId));
  if (!comp) return { ok: false, errors: ['Competição não encontrada.'] };

  if (isRegistrationLocked(team, comp)) {
    return { ok: false, errors: ['Prazo de inscrição do elenco desta equipe encerrado ou bloqueado pela organização.'] };
  }

  const [siblings, compTeams, allAthletes] = await Promise.all([
    listRoster(current.competitionTeamId),
    dataAccess.listCompetitionTeams(team.competitionId),
    dataAccess.listCompetitionAthletes(),
  ]);

  const compTeamIds = new Set(compTeams.map(t => t.id));
  const sameCompAthletes = allAthletes.filter(a => compTeamIds.has(a.competitionTeamId));

  const validation = CompetitionRegistrationService.validateAthleteRegistration(
    comp,
    team,
    input,
    siblings,
    sameCompAthletes,
    id,
  );
  if (!validation.valid) return { ok: false, errors: validation.errors };

  let athleteId = current.athleteId;
  if (input.documentNumber !== undefined && input.documentNumber !== current.documentNumber) {
    const identity = await getOrCreateAthleteIdentity(
      {
        name: input.name.trim(),
        documentNumber: input.documentNumber,
        birthDate: input.birthDate,
      },
      dataAccess,
    );
    athleteId = identity.id;
  }

  const athlete = await dataAccess.updateCompetitionAthlete(id, {
    ...input,
    ...(athleteId ? { athleteId } : {}),
  });
  return { ok: true, errors: [], athlete: athlete ?? undefined };
}

export async function removeAthlete(
  id: string,
  competition?: CompetitionRecord,
): Promise<{ ok: boolean; errors: string[] }> {
  const current = await dataAccess.listCompetitionAthletes().then(list => list.find(a => a.id === id));
  if (!current) return { ok: false, errors: ['Atleta não encontrado.'] };

  const team = await dataAccess.getCompetitionTeamById(current.competitionTeamId);
  if (!team) return { ok: false, errors: ['Equipe não encontrada.'] };

  const comp = competition ?? (await dataAccess.getCompetition(team.competitionId));
  if (!comp) return { ok: false, errors: ['Competição não encontrada.'] };

  if (isRegistrationLocked(team, comp)) {
    return { ok: false, errors: ['Prazo de inscrição do elenco desta equipe encerrado ou bloqueado pela organização.'] };
  }

  const matches = await dataAccess.listMatches(comp.id);
  const check = CompetitionRegistrationService.canRemoveAthleteFromRoster(comp, team, id, matches);
  if (!check.ok) return { ok: false, errors: check.errors };

  await dataAccess.deleteCompetitionAthlete(id);
  return { ok: true, errors: [] };
}

export async function markRosterSubmitted(competitionTeamId: string): Promise<CompetitionTeam | null> {
  const team = await dataAccess.getCompetitionTeamById(competitionTeamId);
  if (!team) return null;
  const comp = await dataAccess.getCompetition(team.competitionId);
  if (isRegistrationLocked(team, comp)) return team;
  return dataAccess.updateCompetitionTeam(team.id, { status: 'submitted' });
}

/**
 * Retorna os elencos de A e B de uma partida, buscando a inscrição da
 * competição de cada equipe. Atletas vêm de competition_athletes.
 */
export async function getMatchRosters(matchId: string): Promise<{
  teamA: CompetitionAthlete[];
  teamB: CompetitionAthlete[];
}> {
  const match = await dataAccess.getMatch(matchId);
  if (!match) return { teamA: [], teamB: [] };

  const registrations = await dataAccess.listCompetitionTeams(match.competitionId);
  const registrationA = registrations.find(r => r.teamId === match.teamAId);
  const registrationB = registrations.find(r => r.teamId === match.teamBId);

  const [teamARaw, teamBRaw] = await Promise.all([
    registrationA ? dataAccess.listCompetitionAthletes(registrationA.id) : Promise.resolve([]),
    registrationB ? dataAccess.listCompetitionAthletes(registrationB.id) : Promise.resolve([]),
  ]);

  return {
    teamA: [...teamARaw].sort((a, b) => a.jerseyNumber - b.jerseyNumber),
    teamB: [...teamBRaw].sort((a, b) => a.jerseyNumber - b.jerseyNumber),
  };
}

// ============================================================================
// FASE 2: Cadastro Unificado de Equipe na Competição (Orquestração de Domínio)
// ============================================================================

export interface RegisterTeamInCompetitionInput {
  competitionId: string;
  // Dados da Equipe
  teamId?: string; // Se selecionada agremiação existente
  name: string;
  shortName: string;
  modality?: 'indoor' | 'beach';
  city?: string;
  state?: string;
  coachName?: string;
  logoUrl?: string;
  // Responsável
  managerName?: string;
  managerPhone?: string;
  managerEmail?: string;
  managerPassword?: string;
  // Auditoria
  operator?: string;
}

export interface RegisterTeamInCompetitionResult {
  ok: boolean;
  errors: string[];
  team?: TeamRecord;
  competitionTeam?: CompetitionTeam;
  isExistingTeamReused?: boolean;
  portalUrl?: string;
  token?: string;
  deadlineIso?: string;
  userId?: string;
}

/**
 * Operação canônica de domínio para cadastrar uma equipe diretamente dentro de uma competição.
 *
 * Realiza:
 * 1. Validação da existência e do ciclo de vida da competição.
 * 2. Validação obrigatória do prazo canônico (herda competition.defaultDeadline sem fallback arbitrário).
 * 3. Validação dos dados cadastrais da equipe e do responsável.
 * 4. Deduplicação e reutilização de TeamRecord existente ou criação de nova agremiação global.
 * 5. Proteção contra duplicidade de inscrição (não cria duas CompetitionTeam para a mesma equipe).
 * 6. Criação da CompetitionTeam oficial com status canônico 'invited'.
 * 7. Associação do gestor como PersonRecord ('manager').
 * 8. Geração de link com accessToken exclusivo do portal da equipe.
 * 9. Trilha de auditoria via OperationalAuditService.
 */
export async function registerTeamInCompetition(
  input: RegisterTeamInCompetitionInput,
): Promise<RegisterTeamInCompetitionResult> {
  // 1. Validar competição
  const competition = await dataAccess.getCompetition(input.competitionId);
  if (!competition) {
    return { ok: false, errors: ['Competição não encontrada.'] };
  }

  // Validar estado da competição
  if (competition.status === 'completed' || competition.status === 'cancelled') {
    return {
      ok: false,
      errors: ['A competição está finalizada ou cancelada e não aceita novas inscrições.'],
    };
  }

  // 2. Validar prazo de inscrição (Prioridade Seção 5: regra canônica da competição, sem fallbacks arbitrários)
  const deadlineIso = competition.defaultDeadline?.trim();
  if (!deadlineIso) {
    return {
      ok: false,
      errors: ['A competição precisa ter um prazo de inscrição configurado antes de cadastrar equipes.'],
    };
  }

  // 3. Validar dados da equipe
  const errors: string[] = [];
  const teamName = input.name.trim();
  const teamShortName = input.shortName.trim().toUpperCase();

  if (teamName.length < 2) {
    errors.push('O nome da equipe deve ter pelo menos 2 caracteres.');
  }

  if (teamShortName.length !== 3) {
    errors.push('A sigla da equipe deve ter exatamente 3 caracteres.');
  }

  // Validar responsável
  const managerName = input.managerName?.trim();
  if (!managerName) {
    errors.push('O nome do responsável é obrigatório.');
  }

  if (input.managerEmail?.trim() && !input.managerEmail.includes('@')) {
    errors.push('E-mail do responsável inválido.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // 4. Localizar ou criar agremiação global (Deduplicação Seção 7)
  const allTeams = await dataAccess.listTeams();
  const currentCompTeams = await dataAccess.listCompetitionTeams(competition.id);

  let targetTeam: TeamRecord | undefined;
  let isExistingTeamReused = false;

  if (input.teamId) {
    targetTeam = allTeams.find(t => t.id === input.teamId);
    if (!targetTeam) {
      return { ok: false, errors: ['Equipe selecionada não encontrada no sistema.'] };
    }
  } else {
    // Busca por nome exato (case-insensitive) ou sigla na mesma modalidade
    const targetModality = input.modality || competition.modality || 'indoor';
    const candidate = allTeams.find(
      t =>
        t.name.trim().toLowerCase() === teamName.toLowerCase() ||
        (t.shortName.trim().toUpperCase() === teamShortName && t.modality === targetModality),
    );

    if (candidate) {
      targetTeam = candidate;
    }
  }

  if (targetTeam) {
    // Checagem de Caso C: A equipe já está inscrita nesta competição?
    const alreadyRegistered = currentCompTeams.find(ct => ct.teamId === targetTeam!.id);
    if (alreadyRegistered) {
      return {
        ok: false,
        errors: [`A equipe "${targetTeam.name}" já está inscrita nesta competição.`],
        team: targetTeam,
        competitionTeam: alreadyRegistered,
        isExistingTeamReused: true,
      };
    }

    isExistingTeamReused = true;
  } else {
    // Caso A: Criar nova TeamRecord global (apenas colunas físicas de public.teams)
    const targetModality = input.modality || competition.modality || 'indoor';
    targetTeam = await dataAccess.createTeam({
      name: teamName,
      shortName: teamShortName,
      modality: targetModality,
      city: input.city?.trim() || undefined,
      coachName: input.coachName?.trim() || undefined,
      logoUrl: input.logoUrl,
    });
    isExistingTeamReused = false;
  }

  // 5. Idempotência / Prevenção contra duplo clique e condição de corrida
  const doubleCheck = await dataAccess.listCompetitionTeams(competition.id);
  const raceRegistered = doubleCheck.find(ct => ct.teamId === targetTeam!.id);
  if (raceRegistered) {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    return {
      ok: true,
      errors: [],
      team: targetTeam,
      competitionTeam: raceRegistered,
      isExistingTeamReused: true,
      portalUrl: `${origin}/equipe/inscricao/${raceRegistered.accessToken}`,
      token: raceRegistered.accessToken,
      deadlineIso: raceRegistered.registrationDeadline,
    };
  }

  // 6. Criar CompetitionTeam oficial
  const competitionTeam = await dataAccess.createCompetitionTeam({
    competitionId: competition.id,
    teamId: targetTeam.id,
    teamName: targetTeam.name,
    teamShortName: targetTeam.shortName,
    registrationDeadline: deadlineIso,
    isLocked: false,
    status: 'invited',
  });

  // 7. Provisionamento de Acesso do Gestor no Supabase Auth + Profile (Fase 8.6.4)
  let authUserId: string | undefined;
  if (input.managerEmail?.trim() && input.managerPassword?.trim()) {
    const provRes = await dataAccess.provisionTeamUser({
      email: input.managerEmail.trim(),
      password: input.managerPassword.trim(),
      name: managerName,
      competitionTeamId: competitionTeam.id,
      phone: input.managerPhone?.trim(),
    });

    if (!provRes.ok) {
      return {
        ok: false,
        errors: [`Equipe cadastrada, mas falhou ao provisionar acesso Auth da equipe: ${provRes.error || 'Erro desconhecido'}`],
        team: targetTeam,
        competitionTeam,
      };
    }
    authUserId = provRes.userId;
  }

  // 8. Trilha de Auditoria Operacional
  const operatorName = input.operator?.trim() || 'Organizador';
  try {
    await OperationalAuditService.recordTeamRegistration({
      competition,
      competitionTeam,
      team: targetTeam,
      managerName,
      operator: operatorName,
      isExistingTeamReused,
    });
  } catch (err) {
    console.warn('Audit team registration note:', err);
  }

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const portalUrl = `${origin}/equipe/inscricao/${competitionTeam.accessToken}`;

  return {
    ok: true,
    errors: [],
    team: {
      ...targetTeam,
      managerName,
      managerPhone: input.managerPhone?.trim() || targetTeam.managerPhone,
      managerEmail: input.managerEmail?.trim() || targetTeam.managerEmail,
      ...(input.managerPassword?.trim() ? { managerPassword: input.managerPassword.trim() } : {}),
    },
    competitionTeam,
    isExistingTeamReused,
    portalUrl,
    token: competitionTeam.accessToken,
    deadlineIso,
    userId: authUserId,
  };
}
