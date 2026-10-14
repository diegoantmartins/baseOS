-- ============================================================================
-- BaseOS — Correção de RLS e Autorização de Registro de Atletas no Portal
-- ============================================================================
-- Resolve:
-- 1. "Failed to load resource: 403 (Forbidden) - POST /rest/v1/athletes"
-- 2. "Falha ao criar atleta: [42501] new row violates row-level security policy for table athletes"
--
-- Causa:
-- As políticas de INSERT em public.athletes e public.competition_athletes
-- restringiam escrita estritamente a is_org_admin_or_organizer / is_admin_or_organizer
-- ou apenas checavam profiles.competition_team_id legado, bloqueando dirigentes
-- com papel 'team_manager' ativo em user_memberships e gerando violação 42501.
-- ============================================================================

BEGIN;

-- 1. Políticas RLS para public.athletes
-- Permitir que membros com role 'team_manager' ativo na organização possam registrar
-- e manter atletas para sua organização.
DROP POLICY IF EXISTS "athletes_team_manager_insert" ON public.athletes;
CREATE POLICY "athletes_team_manager_insert" ON public.athletes
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_admin_or_organizer(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.organization_id = athletes.organization_id
        AND um.user_id = auth.uid()
        AND um.role = 'team_manager'
        AND um.status = 'active'
    )
  );

DROP POLICY IF EXISTS "athletes_team_manager_update" ON public.athletes;
CREATE POLICY "athletes_team_manager_update" ON public.athletes
  FOR UPDATE TO authenticated
  USING (
    is_org_admin_or_organizer(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.organization_id = athletes.organization_id
        AND um.user_id = auth.uid()
        AND um.role = 'team_manager'
        AND um.status = 'active'
    )
  )
  WITH CHECK (
    is_org_admin_or_organizer(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.organization_id = athletes.organization_id
        AND um.user_id = auth.uid()
        AND um.role = 'team_manager'
        AND um.status = 'active'
    )
  );

-- 2. Políticas RLS para public.competition_athletes
-- Expandir autorização do gestor da equipe para contemplar tanto profiles legado
-- quanto user_memberships ativo (por competition_team_id ou team_id).
DROP POLICY IF EXISTS "competition_athletes_team_write" ON public.competition_athletes;
CREATE POLICY "competition_athletes_team_write" ON public.competition_athletes
  FOR ALL TO authenticated
  USING (
    (
      -- Vínculo via perfil legado
      competition_team_id = (SELECT profiles.competition_team_id FROM profiles WHERE profiles.id = auth.uid())
      -- OU Vínculo via user_memberships ativa (modelo multi-tenant)
      OR EXISTS (
        SELECT 1 FROM public.user_memberships um
        JOIN public.competition_teams ct ON ct.id = competition_athletes.competition_team_id
        WHERE um.user_id = auth.uid()
          AND um.status = 'active'
          AND (
            um.competition_team_id = competition_athletes.competition_team_id
            OR um.team_id = ct.team_id
          )
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.competition_teams ct
      JOIN public.competitions c ON c.id = ct.competition_id
      WHERE ct.id = competition_athletes.competition_team_id
        AND ct.is_locked = false
        AND ct.registration_deadline > now()
        AND c.status IN ('registration-open', 'registration')
    )
  )
  WITH CHECK (
    (
      competition_team_id = (SELECT profiles.competition_team_id FROM profiles WHERE profiles.id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_memberships um
        JOIN public.competition_teams ct ON ct.id = competition_athletes.competition_team_id
        WHERE um.user_id = auth.uid()
          AND um.status = 'active'
          AND (
            um.competition_team_id = competition_athletes.competition_team_id
            OR um.team_id = ct.team_id
          )
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.competition_teams ct
      JOIN public.competitions c ON c.id = ct.competition_id
      WHERE ct.id = competition_athletes.competition_team_id
        AND ct.is_locked = false
        AND ct.registration_deadline > now()
        AND c.status IN ('registration-open', 'registration')
    )
  );

-- Registrar migration
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES ('20261009220000', ARRAY['fix_athlete_registration_rls_and_memberships'], 'fix_athlete_registration_rls_and_memberships')
ON CONFLICT (version) DO UPDATE
  SET statements = EXCLUDED.statements, name = EXCLUDED.name;

COMMIT;

NOTIFY pgrst, 'reload schema';
