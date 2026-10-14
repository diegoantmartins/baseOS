-- BaseOS — Fase 1A: Provisionamento Seguro de Administrador
--
-- Cria a RPC segura public.provision_organization_admin para provisionar 
-- administradores de organizações diretamente no Supabase Auth (auth.users)
-- e vincular a profiles e user_memberships.

CREATE OR REPLACE FUNCTION public.provision_organization_admin(
  p_email text,
  p_password text,
  p_name text,
  p_organization_id text,
  p_invited_by text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_caller_role public.user_role;
  v_is_platform_admin boolean;
  v_user_id uuid;
  v_norm_email text;
  v_org_exists boolean;
  v_membership_id text;
BEGIN
  -- 1. Verificação de autorização do chamador
  IF auth.uid() IS NOT NULL THEN
    SELECT role, is_platform_admin INTO v_caller_role, v_is_platform_admin 
    FROM public.profiles WHERE id = auth.uid();
    
    IF NOT v_is_platform_admin THEN
      IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada. Apenas administradores podem provisionar novos administradores.');
      END IF;
      
      -- Verifica se o administrador pertence à organização que está sendo provisionada
      IF NOT EXISTS (
        SELECT 1 FROM public.user_memberships 
        WHERE user_id = auth.uid() AND organization_id = p_organization_id AND role = 'admin' AND status = 'active'
      ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada. Você não é administrador desta organização.');
      END IF;
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado.');
  END IF;

  -- 2. Validações
  v_norm_email := lower(trim(p_email));
  IF v_norm_email IS NULL OR v_norm_email = '' OR position('@' in v_norm_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'E-mail inválido.');
  END IF;

  IF p_password IS NULL OR length(trim(p_password)) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A senha deve conter no mínimo 6 caracteres.');
  END IF;

  IF p_organization_id IS NULL OR trim(p_organization_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ID da organização obrigatório.');
  END IF;

  -- 3. Validar se a organização existe
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = p_organization_id
  ) INTO v_org_exists;

  IF NOT v_org_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Organização não encontrada.');
  END IF;

  -- 4. Verificar auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_norm_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', v_norm_email,
      crypt(trim(p_password), gen_salt('bf')), now(), '', '', '', '', now(), now(),
      jsonb_build_object('name', trim(p_name), 'role', 'admin', 'organization_id', p_organization_id),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      'authenticated', 'authenticated'
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', v_norm_email),
      'email', v_user_id::text, null, now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt(trim(p_password), gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now(),
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object('name', trim(p_name), 'role', 'admin', 'organization_id', p_organization_id)
    WHERE id = v_user_id;

    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email') THEN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', v_norm_email),
        'email', v_user_id::text, null, now(), now()
      );
    END IF;
  END IF;

  -- 5. Atualizar profile
  INSERT INTO public.profiles (id, email, name, role, organization_id)
  VALUES (v_user_id, v_norm_email, trim(p_name), 'admin', p_organization_id)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, profiles.name),
      role = 'admin',
      organization_id = EXCLUDED.organization_id,
      updated_at = now();

  -- 6. Atualizar ou criar membership
  SELECT id INTO v_membership_id FROM public.user_memberships 
  WHERE user_id = v_user_id AND organization_id = p_organization_id LIMIT 1;

  IF v_membership_id IS NOT NULL THEN
    UPDATE public.user_memberships 
    SET role = 'admin', status = 'active', updated_at = now()
    WHERE id = v_membership_id;
  ELSE
    v_membership_id := 'mem_' || replace(gen_random_uuid()::text, '-', '');
    
    INSERT INTO public.user_memberships (
      id, user_id, organization_id, role, status, created_at, updated_at
    ) VALUES (
      v_membership_id, v_user_id, p_organization_id, 'admin', 'active', now(), now()
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'membership_id', v_membership_id,
    'email', v_norm_email,
    'role', 'admin',
    'organization_id', p_organization_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_organization_admin(text, text, text, text, text) TO authenticated, service_role;
