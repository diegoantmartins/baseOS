// Cliente Supabase com ativação opcional.
// Só cria o cliente real se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estiverem
// configurados. Sem configuração, a aplicação usa o adaptador LocalStorage
// (ver src/services/dataAccess.ts).

import type { SupabaseClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url && key);
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
} as const;
