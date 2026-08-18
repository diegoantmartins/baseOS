-- VolleyPro — schema inicial (Supabase/PostgreSQL).
-- Tabelas espelham as entidades de src/types (LocalStorage ↔ Supabase).

-- ============================================================================
-- Enums
-- ============================================================================

create type public.user_role as enum ('organizer', 'referee', 'team');
create type public.competition_status as enum ('draft', 'registration', 'in-progress', 'completed', 'cancelled');
create type public.modality as enum ('indoor', 'beach');
create type public.gender_category as enum ('male', 'female', 'mixed');
create type public.registration_status as enum ('invited', 'in_progress', 'submitted', 'approved', 'rejected');
create type public.match_status as enum ('scheduled', 'warmup', 'in-progress', 'timeout', 'set-break', 'completed', 'postponed', 'cancelled');

-- ============================================================================
-- competitions
-- ============================================================================

create table public.competitions (
  id text primary key,
  name text not null,
  modality public.modality not null default 'indoor',
  format text not null default 'round-robin',
  player_format text not null default '6x6',
  set_format text not null default '5-sets',
  gender_category public.gender_category not null default 'mixed',
  default_deadline timestamptz,
  group_name text,
  start_date date,
  end_date date,
  venue text,
  status public.competition_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- teams
-- ============================================================================

create table public.teams (
  id text primary key,
  name text not null,
  short_name text not null,
  modality public.modality not null default 'indoor',
  coach_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- referees
-- ============================================================================

create table public.referees (
  id text primary key,
  name text not null,
  level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- competition_teams (inscrições: convite + elenco)
-- ============================================================================

create table public.competition_teams (
  id text primary key,
  competition_id text not null references public.competitions (id) on delete cascade,
  team_id text not null references public.teams (id) on delete cascade,
  team_name text not null,
  team_short_name text not null,
  access_token text not null unique,
  registration_deadline timestamptz not null,
  is_locked boolean not null default false,
  status public.registration_status not null default 'invited',
  custom_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, team_id)
);

-- ============================================================================
-- competition_athletes (atletas do elenco inscrito)
-- ============================================================================

create table public.competition_athletes (
  id text primary key,
  competition_team_id text not null references public.competition_teams (id) on delete cascade,
  name text not null,
  jersey_number integer check (jersey_number is null or (jersey_number between 1 and 99)),
  position text not null,
  document_number text,
  birth_date date,
  is_captain boolean not null default false,
  is_libero boolean not null default false,
  gender text not null default 'female' check (gender in ('male', 'female')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Camisa única por equipe apenas quando informada (opcional até o dia da competição)
create unique index uq_competition_athletes_jersey
  on public.competition_athletes (competition_team_id, jersey_number)
  where jersey_number is not null;

-- ============================================================================
-- profiles (vincula auth.users a um perfil de aplicação)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role public.user_role not null default 'organizer',
  competition_team_id text references public.competition_teams (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cria o perfil automaticamente no cadastro de usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- matches (súmula: sets e árbitros como JSONB — mesmo shape do LocalStorage)
-- ============================================================================

create table public.matches (
  id text primary key,
  competition_id text not null references public.competitions (id) on delete cascade,
  round integer not null default 1,
  match_number integer not null,
  team_a_id text not null references public.teams (id),
  team_b_id text not null references public.teams (id),
  team_a_name text not null,
  team_b_name text not null,
  team_a_short_name text not null,
  team_b_short_name text not null,
  venue text not null default '',
  court text,
  scheduled_time timestamptz not null,
  status public.match_status not null default 'scheduled',
  sets jsonb not null default '[]',
  referees jsonb not null default '[]',
  observations text,
  winner_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, match_number)
);

-- ============================================================================
-- Índices
-- ============================================================================

create index idx_competition_teams_competition on public.competition_teams (competition_id);
create index idx_competition_teams_team on public.competition_teams (team_id);
create index idx_competition_athletes_team on public.competition_athletes (competition_team_id);
create index idx_matches_competition on public.matches (competition_id);
create index idx_matches_scheduled on public.matches (scheduled_time);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.referees enable row level security;
alter table public.competition_teams enable row level security;
alter table public.competition_athletes enable row level security;
alter table public.matches enable row level security;

-- Leitura pública (súmulas e inscrições são dados públicos de competição)
create policy "profiles_public_read" on public.profiles for select using (true);
create policy "competitions_public_read" on public.competitions for select using (true);
create policy "teams_public_read" on public.teams for select using (true);
create policy "referees_public_read" on public.referees for select using (true);
create policy "competition_teams_public_read" on public.competition_teams for select using (true);
create policy "competition_athletes_public_read" on public.competition_athletes for select using (true);
create policy "matches_public_read" on public.matches for select using (true);

-- Escrita: autenticados (organizador/árbitro/equipe no MVP)
create policy "competitions_auth_write" on public.competitions for all
  to authenticated using (true) with check (true);
create policy "teams_auth_write" on public.teams for all
  to authenticated using (true) with check (true);
create policy "referees_auth_write" on public.referees for all
  to authenticated using (true) with check (true);
create policy "matches_auth_write" on public.matches for all
  to authenticated using (true) with check (true);
create policy "competition_teams_auth_write" on public.competition_teams for all
  to authenticated using (true) with check (true);
create policy "competition_athletes_auth_write" on public.competition_athletes for all
  to authenticated using (true) with check (true);
create policy "profiles_self_update" on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================================
-- Inscrição por token sem login: RPC segura (SECURITY DEFINER)
-- Cria atleta no elenco apenas se o token da inscrição for válido
-- e o prazo não tiver encerrado.
-- ============================================================================

create or replace function public.register_athlete(
  p_token text,
  p_name text,
  p_position text,
  p_jersey_number integer,
  p_is_captain boolean default false,
  p_is_libero boolean default false,
  p_gender text default 'female',
  p_document_number text default null,
  p_birth_date date default null
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_team public.competition_teams;
  v_athlete public.competition_athletes;
begin
  select * into v_team
  from public.competition_teams
  where access_token = p_token
  limit 1;

  if v_team is null then
    return jsonb_build_object('ok', false, 'error', 'Convite de equipe não encontrado.');
  end if;

  if v_team.is_locked or v_team.registration_deadline < now() then
    return jsonb_build_object('ok', false, 'error', 'Prazo de inscrição encerrado.');
  end if;

  if p_jersey_number is not null and exists (
    select 1 from public.competition_athletes
    where competition_team_id = v_team.id and jersey_number = p_jersey_number
  ) then
    return jsonb_build_object('ok', false, 'error', format('Já existe atleta com a camisa %s nesta equipe.', p_jersey_number));
  end if;

  if (select count(*) from public.competition_athletes where competition_team_id = v_team.id) >= 14 then
    return jsonb_build_object('ok', false, 'error', 'Limite máximo de 14 atletas por equipe atingido.');
  end if;

  insert into public.competition_athletes (
    id, competition_team_id, name, jersey_number, position,
    document_number, birth_date, is_captain, is_libero, gender
  ) values (
    gen_random_uuid()::text, v_team.id, p_name, p_jersey_number, p_position,
    p_document_number, p_birth_date, p_is_captain, p_is_libero, p_gender
  ) returning * into v_athlete;

  if v_team.status = 'invited' then
    update public.competition_teams set status = 'in_progress' where id = v_team.id;
  end if;

  return jsonb_build_object('ok', true, 'athlete', to_jsonb(v_athlete));
end;
$$;

grant execute on function public.register_athlete to anon, authenticated;
