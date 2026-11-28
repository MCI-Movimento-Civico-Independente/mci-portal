-- Abas dos projetos e páginas (estilo Notion). Revise antes de rodar. Idempotente.
--
-- O "Quadro principal" não tem linha aqui: é sempre a primeira aba, fixa.
-- RLS ligado e SEM policies, como nas outras tabelas: o acesso é só pelo servidor, que
-- confere o login e o papel (quem acessa o projeto acessa as páginas dele).

create table if not exists public.projeto_abas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  -- Novos tipos (tabela, calendário, cronograma) entram nesta lista depois.
  tipo text not null default 'pagina' check (tipo in ('pagina')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  posicao int not null default 0,
  criado_por uuid references public.contas (id) on delete set null,
  criado_em timestamptz not null default now(),
  -- Exclusão lógica: a aba some do portal, mas o conteúdo continua no banco.
  excluido_em timestamptz
);

create index if not exists projeto_abas_ativas_idx
  on public.projeto_abas (projeto_id, posicao) where excluido_em is null;

create table if not exists public.projeto_paginas (
  aba_id uuid primary key references public.projeto_abas (id) on delete cascade,
  -- Documento do Tiptap. O servidor limita a 500 KB; o check é só uma trava de segurança.
  conteudo jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
    check (octet_length(conteudo::text) <= 1048576),
  -- Texto puro, para busca.
  conteudo_texto text not null default '',
  -- Controle de conflito: cada salvamento confere a versão carregada e soma 1.
  versao int not null default 1,
  atualizado_por uuid references public.contas (id) on delete set null,
  atualizado_em timestamptz not null default now()
);

alter table public.projeto_abas enable row level security;
alter table public.projeto_paginas enable row level security;
