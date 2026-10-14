BEGIN;

-- ============================================================================
-- Permissão para Gestores de Equipe Editarem Perfil, Nome e Escudo da Equipe
-- ============================================================================

-- 1. Política RLS em public.teams permitindo que dirigentes ativos atualizem sua equipe
DROP POLICY IF EXISTS "teams_manager_update" ON public.teams;
CREATE POLICY "teams_manager_update" ON public.teams
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_organizer()
    OR EXISTS (
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
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.competition_teams ct ON ct.id = p.competition_team_id
      WHERE p.id = auth.uid() AND ct.team_id = teams.id
    )
  )
  WITH CHECK (
    public.is_admin_or_organizer()
    OR EXISTS (
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
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.competition_teams ct ON ct.id = p.competition_team_id
      WHERE p.id = auth.uid() AND ct.team_id = teams.id
    )
  );

-- 2. Atualizar política em competition_teams para permitir vínculo via user_memberships
DROP POLICY IF EXISTS "competition_teams_team_update" ON public.competition_teams;
CREATE POLICY "competition_teams_team_update" ON public.competition_teams
  FOR UPDATE
  TO authenticated
  USING (
    (
      id = (SELECT profiles.competition_team_id FROM public.profiles WHERE profiles.id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_memberships um
        WHERE um.user_id = auth.uid()
          AND um.status = 'active'
          AND (um.competition_team_id = competition_teams.id OR um.team_id = competition_teams.team_id)
      )
    )
  )
  WITH CHECK (
    (
      id = (SELECT profiles.competition_team_id FROM public.profiles WHERE profiles.id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_memberships um
        WHERE um.user_id = auth.uid()
          AND um.status = 'active'
          AND (um.competition_team_id = competition_teams.id OR um.team_id = competition_teams.team_id)
      )
    )
  );

-- 3. RPC Segura de Atualização de Perfil de Equipe
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
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Operação exige autenticação.');
  END IF;

  -- Checa autorização: admin/organizer OU membro ativo da equipe
  IF public.is_admin_or_organizer() THEN
    v_is_authorized := true;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.user_id = v_caller_id
        AND um.status = 'active'
        AND (um.team_id = p_team_id OR (p_competition_team_id IS NOT NULL AND um.competition_team_id = p_competition_team_id))
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

  -- Se fornecido competition_team_id, sincroniza o nome e sigla na inscrição da competição
  IF p_competition_team_id IS NOT NULL THEN
    UPDATE public.competition_teams
    SET
      team_name = COALESCE(NULLIF(btrim(p_name), ''), team_name),
      team_short_name = COALESCE(NULLIF(btrim(p_short_name), ''), team_short_name),
      updated_at = now()
    WHERE id = p_competition_team_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_team_profile(text, text, text, text, text, text, text, text) TO authenticated;

-- Registrar migração
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES ('20261009163500', ARRAY['allow_team_manager_update_team'], 'allow_team_manager_update_team')
ON CONFLICT (version) DO UPDATE
  SET statements = EXCLUDED.statements, name = EXCLUDED.name;

COMMIT;

NOTIFY pgrst, 'reload schema';
