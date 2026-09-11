-- BaseOS — Fase 6.1: Destaque da Partida (MVP)
-- Adiciona exclusivamente a coluna highlight_athlete_id na tabela public.matches
-- Sem campos redundantes (sem highlight_team_id, sem highlight_notes)
-- Integridade referencial com ON DELETE SET NULL para evitar órfãos em caso de exclusão de atleta

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS highlight_athlete_id text REFERENCES public.competition_athletes(id) ON DELETE SET NULL;

-- Índice condicional para consultas de atletas em destaque
CREATE INDEX IF NOT EXISTS idx_matches_highlight_athlete
  ON public.matches (highlight_athlete_id)
  WHERE highlight_athlete_id IS NOT NULL;

COMMENT ON COLUMN public.matches.highlight_athlete_id IS 'Atleta eleito como Destaque da Partida (MVP). A equipe é derivada a partir de competition_athletes.competition_team_id.';
