-- ============================================================================
-- Migration: 20261013050000_fix_cadastros_and_cleanup_duplicates.sql
-- BaseOS — Regularização de Cadastros, Limpeza de Duplicidades e Proteção RLS/Integridade
-- ============================================================================

BEGIN;

-- 1. Remove registros duplicados oriundos de duplo-envio / race condition
-- 1.1 Duplicidade de Thomas Eduardo Prezotto (UFFS Realeza)
DELETE FROM public.competition_athletes
WHERE id = 'b7cb310f-8492-486b-9054-d9493a36b665';

-- 1.2 Duplicidade de Luiz Vitor Guerezi (SNK'S CORE VOLEIBOL)
DELETE FROM public.competition_athletes
WHERE id = '6c9c0661-fe24-4ecf-9dcd-846f01083160';

-- 1.3 Registro incompleto de Henrique Rodrigues Ruaro (SNK'S CORE VOLEIBOL, documento 1163 sem nascimento)
DELETE FROM public.competition_athletes
WHERE id = 'a68758af-e67c-496c-a0d1-e5d6eebb78db';

-- 2. Adiciona índices de integridade para prevenção permanente de duplicidade no elenco
DROP INDEX IF EXISTS public.uq_competition_athletes_team_athlete;
CREATE UNIQUE INDEX uq_competition_athletes_team_athlete
  ON public.competition_athletes (competition_team_id, athlete_id)
  WHERE athlete_id IS NOT NULL;

DROP INDEX IF EXISTS public.uq_competition_athletes_team_doc;
CREATE UNIQUE INDEX uq_competition_athletes_team_doc
  ON public.competition_athletes (competition_team_id, document_number)
  WHERE document_number IS NOT NULL AND document_number != '';

-- 3. Registrar migration na tabela schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES ('20261013050000', ARRAY['fix_cadastros_and_cleanup_duplicates'], 'fix_cadastros_and_cleanup_duplicates')
ON CONFLICT (version) DO UPDATE
  SET statements = EXCLUDED.statements, name = EXCLUDED.name;

COMMIT;

NOTIFY pgrst, 'reload schema';
