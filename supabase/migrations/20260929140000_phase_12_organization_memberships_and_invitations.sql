-- BaseOS — Fase 12: Organizações, Membros, Convites e Vínculos
--
-- Migration: 20260929140000_phase_12_organization_memberships_and_invitations.sql
-- Ambiente: DEV exclusivamente (volei_test_db)
--
-- Objetivos:
-- 1. Criação da tabela public.organization_invitations para convites escopados, expiráveis e rastreáveis.
-- 2. Triggers de integridade multi-tenant: validação de pertencimento de equipe à organização.
-- 3. RLS e políticas de acesso para isolamento estrito entre organizações.
-- 4. Funções RPC com SECURITY DEFINER e search_path restrito para emissão e aceitação segura de convites.
-- 5. Defesa em profundidade contra auto-escalada de privilégios e violação cross-organization.

-- 1. Tabela de Convites de Organização
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id text PRIMARY KEY DEFAULT ('inv-' || gen_random_uuid()::text),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'organizer'::text, 'team_manager'::text, 'referee'::text, 'scorer'::text, 'viewer'::text])),
  team_id text REFERENCES public.teams(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'canceled'::text])),
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz
);

-- Índices operacionais
CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON public.organization_invitations(status);

-- 2. Trigger de Integridade Multi-Tenant: Equipe deve pertencer à Organização na membership
CREATE OR REPLACE FUNCTION public.trg_fn_validate_membership_team_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_org_id text;
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    SELECT organization_id INTO v_team_org_id
    FROM public.teams
    WHERE id = NEW.team_id;

    IF v_team_org_id IS NOT NULL AND v_team_org_id <> NEW.organization_id THEN
      RAISE EXCEPTION 'A equipe % pertence à organização %, não à organização %.',
        NEW.team_id, v_team_org_id, NEW.organization_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_membership_team_organization ON public.user_memberships;
CREATE TRIGGER trg_validate_membership_team_organization
BEFORE INSERT OR UPDATE ON public.user_memberships
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_validate_membership_team_organization();

-- 3. Trigger de Integridade Multi-Tenant: Equipe deve pertencer à Organização no convite
CREATE OR REPLACE FUNCTION public.trg_fn_validate_invitation_team_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_org_id text;
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    SELECT organization_id INTO v_team_org_id
    FROM public.teams
    WHERE id = NEW.team_id;

    IF v_team_org_id IS NOT NULL AND v_team_org_id <> NEW.organization_id THEN
      RAISE EXCEPTION 'A equipe % pertence à organização %, não à organização %.',
        NEW.team_id, v_team_org_id, NEW.organization_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invitation_team_organization ON public.organization_invitations;
CREATE TRIGGER trg_validate_invitation_team_organization
BEFORE INSERT OR UPDATE ON public.organization_invitations
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_validate_invitation_team_organization();

-- 4. Trigger de Proteção contra Auto-Escalada em user_memberships
CREATE OR REPLACE FUNCTION public.trg_fn_protect_user_membership_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_protect_user_membership_escalation ON public.user_memberships;
CREATE TRIGGER trg_protect_user_membership_escalation
BEFORE UPDATE ON public.user_memberships
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_protect_user_membership_escalation();

-- 5. RPC para Emissão Segura de Convites
CREATE OR REPLACE FUNCTION public.create_organization_invitation(
  p_organization_id text,
  p_email text,
  p_role text,
  p_team_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role public.user_role;
  v_is_org_admin boolean := false;
  v_is_team_manager boolean := false;
  v_caller_team_id text;
  v_clean_email text;
  v_token text;
  v_inv_id text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sessão não autenticada.');
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

  -- Checa se o chamador é admin global ou organizer
  IF v_caller_role IN ('admin', 'organizer') THEN
    v_is_org_admin := true;
  ELSE
    -- Checa se é Org Admin ativo nesta organização
    SELECT EXISTS (
      SELECT 1 FROM public.user_memberships
      WHERE user_id = v_caller_id
        AND organization_id = p_organization_id
        AND role = 'admin'
        AND status = 'active'
    ) INTO v_is_org_admin;

    -- Checa se é team_manager ativo nesta organização
    IF NOT v_is_org_admin THEN
      SELECT EXISTS (
        SELECT 1 FROM public.user_memberships
        WHERE user_id = v_caller_id
          AND organization_id = p_organization_id
          AND role = 'team_manager'
          AND status = 'active'
      ) INTO v_is_team_manager;

      IF v_is_team_manager THEN
        SELECT team_id INTO v_caller_team_id
        FROM public.user_memberships
        WHERE user_id = v_caller_id
          AND organization_id = p_organization_id
          AND role = 'team_manager'
          AND status = 'active'
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  IF NOT COALESCE(v_is_org_admin, false) AND NOT COALESCE(v_is_team_manager, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Você não tem permissão para convidar membros para esta organização.');
  END IF;

  -- Regras de restrição para team_manager
  IF COALESCE(v_is_team_manager, false) AND NOT COALESCE(v_is_org_admin, false) THEN
    IF p_role IN ('admin', 'organizer') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Gerentes de equipe não podem convidar administradores ou organizadores.');
    END IF;
    IF p_team_id IS DISTINCT FROM v_caller_team_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Gerentes de equipe só podem convidar membros para a sua própria equipe.');
    END IF;
  END IF;

  v_clean_email := lower(btrim(COALESCE(p_email, '')));
  IF v_clean_email = '' OR position('@' in v_clean_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'E-mail inválido.');
  END IF;

  -- Gerar token seguro imprevisível (64 hex chars usando gen_random_uuid nativo)
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_inv_id := 'inv-' || gen_random_uuid()::text;

  INSERT INTO public.organization_invitations (
    id, organization_id, email, role, team_id, token, status, invited_by, created_at, expires_at
  ) VALUES (
    v_inv_id, p_organization_id, v_clean_email, p_role, p_team_id, v_token, 'pending', v_caller_id, now(), now() + interval '7 days'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_inv_id,
    'token', v_token,
    'organization_id', p_organization_id,
    'email', v_clean_email,
    'role', p_role
  );
END;
$$;

-- 6. RPC para Aceitação de Convite
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id uuid;
  v_inv record;
  v_membership_id text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sessão não autenticada.');
  END IF;

  SELECT * INTO v_inv
  FROM public.organization_invitations
  WHERE token = btrim(COALESCE(p_token, ''))
  LIMIT 1;

  IF v_inv.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Convite não encontrado.');
  END IF;

  IF v_inv.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este convite já foi utilizado ou cancelado.');
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.organization_invitations SET status = 'expired' WHERE id = v_inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Este convite expirou.');
  END IF;

  v_membership_id := 'mem-' || gen_random_uuid()::text;

  INSERT INTO public.user_memberships (
    id, user_id, organization_id, team_id, role, status, created_at, updated_at
  ) VALUES (
    v_membership_id, v_caller_id, v_inv.organization_id, v_inv.team_id, v_inv.role, 'active', now(), now()
  );

  UPDATE public.organization_invitations
  SET status = 'accepted', used_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'ok', true,
    'membership_id', v_membership_id,
    'organization_id', v_inv.organization_id,
    'role', v_inv.role
  );
END;
$$;

-- 7. RLS nas Tabelas Envolvidas
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_invitations_admin_organizer_all ON public.organization_invitations;
CREATE POLICY org_invitations_admin_organizer_all
ON public.organization_invitations
TO authenticated
USING (is_admin_or_organizer())
WITH CHECK (is_admin_or_organizer());

-- Funções auxiliares SECURITY DEFINER para evitar recursão infinita de RLS em user_memberships
CREATE OR REPLACE FUNCTION public.is_org_admin_of(p_org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member_or_manager(p_org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'team_manager')
      AND status = 'active'
  );
$$;

DROP POLICY IF EXISTS org_invitations_org_admin_select ON public.organization_invitations;
CREATE POLICY org_invitations_org_admin_select
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (
  public.is_org_member_or_manager(organization_id)
);

DROP POLICY IF EXISTS org_invitations_org_admin_modify ON public.organization_invitations;
CREATE POLICY org_invitations_org_admin_modify
ON public.organization_invitations
FOR ALL
TO authenticated
USING (
  public.is_org_admin_of(organization_id)
)
WITH CHECK (
  public.is_org_admin_of(organization_id)
);

-- Leitura de membros pelo Org Admin (usando helper sem recursão)
DROP POLICY IF EXISTS user_memberships_org_admin_read ON public.user_memberships;
CREATE POLICY user_memberships_org_admin_read
ON public.user_memberships
FOR SELECT
TO authenticated
USING (
  public.is_org_admin_of(organization_id)
);

-- 8. Concessão de Privilégios Controlados
REVOKE ALL ON TABLE public.organization_invitations FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_invitations TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_organization_invitation(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_invitation(text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(text) TO authenticated, service_role;
