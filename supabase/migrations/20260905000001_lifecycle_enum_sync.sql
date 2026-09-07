-- BaseOS — Sincronização do enum competition_status com o lifecycle canônico (Fase 3.2)
-- Adiciona os 6 valores canônicos que a aplicação já utiliza no TypeScript:
-- planning, registration-open, registration-closed, draw-pending, groups-defined, playoffs

ALTER TYPE public.competition_status ADD VALUE IF NOT EXISTS 'planning';
ALTER TYPE public.competition_status ADD VALUE IF NOT EXISTS 'registration-open';
ALTER TYPE public.competition_status ADD VALUE IF NOT EXISTS 'registration-closed';
ALTER TYPE public.competition_status ADD VALUE IF NOT EXISTS 'draw-pending';
ALTER TYPE public.competition_status ADD VALUE IF NOT EXISTS 'groups-defined';
ALTER TYPE public.competition_status ADD VALUE IF NOT EXISTS 'playoffs';
