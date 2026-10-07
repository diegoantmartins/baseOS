BEGIN;

-- ============================================================================
-- BASEOS - GATE 2A.9 / CORREÇÃO DO UNIQUE INDEX DE ATLETAS (normalized_cpf)
--
-- Remove o índice não-unique legado (se presente) e assegura o índice UNIQUE
-- parcial necessário para a arbitração de ON CONFLICT em get_or_create_athlete_id.
-- ============================================================================

-- 1. Remove índice não-unique legado se existir
DROP INDEX IF EXISTS public.idx_athletes_normalized_cpf;

-- 2. Cria o índice UNIQUE canônico com predicado parcial
CREATE UNIQUE INDEX IF NOT EXISTS uq_athletes_normalized_cpf
  ON public.athletes (normalized_cpf)
  WHERE normalized_cpf IS NOT NULL;

-- 3. Documentação do objeto
COMMENT ON INDEX public.uq_athletes_normalized_cpf IS
  'Garante unicidade global de atletas por CPF normalizado (parcial, permitindo múltiplos NULLs) para suporte à arbitração de conflitos no get_or_create_athlete_id.';

COMMIT;
