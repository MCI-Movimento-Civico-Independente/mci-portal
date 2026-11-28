-- XP por tarefas concluídas no portal. Revise antes de rodar. Idempotente.
--
-- Usa o que o bot já tem (xp_eventos, xp_regras, registrar_evento, perfil_xp):
-- aqui só entram as regras. O unique (conta_id, acao, referencia) de xp_eventos
-- garante que cada pessoa recebe uma vez por item.
--
-- Atenção: o limite de 10 por dia em tarefa_concluida vale também para quem mais
-- registrar essa ação (por exemplo, o bot).

insert into public.xp_regras (acao, descricao, xp, limite_diario, uma_vez, ativa)
values
  ('tarefa_concluida',    'Concluiu uma tarefa',          20, 10,   false, true),
  ('subtarefa_concluida', 'Concluiu uma subtarefa',        5, 10,   false, true),
  ('tarefa_no_prazo',     'Concluiu uma tarefa no prazo',  5, null, false, true)
on conflict (acao) do update
  set xp = excluded.xp,
      limite_diario = excluded.limite_diario,
      uma_vez = excluded.uma_vez,
      ativa = excluded.ativa;
