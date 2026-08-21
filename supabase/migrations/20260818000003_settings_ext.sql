-- ============================================================================
-- Extensão de app_settings: dados da organização e novas preferências
-- ============================================================================

alter table public.app_settings add column if not exists org_code text not null default '';
alter table public.app_settings add column if not exists cnpj text not null default '';
alter table public.app_settings add column if not exists website text not null default '';

-- Preferências de notificação adicionais + regras de jogo (pontos para
-- vencer set e tempos técnicos por set). Valores padrão mesclados pelo
-- adapter (dataAccess), então a linha existente continua válida.

update public.app_settings set notifications = notifications || '{"liveGames":true,"pendingSheets":true,"dailyDigest":false}';
update public.app_settings set rules = rules || '{"setPoints":25,"timeoutsPerSet":2}';

-- Idioma: passa a aceitar espanhol.
alter table public.app_settings drop constraint if exists app_settings_language_check;
alter table public.app_settings add constraint app_settings_language_check check (language in ('pt-BR', 'en', 'es'));