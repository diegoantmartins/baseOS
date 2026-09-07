-- BaseOS — RPC register_athlete v2: integridade de lifecycle, deadline, regras e limite dinâmico (Fase 3.2)
-- Corrige BLOCKERS 09, 11 e 12:
-- 1. Elimina limites hardcoded (14 ou 4);
-- 2. Lê maxAthletes exclusivamente da configuração canônica (config ou rules_snapshot);
-- 3. Se a configuração estiver ausente ou inválida, bloqueia a operação;
-- 4. Valida status de lifecycle da competição;
-- 5. Valida deadline e trava da equipe.

CREATE OR REPLACE FUNCTION public.register_athlete(
  p_token text,
  p_name text,
  p_position text,
  p_jersey_number integer,
  p_is_captain boolean default false,
  p_is_libero boolean default false,
  p_gender text default 'female',
  p_document_number text default null,
  p_birth_date date default null
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_team public.competition_teams;
  v_comp public.competitions;
  v_athlete public.competition_athletes;
  v_max_athletes integer;
  v_current_count integer;
BEGIN
  -- 1. Validação do token de inscrição
  SELECT * INTO v_team
  FROM public.competition_teams
  WHERE access_token = p_token
  LIMIT 1;

  IF v_team IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Convite de equipe não encontrado.');
  END IF;

  -- 2. Verificação de trava da equipe e deadline
  IF v_team.is_locked THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inscrição bloqueada pela organização.');
  END IF;

  IF v_team.registration_deadline < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Prazo de inscrição encerrado.');
  END IF;

  -- 3. Verificação do ciclo de vida da competição (Lifecycle Guard)
  SELECT * INTO v_comp
  FROM public.competitions
  WHERE id = v_team.competition_id;

  IF v_comp IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Competição não encontrada.');
  END IF;

  IF v_comp.status NOT IN ('registration-open', 'registration') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'As inscrições desta competição não estão mais abertas.');
  END IF;

  -- 4. Verificação de duplicidade de camisa na mesma equipe
  IF p_jersey_number IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.competition_athletes
    WHERE competition_team_id = v_team.id AND jersey_number = p_jersey_number
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Já existe atleta com a camisa %s nesta equipe.', p_jersey_number));
  END IF;

  -- 5. Limite máximo de elenco dinâmico via CompetitionConfig (NÃO aceitar fallback hardcoded)
  v_max_athletes := COALESCE(
    (v_comp.config -> 'registration' ->> 'maxAthletes')::integer,
    (v_comp.rules_snapshot -> 'registration' ->> 'maxAthletes')::integer
  );

  IF v_max_athletes IS NULL OR v_max_athletes <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Configuração da competição incompleta ou inválida.');
  END IF;

  SELECT count(*) INTO v_current_count
  FROM public.competition_athletes
  WHERE competition_team_id = v_team.id;

  IF v_current_count >= v_max_athletes THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Limite máximo de %s atletas por equipe atingido.', v_max_athletes));
  END IF;

  -- 6. Inserção do atleta
  INSERT INTO public.competition_athletes (
    id, competition_team_id, name, jersey_number, position,
    document_number, birth_date, is_captain, is_libero, gender
  ) VALUES (
    gen_random_uuid()::text, v_team.id, p_name, p_jersey_number, p_position,
    p_document_number, p_birth_date, p_is_captain, p_is_libero, p_gender
  ) RETURNING * INTO v_athlete;

  -- 7. Atualização de status da inscrição de 'invited' para 'in_progress'
  IF v_team.status = 'invited' THEN
    UPDATE public.competition_teams SET status = 'in_progress' WHERE id = v_team.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'athlete', to_jsonb(v_athlete));
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_athlete TO anon, authenticated;
