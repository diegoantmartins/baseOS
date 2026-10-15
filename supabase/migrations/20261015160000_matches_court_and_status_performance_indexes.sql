-- Migration: 20261015160000_matches_court_and_status_performance_indexes.sql
-- Descrição: Índices de alto desempenho para leituras concorrentes em matches (status e court)

CREATE INDEX IF NOT EXISTS idx_matches_comp_status ON public.matches (competition_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_comp_court ON public.matches (competition_id, court);
