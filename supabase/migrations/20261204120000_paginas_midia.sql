-- Páginas: arquivos e imagens (com cota por projeto) e prévia de links. Revise antes de rodar. Idempotente.
-- Precisa da 20261203120000_projeto_abas_paginas.sql.
--
-- RLS ligado e SEM policies, como nas outras tabelas: o acesso é só pelo servidor.

-- 1) Um registro por upload. Conta na cota enquanto excluido_em for nulo.
create table if not exists public.projeto_arquivos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  -- Página onde foi enviado (o arquivo pode aparecer em outras do mesmo projeto).
  aba_id uuid references public.projeto_abas (id) on delete set null,
  caminho text not null unique,
  nome text not null check (char_length(nome) between 1 and 200),
  tamanho bigint not null check (tamanho > 0),
  tipo text not null,
  -- Falso entre o pedido de envio e a conferência do arquivo no servidor.
  confirmado boolean not null default false,
  criado_por uuid references public.contas (id) on delete set null,
  criado_em timestamptz not null default now(),
  -- Marcado quando nenhuma página ativa usa o arquivo. O arquivo continua no Storage.
  excluido_em timestamptz
);

create index if not exists projeto_arquivos_ativos_idx
  on public.projeto_arquivos (projeto_id) where excluido_em is null;
create index if not exists projeto_arquivos_aba_idx on public.projeto_arquivos (aba_id);

alter table public.projeto_arquivos enable row level security;

-- 2) Arquivos citados em cada página (preenchido pelo servidor a cada salvamento).
alter table public.projeto_paginas add column if not exists arquivos uuid[] not null default '{}';

-- 3) Cache das prévias de link (7 dias).
create table if not exists public.link_previews (
  url text primary key check (char_length(url) <= 2000),
  titulo text,
  descricao text,
  imagem_url text,
  buscado_em timestamptz not null default now()
);

alter table public.link_previews enable row level security;

-- 4) Bucket privado das páginas: até 5 MB, só WebP, PDF, DOCX, XLSX e PPTX.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'paginas', 'paginas', false, 5242880,
  array[
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
