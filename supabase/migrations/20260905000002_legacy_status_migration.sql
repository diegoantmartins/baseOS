-- BaseOS — Migração de registros legados de status da competição (Fase 3.2)
-- Mapeamento canônico comprovado:
-- 'draft'        -> 'planning'
-- 'registration' -> 'registration-open'
--
-- Executado em migration separada para assegurar que os novos valores do enum
-- 'competition_status' adicionados em 20260905000001 já estejam commitados na transação do PostgreSQL.

UPDATE public.competitions
SET status = 'planning'
WHERE status = 'draft';

UPDATE public.competitions
SET status = 'registration-open'
WHERE status = 'registration';
