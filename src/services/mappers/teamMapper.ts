/**
 * BaseOS — Mapper Canônico de Equipe (Fase 8.3)
 *
 * Responsabilidade:
 * Função pura e determinística que converte entre a entidade de domínio TeamRecord
 * e as colunas físicas reais da tabela `public.teams` no PostgreSQL 17.6.
 *
 * Diretriz: NO CODE BEFORE CONTRACT
 * - A tabela `public.teams` possui EXATAMENTE 9 colunas físicas:
 *   id, name, short_name, modality, coach_name, city, logo_url, created_at, updated_at.
 *
 * - Campos de outras entidades ou legados (managerPassword, managerName, managerEmail,
 *   managerPhone, registrationToken, state, assistantCoach, physicalTrainer, doctor)
 *   NÃO pertencem a esta tabela e são terminantemente descartados antes do envio ao banco.
 * - NENHUMA senha em texto plano (managerPassword) é persistida.
 */

import type { TeamRecord } from '@/types/entities';

export const TEAM_PHYSICAL_COLUMNS = [
  'id',
  'name',
  'short_name',
  'modality',
  'coach_name',
  'city',
  'logo_url',
  'created_at',
  'updated_at',
] as const;

export type TeamPhysicalColumn = typeof TEAM_PHYSICAL_COLUMNS[number];

/**
 * Converte um TeamRecord de domínio para o payload físico de public.teams.
 * Filtra estritamente as 9 colunas físicas reais.
 */
export function toPersistence(domain: Partial<TeamRecord>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (domain.id !== undefined) payload.id = domain.id;
  if (domain.name !== undefined) payload.name = domain.name.trim();
  if (domain.shortName !== undefined) payload.short_name = domain.shortName.trim().toUpperCase();
  if (domain.modality !== undefined) payload.modality = domain.modality;
  if (domain.coachName !== undefined) payload.coach_name = domain.coachName?.trim() || null;
  if (domain.city !== undefined) payload.city = domain.city?.trim() || null;
  if (domain.logoUrl !== undefined) payload.logo_url = domain.logoUrl || null;
  if (domain.createdAt !== undefined) payload.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) payload.updated_at = domain.updatedAt;

  const sanitized: Record<string, unknown> = {};
  for (const col of TEAM_PHYSICAL_COLUMNS) {
    if (col in payload && payload[col] !== undefined) {
      sanitized[col] = payload[col];
    }
  }

  return sanitized;
}

/**
 * Converte uma linha física de public.teams para TeamRecord de domínio.
 */
export function toDomain(row: Record<string, unknown>): TeamRecord {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    shortName: String(row.short_name || ''),
    modality: (row.modality as 'indoor' | 'beach') || 'indoor',
    coachName: row.coach_name ? String(row.coach_name) : undefined,
    city: row.city ? String(row.city) : undefined,
    logoUrl: row.logo_url ? String(row.logo_url) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export const teamMapper = {
  toPersistence,
  toDomain,
  PHYSICAL_COLUMNS: TEAM_PHYSICAL_COLUMNS,
};
