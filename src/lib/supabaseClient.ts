// Cliente Supabase com ativação opcional.
// Só cria o cliente real se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estiverem
// configurados. Sem configuração, a aplicação usa o adaptador LocalStorage
// (ver src/services/dataAccess.ts).

import type { SupabaseClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = (): boolean => {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || (typeof process !== 'undefined' && process.env) || {};
  const url = (env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const key = (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
  if (!url || !key) return false;
  if (
    url.includes('seu-projeto') ||
    url.includes('your-project') ||
    url.includes('example.com') ||
    key.includes('sua-anon-key') ||
    key.includes('your-anon-key')
  ) {
    return false;
  }
  return true;
};

let clientPromise: Promise<SupabaseClient | null> | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      return createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      );
    })();
  }
  return clientPromise;
}

export const SUPABASE_TABLES = {
  competitions: 'competitions',
  teams: 'teams',
  referees: 'referees',
  matches: 'matches',
  competitionTeams: 'competition_teams',
  competitionAthletes: 'competition_athletes',
  venues: 'venues',
  draws: 'draws',
  appSettings: 'app_settings',
  documentEdits: 'document_edits',
  templateLayouts: 'template_layouts',
  modalities: 'modalities',
  persons: 'persons',
  auditLogs: 'audit_logs',
  publicCompetitions: 'public_competitions',
  publicCompetitionTeams: 'public_competition_teams',
  competitionStages: 'competition_stages',
  competitionRounds: 'competition_rounds',
  competitionMatchSlots: 'competition_match_slots',
  userMemberships: 'user_memberships',
  athletes: 'athletes',
  organizations: 'organizations',
  organizationInvitations: 'organization_invitations',
} as const;
