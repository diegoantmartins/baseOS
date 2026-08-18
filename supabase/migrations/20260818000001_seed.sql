-- VolleyPro — dados de demonstração (espelham src/data/seed.ts).

insert into public.competitions (id, name, modality, format, player_format, set_format, gender_category, start_date, end_date, venue, status, default_deadline) values
  ('comp-1', 'Copa VolleyPro 2026 - Masculino', 'indoor', 'round-robin', '6x6', '5-sets', 'male', '2026-07-01', '2026-10-31', 'Ginásio Municipal', 'registration', now() + interval '6 days'),
  ('comp-2', 'Torneio Misto de Verão', 'beach', 'round-robin', '2x2', '3-sets', 'mixed', '2026-08-01', '2026-09-30', 'Arena de Praia', 'registration', now() + interval '5 days');

insert into public.teams (id, name, short_name, modality, coach_name) values
  ('team-1', 'Osasco Voleibol', 'OSA', 'indoor', 'Luizomar de Moura'),
  ('team-2', 'Minas Tênis Clube', 'MIN', 'indoor', 'Nicola Negro'),
  ('team-3', 'Praia Clube', 'PRA', 'indoor', 'Paulo Coco'),
  ('team-4', 'Flamengo', 'FLA', 'indoor', 'Bernardinho'),
  ('team-5', 'Sesi-SP', 'SES', 'indoor', 'Rubinho Guimarães'),
  ('team-6', 'Sada Cruzeiro', 'SAD', 'indoor', 'Filipe Ferraz'),
  ('team-7', 'Curitiba Vôlei', 'CUR', 'indoor', 'Paulo Barreto'),
  ('team-8', 'Barueri', 'BAR', 'indoor', 'Wagão');

insert into public.referees (id, name, level) values
  ('ref-1', 'Carlos Silva', 'Nacional'),
  ('ref-2', 'Ana Santos', 'Internacional'),
  ('ref-3', 'Pedro Oliveira', 'Nacional'),
  ('ref-4', 'Maria Costa', 'Estadual');

insert into public.competition_teams
  (id, competition_id, team_id, team_name, team_short_name, access_token, registration_deadline, is_locked, status, created_at, updated_at) values
  ('ct-1', 'comp-1', 'team-1', 'Osasco Voleibol', 'OSA', 'comp-1-osa-ct-1', now() - interval '1 day', true, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-2', 'comp-1', 'team-2', 'Minas Tênis Clube', 'MIN', 'comp-1-min-ct-2', now() + interval '6 days', false, 'in_progress', now() - interval '3 days', now() - interval '3 days'),
  ('ct-3', 'comp-1', 'team-3', 'Praia Clube', 'PRA', 'comp-1-pra-ct-3', now() + interval '6 days', false, 'invited', now() - interval '3 days', now() - interval '3 days'),
  ('ct-4', 'comp-1', 'team-4', 'Flamengo', 'FLA', 'comp-1-fla-ct-4', now() + interval '6 days', false, 'invited', now() - interval '3 days', now() - interval '3 days'),
  ('ct-5', 'comp-2', 'team-5', 'Sesi-SP', 'SES', 'comp-2-ses-ct-5', now() + interval '5 days', false, 'invited', now() - interval '3 days', now() - interval '3 days'),
  ('ct-6', 'comp-2', 'team-6', 'Sada Cruzeiro', 'SAD', 'comp-2-sad-ct-6', now() + interval '5 days', false, 'invited', now() - interval '3 days', now() - interval '3 days'),
  ('ct-7', 'comp-2', 'team-7', 'Curitiba Vôlei', 'CUR', 'comp-2-cur-ct-7', now() + interval '5 days', false, 'invited', now() - interval '3 days', now() - interval '3 days'),
  ('ct-8', 'comp-2', 'team-8', 'Barueri', 'BAR', 'comp-2-bar-ct-8', now() + interval '5 days', false, 'invited', now() - interval '3 days', now() - interval '3 days');

insert into public.competition_athletes
  (id, competition_team_id, name, jersey_number, position, is_captain, is_libero, gender, created_at, updated_at) values
  -- Elenco OSA (ct-1): 12 atletas, 1 capitã, 1 líbero
  ('ath-101', 'ct-1', 'Fernanda Silva', 1, 'Levantadora', true, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-102', 'ct-1', 'Amanda Costa', 4, 'Ponteira', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-103', 'ct-1', 'Juliana Santos', 7, 'Oposta', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-104', 'ct-1', 'Patricia Lima', 10, 'Central', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-105', 'ct-1', 'Carla Oliveira', 12, 'Ponteira', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-106', 'ct-1', 'Beatriz Mendes', 15, 'Líbero', false, true, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-107', 'ct-1', 'Gabriela Guimarães', 2, 'Ponteira', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-108', 'ct-1', 'Natália Pereira', 5, 'Central', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-109', 'ct-1', 'Rosamaria Montibeller', 8, 'Oposta', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-110', 'ct-1', 'Carol Gattaz', 11, 'Central', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-111', 'ct-1', 'Thaisa Menezes', 14, 'Levantadora', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-112', 'ct-1', 'Léia Silva', 17, 'Ponteira', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  -- Elenco MIN (ct-2): 9 atletas (em preenchimento)
  ('ath-201', 'ct-2', 'Ana Cristina Souza', 3, 'Ponteira', true, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-202', 'ct-2', 'Marina Souza', 6, 'Central', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-203', 'ct-2', 'Letícia Hage', 9, 'Oposta', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-204', 'ct-2', 'Kasiely Clemente', 16, 'Líbero', false, true, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-205', 'ct-2', 'Fernanda Silva', 18, 'Levantadora', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-206', 'ct-2', 'Amanda Costa', 19, 'Ponteira', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-207', 'ct-2', 'Juliana Santos', 20, 'Central', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-208', 'ct-2', 'Patricia Lima', 21, 'Ponteira', false, false, 'female', now() - interval '2 days', now() - interval '2 days'),
  ('ath-209', 'ct-2', 'Carla Oliveira', 22, 'Levantadora', false, false, 'female', now() - interval '2 days', now() - interval '2 days');

insert into public.matches
  (id, competition_id, round, match_number, team_a_id, team_b_id, team_a_name, team_b_name, team_a_short_name, team_b_short_name, venue, court, scheduled_time, status, sets, referees, winner_id, created_at, updated_at) values
  ('match-1', 'comp-1', 1, 1, 'team-1', 'team-2', 'Osasco Voleibol', 'Minas Tênis Clube', 'OSA', 'MIN', 'Ginásio Municipal', 'Quadra Principal', now() - interval '8 days', 'completed',
   '[{"setNumber":1,"scoreA":25,"scoreB":22},{"setNumber":2,"scoreA":23,"scoreB":25},{"setNumber":3,"scoreA":25,"scoreB":18},{"setNumber":4,"scoreA":25,"scoreB":20}]'::jsonb,
   '[{"role":"1º Árbitro","name":"Carlos Silva"},{"role":"2º Árbitro","name":"Ana Santos"},{"role":"Apontador","name":"Pedro Oliveira"}]'::jsonb,
   'team-1', now() - interval '9 days', now() - interval '9 days'),
  ('match-2', 'comp-1', 1, 2, 'team-3', 'team-4', 'Praia Clube', 'Flamengo', 'PRA', 'FLA', 'Ginásio Municipal', 'Quadra Principal', now() - interval '8 days', 'completed',
   '[{"setNumber":1,"scoreA":22,"scoreB":25},{"setNumber":2,"scoreA":25,"scoreB":21},{"setNumber":3,"scoreA":25,"scoreB":19},{"setNumber":4,"scoreA":21,"scoreB":25},{"setNumber":5,"scoreA":15,"scoreB":12}]'::jsonb,
   '[{"role":"1º Árbitro","name":"Carlos Silva"},{"role":"2º Árbitro","name":"Ana Santos"},{"role":"Apontador","name":"Pedro Oliveira"}]'::jsonb,
   'team-3', now() - interval '9 days', now() - interval '9 days'),
  ('match-3', 'comp-1', 1, 3, 'team-1', 'team-3', 'Osasco Voleibol', 'Praia Clube', 'OSA', 'PRA', 'Ginásio Municipal', 'Quadra Principal', now() - interval '7 days', 'completed',
   '[{"setNumber":1,"scoreA":25,"scoreB":20},{"setNumber":2,"scoreA":25,"scoreB":17},{"setNumber":3,"scoreA":25,"scoreB":23}]'::jsonb,
   '[{"role":"1º Árbitro","name":"Carlos Silva"},{"role":"2º Árbitro","name":"Ana Santos"},{"role":"Apontador","name":"Pedro Oliveira"}]'::jsonb,
   'team-1', now() - interval '9 days', now() - interval '9 days'),
  ('match-4', 'comp-1', 1, 4, 'team-2', 'team-4', 'Minas Tênis Clube', 'Flamengo', 'MIN', 'FLA', 'Ginásio Municipal', 'Quadra Principal', now() - interval '7 days', 'completed',
   '[{"setNumber":1,"scoreA":25,"scoreB":23},{"setNumber":2,"scoreA":22,"scoreB":25},{"setNumber":3,"scoreA":20,"scoreB":25},{"setNumber":4,"scoreA":24,"scoreB":26}]'::jsonb,
   '[{"role":"1º Árbitro","name":"Carlos Silva"},{"role":"2º Árbitro","name":"Ana Santos"},{"role":"Apontador","name":"Pedro Oliveira"}]'::jsonb,
   'team-4', now() - interval '9 days', now() - interval '9 days'),
  ('match-5', 'comp-1', 1, 5, 'team-1', 'team-4', 'Osasco Voleibol', 'Flamengo', 'OSA', 'FLA', 'Ginásio Municipal', 'Quadra Principal', now() - interval '6 days', 'completed',
   '[{"setNumber":1,"scoreA":25,"scoreB":21},{"setNumber":2,"scoreA":25,"scoreB":19},{"setNumber":3,"scoreA":25,"scoreB":22}]'::jsonb,
   '[{"role":"1º Árbitro","name":"Carlos Silva"},{"role":"2º Árbitro","name":"Ana Santos"},{"role":"Apontador","name":"Pedro Oliveira"}]'::jsonb,
   'team-1', now() - interval '9 days', now() - interval '9 days'),
  ('match-6', 'comp-1', 1, 6, 'team-2', 'team-3', 'Minas Tênis Clube', 'Praia Clube', 'MIN', 'PRA', 'Ginásio Municipal', 'Quadra Principal', now() - interval '6 days', 'completed',
   '[{"setNumber":1,"scoreA":25,"scoreB":21},{"setNumber":2,"scoreA":20,"scoreB":25},{"setNumber":3,"scoreA":25,"scoreB":19},{"setNumber":4,"scoreA":25,"scoreB":23}]'::jsonb,
   '[{"role":"1º Árbitro","name":"Carlos Silva"},{"role":"2º Árbitro","name":"Ana Santos"},{"role":"Apontador","name":"Pedro Oliveira"}]'::jsonb,
   'team-2', now() - interval '9 days', now() - interval '9 days'),
  ('match-7', 'comp-1', 2, 7, 'team-1', 'team-2', 'Osasco Voleibol', 'Minas Tênis Clube', 'OSA', 'MIN', 'Ginásio Municipal', 'Quadra Principal', now() + interval '2 days', 'scheduled', '[]'::jsonb,
   '[{"role":"1º Árbitro","name":"Carlos Silva"},{"role":"2º Árbitro","name":"Ana Santos"},{"role":"Apontador","name":"Pedro Oliveira"}]'::jsonb,
   null, now() - interval '9 days', now() - interval '9 days');
