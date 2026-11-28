-- Páginas: JPEG no envio, cópia de anexos entre projetos e imagem guardada das prévias de link.
-- Revise antes de rodar. Idempotente. Precisa da 20261204120000_paginas_midia.sql.

-- 1) Aparelhos que não geram WebP (iPhone, Safari) enviam JPEG.
update storage.buckets
  set allowed_mime_types = array[
    'image/webp',
    'image/jpeg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
  where id = 'paginas';

-- 2) Arquivo copiado de outro projeto: guarda de qual veio, para não copiar duas vezes.
alter table public.projeto_arquivos
  add column if not exists origem_id uuid references public.projeto_arquivos (id) on delete set null;
create index if not exists projeto_arquivos_origem_idx
  on public.projeto_arquivos (projeto_id, origem_id) where origem_id is not null;

-- 3) Imagens dos cartões de link, já reduzidas pelo servidor. Privado, fora da cota dos projetos.
--    link_previews.imagem_url passa a guardar o nome do arquivo neste bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('previas', 'previas', false, 2097152, array['image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
