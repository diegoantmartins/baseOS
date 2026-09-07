-- VolleyPro / BaseOS — Ciclo de vida, integridade e congelamento de regras esportivas (Fase 4.4)
-- Adiciona colunas para configuração canônica e snapshot imutável de regras esportivas

alter table public.competitions
  add column if not exists config jsonb,
  add column if not exists rules_snapshot jsonb;

-- Índices para consultas por integridade e ciclo de vida
create index if not exists idx_competitions_status on public.competitions (status);
