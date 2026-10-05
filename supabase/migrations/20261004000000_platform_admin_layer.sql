-- ============================================================================
-- BaseOS — Platform Admin Layer (Master Control)
-- Migration: 20261004000000_platform_admin_layer.sql
-- ============================================================================
--
-- Objetivos:
-- 1. Adicionar a coluna booleana is_platform_admin DEFAULT false na tabela public.profiles.
-- 2. Criar a função utilitária public.is_platform_admin() RETURNS boolean (SECURITY DEFINER).
-- 3. Atualizar as políticas RLS da tabela organizations e user_memberships para permitir
--    que usuários com is_platform_admin() = true tenham permissão total (ALL) para ler,
--    inserir, atualizar e gerenciar qualquer base/organização.
-- 4. Atualizar as funções utilitárias multi-tenant is_org_member e is_org_admin_or_organizer
--    para conceder bypass automático a Platform Admins em qualquer tenant selecionado.
-- 5. Atualizar can_read_profile para permitir leitura irrestrita por Platform Admins.
-- 6. Atualizar o perfil do Product Owner (diegoantmartins89@gmail.com) para is_platform_admin = true.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. COLUNA is_platform_admin NA TABELA public.profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
  ON public.profiles(is_platform_admin)
  WHERE is_platform_admin = true;

COMMENT ON COLUMN public.profiles.is_platform_admin IS
  'Chave-mestra: identifica se o usuário é um Administrador da Plataforma BaseOS (Master Control).';

-- ----------------------------------------------------------------------------
-- 2. FUNÇÃO UTILITÁRIA public.is_platform_admin()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS
  'Retorna true se o usuário autenticado for Platform Admin (Chave-Mestra do BaseOS).';

-- ----------------------------------------------------------------------------
-- 3. ATUALIZAÇÃO DAS FUNÇÕES MULTI-TENANT COM BYPASS MASTER
-- ----------------------------------------------------------------------------

-- 3.1 is_org_member (TEXT e UUID)
CREATE OR REPLACE FUNCTION public.is_org_member(org_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_memberships'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_memberships
      WHERE organization_id = org_id
        AND user_id = auth.uid()
        AND status = 'active'
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_member(org_id::text);
$$;

COMMENT ON FUNCTION public.is_org_member(text) IS
  'Verifica se o usuário é membro ativo da organização ou Platform Admin (Master).';

-- 3.2 is_org_admin_or_organizer (TEXT e UUID)
CREATE OR REPLACE FUNCTION public.is_org_admin_or_organizer(p_org_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_memberships'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_memberships
      WHERE organization_id = p_org_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'organizer')
        AND status = 'active'
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_or_organizer(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_admin_or_organizer(p_org_id::text);
$$;

COMMENT ON FUNCTION public.is_org_admin_or_organizer(text) IS
  'Valida se o usuário tem privilégio administrativo na organização ou é Platform Admin.';

-- 3.3 can_read_profile com bypass de Platform Admin
CREATE OR REPLACE FUNCTION public.can_read_profile(
  p_target_profile_id uuid,
  p_target_competition_team_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();

  -- 1. Requer autenticação
  IF v_caller_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Platform Admin tem leitura total
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  -- 3. Próprio usuário sempre tem acesso ao próprio perfil
  IF v_caller_id = p_target_profile_id THEN
    RETURN true;
  END IF;

  -- 4. Usuários que compartilham organização ativa via user_memberships
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_memberships'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.user_memberships m1
      JOIN public.user_memberships m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = v_caller_id
        AND m2.user_id = p_target_profile_id
        AND m1.status = 'active'
        AND m2.status = 'active'
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- 5. Gestores administrativos da organização proprietária do perfil alvo (se organization_id existir em profiles)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_memberships'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.user_memberships m_caller
      JOIN public.profiles target_p ON target_p.organization_id::text = m_caller.organization_id::text
      WHERE m_caller.user_id = v_caller_id
        AND target_p.id = p_target_profile_id
        AND m_caller.role IN ('admin', 'organizer')
        AND m_caller.status = 'active'
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS RLS: organizations E user_memberships
-- ----------------------------------------------------------------------------

-- 4.1 organizations: permissão total (ALL) para is_platform_admin
DROP POLICY IF EXISTS "organizations_platform_admin_all" ON public.organizations;
CREATE POLICY "organizations_platform_admin_all" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 4.2 user_memberships: permissão total (ALL) para is_platform_admin (se tabela existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_memberships'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "user_memberships_platform_admin_all" ON public.user_memberships';
    EXECUTE 'CREATE POLICY "user_memberships_platform_admin_all" ON public.user_memberships
      FOR ALL TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin())';
  END IF;
END $$;

-- 4.3 Ajuste no trigger anti-escalada para não bloquear Platform Admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_memberships'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.trg_fn_protect_user_membership_escalation()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $trigger$
      DECLARE
        v_caller_id uuid;
        v_caller_role public.user_role;
        v_is_org_admin boolean := false;
      BEGIN
        v_caller_id := auth.uid();

        -- Se executado em contexto interno do sistema (ex: seeds, migrações sem auth.uid()), permite
        IF v_caller_id IS NULL THEN
          RETURN NEW;
        END IF;

        -- Se for Platform Admin (Chave-Mestra), tem permissão irrestrita
        IF public.is_platform_admin() THEN
          RETURN NEW;
        END IF;

        SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

        -- Se for admin global ou organizer global, tem permissão administrativa
        IF v_caller_role IN ('admin', 'organizer') THEN
          RETURN NEW;
        END IF;

        -- Verifica se o chamador é Org Admin da organização correspondente
        SELECT EXISTS (
          SELECT 1 FROM public.user_memberships um
          WHERE um.organization_id = OLD.organization_id
            AND um.user_id = v_caller_id
            AND um.role = 'admin'
            AND um.status = 'active'
        ) INTO v_is_org_admin;

        IF NOT v_is_org_admin THEN
          RAISE EXCEPTION 'Operação não autorizada: apenas administradores da organização podem alterar membros.';
        END IF;

        -- Impede auto-escalada ou alteração do próprio papel
        IF OLD.user_id = v_caller_id AND NEW.role IS DISTINCT FROM OLD.role THEN
          RAISE EXCEPTION 'Operação não autorizada: você não pode alterar o seu próprio papel.';
        END IF;

        RETURN NEW;
      END;
      $trigger$;
    $func$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. ATRIBUIÇÃO DE is_platform_admin AO PRODUCT OWNER / ADMINISTRADOR PRINCIPAL
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'diegoantmartins89@gmail.com';
  v_has_org_col boolean;
  v_voltz_id text;
BEGIN
  -- 1. Verifica se já existe em auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      email,
      raw_user_meta_data
    ) VALUES (
      v_user_id,
      v_email,
      '{"name":"Diego Martins (Master)"}'::jsonb
    );
  END IF;

  -- 2. Verifica se a coluna organization_id existe em profiles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id'
  ) INTO v_has_org_col;

  IF v_has_org_col THEN
    -- Recupera ID da VOLTZ ou cria referência
    SELECT id::text INTO v_voltz_id
    FROM public.organizations
    WHERE upper(coalesce(name, '')) = 'VOLTZ' OR id::text = 'a0000000-0000-0000-0000-000000000001'
    LIMIT 1;

    IF v_voltz_id IS NULL THEN
      SELECT id::text INTO v_voltz_id FROM public.organizations LIMIT 1;
    END IF;

    INSERT INTO public.profiles (
      id,
      email,
      name,
      role,
      organization_id,
      is_platform_admin,
      updated_at
    )
    VALUES (
      v_user_id,
      v_email,
      'Diego Martins (Master)',
      'admin',
      v_voltz_id,
      true,
      now()
    )
    ON CONFLICT (id) DO UPDATE
      SET is_platform_admin = true,
          role = 'admin',
          updated_at = now();
  ELSE
    INSERT INTO public.profiles (
      id,
      email,
      name,
      role,
      is_platform_admin,
      updated_at
    )
    VALUES (
      v_user_id,
      v_email,
      'Diego Martins (Master)',
      'admin',
      true,
      now()
    )
    ON CONFLICT (id) DO UPDATE
      SET is_platform_admin = true,
          role = 'admin',
          updated_at = now();
  END IF;

  -- 3. Atualiza qualquer perfil que coincida com o e-mail
  UPDATE public.profiles
  SET is_platform_admin = true,
      role = 'admin'
  WHERE lower(email) = lower(v_email);

  -- 4. Garante membership administrativa se tabela user_memberships existir
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_memberships'
  ) THEN
    EXECUTE '
      INSERT INTO public.user_memberships (
        id,
        user_id,
        organization_id,
        role,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ''mem-master-'' || $1::text,
        $1,
        COALESCE($2, ''a0000000-0000-0000-0000-000000000001''),
        ''admin'',
        ''active'',
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE
        SET role = ''admin'',
            status = ''active'',
            updated_at = now()'
    USING v_user_id, v_voltz_id;
  END IF;

END $$;

COMMIT;
