-- ============================================================================
-- matches.lineups: escalação inicial persistida pela súmula digital
-- ============================================================================

alter table public.matches add column if not exists lineups jsonb;

-- ============================================================================
-- app_settings: configurações da aplicação (linha única)
-- ============================================================================

create table public.app_settings (
  id text primary key default 'main',
  org_name text not null default 'VolleyPro',
  contact_email text not null default '',
  phone text not null default '',
  address text not null default '',
  notifications jsonb not null default '{"matchScheduled":true,"rosterSubmitted":true,"matchResult":true,"marketing":false}',
  rules jsonb not null default '{"pointsPerWin":3,"pointsPerLoss":0,"pointsPerSetWin":0,"pointsPerSetLoss":0,"tiebreakPoints":15}',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  language text not null default 'pt-BR' check (language in ('pt-BR', 'en')),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values ('main') on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "app_settings public read" on public.app_settings
  for select using (true);

create policy "app_settings authenticated update" on public.app_settings
  for update to authenticated using (true) with check (true);
