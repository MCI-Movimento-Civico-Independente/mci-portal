-- Vínculos entre páginas e quadro: código das tarefas, dependências, "mencionada em" e a
-- consulta única dos blocos. Revise antes de rodar. Idempotente.
--
-- RLS ligado e SEM policies, como nas outras tabelas: o acesso é só pelo servidor.

-- 1) Código da tarefa (T-14). Numeração única do portal; as existentes seguem a ordem de criação.
create sequence if not exists public.tarefas_numero_seq;
alter table public.tarefas add column if not exists numero bigint;

with novas as (
  select id,
         row_number() over (order by criado_em, id) + coalesce((select max(numero) from public.tarefas), 0) as n
  from public.tarefas
  where numero is null
)
update public.tarefas t set numero = novas.n from novas where t.id = novas.id;

select setval('public.tarefas_numero_seq', greatest(coalesce(max(numero), 0), 1), max(numero) is not null)
from public.tarefas;

alter table public.tarefas alter column numero set default nextval('public.tarefas_numero_seq');
alter table public.tarefas alter column numero set not null;
alter sequence public.tarefas_numero_seq owned by public.tarefas.numero;
create unique index if not exists tarefas_numero_idx on public.tarefas (numero);
grant usage on sequence public.tarefas_numero_seq to service_role;

-- 2) Dependências: "tarefa_id depende de depende_de_id".
create table if not exists public.tarefa_dependencias (
  tarefa_id uuid not null references public.tarefas (id) on delete cascade,
  depende_de_id uuid not null references public.tarefas (id) on delete cascade,
  criado_por uuid references public.contas (id) on delete set null,
  criado_em timestamptz not null default now(),
  primary key (tarefa_id, depende_de_id),
  constraint tarefa_dependencias_outra check (tarefa_id <> depende_de_id)
);
create index if not exists tarefa_dependencias_de_idx on public.tarefa_dependencias (depende_de_id);
alter table public.tarefa_dependencias enable row level security;

-- Recusa ciclos (A depende de B que depende de A, direta ou indiretamente). A trava evita que
-- duas pessoas criem as duas pontas do ciclo ao mesmo tempo.
create or replace function public.tarefa_dependencias_sem_ciclo() returns trigger
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('tarefa_dependencias'));
  if exists (
    with recursive alcanca(id) as (
      select new.depende_de_id
      union
      select d.depende_de_id from tarefa_dependencias d join alcanca a on d.tarefa_id = a.id
    )
    select 1 from alcanca where id = new.tarefa_id
  ) then
    raise exception 'dependencia_em_ciclo' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists tarefa_dependencias_sem_ciclo on public.tarefa_dependencias;
create trigger tarefa_dependencias_sem_ciclo
  before insert or update on public.tarefa_dependencias
  for each row execute function public.tarefa_dependencias_sem_ciclo();

-- 3) "Mencionada em": onde cada página cita tarefas e grupos. O servidor mantém ao salvar.
create table if not exists public.paginas_referencias (
  aba_id uuid not null references public.projeto_abas (id) on delete cascade,
  tipo text not null check (tipo in ('tarefa', 'grupo')),
  ref_id uuid not null,
  -- Qual das citações dessa tarefa ou grupo na página: "0" é a primeira.
  bloco_id text not null,
  trecho text not null default '',
  primary key (aba_id, tipo, ref_id, bloco_id)
);
create index if not exists paginas_referencias_ref_idx on public.paginas_referencias (tipo, ref_id);
alter table public.paginas_referencias enable row level security;

-- 4) Tudo o que os blocos de uma página precisam, numa consulta só.
create or replace function public.portal_vinculos(p_tarefas uuid[], p_grupos uuid[]) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'tarefas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'numero', t.numero,
        'titulo', t.titulo,
        'status', t.status,
        'prioridade', t.prioridade,
        'data_inicio', t.data_inicio,
        'prazo', t.prazo,
        -- Subtarefa vive no projeto e no grupo da tarefa original.
        'projeto_id', coalesce(t.projeto_id, pai.projeto_id),
        'grupo', case when g.id is null then null else jsonb_build_object('id', g.id, 'nome', g.nome) end,
        'solicitante', case when s.id is null then null else jsonb_build_object('id', s.id, 'nome', s.nome) end,
        'executores', coalesce((
          select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome) order by e.ordem)
          from unnest(array_prepend(t.responsavel_id, t.executores_extra)) with ordinality as e(id, ordem)
          join contas c on c.id = e.id
        ), '[]'::jsonb),
        'depende_de', coalesce((
          select jsonb_agg(jsonb_build_object('id', x.id, 'numero', x.numero, 'titulo', x.titulo, 'status', x.status) order by x.numero)
          from tarefa_dependencias d join tarefas x on x.id = d.depende_de_id
          where d.tarefa_id = t.id
        ), '[]'::jsonb)
      ))
      from tarefas t
      left join tarefas pai on pai.id = t.pai_id
      left join projeto_grupos g on g.id = coalesce(t.grupo_id, pai.grupo_id)
      left join contas s on s.id = t.solicitante_id
      where t.id = any (p_tarefas)
    ), '[]'::jsonb),
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'nome', g.nome,
        'cor', g.cor,
        'projeto_id', g.projeto_id,
        'contagem', (
          select jsonb_build_object(
            'a_fazer', count(*) filter (where t.status = 'a_fazer'),
            'em_andamento', count(*) filter (where t.status = 'em_andamento'),
            'em_revisao', count(*) filter (where t.status = 'em_revisao'),
            'concluida', count(*) filter (where t.status = 'concluida'))
          from tarefas t where t.grupo_id = g.id and t.pai_id is null
        )
      ))
      from projeto_grupos g
      where g.id = any (p_grupos)
    ), '[]'::jsonb)
  );
$$;

-- Só o servidor chama (funções são executáveis por todos se não for revogado).
revoke execute on function public.portal_vinculos(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.portal_vinculos(uuid[], uuid[]) to service_role;
