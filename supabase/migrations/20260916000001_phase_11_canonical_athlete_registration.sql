-- BaseOS — Fase 11.4: Cadastro Canônico de Atletas, Matching por CPF e Inscrição Transacional
--
-- Tabelas envolvidas:
--   - public.athletes
--   - public.competition_athletes
--   - public.competition_teams
--   - public.competitions
--   - public.user_memberships
--   - public.profiles
--
-- Objetivos:
--   1. Normalização e matching canônico de CPF para reutilização de identidades globais (public.athletes);
--   2. Inscrição atômica e transacional de atletas tanto pública (via token) quanto autenticada (via RPC);
--   3. Isolamento multi-tenant: validação de permissões via auth.uid() e memberships ativas;
--   4. Atletas sem CPF recebem identidades novas isoladas (nunca mesclados por nome);
--   5. Tratamento de concorrência atômico via ON CONFLICT em uq_athletes_normalized_cpf.

-- ============================================================================
-- 1. HELPER CANÔNICO: Normalização de CPF em nível de banco
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_cpf(p_cpf text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cleaned text;
BEGIN
  IF p_cpf IS NULL OR btrim(p_cpf) = '' THEN
    RETURN NULL;
  END IF;
  v_cleaned := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cleaned) <> 11 THEN
    RETURN NULL;
  END IF;
  RETURN v_cleaned;
END;
$$;

-- ============================================================================
-- 2. RESOLUÇÃO / CRIAÇÃO ATÔMICA DA IDENTIDADE DO ATLETA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_athlete_id(
  p_name text,
  p_document_number text default null,
  p_birth_date date default null
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_norm_cpf text;
  v_athlete_id text;
BEGIN
  v_norm_cpf := public.normalize_cpf(p_document_number);

  IF v_norm_cpf IS NOT NULL THEN
    -- 1. Tenta encontrar identidade canônica existente pelo CPF normalizado
    SELECT id INTO v_athlete_id
    FROM public.athletes
    WHERE normalized_cpf = v_norm_cpf
    LIMIT 1;

    IF v_athlete_id IS NOT NULL THEN
      RETURN v_athlete_id;
    END IF;

    -- 2. Insere atômico com proteção de concorrência (ON CONFLICT uq_athletes_normalized_cpf)
    INSERT INTO public.athletes (id, name, normalized_cpf, birth_date, created_at, updated_at)
    VALUES (gen_random_uuid()::text, btrim(p_name), v_norm_cpf, p_birth_date, now(), now())
    ON CONFLICT (normalized_cpf) DO UPDATE
      SET updated_at = now()
    RETURNING id INTO v_athlete_id;

    RETURN v_athlete_id;
  ELSE
    -- 3. Sem CPF: gera SEMPRE nova identidade isolada (mesmo nome NÃO significa mesma pessoa)
    INSERT INTO public.athletes (id, name, birth_date, created_at, updated_at)
    VALUES (gen_random_uuid()::text, btrim(p_name), p_birth_date, now(), now())
    RETURNING id INTO v_athlete_id;

    RETURN v_athlete_id;
  END IF;
END;
$$;

-- ============================================================================
-- 3. RPC PÚBLICA DE INSCRIÇÃO: register_athlete (atualizada com athlete_id)
-- ============================================================================

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
  v_athlete_id text;
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

  -- 3. Verificação do ciclo de vida da competição
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

  -- 5. Limite máximo de elenco dinâmico via CompetitionConfig
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

  -- 6. Resolução / criação da identidade canônica (public.athletes)
  v_athlete_id := public.get_or_create_athlete_id(p_name, p_document_number, p_birth_date);

  -- 7. Inserção da participação (public.competition_athletes com athlete_id)
  INSERT INTO public.competition_athletes (
    id, competition_team_id, athlete_id, name, jersey_number, position,
    document_number, birth_date, is_captain, is_libero, gender,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid()::text, v_team.id, v_athlete_id, btrim(p_name), p_jersey_number, btrim(p_position),
    p_document_number, p_birth_date, p_is_captain, p_is_libero, p_gender,
    now(), now()
  ) RETURNING * INTO v_athlete;

  -- 8. Atualização de status da inscrição de 'invited' para 'in_progress'
  IF v_team.status = 'invited' THEN
    UPDATE public.competition_teams SET status = 'in_progress', updated_at = now() WHERE id = v_team.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'athlete', to_jsonb(v_athlete));
END;
$$;

-- ============================================================================
-- 4. RPC AUTENTICADA: register_competition_athlete_auth
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_competition_athlete_auth(
  p_competition_team_id text,
  p_name text,
  p_position text,
  p_jersey_number integer default null,
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
  v_caller_id uuid;
  v_team public.competition_teams;
  v_comp public.competitions;
  v_athlete public.competition_athletes;
  v_athlete_id text;
  v_max_athletes integer;
  v_current_count integer;
  v_is_authorized boolean := false;
BEGIN
  -- 1. Identificação do usuário chamador via auth.uid()
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Operação exige autenticação.');
  END IF;

  -- 2. Carrega equipe da competição
  SELECT * INTO v_team
  FROM public.competition_teams
  WHERE id = p_competition_team_id
  LIMIT 1;

  IF v_team IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Equipe da competição não encontrada.');
  END IF;

  -- 3. Verificação de autorização (Admin/Organizer OU dirigente com membership ativa OU perfil legado)
  IF public.is_admin_or_organizer() THEN
    v_is_authorized := true;
  ELSE
    -- Verifica membership ativa vinculada a esta participação ou equipe
    IF EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.user_id = v_caller_id
        AND um.status = 'active'
        AND (
          um.competition_team_id = v_team.id
          OR (um.team_id = v_team.team_id AND (um.competition_id IS NULL OR um.competition_id = v_team.competition_id))
        )
    ) THEN
      v_is_authorized := true;
    -- Compatibilidade com vínculo legado de profiles
    ELSIF EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_caller_id
        AND p.competition_team_id = v_team.id
    ) THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autorizado a cadastrar atletas nesta equipe.');
  END IF;

  -- 4. Verificação de trava da equipe e deadline
  IF v_team.is_locked THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inscrição bloqueada pela organização.');
  END IF;

  IF v_team.registration_deadline < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Prazo de inscrição encerrado.');
  END IF;

  -- 5. Verificação do ciclo de vida da competição
  SELECT * INTO v_comp
  FROM public.competitions
  WHERE id = v_team.competition_id;

  IF v_comp IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Competição não encontrada.');
  END IF;

  IF v_comp.status NOT IN ('registration-open', 'registration') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'As inscrições desta competição não estão mais abertas.');
  END IF;

  -- 6. Verificação de duplicidade de camisa na mesma equipe
  IF p_jersey_number IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.competition_athletes
    WHERE competition_team_id = v_team.id AND jersey_number = p_jersey_number
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Já existe atleta com a camisa %s nesta equipe.', p_jersey_number));
  END IF;

  -- 7. Limite máximo de elenco dinâmico via CompetitionConfig
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

  -- 8. Resolução / criação da identidade canônica (public.athletes)
  v_athlete_id := public.get_or_create_athlete_id(p_name, p_document_number, p_birth_date);

  -- 9. Inserção da participação vinculando athlete_id
  INSERT INTO public.competition_athletes (
    id, competition_team_id, athlete_id, name, jersey_number, position,
    document_number, birth_date, is_captain, is_libero, gender,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid()::text, v_team.id, v_athlete_id, btrim(p_name), p_jersey_number, btrim(p_position),
    p_document_number, p_birth_date, p_is_captain, p_is_libero, p_gender,
    now(), now()
  ) RETURNING * INTO v_athlete;

  -- 10. Atualização de status da inscrição de 'invited' para 'in_progress'
  IF v_team.status = 'invited' THEN
    UPDATE public.competition_teams SET status = 'in_progress', updated_at = now() WHERE id = v_team.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'athlete', to_jsonb(v_athlete));
END;
$$;

-- ============================================================================
-- 5. PERMISSÕES DE EXECUÇÃO
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.normalize_cpf(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_athlete_id(text, text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_athlete TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_competition_athlete_auth TO authenticated;
