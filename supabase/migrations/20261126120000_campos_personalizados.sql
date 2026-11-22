-- Campos personalizados dos formulários. Revise antes de rodar. Idempotente.
--
-- Um campo é criado uma vez e pode entrar em vários formulários (formulario_campos.chave
-- guarda 'p:<id do campo>'). Os valores de cada tarefa ficam em tarefas.campos (jsonb),
-- na forma {"<id do campo>": valor}. Arquivar um campo o esconde dos formulários, mas
-- não apaga os valores já gravados nas tarefas.
--
-- RLS ligado e SEM policies, como nas outras tabelas (acesso só pelo servidor).

create table if not exists public.campos_personalizados (
  id uuid primary key default gen_random_uuid(),
  rotulo text not null check (char_length(btrim(rotulo)) between 1 and 60),
  tipo text not null
    check (tipo in ('texto', 'texto_longo', 'numero', 'data', 'lista', 'caixa')),
  opcoes jsonb not null default '[]'::jsonb check (jsonb_typeof(opcoes) = 'array'),
  obrigatorio boolean not null default false,
  arquivado boolean not null default false,
  criado_por uuid references public.contas (id) on delete set null,
  criado_em timestamptz not null default now(),
  -- Lista precisa de pelo menos uma opção (e não muitas).
  check (tipo <> 'lista' or jsonb_array_length(opcoes) between 1 and 50)
);

-- Dois campos ativos não podem ter o mesmo nome (sem diferenciar maiúsculas).
create unique index if not exists campos_personalizados_rotulo_idx
  on public.campos_personalizados (lower(btrim(rotulo))) where not arquivado;

alter table public.campos_personalizados enable row level security;

-- tarefas.campos precisa ser sempre um objeto JSON.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tarefas_campos_objeto' and conrelid = 'public.tarefas'::regclass
  ) then
    alter table public.tarefas
      add constraint tarefas_campos_objeto check (jsonb_typeof(campos) = 'object');
  end if;
end $$;
