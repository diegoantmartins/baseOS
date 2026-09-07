-- BaseOS / VolleyPro — Transações ACID e Hardening de Segurança (Fase 4.7)
-- Implementa:
-- 1. Compatibilidade de tipos: enum user_role com 'admin', teams.city
-- 2. Helper imutável: is_artificial_team_id (rejeição anti-fake team no banco)
-- 3. Helper imutável: validate_participant_reference_jsonb (8 tipos canônicos)
-- 4. RPC transacional atômica: save_stage_draw_and_slots (Single PostgreSQL call transaction)
-- 5. RPC transacional atômica: rpc_propagate_slot_outcome (Locks determinísticos e idempotência)
-- 6. Hardening de RLS para competition_stages, competition_rounds, competition_match_slots
-- 7. Hardening de privilégios de execução (REVOKE PUBLIC / GRANT restrito)

-- ============================================================================
-- 1. COMPATIBILIDADE DE SCHEMA E ENUMS
-- ============================================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_competitions_organizer_id ON public.competitions (organizer_id);

-- ============================================================================
-- 2. FUNÇÃO AUXILIAR: is_artificial_team_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_artificial_team_id(p_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_trimmed TEXT;
BEGIN
  IF p_team_id IS NULL OR TRIM(p_team_id) = '' THEN
    RETURN FALSE;
  END IF;
  v_trimmed := UPPER(TRIM(p_team_id));
  RETURN (
    starts_with(v_trimmed, 'TBD') OR
    starts_with(v_trimmed, '__BYE') OR
    v_trimmed = 'UNKNOWN' OR
    starts_with(v_trimmed, 'PLACEHOLDER') OR
    starts_with(v_trimmed, '__')
  );
END;
$$;

-- ============================================================================
-- 3. FUNÇÃO AUXILIAR: validate_participant_reference_jsonb
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_participant_reference_jsonb(p_ref JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type TEXT;
  v_team_id TEXT;
  v_group_index INT;
  v_pos INT;
  v_stage_id TEXT;
  v_seed_num INT;
  v_slot_id TEXT;
BEGIN
  IF p_ref IS NULL OR jsonb_typeof(p_ref) != 'object' THEN
    RETURN FALSE;
  END IF;

  v_type := p_ref->>'type';
  IF v_type IS NULL OR v_type NOT IN (
    'resolved-team', 'group-position', 'overall-ranking',
    'stage-position', 'match-winner', 'match-loser', 'seed', 'bye'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Validações específicas por tipo canônico
  IF v_type = 'resolved-team' THEN
    v_team_id := COALESCE(p_ref->>'teamId', p_ref->>'team_id');
    IF v_team_id IS NULL OR TRIM(v_team_id) = '' OR public.is_artificial_team_id(v_team_id) THEN
      RETURN FALSE;
    END IF;

  ELSIF v_type = 'group-position' THEN
    v_stage_id := COALESCE(p_ref->>'stageId', p_ref->>'stage_id');
    IF v_stage_id IS NULL OR TRIM(v_stage_id) = '' THEN
      RETURN FALSE;
    END IF;
    IF NOT (p_ref ? 'groupIndex' OR p_ref ? 'group_index') OR NOT (p_ref ? 'position') THEN
      RETURN FALSE;
    END IF;
    v_group_index := COALESCE(p_ref->>'groupIndex', p_ref->>'group_index')::INT;
    v_pos := (p_ref->>'position')::INT;
    IF v_group_index < 0 OR v_pos < 1 THEN
      RETURN FALSE;
    END IF;

  ELSIF v_type = 'overall-ranking' THEN
    v_stage_id := COALESCE(p_ref->>'stageId', p_ref->>'stage_id');
    IF v_stage_id IS NULL OR TRIM(v_stage_id) = '' THEN
      RETURN FALSE;
    END IF;
    IF NOT (p_ref ? 'position') THEN
      RETURN FALSE;
    END IF;
    v_pos := (p_ref->>'position')::INT;
    IF v_pos < 1 THEN
      RETURN FALSE;
    END IF;

  ELSIF v_type = 'stage-position' THEN
    v_stage_id := COALESCE(p_ref->>'stageId', p_ref->>'stage_id');
    IF v_stage_id IS NULL OR TRIM(v_stage_id) = '' THEN
      RETURN FALSE;
    END IF;
    IF NOT (p_ref ? 'position') THEN
      RETURN FALSE;
    END IF;
    v_pos := (p_ref->>'position')::INT;
    IF v_pos < 1 THEN
      RETURN FALSE;
    END IF;

  ELSIF v_type IN ('match-winner', 'match-loser') THEN
    v_slot_id := COALESCE(p_ref->>'slotId', p_ref->>'slot_id');
    IF v_slot_id IS NULL OR TRIM(v_slot_id) = '' THEN
      RETURN FALSE;
    END IF;

  ELSIF v_type = 'seed' THEN
    IF NOT (p_ref ? 'seedNumber' OR p_ref ? 'seed_number') THEN
      RETURN FALSE;
    END IF;
    v_seed_num := COALESCE(p_ref->>'seedNumber', p_ref->>'seed_number')::INT;
    IF v_seed_num < 1 THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 4. RPC TRANSACIONAL: save_stage_draw_and_slots
-- ============================================================================
-- Persiste Stage, Rounds e MatchSlots atomicamente.
-- Executa na transação da chamada. Se qualquer validação falhar,
-- dispara RAISE EXCEPTION abortando e revertendo 100% das escritas preliminares.

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

  -- 4.2. Lock Pessimista de Competição (Serialização ACID) e Checagem de Ownership
  SELECT id, organizer_id INTO v_comp_id, v_comp_organizer_id
  FROM public.competitions
  WHERE id = p_competition_id
  FOR UPDATE;

  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Competição % não encontrada', p_competition_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Se for organizador (não admin e não service_role) e a competição possuir proprietário designado,
  -- impede que organizador da competição A altere a competição B:
  IF NOT v_is_service_role AND v_user_role != 'admin' THEN
    IF v_comp_organizer_id IS NOT NULL AND v_comp_organizer_id != v_caller_uid THEN
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

      -- Resolução da rodada associada (garante isolamento cross-stage/cross-competition)
      v_slot_round_row_id := v_round_mapping->>v_slot_round_id;
      IF v_slot_round_row_id IS NULL THEN
        -- Tenta buscar rodada existente no estágio atual
        SELECT id INTO v_slot_round_row_id
        FROM public.competition_rounds
        WHERE stage_row_id = v_stage_row_id AND round_id = v_slot_round_id;

        IF v_slot_round_row_id IS NULL THEN
          RAISE EXCEPTION 'INVALID_REFERENCE: Round % associado ao slot % não existe no estágio %',
            v_slot_round_id, v_slot_id, v_stage_id
            USING ERRCODE = '23503';
        END IF;
      END IF;

      -- Validação estrita de ParticipantReference (8 tipos canônicos)
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

      -- Defesa Anti-Fake Team no banco de dados
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

      -- Validação de partida associada (isolamento de competição)
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

-- ============================================================================
-- 5. RPC TRANSACIONAL: rpc_propagate_slot_outcome
-- ============================================================================
-- Propaga vencedor e perdedor do confronto com locks determinísticos e idempotência.

CREATE OR REPLACE FUNCTION public.rpc_propagate_slot_outcome(
  p_competition_id TEXT,
  p_slot_id TEXT,
  p_winner_team_id TEXT DEFAULT NULL,
  p_loser_team_id TEXT DEFAULT NULL,
  p_match_id TEXT DEFAULT NULL
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
  v_source_slot RECORD;
  v_route JSONB;
  v_target_winner JSONB;
  v_target_loser JSONB;
  v_winner_target_slot_id TEXT;
  v_winner_target_side TEXT;
  v_loser_target_slot_id TEXT;
  v_loser_target_side TEXT;
  v_target_row_ids TEXT[];
  v_target_record RECORD;
  v_updated_count INT := 0;
  v_already_propagated BOOLEAN := TRUE;
BEGIN
  -- 5.1. Autorização: service_role de infraestrutura OU organizador/administrador autenticado
  v_caller_role := auth.jwt()->>'role';
  v_caller_uid := COALESCE(auth.uid(), NULLIF(auth.jwt()->>'sub', '')::UUID);
  v_is_service_role := (v_caller_role = 'service_role' AND v_caller_uid IS NULL);

  IF NOT v_is_service_role THEN
    IF v_caller_uid IS NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Autenticação obrigatória para propagar resultado'
        USING ERRCODE = '42501';
    END IF;

    SELECT role::text INTO v_user_role
    FROM public.profiles
    WHERE id = v_caller_uid;

    IF v_user_role IS NULL OR v_user_role NOT IN ('organizer', 'admin') THEN
      RAISE EXCEPTION 'FORBIDDEN: Apenas organizadores e administradores podem propagar resultados'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Checagem de competição e ownership
  SELECT id, organizer_id INTO v_comp_id, v_comp_organizer_id
  FROM public.competitions
  WHERE id = p_competition_id
  FOR UPDATE;

  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Competição % não encontrada', p_competition_id
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_is_service_role AND v_user_role != 'admin' THEN
    IF v_comp_organizer_id IS NOT NULL AND v_comp_organizer_id != v_caller_uid THEN
      RAISE EXCEPTION 'FORBIDDEN: Usuário não tem permissão para gerenciar esta competição'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 5.2. Defesa Anti-Fake Team
  IF p_winner_team_id IS NOT NULL THEN
    IF public.is_artificial_team_id(p_winner_team_id) THEN
      RAISE EXCEPTION 'ARTIFICIAL_TEAM_REJECTED: ID de equipe artificial % não permitido como vencedor', p_winner_team_id
        USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_team_id) THEN
      RAISE EXCEPTION 'TEAM_NOT_FOUND: Equipe vencedora % não encontrada', p_winner_team_id
        USING ERRCODE = '23503';
    END IF;
  END IF;

  IF p_loser_team_id IS NOT NULL THEN
    IF public.is_artificial_team_id(p_loser_team_id) THEN
      RAISE EXCEPTION 'ARTIFICIAL_TEAM_REJECTED: ID de equipe artificial % não permitido como perdedor', p_loser_team_id
        USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_team_id) THEN
      RAISE EXCEPTION 'TEAM_NOT_FOUND: Equipe perdedora % não encontrada', p_loser_team_id
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- 5.3. Lock Pessimista no Slot de Origem
  SELECT * INTO v_source_slot
  FROM public.competition_match_slots
  WHERE competition_id = p_competition_id AND slot_id = p_slot_id
  FOR UPDATE;

  IF v_source_slot.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Slot de origem % não encontrado na competição %', p_slot_id, p_competition_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Atualiza match_id no slot de origem se informado
  IF p_match_id IS NOT NULL AND (v_source_slot.match_id IS NULL OR v_source_slot.match_id != p_match_id) THEN
    UPDATE public.competition_match_slots
    SET match_id = p_match_id,
        updated_at = NOW()
    WHERE id = v_source_slot.id;
  END IF;

  -- Extrai rotas de progressão
  v_route := v_source_slot.progression_route;
  IF v_route IS NOT NULL THEN
    v_target_winner := v_route->'onWinner';
    v_target_loser := v_route->'onLoser';
    IF v_target_winner IS NOT NULL THEN
      v_winner_target_slot_id := COALESCE(v_target_winner->>'targetSlotId', v_target_winner->>'target_slot_id');
      v_winner_target_side := COALESCE(v_target_winner->>'targetSide', v_target_winner->>'target_side');
    END IF;
    IF v_target_loser IS NOT NULL THEN
      v_loser_target_slot_id := COALESCE(v_target_loser->>'targetSlotId', v_target_loser->>'target_slot_id');
      v_loser_target_side := COALESCE(v_target_loser->>'targetSide', v_target_loser->>'target_side');
    END IF;
  END IF;

  -- 5.4. Coleta IDs de slots de destino e aplica Locks Ordenados Determinísticos (Anti-Deadlock)
  SELECT ARRAY_AGG(id ORDER BY id ASC) INTO v_target_row_ids
  FROM public.competition_match_slots
  WHERE competition_id = p_competition_id
    AND (
      (v_winner_target_slot_id IS NOT NULL AND slot_id = v_winner_target_slot_id)
      OR (v_loser_target_slot_id IS NOT NULL AND slot_id = v_loser_target_slot_id)
      OR (participant_a_reference->>'slotId' = p_slot_id OR participant_a_reference->>'slot_id' = p_slot_id)
      OR (participant_b_reference->>'slotId' = p_slot_id OR participant_b_reference->>'slot_id' = p_slot_id)
    );

  IF v_target_row_ids IS NULL OR array_length(v_target_row_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'sourceSlotId', p_slot_id,
      'idempotent', true,
      'updatedCount', 0,
      'message', 'Nenhum slot de destino configurado para progressão'
    );
  END IF;

  -- Bloqueio determinístico ordenado por ID asc
  PERFORM 1 FROM public.competition_match_slots
  WHERE id = ANY(v_target_row_ids)
  ORDER BY id ASC
  FOR UPDATE;

  -- 5.5. Atualização dos Slots de Destino com Preservação de Proveniência
  -- Propaga Vencedor via Rota Explícita
  IF v_winner_target_slot_id IS NOT NULL AND p_winner_team_id IS NOT NULL THEN
    IF v_winner_target_side = 'A' THEN
      UPDATE public.competition_match_slots
      SET resolved_team_a_id = p_winner_team_id,
          participant_a_status = 'resolved',
          updated_at = NOW()
      WHERE competition_id = p_competition_id
        AND slot_id = v_winner_target_slot_id
        AND (resolved_team_a_id IS DISTINCT FROM p_winner_team_id OR participant_a_status != 'resolved');
    ELSE
      UPDATE public.competition_match_slots
      SET resolved_team_b_id = p_winner_team_id,
          participant_b_status = 'resolved',
          updated_at = NOW()
      WHERE competition_id = p_competition_id
        AND slot_id = v_winner_target_slot_id
        AND (resolved_team_b_id IS DISTINCT FROM p_winner_team_id OR participant_b_status != 'resolved');
    END IF;
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
      v_already_propagated := FALSE;
    END IF;
  END IF;

  -- Propaga Perdedor via Rota Explícita
  IF v_loser_target_slot_id IS NOT NULL AND p_loser_team_id IS NOT NULL THEN
    IF v_loser_target_side = 'A' THEN
      UPDATE public.competition_match_slots
      SET resolved_team_a_id = p_loser_team_id,
          participant_a_status = 'resolved',
          updated_at = NOW()
      WHERE competition_id = p_competition_id
        AND slot_id = v_loser_target_slot_id
        AND (resolved_team_a_id IS DISTINCT FROM p_loser_team_id OR participant_a_status != 'resolved');
    ELSE
      UPDATE public.competition_match_slots
      SET resolved_team_b_id = p_loser_team_id,
          participant_b_status = 'resolved',
          updated_at = NOW()
      WHERE competition_id = p_competition_id
        AND slot_id = v_loser_target_slot_id
        AND (resolved_team_b_id IS DISTINCT FROM p_loser_team_id OR participant_b_status != 'resolved');
    END IF;
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
      v_already_propagated := FALSE;
    END IF;
  END IF;

  -- Propaga Vencedor/Perdedor para slots que referenciam diretamente via ParticipantReference
  IF p_winner_team_id IS NOT NULL THEN
    UPDATE public.competition_match_slots
    SET resolved_team_a_id = p_winner_team_id,
        participant_a_status = 'resolved',
        updated_at = NOW()
    WHERE competition_id = p_competition_id
      AND (participant_a_reference->>'type' = 'match-winner')
      AND (participant_a_reference->>'slotId' = p_slot_id OR participant_a_reference->>'slot_id' = p_slot_id)
      AND (resolved_team_a_id IS DISTINCT FROM p_winner_team_id OR participant_a_status != 'resolved');
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
      v_already_propagated := FALSE;
    END IF;

    UPDATE public.competition_match_slots
    SET resolved_team_b_id = p_winner_team_id,
        participant_b_status = 'resolved',
        updated_at = NOW()
    WHERE competition_id = p_competition_id
      AND (participant_b_reference->>'type' = 'match-winner')
      AND (participant_b_reference->>'slotId' = p_slot_id OR participant_b_reference->>'slot_id' = p_slot_id)
      AND (resolved_team_b_id IS DISTINCT FROM p_winner_team_id OR participant_b_status != 'resolved');
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
      v_already_propagated := FALSE;
    END IF;
  END IF;

  IF p_loser_team_id IS NOT NULL THEN
    UPDATE public.competition_match_slots
    SET resolved_team_a_id = p_loser_team_id,
        participant_a_status = 'resolved',
        updated_at = NOW()
    WHERE competition_id = p_competition_id
      AND (participant_a_reference->>'type' = 'match-loser')
      AND (participant_a_reference->>'slotId' = p_slot_id OR participant_a_reference->>'slot_id' = p_slot_id)
      AND (resolved_team_a_id IS DISTINCT FROM p_loser_team_id OR participant_a_status != 'resolved');
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
      v_already_propagated := FALSE;
    END IF;

    UPDATE public.competition_match_slots
    SET resolved_team_b_id = p_loser_team_id,
        participant_b_status = 'resolved',
        updated_at = NOW()
    WHERE competition_id = p_competition_id
      AND (participant_b_reference->>'type' = 'match-loser')
      AND (participant_b_reference->>'slotId' = p_slot_id OR participant_b_reference->>'slot_id' = p_slot_id)
      AND (resolved_team_b_id IS DISTINCT FROM p_loser_team_id OR participant_b_status != 'resolved');
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
      v_already_propagated := FALSE;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'sourceSlotId', p_slot_id,
    'idempotent', v_already_propagated,
    'updatedCount', v_updated_count
  );
END;
$$;

-- ============================================================================
-- 6. HARDENING DE RLS PARA TABELAS DO COMPETITION FORMAT RUNTIME
-- ============================================================================

DROP POLICY IF EXISTS "competition_stages_organizer_all" ON public.competition_stages;
CREATE POLICY "competition_stages_organizer_all" ON public.competition_stages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  );

DROP POLICY IF EXISTS "competition_rounds_organizer_all" ON public.competition_rounds;
CREATE POLICY "competition_rounds_organizer_all" ON public.competition_rounds
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  );

DROP POLICY IF EXISTS "competition_match_slots_organizer_all" ON public.competition_match_slots;
CREATE POLICY "competition_match_slots_organizer_all" ON public.competition_match_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  );

-- ============================================================================
-- 7. AUDITORIA DE EXECUTE GRANTS E HARDENING
-- ============================================================================

-- Revogação irrestrita de execução para papéis públicos/anônimos
REVOKE EXECUTE ON FUNCTION public.is_artificial_team_id(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_participant_reference_jsonb(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_stage_draw_and_slots(TEXT, JSONB, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_propagate_slot_outcome(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

-- Concessão restrita a usuários autenticados e service_role de infraestrutura
GRANT EXECUTE ON FUNCTION public.is_artificial_team_id(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_participant_reference_jsonb(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_stage_draw_and_slots(TEXT, JSONB, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_propagate_slot_outcome(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
