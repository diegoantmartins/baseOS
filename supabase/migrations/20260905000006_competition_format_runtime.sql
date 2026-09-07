-- BaseOS / VolleyPro — Fundação de Persistência do Competition Format Engine (Fase 4.6)
-- Cria tabelas relacionais de runtime: competition_stages, competition_rounds, competition_match_slots
-- com constraints de integridade, validação de ParticipantReference, índices e políticas de RLS.

-- ============================================================================
-- 1. ENUMS IDEMPOTENTES DE RUNTIME
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stage_runtime_status') THEN
    CREATE TYPE public.stage_runtime_status AS ENUM ('pending', 'in-progress', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'round_runtime_status') THEN
    CREATE TYPE public.round_runtime_status AS ENUM ('pending', 'in-progress', 'completed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_participant_status') THEN
    CREATE TYPE public.slot_participant_status AS ENUM ('unresolved', 'resolved', 'bye', 'invalid');
  END IF;
END $$;

-- ============================================================================
-- 2. TABELA: competition_stages (Fases da Competição em Runtime)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.competition_stages (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_type TEXT NOT NULL,
  status public.stage_runtime_status NOT NULL DEFAULT 'pending',
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stages_competition_stage_id UNIQUE (competition_id, stage_id),
  CONSTRAINT uq_stages_competition_order UNIQUE (competition_id, stage_order)
);

CREATE INDEX IF NOT EXISTS idx_competition_stages_competition ON public.competition_stages(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_stages_status ON public.competition_stages(competition_id, status);

-- ============================================================================
-- 3. TABELA: competition_rounds (Rodadas Canônicas da Fase)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.competition_rounds (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  stage_row_id TEXT NOT NULL REFERENCES public.competition_stages(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL,
  name TEXT NOT NULL,
  round_order INTEGER NOT NULL,
  slots_count INTEGER NOT NULL DEFAULT 0,
  status public.round_runtime_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rounds_stage_round_id UNIQUE (stage_row_id, round_id),
  CONSTRAINT uq_rounds_stage_order UNIQUE (stage_row_id, round_order)
);

CREATE INDEX IF NOT EXISTS idx_competition_rounds_stage ON public.competition_rounds(stage_row_id);
CREATE INDEX IF NOT EXISTS idx_competition_rounds_competition ON public.competition_rounds(competition_id);

-- ============================================================================
-- 4. TABELA: competition_match_slots (Intenção Estrutural de Confronto)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.competition_match_slots (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  stage_row_id TEXT NOT NULL REFERENCES public.competition_stages(id) ON DELETE CASCADE,
  round_row_id TEXT NOT NULL REFERENCES public.competition_rounds(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  label TEXT,

  -- Participante A: Intenção estrutural (SSOT de runtime) + Projeção derivada
  participant_a_reference JSONB NOT NULL,
  participant_a_status public.slot_participant_status NOT NULL DEFAULT 'unresolved',
  resolved_team_a_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,

  -- Participante B: Intenção estrutural (SSOT de runtime) + Projeção derivada
  participant_b_reference JSONB NOT NULL,
  participant_b_status public.slot_participant_status NOT NULL DEFAULT 'unresolved',
  resolved_team_b_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,

  -- Associação opcional com evento esportivo real (criado após resolução)
  match_id TEXT REFERENCES public.matches(id) ON DELETE SET NULL,

  -- Rota de progressão estruturada (onWinner, onLoser)
  progression_route JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unicidade e integridade estrutural
  CONSTRAINT uq_slots_competition_slot_id UNIQUE (competition_id, slot_id),
  CONSTRAINT uq_slots_round_position UNIQUE (round_row_id, position),

  -- Blindagem do JSONB: Validação dos 8 tipos canônicos de ParticipantReference
  CONSTRAINT chk_slot_participant_a_type CHECK (
    participant_a_reference ? 'type' AND
    (participant_a_reference->>'type') IN (
      'resolved-team', 'group-position', 'overall-ranking',
      'stage-position', 'match-winner', 'match-loser', 'seed', 'bye'
    )
  ),
  CONSTRAINT chk_slot_participant_b_type CHECK (
    participant_b_reference ? 'type' AND
    (participant_b_reference->>'type') IN (
      'resolved-team', 'group-position', 'overall-ranking',
      'stage-position', 'match-winner', 'match-loser', 'seed', 'bye'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_competition_match_slots_competition ON public.competition_match_slots(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_match_slots_round ON public.competition_match_slots(round_row_id);
CREATE INDEX IF NOT EXISTS idx_competition_match_slots_team_a ON public.competition_match_slots(resolved_team_a_id);
CREATE INDEX IF NOT EXISTS idx_competition_match_slots_team_b ON public.competition_match_slots(resolved_team_b_id);
CREATE INDEX IF NOT EXISTS idx_competition_match_slots_match ON public.competition_match_slots(match_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.competition_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_match_slots ENABLE ROW LEVEL SECURITY;

-- 5.1. Leitura Pública (Transparência esportiva, portal público e tabelas ao vivo)
DROP POLICY IF EXISTS "competition_stages_public_read" ON public.competition_stages;
CREATE POLICY "competition_stages_public_read" ON public.competition_stages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "competition_rounds_public_read" ON public.competition_rounds;
CREATE POLICY "competition_rounds_public_read" ON public.competition_rounds
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "competition_match_slots_public_read" ON public.competition_match_slots;
CREATE POLICY "competition_match_slots_public_read" ON public.competition_match_slots
  FOR SELECT USING (true);

-- 5.2. Mutação Restrita a Organizadores e Administradores
DROP POLICY IF EXISTS "competition_stages_organizer_all" ON public.competition_stages;
CREATE POLICY "competition_stages_organizer_all" ON public.competition_stages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  );

DROP POLICY IF EXISTS "competition_rounds_organizer_all" ON public.competition_rounds;
CREATE POLICY "competition_rounds_organizer_all" ON public.competition_rounds
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  );

DROP POLICY IF EXISTS "competition_match_slots_organizer_all" ON public.competition_match_slots;
CREATE POLICY "competition_match_slots_organizer_all" ON public.competition_match_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin'))
  );
