-- BaseOS / VolleyPro — Materialização Atômica de Partidas e Concorrência (Fase 4.8)
-- Implementa:
-- 1. Coluna slot_id em matches com Foreign Key composta (competition_id, slot_id)
-- 2. Índice único parcial uq_matches_competition_slot_id (garantia de 1 partida por slot)
-- 3. Índice único parcial uq_slots_match_id (garantia de 1 slot por partida)
-- 4. RPC transacional atômica e thread-safe: rpc_materialize_slot_match

-- ============================================================================
-- 1. ESTRUTURA: COLUNA slot_id EM MATCHES COM FK E CONSTRAINTS
-- ============================================================================

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS slot_id TEXT;

-- Foreign Key composta garantindo integridade referencial contextual com competition_match_slots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_matches_competition_match_slot'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT fk_matches_competition_match_slot
      FOREIGN KEY (competition_id, slot_id)
      REFERENCES public.competition_match_slots (competition_id, slot_id)
      ON DELETE SET NULL (slot_id);
  END IF;
END $$;

-- Índice único parcial: impede que mais de um Match seja criado para o mesmo slot na mesma competição
CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_competition_slot_id
  ON public.matches (competition_id, slot_id)
  WHERE slot_id IS NOT NULL;

-- Índice único parcial reverso: impede que dois slots apontem para o mesmo match_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_slots_match_id
  ON public.competition_match_slots (match_id)
  WHERE match_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_slot_id ON public.matches (slot_id);

-- ============================================================================
-- 2. RPC TRANSACIONAL: rpc_materialize_slot_match
-- ============================================================================
-- Materializa atomicamente um Match esportivo real a partir de um MatchSlot resolvido.
-- Executa na transação da chamada com lock pessimista (FOR UPDATE) no slot.
-- Se a partida já existir (ou já estiver vinculada), retorna o ID existente com alreadyMaterialized = true (Idempotente).

CREATE OR REPLACE FUNCTION public.rpc_materialize_slot_match(
  p_competition_id TEXT,
  p_slot_id TEXT,
  p_scheduled_time TIMESTAMPTZ DEFAULT NULL,
  p_venue TEXT DEFAULT 'Arena Principal',
  p_court TEXT DEFAULT NULL,
  p_phase TEXT DEFAULT NULL
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

  v_slot RECORD;
  v_existing_match_id TEXT;
  v_team_a_name TEXT;
  v_team_a_short TEXT;
  v_team_b_name TEXT;
  v_team_b_short TEXT;
  v_match_number INT;
  v_round_order INT;
  v_stage_type TEXT;
  v_phase TEXT;
  v_venue TEXT;
  v_sched_time TIMESTAMPTZ;
  v_match_id TEXT;
BEGIN
  -- 2.1. Autorização: service_role de infraestrutura OU organizador/administrador autenticado
  v_caller_role := auth.jwt()->>'role';
  v_caller_uid := COALESCE(auth.uid(), NULLIF(auth.jwt()->>'sub', '')::UUID);
  v_is_service_role := (v_caller_role = 'service_role' AND v_caller_uid IS NULL);

  IF NOT v_is_service_role THEN
    IF v_caller_uid IS NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Autenticação obrigatória para materializar partidas'
        USING ERRCODE = '42501';
    END IF;

    SELECT role::text INTO v_user_role
    FROM public.profiles
    WHERE id = v_caller_uid;

    IF v_user_role IS NULL OR v_user_role NOT IN ('organizer', 'admin') THEN
      RAISE EXCEPTION 'FORBIDDEN: Apenas organizadores e administradores podem materializar partidas'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2.2. Lock Pessimista de Competição e Checagem de Ownership
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

  -- 2.3. Lock Pessimista no Slot de Origem (Serialização ACID Concorrente)
  SELECT * INTO v_slot
  FROM public.competition_match_slots
  WHERE competition_id = p_competition_id AND slot_id = p_slot_id
  FOR UPDATE;

  IF v_slot.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Slot % não encontrado na competição %', p_slot_id, p_competition_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 2.4. Idempotência Nível 1: Slot já possui match_id associado e existente
  IF v_slot.match_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_slot.match_id) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'matchId', v_slot.match_id,
        'alreadyMaterialized', true,
        'message', 'Partida já materializada e vinculada ao slot'
      );
    END IF;
  END IF;

  -- 2.5. Idempotência Nível 2: Já existe Match criado para (competition_id, slot_id)
  SELECT id INTO v_existing_match_id
  FROM public.matches
  WHERE competition_id = p_competition_id AND slot_id = p_slot_id;

  IF v_existing_match_id IS NOT NULL THEN
    UPDATE public.competition_match_slots
    SET match_id = v_existing_match_id,
        updated_at = NOW()
    WHERE id = v_slot.id;

    RETURN jsonb_build_object(
      'ok', true,
      'matchId', v_existing_match_id,
      'alreadyMaterialized', true,
      'message', 'Partida pré-existente vinculada ao slot'
    );
  END IF;

  -- 2.6. Validação Estrita de Elegibilidade para Materialização
  -- Ambos os participantes devem estar 'resolved' e com IDs não nulos
  IF v_slot.participant_a_status != 'resolved' OR v_slot.resolved_team_a_id IS NULL THEN
    RAISE EXCEPTION 'PARTICIPANT_UNRESOLVED: Participante A do slot % não está resolvido (status: %)',
      p_slot_id, v_slot.participant_a_status
      USING ERRCODE = '22023';
  END IF;

  IF v_slot.participant_b_status != 'resolved' OR v_slot.resolved_team_b_id IS NULL THEN
    RAISE EXCEPTION 'PARTICIPANT_UNRESOLVED: Participante B do slot % não está resolvido (status: %)',
      p_slot_id, v_slot.participant_b_status
      USING ERRCODE = '22023';
  END IF;

  -- Defesa Anti-Fake Team
  IF public.is_artificial_team_id(v_slot.resolved_team_a_id) THEN
    RAISE EXCEPTION 'ARTIFICIAL_TEAM_REJECTED: Equipe artificial % proibida como participante A', v_slot.resolved_team_a_id
      USING ERRCODE = '22023';
  END IF;
  IF public.is_artificial_team_id(v_slot.resolved_team_b_id) THEN
    RAISE EXCEPTION 'ARTIFICIAL_TEAM_REJECTED: Equipe artificial % proibida como participante B', v_slot.resolved_team_b_id
      USING ERRCODE = '22023';
  END IF;

  -- Validação de Existência das Equipes
  SELECT name, short_name INTO v_team_a_name, v_team_a_short
  FROM public.teams WHERE id = v_slot.resolved_team_a_id;

  IF v_team_a_name IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND: Equipe A % não encontrada no banco', v_slot.resolved_team_a_id
      USING ERRCODE = '23503';
  END IF;

  SELECT name, short_name INTO v_team_b_name, v_team_b_short
  FROM public.teams WHERE id = v_slot.resolved_team_b_id;

  IF v_team_b_name IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND: Equipe B % não encontrada no banco', v_slot.resolved_team_b_id
      USING ERRCODE = '23503';
  END IF;

  -- Validação de Inscrição na Competição (pertencimento)
  IF NOT EXISTS (
    SELECT 1 FROM public.competition_teams
    WHERE competition_id = p_competition_id AND team_id = v_slot.resolved_team_a_id
  ) THEN
    RAISE EXCEPTION 'TEAM_NOT_ENROLLED: Equipe A % não está inscrita na competição %',
      v_slot.resolved_team_a_id, p_competition_id
      USING ERRCODE = '23503';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.competition_teams
    WHERE competition_id = p_competition_id AND team_id = v_slot.resolved_team_b_id
  ) THEN
    RAISE EXCEPTION 'TEAM_NOT_ENROLLED: Equipe B % não está inscrita na competição %',
      v_slot.resolved_team_b_id, p_competition_id
      USING ERRCODE = '23503';
  END IF;

  -- 2.7. Metadados do Match: Round, Phase, Número da Partida
  SELECT round_order INTO v_round_order
  FROM public.competition_rounds
  WHERE id = v_slot.round_row_id;

  SELECT stage_type INTO v_stage_type
  FROM public.competition_stages
  WHERE id = v_slot.stage_row_id;

  -- Cálculo determinístico do próximo match_number na competição
  SELECT COALESCE(MAX(match_number), 0) + 1 INTO v_match_number
  FROM public.matches
  WHERE competition_id = p_competition_id;

  v_phase := COALESCE(p_phase, v_slot.label, v_stage_type, 'playoffs');
  v_venue := COALESCE(NULLIF(TRIM(p_venue), ''), 'Arena Principal');
  v_sched_time := COALESCE(p_scheduled_time, NOW());
  v_match_id := 'match-' || gen_random_uuid()::text;

  -- 2.8. Inserção do Match Esportivo Real
  INSERT INTO public.matches (
    id,
    competition_id,
    slot_id,
    round,
    match_number,
    team_a_id,
    team_b_id,
    team_a_name,
    team_b_name,
    team_a_short_name,
    team_b_short_name,
    venue,
    court,
    scheduled_time,
    status,
    observations,
    created_at,
    updated_at
  ) VALUES (
    v_match_id,
    p_competition_id,
    p_slot_id,
    COALESCE(v_round_order, 1),
    v_match_number,
    v_slot.resolved_team_a_id,
    v_slot.resolved_team_b_id,
    v_team_a_name,
    v_team_b_name,
    COALESCE(v_team_a_short, UPPER(SUBSTRING(v_team_a_name FROM 1 FOR 3))),
    COALESCE(v_team_b_short, UPPER(SUBSTRING(v_team_b_name FROM 1 FOR 3))),
    v_venue,
    p_court,
    v_sched_time,
    'scheduled',
    CASE WHEN v_phase IS NOT NULL THEN 'Fase: ' || v_phase ELSE NULL END,
    NOW(),
    NOW()
  );

  -- 2.9. Atualização Atômica do MatchSlot com o ID do Match
  UPDATE public.competition_match_slots
  SET match_id = v_match_id,
      updated_at = NOW()
  WHERE id = v_slot.id;

  RETURN jsonb_build_object(
    'ok', true,
    'matchId', v_match_id,
    'alreadyMaterialized', false,
    'matchNumber', v_match_number,
    'slotId', p_slot_id,
    'teamAId', v_slot.resolved_team_a_id,
    'teamBId', v_slot.resolved_team_b_id
  );
END;
$$;

-- ============================================================================
-- 3. PERMISSÕES E PRIVILÉGIOS (LEAST PRIVILEGE)
-- ============================================================================

REVOKE ALL ON FUNCTION public.rpc_materialize_slot_match FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_materialize_slot_match TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_materialize_slot_match TO service_role;
