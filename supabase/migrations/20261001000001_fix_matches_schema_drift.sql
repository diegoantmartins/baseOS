-- ============================================================================
-- BaseOS — Remediação P0: Correção de Schema Drift na Tabela public.matches
-- Migration: 20261001000001_fix_matches_schema_drift.sql
-- ============================================================================
--
-- Contexto:
-- A auditoria forense identificou divergências entre os schemas locais e de ensaio:
--   - Em bancos ativos (volei_test_db, postgres): as colunas de homologação e W.O. não existiam.
--   - Em bancos de ensaio (rehearsal): 'homologated_by' foi criado como text e
--     'checked_in_athlete_ids' como jsonb, divergindo do contrato canônico.
--
-- Objetivos desta migration:
-- 1. Unificar atomicamente o schema de public.matches de modo 100% idempotente.
-- 2. Garantir tipos canônicos:
--      - homologated_at         -> timestamptz (nullable)
--      - homologated_by         -> uuid (nullable)
--      - checked_in_athlete_ids -> text[] (nullable)
--      - custom_set_format      -> text (nullable)
--      - is_wo                  -> boolean (default false)
--      - wo_reason              -> text (nullable)
-- 3. Criar índices parciais de performance para consultas de homologação e W.O.
-- 4. Registrar comentários no catálogo de metadados do PostgreSQL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Coluna: homologated_at (timestamptz, nulo)
-- ----------------------------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS homologated_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2. Coluna: homologated_by (uuid, nulo)
-- Se não existir, adiciona como uuid.
-- Se já existir (ex: como text em bancos de rehearsal), normaliza e converte com cast.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'matches' 
      AND column_name = 'homologated_by'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN homologated_by uuid;
  ELSE
    IF (
      SELECT udt_name FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'matches' 
        AND column_name = 'homologated_by'
    ) <> 'uuid' THEN
      ALTER TABLE public.matches 
        ALTER COLUMN homologated_by TYPE uuid 
        USING CASE 
          WHEN homologated_by IS NULL OR trim(homologated_by::text) = '' THEN NULL
          WHEN homologated_by::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN homologated_by::text::uuid
          ELSE NULL 
        END;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Coluna: checked_in_athlete_ids (text[], nulo)
-- Se não existir, adiciona como text[].
-- Se existir como jsonb ou outro tipo incompatível, converte para text[].
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'matches' 
      AND column_name = 'checked_in_athlete_ids'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN checked_in_athlete_ids text[];
  ELSE
    IF (
      SELECT data_type FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'matches' 
        AND column_name = 'checked_in_athlete_ids'
    ) <> 'ARRAY' THEN
      ALTER TABLE public.matches 
        ALTER COLUMN checked_in_athlete_ids TYPE text[] 
        USING CASE
          WHEN checked_in_athlete_ids IS NULL THEN NULL
          WHEN jsonb_typeof(checked_in_athlete_ids::jsonb) = 'array' THEN 
            ARRAY(SELECT jsonb_array_elements_text(checked_in_athlete_ids::jsonb))
          ELSE NULL
        END;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Coluna: custom_set_format (text, nulo)
-- ----------------------------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS custom_set_format text;

-- ----------------------------------------------------------------------------
-- 5. Coluna: is_wo (boolean, default false)
-- ----------------------------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_wo boolean DEFAULT false;

ALTER TABLE public.matches
  ALTER COLUMN is_wo SET DEFAULT false;

-- ----------------------------------------------------------------------------
-- 6. Coluna: wo_reason (text, nulo)
-- ----------------------------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS wo_reason text;

-- ----------------------------------------------------------------------------
-- 7. Índices Operacionais e de Desempenho
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_matches_homologated_at
  ON public.matches (homologated_at)
  WHERE homologated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_is_wo
  ON public.matches (is_wo)
  WHERE is_wo = true;

-- ----------------------------------------------------------------------------
-- 8. Documentação no Catálogo de Metadados
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.matches.homologated_at IS
  'Data/hora oficial em que o resultado da partida foi homologado pela coordenação.';

COMMENT ON COLUMN public.matches.homologated_by IS
  'Identificador UUID do usuário (coordenador/admin) responsável pela homologação da partida.';

COMMENT ON COLUMN public.matches.checked_in_athlete_ids IS
  'Array de IDs dos atletas que realizaram check-in/validação presencial para a partida.';

COMMENT ON COLUMN public.matches.custom_set_format IS
  'Formato customizado de sets da partida (ex: 3-sets, 5-sets), quando diferente do padrão da competição.';

COMMENT ON COLUMN public.matches.is_wo IS
  'Indica se a partida foi encerrada por Walkover (W.O.).';

COMMENT ON COLUMN public.matches.wo_reason IS
  'Motivo ou justificativa técnica/operacional registrada para a ocorrência do W.O.';
