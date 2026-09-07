-- BaseOS — Tabela de Auditoria Operacional (Fase 4.9.1 / FINDING-01)
-- Registra formalmente todas as mutações esportivas e administrativas críticas do sistema

create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  "user" text not null,
  action text not null,
  entity_type text,
  entity_id text,
  competition_id text,
  competition_name text,
  previous_value text,
  new_value text,
  note text,
  details text,
  created_at timestamptz default now()
);

-- Índices de alta performance para consulta e auditoria
create index if not exists idx_audit_logs_competition on public.audit_logs (competition_id);
create index if not exists idx_audit_logs_timestamp on public.audit_logs (timestamp desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- Comentários para catálogo de dados
comment on table public.audit_logs is 'Trilha de auditoria operacional do BaseOS: quem, quando, o que, competição, entidade e estado antes/depois';

-- Row Level Security (RLS)
alter table public.audit_logs enable row level security;

create policy "Permitir leitura de audit_logs para autenticados e organizadores"
  on public.audit_logs for select
  using (true);

create policy "Permitir inserção de audit_logs para autenticados e sistema"
  on public.audit_logs for insert
  with check (true);
