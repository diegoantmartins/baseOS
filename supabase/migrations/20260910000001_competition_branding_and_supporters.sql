-- BaseOS — Fase 2: Identidade da Competição, Logo Oficial e Apoiadores
-- 1. Adição segura e retrocompatível de colunas na tabela public.competitions
-- 2. Atualização da view pública segura public_competitions
-- 3. Concessão de permissões de leitura pública (anon e authenticated)

-- ============================================================================
-- 1. Colunas aditivas de identidade e apoiadores
-- ============================================================================

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS supporters jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Comentários descritivos para documentação do schema
COMMENT ON COLUMN public.competitions.logo_url IS 'Logo/identidade visual oficial da competição (data URI base64 ou URL pública).';
COMMENT ON COLUMN public.competitions.supporters IS 'Lista tipada de apoiadores e patrocinadores exclusivos da competição (JSONB array).';

-- ============================================================================
-- 2. Atualização da View Pública Segura (Public Read Layer)
-- ============================================================================
-- RESSALVA DE AUDITORIA E SEGURANÇA:
-- Inspecionada a definição original em 20260905000005_competition_slug_and_views.sql.
-- Esta atualização preserva integralmente:
--   - Todas as 14 colunas esportivas pré-existentes e o filtro seguro do config (public_config);
--   - O rules_snapshot e permissões de acesso público;
--   - Adiciona aditivamente logo_url e supporters;
--   - Mantém as permissões SELECT para anon e authenticated sem quebra de RLS/segurança.

CREATE OR REPLACE VIEW public.public_competitions AS
SELECT
  id,
  name,
  slug,
  modality,
  format,
  player_format,
  set_format,
  gender_category,
  start_date,
  end_date,
  venue,
  status,
  jsonb_build_object(
    'format', config->'format',
    'scoring', config->'scoring',
    'standings', config->'standings'
  ) AS public_config,
  rules_snapshot,
  logo_url,
  supporters
FROM public.competitions;

-- ============================================================================
-- 3. Permissões da view pública
-- ============================================================================

GRANT SELECT ON public.public_competitions TO anon, authenticated;
