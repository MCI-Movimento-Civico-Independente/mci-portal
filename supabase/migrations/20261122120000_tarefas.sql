-- Tarefas do portal (parte 3). Revise antes de rodar. Idempotente.
--
-- Cada tarefa tem um responsável, que é uma CONTA MCI (contas.id), não um id do
-- Telegram. A ponte com o Telegram, quando precisar (ex.: coordenador do comitê),
-- é feita por identidades(provedor 'telegram').
--
-- comite_slug é só texto, sem chave estrangeira: não dá para garantir daqui que
-- comites.slug é único no esquema do bot (e a tabela está vazia por enquanto).
-- Projetos entram na próxima etapa, com uma coluna projeto_id nova.

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  descricao text check (descricao is null or char_length(descricao) <= 2000),
  status text not null default 'a_fazer'
    check (status in ('a_fazer', 'em_andamento', 'em_revisao', 'concluida')),
  prazo date,
  comite_slug text,
  responsavel_id uuid not null references public.contas (id) on delete cascade,
  criado_por uuid references public.contas (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluida_em timestamptz
);

create index if not exists tarefas_responsavel_idx
  on public.tarefas (responsavel_id, status, prazo);

-- RLS ligado e SEM policies: o portal acessa só pelo servidor, com a service role,
-- sempre filtrando pela conta da sessão. anon/authenticated não leem nem escrevem.
alter table public.tarefas enable row level security;
