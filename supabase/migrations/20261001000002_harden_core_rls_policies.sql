-- ============================================================================
-- BaseOS — Remediação P0: Hardening de Políticas RLS e RPCs Transacionais
-- Migration: 20261001000002_harden_core_rls_policies.sql
-- ============================================================================
--
-- Contexto:
-- A auditoria forense identificou políticas excessivamente permissivas herdadas
-- do modelo de desenvolvimento mono-tenant e brechas de autorização em funções SECURITY DEFINER:
--   1. app_settings: UPDATE permitido a qualquer usuário autenticado (USING (true)).
--   2. audit_logs: INSERT e SELECT concedidos publicamente com USING (true) / WITH CHECK (true).
--   3. profiles: profiles_public_read vazando nomes, e-mails e papéis de todos os usuários.
--   4. save_stage_draw_and_slots (SEC-04): Bypass de checagem quando competitions.organizer_id IS NULL.
--
-- Objetivos desta migration:
-- 1. Restringir UPDATE em app_settings exclusivamente a administradores da plataforma.
-- 2. Restringir INSERT em audit_logs a autenticados e SELECT a administradores e organizadores.
-- 3. Substituir profiles_public_read por política contextual de isolamento por tenant:
--      - Próprio perfil (auth.uid() = id);
--      - Perfis da mesma equipe de competição (competition_team_id);
--      - Perfis da mesma organização (via user_memberships);
--      - Perfis acessíveis por administradores e organizadores do sistema.
--    * Implementado via helper SECURITY DEFINER para evitar recursão infinita no RLS.
-- 4. Atualizar save_stage_draw_and_slots exigindo vínculo estrito de propriedade
--    quando invocado por perfil 'organizer', rejeitando competições sem proprietário.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA: app_settings (Configurações da Aplicação)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "app_settings authenticated update" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_admin_update" ON public.app_settings;

CREATE POLICY "app_settings_admin_update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

COMMENT ON POLICY "app_settings_admin_update" ON public.app_settings IS
  'Permite modificação das configurações globais exclusivamente para administradores da plataforma.';

-- ----------------------------------------------------------------------------
-- 2. TABELA: audit_logs (Trilha de Auditoria Operacional)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura de audit_logs para autenticados e organizadores" ON public.audit_logs;
DROP POLICY IF EXISTS "Permitir leitura de audit_logs para autenticados e organizadore" ON public.audit_logs;
DROP POLICY IF EXISTS "Permitir inserção de audit_logs para autenticados e sistema" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;

-- Inserção restrita a usuários autenticados (ou via service_role / triggers)
CREATE POLICY "audit_logs_authenticated_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Leitura restrita a administradores e organizadores
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text IN ('admin', 'organizer')
    )
  );

COMMENT ON POLICY "audit_logs_authenticated_insert" ON public.audit_logs IS
  'Restringe a gravação de logs a usuários autenticados no sistema.';
COMMENT ON POLICY "audit_logs_admin_select" ON public.audit_logs IS
  'Restringe a leitura de logs de auditoria exclusivamente a perfis de gestão (admin/organizer).';

-- ----------------------------------------------------------------------------
-- 3. TABELA: profiles (Perfis de Usuário e Isolamento de Tenant)
-- ----------------------------------------------------------------------------

-- Helper SECURITY DEFINER para verificar autorização de leitura de perfis
-- sem incorrer em recursão infinita nas políticas RLS de public.profiles.
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
  v_caller_role text;
  v_caller_team_id text;
BEGIN
  v_caller_id := auth.uid();

  -- 3.1. Requer autenticação
  IF v_caller_id IS NULL THEN
    RETURN false;
  END IF;

  -- 3.2. Próprio usuário sempre tem acesso ao próprio perfil
  IF v_caller_id = p_target_profile_id THEN
    RETURN true;
  END IF;

  -- 3.3. Obtém dados do chamador (bypassa RLS de profiles por ser SECURITY DEFINER)
  SELECT role::text, competition_team_id
  INTO v_caller_role, v_caller_team_id
  FROM public.profiles
  WHERE id = v_caller_id;

  -- 3.4. Administradores e Organizadores possuem visão ampla de gestão
  IF v_caller_role IN ('admin', 'organizer') THEN
    RETURN true;
  END IF;

  -- 3.5. Compartilhamento de mesma equipe de competição (vínculo legado)
  IF p_target_competition_team_id IS NOT NULL AND v_caller_team_id IS NOT NULL THEN
    IF p_target_competition_team_id = v_caller_team_id THEN
      RETURN true;
    END IF;
  END IF;

  -- 3.6. Compartilhamento de mesma organização via user_memberships (Fase 11 / Fase 12)
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

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_read_profile(uuid, text) IS
  'Avalia com segurança anti-recursão se o usuário autenticado pode ler o perfil alvo (próprio perfil, mesmo time, mesma organização ou gestão).';

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own_or_tenant" ON public.profiles;

CREATE POLICY "profiles_read_own_or_tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.can_read_profile(id, competition_team_id)
  );

COMMENT ON POLICY "profiles_read_own_or_tenant" ON public.profiles IS
  'Garante isolamento de leitura de perfis: próprio perfil, mesmo time, mesma organização ou gestão.';

-- ----------------------------------------------------------------------------
-- 4. RPC TRANSACIONAL: save_stage_draw_and_slots (Fechamento da Brecha SEC-04)
-- ----------------------------------------------------------------------------
-- Atualiza a função canônica para eliminar o bypass quando competitions.organizer_id é NULL.
-- Organizadores só podem manipular competições que expressamente lhes pertencem.

CREATE OR REPLACE FUNCTION public.save_stage_draw_and_slots(
  p_competition_id TEXT,
  p_stage JSONB,
  p_rounds JSONB,
  p_slots JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_uid UUID;
  v_user_role TEXT;
  v_is_service_role BOOLEAN;
  v_comp_id TEXT;
  v_comp_organizer_id UUID;

  -- Stage vars
  v_stage_id TEXT;
  v_stage_name TEXT;
  v_stage_order INT;
  v_stage_type TEXT;
  v_stage_status TEXT;
  v_stage_locked BOOLEAN;
  v_stage_metadata JSONB;
  v_stage_row_id TEXT;

  -- Round iteration vars
  v_round_elem JSONB;
  v_round_id TEXT;
  v_round_name TEXT;
  v_round_order INT;
  v_round_slots_count INT;
  v_round_status TEXT;
  v_round_row_id TEXT;
  v_rounds_count INT := 0;

  -- Slot iteration vars
  v_slot_elem JSONB;
  v_slot_id TEXT;
  v_slot_round_id TEXT;
  v_slot_round_row_id TEXT;
  v_slot_position INT;
  v_slot_label TEXT;
  v_slot_part_a_ref JSONB;
  v_slot_part_a_status TEXT;
  v_slot_resolved_team_a TEXT;
  v_slot_part_b_ref JSONB;
  v_slot_part_b_status TEXT;
  v_slot_resolved_team_b TEXT;
  v_slot_match_id TEXT;
  v_slot_prog_route JSONB;
  v_slot_row_id TEXT;
  v_slots_count INT := 0;

  -- Temporary mapping table for round logical ID to row ID
  v_round_mapping JSONB := '{}'::JSONB;
BEGIN
  -- 4.1. Autorização: service_role de infraestrutura OU organizador/administrador autenticado
  v_caller_role := auth.jwt()->>'role';
  v_caller_uid := COALESCE(auth.uid(), NULLIF(auth.jwt()->>'sub', '')::UUID);
  v_is_service_role := (v_caller_role = 'service_role' AND v_caller_uid IS NULL);

  IF NOT v_is_service_role THEN
    IF v_caller_uid IS NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Autenticação obrigatória para persistir sorteios de estágio'
        USING ERRCODE = '42501';
    END IF;

    SELECT role::text INTO v_user_role
    FROM public.profiles
    WHERE id = v_caller_uid;

    IF v_user_role IS NULL OR v_user_role NOT IN ('organizer', 'admin') THEN
      RAISE EXCEPTION 'FORBIDDEN: Apenas organizadores e administradores podem persistir sorteios de estágio'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 4.2. Lock Pessimista de Competição (Serialização ACID) e Checagem Estrita de Ownership
  SELECT id, organizer_id INTO v_comp_id, v_comp_organizer_id
  FROM public.competitions
  WHERE id = p_competition_id
  FOR UPDATE;

  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Competição % não encontrada', p_competition_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Remediação SEC-04:
  -- Se for organizador comum (não admin e não service_role), exige vínculo estrito:
  -- Se a competição não tiver organizador designado (organizer_id IS NULL) OU se pertencer a outro organizador,
  -- bloqueia sumariamente. Apenas admin da plataforma ou service_role podem gerenciar torneios desvinculados.
  IF NOT v_is_service_role AND v_user_role != 'admin' THEN
    IF v_comp_organizer_id IS NULL THEN
      RAISE EXCEPTION 'FORBIDDEN: Competição sem organizador designado. Apenas administradores podem gerenciar fases de competições não atribuídas'
        USING ERRCODE = '42501';
    ELSIF v_comp_organizer_id != v_caller_uid THEN
      RAISE EXCEPTION 'FORBIDDEN: Usuário não tem permissão para gerenciar esta competição'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 4.3. Validação do Estágio
  IF p_stage IS NULL OR jsonb_typeof(p_stage) != 'object' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Objeto p_stage é obrigatório'
      USING ERRCODE = '22023';
  END IF;

  v_stage_id := TRIM(COALESCE(p_stage->>'stageId', p_stage->>'stage_id', ''));
  v_stage_name := TRIM(COALESCE(p_stage->>'name', ''));
  v_stage_order := COALESCE((p_stage->>'stageOrder')::INT, (p_stage->>'stage_order')::INT);
  v_stage_type := TRIM(COALESCE(p_stage->>'stageType', p_stage->>'stage_type', ''));
  v_stage_status := COALESCE(p_stage->>'status', 'pending');
  v_stage_locked := COALESCE((p_stage->>'isLocked')::BOOLEAN, (p_stage->>'is_locked')::BOOLEAN, FALSE);
  v_stage_metadata := COALESCE(p_stage->'metadata', '{}'::JSONB);

  IF v_stage_id = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: stageId é obrigatório' USING ERRCODE = '22023';
  END IF;
  IF v_stage_name = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: name do estágio é obrigatório' USING ERRCODE = '22023';
  END IF;
  IF v_stage_order IS NULL OR v_stage_order < 1 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: stageOrder deve ser inteiro >= 1' USING ERRCODE = '22023';
  END IF;
  IF v_stage_type = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: stageType é obrigatório' USING ERRCODE = '22023';
  END IF;
  IF v_stage_status NOT IN ('pending', 'in-progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: status do estágio inválido: %', v_stage_status USING ERRCODE = '22023';
  END IF;

  -- Lock no Estágio existente ou geração de novo ID
  SELECT id INTO v_stage_row_id
  FROM public.competition_stages
  WHERE competition_id = p_competition_id AND stage_id = v_stage_id
  FOR UPDATE;

  IF v_stage_row_id IS NOT NULL THEN
    UPDATE public.competition_stages
    SET name = v_stage_name,
        stage_order = v_stage_order,
        stage_type = v_stage_type,
        status = v_stage_status::public.stage_runtime_status,
        is_locked = v_stage_locked,
        metadata = v_stage_metadata,
        updated_at = NOW()
    WHERE id = v_stage_row_id;
  ELSE
    v_stage_row_id := COALESCE(p_stage->>'id', 'stage-' || gen_random_uuid()::text);
    INSERT INTO public.competition_stages (
      id, competition_id, stage_id, name, stage_order, stage_type,
      status, is_locked, metadata, created_at, updated_at
    ) VALUES (
      v_stage_row_id, p_competition_id, v_stage_id, v_stage_name, v_stage_order, v_stage_type,
      v_stage_status::public.stage_runtime_status, v_stage_locked, v_stage_metadata, NOW(), NOW()
    );
  END IF;

  -- 4.4. Validação e Upsert das Rodadas (Rounds)
  IF p_rounds IS NOT NULL AND jsonb_typeof(p_rounds) = 'array' THEN
    FOR v_round_elem IN SELECT * FROM jsonb_array_elements(p_rounds)
    LOOP
      v_round_id := TRIM(COALESCE(v_round_elem->>'roundId', v_round_elem->>'round_id', ''));
      v_round_name := TRIM(COALESCE(v_round_elem->>'name', ''));
      v_round_order := COALESCE((v_round_elem->>'roundOrder')::INT, (v_round_elem->>'round_order')::INT);
      v_round_slots_count := COALESCE((v_round_elem->>'slotsCount')::INT, (v_round_elem->>'slots_count')::INT, 0);
      v_round_status := COALESCE(v_round_elem->>'status', 'pending');

      IF v_round_id = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: roundId é obrigatório na rodada' USING ERRCODE = '22023';
      END IF;
      IF v_round_name = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: name da rodada é obrigatório' USING ERRCODE = '22023';
      END IF;
      IF v_round_order IS NULL OR v_round_order < 1 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: roundOrder deve ser inteiro >= 1' USING ERRCODE = '22023';
      END IF;
      IF v_round_status NOT IN ('pending', 'in-progress', 'completed') THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: status da rodada inválido: %', v_round_status USING ERRCODE = '22023';
      END IF;

      -- Lock e Upsert da rodada
      SELECT id INTO v_round_row_id
      FROM public.competition_rounds
      WHERE stage_row_id = v_stage_row_id AND round_id = v_round_id
      FOR UPDATE;

      IF v_round_row_id IS NOT NULL THEN
        UPDATE public.competition_rounds
        SET name = v_round_name,
            round_order = v_round_order,
            slots_count = v_round_slots_count,
            status = v_round_status::public.round_runtime_status,
            updated_at = NOW()
        WHERE id = v_round_row_id;
      ELSE
        v_round_row_id := COALESCE(v_round_elem->>'id', 'round-' || gen_random_uuid()::text);
        INSERT INTO public.competition_rounds (
          id, competition_id, stage_row_id, round_id, name,
          round_order, slots_count, status, created_at, updated_at
        ) VALUES (
          v_round_row_id, p_competition_id, v_stage_row_id, v_round_id, v_round_name,
          v_round_order, v_round_slots_count, v_round_status::public.round_runtime_status, NOW(), NOW()
        );
      END IF;

      -- Mapeia round_id lógico para o id físico da linha
      v_round_mapping := v_round_mapping || jsonb_build_object(v_round_id, v_round_row_id);
      v_rounds_count := v_rounds_count + 1;
    END LOOP;
  END IF;

  -- 4.5. Validação e Upsert dos MatchSlots
  IF p_slots IS NOT NULL AND jsonb_typeof(p_slots) = 'array' THEN
    FOR v_slot_elem IN SELECT * FROM jsonb_array_elements(p_slots)
    LOOP
      v_slot_id := TRIM(COALESCE(v_slot_elem->>'slotId', v_slot_elem->>'slot_id', ''));
      v_slot_round_id := TRIM(COALESCE(v_slot_elem->>'roundId', v_slot_elem->>'round_id', ''));
      v_slot_position := COALESCE((v_slot_elem->>'position')::INT, 0);
      v_slot_label := v_slot_elem->>'label';
      v_slot_part_a_ref := COALESCE(v_slot_elem->'participantAReference', v_slot_elem->'participant_a_reference');
      v_slot_part_a_status := COALESCE(v_slot_elem->>'participantAStatus', v_slot_elem->>'participant_a_status', 'unresolved');
      v_slot_resolved_team_a := COALESCE(v_slot_elem->>'resolvedTeamAId', v_slot_elem->>'resolved_team_a_id');
      v_slot_part_b_ref := COALESCE(v_slot_elem->'participantBReference', v_slot_elem->'participant_b_reference');
      v_slot_part_b_status := COALESCE(v_slot_elem->>'participantBStatus', v_slot_elem->>'participant_b_status', 'unresolved');
      v_slot_resolved_team_b := COALESCE(v_slot_elem->>'resolvedTeamBId', v_slot_elem->>'resolved_team_b_id');
      v_slot_match_id := COALESCE(v_slot_elem->>'matchId', v_slot_elem->>'match_id');
      v_slot_prog_route := COALESCE(v_slot_elem->'progressionRoute', v_slot_elem->'progression_route');

      IF v_slot_id = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: slotId é obrigatório no slot' USING ERRCODE = '22023';
      END IF;
      IF v_slot_position IS NULL OR v_slot_position < 1 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: position no slot % deve ser >= 1', v_slot_id USING ERRCODE = '22023';
      END IF;

      -- Resolução da rodada associada
      v_slot_round_row_id := v_round_mapping->>v_slot_round_id;
      IF v_slot_round_row_id IS NULL THEN
        SELECT id INTO v_slot_round_row_id
        FROM public.competition_rounds
        WHERE stage_row_id = v_stage_row_id AND round_id = v_slot_round_id;

        IF v_slot_round_row_id IS NULL THEN
          RAISE EXCEPTION 'INVALID_REFERENCE: Round % associado ao slot % não existe no estágio %',
            v_slot_round_id, v_slot_id, v_stage_id
            USING ERRCODE = '23503';
        END IF;
      END IF;

      -- Validação estrita de ParticipantReference
      IF NOT public.validate_participant_reference_jsonb(v_slot_part_a_ref) THEN
        RAISE EXCEPTION 'INVALID_PARTICIPANT_REFERENCE: Referência de participante A inválida no slot %: %',
          v_slot_id, v_slot_part_a_ref
          USING ERRCODE = '22023';
      END IF;
      IF NOT public.validate_participant_reference_jsonb(v_slot_part_b_ref) THEN
        RAISE EXCEPTION 'INVALID_PARTICIPANT_REFERENCE: Referência de participante B inválida no slot %: %',
          v_slot_id, v_slot_part_b_ref
          USING ERRCODE = '22023';
      END IF;

      -- Defesa Anti-Fake Team
      IF v_slot_resolved_team_a IS NOT NULL THEN
        IF public.is_artificial_team_id(v_slot_resolved_team_a) THEN
          RAISE EXCEPTION 'ARTIFICIAL_TEAM_REJECTED: Equipe artificial % proibida como resolved_team_a no slot %',
            v_slot_resolved_team_a, v_slot_id
            USING ERRCODE = '22023';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = v_slot_resolved_team_a) THEN
          RAISE EXCEPTION 'TEAM_NOT_FOUND: Equipe % não encontrada no banco', v_slot_resolved_team_a
            USING ERRCODE = '23503';
        END IF;
      END IF;

      IF v_slot_resolved_team_b IS NOT NULL THEN
        IF public.is_artificial_team_id(v_slot_resolved_team_b) THEN
          RAISE EXCEPTION 'ARTIFICIAL_TEAM_REJECTED: Equipe artificial % proibida como resolved_team_b no slot %',
            v_slot_resolved_team_b, v_slot_id
            USING ERRCODE = '22023';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = v_slot_resolved_team_b) THEN
          RAISE EXCEPTION 'TEAM_NOT_FOUND: Equipe % não encontrada no banco', v_slot_resolved_team_b
            USING ERRCODE = '23503';
        END IF;
      END IF;

      -- Validação de partida associada
      IF v_slot_match_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = v_slot_match_id AND competition_id = p_competition_id) THEN
          RAISE EXCEPTION 'MATCH_NOT_FOUND: Partida % não encontrada na competição %', v_slot_match_id, p_competition_id
            USING ERRCODE = '23503';
        END IF;
      END IF;

      -- Lock e Upsert do MatchSlot
      SELECT id INTO v_slot_row_id
      FROM public.competition_match_slots
      WHERE competition_id = p_competition_id AND slot_id = v_slot_id
      FOR UPDATE;

      IF v_slot_row_id IS NOT NULL THEN
        UPDATE public.competition_match_slots
        SET stage_row_id = v_stage_row_id,
            round_row_id = v_slot_round_row_id,
            position = v_slot_position,
            label = v_slot_label,
            participant_a_reference = v_slot_part_a_ref,
            participant_a_status = v_slot_part_a_status::public.slot_participant_status,
            resolved_team_a_id = v_slot_resolved_team_a,
            participant_b_reference = v_slot_part_b_ref,
            participant_b_status = v_slot_part_b_status::public.slot_participant_status,
            resolved_team_b_id = v_slot_resolved_team_b,
            match_id = v_slot_match_id,
            progression_route = v_slot_prog_route,
            updated_at = NOW()
        WHERE id = v_slot_row_id;
      ELSE
        v_slot_row_id := COALESCE(v_slot_elem->>'id', 'slot-' || gen_random_uuid()::text);
        INSERT INTO public.competition_match_slots (
          id, competition_id, stage_row_id, round_row_id, slot_id, position, label,
          participant_a_reference, participant_a_status, resolved_team_a_id,
          participant_b_reference, participant_b_status, resolved_team_b_id,
          match_id, progression_route, created_at, updated_at
        ) VALUES (
          v_slot_row_id, p_competition_id, v_stage_row_id, v_slot_round_row_id, v_slot_id, v_slot_position, v_slot_label,
          v_slot_part_a_ref, v_slot_part_a_status::public.slot_participant_status, v_slot_resolved_team_a,
          v_slot_part_b_ref, v_slot_part_b_status::public.slot_participant_status, v_slot_resolved_team_b,
          v_slot_match_id, v_slot_prog_route, NOW(), NOW()
        );
      END IF;

      v_slots_count := v_slots_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'stageRowId', v_stage_row_id,
    'roundsCount', v_rounds_count,
    'slotsCount', v_slots_count
  );
END;
$$;

COMMENT ON FUNCTION public.save_stage_draw_and_slots(TEXT, JSONB, JSONB, JSONB) IS
  'Persiste transacionalmente sorteios e slots de estágio com checagem estrita de ownership (SEC-04 saneada).';

REVOKE ALL ON FUNCTION public.save_stage_draw_and_slots(TEXT, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_stage_draw_and_slots(TEXT, JSONB, JSONB, JSONB) TO authenticated, service_role;
