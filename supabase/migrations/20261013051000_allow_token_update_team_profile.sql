-- ============================================================================
-- Migration: 20261013051000_allow_token_update_team_profile.sql
-- BaseOS — Permite que gestores atualizem dados e escudo da equipe via token público
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.update_team_profile_by_token(
  p_token text,
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
  v_ct public.competition_teams%ROWTYPE;
  v_comp public.competitions%ROWTYPE;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Token de acesso inválido.');
  END IF;

  SELECT * INTO v_ct FROM public.competition_teams WHERE access_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inscrição de equipe não encontrada para o token informado.');
  END IF;

  SELECT * INTO v_comp FROM public.competitions WHERE id = v_ct.competition_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Competição vinculada não encontrada.');
  END IF;

  IF v_ct.is_locked = true THEN
    RETURN jsonb_build_object('ok', false, 'error', 'O elenco e dados desta equipe foram bloqueados pela organização.');
  END IF;

  IF v_ct.registration_deadline <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'O prazo de inscrição desta equipe está encerrado.');
  END IF;

  IF v_comp.status NOT IN ('registration-open', 'registration') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'As inscrições para esta competição estão encerradas.');
  END IF;

  -- Atualiza na tabela teams
  UPDATE public.teams
  SET
    name = CASE WHEN p_name IS NOT NULL THEN COALESCE(NULLIF(btrim(p_name), ''), name) ELSE name END,
    short_name = CASE WHEN p_short_name IS NOT NULL THEN COALESCE(NULLIF(btrim(p_short_name), ''), short_name) ELSE short_name END,
    logo_url = CASE WHEN p_logo_url IS NOT NULL THEN NULLIF(p_logo_url, '') ELSE logo_url END,
    coach_name = CASE WHEN p_coach_name IS NOT NULL THEN NULLIF(btrim(p_coach_name), '') ELSE coach_name END,
    city = CASE WHEN p_city IS NOT NULL THEN NULLIF(btrim(p_city), '') ELSE city END,
    state = CASE WHEN p_state IS NOT NULL THEN NULLIF(btrim(p_state), '') ELSE state END,
    updated_at = now()
  WHERE id = v_ct.team_id;

  -- Sincroniza na inscrição da competição
  UPDATE public.competition_teams
  SET
    team_name = COALESCE(NULLIF(btrim(p_name), ''), team_name),
    team_short_name = COALESCE(NULLIF(btrim(p_short_name), ''), team_short_name),
    updated_at = now()
  WHERE id = v_ct.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_team_profile_by_token(text, text, text, text, text, text, text) TO anon, authenticated;

-- Registrar migration
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES ('20261013051000', ARRAY['allow_token_update_team_profile'], 'allow_token_update_team_profile')
ON CONFLICT (version) DO UPDATE
  SET statements = EXCLUDED.statements, name = EXCLUDED.name;

COMMIT;

NOTIFY pgrst, 'reload schema';
