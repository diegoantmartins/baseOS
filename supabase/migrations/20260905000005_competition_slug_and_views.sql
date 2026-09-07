-- BaseOS — Fase 3.3: Identidade Pública, Slugs Estáveis e Views Públicas
-- 1. Adição segura da coluna slug
-- 2. Geração determinística de slugs para competições legadas
-- 3. Resolução de colisões numéricas (-2, -3)
-- 4. Criação de índice único
-- 5. Views públicas seguras sem vazamento de access_token ou dados confidenciais

-- ============================================================================
-- 1. Coluna slug (nullable inicialmente)
-- ============================================================================
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS slug text;

-- ============================================================================
-- 2. População determinística e segura de slugs para registros existentes
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  v_base_slug text;
  v_candidate text;
  v_counter integer;
BEGIN
  FOR r IN SELECT id, name FROM public.competitions WHERE slug IS NULL OR slug = '' LOOP
    -- Normalização básica de caracteres acentuados em português
    v_base_slug := lower(r.name);
    v_base_slug := translate(v_base_slug,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn');
    -- Substitui caracteres não alfanuméricos por hífen
    v_base_slug := regexp_replace(v_base_slug, '[^a-z0-9]+', '-', 'g');
    -- Remove hífens nas bordas
    v_base_slug := trim(both '-' from v_base_slug);
    
    IF v_base_slug = '' OR v_base_slug IS NULL THEN
      v_base_slug := 'competicao';
    END IF;

    v_candidate := v_base_slug;
    v_counter := 1;

    -- Resolução de colisões semânticas por sufixo numérico (-2, -3, ...)
    WHILE EXISTS (SELECT 1 FROM public.competitions WHERE slug = v_candidate AND id <> r.id) LOOP
      v_counter := v_counter + 1;
      v_candidate := v_base_slug || '-' || v_counter;
    END LOOP;

    UPDATE public.competitions
    SET slug = v_candidate
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- ============================================================================
-- 3. Índice Único para garantir unicidade e performance de busca
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitions_slug
  ON public.competitions (slug);

-- ============================================================================
-- 4. Views Públicas Seguras (Public Read Layer)
-- ============================================================================

-- View pública de competições: projeta apenas dados esportivos públicos,
-- sem observações internas e expondo apenas as regras necessárias do config
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
  rules_snapshot
FROM public.competitions;

-- View pública de equipes: omite estruturalmente access_token e registration_deadline
CREATE OR REPLACE VIEW public.public_competition_teams AS
SELECT
  ct.id,
  ct.competition_id,
  ct.team_id,
  ct.team_name,
  ct.team_short_name,
  ct.status AS registration_status,
  t.city,
  t.state
FROM public.competition_teams ct
JOIN public.teams t ON t.id = ct.team_id;

-- Permissões das views públicas: apenas SELECT para anon e authenticated
GRANT SELECT ON public.public_competitions TO anon, authenticated;
GRANT SELECT ON public.public_competition_teams TO anon, authenticated;
