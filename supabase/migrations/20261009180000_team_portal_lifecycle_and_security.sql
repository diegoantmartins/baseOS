BEGIN;

-- ============================================================================
-- BASEOS: CICLO DE VIDA DO PORTAL DA EQUIPE (EDIÇÃO, SALVAMENTO, DUPLICAÇÃO E EXCLUSÃO)
-- ============================================================================

-- 1. Refinamento da RPC de Atualização do Perfil da Equipe
CREATE OR REPLACE FUNCTION public.update_team_profile(
  p_team_id text,
  p_competition_team_id text default null,
  p_name text default null,
  p_short_name text default null,
  p_logo_url text default null,
  p_coach_name text default null,
  p_city text default null,
  p_state text default null
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_authorized boolean := false;
  v_rows_updated integer := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Operação exige autenticação.');
  END IF;

  -- Checa autorização: admin/organizer OU gestor ativo da equipe
  IF public.is_admin_or_organizer() THEN
    v_is_authorized := true;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.user_id = v_caller_id
        AND um.status = 'active'
        AND (
          um.team_id = p_team_id
          OR (p_competition_team_id IS NOT NULL AND um.competition_team_id = p_competition_team_id)
          OR EXISTS (
            SELECT 1 FROM public.competition_teams ct
            WHERE ct.id = um.competition_team_id AND ct.team_id = p_team_id
          )
        )
    ) THEN
      v_is_authorized := true;
    ELSIF EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.competition_teams ct ON ct.id = p.competition_team_id
      WHERE p.id = v_caller_id AND (ct.team_id = p_team_id OR p.competition_team_id = p_competition_team_id)
    ) THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada para editar esta equipe.');
  END IF;

  -- Atualiza na tabela teams
  UPDATE public.teams
  SET
    name = COALESCE(NULLIF(btrim(p_name), ''), name),
    short_name = COALESCE(NULLIF(btrim(p_short_name), ''), short_name),
    logo_url = p_logo_url,
    coach_name = p_coach_name,
    city = p_city,
    state = p_state,
    updated_at = now()
  WHERE id = p_team_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Equipe não encontrada para atualização.');
  END IF;

  -- Se fornecido competition_team_id, sincroniza o nome e sigla na inscrição da competição
  IF p_competition_team_id IS NOT NULL THEN
    UPDATE public.competition_teams
    SET
      team_name = COALESCE(NULLIF(btrim(p_name), ''), team_name),
      team_short_name = COALESCE(NULLIF(btrim(p_short_name), ''), team_short_name),
      updated_at = now()
    WHERE id = p_competition_team_id;
  ELSE
    -- Sincroniza em todas as inscrições vinculadas a esta equipe
    UPDATE public.competition_teams
    SET
      team_name = COALESCE(NULLIF(btrim(p_name), ''), team_name),
      team_short_name = COALESCE(NULLIF(btrim(p_short_name), ''), team_short_name),
      updated_at = now()
    WHERE team_id = p_team_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_team_profile(text, text, text, text, text, text, text, text) TO authenticated;

-- 2. RPC Segura de Duplicação de Equipe pelo Portal
CREATE OR REPLACE FUNCTION public.duplicate_team_from_portal(
  p_source_team_id text,
  p_competition_id text default null
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_authorized boolean := false;
  v_source public.teams%ROWTYPE;
  v_new_team_id text;
  v_new_name text;
  v_new_short text;
  v_new_ct_id text;
  v_new_token text;
  v_deadline timestamptz;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Operação exige autenticação.');
  END IF;

  -- Verifica autorização na equipe de origem
  IF public.is_admin_or_organizer() THEN
    v_is_authorized := true;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.user_id = v_caller_id
        AND um.status = 'active'
        AND (
          um.team_id = p_source_team_id
          OR EXISTS (
            SELECT 1 FROM public.competition_teams ct
            WHERE ct.id = um.competition_team_id AND ct.team_id = p_source_team_id
          )
        )
    ) THEN
      v_is_authorized := true;
    ELSIF EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.competition_teams ct ON ct.id = p.competition_team_id
      WHERE p.id = v_caller_id AND (ct.team_id = p_source_team_id OR p.competition_team_id = p_source_team_id)
    ) THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada para duplicar esta equipe.');
  END IF;

  SELECT * INTO v_source FROM public.teams WHERE id = p_source_team_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Equipe de origem não encontrada.');
  END IF;

  v_new_team_id := 'team-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
  v_new_name := substr(v_source.name || ' (Cópia)', 1, 60);
  v_new_short := CASE
    WHEN length(v_source.short_name) <= 3 THEN v_source.short_name || '2'
    ELSE substr(v_source.short_name, 1, 3) || '2'
  END;

  INSERT INTO public.teams (
    id, organization_id, name, short_name, modality, gender_category,
    coach_name, city, logo_url, created_at, updated_at
  ) VALUES (
    v_new_team_id, v_source.organization_id, v_new_name, v_new_short, v_source.modality,
    v_source.gender_category, v_source.coach_name, v_source.city, v_source.logo_url,
    now(), now()
  );

  -- Se indicada competição, cria nova inscrição independente
  IF p_competition_id IS NOT NULL THEN
    v_new_ct_id := 'ct-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
    v_new_token := substr(md5(random()::text || clock_timestamp()::text), 1, 16);

    SELECT COALESCE(default_deadline, now() + interval '30 days')
    INTO v_deadline
    FROM public.competitions WHERE id = p_competition_id;

    IF v_deadline IS NULL THEN
      v_deadline := now() + interval '30 days';
    END IF;

    INSERT INTO public.competition_teams (
      id, competition_id, team_id, team_name, team_short_name, access_token,
      registration_deadline, is_locked, status, created_at, updated_at
    ) VALUES (
      v_new_ct_id, p_competition_id, v_new_team_id, v_new_name, v_new_short, v_new_token,
      v_deadline, false, 'invited', now(), now()
    );

    -- Vincula membership para o gestor autenticado
    INSERT INTO public.user_memberships (
      id, user_id, organization_id, competition_id, team_id, competition_team_id,
      role, status, created_at, updated_at
    ) VALUES (
      'mem-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
      v_caller_id, v_source.organization_id, p_competition_id, v_new_team_id, v_new_ct_id,
      'team_manager', 'active', now(), now()
    );
  ELSE
    INSERT INTO public.user_memberships (
      id, user_id, organization_id, team_id, role, status, created_at, updated_at
    ) VALUES (
      'mem-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
      v_caller_id, v_source.organization_id, v_new_team_id, 'team_manager', 'active', now(), now()
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'team_id', v_new_team_id,
    'competition_team_id', v_new_ct_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_team_from_portal(text, text) TO authenticated;

-- 3. RPC Segura de Exclusão de Equipe pelo Portal
CREATE OR REPLACE FUNCTION public.delete_team_from_portal(
  p_team_id text,
  p_competition_team_id text default null
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_authorized boolean := false;
  v_match_count integer := 0;
  v_athlete_count integer := 0;
  v_other_comp_count integer := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Operação exige autenticação.');
  END IF;

  -- Checa autorização
  IF public.is_admin_or_organizer() THEN
    v_is_authorized := true;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.user_id = v_caller_id
        AND um.status = 'active'
        AND (
          um.team_id = p_team_id
          OR (p_competition_team_id IS NOT NULL AND um.competition_team_id = p_competition_team_id)
          OR EXISTS (
            SELECT 1 FROM public.competition_teams ct
            WHERE ct.id = um.competition_team_id AND ct.team_id = p_team_id
          )
        )
    ) THEN
      v_is_authorized := true;
    ELSIF EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.competition_teams ct ON ct.id = p.competition_team_id
      WHERE p.id = v_caller_id AND (ct.team_id = p_team_id OR p.competition_team_id = p_competition_team_id)
    ) THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada para excluir esta equipe.');
  END IF;

  -- Checagem de integridade: Partidas existentes
  SELECT count(*) INTO v_match_count
  FROM public.matches
  WHERE team_a_id = p_team_id OR team_b_id = p_team_id;

  IF v_match_count > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Esta agremiação não pode ser excluída pois possui ' || v_match_count || ' partida(s) registradas no histórico esportivo.'
    );
  END IF;

  -- Checagem de integridade: Atletas no elenco atual
  IF p_competition_team_id IS NOT NULL THEN
    SELECT count(*) INTO v_athlete_count
    FROM public.competition_athletes
    WHERE competition_team_id = p_competition_team_id;

    IF v_athlete_count > 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Esta equipe possui ' || v_athlete_count || ' atleta(s) cadastrado(s) no elenco. Remova os atletas antes de excluir a equipe.'
      );
    END IF;
  END IF;

  -- Checagem de outras inscrições em competições
  SELECT count(*) INTO v_other_comp_count
  FROM public.competition_teams
  WHERE team_id = p_team_id AND (p_competition_team_id IS NULL OR id <> p_competition_team_id);

  IF v_other_comp_count > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Esta agremiação está vinculada a outras ' || v_other_comp_count || ' inscrição(ões) de competição. Remova-as antes de excluir.'
    );
  END IF;

  -- 1. Exclui inscrição da competição se fornecida
  IF p_competition_team_id IS NOT NULL THEN
    DELETE FROM public.competition_teams WHERE id = p_competition_team_id;
  END IF;

  -- 2. Limpa memberships do usuário vinculadas a esta equipe
  DELETE FROM public.user_memberships
  WHERE user_id = v_caller_id
    AND (team_id = p_team_id OR (p_competition_team_id IS NOT NULL AND competition_team_id = p_competition_team_id));

  -- 3. Exclui a agremiação global
  DELETE FROM public.teams WHERE id = p_team_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_team_from_portal(text, text) TO authenticated;

-- 4. RLS Policies para Exclusão por Gestores Autorizados
DROP POLICY IF EXISTS "competition_teams_manager_delete" ON public.competition_teams;
CREATE POLICY "competition_teams_manager_delete" ON public.competition_teams
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_organizer()
    OR (
      (
        id = (SELECT profiles.competition_team_id FROM public.profiles WHERE profiles.id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.user_memberships um
          WHERE um.user_id = auth.uid()
            AND um.status = 'active'
            AND (um.competition_team_id = competition_teams.id OR um.team_id = competition_teams.team_id)
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.competition_id = competition_teams.competition_id
          AND (m.team_a_id = competition_teams.team_id OR m.team_b_id = competition_teams.team_id)
      )
    )
  );

DROP POLICY IF EXISTS "teams_manager_delete" ON public.teams;
CREATE POLICY "teams_manager_delete" ON public.teams
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_organizer()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_memberships um
        WHERE um.user_id = auth.uid()
          AND um.status = 'active'
          AND (
            um.team_id = teams.id
            OR EXISTS (
              SELECT 1 FROM public.competition_teams ct
              WHERE ct.id = um.competition_team_id AND ct.team_id = teams.id
            )
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.team_a_id = teams.id OR m.team_b_id = teams.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.competition_teams ct
        WHERE ct.team_id = teams.id
      )
    )
  );

-- Registrar versão na tabela schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES ('20261009180000', ARRAY['team_portal_lifecycle_and_security'], 'team_portal_lifecycle_and_security')
ON CONFLICT (version) DO UPDATE
  SET statements = EXCLUDED.statements, name = EXCLUDED.name;

COMMIT;

NOTIFY pgrst, 'reload schema';
