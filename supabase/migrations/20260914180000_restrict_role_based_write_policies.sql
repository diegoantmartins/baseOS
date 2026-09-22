-- BaseOS — Fase 9.9: Restrição de Policies RLS por Role
--
-- Objetivo: Substituir as policies genéricas do schema inicial que permitiam
-- escrita administrativa para qualquer usuário autenticado nas tabelas:
--   competitions, teams, referees, matches
--
-- Contexto:
--   migration 20260818000000_initial_schema.sql criou policies permissivas:
--     competitions_auth_write  → FOR ALL TO authenticated USING (true)
--     teams_auth_write         → FOR ALL TO authenticated USING (true)
--     referees_auth_write      → FOR ALL TO authenticated USING (true)
--     matches_auth_write       → FOR ALL TO authenticated USING (true)
--
--   migration 20260905000003_rls_portal_security.sql já corrigiu:
--     competition_teams, competition_athletes, profiles
--
--   Esta migration NÃO altera as correções anteriores.
--
-- Autorização resultante:
--   competitions:  CRUD para admin/organizer | leitura pública (existente)
--   teams:         CRUD para admin/organizer | leitura pública (existente)
--   referees:      CRUD para admin/organizer | leitura pública (existente)
--   matches:       CRUD para admin/organizer | score/finalize para referee |
--                  score para scorer | leitura pública (existente)
--
-- Nota sobre scorer e viewer no enum:
--   O enum public.user_role foi criado com ('organizer', 'referee', 'team').
--   'admin' foi adicionado em 20260819000004 e 20260905000007.
--   'scorer' e 'viewer' existem no TypeScript mas NÃO no enum PostgreSQL.
--   Esta migration adiciona os valores ausentes ao enum para manter consistência.
--
-- Segurança:
--   - Policies de leitura pública (SELECT using(true)) são intencionais para
--     dados públicos de competição (resultados, súmulas, classificação).
--   - Escrita administrativa fica restrita a admin/organizer via profiles.role.
--   - referee/scorer podem atualizar somente campos de pontuação em matches.
--   - Um trigger protege campos administrativos de matches de alteração
--     por referee/scorer (defense in depth).

-- ============================================================================
-- 1. SINCRONIZAR ENUM user_role COM VALORES DO TYPESCRIPT
-- ============================================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'scorer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'viewer';

-- ============================================================================
-- 2. HELPER: Verifica se o usuário autenticado tem role admin ou organizer
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_organizer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'organizer')
  );
$$;

-- ============================================================================
-- 3. COMPETITIONS — Substituir policy genérica
-- ============================================================================

DROP POLICY IF EXISTS "competitions_auth_write" ON public.competitions;
DROP POLICY IF EXISTS "competitions_admin_organizer_all" ON public.competitions;

-- Somente admin/organizer podem criar, editar ou excluir competições.
-- Leitura pública permanece via "competitions_public_read" (schema inicial).
CREATE POLICY "competitions_admin_organizer_all" ON public.competitions
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ============================================================================
-- 4. TEAMS — Substituir policy genérica
-- ============================================================================

DROP POLICY IF EXISTS "teams_auth_write" ON public.teams;
DROP POLICY IF EXISTS "teams_admin_organizer_all" ON public.teams;

-- Somente admin/organizer podem criar, editar ou excluir equipes.
-- Nota: leitura pública permanece via "teams_public_read" (schema inicial).
-- role='team' NÃO tem acesso de escrita na tabela teams.
-- A gestão do elenco ocorre exclusivamente via competition_athletes
-- (já protegida pela migration 20260905000003).
CREATE POLICY "teams_admin_organizer_all" ON public.teams
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ============================================================================
-- 5. REFEREES — Substituir policy genérica
-- ============================================================================

DROP POLICY IF EXISTS "referees_auth_write" ON public.referees;
DROP POLICY IF EXISTS "referees_admin_organizer_all" ON public.referees;

-- Somente admin/organizer podem criar, editar ou excluir árbitros.
-- role='referee' NÃO necessita atualizar seu próprio cadastro via PostgREST
-- (não há fluxo que exija isso no código — verificado na auditoria).
-- Leitura pública permanece via "referees_public_read" (schema inicial).
CREATE POLICY "referees_admin_organizer_all" ON public.referees
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ============================================================================
-- 6. MATCHES — Substituir policy genérica + permissão restrita referee/scorer
-- ============================================================================

DROP POLICY IF EXISTS "matches_auth_write" ON public.matches;
DROP POLICY IF EXISTS "matches_admin_organizer_all" ON public.matches;
DROP POLICY IF EXISTS "matches_referee_scorer_update" ON public.matches;

-- 6a. CRUD administrativo para admin/organizer (criação, edição estrutural, exclusão)
CREATE POLICY "matches_admin_organizer_all" ON public.matches
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- 6b. referee/scorer: UPDATE restrito para operações de pontuação e súmula.
--     O trigger trg_protect_match_admin_fields (criado abaixo) garante
--     que campos administrativos não possam ser alterados mesmo com esta policy.
CREATE POLICY "matches_referee_scorer_update" ON public.matches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('referee', 'scorer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('referee', 'scorer')
    )
  );

-- ============================================================================
-- 7. TRIGGER: Proteção de campos administrativos de matches contra referee/scorer
--    Defense in depth: mesmo que a policy permita UPDATE, campos estruturais
--    como competition_id, team_a_id, team_b_id, venue, scheduled_time, round,
--    match_number não podem ser alterados por referee/scorer.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_protect_match_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
BEGIN
  -- Identifica a role do usuário que está executando o UPDATE
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  -- admin e organizer podem alterar qualquer campo
  IF v_caller_role IN ('admin', 'organizer') THEN
    RETURN NEW;
  END IF;

  -- Para referee/scorer: proteger campos administrativos estruturais
  IF v_caller_role IN ('referee', 'scorer') THEN
    IF NEW.competition_id IS DISTINCT FROM OLD.competition_id THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar competition_id de partidas.';
    END IF;
    IF NEW.team_a_id IS DISTINCT FROM OLD.team_a_id THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar team_a_id de partidas.';
    END IF;
    IF NEW.team_b_id IS DISTINCT FROM OLD.team_b_id THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar team_b_id de partidas.';
    END IF;
    IF NEW.team_a_name IS DISTINCT FROM OLD.team_a_name THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar team_a_name de partidas.';
    END IF;
    IF NEW.team_b_name IS DISTINCT FROM OLD.team_b_name THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar team_b_name de partidas.';
    END IF;
    IF NEW.team_a_short_name IS DISTINCT FROM OLD.team_a_short_name THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar team_a_short_name de partidas.';
    END IF;
    IF NEW.team_b_short_name IS DISTINCT FROM OLD.team_b_short_name THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar team_b_short_name de partidas.';
    END IF;
    IF NEW.venue IS DISTINCT FROM OLD.venue THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar venue de partidas.';
    END IF;
    IF NEW.court IS DISTINCT FROM OLD.court THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar court de partidas.';
    END IF;
    IF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar scheduled_time de partidas.';
    END IF;
    IF NEW.round IS DISTINCT FROM OLD.round THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar round de partidas.';
    END IF;
    IF NEW.match_number IS DISTINCT FROM OLD.match_number THEN
      RAISE EXCEPTION 'Acesso negado: referee/scorer não podem alterar match_number de partidas.';
    END IF;
    -- Campos permitidos para atualização: status, sets, winner_id, observations, referees, updated_at
    RETURN NEW;
  END IF;

  -- Qualquer outro role (team, viewer) não pode alterar matches
  -- (coberto pela ausência de policy de UPDATE para esses roles)
  RAISE EXCEPTION 'Acesso negado: role % não possui permissão para alterar partidas.', v_caller_role;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_match_admin_fields ON public.matches;
CREATE TRIGGER trg_protect_match_admin_fields
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_match_admin_fields();

-- ============================================================================
-- 8. VENUES — Substituir policy genérica
-- ============================================================================

DROP POLICY IF EXISTS "venues_auth_write" ON public.venues;
DROP POLICY IF EXISTS "venues_admin_organizer_all" ON public.venues;

-- Somente admin/organizer podem criar, editar ou excluir locais.
-- Leitura pública permanece via "venues_public_read".
CREATE POLICY "venues_admin_organizer_all" ON public.venues
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ============================================================================
-- 9. DRAWS — Substituir policy genérica
-- ============================================================================

DROP POLICY IF EXISTS "draws_auth_write" ON public.draws;
DROP POLICY IF EXISTS "draws_admin_organizer_all" ON public.draws;

-- Somente admin/organizer podem criar, editar ou excluir sorteios de grupos.
-- Leitura pública permanece via "draws_public_read".
CREATE POLICY "draws_admin_organizer_all" ON public.draws
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ============================================================================
-- 10. APP_SETTINGS — Substituir policy genérica
-- ============================================================================

DROP POLICY IF EXISTS "app_settings authenticated update" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_admin_organizer_update" ON public.app_settings;

-- Somente admin/organizer podem alterar as configurações do sistema.
-- Leitura pública permanece via "app_settings public read".
CREATE POLICY "app_settings_admin_organizer_update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ============================================================================
-- 11. HARDENING DE PROVISION_TEAM_USER: Bloquear chamadores anônimos
-- ============================================================================

-- Revogar permissão de execução de público e anônimo
REVOKE EXECUTE ON FUNCTION public.provision_team_user(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_team_user(text, text, text, text, text) TO authenticated, service_role;

-- Atualizar função para rejeitar chamadores anônimos explicitamente
CREATE OR REPLACE FUNCTION public.provision_team_user(
  p_email text,
  p_password text,
  p_name text,
  p_competition_team_id text,
  p_phone text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_caller_role public.user_role;
  v_user_id uuid;
  v_norm_email text;
  v_team_exists boolean;
BEGIN
  -- 1. Verificação de autorização do chamador
  -- Bloquear chamadores anônimos
  IF auth.role() = 'anon' OR (auth.jwt() IS NOT NULL AND auth.uid() IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Acesso negado. Usuários anônimos não podem provisionar contas de equipes.');
  END IF;

  -- Se chamado por usuário autenticado via JWT, exigir role organizer ou admin
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role NOT IN ('organizer', 'admin') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada. Apenas organizadores ou administradores podem provisionar contas de equipes.');
    END IF;
  END IF;

  -- 2. Validações de parâmetros
  v_norm_email := lower(trim(p_email));
  IF v_norm_email IS NULL OR v_norm_email = '' OR position('@' in v_norm_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'E-mail inválido para o responsável da equipe.');
  END IF;

  IF p_password IS NULL OR length(trim(p_password)) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A senha deve conter no mínimo 6 caracteres.');
  END IF;

  IF p_competition_team_id IS NULL OR trim(p_competition_team_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Identificador de inscrição da equipe (competition_team_id) obrigatório.');
  END IF;

  -- 3. Validar se a inscrição da equipe existe
  SELECT EXISTS (
    SELECT 1 FROM public.competition_teams WHERE id = p_competition_team_id
  ) INTO v_team_exists;

  IF NOT v_team_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inscrição de equipe não encontrada no sistema.');
  END IF;

  -- 4. Verificar se o usuário já existe em auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_norm_email LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Criar novo usuário no GoTrue
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      created_at,
      updated_at,
      raw_user_meta_data,
      raw_app_meta_data,
      aud,
      role
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_norm_email,
      crypt(trim(p_password), gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      now(),
      now(),
      jsonb_build_object(
        'name', trim(p_name),
        'role', 'team',
        'competition_team_id', p_competition_team_id,
        'phone', p_phone
      ),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      'authenticated',
      'authenticated'
    );

    -- Criar identidade correspondente para compatibilidade com GoTrue
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_norm_email),
      'email',
      v_user_id::text,
      null,
      now(),
      now()
    );
  ELSE
    -- Atualizar senha e metadados de usuário existente
    UPDATE auth.users
    SET encrypted_password = crypt(trim(p_password), gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now(),
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
          'name', trim(p_name),
          'role', 'team',
          'competition_team_id', p_competition_team_id,
          'phone', p_phone
        )
    WHERE id = v_user_id;

    -- Garantir identidade se não existir
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_norm_email),
        'email',
        v_user_id::text,
        null,
        now(),
        now()
      );
    END IF;
  END IF;

  -- 5. Garantir sincronização e vínculo em public.profiles
  INSERT INTO public.profiles (id, email, name, role, competition_team_id)
  VALUES (v_user_id, v_norm_email, trim(p_name), 'team', p_competition_team_id)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = 'team',
      competition_team_id = EXCLUDED.competition_team_id,
      updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'email', v_norm_email,
    'role', 'team',
    'competition_team_id', p_competition_team_id
  );
END;
$$;

-- ============================================================================
-- 12. VERIFICAÇÃO DE SEGURANÇA FINAL
-- ============================================================================
-- As seguintes policies NÃO devem mais existir após esta migration:
--   competitions_auth_write
--   teams_auth_write
--   referees_auth_write
--   matches_auth_write
--   venues_auth_write
--   draws_auth_write
--   app_settings authenticated update
--
-- As seguintes policies PERMANECEM intencionais (leitura pública):
--   competitions_public_read    → SELECT using(true) — dados públicos de competição
--   teams_public_read           → SELECT using(true) — dados públicos de equipes
--   referees_public_read        → SELECT using(true) — dados públicos de árbitros
--   matches_public_read         → SELECT using(true) — dados públicos de súmulas
--   venues_public_read          → SELECT using(true) — dados públicos de locais
--   draws_public_read           → SELECT using(true) — dados públicos de sorteio
--   app_settings public read    → SELECT using(true) — dados públicos de configurações
--   competition_teams_public_read
--   competition_athletes_public_read
--   profiles_public_read
