-- Formulários de tarefa (um por comitê, como as marcas na Zendesk). Revise antes de rodar. Idempotente.
--
-- Um formulário é um nome + um conjunto de campos. Campos fixos (Assunto, Descrição,
-- Status, Comitê, Formulário) existem sempre e não ficam aqui; esta tabela guarda só
-- os campos que dá para adicionar e remover. Cada comitê aponta para o seu formulário
-- padrão; sem apontar, vale o "Padrão geral".
--
-- formulario_campos.chave não tem CHECK de propósito: a lista de campos válidos vive
-- no código (registro de campos) e vai ganhar os campos personalizados no próximo passo.
--
-- RLS ligado e SEM policies, como nas outras tabelas (acesso só pelo servidor).

create table if not exists public.formularios (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(btrim(nome)) between 1 and 80),
  descricao text check (descricao is null or char_length(descricao) <= 500),
  padrao boolean not null default false,
  criado_em timestamptz not null default now()
);

-- No máximo um "Padrão geral".
create unique index if not exists formularios_um_padrao on public.formularios ((true)) where padrao;

create table if not exists public.formulario_campos (
  formulario_id uuid not null references public.formularios (id) on delete cascade,
  chave text not null check (char_length(chave) between 1 and 80),
  primary key (formulario_id, chave)
);

alter table public.formularios enable row level security;
alter table public.formulario_campos enable row level security;

-- O Padrão geral não pode ser excluído.
create or replace function public.formularios_protege_padrao() returns trigger
language plpgsql as $$
begin
  if old.padrao then
    raise exception 'O formulário padrão geral não pode ser excluído.';
  end if;
  return old;
end $$;

drop trigger if exists formularios_protege_padrao on public.formularios;
create trigger formularios_protege_padrao
  before delete on public.formularios
  for each row execute function public.formularios_protege_padrao();

-- Semente: o Padrão geral, com todos os campos opcionais de hoje.
insert into public.formularios (nome, descricao, padrao)
values ('Padrão geral', 'Formulário de tarefas usado pelos comitês que não têm um próprio.', true)
on conflict (nome) do nothing;

insert into public.formulario_campos (formulario_id, chave)
select f.id, c.chave
from public.formularios f
cross join (values ('projeto_id'), ('solicitante_id'), ('responsavel_id'),
                   ('prioridade'), ('data_inicio'), ('prazo')) as c (chave)
where f.padrao
on conflict do nothing;

-- Padrão por comitê (vazio = usa o Padrão geral) e formulário de cada tarefa
-- (vazio = Padrão geral). Apagar um formulário solta as referências.
alter table public.comites_org
  add column if not exists formulario_id uuid references public.formularios (id) on delete set null;

alter table public.tarefas
  add column if not exists formulario_id uuid references public.formularios (id) on delete set null;

create index if not exists tarefas_formulario_idx on public.tarefas (formulario_id);
