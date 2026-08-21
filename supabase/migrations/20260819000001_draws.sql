-- VolleyPro — módulo de sorteio: distribuição de equipes em grupos.

-- ============================================================================
-- draws (um sorteio por competição, persistido como JSONB)
-- ============================================================================

create table if not exists public.draws (
  id text primary key,
  competition_id text not null references public.competitions (id) on delete cascade,
  config jsonb not null default '{}',
  groups jsonb not null default '[]',
  matches jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_draws_competition on public.draws (competition_id);

alter table public.draws enable row level security;

create policy "draws_public_read" on public.draws for select using (true);
create policy "draws_auth_write" on public.draws for all
  to authenticated using (true) with check (true);
