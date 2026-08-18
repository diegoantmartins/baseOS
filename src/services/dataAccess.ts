// Camada de acesso a dados do VolleyPro.
//
// Padrão "adapter": a mesma interface é implementada por
//  - LocalStorage (padrão, funciona sem backend) e
//  - Supabase/PostgreSQL (quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY existem).
//
// Toda a aplicação consome apenas este módulo, então a troca de backend
// é transparente.

import type { CompetitionRecord, MatchRecord, RefereeRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionAthleteInput, CompetitionTeam } from '@/types/registration';
import { SEED_VERSION, seedCompetitionAthletes, seedCompetitionTeams, seedCompetitions, seedMatches, seedReferees, seedTeams } from '@/data/seed';
import { getSupabaseClient, isSupabaseConfigured, SUPABASE_TABLES } from '@/lib/supabaseClient';
type CompetitionAthleteCreate = CompetitionAthleteInput & { competitionTeamId: string };

const STORAGE_PREFIX = 'voleipro.v1';

type CollectionName =
  | 'competitions'
  | 'teams'
  | 'referees'
  | 'matches'
  | 'competition_teams'
  | 'competition_athletes';

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

  async listTeams(): Promise<TeamRecord[]> {
    ensureSeeded();
    return readCollection<TeamRecord>('teams');
  },

  async listReferees(): Promise<RefereeRecord[]> {
    ensureSeeded();
    return readCollection<RefereeRecord>('referees');
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
    all[idx] = patch(all[idx], updates);
    writeCollection('matches', all);
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
    return all.find(ct => ct.accessToken === token) ?? null;
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
};

// ============================================================================
// Adaptador Supabase
// ============================================================================

const supabaseAdapter = {
  async listCompetitions(): Promise<CompetitionRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.competitions).select('*');
    return (data ?? []) as CompetitionRecord[];
  },

  async getCompetition(id: string): Promise<CompetitionRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitions).select('*').eq('id', id).maybeSingle();
    return (data as CompetitionRecord) ?? null;
  },

  async updateCompetition(id: string, updates: Partial<CompetitionRecord>): Promise<CompetitionRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitions).update(updates).eq('id', id).select().maybeSingle();
    return (data as CompetitionRecord) ?? null;
  },

  async listTeams(): Promise<TeamRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.teams).select('*');
    return (data ?? []) as TeamRecord[];
  },

  async listReferees(): Promise<RefereeRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase.from(SUPABASE_TABLES.referees).select('*');
    return (data ?? []) as RefereeRecord[];
  },

  async listMatches(competitionId?: string): Promise<MatchRecord[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.matches).select('*');
    if (competitionId) query = query.eq('competition_id', competitionId);
    const { data } = await query;
    return (data ?? []) as MatchRecord[];
  },

  async getMatch(id: string): Promise<MatchRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.matches).select('*').eq('id', id).maybeSingle();
    return (data as MatchRecord) ?? null;
  },

  async createMatch(match: Omit<MatchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MatchRecord> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.matches).insert(match).select().single();
    return data as MatchRecord;
  },

  async updateMatch(id: string, updates: Partial<MatchRecord>): Promise<MatchRecord | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.matches).update(updates).eq('id', id).select().maybeSingle();
    return (data as MatchRecord) ?? null;
  },

  async listCompetitionTeams(competitionId?: string): Promise<CompetitionTeam[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.competitionTeams).select('*');
    if (competitionId) query = query.eq('competition_id', competitionId);
    const { data } = await query;
    return (data ?? []) as CompetitionTeam[];
  },

  async getCompetitionTeamById(id: string): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitionTeams).select('*').eq('id', id).maybeSingle();
    return (data as CompetitionTeam) ?? null;
  },

  async getCompetitionTeamByToken(token: string): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitionTeams).select('*').eq('access_token', token).maybeSingle();
    return (data as CompetitionTeam) ?? null;
  },

  async createCompetitionTeam(input: Omit<CompetitionTeam, 'id' | 'accessToken' | 'createdAt' | 'updatedAt'>): Promise<CompetitionTeam> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase
      .from(SUPABASE_TABLES.competitionTeams)
      .insert({ ...input, access_token: generateToken() })
      .select()
      .single();
    return data as CompetitionTeam;
  },

  async updateCompetitionTeam(id: string, updates: Partial<CompetitionTeam>): Promise<CompetitionTeam | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitionTeams).update(updates).eq('id', id).select().maybeSingle();
    return (data as CompetitionTeam) ?? null;
  },

  async listCompetitionAthletes(competitionTeamId?: string): Promise<CompetitionAthlete[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from(SUPABASE_TABLES.competitionAthletes).select('*');
    if (competitionTeamId) query = query.eq('competition_team_id', competitionTeamId);
    const { data } = await query;
    return (data ?? []) as CompetitionAthlete[];
  },

  async createCompetitionAthlete(input: CompetitionAthleteCreate): Promise<CompetitionAthlete> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase não configurado');
    const { data } = await supabase.from(SUPABASE_TABLES.competitionAthletes).insert(input).select().single();
    return data as CompetitionAthlete;
  },

  async updateCompetitionAthlete(id: string, updates: Partial<CompetitionAthlete>): Promise<CompetitionAthlete | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from(SUPABASE_TABLES.competitionAthletes).update(updates).eq('id', id).select().maybeSingle();
    return (data as CompetitionAthlete) ?? null;
  },

  async deleteCompetitionAthlete(id: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from(SUPABASE_TABLES.competitionAthletes).delete().eq('id', id);
  },
};

// ============================================================================
// Seleção do adaptador
// ============================================================================

export const dataAccess = isSupabaseConfigured() ? supabaseAdapter : localStorageAdapter;

export const dataProvider = isSupabaseConfigured() ? 'supabase' : 'localstorage';

export function resetLocalData(): void {
  Object.keys(localStorage)
    .filter(k => k.startsWith(STORAGE_PREFIX))
    .forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(SEED_VERSION);
  ensureSeeded();
}

export { generateToken };
