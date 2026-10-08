/**
 * BaseOS — Mapper Canônico de Competição (Fase 8.3)
 *
 * Responsabilidade:
 * Função pura e determinística que converte entre a entidade de domínio CompetitionRecord
 * e as colunas físicas reais da tabela `public.competitions` no PostgreSQL 17.6.
 *
 * Diretriz: NO CODE BEFORE CONTRACT
 * - A tabela `public.competitions` possui EXATAMENTE 22 colunas físicas:
 *   id, name, slug, modality, format, player_format, set_format, gender_category,
 *   default_deadline, group_name, start_date, end_date, venue, status,
 *   config, rules_snapshot, organizer_id, organization_id, logo_url, supporters, created_at, updated_at.
 *
 * - Nenhum campo regulatório (groupsCount, advancingPerGroup, bestThirdsCount, etc.)
 *   deve ser persistido como coluna física. Todos pertencem exclusivamente ao JSONB `config`.
 */

import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionConfig } from '@/types/competitionConfig';
import { normalizeSupporters } from '@/lib/supporters';

/**
 * Colunas físicas permitidas em public.competitions.
 */
export const COMPETITION_PHYSICAL_COLUMNS = [
  'id',
  'name',
  'slug',
  'modality',
  'format',
  'player_format',
  'set_format',
  'gender_category',
  'default_deadline',
  'group_name',
  'start_date',
  'end_date',
  'venue',
  'status',
  'config',
  'rules_snapshot',
  'organizer_id',
  'organization_id',
  'logo_url',
  'supporters',
  'created_at',
  'updated_at',
] as const;

export type CompetitionPhysicalColumn = typeof COMPETITION_PHYSICAL_COLUMNS[number];

/**
 * Converte um CompetitionRecord (domínio) para o payload de persistência física (PostgreSQL/PostgREST).
 * Garante que somente colunas físicas existentes sejam enviadas e consolida os campos regulatórios em `config`.
 */
export function toPersistence(domain: Partial<CompetitionRecord>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  // 1. Colunas físicas diretas
  if (domain.id !== undefined) payload.id = domain.id;
  if (domain.name !== undefined) payload.name = domain.name.trim();
  if (domain.slug !== undefined) payload.slug = domain.slug?.trim() || null;
  if (domain.modality !== undefined) payload.modality = domain.modality;
  if (domain.format !== undefined) payload.format = domain.format;
  if (domain.playerFormat !== undefined) payload.player_format = domain.playerFormat;
  if (domain.setFormat !== undefined) payload.set_format = domain.setFormat;
  if (domain.genderCategory !== undefined) payload.gender_category = domain.genderCategory;
  if (domain.defaultDeadline !== undefined) payload.default_deadline = domain.defaultDeadline ? new Date(domain.defaultDeadline).toISOString() : null;
  if (domain.groupName !== undefined) payload.group_name = domain.groupName || null;
  if (domain.startDate !== undefined) payload.start_date = domain.startDate || null;
  if (domain.endDate !== undefined) payload.end_date = domain.endDate || null;
  if (domain.venue !== undefined) payload.venue = domain.venue?.trim() || null;
  if (domain.status !== undefined) payload.status = domain.status;
  if ((domain as Record<string, unknown>).organizerId !== undefined) payload.organizer_id = (domain as Record<string, unknown>).organizerId || null;
  if (domain.organizationId !== undefined && domain.organizationId !== null) {
    const orgId = String(domain.organizationId).trim();
    if (orgId) payload.organization_id = orgId;
  }
  if (domain.logoUrl !== undefined) payload.logo_url = domain.logoUrl || null;
  if (domain.supporters !== undefined) payload.supporters = normalizeSupporters(domain.supporters);
  if (domain.rulesSnapshot !== undefined) payload.rules_snapshot = domain.rulesSnapshot;
  if (domain.createdAt !== undefined) payload.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) payload.updated_at = domain.updatedAt;

  // 2. Consolidação de Campos Regulatórios no JSONB `config`
  let config: Record<string, unknown> = {};
  if (domain.config && typeof domain.config === 'object') {
    config = JSON.parse(JSON.stringify(domain.config));
  } else {
    config = {
      version: 1,
      format: {},
      scoring: {},
      standings: {},
      registration: {},
      schedule: {},
    };
  }

  // Standings / Classificação
  if (!config.standings || typeof config.standings !== 'object') {
    config.standings = {};
  }
  const standings = config.standings as Record<string, unknown>;

  if (domain.groupsCount !== undefined) {
    standings.groupsCount = domain.groupsCount;
    config.groupsCount = domain.groupsCount;
  }
  if (domain.teamsPerGroup !== undefined) {
    config.teamsPerGroup = domain.teamsPerGroup;
  }
  if (domain.advancingPerGroup !== undefined) {
    standings.advancingPerGroup = domain.advancingPerGroup;
    config.advancingPerGroup = domain.advancingPerGroup;
  }
  if ((domain as Record<string, unknown>).thirdPlaceMatch !== undefined) {
    config.thirdPlaceMatch = (domain as Record<string, unknown>).thirdPlaceMatch;
  }
  if (domain.bestThirdsCount !== undefined) {
    standings.bestThirds = {
      enabled: domain.bestThirdsCount > 0,
      count: domain.bestThirdsCount,
    };
  } else if (domain.useBestThirds !== undefined) {
    standings.bestThirds = {
      enabled: domain.useBestThirds,
      count: ((standings.bestThirds as Record<string, unknown>)?.count as number) || 0,
    };
  }
  if (domain.tiebreakCriteriaOrder !== undefined) {
    standings.tiebreakCriteriaOrder = domain.tiebreakCriteriaOrder;
  }

  // Format overrides
  if (!config.format || typeof config.format !== 'object') {
    config.format = {};
  }
  const format = config.format as Record<string, unknown>;
  if (domain.phaseSetRules !== undefined) {
    format.phaseOverrides = domain.phaseSetRules;
  }

  // Schedule / Prazos
  if (!config.schedule || typeof config.schedule !== 'object') {
    config.schedule = {};
  }
  const schedule = config.schedule as Record<string, unknown>;
  if (domain.defaultMatchIntervalMinutes !== undefined) {
    schedule.matchInterval = domain.defaultMatchIntervalMinutes;
  }
  if (domain.minTeamRestMinutes !== undefined) {
    schedule.minRest = domain.minTeamRestMinutes;
  }

  // Registration / Capacidade explícita
  if (!config.registration || typeof config.registration !== 'object') {
    config.registration = {};
  }
  const registration = config.registration as Record<string, unknown>;
  const domainAny = domain as Record<string, unknown>;
  if (domainAny.maxTeams !== undefined && typeof domainAny.maxTeams === 'number') {
    registration.maxTeams = domainAny.maxTeams;
  }

  // WO Rules
  if (domain.woRules !== undefined) {
    config.woRules = domain.woRules;
  }

  payload.config = config;

  // Garante que somente colunas físicas existentes sejam enviadas
  const sanitized: Record<string, unknown> = {};
  for (const col of COMPETITION_PHYSICAL_COLUMNS) {
    if (col in payload && payload[col] !== undefined) {
      sanitized[col] = payload[col];
    }
  }

  return sanitized;
}

/**
 * Converte uma linha física do banco (public.competitions) em um CompetitionRecord de domínio.
 * Projeta os campos regulatórios de `config` nas propriedades de nível superior para retrocompatibilidade.
 */
export function toDomain(row: Record<string, unknown>): CompetitionRecord {
  const config = (row.config && typeof row.config === 'object' ? row.config : {}) as Record<string, unknown>;
  const standings = (config.standings && typeof config.standings === 'object' ? config.standings : {}) as Record<string, unknown>;
  const bestThirds = (standings.bestThirds && typeof standings.bestThirds === 'object' ? standings.bestThirds : {}) as Record<string, unknown>;
  const format = (config.format && typeof config.format === 'object' ? config.format : {}) as Record<string, unknown>;
  const schedule = (config.schedule && typeof config.schedule === 'object' ? config.schedule : {}) as Record<string, unknown>;
  const registration = (config.registration && typeof config.registration === 'object' ? config.registration : {}) as Record<string, unknown>;

  const record: CompetitionRecord = {
    id: String(row.id || ''),
    name: String(row.name || ''),
    slug: row.slug ? String(row.slug) : undefined,
    modality: (row.modality as 'indoor' | 'beach') || 'indoor',
    format: String(row.format || 'round-robin'),
    playerFormat: String(row.player_format || (row.modality === 'beach' ? '2x2' : '6x6')),
    setFormat: String(row.set_format || '5-sets'),
    genderCategory: (row.gender_category as 'male' | 'female' | 'mixed') || 'female',
    status: (row.status as CompetitionRecord['status']) || 'registration-open',
    defaultDeadline: row.default_deadline ? String(row.default_deadline) : undefined,
    groupName: row.group_name ? String(row.group_name) : undefined,
    startDate: row.start_date ? String(row.start_date) : undefined,
    endDate: row.end_date ? String(row.end_date) : undefined,
    venue: row.venue ? String(row.venue) : undefined,
    logoUrl: row.logo_url ? String(row.logo_url) : undefined,
    supporters: normalizeSupporters(row.supporters),
    config: (row.config as CompetitionConfig) || undefined,
    rulesSnapshot: (row.rules_snapshot as CompetitionConfig) || undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,

    // Projeções regulatórias retrocompatíveis a partir de config
    groupsCount: typeof standings.groupsCount === 'number'
      ? standings.groupsCount
      : (typeof config.groupsCount === 'number' ? config.groupsCount : undefined),
    teamsPerGroup: typeof config.teamsPerGroup === 'number' ? config.teamsPerGroup : undefined,
    advancingPerGroup: typeof standings.advancingPerGroup === 'number'
      ? standings.advancingPerGroup
      : (typeof config.advancingPerGroup === 'number' ? config.advancingPerGroup : undefined),
    bestThirdsCount: typeof bestThirds.count === 'number' ? bestThirds.count : undefined,
    useBestThirds: typeof bestThirds.enabled === 'boolean' ? bestThirds.enabled : undefined,
    tiebreakCriteriaOrder: Array.isArray(standings.tiebreakCriteriaOrder) ? (standings.tiebreakCriteriaOrder as CompetitionRecord['tiebreakCriteriaOrder']) : undefined,
    phaseSetRules: format.phaseOverrides ? (format.phaseOverrides as CompetitionRecord['phaseSetRules']) : undefined,
    defaultMatchIntervalMinutes: typeof schedule.matchInterval === 'number' ? schedule.matchInterval : undefined,
    minTeamRestMinutes: typeof schedule.minRest === 'number' ? schedule.minRest : undefined,
    woRules: typeof config.woRules === 'string' ? config.woRules : undefined,
  };

  if (row.organizer_id) {
    (record as Record<string, unknown>).organizerId = String(row.organizer_id);
  }
  if (row.organization_id) {
    record.organizationId = String(row.organization_id);
  }

  // Capacidade explícita
  if (typeof registration.maxTeams === 'number') {
    (record as Record<string, unknown>).maxTeams = registration.maxTeams;
  }

  return record;
}

/**
 * Valida a presença obrigatória de organizationId antes da persistência de uma nova competição.
 */
export function assertCompetitionOrganization(domain: { organizationId?: string | null }): string {
  const orgId = domain.organizationId?.trim();
  if (!orgId) {
    throw new Error('Não foi possível criar a competição porque nenhuma organização está ativa.');
  }
  return orgId;
}

export const competitionMapper = {
  toPersistence,
  toDomain,
  assertCompetitionOrganization,
  PHYSICAL_COLUMNS: COMPETITION_PHYSICAL_COLUMNS,
};
