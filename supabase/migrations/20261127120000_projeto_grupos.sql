-- Grupos dentro dos projetos (como na Monday). Revise antes de rodar. Idempotente.
--
-- Um projeto tem grupos (ex.: "Esta semana", "Backlog"); cada tarefa do projeto pode
-- estar em um grupo. Tarefa sem grupo aparece em "Sem grupo". Apagar um grupo não
-- apaga as tarefas: elas voltam para "Sem grupo".
--
-- RLS ligado e SEM policies, como nas outras tabelas (acesso só pelo servidor).

create table if not exists public.projeto_grupos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  -- Cores da marca: neutro, grafite, laranja, ouro (amarelo), verde, roxo.
  cor text not null default 'neutro'
    check (cor in ('neutro', 'grafite', 'laranja', 'ouro', 'verde', 'roxo')),
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

-- Dois grupos do mesmo projeto não podem ter o mesmo nome.
create unique index if not exists projeto_grupos_nome_idx
  on public.projeto_grupos (projeto_id, lower(btrim(nome)));
create index if not exists projeto_grupos_ordem_idx on public.projeto_grupos (projeto_id, ordem);

alter table public.projeto_grupos enable row level security;

alter table public.tarefas
  add column if not exists grupo_id uuid references public.projeto_grupos (id) on delete set null;

create index if not exists tarefas_grupo_idx on public.tarefas (grupo_id);

-- O grupo da tarefa precisa ser do projeto dela. Sem projeto, não há grupo.
create or replace function public.tarefas_grupo_do_projeto() returns trigger
language plpgsql as $$
begin
  if new.projeto_id is null then
    new.grupo_id := null;
  elsif new.grupo_id is not null and not exists (
    select 1 from public.projeto_grupos g
    where g.id = new.grupo_id and g.projeto_id = new.projeto_id
  ) then
    raise exception 'O grupo precisa ser do mesmo projeto da tarefa.';
  end if;
  return new;
end $$;

drop trigger if exists tarefas_grupo_do_projeto on public.tarefas;
create trigger tarefas_grupo_do_projeto
  before insert or update of grupo_id, projeto_id on public.tarefas
  for each row execute function public.tarefas_grupo_do_projeto();
