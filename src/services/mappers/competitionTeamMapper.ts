/**
 * BaseOS — Mapper Canônico de Equipe na Competição (Fase 8.3)
 *
 * Responsabilidade:
 * Função pura e determinística que converte entre a entidade de domínio CompetitionTeam
 * e as colunas físicas reais da tabela `public.competition_teams` no PostgreSQL 17.6.
 *
 * Diretriz: NO CODE BEFORE CONTRACT
 * - A tabela `public.competition_teams` possui EXATAMENTE 12 colunas físicas:
 *   id, competition_id, team_id, team_name, team_short_name, access_token,
 *   registration_deadline, is_locked, status, custom_notes, created_at, updated_at.
 *
 * - O access_token pertence exclusivamente ao vínculo de participação da equipe naquela competição,
 *   servindo para acesso controlado ao formulário de envio de elenco sem senha.
 */

import type { CompetitionTeam, RegistrationStatus } from '@/types/registration';

export const COMPETITION_TEAM_PHYSICAL_COLUMNS = [
  'id',
  'competition_id',
  'team_id',
  'team_name',
  'team_short_name',
  'access_token',
  'registration_deadline',
  'is_locked',
  'status',
  'custom_notes',
  'created_at',
  'updated_at',
] as const;

export type CompetitionTeamPhysicalColumn = typeof COMPETITION_TEAM_PHYSICAL_COLUMNS[number];

/**
 * Converte um CompetitionTeam de domínio para payload de public.competition_teams.
 */
export function toPersistence(domain: Partial<CompetitionTeam>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (domain.id !== undefined) payload.id = domain.id;
  if (domain.competitionId !== undefined) payload.competition_id = domain.competitionId;
  if (domain.teamId !== undefined) payload.team_id = domain.teamId;
  if (domain.teamName !== undefined) payload.team_name = domain.teamName.trim();
  if (domain.teamShortName !== undefined) payload.team_short_name = domain.teamShortName.trim().toUpperCase();
  payload.access_token = domain.accessToken || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  if (domain.registrationDeadline !== undefined) {
    payload.registration_deadline = domain.registrationDeadline
      ? new Date(domain.registrationDeadline).toISOString()
      : new Date().toISOString();
  }
  if (domain.isLocked !== undefined) payload.is_locked = Boolean(domain.isLocked);
  if (domain.status !== undefined) payload.status = domain.status;
  if (domain.customNotes !== undefined) payload.custom_notes = domain.customNotes || null;
  if (domain.createdAt !== undefined) payload.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) payload.updated_at = domain.updatedAt;

  const sanitized: Record<string, unknown> = {};
  for (const col of COMPETITION_TEAM_PHYSICAL_COLUMNS) {
    if (col in payload && payload[col] !== undefined) {
      sanitized[col] = payload[col];
    }
  }

  return sanitized;
}

/**
 * Converte uma linha física de public.competition_teams para CompetitionTeam de domínio.
 */
export function toDomain(row: Record<string, unknown>): CompetitionTeam {
  return {
    id: String(row.id || ''),
    competitionId: String(row.competition_id || ''),
    teamId: String(row.team_id || ''),
    teamName: String(row.team_name || ''),
    teamShortName: String(row.team_short_name || ''),
    accessToken: String(row.access_token || ''),
    registrationDeadline: String(row.registration_deadline || ''),
    isLocked: Boolean(row.is_locked),
    status: (row.status as RegistrationStatus) || 'invited',
    customNotes: row.custom_notes ? String(row.custom_notes) : undefined,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export const competitionTeamMapper = {
  toPersistence,
  toDomain,
  PHYSICAL_COLUMNS: COMPETITION_TEAM_PHYSICAL_COLUMNS,
};
