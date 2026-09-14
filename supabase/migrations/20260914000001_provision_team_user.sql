-- BaseOS — Fase 8.6.4: Recuperação e Conexão de Auth de Equipes
-- 
-- Cria a RPC segura public.provision_team_user para provisionar dirigentes de equipes
-- diretamente no Supabase Auth (auth.users + auth.identities) e vincular ao public.profiles
-- com role = 'team' e competition_team_id = competition_teams.id.
--
-- Defesa em profundidade:
-- - Apenas usuários com role 'admin' ou 'organizer' podem executar esta função.
-- - Se chamada internamente (auth.uid() IS NULL em migrações/scripts de sistema), permite execução.
-- - Executa como SECURITY DEFINER no search_path = public.

-- 1. Atualizar handle_new_user para respeitar role e competition_team_id se fornecidos nos metadados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.user_role := 'team';
  v_raw_role text;
BEGIN
  v_raw_role := new.raw_user_meta_data ->> 'role';
  IF v_raw_role IN ('admin', 'organizer', 'referee', 'team') THEN
    v_role := v_raw_role::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, name, role, competition_team_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data ->> 'competition_team_id'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, profiles.name),
      role = COALESCE(EXCLUDED.role, profiles.role),
      competition_team_id = COALESCE(EXCLUDED.competition_team_id, profiles.competition_team_id),
      updated_at = now();

  RETURN new;
END;
$$;

-- 2. Atualizar trigger de proteção de perfis para permitir atualizações internas / sistema (auth.uid() IS NULL)
CREATE OR REPLACE FUNCTION public.trg_protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
BEGIN
  -- Se role e competition_team_id não sofreram alteração, permite a operação
  IF NEW.role IS NOT DISTINCT FROM OLD.role AND NEW.competition_team_id IS NOT DISTINCT FROM OLD.competition_team_id THEN
    RETURN NEW;
  END IF;

  -- Se executado em contexto interno/servidor/admin (auth.uid() is null), permite
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Se houve tentativa de alteração, verifica se o usuário autenticado é admin ou organizer
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IN ('organizer', 'admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Acesso negado: usuários de equipe não têm permissão para alterar cargo (role) ou vínculo de equipe (competition_team_id).';
END;
$$;

-- 3. RPC Oficial de Provisionamento de Usuário de Equipe
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

-- Garantir concessão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.provision_team_user(text, text, text, text, text) TO authenticated;
