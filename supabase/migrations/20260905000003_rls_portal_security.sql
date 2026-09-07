-- BaseOS — Blindagem e restrição de RLS para a cadeia completa do portal da equipe (Fase 3.2)
-- Cadeia de autorização protegida:
-- auth.uid() -> profiles.id -> profiles.competition_team_id -> competition_teams.id -> competition_athletes.competition_team_id

-- ============================================================================
-- 1. PROFILES: Defesa contra escalação de privilégio e sequestro de equipe
-- ============================================================================

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

-- Organizadores e administradores possuem gestão irrestrita de perfis
CREATE POLICY "profiles_organizer_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  );

-- Usuários de equipe podem atualizar somente o próprio perfil, sem alterar role ou competition_team_id
CREATE POLICY "profiles_team_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND competition_team_id IS NOT DISTINCT FROM (SELECT p.competition_team_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ============================================================================
-- 2. COMPETITION_TEAMS: Restrição da inscrição por equipe
-- ============================================================================

DROP POLICY IF EXISTS "competition_teams_auth_write" ON public.competition_teams;

-- Organizadores e administradores podem gerenciar todas as inscrições
CREATE POLICY "competition_teams_organizer_all" ON public.competition_teams
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  );

-- Equipe: pode atualizar somente o seu próprio registro, e somente se:
--  - não estiver travada (is_locked = false)
--  - prazo válido (registration_deadline > now())
--  - ciclo de vida da competição permite inscrições (registration-open ou registration)
CREATE POLICY "competition_teams_team_update" ON public.competition_teams
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT competition_team_id FROM public.profiles WHERE id = auth.uid())
    AND is_locked = false
    AND registration_deadline > now()
    AND EXISTS (
      SELECT 1 FROM public.competitions c
      WHERE c.id = competition_id
        AND c.status IN ('registration-open', 'registration')
    )
  )
  WITH CHECK (
    id = (SELECT competition_team_id FROM public.profiles WHERE id = auth.uid())
    AND is_locked = false
    AND registration_deadline > now()
    AND EXISTS (
      SELECT 1 FROM public.competitions c
      WHERE c.id = competition_id
        AND c.status IN ('registration-open', 'registration')
    )
  );

-- ============================================================================
-- 3. COMPETITION_ATHLETES: Restrição de elenco por equipe e lifecycle
-- ============================================================================

DROP POLICY IF EXISTS "competition_athletes_auth_write" ON public.competition_athletes;

-- Organizadores e administradores podem gerenciar todos os atletas
CREATE POLICY "competition_athletes_organizer_all" ON public.competition_athletes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  );

-- Equipe: pode criar, editar ou excluir atletas apenas no seu próprio elenco
-- e somente se a inscrição e o ciclo de vida permitirem mutação
CREATE POLICY "competition_athletes_team_write" ON public.competition_athletes
  FOR ALL TO authenticated
  USING (
    competition_team_id = (SELECT competition_team_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.competition_teams ct
      JOIN public.competitions c ON c.id = ct.competition_id
      WHERE ct.id = competition_team_id
        AND ct.is_locked = false
        AND ct.registration_deadline > now()
        AND c.status IN ('registration-open', 'registration')
    )
  )
  WITH CHECK (
    competition_team_id = (SELECT competition_team_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.competition_teams ct
      JOIN public.competitions c ON c.id = ct.competition_id
      WHERE ct.id = competition_team_id
        AND ct.is_locked = false
        AND ct.registration_deadline > now()
        AND c.status IN ('registration-open', 'registration')
    )
  );

-- ============================================================================
-- 4. PROFILES: Trigger de defesa em profundidade contra alteração de role/equipe
-- ============================================================================

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

  -- Se houve tentativa de alteração, verifica se o usuário autenticado é admin ou organizer
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IN ('organizer', 'admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Acesso negado: usuários de equipe não têm permissão para alterar cargo (role) ou vínculo de equipe (competition_team_id).';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_profile_sensitive_fields();

