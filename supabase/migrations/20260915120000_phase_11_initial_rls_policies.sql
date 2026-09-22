-- BaseOS — Fase 11.3: Policies RLS Iniciais para a Fundação de Identidade
--
-- Tabelas afetadas:
--   - public.user_memberships
--   - public.organizations
--   - public.athletes
--
-- Princípios de segurança e conformidade arquitetural:
--   1. PROIBIÇÃO DE SELECT GLOBAL IRRESTRITO: Identidades globais (athletes)
--      e memberships contêm dados sensíveis (CPFs normalizados, vínculos de acesso,
--      datas de nascimento). Nenhuma policy permissiva de leitura irrestrita é admitida.
--   2. ISOLAMENTO DE TENANCY & MEMBERSHIP:
--      - Usuário só lê as suas próprias memberships (auth.uid() = user_id) ou se for admin/organizer.
--      - Escrita em memberships é restrita a admin/organizer (impede elevação de privilégio).
--   3. ESCOPO DE LEITURA DE ATLETAS:
--      - Dirigentes de equipe só leem atletas associados ao elenco de sua equipe (via
--        competition_athletes e perfis/memberships correspondentes).
--      - admin/organizer possuem leitura operacional completa.
--      - Escrita direta em athletes permanece restrita a admin/organizer nesta fase.
--        O vínculo em fluxo de auto-inscrição de equipe será liberado via RPC controlada na Fase 11.4.
--   4. ESCOPO DE LEITURA DE ORGANIZAÇÕES:
--      - Usuários autenticados só visualizam organizações às quais possuem vínculo ativo/pendente
--        ou através de equipes/competições vinculadas.
--      - admin/organizer possuem gestão e leitura total.
--   5. SERVICE_ROLE:
--      - As policies especificam "TO authenticated". A role service_role do Supabase
--        possui atributo BYPASSRLS no PostgreSQL e continuará com acesso total a scripts
--        administrativos, triggers, RPCs e migrations.

-- ============================================================================
-- 1. USER_MEMBERSHIPS
-- ============================================================================

DROP POLICY IF EXISTS "user_memberships_read_own_or_admin" ON public.user_memberships;
DROP POLICY IF EXISTS "user_memberships_admin_organizer_all" ON public.user_memberships;

-- Leitura: o próprio usuário pode consultar suas memberships; admin e organizer leem todas
CREATE POLICY "user_memberships_read_own_or_admin" ON public.user_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_organizer()
  );

-- Escrita (INSERT, UPDATE, DELETE): estritamente reservada a admin e organizer
CREATE POLICY "user_memberships_admin_organizer_all" ON public.user_memberships
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ============================================================================
-- 2. ORGANIZATIONS
-- ============================================================================

DROP POLICY IF EXISTS "organizations_read_scoped_or_admin" ON public.organizations;
DROP POLICY IF EXISTS "organizations_admin_organizer_all" ON public.organizations;

-- Leitura: admin/organizer ou membros que possuam vínculo comprovado com a organização
CREATE POLICY "organizations_read_scoped_or_admin" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_organizer()
    OR EXISTS (
      SELECT 1 FROM public.user_memberships um
      WHERE um.organization_id = organizations.id
        AND um.user_id = auth.uid()
        AND um.status IN ('active', 'pending')
    )
    OR EXISTS (
      SELECT 1 FROM public.competitions c
      JOIN public.competition_teams ct ON ct.competition_id = c.id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.organization_id = organizations.id
        AND ct.id = p.competition_team_id
    )
  );

-- Escrita: exclusiva de admin/organizer
CREATE POLICY "organizations_admin_organizer_all" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());

-- ============================================================================
-- 3. ATHLETES
-- ============================================================================

DROP POLICY IF EXISTS "athletes_read_scoped_or_admin" ON public.athletes;
DROP POLICY IF EXISTS "athletes_admin_organizer_all" ON public.athletes;

-- Leitura: admin/organizer OU usuário de equipe cujo elenco contenha a participação do atleta
CREATE POLICY "athletes_read_scoped_or_admin" ON public.athletes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_organizer()
    -- Vínculo via perfil legado (profiles.competition_team_id)
    OR EXISTS (
      SELECT 1 FROM public.competition_athletes ca
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ca.athlete_id = athletes.id
        AND ca.competition_team_id = p.competition_team_id
    )
    -- Vínculo via user_memberships
    OR EXISTS (
      SELECT 1 FROM public.competition_athletes ca
      JOIN public.user_memberships um ON um.user_id = auth.uid() AND um.status IN ('active', 'pending')
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

-- Escrita direta: restrita a admin/organizer nesta fase.
-- O registro e vínculo de atletas em lote pelo gestor de equipe será operado
-- através de RPC dedicada na Fase 11.4 para garantir integridade e unicidade de CPF.
CREATE POLICY "athletes_admin_organizer_all" ON public.athletes
  FOR ALL TO authenticated
  USING (public.is_admin_or_organizer())
  WITH CHECK (public.is_admin_or_organizer());
