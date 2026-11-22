-- Mais de um executor por tarefa. Revise antes de rodar. Idempotente.
--
-- "responsavel_id" continua sendo o primeiro executor (o que aparece em "Minhas tarefas" e
-- no Início). Os demais ficam em "executores_extra" (ids de contas). Sem chave estrangeira:
-- a lista é validada pelo servidor contra os membros da organização.

alter table public.tarefas
  add column if not exists executores_extra uuid[] not null default '{}';

create index if not exists tarefas_executores_extra_idx on public.tarefas using gin (executores_extra);
