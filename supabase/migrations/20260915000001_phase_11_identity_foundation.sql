-- BaseOS — Fase 11.1: fundação aditiva de identidade, organização e participação.
--
-- Esta migration NÃO remove, renomeia nem preenche colunas legadas. Ela prepara o
-- schema para uma migração controlada em etapas, preservando teams,
-- competition_teams, competition_athletes e profiles existentes.
--
-- As novas FKs em tabelas existentes começam nullable intencionalmente. O backfill
-- só pode ocorrer após relatório de mapeamento e checkpoint humano.

-- ============================================================================
-- 1. Organizações: entidade proprietária persistente de equipes e competições
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  legal_name TEXT,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'blocked', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS
  'Entidade persistente responsável por equipes e competições. Não representa um contexto de acesso.';

-- ============================================================================
-- 2. Contexto organizacional das entidades persistentes
-- ============================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS organization_id TEXT
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS gender_category public.gender_category;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS organization_id TEXT
    REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- A unicidade só passa a valer para linhas associadas à organização. Isso mantém
-- os dados legados válidos até o backfill aprovado, sem usar nome como identidade.
CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_organization_gender
  ON public.teams (organization_id, gender_category)
  WHERE organization_id IS NOT NULL AND gender_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_organization
  ON public.teams (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competitions_organization
  ON public.competitions (organization_id)
  WHERE organization_id IS NOT NULL;

COMMENT ON COLUMN public.teams.organization_id IS
  'FK aditiva da organização proprietária; nullable até backfill validado da Fase 11.';
COMMENT ON COLUMN public.teams.gender_category IS
  'Categoria persistente da equipe. Junto de organization_id compõe a identidade inicial da equipe.';
COMMENT ON COLUMN public.competitions.organization_id IS
  'FK aditiva da organização promotora; nullable até backfill validado da Fase 11.';

-- ============================================================================
-- 3. Atleta global e vínculo com a participação de competição
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.athletes (
  id TEXT PRIMARY KEY,
  normalized_cpf TEXT,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT athletes_normalized_cpf_format
    CHECK (normalized_cpf IS NULL OR normalized_cpf ~ '^[0-9]{11}$')
);

-- CPF é opcional; quando informado, é a chave de reutilização de identidade.
CREATE UNIQUE INDEX IF NOT EXISTS uq_athletes_normalized_cpf
  ON public.athletes (normalized_cpf)
  WHERE normalized_cpf IS NOT NULL;

ALTER TABLE public.competition_athletes
  ADD COLUMN IF NOT EXISTS athlete_id TEXT
    REFERENCES public.athletes(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_competition_athletes_athlete
  ON public.competition_athletes (athlete_id)
  WHERE athlete_id IS NOT NULL;

COMMENT ON TABLE public.athletes IS
  'Identidade global de atleta. Dados específicos de torneio pertencem a competition_athletes.';
COMMENT ON COLUMN public.competition_athletes.athlete_id IS
  'FK aditiva para a identidade global. Nullable até backfill determinístico e validação de CPF.';

-- ============================================================================
-- 4. Memberships: acesso contextual, histórico e sem sobrescrever identidade
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_memberships (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  competition_id TEXT REFERENCES public.competitions(id) ON DELETE RESTRICT,
  team_id TEXT REFERENCES public.teams(id) ON DELETE RESTRICT,
  competition_team_id TEXT REFERENCES public.competition_teams(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN (
    'admin', 'organizer', 'team_manager', 'referee', 'scorer', 'viewer'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'blocked', 'ended'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user_status
  ON public.user_memberships (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_memberships_organization
  ON public.user_memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_competition
  ON public.user_memberships (competition_id)
  WHERE competition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_memberships_team
  ON public.user_memberships (team_id)
  WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_memberships_competition_team
  ON public.user_memberships (competition_team_id)
  WHERE competition_team_id IS NOT NULL;

COMMENT ON TABLE public.user_memberships IS
  'Relação histórica de acesso. O contexto selecionado no frontend nunca substitui a autorização por esta tabela/RLS.';
COMMENT ON COLUMN public.user_memberships.competition_team_id IS
  'Bridge explícita para autorização precisa do portal durante a transição de profiles.competition_team_id.';

-- RLS é habilitada desde a criação, mas policies só serão acrescentadas no bloco
-- dedicado de segurança após backfill e testes de matriz de autorização.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
