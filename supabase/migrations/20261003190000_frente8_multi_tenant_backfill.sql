-- ============================================================================
-- BaseOS — Frente 8: Backfill Multi-Tenant e Isolamento de Dados
-- Migration: 20261003190000_frente8_multi_tenant_backfill.sql
-- ============================================================================
--
-- Objetivos:
-- 1. Criação e Backfill Idempotente da Organização Primária ('VOLTZ').
-- 2. Adição da coluna organization_id com FK para organizations nas tabelas
--    venues, referees, athletes e profiles.
-- 3. Backfill controlado de organization_id para 'VOLTZ' em todos os registros
--    legados das tabelas: competitions, teams, profiles, venues, referees e athletes.
-- 4. Aplicação de NOT NULL na coluna organization_id em todas essas tabelas.
-- 5. Criação da função utilitária public.is_org_member(org_id UUID) (com sobrecarga para TEXT).
-- 6. Criação da função utilitária public.is_org_admin_or_organizer(org_id UUID/TEXT).
-- 7. Reescrever políticas RLS de escrita (INSERT, UPDATE, DELETE) em competitions,
--    teams e athletes, vinculando a autorização estritamente a ser membro
--    administrativo/organizador da respectiva organização (eliminando is_admin_or_organizer()).
-- 8. Atualizar RLS de venues e referees para o mesmo padrão multi-tenant estrito.
-- 9. Fechamento seguro do acesso a profiles via can_read_profile, lendo
--    exclusivamente afiliações em user_memberships (depreciando competition_team_id).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ORGANIZAÇÃO PRIMÁRIA ('VOLTZ') E ADIÇÃO DE COLUNAS
-- ----------------------------------------------------------------------------

-- 1.0 Tabelas multi-tenant estruturais (idempotente)
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  legal_name TEXT,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.athletes (
  id TEXT PRIMARY KEY,
  normalized_cpf TEXT,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  birth_date DATE,
  organization_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.1 Inserção idempotente da organização primária VOLTZ
DO $$
DECLARE
  v_voltz_id text;
BEGIN
  -- Busca organização existente com nome 'VOLTZ'
  SELECT id INTO v_voltz_id
  FROM public.organizations
  WHERE upper(name) = 'VOLTZ'
  LIMIT 1;

  -- Se não existir, insere com UUID canônico determinístico
  IF v_voltz_id IS NULL THEN
    v_voltz_id := 'a0000000-0000-0000-0000-000000000001';
    INSERT INTO public.organizations (id, name, legal_name, status, created_at, updated_at)
    VALUES (
      v_voltz_id,
      'VOLTZ',
      'Voltz Sports & Eventos',
      'active',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          updated_at = now();
  END IF;
END $$;

-- 1.2 Adição da coluna organization_id nas tabelas que ainda não a possuem
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS organization_id text
    REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.referees
  ADD COLUMN IF NOT EXISTS organization_id text
    REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS organization_id text
    REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id text
    REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- ----------------------------------------------------------------------------
-- 2. BACKFILL CONTROLADO DOS REGISTROS LEGADOS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_voltz_id text;
BEGIN
  -- Recupera o ID canônico da VOLTZ
  SELECT id INTO v_voltz_id
  FROM public.organizations
  WHERE upper(name) = 'VOLTZ' OR id = 'a0000000-0000-0000-0000-000000000001'
  ORDER BY (id = 'a0000000-0000-0000-0000-000000000001') DESC
  LIMIT 1;

  IF v_voltz_id IS NULL THEN
    RAISE EXCEPTION 'Organização VOLTZ não encontrada para backfill.';
  END IF;

  -- 2.1 Backfill em competitions
  UPDATE public.competitions
  SET organization_id = v_voltz_id
  WHERE organization_id IS NULL;

  -- 2.2 Backfill em teams
  UPDATE public.teams
  SET organization_id = v_voltz_id
  WHERE organization_id IS NULL;

  -- 2.3 Backfill em profiles
  UPDATE public.profiles
  SET organization_id = v_voltz_id
  WHERE organization_id IS NULL;

  -- 2.4 Backfill em venues
  UPDATE public.venues
  SET organization_id = v_voltz_id
  WHERE organization_id IS NULL;

  -- 2.5 Backfill em referees
  UPDATE public.referees
  SET organization_id = v_voltz_id
  WHERE organization_id IS NULL;

  -- 2.6 Backfill em athletes
  UPDATE public.athletes
  SET organization_id = v_voltz_id
  WHERE organization_id IS NULL;

  -- 2.7 Backfill preventivo de user_memberships para perfis vinculados à VOLTZ
  -- Garante acesso imediato de organizadores e administradores legados
  INSERT INTO public.user_memberships (
    id,
    user_id,
    organization_id,
    role,
    status,
    created_at,
    updated_at
  )
  SELECT
    'mem-voltz-' || p.id::text,
    p.id,
    v_voltz_id,
    CASE
      WHEN p.role::text = 'admin' THEN 'admin'
      WHEN p.role::text = 'organizer' THEN 'organizer'
      WHEN p.role::text = 'referee' THEN 'referee'
      ELSE 'team_manager'
    END,
    'active',
    now(),
    now()
  FROM public.profiles p
  WHERE p.organization_id = v_voltz_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.user_id = p.id AND um.organization_id = v_voltz_id
    );
END $$;

-- ----------------------------------------------------------------------------
-- 3. APLICAÇÃO DE RESTRIÇÃO NOT NULL E ÍNDICES OPERACIONAIS
-- ----------------------------------------------------------------------------

ALTER TABLE public.competitions
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.teams
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.venues
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.referees
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.athletes
  ALTER COLUMN organization_id SET NOT NULL;

-- Índices de performance para isolamento de tenant
CREATE INDEX IF NOT EXISTS idx_competitions_org_id ON public.competitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON public.teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_venues_org_id ON public.venues(organization_id);
CREATE INDEX IF NOT EXISTS idx_referees_org_id ON public.referees(organization_id);
CREATE INDEX IF NOT EXISTS idx_athletes_org_id ON public.athletes(organization_id);

-- ----------------------------------------------------------------------------
-- 4. FUNÇÕES UTILITÁRIAS DE SEGURANÇA MULTI-TENANT (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- 4.1 is_org_member(org_id UUID) e sobrecarga para TEXT
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE organization_id = org_id::text
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_org_member(uuid) IS
  'Verifica se o usuário autenticado possui vínculo ativo na tabela user_memberships para a organização solicitada.';
COMMENT ON FUNCTION public.is_org_member(text) IS
  'Sobrecarga em TEXT para compatibilidade direta com chaves organizacionais de string/UUID.';

-- 4.2 is_org_admin_or_organizer(p_org_id) para controle de escrita
CREATE OR REPLACE FUNCTION public.is_org_admin_or_organizer(p_org_id text)
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
      AND role IN ('admin', 'organizer')
      AND status = 'active'
  );
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
  'Valida se o usuário autenticado é membro ativo com papel administrativo (admin ou organizer) da organização.';

-- ----------------------------------------------------------------------------
-- 5. REESCRITA DAS POLÍTICAS DE ESCRITA (competitions, teams, athletes)
-- ----------------------------------------------------------------------------

-- 5.1 competitions: remoção da checagem global e aplicação de escopo estrito por organização
DROP POLICY IF EXISTS "competitions_admin_organizer_all" ON public.competitions;
DROP POLICY IF EXISTS "competitions_auth_write" ON public.competitions;
DROP POLICY IF EXISTS "competitions_org_admin_insert" ON public.competitions;
DROP POLICY IF EXISTS "competitions_org_admin_update" ON public.competitions;
DROP POLICY IF EXISTS "competitions_org_admin_delete" ON public.competitions;

CREATE POLICY "competitions_org_admin_insert" ON public.competitions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin_or_organizer(organization_id)
  );

CREATE POLICY "competitions_org_admin_update" ON public.competitions
  FOR UPDATE TO authenticated
  USING (
    public.is_org_admin_or_organizer(organization_id)
  )
  WITH CHECK (
    public.is_org_admin_or_organizer(organization_id)
  );

CREATE POLICY "competitions_org_admin_delete" ON public.competitions
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin_or_organizer(organization_id)
  );

-- 5.2 teams: remoção da checagem global e aplicação de escopo estrito por organização
DROP POLICY IF EXISTS "teams_admin_organizer_all" ON public.teams;
DROP POLICY IF EXISTS "teams_auth_write" ON public.teams;
DROP POLICY IF EXISTS "teams_org_admin_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_org_admin_update" ON public.teams;
DROP POLICY IF EXISTS "teams_org_admin_delete" ON public.teams;

CREATE POLICY "teams_org_admin_insert" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin_or_organizer(organization_id)
  );

CREATE POLICY "teams_org_admin_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    public.is_org_admin_or_organizer(organization_id)
  )
  WITH CHECK (
    public.is_org_admin_or_organizer(organization_id)
  );

CREATE POLICY "teams_org_admin_delete" ON public.teams
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin_or_organizer(organization_id)
  );

-- 5.3 athletes: remoção da checagem global e aplicação de escopo estrito por organização
DROP POLICY IF EXISTS "athletes_admin_organizer_all" ON public.athletes;
DROP POLICY IF EXISTS "athletes_org_admin_insert" ON public.athletes;
DROP POLICY IF EXISTS "athletes_org_admin_update" ON public.athletes;
DROP POLICY IF EXISTS "athletes_org_admin_delete" ON public.athletes;

CREATE POLICY "athletes_org_admin_insert" ON public.athletes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin_or_organizer(organization_id)
  );

CREATE POLICY "athletes_org_admin_update" ON public.athletes
  FOR UPDATE TO authenticated
  USING (
    public.is_org_admin_or_organizer(organization_id)
  )
  WITH CHECK (
    public.is_org_admin_or_organizer(organization_id)
  );

CREATE POLICY "athletes_org_admin_delete" ON public.athletes
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin_or_organizer(organization_id)
  );

-- Leitura de athletes: membros da organização ou dirigentes de equipe com elenco vinculado
DROP POLICY IF EXISTS "athletes_read_scoped_or_admin" ON public.athletes;
CREATE POLICY "athletes_read_scoped_or_admin" ON public.athletes
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.competition_athletes ca
      JOIN public.user_memberships um ON um.user_id = auth.uid() AND um.status = 'active'
      WHERE ca.athlete_id = athletes.id
        AND (
          (um.competition_team_id IS NOT NULL AND ca.competition_team_id = um.competition_team_id)
          OR (um.team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.competition_teams ct
            WHERE ct.id = ca.competition_team_id AND ct.team_id = um.team_id
          ))
        )
    )
  );

-- 5.4 venues & referees: alinhamento com isolamento estrito por organização
DROP POLICY IF EXISTS "venues_admin_organizer_all" ON public.venues;
DROP POLICY IF EXISTS "venues_auth_write" ON public.venues;
DROP POLICY IF EXISTS "venues_org_admin_insert" ON public.venues;
DROP POLICY IF EXISTS "venues_org_admin_update" ON public.venues;
DROP POLICY IF EXISTS "venues_org_admin_delete" ON public.venues;

CREATE POLICY "venues_org_admin_insert" ON public.venues
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin_or_organizer(organization_id));

CREATE POLICY "venues_org_admin_update" ON public.venues
  FOR UPDATE TO authenticated
  USING (public.is_org_admin_or_organizer(organization_id))
  WITH CHECK (public.is_org_admin_or_organizer(organization_id));

CREATE POLICY "venues_org_admin_delete" ON public.venues
  FOR DELETE TO authenticated
  USING (public.is_org_admin_or_organizer(organization_id));

DROP POLICY IF EXISTS "referees_admin_organizer_all" ON public.referees;
DROP POLICY IF EXISTS "referees_auth_write" ON public.referees;
DROP POLICY IF EXISTS "referees_org_admin_insert" ON public.referees;
DROP POLICY IF EXISTS "referees_org_admin_update" ON public.referees;
DROP POLICY IF EXISTS "referees_org_admin_delete" ON public.referees;

CREATE POLICY "referees_org_admin_insert" ON public.referees
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin_or_organizer(organization_id));

CREATE POLICY "referees_org_admin_update" ON public.referees
  FOR UPDATE TO authenticated
  USING (public.is_org_admin_or_organizer(organization_id))
  WITH CHECK (public.is_org_admin_or_organizer(organization_id));

CREATE POLICY "referees_org_admin_delete" ON public.referees
  FOR DELETE TO authenticated
  USING (public.is_org_admin_or_organizer(organization_id));

-- ----------------------------------------------------------------------------
-- 6. PROTEÇÃO E ISOLAMENTO DE PROFILES (DEPRECIAÇÃO DE competition_team_id)
-- ----------------------------------------------------------------------------

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

  -- 2. Próprio usuário sempre tem acesso ao próprio perfil
  IF v_caller_id = p_target_profile_id THEN
    RETURN true;
  END IF;

  -- 3. Acesso baseado EXCLUSIVAMENTE em user_memberships (depreciando competition_team_id)
  -- 3.1 Usuários que compartilham organização ativa via user_memberships
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

  -- 3.2 Gestores administrativos da organização proprietária do perfil alvo
  IF EXISTS (
    SELECT 1
    FROM public.user_memberships m_caller
    JOIN public.profiles target_p ON target_p.organization_id = m_caller.organization_id
    WHERE m_caller.user_id = v_caller_id
      AND target_p.id = p_target_profile_id
      AND m_caller.role IN ('admin', 'organizer')
      AND m_caller.status = 'active'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_read_profile(uuid, text) IS
  'Avalia leitura de perfis de forma segura e contextual, lendo exclusivamente as afiliações em user_memberships e depreciando o campo legado competition_team_id.';

DROP POLICY IF EXISTS "profiles_read_own_or_tenant" ON public.profiles;
CREATE POLICY "profiles_read_own_or_tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.can_read_profile(id)
  );

COMMIT;
