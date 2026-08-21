-- VolleyPro — sincronização do seed com src/data/seed.ts:
-- logos das equipes, comp-1 com 6 equipes (Grupos A/B), elencos completos
-- de todas as equipes e grupos/fases nas partidas.

-- ============================================================================
-- logos das equipes (escudo SVG em data URI, como no seed.ts)
-- ============================================================================

update public.teams set logo_url = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2256%22%20fill%3D%22%231a5aa8%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-family%3D%22Arial%22%20font-size%3D%2234%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EOSA%3C%2Ftext%3E%3C%2Fsvg%3E' where id = 'team-1';
update public.teams set logo_url = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2256%22%20fill%3D%22%237a1f2b%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-family%3D%22Arial%22%20font-size%3D%2234%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EMIN%3C%2Ftext%3E%3C%2Fsvg%3E' where id = 'team-2';
update public.teams set logo_url = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2256%22%20fill%3D%22%23c8102e%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-family%3D%22Arial%22%20font-size%3D%2234%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EPRA%3C%2Ftext%3E%3C%2Fsvg%3E' where id = 'team-3';
update public.teams set logo_url = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2256%22%20fill%3D%22%238b1f2c%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-family%3D%22Arial%22%20font-size%3D%2234%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EFLA%3C%2Ftext%3E%3C%2Fsvg%3E' where id = 'team-4';
update public.teams set logo_url = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2256%22%20fill%3D%22%23e5383b%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-family%3D%22Arial%22%20font-size%3D%2234%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3ESES%3C%2Ftext%3E%3C%2Fsvg%3E' where id = 'team-5';
update public.teams set logo_url = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2256%22%20fill%3D%22%230066b3%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-family%3D%22Arial%22%20font-size%3D%2234%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3ESAD%3C%2Ftext%3E%3C%2Fsvg%3E' where id = 'team-6';
update public.teams set logo_url = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2256%22%20fill%3D%22%232d7d46%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-family%3D%22Arial%22%20font-size%3D%2234%22%20font-weight%3D%22bold%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3ECUR%3C%2Ftext%3E%3C%2Fsvg%3E' where id = 'team-7';
update public.teams set logo_url = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2256%22%20fill%3D%22%23f7a600%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-family%3D%22Arial%22%20font-size%3D%2234%22%20font-weight%3D%22bold%22%20fill%3D%22%23333%22%20text-anchor%3D%22middle%22%3EBAR%3C%2Ftext%3E%3C%2Fsvg%3E' where id = 'team-8';

-- ============================================================================
-- comp-1 com 6 equipes: Sesi (team-5) e Sada (team-6) entram no Masculino
-- ============================================================================

insert into public.competition_teams
  (id, competition_id, team_id, team_name, team_short_name, access_token, registration_deadline, is_locked, status, created_at, updated_at) values
  ('ct-9', 'comp-1', 'team-5', 'Sesi-SP', 'SES', 'comp-1-ses-ct-9', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days'),
  ('ct-10', 'comp-1', 'team-6', 'Sada Cruzeiro', 'SAD', 'comp-1-sad-ct-10', now() + interval '6 days', false, 'submitted', now() - interval '3 days', now() - interval '3 days')
on conflict (id) do nothing;

-- ============================================================================
-- Grupos/fases nas partidas existentes de comp-1 (Grupo A: 1-3; Grupo B: 4-6)
-- ============================================================================

update public.matches set phase = 'classificatória', group_name = 'Grupo A' where competition_id = 'comp-1' and team_a_id in ('team-1', 'team-2', 'team-3');
update public.matches set phase = 'classificatória', group_name = 'Grupo B' where competition_id = 'comp-1' and team_a_id in ('team-4', 'team-5', 'team-6');

-- ============================================================================
-- Elencos completos (12 atletas, 1 capitã(o), 1 líbero) das demais equipes
-- ============================================================================

insert into public.competition_athletes
  (id, competition_team_id, name, jersey_number, position, is_captain, is_libero, gender, document_number, created_at, updated_at) values
  ('ath-3-01', 'ct-3', 'Lucas Silva', 1, 'Levantador', true, false, 'male', '100.000.137-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-02', 'ct-3', 'Gabriel Santos', 2, 'Ponteira', false, false, 'male', '100.000.274-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-03', 'ct-3', 'Rafael Oliveira', 3, 'Central', false, false, 'male', '100.000.411-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-04', 'ct-3', 'Matheus Costa', 4, 'Oposta', false, false, 'male', '100.000.548-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-05', 'ct-3', 'João Pedro Alves', 5, 'Ponteira', false, false, 'male', '100.000.685-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-06', 'ct-3', 'Thiago Almeida', 6, 'Líbero', false, true, 'male', '100.000.822-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-07', 'ct-3', 'Bruno Rodrigues', 7, 'Ponteira', false, false, 'male', '100.000.959-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-08', 'ct-3', 'Felipe Cardoso', 8, 'Central', false, false, 'male', '100.001.096-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-09', 'ct-3', 'André Pereira', 9, 'Oposta', false, false, 'male', '100.001.233-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-10', 'ct-3', 'Diego Martins', 10, 'Levantador', false, false, 'male', '100.001.370-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-11', 'ct-3', 'Vitor Hugo', 11, 'Central', false, false, 'male', '100.001.507-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-3-12', 'ct-3', 'Caio Rocha', 12, 'Ponteira', false, false, 'male', '100.001.644-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-01', 'ct-4', 'Rodrigo Nunes', 1, 'Levantador', true, false, 'male', '100.001.781-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-02', 'ct-4', 'Paulo Henrique', 2, 'Ponteira', false, false, 'male', '100.001.918-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-03', 'ct-4', 'Marcos Vinícius', 3, 'Central', false, false, 'male', '100.002.055-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-04', 'ct-4', 'Eduardo Lima', 4, 'Oposta', false, false, 'male', '100.002.192-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-05', 'ct-4', 'Gustavo Moraes', 5, 'Ponteira', false, false, 'male', '100.002.329-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-06', 'ct-4', 'Igor Freitas', 6, 'Líbero', false, true, 'male', '100.002.466-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-07', 'ct-4', 'Leonardo Barbosa', 7, 'Ponteira', false, false, 'male', '100.002.603-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-08', 'ct-4', 'Renan Ribeiro', 8, 'Central', false, false, 'male', '100.002.740-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-09', 'ct-4', 'Fábio Teixeira', 9, 'Oposta', false, false, 'male', '100.002.877-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-10', 'ct-4', 'Daniel Souza', 10, 'Levantador', false, false, 'male', '100.003.014-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-11', 'ct-4', 'Hugo Carvalho', 11, 'Central', false, false, 'male', '100.003.151-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-4-12', 'ct-4', 'Alex Barreto', 12, 'Ponteira', false, false, 'male', '100.003.288-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-01', 'ct-9', 'Rodrigo Nunes', 1, 'Levantador', true, false, 'male', '100.003.425-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-02', 'ct-9', 'Paulo Henrique', 2, 'Ponteira', false, false, 'male', '100.003.562-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-03', 'ct-9', 'Marcos Vinícius', 3, 'Central', false, false, 'male', '100.003.699-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-04', 'ct-9', 'Eduardo Lima', 4, 'Oposta', false, false, 'male', '100.003.836-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-05', 'ct-9', 'Gustavo Moraes', 5, 'Ponteira', false, false, 'male', '100.003.973-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-06', 'ct-9', 'Igor Freitas', 6, 'Líbero', false, true, 'male', '100.004.110-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-07', 'ct-9', 'Leonardo Barbosa', 7, 'Ponteira', false, false, 'male', '100.004.247-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-08', 'ct-9', 'Renan Ribeiro', 8, 'Central', false, false, 'male', '100.004.384-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-09', 'ct-9', 'Fábio Teixeira', 9, 'Oposta', false, false, 'male', '100.004.521-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-10', 'ct-9', 'Daniel Souza', 10, 'Levantador', false, false, 'male', '100.004.658-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-11', 'ct-9', 'Hugo Carvalho', 11, 'Central', false, false, 'male', '100.004.795-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-9-12', 'ct-9', 'Alex Barreto', 12, 'Ponteira', false, false, 'male', '100.004.932-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-01', 'ct-10', 'Lucas Silva', 1, 'Levantador', true, false, 'male', '100.005.069-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-02', 'ct-10', 'Gabriel Santos', 2, 'Ponteira', false, false, 'male', '100.005.206-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-03', 'ct-10', 'Rafael Oliveira', 3, 'Central', false, false, 'male', '100.005.343-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-04', 'ct-10', 'Matheus Costa', 4, 'Oposta', false, false, 'male', '100.005.480-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-05', 'ct-10', 'João Pedro Alves', 5, 'Ponteira', false, false, 'male', '100.005.617-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-06', 'ct-10', 'Thiago Almeida', 6, 'Líbero', false, true, 'male', '100.005.754-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-07', 'ct-10', 'Bruno Rodrigues', 7, 'Ponteira', false, false, 'male', '100.005.891-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-08', 'ct-10', 'Felipe Cardoso', 8, 'Central', false, false, 'male', '100.006.028-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-09', 'ct-10', 'André Pereira', 9, 'Oposta', false, false, 'male', '100.006.165-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-10', 'ct-10', 'Diego Martins', 10, 'Levantador', false, false, 'male', '100.006.302-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-11', 'ct-10', 'Vitor Hugo', 11, 'Central', false, false, 'male', '100.006.439-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-10-12', 'ct-10', 'Caio Rocha', 12, 'Ponteira', false, false, 'male', '100.006.576-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-01', 'ct-5', 'Fernanda Silva', 1, 'Levantadora', true, false, 'female', '100.006.713-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-02', 'ct-5', 'Amanda Costa', 2, 'Ponteira', false, false, 'female', '100.006.850-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-03', 'ct-5', 'Juliana Santos', 3, 'Central', false, false, 'female', '100.006.987-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-04', 'ct-5', 'Patricia Lima', 4, 'Oposta', false, false, 'female', '100.007.124-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-05', 'ct-5', 'Carla Oliveira', 5, 'Ponteira', false, false, 'female', '100.007.261-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-06', 'ct-5', 'Beatriz Mendes', 6, 'Líbero', false, true, 'female', '100.007.398-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-07', 'ct-5', 'Gabriela Guimarães', 7, 'Ponteira', false, false, 'female', '100.007.535-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-08', 'ct-5', 'Natália Pereira', 8, 'Central', false, false, 'female', '100.007.672-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-09', 'ct-5', 'Rosamaria Montibeller', 9, 'Oposta', false, false, 'female', '100.007.809-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-10', 'ct-5', 'Carol Gattaz', 10, 'Levantadora', false, false, 'female', '100.007.946-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-11', 'ct-5', 'Thaisa Menezes', 11, 'Central', false, false, 'female', '100.008.083-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-5-12', 'ct-5', 'Léia Silva', 12, 'Ponteira', false, false, 'female', '100.008.220-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-01', 'ct-6', 'Ana Cristina Souza', 1, 'Levantadora', true, false, 'female', '100.008.357-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-02', 'ct-6', 'Marina Souza', 2, 'Ponteira', false, false, 'female', '100.008.494-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-03', 'ct-6', 'Letícia Hage', 3, 'Central', false, false, 'female', '100.008.631-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-04', 'ct-6', 'Kasiely Clemente', 4, 'Oposta', false, false, 'female', '100.008.768-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-05', 'ct-6', 'Ana Carolina Silva', 5, 'Ponteira', false, false, 'female', '100.008.905-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-06', 'ct-6', 'Bruna Honório', 6, 'Líbero', false, true, 'female', '100.009.042-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-07', 'ct-6', 'Camila Brait', 7, 'Ponteira', false, false, 'female', '100.009.179-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-08', 'ct-6', 'Dani Lins', 8, 'Central', false, false, 'female', '100.009.316-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-09', 'ct-6', 'Fabiana Claudino', 9, 'Oposta', false, false, 'female', '100.009.453-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-10', 'ct-6', 'Jaqueline Carvalho', 10, 'Levantadora', false, false, 'female', '100.009.590-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-11', 'ct-6', 'Paula Pequeno', 11, 'Central', false, false, 'female', '100.009.727-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-6-12', 'ct-6', 'Sheilla Castro', 12, 'Ponteira', false, false, 'female', '100.009.864-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-01', 'ct-7', 'Fernanda Silva', 1, 'Levantadora', true, false, 'female', '100.010.001-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-02', 'ct-7', 'Amanda Costa', 2, 'Ponteira', false, false, 'female', '100.010.138-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-03', 'ct-7', 'Juliana Santos', 3, 'Central', false, false, 'female', '100.010.275-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-04', 'ct-7', 'Patricia Lima', 4, 'Oposta', false, false, 'female', '100.010.412-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-05', 'ct-7', 'Carla Oliveira', 5, 'Ponteira', false, false, 'female', '100.010.549-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-06', 'ct-7', 'Beatriz Mendes', 6, 'Líbero', false, true, 'female', '100.010.686-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-07', 'ct-7', 'Gabriela Guimarães', 7, 'Ponteira', false, false, 'female', '100.010.823-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-08', 'ct-7', 'Natália Pereira', 8, 'Central', false, false, 'female', '100.010.960-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-09', 'ct-7', 'Rosamaria Montibeller', 9, 'Oposta', false, false, 'female', '100.011.097-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-10', 'ct-7', 'Carol Gattaz', 10, 'Levantadora', false, false, 'female', '100.011.234-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-11', 'ct-7', 'Thaisa Menezes', 11, 'Central', false, false, 'female', '100.011.371-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-7-12', 'ct-7', 'Léia Silva', 12, 'Ponteira', false, false, 'female', '100.011.508-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-01', 'ct-8', 'Ana Cristina Souza', 1, 'Levantadora', true, false, 'female', '100.011.645-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-02', 'ct-8', 'Marina Souza', 2, 'Ponteira', false, false, 'female', '100.011.782-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-03', 'ct-8', 'Letícia Hage', 3, 'Central', false, false, 'female', '100.011.919-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-04', 'ct-8', 'Kasiely Clemente', 4, 'Oposta', false, false, 'female', '100.012.056-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-05', 'ct-8', 'Ana Carolina Silva', 5, 'Ponteira', false, false, 'female', '100.012.193-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-06', 'ct-8', 'Bruna Honório', 6, 'Líbero', false, true, 'female', '100.012.330-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-07', 'ct-8', 'Camila Brait', 7, 'Ponteira', false, false, 'female', '100.012.467-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-08', 'ct-8', 'Dani Lins', 8, 'Central', false, false, 'female', '100.012.604-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-09', 'ct-8', 'Fabiana Claudino', 9, 'Oposta', false, false, 'female', '100.012.741-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-10', 'ct-8', 'Jaqueline Carvalho', 10, 'Levantadora', false, false, 'female', '100.012.878-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-11', 'ct-8', 'Paula Pequeno', 11, 'Central', false, false, 'female', '100.013.015-00', now() - interval '2 days', now() - interval '2 days'),
  ('ath-8-12', 'ct-8', 'Sheilla Castro', 12, 'Ponteira', false, false, 'female', '100.013.152-00', now() - interval '2 days', now() - interval '2 days')
on conflict (id) do nothing;
