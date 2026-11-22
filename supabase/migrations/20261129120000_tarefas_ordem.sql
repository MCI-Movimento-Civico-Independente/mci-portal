-- Ordem manual das tarefas dentro do grupo (arrastar e soltar). Revise antes de rodar. Idempotente.
--
-- "ordem" é um número fracionário: soltar uma tarefa entre duas outras usa a média da
-- ordem delas, sem renumerar o grupo inteiro. Tarefa nova entra no fim (padrão = agora).

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tarefas' and column_name = 'ordem'
  ) then
    alter table public.tarefas add column ordem double precision not null default extract(epoch from now());
    -- Mantém a ordem atual (por criação) nas tarefas que já existiam.
    update public.tarefas set ordem = extract(epoch from criado_em);
  end if;
end $$;

create index if not exists tarefas_grupo_ordem_idx on public.tarefas (grupo_id, ordem);
