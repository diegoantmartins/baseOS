-- BASEOS — módulo de sorteio: adicionar status do sorteio
-- Adiciona campo status para controlar ciclo de vida do sorteio

-- Status do sorteio:
-- 'preview': rascunho (pode ser modificado)
-- 'official': sorteio oficial (ainda pode ser bloqueado)
-- 'locked': sorteio bloqueado (não pode ser modificado)

alter table public.draws
add column if not exists status text default 'preview'
check (status in ('preview', 'official', 'locked'));

comment on column public.draws.status is 'Status do sorteio: preview (rascunho), official (oficial), locked (bloqueado)';

-- Atualizar valores existentes para preview
update public.draws set status = 'preview' where status is null;

-- Migração LocalStorage: o campo status é opcional em DrawRecord
-- A lógica de validação está em dataAccess.ts (saveDrawWithMatches)
