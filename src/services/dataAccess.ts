// Camada de acesso a dados do VolleyPro.
//
// Padrão "adapter": a mesma interface é implementada por
//  - LocalStorage (padrão, funciona sem backend) e
//  - Supabase/PostgreSQL (quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY existem).
//
// Toda a aplicação consome apenas este módulo, então a troca de backend
// é transparente.

import type { CompetitionRecord, MatchAuditEntry, MatchRecord, ModalityRecord, PersonRecord, RefereeRecord, SettingsRecord, TeamRecord, VenueRecord, StageRecord, RoundRecord, MatchSlotRecord, StageRuntimeStatus, RoundRuntimeStatus, SlotParticipantStatus } from '@/types/entities';
import type { ParticipantReference, ProgressionRoute } from '@/types/competitionConfig';
import type { CompetitionAthlete, CompetitionAthleteInput, CompetitionTeam } from '@/types/registration';
import type { DrawRecord, DrawResult } from '@/types/draw';
import type { AthleteIdentity, OrganizationInvitation, OrganizationMemberDetail, OrganizationRecord, UserMembership } from '@/types/identity';
import type { DocumentEdit, DocumentEditKey, TemplateLayout } from '@/types/documentEdit';
import { SEED_VERSION, seedAthletes, seedCompetitionAthletes, seedCompetitionTeams, seedCompetitions, seedDraws, seedMatches, seedModalities, seedOrganizationInvitations, seedOrganizations, seedPersons, seedReferees, seedTeams, seedUserMemberships, seedVenues } from '@/data/seed';
import { getSupabaseClient, isSupabaseConfigured, SUPABASE_TABLES } from '@/lib/supabaseClient';
import { notificationService } from '@/services/notificationService';
import { normalizeSupporters } from '@/lib/supporters';
import { competitionMapper, teamMapper, competitionTeamMapper } from '@/services/mappers';
import { getOrCreateAthleteIdentity, normalizeCpf } from '@/services/identityService';
import { authService } from '@/services/authService';
import { TenantSecurityService } from '@/services/tenantSecurityService';
type CompetitionAthleteCreate = CompetitionAthleteInput & { competitionTeamId: string };

export interface SaveStageDrawAndSlotsParams {
  competitionId: string;
  stage: {
    id?: string;
    competitionId?: string;
    stageId: string;
    name: string;
    stageOrder: number;
    stageType: string;
    status?: StageRuntimeStatus;
    isLocked?: boolean;
    metadata?: Record<string, unknown>;
  };
  rounds: Array<{
    id?: string;
    roundId: string;
    name: string;
    roundOrder: number;
    slotsCount?: number;
    status?: RoundRuntimeStatus;
  }>;
  slots: Array<{
    id?: string;
    slotId: string;
    roundId: string;
    position: number;
    label?: string;
    participantAReference: ParticipantReference;
    participantAStatus?: SlotParticipantStatus;
    resolvedTeamAId?: string | null;
    participantBReference: ParticipantReference;
    participantBStatus?: SlotParticipantStatus;
    resolvedTeamBId?: string | null;
    matchId?: string | null;
    progressionRoute?: ProgressionRoute | Record<string, unknown> | null;
  }>;
}

export interface SaveStageDrawAndSlotsResult {
  ok: boolean;
  stageRowId: string;
  roundsCount: number;
  slotsCount: number;
}

export interface PropagateSlotOutcomeParams {
  competitionId: string;
  slotId: string;
  winnerTeamId?: string | null;
  loserTeamId?: string | null;
  matchId?: string | null;
}

export interface PropagateSlotOutcomeResult {
  ok: boolean;
  sourceSlotId: string;
  idempotent?: boolean;
  updatedCount: number;
  message?: string;
}

export interface MaterializeSlotMatchParams {
  competitionId: string;
  slotId: string;
  scheduledTime?: string;
  venue?: string;
  court?: string;
  phase?: string;
}

export interface MaterializeSlotMatchResult {
  ok: boolean;
  matchId: string;
  alreadyMaterialized: boolean;
  matchNumber?: number;
  message?: string;
}

export interface ProvisionTeamUserInput {
  email: string;
  password: string;
  name: string;
  competitionTeamId: string;
  phone?: string;
}

export interface ProvisionTeamUserResult {
  ok: boolean;
  error?: string;
  userId?: string;
}

const STORAGE_PREFIX = 'voleipro.v1';

/**
 * Identifica se um identificador de equipe é fictício / artificial (ex.: TBD, __BYE__, UNKNOWN).
 * É terminantemente proibido persistir equipes fictícias na nova arquitetura.
 */
export function isArtificialTeamId(teamId: string | null | undefined): boolean {
  if (!teamId) return false;
  const trimmed = teamId.trim().toUpperCase();
  return (
    trimmed.startsWith('TBD') ||
    trimmed.startsWith('__BYE') ||
    trimmed === 'UNKNOWN' ||
    trimmed.startsWith('PLACEHOLDER') ||
    trimmed.startsWith('__')
  );
}

/**
 * Validação estrutural profunda de ParticipantReference no nível TypeScript / dataAccess.
 * Garante conformidade com os 8 tipos canônicos aprovados na Fase 4.4.1 / 4.5.
 */
export function validateParticipantReference(ref: unknown): ParticipantReference {
  if (!ref || typeof ref !== 'object') {
    throw new Error('ParticipantReference deve ser um objeto válido');
  }
  const r = ref as Record<string, unknown>;
  const validTypes = [
    'resolved-team',
    'group-position',
    'overall-ranking',
    'stage-position',
    'match-winner',
    'match-loser',
    'seed',
    'bye'
  ];
  if (!r.type || typeof r.type !== 'string' || !validTypes.includes(r.type)) {
    throw new Error(`ParticipantReference type inválido: ${String(r.type)}`);
  }

  if (r.type === 'resolved-team') {
    if (!r.teamId || typeof r.teamId !== 'string' || !r.teamId.trim()) {
      throw new Error('ParticipantReference resolved-team exige teamId não vazio');
    }
    if (isArtificialTeamId(r.teamId)) {
      throw new Error(`Equipe fictícia não permitida como resolved-team: ${r.teamId}`);
    }
  } else if (r.type === 'group-position') {
    if (!r.stageId || typeof r.stageId !== 'string') {
      throw new Error('ParticipantReference group-position exige stageId não vazio');
    }
    if (typeof r.groupIndex !== 'number' || !Number.isInteger(r.groupIndex) || r.groupIndex < 0) {
      throw new Error('ParticipantReference group-position exige groupIndex inteiro >= 0');
    }
    if (typeof r.position !== 'number' || !Number.isInteger(r.position) || r.position < 1) {
      throw new Error('ParticipantReference group-position exige position inteiro >= 1');
    }
  } else if (r.type === 'overall-ranking') {
    if (!r.stageId || typeof r.stageId !== 'string') {
      throw new Error('ParticipantReference overall-ranking exige stageId não vazio');
    }
    if (typeof r.position !== 'number' || !Number.isInteger(r.position) || r.position < 1) {
      throw new Error('ParticipantReference overall-ranking exige position inteiro >= 1');
    }
    if (r.filter && !['group-winners-only', 'group-runners-up-only', 'non-winners', 'all'].includes(r.filter as string)) {
      throw new Error(`ParticipantReference overall-ranking filtro inválido: ${String(r.filter)}`);
    }
  } else if (r.type === 'stage-position') {
    if (!r.stageId || typeof r.stageId !== 'string') {
      throw new Error('ParticipantReference stage-position exige stageId não vazio');
    }
    if (typeof r.position !== 'number' || !Number.isInteger(r.position) || r.position < 1) {
      throw new Error('ParticipantReference stage-position exige position inteiro >= 1');
    }
  } else if (r.type === 'match-winner' || r.type === 'match-loser') {
    if (!r.slotId || typeof r.slotId !== 'string' || !r.slotId.trim()) {
      throw new Error(`ParticipantReference ${r.type} exige slotId não vazio`);
    }
  } else if (r.type === 'seed') {
    if (typeof r.seedNumber !== 'number' || !Number.isInteger(r.seedNumber) || r.seedNumber < 1) {
      throw new Error('ParticipantReference seed exige seedNumber inteiro >= 1');
    }
  } else if (r.type === 'bye') {
    // bye is valid as { type: 'bye' }
  }

  return ref as ParticipantReference;
}

export const DEFAULT_SETTINGS: SettingsRecord = {
  id: 'main',
  orgName: 'VolleyPro',
  orgCode: 'VP',
  cnpj: '',
  website: '',
  contactEmail: '',
  phone: '',
  address: '',
  documentLogo: '',
  notifications: {
    matchScheduled: true,
    rosterSubmitted: true,
    matchResult: true,
    marketing: false,
    liveGames: true,
    pendingSheets: true,
    dailyDigest: false,
  },
  rules: {
    pointsPerWin: 3,
    pointsPerLoss: 0,
    pointsPerSetWin: 0,
    pointsPerSetLoss: 0,
    tiebreakPoints: 15,
    setPoints: 25,
    timeoutsPerSet: 2,
  },
  theme: 'system',
  language: 'pt-BR',
};

type CollectionName =
  | 'competitions'
  | 'teams'
  | 'referees'
  | 'matches'
  | 'competition_teams'
  | 'competition_athletes'
  | 'venues'
  | 'draws'
  | 'app_settings'
  | 'document_edits'
  | 'template_layouts'
  | 'modalities'
  | 'persons'
  | 'audit_logs'
  | 'competition_stages'
  | 'competition_rounds'
  | 'competition_match_slots'
  | 'user_memberships'
  | 'organizations'
  | 'athletes'
  | 'organization_invitations';


function storageKey(collection: CollectionName): string {
  return `${STORAGE_PREFIX}.${collection}`;
}

function readCollection<T>(collection: CollectionName): T[] {
  ensureSeeded();
  try {
    const raw = localStorage.getItem(storageKey(collection));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCollection<T>(collection: CollectionName, items: T[]): void {
  localStorage.setItem(storageKey(collection), JSON.stringify(items));
}

function ensureSeeded(): void {
  if (localStorage.getItem(SEED_VERSION)) {
    // Backfill sob demanda para coleções da Fase 11 se não existirem no localStorage
    if (!localStorage.getItem(storageKey('organizations'))) {
      writeCollection('organizations', seedOrganizations);
    }
    if (!localStorage.getItem(storageKey('athletes'))) {
      writeCollection('athletes', seedAthletes);
    }
    if (!localStorage.getItem(storageKey('user_memberships'))) {
      writeCollection('user_memberships', seedUserMemberships);
    }
    if (!localStorage.getItem(storageKey('organization_invitations'))) {
      writeCollection('organization_invitations', seedOrganizationInvitations);
    }
    if (!localStorage.getItem('baseos.active_org_id') && !localStorage.getItem('baseos.active_tenant_id')) {
      localStorage.setItem('baseos.active_org_id', 'org-1');
      localStorage.setItem('baseos.active_tenant_id', 'org-1');
    }
    return;
  }

  const isCleanBase = import.meta.env.VITE_EMPTY_DATABASE === 'true';
  if (isCleanBase) {
    writeCollection('competitions', []);
    writeCollection('teams', []);
    writeCollection('referees', []);
    writeCollection('matches', []);
    writeCollection('competition_teams', []);
    writeCollection('competition_athletes', []);
    writeCollection('venues', seedVenues);
    writeCollection('draws', []);
    writeCollection('modalities', seedModalities);
    writeCollection('persons', seedPersons);
    writeCollection('competition_stages', []);
    writeCollection('competition_rounds', []);
    writeCollection('competition_match_slots', []);
    writeCollection('organizations', []);
    writeCollection('athletes', []);
    writeCollection('user_memberships', []);
    writeCollection('organization_invitations', []);
    localStorage.setItem(SEED_VERSION, 'clean');
    return;
  }

  writeCollection('competitions', seedCompetitions);
  writeCollection('teams', seedTeams);
  writeCollection('referees', seedReferees);
  writeCollection('matches', seedMatches);
  writeCollection('competition_teams', seedCompetitionTeams);
  writeCollection('competition_athletes', seedCompetitionAthletes);
  writeCollection('venues', seedVenues);
  writeCollection('draws', seedDraws);
  writeCollection('modalities', seedModalities);
  writeCollection('persons', seedPersons);
  writeCollection('competition_stages', []);
  writeCollection('competition_rounds', []);
  writeCollection('competition_match_slots', []);
  writeCollection('organizations', seedOrganizations);
  writeCollection('athletes', seedAthletes);
  writeCollection('user_memberships', seedUserMemberships);
  writeCollection('organization_invitations', seedOrganizationInvitations);
  if (!localStorage.getItem('baseos.active_org_id') && !localStorage.getItem('baseos.active_tenant_id')) {
    localStorage.setItem('baseos.active_org_id', 'org-1');
    localStorage.setItem('baseos.active_tenant_id', 'org-1');
  }
  localStorage.setItem(SEED_VERSION, '1');
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateToken(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function patch<T extends { id: string }>(item: T, updates: Partial<T>): T {
  return { ...item, ...updates, updatedAt: new Date().toISOString() };
}

function generateSlug(text?: string): string {
  if (!text) return 'competicao';
  const clean = text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'competicao';
}

function normalizeCompetitionRecord(comp: CompetitionRecord): CompetitionRecord {
  const rawStatus = comp.status as string;
  let normalizedStatus = comp.status;
  if (rawStatus === 'draft') {
    normalizedStatus = 'planning';
  } else if (rawStatus === 'registration') {
    normalizedStatus = 'registration-open';
  }
  return {
    ...comp,
    format: comp.format || comp.config?.format?.formatType || 'round-robin',
    slug: comp.slug || generateSlug(comp.name),
    status: normalizedStatus,
    logoUrl: comp.logoUrl ? String(comp.logoUrl) : undefined,
    supporters: normalizeSupporters(comp.supporters),
  };
}

// ============================================================================
// Adaptador LocalStorage
// ============================================================================

const localStorageAdapter = {
  async listCompetitions(): Promise<CompetitionRecord[]> {
    ensureSeeded();
    const raw = readCollection<CompetitionRecord>('competitions');
    const normalized = raw.map(normalizeCompetitionRecord);
    if (this.isPlatformAdminGlobalMode()) {
      return normalized;
    }
    const activeOrgId = this.getActiveOrganizationId();
    if (!activeOrgId) return [];
    return normalized.filter(c => c.organizationId === activeOrgId);
  },

  async getCompetition(id: string): Promise<CompetitionRecord | null> {
    ensureSeeded();
    const all = readCollection<CompetitionRecord>('competitions');
    const comp = all.find(c => c.id === id);
    if (!comp) return null;
    const normalized = normalizeCompetitionRecord(comp);
    if (this.isPlatformAdminGlobalMode()) {
      return normalized;
    }
    const activeOrgId = this.getActiveOrganizationId();
    if (activeOrgId && normalized.organizationId && normalized.organizationId !== activeOrgId) {
      return null;
    }
    return normalized;
  },

  async getCompetitionBySlug(slug: string): Promise<CompetitionRecord | null> {
    ensureSeeded();
    const all = readCollection<CompetitionRecord>('competitions');
    const comp = all.find(c => (c.slug || generateSlug(c.name)) === slug);
    return comp ? normalizeCompetitionRecord(comp) : null;
  },

  async updateCompetition(id: string, updates: Partial<CompetitionRecord>): Promise<CompetitionRecord | null> {
    const all = readCollection<CompetitionRecord>('competitions');
    const idx = all.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const safeUpdates = { ...updates };
    if (all[idx].rulesSnapshot && 'rulesSnapshot' in safeUpdates && safeUpdates.rulesSnapshot !== all[idx].rulesSnapshot) {
      safeUpdates.rulesSnapshot = all[idx].rulesSnapshot;
    }
    // IMUTABILIDADE DO SLUG: Se a competição já possui slug, nunca sobrescreve nem altera
    if (all[idx].slug) {
      safeUpdates.slug = all[idx].slug;
    }
    all[idx] = { ...all[idx], ...safeUpdates };
    writeCollection('competitions', all);
    return normalizeCompetitionRecord(all[idx]);
  },

  async createCompetition(input: Omit<CompetitionRecord, 'id'> & { id?: string }): Promise<CompetitionRecord> {
    const orgId = input.organizationId?.trim() || this.getActiveOrganizationId()?.trim() || 'org-1';
    const all = readCollection<CompetitionRecord>('competitions');
    const baseSlug = input.slug || generateSlug(input.name);
    let uniqueSlug = baseSlug;
    let counter = 2;
    while (all.some(c => c.slug === uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    const record: CompetitionRecord = {
      ...input,
      organizationId: orgId,
      slug: uniqueSlug,
      id: (input as { id?: string }).id || generateId('comp'),
    };
    const normalized = normalizeCompetitionRecord(record);
    all.push(normalized);
    writeCollection('competitions', all);
    return normalized;
  },

  async deleteCompetition(id: string): Promise<void> {
    writeCollection('competitions', readCollection<CompetitionRecord>('competitions').filter(c => c.id !== id));
    writeCollection('matches', readCollection<MatchRecord>('matches').filter(m => m.competitionId !== id));
    writeCollection('competition_teams', readCollection<CompetitionTeam>('competition_teams').filter(ct => ct.competitionId !== id));
    writeCollection('competition_stages', readCollection<StageRecord>('competition_stages').filter(s => s.competitionId !== id));
    writeCollection('competition_rounds', readCollection<RoundRecord>('competition_rounds').filter(r => r.competitionId !== id));
    writeCollection('competition_match_slots', readCollection<MatchSlotRecord>('competition_match_slots').filter(s => s.competitionId !== id));
  },

  async listUserMemberships(userId: string): Promise<UserMembership[]> {
    return readCollection<UserMembership>('user_memberships').filter(membership => membership.userId === userId);
  },

  async createUserMembership(input: Omit<UserMembership, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<UserMembership> {
    const now = new Date().toISOString();
    const record: UserMembership = { ...input, id: input.id || generateId('membership'), createdAt: now, updatedAt: now };
    const all = readCollection<UserMembership>('user_memberships');
    all.push(record);
    writeCollection('user_memberships', all);
    return record;
  },

  // --- Organizations (Fase 11.3) ---
  async listOrganizations(): Promise<OrganizationRecord[]> {
    ensureSeeded();
    return readCollection<OrganizationRecord>('organizations');
  },

  async getOrganizationById(id: string): Promise<OrganizationRecord | null> {
    ensureSeeded();
    const org = readCollection<OrganizationRecord>('organizations').find(o => o.id === id);
    return org ?? null;
  },

  async createOrganization(input: Omit<OrganizationRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<OrganizationRecord> {
    const now = new Date().toISOString();
    const record: OrganizationRecord = {
      ...input,
      id: input.id || generateId('org'),
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now,
    };
    const all = readCollection<OrganizationRecord>('organizations');
    all.push(record);
    writeCollection('organizations', all);
    return record;
  },

  async updateOrganization(id: string, updates: Partial<OrganizationRecord>): Promise<OrganizationRecord> {
    ensureSeeded();
    const all = readCollection<OrganizationRecord>('organizations');
    const idx = all.findIndex(o => o.id === id);
    if (idx === -1) throw new Error('Organização não encontrada.');
    const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    all[idx] = updated;
    writeCollection('organizations', all);
    return updated;
  },

  async listOrganizationMembers(organizationId: string): Promise<OrganizationMemberDetail[]> {
    ensureSeeded();
    const memberships = readCollection<UserMembership>('user_memberships').filter(m => m.organizationId === organizationId);
    const teams = readCollection<TeamRecord>('teams');
    const persons = readCollection<PersonRecord>('persons');

    return memberships.map(m => {
      const person = persons.find(p => p.id === m.userId);
      const team = m.teamId ? teams.find(t => t.id === m.teamId) : undefined;
      return {
        ...m,
        userName: person?.fullName || (m.userId === 'demo-admin' ? 'Administrador BaseOS' : m.userId === 'demo-organizer' ? 'Organizador' : m.userId === 'demo-team' ? 'Dirigente de Equipe' : m.userId),
        userEmail: person?.email || (m.userId === 'demo-admin' ? 'admin@baseos.com' : m.userId === 'demo-organizer' ? 'organizer@baseos.com' : m.userId === 'demo-team' ? 'team@baseos.com' : undefined),
        teamName: team?.name,
      };
    });
  },

  async updateUserMembership(id: string, updates: Partial<UserMembership>): Promise<UserMembership> {
    ensureSeeded();
    const all = readCollection<UserMembership>('user_memberships');
    const idx = all.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Vínculo de membro não encontrado.');
    const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    all[idx] = updated;
    writeCollection('user_memberships', all);
    return updated;
  },

  async deleteUserMembership(id: string): Promise<void> {
    ensureSeeded();
    const all = readCollection<UserMembership>('user_memberships').filter(m => m.id !== id);
    writeCollection('user_memberships', all);
  },

  async listOrganizationTeams(organizationId: string): Promise<TeamRecord[]> {
    ensureSeeded();
    return readCollection<TeamRecord>('teams').filter(t => t.organizationId === organizationId);
  },

  async listOrganizationCompetitions(organizationId: string): Promise<CompetitionRecord[]> {
    ensureSeeded();
    return readCollection<CompetitionRecord>('competitions').filter(c => c.organizationId === organizationId);
  },

  async listOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    ensureSeeded();
    return readCollection<OrganizationInvitation>('organization_invitations').filter(inv => inv.organizationId === organizationId);
  },

  getActiveOrganizationId(): string | null {
    try {
      const stored = localStorage.getItem('baseos.active_org_id') || localStorage.getItem('baseos.active_tenant_id');
      if (stored) return stored;
      const session = authService.getStoredSession();
      if (session?.user?.organizationId) return session.user.organizationId;
      return null;
    } catch {
      return null;
    }
  },

  isPlatformAdminGlobalMode(): boolean {
    try {
      const isMaster = authService.isPlatformAdmin();
      if (!isMaster) return false;
      const globalFlag = localStorage.getItem('baseos.global_view') === 'true';
      const activeOrg = localStorage.getItem('baseos.active_org_id') || localStorage.getItem('baseos.active_tenant_id');
      return globalFlag || activeOrg === 'all' || activeOrg === 'global' || !activeOrg;
    } catch {
      return false;
    }
  },

  setActiveOrganizationId(orgId: string | null): void {
    try {
      if (orgId) {
        localStorage.setItem('baseos.active_org_id', orgId);
        localStorage.setItem('baseos.active_tenant_id', orgId);
      } else {
        localStorage.removeItem('baseos.active_org_id');
        localStorage.removeItem('baseos.active_tenant_id');
      }
    } catch {
      // fallback
    }
  },


  async createOrganizationInvitation(input: Omit<OrganizationInvitation, 'id' | 'createdAt' | 'token' | 'status' | 'expiresAt'> & { id?: string; token?: string; expiresAt?: string }): Promise<OrganizationInvitation> {
    ensureSeeded();
    const now = new Date().toISOString();
    const record: OrganizationInvitation = {
      ...input,
      id: input.id || generateId('inv'),
      token: input.token || ('tok_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)),
      status: 'pending',
      createdAt: now,
      expiresAt: input.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    const all = readCollection<OrganizationInvitation>('organization_invitations');
    all.push(record);
    writeCollection('organization_invitations', all);
    return record;
  },

  async cancelOrganizationInvitation(invitationId: string): Promise<void> {
    ensureSeeded();
    const all = readCollection<OrganizationInvitation>('organization_invitations');
    const inv = all.find(i => i.id === invitationId);
    if (inv) {
      inv.status = 'canceled';
      writeCollection('organization_invitations', all);
    }
  },

  async acceptOrganizationInvitation(token: string, userId: string): Promise<{ ok: boolean; membershipId?: string; error?: string }> {
    ensureSeeded();
    const all = readCollection<OrganizationInvitation>('organization_invitations');
    const inv = all.find(i => i.token === token.trim());
    if (!inv) return { ok: false, error: 'Convite não encontrado.' };
    if (inv.status !== 'pending') return { ok: false, error: 'Este convite já foi utilizado ou cancelado.' };
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      inv.status = 'expired';
      writeCollection('organization_invitations', all);
      return { ok: false, error: 'Este convite expirou.' };
    }

    const membership = await this.createUserMembership({
      userId,
      organizationId: inv.organizationId,
      teamId: inv.teamId,
      role: inv.role,
      status: 'active',
    });

    inv.status = 'accepted';
    inv.usedAt = new Date().toISOString();
    writeCollection('organization_invitations', all);

    return { ok: true, membershipId: membership.id };
  },


  /**
   * setupOrganizationAdmin — Fase 1A
   * Chama a Edge Function segura 'provision-admin' para provisionar o administrador.
   * Evita a exposição de SUPABASE_SERVICE_ROLE_KEY no frontend.
   */
  async setupOrganizationAdmin(input: {
    organizationId: string;
    email: string;
    name: string;
    password: string;
    invitedBy: string;
  }): Promise<{ ok: boolean; userId: string; membershipId: string }> {
    const supabase = await getSupabaseClient();
    
    // Tenta invocar a Edge Function primeiro (Caminho Oficial)
    const { data, error } = await supabase.functions.invoke('provision-admin', {
      body: input,
    });

    if (error) {
      throw new Error(`Falha ao provisionar administrador: [${error.context || error.name}] ${error.message}`);
    }

    if (data && !data.ok) {
      throw new Error(data.error || 'Falha desconhecida ao provisionar administrador.');
    }

    return { ok: true, userId: data.userId, membershipId: data.membershipId };
  },

  // --- Athletes (Fase 11.3) ---
  async listAthletes(): Promise<AthleteIdentity[]> {
    ensureSeeded();
    return readCollection<AthleteIdentity>('athletes');
  },

  async getAthleteById(id: string): Promise<AthleteIdentity | null> {
    ensureSeeded();
    const athlete = readCollection<AthleteIdentity>('athletes').find(a => a.id === id);
    return athlete ?? null;
  },

  async getAthleteByCpf(cpf: string): Promise<AthleteIdentity | null> {
    ensureSeeded();
    const normalized = normalizeCpf(cpf);
    if (!normalized) return null;
    const athlete = readCollection<AthleteIdentity>('athletes').find(a => a.normalizedCpf === normalized);
    return athlete ?? null;
  },

  async createAthlete(input: Omit<AthleteIdentity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<AthleteIdentity> {
    const normalizedCpf = normalizeCpf(input.normalizedCpf);
    const all = readCollection<AthleteIdentity>('athletes');
    if (normalizedCpf) {
      const exists = all.some(a => a.normalizedCpf === normalizedCpf);
      if (exists) {
        throw new Error('Violação de unicidade: CPF já cadastrado (uq_athletes_normalized_cpf).');
      }
    }
    const now = new Date().toISOString();
    const record: AthleteIdentity = {
      ...input,
      normalizedCpf,
      id: input.id || generateId('athlete'),
      createdAt: now,
      updatedAt: now,
    };
    all.push(record);
    writeCollection('athletes', all);
    return record;
  },

  async listTeams(): Promise<TeamRecord[]> {
    ensureSeeded();
    const all = readCollection<TeamRecord>('teams');
    if (this.isPlatformAdminGlobalMode()) {
      return all;
    }
    const activeOrgId = this.getActiveOrganizationId();
    if (!activeOrgId) return [];
    return all.filter(t => t.organizationId === activeOrgId);
  },

  async getTeam(id: string): Promise<TeamRecord | null> {
    ensureSeeded();
    const all = readCollection<TeamRecord>('teams');
    const t = all.find(item => item.id === id);
    return t ?? null;
  },

  async createTeam(input: Omit<TeamRecord, 'id'> & { id?: string }): Promise<TeamRecord> {
    const activeOrgId = this.getActiveOrganizationId() || 'org-1';
    const record: TeamRecord = {
      ...input,
      organizationId: input.organizationId || activeOrgId,
      id: input.id || generateId('team'),
    };
    const all = readCollection<TeamRecord>('teams');
    all.push(record);
    writeCollection('teams', all);
    return record;
  },

  async updateTeam(id: string, updates: Partial<TeamRecord>): Promise<TeamRecord | null> {
    const all = readCollection<TeamRecord>('teams');
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return null;
    all[idx] = patch(all[idx], updates);
    writeCollection('teams', all);
    return all[idx];
  },

  async deleteTeam(id: string): Promise<void> {
    const allMatches = readCollection<MatchRecord>('matches');
    const allCt = readCollection<CompetitionTeam>('competition_teams');
    const hasMatches = allMatches.some(m => m.teamAId === id || m.teamBId === id);
    if (hasMatches) {
      throw new Error('Não é possível excluir a equipe pois ela possui partidas vinculadas no histórico.');
    }
    const hasActiveReg = allCt.some(ct => ct.teamId === id);
    if (hasActiveReg) {
      throw new Error('Não é possível excluir a equipe pois ela possui inscrições ativas em competições.');
    }
    writeCollection('teams', readCollection<TeamRecord>('teams').filter(t => t.id !== id));
  },

  async listReferees(): Promise<RefereeRecord[]> {
    ensureSeeded();
    return readCollection<RefereeRecord>('referees');
  },

  async createReferee(input: Omit<RefereeRecord, 'id'>): Promise<RefereeRecord> {
    const record: RefereeRecord = { ...input, id: generateId('ref') };
    const all = readCollection<RefereeRecord>('referees');
    all.push(record);
    writeCollection('referees', all);
    return record;
  },

  async updateReferee(id: string, updates: Partial<RefereeRecord>): Promise<RefereeRecord | null> {
    const all = readCollection<RefereeRecord>('referees');
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    all[idx] = patch(all[idx], updates);
    writeCollection('referees', all);
    return all[idx];
  },

  async deleteReferee(id: string): Promise<void> {
    writeCollection('referees', readCollection<RefereeRecord>('referees').filter(r => r.id !== id));
  },

  async listVenues(): Promise<VenueRecord[]> {
    ensureSeeded();
    const all = readCollection<VenueRecord>('venues');
    if (this.isPlatformAdminGlobalMode()) {
      return all;
    }
    const activeOrgId = this.getActiveOrganizationId();
    if (!activeOrgId) return [];
    return all.filter(v => v.organizationId === activeOrgId);
  },

  async createVenue(input: Omit<VenueRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; organizationId?: string }): Promise<VenueRecord> {
    const activeOrgId = this.getActiveOrganizationId() || 'org-1';
    const record: VenueRecord = {
      ...input,
      organizationId: input.organizationId || activeOrgId,
      id: generateId('venue'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = readCollection<VenueRecord>('venues');
    all.push(record);
    writeCollection('venues', all);
    return record;
  },

  async updateVenue(id: string, updates: Partial<VenueRecord>): Promise<VenueRecord | null> {
    const all = readCollection<VenueRecord>('venues');
    const idx = all.findIndex(v => v.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    writeCollection('venues', all);
    return all[idx];
  },

  async deleteVenue(id: string): Promise<void> {
    writeCollection('venues', readCollection<VenueRecord>('venues').filter(v => v.id !== id));
  },

  async getSettings(): Promise<SettingsRecord> {
    const stored = localStorage.getItem(storageKey('app_settings'));
    if (!stored) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(stored) as Partial<SettingsRecord>;
      return { ...DEFAULT_SETTINGS, ...parsed, notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications }, rules: { ...DEFAULT_SETTINGS.rules, ...parsed.rules } };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(updates: Partial<SettingsRecord>): Promise<SettingsRecord> {
    const merged: SettingsRecord = {
      ...(await this.getSettings()),
      ...updates,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...updates.notifications },
      rules: { ...DEFAULT_SETTINGS.rules, ...updates.rules },
    };
    localStorage.setItem(storageKey('app_settings'), JSON.stringify(merged));
    return merged;
  },

  async listMatches(competitionId?: string): Promise<MatchRecord[]> {
    ensureSeeded();
    const all = readCollection<MatchRecord>('matches');
    let filtered = all;
    if (!this.isPlatformAdminGlobalMode()) {
      const activeOrgId = this.getActiveOrganizationId();
      if (activeOrgId) {
        const allowedCompetitions = readCollection<CompetitionRecord>('competitions')
          .filter(c => c.organizationId === activeOrgId);
        const allowedCompIds = new Set(allowedCompetitions.map(c => c.id));
        filtered = filtered.filter(m => allowedCompIds.has(m.competitionId));
      }
    }
    if (competitionId) {
      filtered = filtered.filter(m => m.competitionId === competitionId);
    }
    return filtered.slice().sort((a, b) => {
      const hasTimeA = Boolean(a.scheduledTime && a.scheduledTime.trim());
      const hasTimeB = Boolean(b.scheduledTime && b.scheduledTime.trim());
      if (hasTimeA && hasTimeB) {
        const timeA = new Date(a.scheduledTime).getTime();
        const timeB = new Date(b.scheduledTime).getTime();
        const validA = !Number.isNaN(timeA);
        const validB = !Number.isNaN(timeB);
        if (validA && validB && timeA !== timeB) return timeA - timeB;
        if (validA && !validB) return -1;
        if (!validA && validB) return 1;
      } else if (hasTimeA && !hasTimeB) {
        return -1;
      } else if (!hasTimeA && hasTimeB) {
        return 1;
      }
      return 0;
    });
  },

  async getMatch(id: string): Promise<MatchRecord | null> {
    const all = await this.listMatches();
    return all.find(m => m.id === id) ?? null;
  },

  async createMatch(match: Omit<MatchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MatchRecord> {
    const record: MatchRecord = {
      ...match,
      id: generateId('match'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = readCollection<MatchRecord>('matches');
    all.push(record);
    writeCollection('matches', all);
    return record;
  },

  async updateMatch(id: string, updates: Partial<MatchRecord>): Promise<MatchRecord | null> {
    const all = readCollection<MatchRecord>('matches');
    const idx = all.findIndex(m => m.id === id);
    if (idx === -1) return null;

    // Defesa em Profundidade de Aplicação: valida autorização da sessão ativa (se houver)
    const session = authService.getStoredSession();
    if (session?.user) {
      const user = session.user;
      if (user.role === 'team' || user.role === 'viewer') {
        throw new Error(`Acesso negado: perfil '${user.role}' não possui permissão para alterar partidas.`);
      }
      if (user.role === 'referee' || user.role === 'scorer') {
        const targetMatch = all[idx];
        if (!TenantSecurityService.canSubmitMatchScore(user, targetMatch)) {
          throw new Error('Acesso negado: árbitro/mesário não está escalado nesta partida.');
        }

        // Blindagem de campos administrativos (espelhando trg_protect_match_admin_fields)
        const adminFields: (keyof MatchRecord)[] = [
          'competitionId',
          'teamAId',
          'teamBId',
          'teamAName',
          'teamBName',
          'teamAShortName',
          'teamBShortName',
          'venue',
          'court',
          'scheduledTime',
          'round',
          'matchNumber',
          'phase',
          'groupName',
          'slotId',
          'referees',
        ];

        for (const field of adminFields) {
          if (
            field in updates &&
            updates[field] !== undefined &&
            targetMatch[field] !== undefined &&
            JSON.stringify(updates[field]) !== JSON.stringify(targetMatch[field])
          ) {
            throw new Error(`Acesso negado: árbitro/mesário não possui permissão para alterar o campo '${field}' de partidas.`);
          }
        }
      }
    }

    const prevStatus = all[idx].status;
    all[idx] = patch(all[idx], updates);
    writeCollection('matches', all);

    // Notificação em tempo real quando o resultado é lançado/finalizado
    if ((updates.status === 'completed' || updates.status === 'homologated') && prevStatus !== updates.status) {
      try {
        notificationService.notifyMatchResult(all[idx]);
      } catch (err) {
        console.warn('Notification trigger note:', err);
      }
    }

    return all[idx];
  },

  async deleteMatches(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    writeCollection('matches', readCollection<MatchRecord>('matches').filter(m => !ids.includes(m.id)));
  },

  async listDraws(competitionId?: string): Promise<DrawRecord[]> {
    ensureSeeded();
    const all = readCollection<DrawRecord>('draws');
    return competitionId ? all.filter(d => d.competitionId === competitionId) : all;
  },

  async getDrawByCompetition(competitionId: string): Promise<DrawRecord | null> {
    const all = await this.listDraws();
    return all.find(d => d.competitionId === competitionId) ?? null;
  },

  async saveDraw(result: DrawResult): Promise<DrawRecord> {
    const all = readCollection<DrawRecord>('draws');
    const now = new Date().toISOString();
    const existing = all.find(d => d.competitionId === result.competitionId);
    let record: DrawRecord;
    if (existing) {
      record = { ...existing, ...result, updatedAt: now };
      const idx = all.findIndex(d => d.id === existing.id);
      all[idx] = record;
    } else {
      record = { ...result, id: generateId('draw'), createdAt: now, updatedAt: now };
      all.push(record);
    }
    writeCollection('draws', all);
    return record;
  },

  async saveDrawWithMatches(
    result: DrawResult,
    matches: Array<{
      round: number;
      matchNumber: number;
      teamAId: string;
      teamBId: string;
      teamAName: string;
      teamBName: string;
      teamAShortName: string;
      teamBShortName: string;
      groupName: string;
      phase: string;
      scheduledTime: string;
      venue: string;
    }>
  ): Promise<{ draw: DrawRecord; matches: MatchRecord[] }> {
    const allMatches = readCollection<MatchRecord>('matches');
    const allDraws = readCollection<DrawRecord>('draws');
    const now = new Date().toISOString();

    const oldMatches = allMatches.filter(
      m => m.competitionId === result.competitionId &&
           (m.phase === 'classificatória' || m.phase === 'classificatoria')
    );

    const hasStartedOrPlayed = oldMatches.some(
      m => m.status === 'in-progress' || m.status === 'completed' || m.status === 'homologated' || (m.sets && m.sets.length > 0)
    );
    if (hasStartedOrPlayed) {
      throw new Error('Não é possível substituir as partidas da fase classificatória pois já existem jogos iniciados ou finalizados.');
    }

    const oldMatchIds = oldMatches.map(m => m.id);
    const remainingMatches = allMatches.filter(m => !oldMatchIds.includes(m.id));

    const newMatches: MatchRecord[] = matches.map((proposal) => ({
      id: generateId('match'),
      competitionId: result.competitionId,
      round: proposal.round,
      matchNumber: proposal.matchNumber,
      teamAId: proposal.teamAId,
      teamBId: proposal.teamBId,
      teamAName: proposal.teamAName,
      teamBName: proposal.teamBName,
      teamAShortName: proposal.teamAShortName,
      teamBShortName: proposal.teamBShortName,
      venue: proposal.venue,
      court: undefined,
      phase: proposal.phase,
      groupName: proposal.groupName,
      scheduledTime: proposal.scheduledTime,
      status: 'scheduled' as const,
      sets: [],
      referees: [],
      createdAt: now,
      updatedAt: now,
    }));

    const existing = allDraws.find(d => d.competitionId === result.competitionId);
    let record: DrawRecord;
    if (existing) {
      if (existing.status === 'locked') {
        throw new Error('Sorteio bloqueado. Não é possível modificar sorteio oficializado.');
      }
      record = { ...existing, ...result, updatedAt: now };
      const idx = allDraws.findIndex(d => d.id === existing.id);
      allDraws[idx] = record;
    } else {
      record = {
        ...result,
        id: generateId('draw'),
        createdAt: now,
        updatedAt: now,
        status: 'preview',
      };
      allDraws.push(record);
    }

    writeCollection('matches', [...remainingMatches, ...newMatches]);
    writeCollection('draws', allDraws);

    return { draw: record, matches: newMatches };
  },

  async updateDrawStatus(competitionId: string, status: 'preview' | 'official' | 'locked'): Promise<DrawRecord | null> {
    const all = readCollection<DrawRecord>('draws');
    const idx = all.findIndex(d => d.competitionId === competitionId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    all[idx] = { ...all[idx], status, updatedAt: now };
    writeCollection('draws', all);
    return all[idx];
  },

  async listCompetitionTeams(competitionId?: string): Promise<CompetitionTeam[]> {
    ensureSeeded();
    const all = readCollection<CompetitionTeam>('competition_teams');
    return competitionId ? all.filter(ct => ct.competitionId === competitionId) : all;
  },

  async getCompetitionTeamById(id: string): Promise<CompetitionTeam | null> {
    const all = await this.listCompetitionTeams();
    return all.find(ct => ct.id === id) ?? null;
  },

  async getCompetitionTeamByToken(token: string): Promise<CompetitionTeam | null> {
    const all = await this.listCompetitionTeams();
    const found = all.find(ct => ct.accessToken === token || ct.id === token);
    if (found) return found;
    const teams = await this.listTeams();
    const matchingTeam = teams.find(t => t.registrationToken === token || t.id === token);
    if (matchingTeam) {
      const ct = all.find(c => c.teamId === matchingTeam.id);
      if (ct) return ct;
      return {
        id: `ct-${matchingTeam.id}`,
        competitionId: 'geral',
        teamId: matchingTeam.id,
        teamName: matchingTeam.name,
        teamShortName: matchingTeam.shortName,
        accessToken: token,
        registrationDeadline: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        isLocked: false,
        status: 'in_progress',
        createdAt: matchingTeam.createdAt || new Date().toISOString(),
        updatedAt: matchingTeam.updatedAt || new Date().toISOString(),
      };
    }
    return null;
  },

  async createCompetitionTeam(input: Omit<CompetitionTeam, 'id' | 'accessToken' | 'createdAt' | 'updatedAt'>): Promise<CompetitionTeam> {
    const record: CompetitionTeam = {
      ...input,
      id: generateId('ct'),
      accessToken: generateToken(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = readCollection<CompetitionTeam>('competition_teams');
    all.push(record);
    writeCollection('competition_teams', all);
    return record;
  },

  async updateCompetitionTeam(id: string, updates: Partial<CompetitionTeam>): Promise<CompetitionTeam | null> {
    const all = readCollection<CompetitionTeam>('competition_teams');
    const idx = all.findIndex(ct => ct.id === id);
    if (idx === -1) return null;
    all[idx] = patch(all[idx], updates);
    writeCollection('competition_teams', all);
    return all[idx];
  },

  async listCompetitionAthletes(competitionTeamId?: string): Promise<CompetitionAthlete[]> {
    ensureSeeded();
    const all = readCollection<CompetitionAthlete>('competition_athletes');
    return competitionTeamId ? all.filter(a => a.competitionTeamId === competitionTeamId) : all;
  },

  async createCompetitionAthlete(input: CompetitionAthleteCreate & { athleteId?: string }): Promise<CompetitionAthlete> {
    let athleteId = input.athleteId;
    if (!athleteId) {
      const identity = await getOrCreateAthleteIdentity(
        { name: input.name, documentNumber: input.documentNumber, birthDate: input.birthDate },
        this,
      );
      athleteId = identity.id;
    }
    const record: CompetitionAthlete = {
      ...input,
      athleteId,
      id: generateId('ath'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = readCollection<CompetitionAthlete>('competition_athletes');
    all.push(record);
    writeCollection('competition_athletes', all);
    return record;
  },

  async registerCompetitionAthleteAuth(
    competitionTeamId: string,
    input: CompetitionAthleteInput,
    options?: { userId?: string },
  ): Promise<{ ok: boolean; athlete?: CompetitionAthlete; error?: string }> {
    const team = await this.getCompetitionTeamById(competitionTeamId);
    if (!team) return { ok: false, error: 'Equipe da competição não encontrada.' };

    if (options?.userId) {
      const memberships = await this.listUserMemberships(options.userId);
      const isAuthorized = memberships.some(
        m => m.status === 'active' && (m.competitionTeamId === competitionTeamId || m.teamId === team.teamId),
      );
      if (!isAuthorized) {
        return { ok: false, error: 'Não autorizado a cadastrar atletas nesta equipe.' };
      }
    }

    const athlete = await this.createCompetitionAthlete({
      ...input,
      competitionTeamId,
      name: input.name.trim(),
      position: input.position.trim(),
    });

    if (team.status === 'invited') {
      await this.updateCompetitionTeam(team.id, { status: 'in_progress' });
    }

    return { ok: true, athlete };
  },

  async registerAthletePublic(token: string, input: CompetitionAthleteInput): Promise<{ ok: boolean; athlete?: CompetitionAthlete; error?: string }> {
    const team = await this.getCompetitionTeamByToken(token);
    if (!team) return { ok: false, error: 'Convite de equipe não encontrado.' };
    const athlete = await this.createCompetitionAthlete({
      ...input,
      competitionTeamId: team.id,
      name: input.name.trim(),
      position: input.position.trim(),
    });
    if (team.status === 'invited') {
      await this.updateCompetitionTeam(team.id, { status: 'in_progress' });
    }
    return { ok: true, athlete };
  },

  async updateCompetitionAthlete(id: string, updates: Partial<CompetitionAthlete>): Promise<CompetitionAthlete | null> {
    const all = readCollection<CompetitionAthlete>('competition_athletes');
    const idx = all.findIndex(a => a.id === id);
    if (idx === -1) return null;
    all[idx] = patch(all[idx], updates);
    writeCollection('competition_athletes', all);
    return all[idx];
  },

  async deleteCompetitionAthlete(id: string): Promise<void> {
    const all = readCollection<CompetitionAthlete>('competition_athletes');
    writeCollection('competition_athletes', all.filter(a => a.id !== id));
  },

  async listDocumentEdits(matchId?: string): Promise<DocumentEdit[]> {
    ensureSeeded();
    const all = readCollection<DocumentEdit>('document_edits');
    return matchId ? all.filter(e => e.matchId === matchId) : all;
  },

  async getDocumentEdit({ matchId, documentType }: DocumentEditKey): Promise<DocumentEdit | null> {
    const all = readCollection<DocumentEdit>('document_edits');
    return all.find(e => e.matchId === matchId && e.documentType === documentType) ?? null;
  },

  async saveDocumentEdit(input: Omit<DocumentEdit, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentEdit> {
    const all = readCollection<DocumentEdit>('document_edits');
    const idx = all.findIndex(
      e => e.matchId === input.matchId && e.documentType === input.documentType,
    );
    const now = new Date().toISOString();
    if (idx === -1) {
      const record: DocumentEdit = { ...input, id: generateId('dcedit'), createdAt: now, updatedAt: now };
      all.push(record);
      writeCollection('document_edits', all);
      return record;
    }
    const updated = { ...all[idx], ...input, updatedAt: now };
    all[idx] = updated;
    writeCollection('document_edits', all);
    return updated;
  },

  async deleteDocumentEdit(id: string): Promise<void> {
    writeCollection('document_edits', readCollection<DocumentEdit>('document_edits').filter(e => e.id !== id));
  },

  async getTemplateLayout(templateKind: string): Promise<TemplateLayout | null> {
    const all = readCollection<TemplateLayout>('template_layouts');
    return all.find(l => l.templateKind === templateKind) ?? null;
  },

  async saveTemplateLayout(input: Omit<TemplateLayout, 'id' | 'updatedAt'>): Promise<TemplateLayout> {
    const all = readCollection<TemplateLayout>('template_layouts');
    const idx = all.findIndex(l => l.templateKind === input.templateKind);
    const now = new Date().toISOString();
    if (idx === -1) {
      const record: TemplateLayout = { ...input, id: input.templateKind, updatedAt: now };
      all.push(record);
      writeCollection('template_layouts', all);
      return record;
    }
    const updated = { ...all[idx], fields: { ...all[idx].fields, ...input.fields }, updatedAt: now };
    all[idx] = updated;
    writeCollection('template_layouts', all);
    return updated;
  },

  async listModalities(): Promise<ModalityRecord[]> {
    ensureSeeded();
    return readCollection<ModalityRecord>('modalities');
  },

  async getModality(id: string): Promise<ModalityRecord | null> {
    const all = await this.listModalities();
    return all.find(m => m.id === id || m.type === id) ?? null;
  },

  async createModality(input: Omit<ModalityRecord, 'id'>): Promise<ModalityRecord> {
    const record: ModalityRecord = { ...input, id: generateId('mod') };
    const all = readCollection<ModalityRecord>('modalities');
    all.push(record);
    writeCollection('modalities', all);
    return record;
  },

  async updateModality(id: string, updates: Partial<ModalityRecord>): Promise<ModalityRecord | null> {
    const all = readCollection<ModalityRecord>('modalities');
    const idx = all.findIndex(m => m.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    writeCollection('modalities', all);
    return all[idx];
  },

  async deleteModality(id: string): Promise<void> {
    writeCollection('modalities', readCollection<ModalityRecord>('modalities').filter(m => m.id !== id));
  },

  async listPersons(): Promise<PersonRecord[]> {
    ensureSeeded();
    return readCollection<PersonRecord>('persons');
  },

  async getPerson(id: string): Promise<PersonRecord | null> {
    const all = await this.listPersons();
    return all.find(p => p.id === id) ?? null;
  },

  async createPerson(_input: Omit<PersonRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonRecord> {
    throw new Error(
      'A API "createPerson" é legada e foi descontinuada na Fase 8.3. A entidade "public.persons" não existe no banco de dados. Utilize o modelo Team, CompetitionTeam ou Profiles.'
    );
  },

  async updatePerson(_id: string, _updates: Partial<PersonRecord>): Promise<PersonRecord | null> {
    throw new Error(
      'A API "updatePerson" é legada e foi descontinuada na Fase 8.3. A entidade "public.persons" não existe no banco de dados.'
    );
  },

  async deletePerson(_id: string): Promise<void> {
    throw new Error(
      'A API "deletePerson" é legada e foi descontinua na Fase 8.3. A entidade "public.persons" não existe no banco de dados.'
    );
  },

  async listAuditLogs(filters?: { competitionId?: string; entityType?: string; entityId?: string }): Promise<MatchAuditEntry[]> {
    ensureSeeded();
    let logs = readCollection<MatchAuditEntry>('audit_logs');
    if (filters?.competitionId) {
      logs = logs.filter(l => l.competitionId === filters.competitionId);
    }
    if (filters?.entityType) {
      logs = logs.filter(l => l.entityType === filters.entityType);
    }
    if (filters?.entityId) {
      logs = logs.filter(l => l.entityId === filters.entityId);
    }
    return logs;
  },

  async addAuditLog(entry: Omit<MatchAuditEntry, 'id' | 'timestamp'>): Promise<MatchAuditEntry> {
    const record: MatchAuditEntry = {
      ...entry,
      id: generateId('audit'),
      timestamp: new Date().toISOString(),
    };
    const all = readCollection<MatchAuditEntry>('audit_logs');
    all.unshift(record);
    writeCollection('audit_logs', all.slice(0, 500)); // Limita a 500 mais recentes
    return record;
  },

  // ============================================================================
  // Competition Format Runtime: Stages, Rounds e MatchSlots
  // ============================================================================

  // Stages
  async listStages(competitionId: string): Promise<StageRecord[]> {
    ensureSeeded();
    const all = readCollection<StageRecord>('competition_stages');
    return all
      .filter(s => s.competitionId === competitionId)
      .sort((a, b) => a.stageOrder - b.stageOrder);
  },

  async getStage(id: string): Promise<StageRecord | null> {
    ensureSeeded();
    const all = readCollection<StageRecord>('competition_stages');
    return all.find(s => s.id === id) ?? null;
  },

  async getStageByLogicalId(competitionId: string, stageId: string): Promise<StageRecord | null> {
    ensureSeeded();
    const all = readCollection<StageRecord>('competition_stages');
    return all.find(s => s.competitionId === competitionId && s.stageId === stageId) ?? null;
  },

  async createStage(stage: Omit<StageRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: StageRuntimeStatus }): Promise<StageRecord> {
    ensureSeeded();
    if (!stage.competitionId?.trim()) {
      throw new Error('createStage: competitionId é obrigatório');
    }
    if (!stage.stageId?.trim()) {
      throw new Error('createStage: stageId é obrigatório');
    }
    const comps = readCollection<CompetitionRecord>('competitions');
    if (comps.length > 0 && !comps.some(c => c.id === stage.competitionId)) {
      throw new Error(`createStage: Competição associada não encontrada: ${stage.competitionId}`);
    }

    const all = readCollection<StageRecord>('competition_stages');
    if (all.some(s => s.competitionId === stage.competitionId && s.stageId === stage.stageId)) {
      throw new Error(`createStage: Já existe um estágio com stageId '${stage.stageId}' na competição ${stage.competitionId}`);
    }
    if (all.some(s => s.competitionId === stage.competitionId && s.stageOrder === stage.stageOrder)) {
      throw new Error(`createStage: Já existe um estágio com ordem ${stage.stageOrder} na competição ${stage.competitionId}`);
    }

    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (stage.status && !validStatuses.includes(stage.status)) {
      throw new Error(`createStage: status inválido: ${stage.status}`);
    }

    const record: StageRecord = {
      ...stage,
      id: stage.id || generateId('stage'),
      status: stage.status || 'pending',
      isLocked: stage.isLocked ?? false,
      metadata: stage.metadata ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(record);
    writeCollection('competition_stages', all);
    return record;
  },

  async updateStage(id: string, updates: Partial<StageRecord>): Promise<StageRecord | null> {
    ensureSeeded();
    const all = readCollection<StageRecord>('competition_stages');
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const current = all[idx];
    const targetCompId = updates.competitionId || current.competitionId;

    if (updates.stageId && updates.stageId !== current.stageId) {
      if (all.some(s => s.id !== id && s.competitionId === targetCompId && s.stageId === updates.stageId)) {
        throw new Error(`updateStage: Colisão de unicidade (competitionId, stageId): ${updates.stageId}`);
      }
    }
    if (updates.stageOrder !== undefined && updates.stageOrder !== current.stageOrder) {
      if (all.some(s => s.id !== id && s.competitionId === targetCompId && s.stageOrder === updates.stageOrder)) {
        throw new Error(`updateStage: Colisão de unicidade (competitionId, stageOrder): ${updates.stageOrder}`);
      }
    }
    if (updates.status) {
      const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(updates.status)) {
        throw new Error(`updateStage: status inválido: ${updates.status}`);
      }
    }

    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    writeCollection('competition_stages', all);
    return updated;
  },

  async deleteStage(id: string): Promise<void> {
    ensureSeeded();
    const stages = readCollection<StageRecord>('competition_stages');
    writeCollection('competition_stages', stages.filter(s => s.id !== id));

    const rounds = readCollection<RoundRecord>('competition_rounds');
    const roundsToDelete = rounds.filter(r => r.stageRowId === id);
    const roundIdsToDelete = new Set(roundsToDelete.map(r => r.id));
    writeCollection('competition_rounds', rounds.filter(r => r.stageRowId !== id));

    const slots = readCollection<MatchSlotRecord>('competition_match_slots');
    writeCollection('competition_match_slots', slots.filter(s => s.stageRowId !== id && !roundIdsToDelete.has(s.roundRowId)));
  },

  // Rounds
  async listRounds(stageRowId: string): Promise<RoundRecord[]> {
    ensureSeeded();
    const all = readCollection<RoundRecord>('competition_rounds');
    return all
      .filter(r => r.stageRowId === stageRowId)
      .sort((a, b) => a.roundOrder - b.roundOrder);
  },

  async getRound(id: string): Promise<RoundRecord | null> {
    ensureSeeded();
    const all = readCollection<RoundRecord>('competition_rounds');
    return all.find(r => r.id === id) ?? null;
  },

  async getRoundByLogicalId(stageRowId: string, roundId: string): Promise<RoundRecord | null> {
    ensureSeeded();
    const all = readCollection<RoundRecord>('competition_rounds');
    return all.find(r => r.stageRowId === stageRowId && r.roundId === roundId) ?? null;
  },

  async createRound(round: Omit<RoundRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: RoundRuntimeStatus }): Promise<RoundRecord> {
    ensureSeeded();
    if (!round.stageRowId?.trim()) {
      throw new Error('createRound: stageRowId é obrigatório');
    }
    if (!round.roundId?.trim()) {
      throw new Error('createRound: roundId é obrigatório');
    }
    const stages = readCollection<StageRecord>('competition_stages');
    const stage = stages.find(s => s.id === round.stageRowId);
    if (!stage) {
      throw new Error(`createRound: Estágio associado não encontrado: ${round.stageRowId}`);
    }

    const all = readCollection<RoundRecord>('competition_rounds');
    if (all.some(r => r.stageRowId === round.stageRowId && r.roundId === round.roundId)) {
      throw new Error(`createRound: Já existe uma rodada com roundId '${round.roundId}' no estágio ${round.stageRowId}`);
    }
    if (all.some(r => r.stageRowId === round.stageRowId && r.roundOrder === round.roundOrder)) {
      throw new Error(`createRound: Já existe uma rodada com ordem ${round.roundOrder} no estágio ${round.stageRowId}`);
    }

    const validStatuses = ['pending', 'in-progress', 'completed'];
    if (round.status && !validStatuses.includes(round.status)) {
      throw new Error(`createRound: status inválido: ${round.status}`);
    }

    const record: RoundRecord = {
      ...round,
      competitionId: round.competitionId || stage.competitionId,
      id: round.id || generateId('round'),
      status: round.status || 'pending',
      slotsCount: round.slotsCount ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(record);
    writeCollection('competition_rounds', all);
    return record;
  },

  async updateRound(id: string, updates: Partial<RoundRecord>): Promise<RoundRecord | null> {
    ensureSeeded();
    const all = readCollection<RoundRecord>('competition_rounds');
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const current = all[idx];
    const targetStageRowId = updates.stageRowId || current.stageRowId;

    if (updates.roundId && updates.roundId !== current.roundId) {
      if (all.some(r => r.id !== id && r.stageRowId === targetStageRowId && r.roundId === updates.roundId)) {
        throw new Error(`updateRound: Colisão de unicidade (stageRowId, roundId): ${updates.roundId}`);
      }
    }
    if (updates.roundOrder !== undefined && updates.roundOrder !== current.roundOrder) {
      if (all.some(r => r.id !== id && r.stageRowId === targetStageRowId && r.roundOrder === updates.roundOrder)) {
        throw new Error(`updateRound: Colisão de unicidade (stageRowId, roundOrder): ${updates.roundOrder}`);
      }
    }
    if (updates.status) {
      const validStatuses = ['pending', 'in-progress', 'completed'];
      if (!validStatuses.includes(updates.status)) {
        throw new Error(`updateRound: status inválido: ${updates.status}`);
      }
    }

    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    writeCollection('competition_rounds', all);
    return updated;
  },

  async deleteRound(id: string): Promise<void> {
    ensureSeeded();
    const rounds = readCollection<RoundRecord>('competition_rounds');
    writeCollection('competition_rounds', rounds.filter(r => r.id !== id));

    const slots = readCollection<MatchSlotRecord>('competition_match_slots');
    writeCollection('competition_match_slots', slots.filter(s => s.roundRowId !== id));
  },

  // MatchSlots
  async listMatchSlots(competitionId: string): Promise<MatchSlotRecord[]> {
    ensureSeeded();
    const all = readCollection<MatchSlotRecord>('competition_match_slots');
    return all
      .filter(s => s.competitionId === competitionId)
      .sort((a, b) => a.position - b.position);
  },

  async listMatchSlotsByRound(roundRowId: string): Promise<MatchSlotRecord[]> {
    ensureSeeded();
    const all = readCollection<MatchSlotRecord>('competition_match_slots');
    return all
      .filter(s => s.roundRowId === roundRowId)
      .sort((a, b) => a.position - b.position);
  },

  async getMatchSlot(id: string): Promise<MatchSlotRecord | null> {
    ensureSeeded();
    const all = readCollection<MatchSlotRecord>('competition_match_slots');
    return all.find(s => s.id === id) ?? null;
  },

  async getMatchSlotByLogicalId(competitionId: string, slotId: string): Promise<MatchSlotRecord | null> {
    ensureSeeded();
    const all = readCollection<MatchSlotRecord>('competition_match_slots');
    return all.find(s => s.competitionId === competitionId && s.slotId === slotId) ?? null;
  },

  async createMatchSlot(slot: Omit<MatchSlotRecord, 'id' | 'createdAt' | 'updatedAt' | 'participantAStatus' | 'participantBStatus' | 'resolvedTeamAId' | 'resolvedTeamBId' | 'matchId'> & { id?: string; participantAStatus?: SlotParticipantStatus; participantBStatus?: SlotParticipantStatus; resolvedTeamAId?: string | null; resolvedTeamBId?: string | null; matchId?: string | null }): Promise<MatchSlotRecord> {
    ensureSeeded();
    if (!slot.roundRowId?.trim()) {
      throw new Error('createMatchSlot: roundRowId é obrigatório');
    }
    if (!slot.slotId?.trim()) {
      throw new Error('createMatchSlot: slotId é obrigatório');
    }

    const rounds = readCollection<RoundRecord>('competition_rounds');
    const round = rounds.find(r => r.id === slot.roundRowId);
    if (!round) {
      throw new Error(`createMatchSlot: Rodada associada não encontrada: ${slot.roundRowId}`);
    }

    const competitionId = slot.competitionId || round.competitionId;
    const stageRowId = slot.stageRowId || round.stageRowId;

    // Validações de ParticipantReference e Proibições de Equipes Artificiais
    validateParticipantReference(slot.participantAReference);
    validateParticipantReference(slot.participantBReference);

    if (slot.resolvedTeamAId) {
      if (isArtificialTeamId(slot.resolvedTeamAId)) {
        throw new Error(`createMatchSlot: resolvedTeamAId não pode ser equipe artificial/TBD: ${slot.resolvedTeamAId}`);
      }
      const teams = readCollection<TeamRecord>('teams');
      if (teams.length > 0 && !teams.some(t => t.id === slot.resolvedTeamAId)) {
        throw new Error(`createMatchSlot: Equipe resolvedTeamAId inexistente no banco: ${slot.resolvedTeamAId}`);
      }
    }

    if (slot.resolvedTeamBId) {
      if (isArtificialTeamId(slot.resolvedTeamBId)) {
        throw new Error(`createMatchSlot: resolvedTeamBId não pode ser equipe artificial/TBD: ${slot.resolvedTeamBId}`);
      }
      const teams = readCollection<TeamRecord>('teams');
      if (teams.length > 0 && !teams.some(t => t.id === slot.resolvedTeamBId)) {
        throw new Error(`createMatchSlot: Equipe resolvedTeamBId inexistente no banco: ${slot.resolvedTeamBId}`);
      }
    }

    if (slot.matchId) {
      const matches = readCollection<MatchRecord>('matches');
      if (matches.length > 0 && !matches.some(m => m.id === slot.matchId)) {
        throw new Error(`createMatchSlot: Partida matchId inexistente no banco: ${slot.matchId}`);
      }
    }

    const all = readCollection<MatchSlotRecord>('competition_match_slots');
    if (all.some(s => s.competitionId === competitionId && s.slotId === slot.slotId)) {
      throw new Error(`createMatchSlot: Já existe um slot com slotId '${slot.slotId}' na competição ${competitionId}`);
    }
    if (all.some(s => s.roundRowId === slot.roundRowId && s.position === slot.position)) {
      throw new Error(`createMatchSlot: Já existe um slot na posição ${slot.position} na rodada ${slot.roundRowId}`);
    }

    const defaultAStatus = slot.participantAReference.type === 'bye' ? 'bye' : slot.resolvedTeamAId ? 'resolved' : 'unresolved';
    const defaultBStatus = slot.participantBReference.type === 'bye' ? 'bye' : slot.resolvedTeamBId ? 'resolved' : 'unresolved';

    const record: MatchSlotRecord = {
      ...slot,
      competitionId,
      stageRowId,
      id: slot.id || generateId('slot'),
      resolvedTeamAId: slot.resolvedTeamAId ?? null,
      resolvedTeamBId: slot.resolvedTeamBId ?? null,
      matchId: slot.matchId ?? null,
      participantAStatus: slot.participantAStatus || defaultAStatus,
      participantBStatus: slot.participantBStatus || defaultBStatus,
      progressionRoute: slot.progressionRoute ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(record);
    writeCollection('competition_match_slots', all);
    return record;
  },

  async updateMatchSlot(id: string, updates: Partial<MatchSlotRecord>): Promise<MatchSlotRecord | null> {
    ensureSeeded();
    const all = readCollection<MatchSlotRecord>('competition_match_slots');
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const current = all[idx];
    const targetCompId = updates.competitionId || current.competitionId;
    const targetRoundRowId = updates.roundRowId || current.roundRowId;

    if (updates.participantAReference) {
      validateParticipantReference(updates.participantAReference);
    }
    if (updates.participantBReference) {
      validateParticipantReference(updates.participantBReference);
    }

    if (updates.resolvedTeamAId !== undefined && updates.resolvedTeamAId !== null) {
      if (isArtificialTeamId(updates.resolvedTeamAId)) {
        throw new Error(`updateMatchSlot: resolvedTeamAId não pode ser equipe artificial/TBD: ${updates.resolvedTeamAId}`);
      }
      const teams = readCollection<TeamRecord>('teams');
      if (teams.length > 0 && !teams.some(t => t.id === updates.resolvedTeamAId)) {
        throw new Error(`updateMatchSlot: Equipe resolvedTeamAId inexistente no banco: ${updates.resolvedTeamAId}`);
      }
    }

    if (updates.resolvedTeamBId !== undefined && updates.resolvedTeamBId !== null) {
      if (isArtificialTeamId(updates.resolvedTeamBId)) {
        throw new Error(`updateMatchSlot: resolvedTeamBId não pode ser equipe artificial/TBD: ${updates.resolvedTeamBId}`);
      }
      const teams = readCollection<TeamRecord>('teams');
      if (teams.length > 0 && !teams.some(t => t.id === updates.resolvedTeamBId)) {
        throw new Error(`updateMatchSlot: Equipe resolvedTeamBId inexistente no banco: ${updates.resolvedTeamBId}`);
      }
    }

    if (updates.matchId !== undefined && updates.matchId !== null) {
      const matches = readCollection<MatchRecord>('matches');
      if (matches.length > 0 && !matches.some(m => m.id === updates.matchId)) {
        throw new Error(`updateMatchSlot: Partida matchId inexistente no banco: ${updates.matchId}`);
      }
    }

    if (updates.slotId && updates.slotId !== current.slotId) {
      if (all.some(s => s.id !== id && s.competitionId === targetCompId && s.slotId === updates.slotId)) {
        throw new Error(`updateMatchSlot: Colisão de unicidade (competitionId, slotId): ${updates.slotId}`);
      }
    }
    if (updates.position !== undefined && updates.position !== current.position) {
      if (all.some(s => s.id !== id && s.roundRowId === targetRoundRowId && s.position === updates.position)) {
        throw new Error(`updateMatchSlot: Colisão de unicidade (roundRowId, position): ${updates.position}`);
      }
    }

    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    writeCollection('competition_match_slots', all);
    return updated;
  },

  async deleteMatchSlot(id: string): Promise<void> {
    ensureSeeded();
    const slots = readCollection<MatchSlotRecord>('competition_match_slots');
    writeCollection('competition_match_slots', slots.filter(s => s.id !== id));
  },

  // ============================================================================
  // Operações Transacionais de Runtime (Fase 4.7)
  // NOTA: Emulação in-memory para testes/desenvolvimento. Não reivindica transação ACID no LocalStorage.
  // A transação real com isolamento ACID executa no PostgreSQL através da RPC save_stage_draw_and_slots.
  // ============================================================================
  async saveStageDrawAndSlots(params: SaveStageDrawAndSlotsParams): Promise<SaveStageDrawAndSlotsResult> {
    ensureSeeded();
    const { competitionId, stage, rounds, slots } = params;

    // 1. Validação de competição
    if (!competitionId?.trim()) {
      throw new Error('saveStageDrawAndSlots: competitionId é obrigatório');
    }
    const comps = readCollection<CompetitionRecord>('competitions');
    if (comps.length > 0 && !comps.some(c => c.id === competitionId)) {
      throw new Error(`saveStageDrawAndSlots: Competição ${competitionId} não encontrada`);
    }

    // 2. Validação de Stage
    if (!stage.stageId?.trim()) {
      throw new Error('saveStageDrawAndSlots: stageId é obrigatório');
    }
    if (!stage.name?.trim()) {
      throw new Error('saveStageDrawAndSlots: name do estágio é obrigatório');
    }
    if (typeof stage.stageOrder !== 'number' || stage.stageOrder < 1) {
      throw new Error('saveStageDrawAndSlots: stageOrder deve ser inteiro >= 1');
    }

    // Cópias de trabalho para garantir atomicidade in-memory (staging)
    const existingStages = [...readCollection<StageRecord>('competition_stages')];
    const existingRounds = [...readCollection<RoundRecord>('competition_rounds')];
    const existingSlots = [...readCollection<MatchSlotRecord>('competition_match_slots')];

    // Verifica colisões de ordem com outros estágios
    let stageRowId = stage.id;
    const stageIdx = existingStages.findIndex(s => s.competitionId === competitionId && s.stageId === stage.stageId);
    if (stageIdx !== -1) {
      stageRowId = existingStages[stageIdx].id;
    } else {
      stageRowId = stageRowId || generateId('stage');
    }

    if (existingStages.some(s => s.id !== stageRowId && s.competitionId === competitionId && s.stageOrder === stage.stageOrder)) {
      throw new Error(`saveStageDrawAndSlots: Colisão de ordem do estágio (${stage.stageOrder})`);
    }

    const stagedStage: StageRecord = {
      id: stageRowId,
      competitionId,
      stageId: stage.stageId,
      name: stage.name,
      stageOrder: stage.stageOrder,
      stageType: stage.stageType || 'knockout',
      status: stage.status || 'pending',
      isLocked: stage.isLocked ?? false,
      metadata: stage.metadata ?? {},
      createdAt: stageIdx !== -1 ? existingStages[stageIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Validação e Staging das Rodadas
    const roundMapping = new Map<string, string>(); // roundId -> rowId
    const stagedRounds: RoundRecord[] = [];

    for (const r of rounds) {
      if (!r.roundId?.trim()) {
        throw new Error('saveStageDrawAndSlots: roundId é obrigatório na rodada');
      }
      if (!r.name?.trim()) {
        throw new Error('saveStageDrawAndSlots: name da rodada é obrigatório');
      }
      if (typeof r.roundOrder !== 'number' || r.roundOrder < 1) {
        throw new Error('saveStageDrawAndSlots: roundOrder deve ser inteiro >= 1');
      }

      let roundRowId = r.id;
      const roundIdx = existingRounds.findIndex(er => er.stageRowId === stageRowId && er.roundId === r.roundId);
      if (roundIdx !== -1) {
        roundRowId = existingRounds[roundIdx].id;
      } else {
        roundRowId = roundRowId || generateId('round');
      }

      const stagedRound: RoundRecord = {
        id: roundRowId,
        competitionId,
        stageRowId,
        roundId: r.roundId,
        name: r.name,
        roundOrder: r.roundOrder,
        slotsCount: r.slotsCount ?? 0,
        status: r.status || 'pending',
        createdAt: roundIdx !== -1 ? existingRounds[roundIdx].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      stagedRounds.push(stagedRound);
      roundMapping.set(r.roundId, roundRowId);
    }

    // 4. Validação e Staging dos MatchSlots
    const stagedSlots: MatchSlotRecord[] = [];
    const allTeams = readCollection<TeamRecord>('teams');
    const allMatches = readCollection<MatchRecord>('matches');

    for (const s of slots) {
      if (!s.slotId?.trim()) {
        throw new Error('saveStageDrawAndSlots: slotId é obrigatório no slot');
      }
      if (typeof s.position !== 'number' || s.position < 1) {
        throw new Error(`saveStageDrawAndSlots: position no slot ${s.slotId} deve ser inteiro >= 1`);
      }

      // Validação de vinculação da rodada (cross-stage / cross-competition isolation)
      const targetRoundRowId = roundMapping.get(s.roundId) ??
        existingRounds.find(er => er.stageRowId === stageRowId && er.roundId === s.roundId)?.id;

      if (!targetRoundRowId) {
        throw new Error(`saveStageDrawAndSlots: Rodada '${s.roundId}' associada ao slot '${s.slotId}' não existe no estágio`);
      }

      // Validação profunda de ParticipantReference (8 tipos canônicos)
      validateParticipantReference(s.participantAReference);
      validateParticipantReference(s.participantBReference);

      // Defesa Anti-Fake Team
      if (s.resolvedTeamAId) {
        if (isArtificialTeamId(s.resolvedTeamAId)) {
          throw new Error(`saveStageDrawAndSlots: Equipe artificial '${s.resolvedTeamAId}' rejeitada no slot '${s.slotId}'`);
        }
        if (allTeams.length > 0 && !allTeams.some(t => t.id === s.resolvedTeamAId)) {
          throw new Error(`saveStageDrawAndSlots: Equipe '${s.resolvedTeamAId}' não encontrada no sistema`);
        }
      }

      if (s.resolvedTeamBId) {
        if (isArtificialTeamId(s.resolvedTeamBId)) {
          throw new Error(`saveStageDrawAndSlots: Equipe artificial '${s.resolvedTeamBId}' rejeitada no slot '${s.slotId}'`);
        }
        if (allTeams.length > 0 && !allTeams.some(t => t.id === s.resolvedTeamBId)) {
          throw new Error(`saveStageDrawAndSlots: Equipe '${s.resolvedTeamBId}' não encontrada no sistema`);
        }
      }

      // Validação de matchId
      if (s.matchId) {
        const match = allMatches.find(m => m.id === s.matchId);
        if (allMatches.length > 0 && (!match || match.competitionId !== competitionId)) {
          throw new Error(`saveStageDrawAndSlots: Partida '${s.matchId}' não encontrada na competição ${competitionId}`);
        }
      }

      let slotRowId = s.id;
      const slotIdx = existingSlots.findIndex(es => es.competitionId === competitionId && es.slotId === s.slotId);
      if (slotIdx !== -1) {
        slotRowId = existingSlots[slotIdx].id;
      } else {
        slotRowId = slotRowId || generateId('slot');
      }

      const stagedSlot: MatchSlotRecord = {
        id: slotRowId,
        competitionId,
        stageRowId,
        roundRowId: targetRoundRowId,
        slotId: s.slotId,
        position: s.position,
        label: s.label,
        participantAReference: s.participantAReference,
        participantAStatus: s.participantAStatus || 'unresolved',
        resolvedTeamAId: s.resolvedTeamAId ?? null,
        participantBReference: s.participantBReference,
        participantBStatus: s.participantBStatus || 'unresolved',
        resolvedTeamBId: s.resolvedTeamBId ?? null,
        matchId: s.matchId ?? null,
        progressionRoute: (s.progressionRoute as ProgressionRoute | null) ?? null,
        createdAt: slotIdx !== -1 ? existingSlots[slotIdx].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      stagedSlots.push(stagedSlot);
    }

    // 5. Commit atômico final das coleções (só ocorre após 100% de sucesso nas validações)
    if (stageIdx !== -1) {
      existingStages[stageIdx] = stagedStage;
    } else {
      existingStages.push(stagedStage);
    }
    writeCollection('competition_stages', existingStages);

    for (const sr of stagedRounds) {
      const idx = existingRounds.findIndex(r => r.id === sr.id);
      if (idx !== -1) existingRounds[idx] = sr;
      else existingRounds.push(sr);
    }
    writeCollection('competition_rounds', existingRounds);

    for (const ss of stagedSlots) {
      const idx = existingSlots.findIndex(s => s.id === ss.id);
      if (idx !== -1) existingSlots[idx] = ss;
      else existingSlots.push(ss);
    }
    writeCollection('competition_match_slots', existingSlots);

    return {
      ok: true,
      stageRowId,
      roundsCount: stagedRounds.length,
      slotsCount: stagedSlots.length,
    };
  },

  async propagateSlotOutcome(params: PropagateSlotOutcomeParams): Promise<PropagateSlotOutcomeResult> {
    ensureSeeded();
    const { competitionId, slotId, winnerTeamId, loserTeamId, matchId } = params;

    // 1. Defesa Anti-Fake Team
    if (winnerTeamId && isArtificialTeamId(winnerTeamId)) {
      throw new Error(`propagateSlotOutcome: Equipe artificial '${winnerTeamId}' rejeitada como vencedor`);
    }
    if (loserTeamId && isArtificialTeamId(loserTeamId)) {
      throw new Error(`propagateSlotOutcome: Equipe artificial '${loserTeamId}' rejeitada como perdedor`);
    }

    const allSlots = readCollection<MatchSlotRecord>('competition_match_slots');
    const sourceSlot = allSlots.find(s => s.competitionId === competitionId && s.slotId === slotId);
    if (!sourceSlot) {
      throw new Error(`propagateSlotOutcome: Slot '${slotId}' não encontrado na competição ${competitionId}`);
    }

    // Se fornecido matchId, associa ao slot de origem
    if (matchId && sourceSlot.matchId !== matchId) {
      sourceSlot.matchId = matchId;
      sourceSlot.updatedAt = new Date().toISOString();
    }

    const route = sourceSlot.progressionRoute;
    let updatedCount = 0;
    let alreadyPropagated = true;

    // Identifica e atualiza slots de destino via rota explícita
    if (route) {
      if (route.onWinner && winnerTeamId) {
        const target = allSlots.find(s => s.competitionId === competitionId && s.slotId === route.onWinner!.targetSlotId);
        if (target) {
          if (route.onWinner.targetSide === 'A') {
            if (target.resolvedTeamAId !== winnerTeamId || target.participantAStatus !== 'resolved') {
              target.resolvedTeamAId = winnerTeamId;
              target.participantAStatus = 'resolved';
              target.updatedAt = new Date().toISOString();
              updatedCount++;
              alreadyPropagated = false;
            }
          } else {
            if (target.resolvedTeamBId !== winnerTeamId || target.participantBStatus !== 'resolved') {
              target.resolvedTeamBId = winnerTeamId;
              target.participantBStatus = 'resolved';
              target.updatedAt = new Date().toISOString();
              updatedCount++;
              alreadyPropagated = false;
            }
          }
        }
      }

      if (route.onLoser && loserTeamId) {
        const target = allSlots.find(s => s.competitionId === competitionId && s.slotId === route.onLoser!.targetSlotId);
        if (target) {
          if (route.onLoser.targetSide === 'A') {
            if (target.resolvedTeamAId !== loserTeamId || target.participantAStatus !== 'resolved') {
              target.resolvedTeamAId = loserTeamId;
              target.participantAStatus = 'resolved';
              target.updatedAt = new Date().toISOString();
              updatedCount++;
              alreadyPropagated = false;
            }
          } else {
            if (target.resolvedTeamBId !== loserTeamId || target.participantBStatus !== 'resolved') {
              target.resolvedTeamBId = loserTeamId;
              target.participantBStatus = 'resolved';
              target.updatedAt = new Date().toISOString();
              updatedCount++;
              alreadyPropagated = false;
            }
          }
        }
      }
    }

    // Também propaga para slots que referenciam match-winner/match-loser diretamente
    for (const slot of allSlots) {
      if (slot.competitionId !== competitionId) continue;

      if (winnerTeamId) {
        const partA = slot.participantAReference as Record<string, unknown>;
        if (partA.type === 'match-winner' && (partA.slotId === slotId || partA.slot_id === slotId)) {
          if (slot.resolvedTeamAId !== winnerTeamId || slot.participantAStatus !== 'resolved') {
            slot.resolvedTeamAId = winnerTeamId;
            slot.participantAStatus = 'resolved';
            slot.updatedAt = new Date().toISOString();
            updatedCount++;
            alreadyPropagated = false;
          }
        }
        const partB = slot.participantBReference as Record<string, unknown>;
        if (partB.type === 'match-winner' && (partB.slotId === slotId || partB.slot_id === slotId)) {
          if (slot.resolvedTeamBId !== winnerTeamId || slot.participantBStatus !== 'resolved') {
            slot.resolvedTeamBId = winnerTeamId;
            slot.participantBStatus = 'resolved';
            slot.updatedAt = new Date().toISOString();
            updatedCount++;
            alreadyPropagated = false;
          }
        }
      }

      if (loserTeamId) {
        const partA = slot.participantAReference as Record<string, unknown>;
        if (partA.type === 'match-loser' && (partA.slotId === slotId || partA.slot_id === slotId)) {
          if (slot.resolvedTeamAId !== loserTeamId || slot.participantAStatus !== 'resolved') {
            slot.resolvedTeamAId = loserTeamId;
            slot.participantAStatus = 'resolved';
            slot.updatedAt = new Date().toISOString();
            updatedCount++;
            alreadyPropagated = false;
          }
        }
        const partB = slot.participantBReference as Record<string, unknown>;
        if (partB.type === 'match-loser' && (partB.slotId === slotId || partB.slot_id === slotId)) {
          if (slot.resolvedTeamBId !== loserTeamId || slot.participantBStatus !== 'resolved') {
            slot.resolvedTeamBId = loserTeamId;
            slot.participantBStatus = 'resolved';
            slot.updatedAt = new Date().toISOString();
            updatedCount++;
            alreadyPropagated = false;
          }
        }
      }
    }

    writeCollection('competition_match_slots', allSlots);

    return {
      ok: true,
      sourceSlotId: slotId,
      idempotent: alreadyPropagated,
      updatedCount,
    };
  },

  async materializeSlotMatch(params: MaterializeSlotMatchParams): Promise<MaterializeSlotMatchResult> {
    ensureSeeded();
    const { competitionId, slotId, scheduledTime, venue, court, phase } = params;

    const allSlots = readCollection<MatchSlotRecord>('competition_match_slots');
    const slot = allSlots.find(s => s.competitionId === competitionId && s.slotId === slotId);
    if (!slot) {
      throw new Error(`materializeSlotMatch: Slot '${slotId}' não encontrado na competição ${competitionId}`);
    }

    const allMatches = readCollection<MatchRecord>('matches');

    // 1. Idempotência Nível 1: Slot já possui matchId associado
    if (slot.matchId) {
      const existing = allMatches.find(m => m.id === slot.matchId);
      if (existing) {
        return {
          ok: true,
          matchId: slot.matchId,
          alreadyMaterialized: true,
          matchNumber: existing.matchNumber,
          message: 'Partida já materializada e vinculada ao slot',
        };
      }
    }

    // 2. Idempotência Nível 2: Já existe Match com slotId nesta competição
    const existingBySlot = allMatches.find(m => m.competitionId === competitionId && m.slotId === slotId);
    if (existingBySlot) {
      slot.matchId = existingBySlot.id;
      slot.updatedAt = new Date().toISOString();
      writeCollection('competition_match_slots', allSlots);
      return {
        ok: true,
        matchId: existingBySlot.id,
        alreadyMaterialized: true,
        matchNumber: existingBySlot.matchNumber,
        message: 'Partida pré-existente vinculada ao slot',
      };
    }

    // 3. Validação de Elegibilidade
    if (slot.participantAStatus !== 'resolved' || !slot.resolvedTeamAId) {
      throw new Error(`materializeSlotMatch: Participante A do slot '${slotId}' não está resolvido`);
    }
    if (slot.participantBStatus !== 'resolved' || !slot.resolvedTeamBId) {
      throw new Error(`materializeSlotMatch: Participante B do slot '${slotId}' não está resolvido`);
    }

    // Defesa Anti-Fake Team
    if (isArtificialTeamId(slot.resolvedTeamAId)) {
      throw new Error(`materializeSlotMatch: Equipe artificial '${slot.resolvedTeamAId}' rejeitada como participante A`);
    }
    if (isArtificialTeamId(slot.resolvedTeamBId)) {
      throw new Error(`materializeSlotMatch: Equipe artificial '${slot.resolvedTeamBId}' rejeitada como participante B`);
    }

    // Validação de Existência das Equipes
    const allTeams = readCollection<TeamRecord>('teams');
    const teamA = allTeams.find(t => t.id === slot.resolvedTeamAId);
    if (!teamA) {
      throw new Error(`materializeSlotMatch: Equipe A '${slot.resolvedTeamAId}' não encontrada no banco`);
    }
    const teamB = allTeams.find(t => t.id === slot.resolvedTeamBId);
    if (!teamB) {
      throw new Error(`materializeSlotMatch: Equipe B '${slot.resolvedTeamBId}' não encontrada no banco`);
    }

    // Validação de Inscrição (pertencimento à competição) se houver tabela de inscrições
    const compTeams = readCollection<{ competitionId: string; teamId: string }>('competition_teams');
    if (compTeams.length > 0 && compTeams.some(ct => ct.competitionId === competitionId)) {
      if (!compTeams.some(ct => ct.competitionId === competitionId && ct.teamId === slot.resolvedTeamAId)) {
        throw new Error(`materializeSlotMatch: Equipe A '${slot.resolvedTeamAId}' não inscrita na competição ${competitionId}`);
      }
      if (!compTeams.some(ct => ct.competitionId === competitionId && ct.teamId === slot.resolvedTeamBId)) {
        throw new Error(`materializeSlotMatch: Equipe B '${slot.resolvedTeamBId}' não inscrita na competição ${competitionId}`);
      }
    }

    // 4. Metadados do Match
    const rounds = readCollection<RoundRecord>('competition_rounds');
    const round = rounds.find(r => r.id === slot.roundRowId);
    const stages = readCollection<StageRecord>('competition_stages');
    const stage = stages.find(s => s.id === slot.stageRowId);

    const compMatches = allMatches.filter(m => m.competitionId === competitionId);
    const nextMatchNumber = compMatches.reduce((max, m) => Math.max(max, m.matchNumber || 0), 0) + 1;

    const matchPhase = phase || slot.label || stage?.stageType || 'playoffs';
    const matchVenue = venue || 'Arena Principal';
    const matchTime = scheduledTime || new Date().toISOString();
    const matchId = generateId('match');
    const now = new Date().toISOString();

    const newMatch: MatchRecord = {
      id: matchId,
      competitionId,
      slotId,
      round: round?.roundOrder ?? 1,
      matchNumber: nextMatchNumber,
      teamAId: slot.resolvedTeamAId,
      teamBId: slot.resolvedTeamBId,
      teamAName: teamA.name,
      teamBName: teamB.name,
      teamAShortName: teamA.shortName || teamA.name.substring(0, 3).toUpperCase(),
      teamBShortName: teamB.shortName || teamB.name.substring(0, 3).toUpperCase(),
      venue: matchVenue,
      court,
      scheduledTime: matchTime,
      status: 'scheduled',
      sets: [],
      referees: [],
      phase: matchPhase,
      createdAt: now,
      updatedAt: now,
    };

    allMatches.push(newMatch);
    writeCollection('matches', allMatches);

    // Vincula matchId ao slot
    slot.matchId = matchId;
    slot.updatedAt = now;
    writeCollection('competition_match_slots', allSlots);

      return {
        ok: true,
        matchId,
        alreadyMaterialized: false,
        matchNumber: nextMatchNumber,
      };
    },

  async provisionTeamUser(input: ProvisionTeamUserInput): Promise<ProvisionTeamUserResult> {
    try {
      const normEmail = input.email.trim().toLowerCase();
      const PASSWORDS_KEY = 'voleipro.auth.custom_passwords.v1';
      const USERS_STORAGE_KEY = 'voleipro.system.users.v1';

      let passMap: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(PASSWORDS_KEY);
        if (raw) passMap = JSON.parse(raw);
      } catch {
        // storage fallback
      }
      passMap[normEmail] = input.password;
      localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passMap));

      let users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        competitionTeamId?: string;
        status?: string;
        createdAt?: string;
      }> = [];
      try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (raw) users = JSON.parse(raw);
      } catch {
        // storage fallback
      }

      const existingIdx = users.findIndex(u => u.email.toLowerCase() === normEmail);
      const userId = existingIdx !== -1 ? users[existingIdx].id : 'usr-' + Date.now();
      const userObj = {
        id: userId,
        name: input.name.trim(),
        email: normEmail,
        role: 'team',
        status: 'active',
        competitionTeamId: input.competitionTeamId,
        createdAt: existingIdx !== -1 && users[existingIdx].createdAt ? users[existingIdx].createdAt : new Date().toISOString(),
      };

      if (existingIdx !== -1) {
        users[existingIdx] = { ...users[existingIdx], ...userObj };
      } else {
        users.push(userObj);
      }
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      return { ok: true, userId };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : 'Falha ao provisionar usuário local' };
    }
  },
};

// ============================================================================
// Adaptador Supabase
// ============================================================================

// Mapeamento de colunas: a aplicação usa camelCase; o banco usa snake_case.
export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)] = value;
  }
  return out;
}

export function toCamel(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
  }
  return out;
}

function mapRows<T>(rows: unknown): T[] {
  return (rows as Record<string, unknown>[]).map(row => toCamel(row) as T);
}

function mapRow<T>(row: unknown): T | null {
  return row ? (toCamel(row as Record<string, unknown>) as T) : null;
}

export interface SupabaseErrorLike {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

export function assertSupabaseSuccess<T>(
  data: T | null,
  error: SupabaseErrorLike | null,
  context: { operation: string; table: string },
): T {
  if (error) {
    const code = error.code ? `[${error.code}] ` : '';
    const details = error.details ? ` - Detalhes: ${error.details}` : '';
    const hint = error.hint ? ` (Dica: ${error.hint})` : '';
    throw new Error(
      `Falha na operação "${context.operation}" na tabela "${context.table}": ${code}${error.message}${details}${hint}`
    );
  }
  if (data === null || data === undefined) {
    throw new Error(
      `Falha na operação "${context.operation}" na tabela "${context.table}": Nenhum dado retornado pelo banco.`
    );
  }
  return data;
}

export function assertSupabaseUpdateSuccess<T>(
  data: T | null,
  error: SupabaseErrorLike | null,
  context: { operation: string; table: string },
): T | null {
  if (error) {
    const code = error.code ? `[${error.code}] ` : '';
    const details = error.details ? ` - Detalhes: ${error.details}` : '';
    const hint = error.hint ? ` (Dica: ${error.hint})` : '';
    throw new Error(
      `Falha na operação "${context.operation}" na tabela "${context.table}": ${code}${error.message}${details}${hint}`
    );
  }
  return data;
}

const supabaseAdapter = {
  async listCompetitions(): Promise<CompetitionRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.competitions).select('*');
    if (!this.isPlatformAdminGlobalMode()) {
      const activeOrgId = this.getActiveOrganizationId();
      if (!activeOrgId) return [];
      query = query.eq('organization_id', activeOrgId);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Falha ao listar competições: [${error.code}] ${error.message}`);
    }
    return (data ?? []).map(row => competitionMapper.toDomain(row as Record<string, unknown>));
  },

  async getCompetition(id: string): Promise<CompetitionRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    let query = supabase.from(SUPABASE_TABLES.competitions).select('*').eq('id', id);
    if (!this.isPlatformAdminGlobalMode()) {
      const activeOrgId = this.getActiveOrganizationId();
      if (activeOrgId) {
        query = query.eq('organization_id', activeOrgId);
      }
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Falha ao buscar competição "${id}": [${error.code}] ${error.message}`);
    }
    return data ? competitionMapper.toDomain(data as Record<string, unknown>) : null;
  },

  async getCompetitionBySlug(slug: string): Promise<CompetitionRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitions).select('*').eq('slug', slug).maybeSingle();
    if (error) {
      throw new Error(`Falha ao buscar competição pelo slug "${slug}": [${error.code}] ${error.message}`);
    }
    return data ? competitionMapper.toDomain(data as Record<string, unknown>) : null;
  },

  async updateCompetition(id: string, updates: Partial<CompetitionRecord>): Promise<CompetitionRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const existing = await this.getCompetition(id);
    const safeUpdates = { ...updates };
    if (existing?.rulesSnapshot && 'rulesSnapshot' in safeUpdates && safeUpdates.rulesSnapshot !== existing.rulesSnapshot) {
      safeUpdates.rulesSnapshot = existing.rulesSnapshot;
    }
    // IMUTABILIDADE DO SLUG: Se a competição já possui slug, nunca sobrescreve nem altera
    if (existing?.slug) {
      safeUpdates.slug = existing.slug;
    }
    const payload = competitionMapper.toPersistence(safeUpdates);
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitions).update(payload).eq('id', id).select().maybeSingle();
    assertSupabaseUpdateSuccess(data, error, { operation: 'updateCompetition', table: SUPABASE_TABLES.competitions });
    return data ? competitionMapper.toDomain(data as Record<string, unknown>) : null;
  },

  async createCompetition(input: Omit<CompetitionRecord, 'id'> & { id?: string }): Promise<CompetitionRecord> {
    const orgId = input.organizationId?.trim() || this.getActiveOrganizationId()?.trim();
    if (!orgId) {
      throw new Error('Não foi possível criar a competição porque nenhuma organização está ativa.');
    }
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const id = input.id || generateId('comp');
    const slug = input.slug || generateSlug(input.name);
    const payload = competitionMapper.toPersistence({ ...input, organizationId: orgId, id, slug });
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitions).insert(payload).select().single();
    const res = assertSupabaseSuccess(data, error, { operation: 'createCompetition', table: SUPABASE_TABLES.competitions });
    return competitionMapper.toDomain(res as Record<string, unknown>);
  },

  async deleteCompetition(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from(SUPABASE_TABLES.competitions).delete().eq('id', id);
    if (error) {
      throw new Error(`Falha ao excluir competição "${id}": [${error.code}] ${error.message}`);
    }
  },

  async listUserMemberships(userId: string): Promise<UserMembership[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from(SUPABASE_TABLES.userMemberships).select('*').eq('user_id', userId);
    if (error) throw new Error(`Falha ao listar memberships: [${error.code}] ${error.message}`);
    return mapRows<UserMembership>(data ?? []);
  },

  async createUserMembership(input: Omit<UserMembership, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<UserMembership> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const now = new Date().toISOString();
    const payload = toSnake({ ...input, id: input.id || generateId('membership'), createdAt: now, updatedAt: now });
    const { data, error } = await supabase.from(SUPABASE_TABLES.userMemberships).insert(payload).select().single();
    const result = assertSupabaseSuccess(data, error, { operation: 'createUserMembership', table: SUPABASE_TABLES.userMemberships });
    return mapRow<UserMembership>(result) ?? (result as unknown as UserMembership);
  },

  // --- Organizations (Fase 11.3) ---
  async listOrganizations(): Promise<OrganizationRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from(SUPABASE_TABLES.organizations).select('*');
    if (error) throw new Error(`Falha ao listar organizações: [${error.code}] ${error.message}`);
    return mapRows<OrganizationRecord>(data ?? []);
  },

  async getOrganizationById(id: string): Promise<OrganizationRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from(SUPABASE_TABLES.organizations).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Falha ao buscar organização "${id}": [${error.code}] ${error.message}`);
    return mapRow<OrganizationRecord>(data);
  },

  async createOrganization(input: Omit<OrganizationRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<OrganizationRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const now = new Date().toISOString();
    const payload = toSnake({
      ...input,
      id: input.id || generateId('org'),
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now,
    });
    const { data, error } = await supabase.from(SUPABASE_TABLES.organizations).insert(payload).select().single();
    const result = assertSupabaseSuccess(data, error, { operation: 'createOrganization', table: SUPABASE_TABLES.organizations });
    return mapRow<OrganizationRecord>(result) ?? (result as unknown as OrganizationRecord);
  },

  async updateOrganization(id: string, updates: Partial<OrganizationRecord>): Promise<OrganizationRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const now = new Date().toISOString();
    const payload = toSnake({ ...updates, updatedAt: now });
    const { data, error } = await supabase.from(SUPABASE_TABLES.organizations).update(payload).eq('id', id).select().maybeSingle();
    const result = assertSupabaseUpdateSuccess(data, error, { operation: 'updateOrganization', table: SUPABASE_TABLES.organizations });
    return mapRow<OrganizationRecord>(result) ?? (result as unknown as OrganizationRecord);
  },

  async listOrganizationMembers(organizationId: string): Promise<OrganizationMemberDetail[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.userMemberships)
      .select('*, profiles:user_id(name, email), teams:team_id(name)')
      .eq('organization_id', organizationId);
    if (error) {
      const fallback = await supabase.from(SUPABASE_TABLES.userMemberships).select('*').eq('organization_id', organizationId);
      if (fallback.error) throw new Error(`Falha ao listar membros: [${fallback.error.code}] ${fallback.error.message}`);
      return mapRows<OrganizationMemberDetail>(fallback.data ?? []);
    }
    return (data ?? []).map((row: Record<string, unknown>) => {
      const mapped = mapRow<UserMembership>(row);
      const profiles = row.profiles as { name?: string; email?: string } | undefined;
      const teams = row.teams as { name?: string } | undefined;
      return {
        ...mapped!,
        userName: profiles?.name,
        userEmail: profiles?.email,
        teamName: teams?.name,
      };
    });
  },

  async updateUserMembership(id: string, updates: Partial<UserMembership>): Promise<UserMembership> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const now = new Date().toISOString();
    const payload = toSnake({ ...updates, updatedAt: now });
    const { data, error } = await supabase.from(SUPABASE_TABLES.userMemberships).update(payload).eq('id', id).select().maybeSingle();
    const result = assertSupabaseUpdateSuccess(data, error, { operation: 'updateUserMembership', table: SUPABASE_TABLES.userMemberships });
    return mapRow<UserMembership>(result) ?? (result as unknown as UserMembership);
  },

  async deleteUserMembership(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase.from(SUPABASE_TABLES.userMemberships).delete().eq('id', id);
    if (error) throw new Error(`Falha ao remover vínculo de membro: [${error.code}] ${error.message}`);
  },

  async listOrganizationTeams(organizationId: string): Promise<TeamRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from(SUPABASE_TABLES.teams).select('*').eq('organization_id', organizationId);
    if (error) throw new Error(`Falha ao listar equipes da organização: [${error.code}] ${error.message}`);
    return mapRows<TeamRecord>(data ?? []);
  },

  async listOrganizationCompetitions(organizationId: string): Promise<CompetitionRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitions).select('*').eq('organization_id', organizationId);
    if (error) throw new Error(`Falha ao listar competições da organização: [${error.code}] ${error.message}`);
    return mapRows<CompetitionRecord>(data ?? []);
  },

  async listOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from(SUPABASE_TABLES.organizationInvitations).select('*').eq('organization_id', organizationId);
    if (error) throw new Error(`Falha ao listar convites: [${error.code}] ${error.message}`);
    return mapRows<OrganizationInvitation>(data ?? []);
  },

  getActiveOrganizationId(): string | null {
    try {
      const stored = localStorage.getItem('baseos.active_org_id') || localStorage.getItem('baseos.active_tenant_id');
      if (stored) return stored;
      const session = authService.getStoredSession();
      if (session?.user?.organizationId) return session.user.organizationId;
      return null;
    } catch {
      return null;
    }
  },

  isPlatformAdminGlobalMode(): boolean {
    try {
      const isMaster = authService.isPlatformAdmin();
      if (!isMaster) return false;
      const globalFlag = localStorage.getItem('baseos.global_view') === 'true';
      const activeOrg = localStorage.getItem('baseos.active_org_id') || localStorage.getItem('baseos.active_tenant_id');
      return globalFlag || activeOrg === 'all' || activeOrg === 'global' || !activeOrg;
    } catch {
      return false;
    }
  },

  setActiveOrganizationId(orgId: string | null): void {
    try {
      if (orgId) {
        localStorage.setItem('baseos.active_org_id', orgId);
        localStorage.setItem('baseos.active_tenant_id', orgId);
      } else {
        localStorage.removeItem('baseos.active_org_id');
        localStorage.removeItem('baseos.active_tenant_id');
      }
    } catch {
      // fallback
    }
  },


  async createOrganizationInvitation(input: Omit<OrganizationInvitation, 'id' | 'createdAt' | 'token' | 'status' | 'expiresAt'> & { id?: string; token?: string; expiresAt?: string }): Promise<OrganizationInvitation> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('create_organization_invitation', {
      p_organization_id: input.organizationId,
      p_email: input.email,
      p_role: input.role,
      p_team_id: input.teamId || null,
    });
    if (error) throw new Error(`Falha ao criar convite: [${error.code}] ${error.message}`);
    if (data && !data.ok) throw new Error(data.error || 'Falha ao criar convite.');

    return {
      id: data.id,
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
      teamId: input.teamId,
      token: data.token,
      status: 'pending',
      invitedBy: input.invitedBy,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
  },

  async cancelOrganizationInvitation(invitationId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase.from(SUPABASE_TABLES.organizationInvitations).update({ status: 'canceled' }).eq('id', invitationId);
    if (error) throw new Error(`Falha ao cancelar convite: [${error.code}] ${error.message}`);
  },

  async acceptOrganizationInvitation(token: string, userId: string): Promise<{ ok: boolean; membershipId?: string; error?: string }> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('accept_organization_invitation', {
      p_token: token.trim(),
    });
    if (error) throw new Error(`Falha ao aceitar convite: [${error.code}] ${error.message}`);
    return data;
  },


  /**
   * setupOrganizationAdmin — Fase 1
   * Cria usuário Auth + profile(role=admin) + membership(admin) em sequência.
   */
  async setupOrganizationAdmin(input: {
    organizationId: string;
    email: string;
    name: string;
    password: string;
    invitedBy: string;
  }): Promise<{ ok: boolean; userId: string; membershipId: string }> {
    const supabase = await getSupabaseClient();
    const { organizationId, email, name, password, invitedBy } = input;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Criar usuário Auth
    let userId: string;
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      user_metadata: { name },
      email_confirm: true,
    });
    if (createError) {
      if (createError.message?.toLowerCase().includes('already been registered') || createError.code === 'email_exists') {
        const { data: profileData } = await supabase.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle();
        userId = profileData.id;
      } else {
        throw new Error(`Falha ao criar usuário: ${createError.message}`);
      }
    } else {
      userId = createData.user.id;
    }

    // 2. Upsert profile com role=admin
    const { error: profileError } = await supabase.from('profiles').upsert(
      { id: userId, email: normalizedEmail, name, role: 'admin', organization_id: organizationId, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    if (profileError) throw new Error(`Falha ao configurar profile: ${profileError.message}`);

    // 3. Membership ativo
    const { data: existingMship } = await supabase.from('user_memberships').select('id').eq('user_id', userId).eq('organization_id', organizationId).maybeSingle();
    let membershipId: string;
    if (existingMship?.id) {
      await supabase.from('user_memberships').update({ role: 'admin', status: 'active', updated_at: new Date().toISOString() }).eq('id', existingMship.id);
      membershipId = existingMship.id;
    } else {
      const now = new Date().toISOString();
      const payload = { id: generateId('membership'), user_id: userId, organization_id: organizationId, role: 'admin', status: 'active', invited_by: invitedBy, created_at: now, updated_at: now };
      const { data: mshipData, error: mshipError } = await supabase.from('user_memberships').insert(payload).select('id').single();
      if (mshipError) throw new Error(`Falha ao criar membership: ${mshipError.message}`);
      membershipId = mshipData.id;
    }
    return { ok: true, userId, membershipId };
  },

  // --- Athletes (Fase 11.3) ---
  async listAthletes(): Promise<AthleteIdentity[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from(SUPABASE_TABLES.athletes).select('*');
    if (error) throw new Error(`Falha ao listar atletas: [${error.code}] ${error.message}`);
    return mapRows<AthleteIdentity>(data ?? []);
  },

  async getAthleteById(id: string): Promise<AthleteIdentity | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from(SUPABASE_TABLES.athletes).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Falha ao buscar atleta "${id}": [${error.code}] ${error.message}`);
    return mapRow<AthleteIdentity>(data);
  },

  async getAthleteByCpf(cpf: string): Promise<AthleteIdentity | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const normalized = normalizeCpf(cpf);
    if (!normalized) return null;
    const { data, error } = await supabase.from(SUPABASE_TABLES.athletes).select('*').eq('normalized_cpf', normalized).maybeSingle();
    if (error) throw new Error(`Falha ao buscar atleta por CPF: [${error.code}] ${error.message}`);
    return mapRow<AthleteIdentity>(data);
  },

  async createAthlete(input: Omit<AthleteIdentity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<AthleteIdentity> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const normalizedCpf = normalizeCpf(input.normalizedCpf);
    const now = new Date().toISOString();
    const payload = toSnake({
      ...input,
      normalizedCpf,
      id: input.id || generateId('athlete'),
      createdAt: now,
      updatedAt: now,
    });
    const { data, error } = await supabase.from(SUPABASE_TABLES.athletes).insert(payload).select().single();
    if (error) {
      if (error.code === '23505') {
        throw new Error(`Violação de unicidade: CPF já cadastrado [${error.code}] ${error.message}`);
      }
      throw new Error(`Falha ao criar atleta: [${error.code}] ${error.message}`);
    }
    const result = assertSupabaseSuccess(data, error, { operation: 'createAthlete', table: SUPABASE_TABLES.athletes });
    return mapRow<AthleteIdentity>(result) ?? (result as unknown as AthleteIdentity);
  },

  async listTeams(): Promise<TeamRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.teams).select('*');
    if (!this.isPlatformAdminGlobalMode()) {
      const activeOrgId = this.getActiveOrganizationId();
      if (!activeOrgId) return [];
      query = query.eq('organization_id', activeOrgId);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Falha ao listar equipes: [${error.code}] ${error.message}`);
    }
    return (data ?? []).map(row => teamMapper.toDomain(row as Record<string, unknown>));
  },

  async getTeam(id: string): Promise<TeamRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.teams)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`Falha ao obter equipe: [${error.code}] ${error.message}`);
    }
    if (!data) return null;
    return teamMapper.toDomain(data as Record<string, unknown>);
  },

  async createTeam(input: Omit<TeamRecord, 'id'> & { id?: string }): Promise<TeamRecord> {
    const orgId = input.organizationId?.trim() || this.getActiveOrganizationId()?.trim();
    if (!orgId) {
      throw new Error('Não foi possível cadastrar a equipe porque nenhuma organização está ativa.');
    }
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const id = input.id || generateId('team');
    const payload = teamMapper.toPersistence({
      ...input,
      organizationId: orgId,
      id,
    });
    const { data, error } = await supabase.from(SUPABASE_TABLES.teams).insert(payload).select().single();
    const res = assertSupabaseSuccess(data, error, { operation: 'createTeam', table: SUPABASE_TABLES.teams });
    return teamMapper.toDomain(res as Record<string, unknown>);
  },

  async updateTeam(id: string, updates: Partial<TeamRecord>): Promise<TeamRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const payload = teamMapper.toPersistence(updates);
    const { data, error } = await supabase.from(SUPABASE_TABLES.teams).update(payload).eq('id', id).select().maybeSingle();
    assertSupabaseUpdateSuccess(data, error, { operation: 'updateTeam', table: SUPABASE_TABLES.teams });
    return data ? teamMapper.toDomain(data as Record<string, unknown>) : null;
  },

  async deleteTeam(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from(SUPABASE_TABLES.teams).delete().eq('id', id);
    if (error) {
      throw new Error(`Falha ao excluir equipe "${id}": [${error.code}] ${error.message}`);
    }
  },

  async listReferees(): Promise<RefereeRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.referees).select('*');
    return mapRows<RefereeRecord>(data ?? []);
  },

  async createReferee(input: Omit<RefereeRecord, 'id'> & { id?: string }): Promise<RefereeRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const id = input.id || generateId('ref');
    const { data } = await supabase.from(SUPABASE_TABLES.referees).insert(toSnake({ ...input, id })).select().single();
    return mapRow<RefereeRecord>(data) ?? (data as unknown as RefereeRecord);
  },

  async updateReferee(id: string, updates: Partial<RefereeRecord>): Promise<RefereeRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.referees).update(toSnake(updates)).eq('id', id).select().maybeSingle();
    return mapRow<RefereeRecord>(data);
  },

  async deleteReferee(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.referees).delete().eq('id', id);
  },

  async listVenues(): Promise<VenueRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.venues).select('*');
    if (!this.isPlatformAdminGlobalMode()) {
      const activeOrgId = this.getActiveOrganizationId();
      if (!activeOrgId) return [];
      query = query.eq('organization_id', activeOrgId);
    }
    const { data } = await query;
    return mapRows<VenueRecord>(data ?? []);
  },

  async createVenue(input: Omit<VenueRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<VenueRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const id = input.id || generateId('venue');
    const now = new Date().toISOString();
    const activeOrgId = this.getActiveOrganizationId() || 'org-1';
    const { data } = await supabase.from(SUPABASE_TABLES.venues).insert(toSnake({
      ...input,
      organizationId: input.organizationId || activeOrgId,
      id,
      createdAt: now,
      updatedAt: now,
    })).select().single();
    return mapRow<VenueRecord>(data) ?? (data as unknown as VenueRecord);
  },

  async updateVenue(id: string, updates: Partial<VenueRecord>): Promise<VenueRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.venues).update(toSnake(updates)).eq('id', id).select().maybeSingle();
    return mapRow<VenueRecord>(data);
  },

  async deleteVenue(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.venues).delete().eq('id', id);
  },

  async getSettings(): Promise<SettingsRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) return DEFAULT_SETTINGS;
    const { data } = await supabase.from('app_settings').select('*').eq('id', 'main').maybeSingle();
    const row = mapRow<SettingsRecord>(data);
    if (!row) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...row,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...row.notifications },
      rules: { ...DEFAULT_SETTINGS.rules, ...row.rules },
    };
  },

  async updateSettings(updates: Partial<SettingsRecord>): Promise<SettingsRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) return this.getSettings();
    const payload = toSnake({ ...updates });
    delete payload.updated_at;
    const { data } = await supabase.from('app_settings').update(payload).eq('id', 'main').select().maybeSingle();
    if (data) {
      const row = mapRow<SettingsRecord>(data);
      return { ...DEFAULT_SETTINGS, ...row, notifications: { ...DEFAULT_SETTINGS.notifications, ...row?.notifications }, rules: { ...DEFAULT_SETTINGS.rules, ...row?.rules } };
    }
    return this.getSettings();
  },

  async listMatches(competitionId?: string): Promise<MatchRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.matches).select('*');
    if (competitionId) {
      if (!this.isPlatformAdminGlobalMode()) {
        const activeOrgId = this.getActiveOrganizationId();
        if (activeOrgId) {
          const comp = await this.getCompetition(competitionId);
          if (!comp) return [];
        }
      }
      query = query.eq('competition_id', competitionId);
    } else if (!this.isPlatformAdminGlobalMode()) {
      const activeOrgId = this.getActiveOrganizationId();
      if (activeOrgId) {
        const comps = await this.listCompetitions();
        const compIds = comps.map(c => c.id);
        if (compIds.length === 0) return [];
        query = query.in('competition_id', compIds);
      }
    }
    query = query.order('scheduled_time', { ascending: true, nullsFirst: false });
    const { data } = await query;
    return mapRows<MatchRecord>(data ?? []);
  },

  async getMatch(id: string): Promise<MatchRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.matches).select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    const match = mapRow<MatchRecord>(data);
    if (!match) return null;
    if (!this.isPlatformAdminGlobalMode()) {
      const activeOrgId = this.getActiveOrganizationId();
      if (activeOrgId) {
        const comp = await this.getCompetition(match.competitionId);
        if (!comp) return null;
      }
    }
    return match;
  },

  async createMatch(match: Omit<MatchRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MatchRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const id = match.id || generateId('match');
    const now = new Date().toISOString();
    const rawPayload = toSnake({ ...match, id, createdAt: now, updatedAt: now } as Record<string, unknown>);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawPayload)) {
      if (value !== undefined) {
        payload[key] = value;
      }
    }
    const { data, error } = await supabase.from(SUPABASE_TABLES.matches).insert(payload).select().single();
    const res = assertSupabaseSuccess(data, error, { operation: 'createMatch', table: SUPABASE_TABLES.matches });
    return mapRow<MatchRecord>(res) ?? (res as unknown as MatchRecord);
  },

  async updateMatch(id: string, updates: Partial<MatchRecord>): Promise<MatchRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const rawPayload = toSnake(updates as Record<string, unknown>);
    // Sanitização de payload para prevenir erros PGRST204
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawPayload)) {
      if (value !== undefined) {
        payload[key] = value;
      } else if (key === 'highlight_athlete_id' || key === 'homologated_at' || key === 'homologated_by') {
        // Permite limpar explicitamente campos nullable
        payload[key] = null;
      }
    }
    const { data, error } = await supabase.from(SUPABASE_TABLES.matches).update(payload).eq('id', id).select().maybeSingle();
    assertSupabaseUpdateSuccess(data, error, { operation: 'updateMatch', table: SUPABASE_TABLES.matches });
    return mapRow<MatchRecord>(data);
  },

  async deleteMatches(ids: string[]): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase || ids.length === 0) return;
    await supabase.from(SUPABASE_TABLES.matches).delete().in('id', ids);
  },

  async listDraws(competitionId?: string): Promise<DrawRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.draws).select('*');
    if (competitionId) query = query.eq('competition_id', competitionId);
    const { data } = await query;
    return mapRows<DrawRecord>(data ?? []);
  },

  async getDrawByCompetition(competitionId: string): Promise<DrawRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.draws).select('*').eq('competition_id', competitionId).maybeSingle();
    return mapRow<DrawRecord>(data);
  },

  async saveDraw(result: DrawResult): Promise<DrawRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const now = new Date().toISOString();
    const existing = await this.getDrawByCompetition(result.competitionId);
    const drawId = existing?.id || generateId('draw');
    const payload = toSnake({ ...result, id: drawId });
    const { data } = existing
      ? await supabase.from(SUPABASE_TABLES.draws).update({ ...payload, updated_at: now }).eq('id', existing.id).select().maybeSingle()
      : await supabase.from(SUPABASE_TABLES.draws).insert({ ...payload, created_at: now, updated_at: now }).select().single();
    return mapRow<DrawRecord>(data) ?? (data as unknown as DrawRecord);
  },

  async saveDrawWithMatches(
    result: DrawResult,
    matches: Array<{
      round: number;
      matchNumber: number;
      teamAId: string;
      teamBId: string;
      teamAName: string;
      teamBName: string;
      teamAShortName: string;
      teamBShortName: string;
      groupName: string;
      phase: string;
      scheduledTime: string;
      venue: string;
    }>
  ): Promise<{ draw: DrawRecord; matches: MatchRecord[] }> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const now = new Date().toISOString();

    const existingDraw = await this.getDrawByCompetition(result.competitionId);
    if (existingDraw?.status === 'locked') {
      throw new Error('Sorteio bloqueado. Não é possível modificar sorteio oficializado.');
    }

    const existingMatches = await this.listMatches(result.competitionId);
    const hasStartedOrPlayed = existingMatches.some(
      m =>
        (m.phase === 'classificatória' || m.phase === 'classificatoria') &&
        (m.status === 'in-progress' || m.status === 'completed' || m.status === 'homologated' || (m.sets && m.sets.length > 0))
    );
    if (hasStartedOrPlayed) {
      throw new Error('Não é possível substituir as partidas da fase classificatória pois já existem jogos iniciados ou finalizados.');
    }

    const { data: deletedData } = await supabase
      .from(SUPABASE_TABLES.matches)
      .delete()
      .in('phase', ['classificatória', 'classificatoria'])
      .eq('competition_id', result.competitionId);

    const newMatches: Partial<MatchRecord>[] = matches.map((proposal) => ({
      id: generateId('match'),
      competitionId: result.competitionId,
      round: proposal.round,
      matchNumber: proposal.matchNumber,
      teamAId: proposal.teamAId,
      teamBId: proposal.teamBId,
      teamAName: proposal.teamAName,
      teamBName: proposal.teamBName,
      teamAShortName: proposal.teamAShortName,
      teamBShortName: proposal.teamBShortName,
      venue: proposal.venue,
      phase: proposal.phase,
      groupName: proposal.groupName,
      scheduledTime: proposal.scheduledTime,
      status: 'scheduled' as const,
      sets: [],
      referees: [],
      createdAt: now,
      updatedAt: now,
    }));

    const { data: insertedMatches } = await supabase
      .from(SUPABASE_TABLES.matches)
      .insert(newMatches.map(m => toSnake(m)))
      .select();

    const drawId = existingDraw?.id || generateId('draw');
    const payload = toSnake({ ...result, id: drawId });
    const { data: drawData } = existingDraw
      ? await supabase.from(SUPABASE_TABLES.draws).update({ ...payload, updated_at: now }).eq('id', existingDraw.id).select().maybeSingle()
      : await supabase.from(SUPABASE_TABLES.draws).insert({ ...payload, created_at: now, updated_at: now }).select().single();

    const draw = mapRow<DrawRecord>(drawData) ?? (drawData as unknown as DrawRecord);
    return { draw, matches: (insertedMatches ?? []).map(m => mapRow<MatchRecord>(m) ?? m as MatchRecord) };
  },

  async updateDrawStatus(competitionId: string, status: 'preview' | 'official' | 'locked'): Promise<DrawRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const now = new Date().toISOString();
    const existing = await this.getDrawByCompetition(competitionId);
    if (!existing) return null;
    const { data } = await supabase
      .from(SUPABASE_TABLES.draws)
      .update({ status, updated_at: now })
      .eq('id', existing.id)
      .select()
      .maybeSingle();
    return mapRow<DrawRecord>(data);
  },

  async listCompetitionTeams(competitionId?: string): Promise<CompetitionTeam[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.competitionTeams).select('*');
    if (competitionId) query = query.eq('competition_id', competitionId);
    const { data, error } = await query;
    if (error) {
      throw new Error(`Falha ao listar inscrições de equipes: [${error.code}] ${error.message}`);
    }
    return (data ?? []).map(row => competitionTeamMapper.toDomain(row as Record<string, unknown>));
  },

  async getCompetitionTeamById(id: string): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitionTeams).select('*').eq('id', id).maybeSingle();
    if (error) {
      throw new Error(`Falha ao buscar inscrição de equipe "${id}": [${error.code}] ${error.message}`);
    }
    return data ? competitionTeamMapper.toDomain(data as Record<string, unknown>) : null;
  },

  async getCompetitionTeamByToken(token: string): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitionTeams).select('*').eq('access_token', token).maybeSingle();
    if (error) {
      throw new Error(`Falha ao buscar inscrição de equipe por token: [${error.code}] ${error.message}`);
    }
    return data ? competitionTeamMapper.toDomain(data as Record<string, unknown>) : null;
  },

  async createCompetitionTeam(input: Omit<CompetitionTeam, 'id' | 'accessToken' | 'createdAt' | 'updatedAt'> & { id?: string; accessToken?: string }): Promise<CompetitionTeam> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const id = input.id || generateId('ct');
    const accessToken = input.accessToken || generateToken();
    const payload = competitionTeamMapper.toPersistence({ ...input, id, accessToken });
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionTeams)
      .insert(payload)
      .select()
      .single();
    const res = assertSupabaseSuccess(data, error, { operation: 'createCompetitionTeam', table: SUPABASE_TABLES.competitionTeams });
    return competitionTeamMapper.toDomain(res as Record<string, unknown>);
  },

  async updateCompetitionTeam(id: string, updates: Partial<CompetitionTeam>): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const payload = competitionTeamMapper.toPersistence(updates);
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitionTeams).update(payload).eq('id', id).select().maybeSingle();
    assertSupabaseUpdateSuccess(data, error, { operation: 'updateCompetitionTeam', table: SUPABASE_TABLES.competitionTeams });
    return data ? competitionTeamMapper.toDomain(data as Record<string, unknown>) : null;
  },

  async listCompetitionAthletes(competitionTeamId?: string): Promise<CompetitionAthlete[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.competitionAthletes).select('*');
    if (competitionTeamId) query = query.eq('competition_team_id', competitionTeamId);
    const { data } = await query;
    return mapRows<CompetitionAthlete>(data ?? []);
  },

  async createCompetitionAthlete(input: CompetitionAthleteCreate & { id?: string; athleteId?: string }): Promise<CompetitionAthlete> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    let athleteId = input.athleteId;
    if (!athleteId) {
      const identity = await getOrCreateAthleteIdentity(
        { name: input.name, documentNumber: input.documentNumber, birthDate: input.birthDate },
        this,
      );
      athleteId = identity.id;
    }
    const id = input.id || generateId('ath');
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitionAthletes).insert(toSnake({ ...input, athleteId, id })).select().single();
    const res = assertSupabaseSuccess(data, error, { operation: 'createCompetitionAthlete', table: SUPABASE_TABLES.competitionAthletes });
    return mapRow<CompetitionAthlete>(res) ?? (res as unknown as CompetitionAthlete);
  },

  async registerCompetitionAthleteAuth(
    competitionTeamId: string,
    input: CompetitionAthleteInput,
  ): Promise<{ ok: boolean; athlete?: CompetitionAthlete; error?: string }> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('register_competition_athlete_auth', {
      p_competition_team_id: competitionTeamId,
      p_name: input.name.trim(),
      p_position: input.position.trim(),
      p_jersey_number: input.jerseyNumber ?? null,
      p_is_captain: input.isCaptain ?? false,
      p_is_libero: input.isLibero ?? false,
      p_gender: input.gender ?? 'female',
      p_document_number: input.documentNumber ? input.documentNumber.trim() : null,
      p_birth_date: input.birthDate ?? null,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    const res = data as { ok?: boolean; athlete?: unknown; error?: string } | null;
    if (!res || !res.ok) {
      return { ok: false, error: res?.error || 'Falha ao inscrever atleta na equipe.' };
    }
    const mappedAthlete = mapRow<CompetitionAthlete>(res.athlete) ?? (res.athlete as unknown as CompetitionAthlete);
    return { ok: true, athlete: mappedAthlete };
  },

  async registerAthletePublic(token: string, input: CompetitionAthleteInput): Promise<{ ok: boolean; athlete?: CompetitionAthlete; error?: string }> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('register_athlete', {
      p_token: token,
      p_name: input.name.trim(),
      p_position: input.position.trim(),
      p_jersey_number: input.jerseyNumber ?? null,
      p_is_captain: input.isCaptain ?? false,
      p_is_libero: input.isLibero ?? false,
      p_gender: input.gender ?? 'female',
      p_document_number: input.documentNumber ? input.documentNumber.trim() : null,
      p_birth_date: input.birthDate ?? null,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    const res = data as { ok?: boolean; athlete?: unknown; error?: string } | null;
    if (!res || !res.ok) {
      return { ok: false, error: res?.error || 'Falha ao registrar atleta via inscrição pública.' };
    }
    const mappedAthlete = mapRow<CompetitionAthlete>(res.athlete) ?? (res.athlete as unknown as CompetitionAthlete);
    return { ok: true, athlete: mappedAthlete };
  },

  async updateCompetitionAthlete(id: string, updates: Partial<CompetitionAthlete>): Promise<CompetitionAthlete | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from(SUPABASE_TABLES.competitionAthletes).update(toSnake(updates)).eq('id', id).select().maybeSingle();
    assertSupabaseUpdateSuccess(data, error, { operation: 'updateCompetitionAthlete', table: SUPABASE_TABLES.competitionAthletes });
    return mapRow<CompetitionAthlete>(data);
  },

  async deleteCompetitionAthlete(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.competitionAthletes).delete().eq('id', id);
  },

  async listDocumentEdits(matchId?: string): Promise<DocumentEdit[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.documentEdits).select('*');
    if (matchId) query = query.eq('match_id', matchId);
    const { data } = await query;
    return mapRows<DocumentEdit>(data ?? []);
  },

  async getDocumentEdit({ matchId, documentType }: DocumentEditKey): Promise<DocumentEdit | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from(SUPABASE_TABLES.documentEdits)
      .select('*')
      .eq('match_id', matchId)
      .eq('document_type', documentType)
      .maybeSingle();
    return mapRow<DocumentEdit>(data);
  },

  async saveDocumentEdit(input: Omit<DocumentEdit, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentEdit> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const existing = await this.getDocumentEdit({ matchId: input.matchId, documentType: input.documentType });
    const now = new Date().toISOString();
    const payload = toSnake({ ...input, updated_at: now });
    delete payload.created_at;
    const { data } = existing
      ? await supabase
          .from(SUPABASE_TABLES.documentEdits)
          .update(payload)
          .eq('id', existing.id)
          .select()
          .maybeSingle()
      : await supabase
          .from(SUPABASE_TABLES.documentEdits)
          .insert({ ...payload, created_at: now })
          .select()
          .single();
    return mapRow<DocumentEdit>(data) ?? (data as unknown as DocumentEdit);
  },

  async deleteDocumentEdit(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.documentEdits).delete().eq('id', id);
  },

  async getTemplateLayout(templateKind: string): Promise<TemplateLayout | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from(SUPABASE_TABLES.templateLayouts)
      .select('*')
      .eq('template_kind', templateKind)
      .maybeSingle();
    return mapRow<TemplateLayout>(data);
  },

  async saveTemplateLayout(input: Omit<TemplateLayout, 'id' | 'updatedAt'>): Promise<TemplateLayout> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const existing = await this.getTemplateLayout(input.templateKind);
    const now = new Date().toISOString();
    const payload = toSnake({ ...input, updated_at: now });
    delete payload.created_at;
    const { data } = existing
      ? await supabase
          .from(SUPABASE_TABLES.templateLayouts)
          .update(payload)
          .eq('id', existing.id)
          .select()
          .maybeSingle()
      : await supabase
          .from(SUPABASE_TABLES.templateLayouts)
          .insert({ ...payload, id: input.templateKind, created_at: now })
          .select()
          .single();
    return mapRow<TemplateLayout>(data) ?? (data as unknown as TemplateLayout);
  },

  /**
   * Catálogo Canônico de Modalidades Esportivas (BaseOS):
   * Modalidade no BaseOS não é uma tabela relacional no PostgreSQL, mas sim um tipo enumerado
   * ('indoor' | 'beach') e um catálogo estático de parametrizações oficiais (Quadra 6x6, Praia 2x2).
   * Retorna os presets de domínio diretamente, sem efetuar requisições REST ao banco.
   */
  async listModalities(): Promise<ModalityRecord[]> {
    return [...seedModalities];
  },

  async getModality(id: string): Promise<ModalityRecord | null> {
    return seedModalities.find((m) => m.id === id || m.type === id) ?? null;
  },

  async createModality(input: Omit<ModalityRecord, 'id'>): Promise<ModalityRecord> {
    const newMod: ModalityRecord = { id: `mod-custom-${Date.now()}`, ...input };
    return newMod;
  },

  async updateModality(id: string, updates: Partial<ModalityRecord>): Promise<ModalityRecord | null> {
    const existing = seedModalities.find((m) => m.id === id);
    if (!existing) return null;
    return { ...existing, ...updates };
  },

  async deleteModality(_id: string): Promise<void> {
    // No-op para catálogo de domínio
  },

  /**
   * @deprecated ATENÇÃO DE GOVERNANÇA (Fase 8.5):
   * A entidade `public.persons` não existe no banco de dados relacional (PostgreSQL).
   * Retornar `[]` de forma silenciosa previne crash imediato em chamadas de leitura legadas
   * (ex: PeoplePage, fallback em documentEditorService/scoresheetService), mas pode produzir
   * relatórios e súmulas silenciosamente incompletas caso a equipe não possua elenco oficial cadastrado.
   * Nos fluxos oficiais do BaseOS, use exclusivamente `listCompetitionAthletes` ou `getMatchRosters`.
   * Marcado para expurgo definitivo ou bloqueio formal nas Fases 8.6/8.7.
   */
  async listPersons(): Promise<PersonRecord[]> {
    return [];
  },

  /**
   * @deprecated Entidade `public.persons` inexistente no banco relacional. Retorna null.
   */
  async getPerson(_id: string): Promise<PersonRecord | null> {
    return null;
  },

  async createPerson(_input: Omit<PersonRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonRecord> {
    throw new Error(
      'A API "createPerson" é legada e foi descontinuada na Fase 8.3. A entidade "public.persons" não existe no banco de dados. Utilize o modelo Team, CompetitionTeam ou Profiles.'
    );
  },

  async updatePerson(_id: string, _updates: Partial<PersonRecord>): Promise<PersonRecord | null> {
    throw new Error(
      'A API "updatePerson" é legada e foi descontinuada na Fase 8.3. A entidade "public.persons" não existe no banco de dados. Utilize o modelo Team, CompetitionTeam ou Profiles.'
    );
  },

  async deletePerson(_id: string): Promise<void> {
    throw new Error(
      'A API "deletePerson" é legada e foi descontinuada na Fase 8.3. A entidade "public.persons" não existe no banco de dados. Utilize o modelo Team, CompetitionTeam ou Profiles.'
    );
  },

  async listAuditLogs(filters?: { competitionId?: string; entityType?: string; entityId?: string }): Promise<MatchAuditEntry[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.auditLogs).select('*');
    if (filters?.competitionId) {
      query = query.eq('competition_id', filters.competitionId);
    }
    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }
    const { data } = await query.order('timestamp', { ascending: false }).limit(500);
    return mapRows<MatchAuditEntry>(data ?? []);
  },

  async addAuditLog(entry: Omit<MatchAuditEntry, 'id' | 'timestamp'> & { id?: string }): Promise<MatchAuditEntry> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const id = entry.id || generateId('audit');
    const now = new Date().toISOString();
    const { data } = await supabase.from(SUPABASE_TABLES.auditLogs).insert(toSnake({ ...entry, id, timestamp: now })).select().single();
    return mapRow<MatchAuditEntry>(data) ?? (data as unknown as MatchAuditEntry);
  },

  // ============================================================================
  // Competition Format Runtime: Stages, Rounds e MatchSlots
  // ============================================================================

  // Stages
  async listStages(competitionId: string): Promise<StageRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionStages)
      .select('*')
      .eq('competition_id', competitionId)
      .order('stage_order', { ascending: true });
    if (error) throw new Error(`Falha ao listar estágios: ${error.message}`);
    return mapRows<StageRecord>(data ?? []);
  },

  async getStage(id: string): Promise<StageRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionStages)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar estágio: ${error.message}`);
    return mapRow<StageRecord>(data);
  },

  async getStageByLogicalId(competitionId: string, stageId: string): Promise<StageRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionStages)
      .select('*')
      .eq('competition_id', competitionId)
      .eq('stage_id', stageId)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar estágio por ID lógico: ${error.message}`);
    return mapRow<StageRecord>(data);
  },

  async createStage(stage: Omit<StageRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: StageRuntimeStatus }): Promise<StageRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const recordId = stage.id || generateId('stage');
    const payload = {
      ...stage,
      id: recordId,
      status: stage.status || 'pending',
      isLocked: stage.isLocked ?? false,
      metadata: stage.metadata ?? {},
    };
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionStages)
      .insert(toSnake(payload as Record<string, unknown>))
      .select()
      .single();
    if (error) throw new Error(`Falha ao criar estágio: ${error.message}`);
    return mapRow<StageRecord>(data) ?? (data as unknown as StageRecord);
  },

  async updateStage(id: string, updates: Partial<StageRecord>): Promise<StageRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const payload = toSnake({ ...updates, updatedAt: new Date().toISOString() });
    delete payload.id;
    delete payload.created_at;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionStages)
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Falha ao atualizar estágio: ${error.message}`);
    return mapRow<StageRecord>(data);
  },

  async deleteStage(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from(SUPABASE_TABLES.competitionStages)
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Falha ao excluir estágio: ${error.message}`);
  },

  // Rounds
  async listRounds(stageRowId: string): Promise<RoundRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionRounds)
      .select('*')
      .eq('stage_row_id', stageRowId)
      .order('round_order', { ascending: true });
    if (error) throw new Error(`Falha ao listar rodadas: ${error.message}`);
    return mapRows<RoundRecord>(data ?? []);
  },

  async getRound(id: string): Promise<RoundRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionRounds)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar rodada: ${error.message}`);
    return mapRow<RoundRecord>(data);
  },

  async getRoundByLogicalId(stageRowId: string, roundId: string): Promise<RoundRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionRounds)
      .select('*')
      .eq('stage_row_id', stageRowId)
      .eq('round_id', roundId)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar rodada por ID lógico: ${error.message}`);
    return mapRow<RoundRecord>(data);
  },

  async createRound(round: Omit<RoundRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: RoundRuntimeStatus }): Promise<RoundRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const recordId = round.id || generateId('round');
    const payload = {
      ...round,
      id: recordId,
      status: round.status || 'pending',
      slotsCount: round.slotsCount ?? 0,
    };
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionRounds)
      .insert(toSnake(payload as Record<string, unknown>))
      .select()
      .single();
    if (error) throw new Error(`Falha ao criar rodada: ${error.message}`);
    return mapRow<RoundRecord>(data) ?? (data as unknown as RoundRecord);
  },

  async updateRound(id: string, updates: Partial<RoundRecord>): Promise<RoundRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const payload = toSnake({ ...updates, updatedAt: new Date().toISOString() });
    delete payload.id;
    delete payload.created_at;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionRounds)
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Falha ao atualizar rodada: ${error.message}`);
    return mapRow<RoundRecord>(data);
  },

  async deleteRound(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from(SUPABASE_TABLES.competitionRounds)
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Falha ao excluir rodada: ${error.message}`);
  },

  // MatchSlots
  async listMatchSlots(competitionId: string): Promise<MatchSlotRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionMatchSlots)
      .select('*')
      .eq('competition_id', competitionId)
      .order('position', { ascending: true });
    if (error) throw new Error(`Falha ao listar match slots da competição: ${error.message}`);
    return mapRows<MatchSlotRecord>(data ?? []);
  },

  async listMatchSlotsByRound(roundRowId: string): Promise<MatchSlotRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionMatchSlots)
      .select('*')
      .eq('round_row_id', roundRowId)
      .order('position', { ascending: true });
    if (error) throw new Error(`Falha ao listar match slots da rodada: ${error.message}`);
    return mapRows<MatchSlotRecord>(data ?? []);
  },

  async getMatchSlot(id: string): Promise<MatchSlotRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionMatchSlots)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar match slot: ${error.message}`);
    return mapRow<MatchSlotRecord>(data);
  },

  async getMatchSlotByLogicalId(competitionId: string, slotId: string): Promise<MatchSlotRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionMatchSlots)
      .select('*')
      .eq('competition_id', competitionId)
      .eq('slot_id', slotId)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar match slot por ID lógico: ${error.message}`);
    return mapRow<MatchSlotRecord>(data);
  },

  async createMatchSlot(slot: Omit<MatchSlotRecord, 'id' | 'createdAt' | 'updatedAt' | 'participantAStatus' | 'participantBStatus' | 'resolvedTeamAId' | 'resolvedTeamBId' | 'matchId'> & { id?: string; participantAStatus?: SlotParticipantStatus; participantBStatus?: SlotParticipantStatus; resolvedTeamAId?: string | null; resolvedTeamBId?: string | null; matchId?: string | null }): Promise<MatchSlotRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');

    validateParticipantReference(slot.participantAReference);
    validateParticipantReference(slot.participantBReference);
    if (slot.resolvedTeamAId && isArtificialTeamId(slot.resolvedTeamAId)) {
      throw new Error(`resolvedTeamAId não pode ser equipe artificial/TBD: ${slot.resolvedTeamAId}`);
    }
    if (slot.resolvedTeamBId && isArtificialTeamId(slot.resolvedTeamBId)) {
      throw new Error(`resolvedTeamBId não pode ser equipe artificial/TBD: ${slot.resolvedTeamBId}`);
    }

    const recordId = slot.id || generateId('slot');
    const payload = {
      ...slot,
      id: recordId,
      resolvedTeamAId: slot.resolvedTeamAId ?? null,
      resolvedTeamBId: slot.resolvedTeamBId ?? null,
      matchId: slot.matchId ?? null,
      participantAStatus: slot.participantAStatus || (slot.participantAReference.type === 'bye' ? 'bye' : slot.resolvedTeamAId ? 'resolved' : 'unresolved'),
      participantBStatus: slot.participantBStatus || (slot.participantBReference.type === 'bye' ? 'bye' : slot.resolvedTeamBId ? 'resolved' : 'unresolved'),
      progressionRoute: slot.progressionRoute ?? null,
    };
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionMatchSlots)
      .insert(toSnake(payload as Record<string, unknown>))
      .select()
      .single();
    if (error) throw new Error(`Falha ao criar match slot: ${error.message}`);
    return mapRow<MatchSlotRecord>(data) ?? (data as unknown as MatchSlotRecord);
  },

  async updateMatchSlot(id: string, updates: Partial<MatchSlotRecord>): Promise<MatchSlotRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;

    if (updates.participantAReference) {
      validateParticipantReference(updates.participantAReference);
    }
    if (updates.participantBReference) {
      validateParticipantReference(updates.participantBReference);
    }
    if (updates.resolvedTeamAId && isArtificialTeamId(updates.resolvedTeamAId)) {
      throw new Error(`resolvedTeamAId não pode ser equipe artificial/TBD: ${updates.resolvedTeamAId}`);
    }
    if (updates.resolvedTeamBId && isArtificialTeamId(updates.resolvedTeamBId)) {
      throw new Error(`resolvedTeamBId não pode ser equipe artificial/TBD: ${updates.resolvedTeamBId}`);
    }

    const payload = toSnake({ ...updates, updatedAt: new Date().toISOString() });
    delete payload.id;
    delete payload.created_at;
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.competitionMatchSlots)
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Falha ao atualizar match slot: ${error.message}`);
    return mapRow<MatchSlotRecord>(data);
  },

  async deleteMatchSlot(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from(SUPABASE_TABLES.competitionMatchSlots)
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Falha ao excluir match slot: ${error.message}`);
  },

  async saveStageDrawAndSlots(params: SaveStageDrawAndSlotsParams): Promise<SaveStageDrawAndSlotsResult> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('saveStageDrawAndSlots: Supabase client não configurado');

    const { data, error } = await supabase.rpc('save_stage_draw_and_slots', {
      p_competition_id: params.competitionId,
      p_stage: params.stage,
      p_rounds: params.rounds,
      p_slots: params.slots,
    });

    if (error) {
      throw new Error(`Falha ao persistir sorteio de estágio via RPC: ${error.message}`);
    }
    const res = data as Record<string, unknown>;
    return {
      ok: Boolean(res?.ok),
      stageRowId: String(res?.stageRowId || res?.stage_row_id || ''),
      roundsCount: Number(res?.roundsCount || res?.rounds_count || 0),
      slotsCount: Number(res?.slotsCount || res?.slots_count || 0),
    };
  },

  async propagateSlotOutcome(params: PropagateSlotOutcomeParams): Promise<PropagateSlotOutcomeResult> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('propagateSlotOutcome: Supabase client não configurado');

    const { data, error } = await supabase.rpc('rpc_propagate_slot_outcome', {
      p_competition_id: params.competitionId,
      p_slot_id: params.slotId,
      p_winner_team_id: params.winnerTeamId ?? null,
      p_loser_team_id: params.loserTeamId ?? null,
      p_match_id: params.matchId ?? null,
    });

    if (error) {
      throw new Error(`Falha ao propagar resultado via RPC: ${error.message}`);
    }
    const res = data as Record<string, unknown>;
    return {
      ok: Boolean(res?.ok),
      sourceSlotId: String(res?.sourceSlotId || res?.source_slot_id || params.slotId),
      idempotent: Boolean(res?.idempotent),
      updatedCount: Number(res?.updatedCount || res?.updated_count || 0),
      message: res?.message ? String(res.message) : undefined,
    };
  },

  async materializeSlotMatch(params: MaterializeSlotMatchParams): Promise<MaterializeSlotMatchResult> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('materializeSlotMatch: Supabase client não configurado');

    const { data, error } = await supabase.rpc('rpc_materialize_slot_match', {
      p_competition_id: params.competitionId,
      p_slot_id: params.slotId,
      p_scheduled_time: params.scheduledTime || null,
      p_venue: params.venue || 'Arena Principal',
      p_court: params.court || null,
      p_phase: params.phase || null,
    });

    if (error) {
      throw new Error(`Falha ao materializar partida via RPC: ${error.message}`);
    }
    const res = data as Record<string, unknown>;
    return {
      ok: Boolean(res?.ok),
      matchId: String(res?.matchId || res?.match_id),
      alreadyMaterialized: Boolean(res?.alreadyMaterialized || res?.already_materialized),
      matchNumber: res?.matchNumber ? Number(res.matchNumber) : undefined,
      message: res?.message ? String(res.message) : undefined,
    };
  },

  async provisionTeamUser(input: ProvisionTeamUserInput): Promise<ProvisionTeamUserResult> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { ok: false, error: 'Supabase não configurado' };

    const { data, error } = await supabase.rpc('provision_team_user', {
      p_email: input.email.trim(),
      p_password: input.password.trim(),
      p_name: input.name.trim(),
      p_competition_team_id: input.competitionTeamId,
      p_phone: input.phone?.trim() || null,
    });

    if (error) {
      return { ok: false, error: `[${error.code}] ${error.message}` };
    }

    const res = data as { ok?: boolean; error?: string; user_id?: string } | null;
    if (!res?.ok) {
      return { ok: false, error: res?.error || 'Falha desconhecida ao provisionar conta de equipe' };
    }

    return { ok: true, userId: res.user_id };
  },
};

// ============================================================================
// Seleção do adaptador
// ============================================================================

export const dataAccess = isSupabaseConfigured() ? supabaseAdapter : localStorageAdapter;

export const dataProvider = isSupabaseConfigured() ? 'supabase' : 'localstorage';

export function clearAllCompetitionData(): void {
  writeCollection('competitions', []);
  writeCollection('matches', []);
  writeCollection('competition_teams', []);
  writeCollection('competition_athletes', []);
  writeCollection('draws', []);
  writeCollection('audit_logs', []);
  writeCollection('competition_stages', []);
  writeCollection('competition_rounds', []);
  writeCollection('competition_match_slots', []);
  localStorage.setItem(SEED_VERSION, 'clean');
}

export function clearEntireDatabase(): void {
  writeCollection('competitions', []);
  writeCollection('teams', []);
  writeCollection('referees', []);
  writeCollection('matches', []);
  writeCollection('competition_teams', []);
  writeCollection('competition_athletes', []);
  writeCollection('draws', []);
  writeCollection('audit_logs', []);
  writeCollection('persons', []);
  writeCollection('competition_stages', []);
  writeCollection('competition_rounds', []);
  writeCollection('competition_match_slots', []);
  writeCollection('organizations', []);
  writeCollection('athletes', []);
  writeCollection('user_memberships', []);
  localStorage.setItem(SEED_VERSION, 'clean');
}

export function resetLocalData(): void {
  Object.keys(localStorage)
    .filter(k => k.startsWith(STORAGE_PREFIX))
    .forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(SEED_VERSION);
  localStorage.removeItem('baseos.active_org_id');
  localStorage.removeItem('baseos.active_tenant_id');
  ensureSeeded();
}

export { generateToken };
