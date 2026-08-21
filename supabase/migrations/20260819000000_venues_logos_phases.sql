-- VolleyPro — locais/quadras, logos de equipes e fases/grupos de partidas.

-- ============================================================================
-- venues (Ginásios/Locais com quadras)
-- ============================================================================

create table public.venues (
  id text primary key,
  name text not null,
  address text,
  courts jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.venues enable row level security;

create policy "venues_public_read" on public.venues for select using (true);
create policy "venues_auth_write" on public.venues for all
  to authenticated using (true) with check (true);

-- ============================================================================
-- teams.logo_url (escudo da equipe: data URI ou URL do storage)
-- ============================================================================

alter table public.teams add column if not exists logo_url text;

-- ============================================================================
-- matches.phase / matches.group_name (fase e grupo/chave da partida)
-- ============================================================================

alter table public.matches add column if not exists phase text;
alter table public.matches add column if not exists group_name text;

create index idx_matches_phase on public.matches (competition_id, phase);
create index idx_matches_group on public.matches (competition_id, group_name);

-- ============================================================================
-- Seed de locais de exemplo
-- ============================================================================

insert into public.venues (id, name, address, courts) values
  ('venue-1', 'Ginásio UNIPAR', 'Rua da Integração, s/n - Toledo/PR', '["Quadra 1", "Quadra 2"]'),
  ('venue-2', 'Ginásio Municipal', 'Centro Esportivo, Toledo/PR', '["Quadra Principal", "Quadra Auxiliar"]'),
  ('venue-3', 'Arena de Praia', 'Orla do Lago, Toledo/PR', '["Areia 1", "Areia 2"]')
on conflict (id) do nothing;