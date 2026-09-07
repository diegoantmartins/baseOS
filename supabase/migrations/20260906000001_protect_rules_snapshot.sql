-- BaseOS — Proteção Física e Imutabilidade de rules_snapshot no PostgreSQL (Fase 4.10)
-- Garante que uma vez que rules_snapshot é definido (não nulo), nenhuma operação de UPDATE
-- consiga adulterar ou remover o regulamento congelado no banco de dados.

create or replace function public.trg_fn_protect_competition_rules_snapshot()
returns trigger as $$
begin
  if old.rules_snapshot is not null and (new.rules_snapshot is distinct from old.rules_snapshot) then
    raise exception 'rules_snapshot is immutable once frozen for competition %', old.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_competition_rules_snapshot on public.competitions;

create trigger trg_protect_competition_rules_snapshot
before update on public.competitions
for each row execute function public.trg_fn_protect_competition_rules_snapshot();
