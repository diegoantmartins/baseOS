-- Migration: 20261013214500_harden_p2_rls_multi_tenant.sql
-- Objetivo: Endurecimento de segurança multi-tenant (P2)
-- Substitui a chamada legada is_admin_or_organizer() por is_org_admin_or_organizer(organization_id)
-- nas tabelas public.teams e public.user_memberships.

BEGIN;

-- 1. teams_manager_delete
DROP POLICY IF EXISTS "teams_manager_delete" ON public.teams;

CREATE POLICY "teams_manager_delete" ON public.teams
FOR DELETE
USING (
  (
    public.is_org_admin_or_organizer(organization_id)
    OR (
      EXISTS (
        SELECT 1 FROM public.user_memberships um
        WHERE um.user_id = auth.uid()
          AND um.status = 'active'
          AND (
            um.team_id = teams.id
            OR EXISTS (
              SELECT 1 FROM public.competition_teams ct
              WHERE ct.id = um.competition_team_id
                AND ct.team_id = teams.id
            )
          )
      )
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.team_a_id = teams.id OR m.team_b_id = teams.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.competition_teams ct
    WHERE ct.team_id = teams.id
  )
);

-- 2. teams_manager_update
DROP POLICY IF EXISTS "teams_manager_update" ON public.teams;

CREATE POLICY "teams_manager_update" ON public.teams
FOR UPDATE
USING (
  public.is_org_admin_or_organizer(organization_id)
  OR EXISTS (
    SELECT 1 FROM public.user_memberships um
    WHERE um.user_id = auth.uid()
      AND um.status = 'active'
      AND (
        um.team_id = teams.id
        OR EXISTS (
          SELECT 1 FROM public.competition_teams ct
          WHERE ct.id = um.competition_team_id
            AND ct.team_id = teams.id
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.competition_teams ct ON ct.id = p.competition_team_id
    WHERE p.id = auth.uid()
      AND ct.team_id = teams.id
  )
)
WITH CHECK (
  public.is_org_admin_or_organizer(organization_id)
  OR EXISTS (
    SELECT 1 FROM public.user_memberships um
    WHERE um.user_id = auth.uid()
      AND um.status = 'active'
      AND (
        um.team_id = teams.id
        OR EXISTS (
          SELECT 1 FROM public.competition_teams ct
          WHERE ct.id = um.competition_team_id
            AND ct.team_id = teams.id
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.competition_teams ct ON ct.id = p.competition_team_id
    WHERE p.id = auth.uid()
      AND ct.team_id = teams.id
  )
);

-- 3. user_memberships_admin_organizer_all
DROP POLICY IF EXISTS "user_memberships_admin_organizer_all" ON public.user_memberships;

CREATE POLICY "user_memberships_admin_organizer_all" ON public.user_memberships
FOR ALL
USING (
  public.is_org_admin_or_organizer(organization_id)
)
WITH CHECK (
  public.is_org_admin_or_organizer(organization_id)
);

COMMIT;
