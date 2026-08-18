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
import { dataAccess } from './dataAccess';

export function isDeadlineExpired(competitionTeam: CompetitionTeam, now: Date = new Date()): boolean {
  return now.getTime() > new Date(competitionTeam.registrationDeadline).getTime();
}

export function isRegistrationLocked(competitionTeam: CompetitionTeam, now: Date = new Date()): boolean {
  return competitionTeam.isLocked || isDeadlineExpired(competitionTeam, now);
}

export function getRosterLimits(playerFormat: string): { min: number; max: number } {
  return ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6'];
}

export function validateAthleteInput(
  input: CompetitionAthleteInput,
  existing: CompetitionAthlete[],
  playerFormat: string,
  excludeId?: string,
): RegistrationValidationResult {
  const errors: string[] = [];
  const limits = getRosterLimits(playerFormat);

  if (!input.name.trim()) errors.push('Nome do atleta é obrigatório.');
  if (!input.position.trim()) errors.push('Posição é obrigatória.');

  if (!Number.isInteger(input.jerseyNumber) || input.jerseyNumber < 1 || input.jerseyNumber > 99) {
    errors.push('Número da camisa deve estar entre 1 e 99.');
  } else if (existing.some(a => a.jerseyNumber === input.jerseyNumber && a.id !== excludeId)) {
    errors.push(`Já existe atleta com a camisa ${input.jerseyNumber} nesta equipe.`);
  }

  const captainCount = existing.filter(a => a.isCaptain).length;
  const liberoCount = existing.filter(a => a.isLibero).length;

  if (input.isCaptain && captainCount >= MAX_CAPTAINS) {
    errors.push('Só é permitido 1 capitão por equipe.');
  }
  if (input.isLibero && liberoCount >= MAX_LIBEROS) {
    errors.push(`Máximo de ${MAX_LIBEROS} líberos por equipe.`);
  }

  // Limite máximo de atletas (adicionando o novo)
  if (existing.length + 1 > limits.max) {
    errors.push(`Limite máximo de ${limits.max} atletas por equipe atingido.`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateRosterMinimum(athletes: CompetitionAthlete[], playerFormat: string): RegistrationValidationResult {
  const limits = getRosterLimits(playerFormat);
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

export async function listRoster(competitionTeamId: string): Promise<CompetitionAthlete[]> {
  const all = await dataAccess.listCompetitionAthletes(competitionTeamId);
  return [...all].sort((a, b) => a.jerseyNumber - b.jerseyNumber);
}

export async function addAthlete(
  competitionTeamId: string,
  input: CompetitionAthleteInput,
  playerFormat: string,
): Promise<{ ok: boolean; errors: string[]; athlete?: CompetitionAthlete }> {
  const team = await dataAccess.getCompetitionTeamById(competitionTeamId);
  if (!team) return { ok: false, errors: ['Convite de equipe não encontrado.'] };
  if (isRegistrationLocked(team)) {
    return { ok: false, errors: ['Prazo de inscrição encerrado. Contate o organizador.'] };
  }

  const existing = await listRoster(competitionTeamId);
  const validation = validateAthleteInput(input, existing, playerFormat);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const athlete = await dataAccess.createCompetitionAthlete({
    ...input,
    competitionTeamId,
    name: input.name.trim(),
    position: input.position.trim(),
  });

  if (team.status === 'invited') {
    await dataAccess.updateCompetitionTeam(team.id, { status: 'in_progress' });
  }

  return { ok: true, errors: [], athlete };
}

export async function updateAthlete(
  id: string,
  input: CompetitionAthleteInput,
  playerFormat: string,
): Promise<{ ok: boolean; errors: string[]; athlete?: CompetitionAthlete }> {
  const current = await dataAccess.listCompetitionAthletes().then(list => list.find(a => a.id === id));
  if (!current) return { ok: false, errors: ['Atleta não encontrado.'] };

  const team = await dataAccess.getCompetitionTeamById(current.competitionTeamId);
  if (!team) return { ok: false, errors: ['Equipe não encontrada.'] };
  if (isRegistrationLocked(team)) {
    return { ok: false, errors: ['Prazo de inscrição encerrado. Contate o organizador.'] };
  }

  const siblings = await listRoster(current.competitionTeamId);
  const validation = validateAthleteInput(input, siblings.filter(a => a.id !== id), playerFormat, id);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const athlete = await dataAccess.updateCompetitionAthlete(id, input);
  return { ok: true, errors: [], athlete };
}

export async function removeAthlete(id: string): Promise<{ ok: boolean; errors: string[] }> {
  const current = await dataAccess.listCompetitionAthletes().then(list => list.find(a => a.id === id));
  if (!current) return { ok: false, errors: ['Atleta não encontrado.'] };

  const team = await dataAccess.getCompetitionTeamById(current.competitionTeamId);
  if (!team) return { ok: false, errors: ['Equipe não encontrada.'] };
  if (isRegistrationLocked(team)) {
    return { ok: false, errors: ['Prazo de inscrição encerrado. Contate o organizador.'] };
  }

  await dataAccess.deleteCompetitionAthlete(id);
  return { ok: true, errors: [] };
}

export async function markRosterSubmitted(competitionTeamId: string): Promise<CompetitionTeam | null> {
  const team = await dataAccess.getCompetitionTeamById(competitionTeamId);
  if (!team) return null;
  if (isRegistrationLocked(team)) return team;
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
