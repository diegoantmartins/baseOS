-- VolleyPro — seed v2: base zerada + Copa Toledo 2026 (8 equipes, 2 grupos de 4,
-- sem partidas; sorteio já definido). Substitui os dados demo antigos (comp-1/2).

-- ============================================================================
-- Limpeza dos dados de demonstração anteriores
-- ============================================================================

delete from public.draws where competition_id in ('comp-1', 'comp-2');
delete from public.matches where competition_id in ('comp-1', 'comp-2');
delete from public.competition_athletes where competition_team_id in (select id from public.competition_teams where competition_id in ('comp-1', 'comp-2'));
delete from public.competition_teams where competition_id in ('comp-1', 'comp-2');
delete from public.competitions where id in ('comp-1', 'comp-2');

-- ============================================================================
-- Competição: Copa Toledo 2026 - Masculino (3 sets, 2 grupos de 4)
-- ============================================================================

insert into public.competitions
  (id, name, modality, format, player_format, set_format, gender_category, start_date, end_date, venue, status, created_at, updated_at) values
  ('comp-toledo-2026', 'Copa Toledo 2026 - Masculino', 'indoor', 'round-robin', '6x6', '3-sets', 'male',
   (now() + interval '3 days')::date, (now() + interval '24 days')::date, 'Ginásio Municipal', 'in-progress',
   now() - interval '3 days', now() - interval '3 days')
on conflict (id) do nothing;

-- ============================================================================
-- Inscrições das 8 equipes (todas com elenco enviado)
-- ============================================================================

insert into public.competition_teams
  (id, competition_id, team_id, team_name, team_short_name, access_token, registration_deadline, is_locked, status, created_at, updated_at) values
  ('ct-1', 'comp-toledo-2026', 'team-1', 'Osasco Voleibol', 'OSA', 'comp-toledo-2026-osa-ct-1', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-2', 'comp-toledo-2026', 'team-2', 'Minas Tênis Clube', 'MIN', 'comp-toledo-2026-min-ct-2', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-3', 'comp-toledo-2026', 'team-3', 'Praia Clube', 'PRA', 'comp-toledo-2026-pra-ct-3', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-4', 'comp-toledo-2026', 'team-4', 'Flamengo', 'FLA', 'comp-toledo-2026-fla-ct-4', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-5', 'comp-toledo-2026', 'team-5', 'Sesi-SP', 'SES', 'comp-toledo-2026-ses-ct-5', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-6', 'comp-toledo-2026', 'team-6', 'Sada Cruzeiro', 'SAD', 'comp-toledo-2026-sad-ct-6', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-7', 'comp-toledo-2026', 'team-7', 'Curitiba Vôlei', 'CUR', 'comp-toledo-2026-cur-ct-7', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-8', 'comp-toledo-2026', 'team-8', 'Barueri', 'BAR', 'comp-toledo-2026-bar-ct-8', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days')
on conflict (id) do nothing;

-- ============================================================================
-- Elencos completos (12 atletas, 1 capitão, 1 líbero, camisas 1-12)
-- ============================================================================

with roster(name, ct, offset) as (
  values
    ('ath-1', 'ct-1', 0), ('ath-2', 'ct-2', 4), ('ath-3', 'ct-3', 8), ('ath-4', 'ct-4', 12),
    ('ath-5', 'ct-5', 16), ('ath-6', 'ct-6', 20), ('ath-7', 'ct-7', 2), ('ath-8', 'ct-8', 6)
)
insert into public.competition_athletes
  (id, competition_team_id, name, jersey_number, position, is_captain, is_libero, gender, document_number, created_at, updated_at)
select
  r.name || '-' || lpad(n::text, 2, '0'),
  r.ct,
  (array['Lucas Silva','Gabriel Santos','Rafael Oliveira','Matheus Costa','João Pedro Alves','Thiago Almeida','Bruno Rodrigues','Felipe Cardoso','André Pereira','Diego Martins','Vitor Hugo','Caio Rocha','Rodrigo Nunes','Paulo Henrique','Marcos Vinícius','Eduardo Lima','Gustavo Moraes','Igor Freitas','Leonardo Barbosa','Renan Ribeiro','Fábio Teixeira','Daniel Souza','Hugo Carvalho','Alex Barreto'])[1 + ((r.offset + n - 1) % 24)],
  n,
  (array['Levantador','Ponteira','Central','Oposta','Ponteira','Líbero','Ponteira','Central','Oposta','Levantador','Central','Ponteira'])[n],
  n = 1,
  n = 6,
  'male',
  lpad((10000000000 + (r.offset * 12 + n - 1) * 137)::text, 11, '0') as document_number,
  now() - interval '2 days',
  now() - interval '2 days'
from roster r
cross join generate_series(1, 12) as n
on conflict (id) do nothing;

-- ============================================================================
-- Sorteio definido: 2 grupos de 4 (Grupo A: 1-4; Grupo B: 5-8) — sem jogos
-- ============================================================================

insert into public.draws (id, competition_id, config, groups, matches, created_at, updated_at) values
  ('draw-1', 'comp-toledo-2026',
   '{"groupsCount":2,"seedingMode":"seeded","seed":2026,"headSeeds":["team-1","team-5"]}',
   '[{"name":"Grupo A","teams":[{"teamId":"team-1","seed":1},{"teamId":"team-2","seed":2},{"teamId":"team-3","seed":3},{"teamId":"team-4","seed":4}]},{"name":"Grupo B","teams":[{"teamId":"team-5","seed":1},{"teamId":"team-6","seed":2},{"teamId":"team-7","seed":3},{"teamId":"team-8","seed":4}]}]',
   '[]',
   now() - interval '1 day', now() - interval '1 day')
on conflict (id) do nothing;