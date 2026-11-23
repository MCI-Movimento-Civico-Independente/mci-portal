-- Editor de texto rico: descrição das tarefas, comentários e imagens. Revise antes de rodar. Idempotente.
--
-- Reaproveita o que já existe, sem tabelas duplicadas:
--   tarefas.descricao (texto)          -> continua como TEXTO PURO (busca e prévias)
--   tarefas.descricao_doc (jsonb, novo) -> o documento do Tiptap
--   tarefa_comentarios.texto            -> continua como TEXTO PURO
--   tarefa_comentarios.conteudo (jsonb, novo) -> o documento do Tiptap
-- Comentários passam a ter editado_em e exclusão lógica (excluido_em).

-- 1) Descrição das tarefas: documento rico e limite maior (50 mil caracteres de texto).
alter table public.tarefas add column if not exists descricao_doc jsonb;
alter table public.tarefas drop constraint if exists tarefas_descricao_check;
alter table public.tarefas
  add constraint tarefas_descricao_check check (descricao is null or char_length(descricao) <= 50000);

-- 2) Comentários: documento rico, edição e exclusão lógica.
alter table public.tarefa_comentarios add column if not exists conteudo jsonb;
alter table public.tarefa_comentarios add column if not exists editado_em timestamptz;
alter table public.tarefa_comentarios add column if not exists excluido_em timestamptz;
alter table public.tarefa_comentarios drop constraint if exists tarefa_comentarios_texto_check;
alter table public.tarefa_comentarios
  add constraint tarefa_comentarios_texto_check check (char_length(btrim(texto)) between 1 and 50000);

create index if not exists tarefa_comentarios_ativos_idx
  on public.tarefa_comentarios (tarefa_id, criado_em) where excluido_em is null;

-- 3) Bucket privado das imagens. Só o servidor lê (URLs assinadas de 1 hora) e o navegador
--    só envia por URL assinada de upload; por isso não há policies em storage.objects.
--    O bucket já recusa arquivos acima de 8 MB e que não sejam WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', false, 8388608, array['image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/webp'];
