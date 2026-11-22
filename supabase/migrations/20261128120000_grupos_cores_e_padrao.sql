-- Grupos: cores livres (hex) e "Novo grupo" automático. Revise antes de rodar. Idempotente.
--
-- 1) A cor do grupo passa a ser um hex (#rrggbb), para ter uma paleta como a da Monday.
--    Os nomes antigos viram o hex equivalente.
-- 2) Não existe mais "Sem grupo": toda tarefa de projeto fica em algum grupo. Se o projeto
--    ainda não tem grupo, o banco cria um chamado "Novo grupo" e coloca a tarefa nele.

alter table public.projeto_grupos drop constraint if exists projeto_grupos_cor_check;

update public.projeto_grupos set cor = case cor
  when 'neutro' then '#c4c4c4'
  when 'grafite' then '#333333'
  when 'laranja' then '#d54a24'
  when 'ouro' then '#cfbe48'
  when 'verde' then '#00c875'
  when 'roxo' then '#784bd1'
  else cor end
where cor !~ '^#[0-9a-fA-F]{6}$';

alter table public.projeto_grupos alter column cor set default '#579bfc';
alter table public.projeto_grupos
  add constraint projeto_grupos_cor_check check (cor ~ '^#[0-9a-fA-F]{6}$');

-- Tarefa com projeto e sem grupo: usa o primeiro grupo do projeto (cria "Novo grupo" se não houver).
create or replace function public.tarefas_grupo_do_projeto() returns trigger
language plpgsql as $$
begin
  if new.projeto_id is null then
    new.grupo_id := null;
  elsif new.grupo_id is null then
    select g.id into new.grupo_id from public.projeto_grupos g
      where g.projeto_id = new.projeto_id order by g.ordem, g.criado_em limit 1;
    if new.grupo_id is null then
      insert into public.projeto_grupos (projeto_id, nome, ordem)
        values (new.projeto_id, 'Novo grupo', 1)
        on conflict (projeto_id, lower(btrim(nome))) do update set nome = excluded.nome
        returning id into new.grupo_id;
    end if;
  elsif not exists (
    select 1 from public.projeto_grupos g
    where g.id = new.grupo_id and g.projeto_id = new.projeto_id
  ) then
    raise exception 'O grupo precisa ser do mesmo projeto da tarefa.';
  end if;
  return new;
end $$;

-- Tarefas que já estavam sem grupo: cria "Novo grupo" onde faltar e coloca elas nele.
insert into public.projeto_grupos (projeto_id, nome, ordem)
select distinct t.projeto_id, 'Novo grupo',
       coalesce((select max(g.ordem) from public.projeto_grupos g where g.projeto_id = t.projeto_id), 0) + 1
from public.tarefas t
where t.projeto_id is not null and t.grupo_id is null
  and not exists (
    select 1 from public.projeto_grupos g
    where g.projeto_id = t.projeto_id and lower(btrim(g.nome)) = 'novo grupo'
  );

update public.tarefas t set grupo_id = g.id
from public.projeto_grupos g
where t.projeto_id is not null and t.grupo_id is null
  and g.projeto_id = t.projeto_id and lower(btrim(g.nome)) = 'novo grupo';
