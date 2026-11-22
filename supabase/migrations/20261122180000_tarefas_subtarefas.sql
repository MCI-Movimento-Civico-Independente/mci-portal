-- Tarefas, parte 2: subtarefas, responsável opcional e campos personalizados.
-- Revise antes de rodar. Idempotente.

-- 1. Subtarefas: uma tarefa aponta para a tarefa-pai. Apagar a pai apaga as filhas.
alter table public.tarefas
  add column if not exists pai_id uuid references public.tarefas (id) on delete cascade;

create index if not exists tarefas_pai_idx on public.tarefas (pai_id);

-- 2. Campos personalizados (futura central de administração de formulários).
--    Por ora guarda só um objeto vazio; a definição dos campos virá em tabelas próprias.
alter table public.tarefas
  add column if not exists campos jsonb not null default '{}'::jsonb;

-- 3. "Atribuído a" passa a ser opcional. Se a conta for apagada, a tarefa fica
--    sem responsável em vez de sumir.
alter table public.tarefas alter column responsavel_id drop not null;

do $$
declare nome text;
begin
  select c.conname into nome
  from pg_constraint c
  where c.conrelid = 'public.tarefas'::regclass
    and c.contype = 'f'
    and c.conkey = (
      select array[a.attnum] from pg_attribute a
      where a.attrelid = 'public.tarefas'::regclass and a.attname = 'responsavel_id'
    );
  if nome is not null then
    execute format('alter table public.tarefas drop constraint %I', nome);
  end if;
  alter table public.tarefas
    add constraint tarefas_responsavel_id_fkey
    foreign key (responsavel_id) references public.contas (id) on delete set null;
end $$;

-- 4. Só um nível de subtarefa (como no Jira): subtarefa não tem subtarefa.
create or replace function public.tarefas_um_nivel() returns trigger
language plpgsql as $$
begin
  if new.pai_id is not null then
    if new.pai_id = new.id then
      raise exception 'Uma tarefa não pode ser subtarefa de si mesma.';
    end if;
    if exists (select 1 from public.tarefas where id = new.pai_id and pai_id is not null) then
      raise exception 'Subtarefas não podem ter subtarefas.';
    end if;
    if exists (select 1 from public.tarefas where pai_id = new.id) then
      raise exception 'Uma tarefa que já tem subtarefas não pode virar subtarefa.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists tarefas_um_nivel on public.tarefas;
create trigger tarefas_um_nivel
  before insert or update of pai_id on public.tarefas
  for each row execute function public.tarefas_um_nivel();
