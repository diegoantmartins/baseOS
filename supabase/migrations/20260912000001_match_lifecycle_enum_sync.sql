-- BaseOS — Sincronização do enum match_status com o ciclo de vida canônico (Fase 7.4)
-- Alinha o tipo PostgreSQL match_status com o tipo TypeScript MatchLifecycleStatus
-- Valores adicionados: awaiting_schedule, negotiating, sheet_available, awaiting_homologation, homologated, rescheduled, wo

ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'awaiting_schedule';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'negotiating';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'sheet_available';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'awaiting_homologation';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'homologated';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'rescheduled';
ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'wo';
