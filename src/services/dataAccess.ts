// Camada de acesso a dados do VolleyPro.
//
// Padrão "adapter": a mesma interface é implementada por
//  - LocalStorage (padrão, funciona sem backend) e
//  - Supabase/PostgreSQL (quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY existem).
//
// Toda a aplicação consome apenas este módulo, então a troca de backend
// é transparente.

import type { CompetitionRecord, MatchAuditEntry, MatchRecord, ModalityRecord, PersonRecord, RefereeRecord, SettingsRecord, TeamRecord, VenueRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionAthleteInput, CompetitionTeam } from '@/types/registration';
import type { DrawRecord, DrawResult } from '@/types/draw';
import type { DocumentEdit, DocumentEditKey, TemplateLayout } from '@/types/documentEdit';
import { SEED_VERSION, seedCompetitionAthletes, seedCompetitionTeams, seedCompetitions, seedDraws, seedMatches, seedModalities, seedPersons, seedReferees, seedTeams, seedVenues } from '@/data/seed';
import { getSupabaseClient, isSupabaseConfigured, SUPABASE_TABLES } from '@/lib/supabaseClient';
import { notificationService } from '@/services/notificationService';
type CompetitionAthleteCreate = CompetitionAthleteInput & { competitionTeamId: string };

const STORAGE_PREFIX = 'voleipro.v1';

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
  | 'audit_logs';

function storageKey(collection: CollectionName): string {
  return `${STORAGE_PREFIX}.${collection}`;
}

function readCollection<T>(collection: CollectionName): T[] {
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
  if (localStorage.getItem(SEED_VERSION)) return;
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

// ============================================================================
// Adaptador LocalStorage
// ============================================================================

const localStorageAdapter = {
  async listCompetitions(): Promise<CompetitionRecord[]> {
    ensureSeeded();
    return readCollection<CompetitionRecord>('competitions');
  },

  async getCompetition(id: string): Promise<CompetitionRecord | null> {
    const all = await this.listCompetitions();
    return all.find(c => c.id === id) ?? null;
  },

  async updateCompetition(id: string, updates: Partial<CompetitionRecord>): Promise<CompetitionRecord | null> {
    const all = readCollection<CompetitionRecord>('competitions');
    const idx = all.findIndex(c => c.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    writeCollection('competitions', all);
    return all[idx];
  },

  async createCompetition(input: Omit<CompetitionRecord, 'id'>): Promise<CompetitionRecord> {
    const record: CompetitionRecord = { ...input, id: generateId('comp') };
    const all = readCollection<CompetitionRecord>('competitions');
    all.push(record);
    writeCollection('competitions', all);
    return record;
  },

  async deleteCompetition(id: string): Promise<void> {
    writeCollection('competitions', readCollection<CompetitionRecord>('competitions').filter(c => c.id !== id));
  },

  async listTeams(): Promise<TeamRecord[]> {
    ensureSeeded();
    return readCollection<TeamRecord>('teams');
  },

  async createTeam(input: Omit<TeamRecord, 'id'>): Promise<TeamRecord> {
    const record: TeamRecord = { ...input, id: generateId('team') };
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
    return readCollection<VenueRecord>('venues');
  },

  async createVenue(input: Omit<VenueRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VenueRecord> {
    const record: VenueRecord = {
      ...input,
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
    return competitionId ? all.filter(m => m.competitionId === competitionId) : all;
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

  async createCompetitionAthlete(input: CompetitionAthleteCreate): Promise<CompetitionAthlete> {
    const record: CompetitionAthlete = {
      ...input,
      id: generateId('ath'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = readCollection<CompetitionAthlete>('competition_athletes');
    all.push(record);
    writeCollection('competition_athletes', all);
    return record;
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
    return all.find(m => m.id === id) ?? null;
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

  async createPerson(input: Omit<PersonRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonRecord> {
    const now = new Date().toISOString();
    const record: PersonRecord = { ...input, id: generateId('per'), createdAt: now, updatedAt: now };
    const all = readCollection<PersonRecord>('persons');
    all.push(record);
    writeCollection('persons', all);
    return record;
  },

  async updatePerson(id: string, updates: Partial<PersonRecord>): Promise<PersonRecord | null> {
    const all = readCollection<PersonRecord>('persons');
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    writeCollection('persons', all);
    return all[idx];
  },

  async deletePerson(id: string): Promise<void> {
    writeCollection('persons', readCollection<PersonRecord>('persons').filter(p => p.id !== id));
  },

  async listAuditLogs(): Promise<MatchAuditEntry[]> {
    ensureSeeded();
    return readCollection<MatchAuditEntry>('audit_logs');
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

const supabaseAdapter = {
  async listCompetitions(): Promise<CompetitionRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.competitions).select('*');
    return mapRows<CompetitionRecord>(data ?? []);
  },

  async getCompetition(id: string): Promise<CompetitionRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitions).select('*').eq('id', id).maybeSingle();
    return mapRow<CompetitionRecord>(data);
  },

  async updateCompetition(id: string, updates: Partial<CompetitionRecord>): Promise<CompetitionRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitions).update(toSnake(updates)).eq('id', id).select().maybeSingle();
    return mapRow<CompetitionRecord>(data);
  },

  async createCompetition(input: Omit<CompetitionRecord, 'id'>): Promise<CompetitionRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.competitions).insert(toSnake(input)).select().single();
    return mapRow<CompetitionRecord>(data) ?? (data as unknown as CompetitionRecord);
  },

  async deleteCompetition(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.competitions).delete().eq('id', id);
  },

  async listTeams(): Promise<TeamRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.teams).select('*');
    return mapRows<TeamRecord>(data ?? []);
  },

  async createTeam(input: Omit<TeamRecord, 'id'>): Promise<TeamRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.teams).insert(toSnake(input)).select().single();
    return mapRow<TeamRecord>(data) ?? (data as unknown as TeamRecord);
  },

  async updateTeam(id: string, updates: Partial<TeamRecord>): Promise<TeamRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.teams).update(toSnake(updates)).eq('id', id).select().maybeSingle();
    return mapRow<TeamRecord>(data);
  },

  async deleteTeam(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.teams).delete().eq('id', id);
  },

  async listReferees(): Promise<RefereeRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.referees).select('*');
    return mapRows<RefereeRecord>(data ?? []);
  },

  async createReferee(input: Omit<RefereeRecord, 'id'>): Promise<RefereeRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.referees).insert(toSnake(input)).select().single();
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
    const { data } = await supabase.from(SUPABASE_TABLES.venues).select('*');
    return mapRows<VenueRecord>(data ?? []);
  },

  async createVenue(input: Omit<VenueRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VenueRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.venues).insert(toSnake(input)).select().single();
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
    if (competitionId) query = query.eq('competition_id', competitionId);
    const { data } = await query;
    return mapRows<MatchRecord>(data ?? []);
  },

  async getMatch(id: string): Promise<MatchRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.matches).select('*').eq('id', id).maybeSingle();
    return mapRow<MatchRecord>(data);
  },

  async createMatch(match: Omit<MatchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MatchRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.matches).insert(toSnake(match)).select().single();
    return mapRow<MatchRecord>(data) ?? (data as unknown as MatchRecord);
  },

  async updateMatch(id: string, updates: Partial<MatchRecord>): Promise<MatchRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.matches).update(toSnake(updates)).eq('id', id).select().maybeSingle();
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
    const payload = toSnake({ ...result, id: existing?.id ?? undefined });
    const { data } = existing
      ? await supabase.from(SUPABASE_TABLES.draws).update({ ...payload, updated_at: now }).eq('id', existing.id).select().maybeSingle()
      : await supabase.from(SUPABASE_TABLES.draws).insert({ ...payload, created_at: now, updated_at: now }).select().single();
    return mapRow<DrawRecord>(data) ?? (data as unknown as DrawRecord);
  },

  async listCompetitionTeams(competitionId?: string): Promise<CompetitionTeam[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.competitionTeams).select('*');
    if (competitionId) query = query.eq('competition_id', competitionId);
    const { data } = await query;
    return mapRows<CompetitionTeam>(data ?? []);
  },

  async getCompetitionTeamById(id: string): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitionTeams).select('*').eq('id', id).maybeSingle();
    return mapRow<CompetitionTeam>(data);
  },

  async getCompetitionTeamByToken(token: string): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitionTeams).select('*').eq('access_token', token).maybeSingle();
    return mapRow<CompetitionTeam>(data);
  },

  async createCompetitionTeam(input: Omit<CompetitionTeam, 'id' | 'accessToken' | 'createdAt' | 'updatedAt'>): Promise<CompetitionTeam> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase
      .from(SUPABASE_TABLES.competitionTeams)
      .insert({ ...toSnake(input), access_token: generateToken() })
      .select()
      .single();
    return mapRow<CompetitionTeam>(data) ?? (data as unknown as CompetitionTeam);
  },

  async updateCompetitionTeam(id: string, updates: Partial<CompetitionTeam>): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitionTeams).update(toSnake(updates)).eq('id', id).select().maybeSingle();
    return mapRow<CompetitionTeam>(data);
  },

  async listCompetitionAthletes(competitionTeamId?: string): Promise<CompetitionAthlete[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.competitionAthletes).select('*');
    if (competitionTeamId) query = query.eq('competition_team_id', competitionTeamId);
    const { data } = await query;
    return mapRows<CompetitionAthlete>(data ?? []);
  },

  async createCompetitionAthlete(input: CompetitionAthleteCreate): Promise<CompetitionAthlete> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.competitionAthletes).insert(toSnake(input)).select().single();
    return mapRow<CompetitionAthlete>(data) ?? (data as unknown as CompetitionAthlete);
  },

  async updateCompetitionAthlete(id: string, updates: Partial<CompetitionAthlete>): Promise<CompetitionAthlete | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitionAthletes).update(toSnake(updates)).eq('id', id).select().maybeSingle();
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

  async listModalities(): Promise<ModalityRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.modalities).select('*');
    return mapRows<ModalityRecord>(data ?? []);
  },

  async getModality(id: string): Promise<ModalityRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.modalities).select('*').eq('id', id).maybeSingle();
    return mapRow<ModalityRecord>(data);
  },

  async createModality(input: Omit<ModalityRecord, 'id'>): Promise<ModalityRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.modalities).insert(toSnake(input)).select().single();
    return mapRow<ModalityRecord>(data) ?? (data as unknown as ModalityRecord);
  },

  async updateModality(id: string, updates: Partial<ModalityRecord>): Promise<ModalityRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.modalities).update(toSnake(updates)).eq('id', id).select().maybeSingle();
    return mapRow<ModalityRecord>(data);
  },

  async deleteModality(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.modalities).delete().eq('id', id);
  },

  async listPersons(): Promise<PersonRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.persons).select('*');
    return mapRows<PersonRecord>(data ?? []);
  },

  async getPerson(id: string): Promise<PersonRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.persons).select('*').eq('id', id).maybeSingle();
    return mapRow<PersonRecord>(data);
  },

  async createPerson(input: Omit<PersonRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const now = new Date().toISOString();
    const { data } = await supabase.from(SUPABASE_TABLES.persons).insert(toSnake({ ...input, created_at: now, updated_at: now })).select().single();
    return mapRow<PersonRecord>(data) ?? (data as unknown as PersonRecord);
  },

  async updatePerson(id: string, updates: Partial<PersonRecord>): Promise<PersonRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.persons).update(toSnake({ ...updates, updated_at: new Date().toISOString() })).eq('id', id).select().maybeSingle();
    return mapRow<PersonRecord>(data);
  },

  async deletePerson(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.persons).delete().eq('id', id);
  },

  async listAuditLogs(): Promise<MatchAuditEntry[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.auditLogs).select('*').order('timestamp', { ascending: false }).limit(500);
    return mapRows<MatchAuditEntry>(data ?? []);
  },

  async addAuditLog(entry: Omit<MatchAuditEntry, 'id' | 'timestamp'>): Promise<MatchAuditEntry> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const now = new Date().toISOString();
    const { data } = await supabase.from(SUPABASE_TABLES.auditLogs).insert(toSnake({ ...entry, timestamp: now })).select().single();
    return mapRow<MatchAuditEntry>(data) ?? (data as unknown as MatchAuditEntry);
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
  localStorage.setItem(SEED_VERSION, 'clean');
}

export function resetLocalData(): void {
  Object.keys(localStorage)
    .filter(k => k.startsWith(STORAGE_PREFIX))
    .forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(SEED_VERSION);
  ensureSeeded();
}

export { generateToken };
