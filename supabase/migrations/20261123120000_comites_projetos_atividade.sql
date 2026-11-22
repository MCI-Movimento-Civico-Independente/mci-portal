-- Comitês, projetos, comentários e histórico das tarefas. Revise antes de rodar. Idempotente.
--
-- Os comitês do portal ficam numa tabela PRÓPRIA (comites_org) e NÃO na tabela
-- `comites` do bot: aquela exige chat_id e coordenador_id (ids do Telegram) e o
-- Carcará poderia passar a listar comitês sem grupo. Quando quiserem, a ligação
-- entre as duas é feita pelo slug.
--
-- Como nas outras tabelas: RLS ligado e SEM policies. O portal acessa só pelo
-- servidor, com a service role, depois de conferir a sessão e o papel.

-- 1. Comitês
create table if not exists public.comites_org (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  nome text not null unique,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

insert into public.comites_org (slug, nome, ordem) values
  ('coordenacao', 'Comitê de Coordenação', 1),
  ('pesquisa', 'Comitê de Pesquisa, Pautas e Dossiês', 2),
  ('ti', 'Comitê de TI – Automação e Logística', 3),
  ('midia', 'Comitê de Mídia, Design e Edição', 4),
  ('conteudo', 'Comitê de Criação de Conteúdo', 5)
on conflict (slug) do nothing;

alter table public.comites_org enable row level security;

-- 2. Projetos (cada projeto pertence a um comitê)
create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  comite_slug text not null references public.comites_org (slug) on update cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  descricao text check (descricao is null or char_length(descricao) <= 1000),
  status text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  criado_por uuid references public.contas (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists projetos_comite_idx on public.projetos (comite_slug, status);
alter table public.projetos enable row level security;

-- 3. Tarefas: ligação com comitê e projeto.
--    comite_slug já existia como texto livre; agora aponta para comites_org.
--    Valores antigos que não existam em comites_org são limpos antes da chave.
update public.tarefas set comite_slug = null
  where comite_slug is not null
    and comite_slug not in (select slug from public.comites_org);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tarefas_comite_slug_fkey' and conrelid = 'public.tarefas'::regclass
  ) then
    alter table public.tarefas
      add constraint tarefas_comite_slug_fkey
      foreign key (comite_slug) references public.comites_org (slug)
      on update cascade on delete set null;
  end if;
end $$;

alter table public.tarefas
  add column if not exists projeto_id uuid references public.projetos (id) on delete set null;

create index if not exists tarefas_comite_idx on public.tarefas (comite_slug);
create index if not exists tarefas_projeto_idx on public.tarefas (projeto_id);

-- 4. Comentários da tarefa
create table if not exists public.tarefa_comentarios (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas (id) on delete cascade,
  autor_id uuid references public.contas (id) on delete set null,
  texto text not null check (char_length(btrim(texto)) between 1 and 4000),
  criado_em timestamptz not null default now()
);

create index if not exists tarefa_comentarios_idx on public.tarefa_comentarios (tarefa_id, criado_em);
alter table public.tarefa_comentarios enable row level security;

-- 5. Histórico da tarefa (quem mudou o quê). Gravado pelo portal a cada alteração.
create table if not exists public.tarefa_historico (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas (id) on delete cascade,
  autor_id uuid references public.contas (id) on delete set null,
  tipo text not null
    check (tipo in ('criada', 'campo', 'descricao', 'subtarefa_adicionada', 'subtarefa_removida')),
  campo text,
  de_texto text,
  para_texto text,
  criado_em timestamptz not null default now()
);

create index if not exists tarefa_historico_idx on public.tarefa_historico (tarefa_id, criado_em);
alter table public.tarefa_historico enable row level security;
