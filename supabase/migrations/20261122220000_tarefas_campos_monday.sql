-- Tarefas, parte 3: campos no estilo Monday (solicitante, prioridade, período).
-- Revise antes de rodar. Idempotente.
--
-- Nomes: responsavel_id continua sendo o "Executor" na tela (evita renomear a coluna).
-- prazo continua sendo a data de entrega; data_inicio é o "de quando".

-- Prioridade (opcional). Sem valor = "não definida".
alter table public.tarefas
  add column if not exists prioridade text
    check (prioridade is null or prioridade in ('baixa', 'media', 'alta', 'urgente'));

-- Solicitante: quem pediu a tarefa. Se a conta for apagada, fica sem solicitante.
alter table public.tarefas
  add column if not exists solicitante_id uuid references public.contas (id) on delete set null;

-- Início do período (o "até quando" é o prazo).
alter table public.tarefas add column if not exists data_inicio date;

-- O início não pode ser depois da entrega.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tarefas_periodo_check' and conrelid = 'public.tarefas'::regclass
  ) then
    alter table public.tarefas
      add constraint tarefas_periodo_check
      check (data_inicio is null or prazo is null or data_inicio <= prazo);
  end if;
end $$;

-- Tarefas que já existem: o solicitante passa a ser quem criou.
update public.tarefas set solicitante_id = criado_por where solicitante_id is null;
