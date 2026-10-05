-- ============================================================================
-- BaseOS — Gate 2A.3: Hardening de Políticas RLS para Recursos Administrativos
-- ============================================================================
--
-- Data: 2026-09-28
-- Autor: QA Master + Arquiteto de Autenticação + DBA de Desenvolvimento
--
-- Contexto:
-- O diagnóstico do Gate 2A.2 identificou políticas permissivas herdadas do schema inicial:
--   - competitions_auth_write  → FOR ALL TO authenticated USING (true) WITH CHECK (true)
--   - matches_auth_write       → FOR ALL TO authenticated USING (true) WITH CHECK (true)
--   - teams_auth_write         → FOR ALL TO authenticated USING (true) WITH CHECK (true)
--   - venues_auth_write        → FOR ALL TO authenticated USING (true) WITH CHECK (true)
--   - referees_auth_write      → FOR ALL TO authenticated USING (true) WITH CHECK (true)
--   - draws_auth_write         → FOR ALL TO authenticated USING (true) WITH CHECK (true)
--
-- Consequência de segurança:
-- Usuários com role='team' (ou qualquer usuário autenticado) possuíam capacidade de escrita
-- direta em tabelas administrativas do sistema via Supabase / PostgREST.
--
-- Objetivo deste script:
-- 1. Preservar o enum user_role existente sem mutações ('admin', 'organizer', 'referee', 'team').
-- 2. Eliminar definitivamente as 6 policies permissivas *_auth_write.
-- 3. Restringir escrita administrativa nas 6 tabelas exclusivamente a perfis autorizados
--    (role IN ('admin', 'organizer')) através de public.is_admin_or_organizer().
-- 4. Preservar o acesso operacional legítimo do papel 'referee' na tabela matches (súmulas),
--    com validação de escala nominal e proteção contra alteração de dados administrativos.
-- 5. Preservar o acesso legítimo de gestão de inscrição e elenco da própria equipe
--    em competition_teams e competition_athletes.
-- 6. Preservar a leitura pública (SELECT) para visualização de campeonatos e jogos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CONTEXTO DO ENUM user_role (INALTERADO)
-- O enum em produção já possui ('admin', 'organizer', 'referee', 'team').
-- Não adicionamos novos valores ao enum no PostgreSQL para manter paridade estrita.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 2. HELPER CANÔNICO: is_admin_or_organizer()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_organizer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'organizer')
  );
$$;

COMMENT ON FUNCTION public.is_admin_or_organizer() IS
  'Retorna true se o usuário autenticado atual possui perfil admin ou organizer em public.profiles.';

-- ----------------------------------------------------------------------------
-- 3. TABELA: competitions
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "competitions_auth_write" ON public.competitions;
DROP POLICY IF EXISTS "competitions_admin_organizer_all" ON public.competitions;

CREATE POLICY "competitions_admin_organizer_all" ON public.competitions
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ----------------------------------------------------------------------------
-- 4. TABELA: teams (Cadastros globais de equipes)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "teams_auth_write" ON public.teams;
DROP POLICY IF EXISTS "teams_admin_organizer_all" ON public.teams;

CREATE POLICY "teams_admin_organizer_all" ON public.teams
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ----------------------------------------------------------------------------
-- 5. TABELA: venues (Locais e ginásios de competição)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "venues_auth_write" ON public.venues;
DROP POLICY IF EXISTS "venues_admin_organizer_all" ON public.venues;

CREATE POLICY "venues_admin_organizer_all" ON public.venues
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ----------------------------------------------------------------------------
-- 6. TABELA: referees (Árbitros e oficiais cadastrados)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "referees_auth_write" ON public.referees;
DROP POLICY IF EXISTS "referees_admin_organizer_all" ON public.referees;

CREATE POLICY "referees_admin_organizer_all" ON public.referees
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ----------------------------------------------------------------------------
-- 7. TABELA: draws (Sorteios e chaveamentos)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "draws_auth_write" ON public.draws;
DROP POLICY IF EXISTS "draws_admin_organizer_all" ON public.draws;

CREATE POLICY "draws_admin_organizer_all" ON public.draws
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ----------------------------------------------------------------------------
-- 8. TABELA: matches (Partidas e súmulas)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "matches_auth_write" ON public.matches;
DROP POLICY IF EXISTS "matches_admin_organizer_all" ON public.matches;
DROP POLICY IF EXISTS "matches_referee_scorer_update" ON public.matches;
DROP POLICY IF EXISTS "matches_operational_update" ON public.matches;
DROP POLICY IF EXISTS "matches_referee_update" ON public.matches;

-- 8a. Gestão administrativa plena para admin e organizer
CREATE POLICY "matches_admin_organizer_all" ON public.matches
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- 8b. Atualização operacional restrita para árbitros credenciados (pontuação e súmula)
--     Restrito a partidas em que o árbitro está designado na escala nominal (ou partidas com escala aberta)
CREATE POLICY "matches_referee_update" ON public.matches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'referee'
        AND (
          matches.referees IS NULL
          OR jsonb_typeof(matches.referees) <> 'array'
          OR jsonb_array_length(matches.referees) = 0
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(matches.referees) AS r
            WHERE lower(trim(COALESCE(r->>'name', ''))) IN (lower(trim(p.name)), lower(trim(p.email)))
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'referee'
        AND (
          matches.referees IS NULL
          OR jsonb_typeof(matches.referees) <> 'array'
          OR jsonb_array_length(matches.referees) = 0
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(matches.referees) AS r
            WHERE lower(trim(COALESCE(r->>'name', ''))) IN (lower(trim(p.name)), lower(trim(p.email)))
          )
        )
    )
  );

-- 8c. Trigger de defesa em profundidade: Protege campos administrativos de matches contra referee
CREATE OR REPLACE FUNCTION public.trg_protect_match_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_name text;
  v_caller_email text;
BEGIN
  SELECT role, lower(trim(name)), lower(trim(email))
  INTO v_caller_role, v_caller_name, v_caller_email
  FROM public.profiles
  WHERE id = auth.uid();

  -- Admin e Organizer possuem controle irrestrito
  IF v_caller_role IN ('admin', 'organizer') THEN
    RETURN NEW;
  END IF;

  -- Referee: validação estrita de campos administrativos e escala
  IF v_caller_role = 'referee' THEN
    -- Escalação de árbitros é somente leitura para referee
    IF NEW.referees IS DISTINCT FROM OLD.referees THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não possui permissão para alterar a equipe de arbitragem.';
    END IF;

    -- Proibir alteração de quaisquer colunas estruturais/administrativas
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar o ID de partidas.';
    END IF;
    IF NEW.competition_id IS DISTINCT FROM OLD.competition_id THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar competition_id de partidas.';
    END IF;
    IF NEW.team_a_id IS DISTINCT FROM OLD.team_a_id THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar team_a_id de partidas.';
    END IF;
    IF NEW.team_b_id IS DISTINCT FROM OLD.team_b_id THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar team_b_id de partidas.';
    END IF;
    IF NEW.team_a_name IS DISTINCT FROM OLD.team_a_name THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar team_a_name de partidas.';
    END IF;
    IF NEW.team_b_name IS DISTINCT FROM OLD.team_b_name THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar team_b_name de partidas.';
    END IF;
    IF NEW.team_a_short_name IS DISTINCT FROM OLD.team_a_short_name THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar team_a_short_name de partidas.';
    END IF;
    IF NEW.team_b_short_name IS DISTINCT FROM OLD.team_b_short_name THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar team_b_short_name de partidas.';
    END IF;
    IF NEW.venue IS DISTINCT FROM OLD.venue THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar venue de partidas.';
    END IF;
    IF NEW.court IS DISTINCT FROM OLD.court THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar court de partidas.';
    END IF;
    IF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar scheduled_time de partidas.';
    END IF;
    IF NEW.round IS DISTINCT FROM OLD.round THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar round de partidas.';
    END IF;
    IF NEW.match_number IS DISTINCT FROM OLD.match_number THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar match_number de partidas.';
    END IF;
    IF NEW.phase IS DISTINCT FROM OLD.phase THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar phase de partidas.';
    END IF;
    IF NEW.group_name IS DISTINCT FROM OLD.group_name THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar group_name de partidas.';
    END IF;
    IF NEW.slot_id IS DISTINCT FROM OLD.slot_id THEN
      RAISE EXCEPTION 'Acesso negado: árbitro não pode alterar slot_id de partidas.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar created_at de partidas.';
    END IF;

    RETURN NEW;
  END IF;

  -- Qualquer outro role é negado sumariamente
  RAISE EXCEPTION 'Acesso negado: perfil % não possui permissão para alterar partidas.', v_caller_role;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_match_admin_fields ON public.matches;
CREATE TRIGGER trg_protect_match_admin_fields
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_match_admin_fields();

-- ----------------------------------------------------------------------------
-- 9. TABELA: competition_teams (Inscrições por competição)
-- ----------------------------------------------------------------------------
-- Garante que admin e organizer tenham permissão total além da política existente de time
DROP POLICY IF EXISTS "competition_teams_admin_organizer_all" ON public.competition_teams;

CREATE POLICY "competition_teams_admin_organizer_all" ON public.competition_teams
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ----------------------------------------------------------------------------
-- 10. TABELA: competition_athletes (Atletas inscritos na equipe)
-- ----------------------------------------------------------------------------
-- Garante que admin e organizer tenham permissão total além da política existente de time
DROP POLICY IF EXISTS "competition_athletes_admin_organizer_all" ON public.competition_athletes;

CREATE POLICY "competition_athletes_admin_organizer_all" ON public.competition_athletes
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());
