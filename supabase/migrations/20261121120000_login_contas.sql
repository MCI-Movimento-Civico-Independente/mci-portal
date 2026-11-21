-- Login do portal: liga a conta MCI (a mesma do bot Carcará) a um usuário do
-- Supabase Auth e guarda o papel de acesso.
--
-- Revise antes de rodar (SQL Editor do Supabase ou `supabase db push`).
-- É idempotente: pode rodar mais de uma vez sem efeito colateral.

-- 1. Vínculo com o Supabase Auth.
--    on delete set null: apagar o usuário do Auth não apaga a conta MCI.
alter table public.contas
  add column if not exists auth_user_id uuid unique
    references auth.users (id) on delete set null;

-- 2. Papel de acesso. Todo mundo começa como 'membro'.
alter table public.contas
  add column if not exists papel text not null default 'membro';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contas_papel_check'
      and conrelid = 'public.contas'::regclass
  ) then
    alter table public.contas
      add constraint contas_papel_check
      check (papel in ('membro', 'organizacao', 'admin'));
  end if;
end $$;

-- 3. RLS continua ligado e SEM policies para anon/authenticated:
--    o portal lê e escreve só no servidor, com a service role (que ignora RLS),
--    sempre filtrando pela conta da sessão. Nada de service role no client.
alter table public.contas enable row level security;
alter table public.identidades enable row level security;

-- Recomendado (rode só se o bot NÃO lê perfil_xp com a chave anon): views não
-- seguem o RLS das tabelas, então qualquer um com a chave anon poderia ler a
-- perfil_xp inteira pela API pública.
-- revoke select on public.perfil_xp from anon, authenticated;

-- Como promover alguém (troque o id do Telegram). O papel só vale no próximo
-- login; o /org confere o banco a cada acesso de qualquer forma.
-- update public.contas set papel = 'organizacao'
--  where id = (select conta_id from public.identidades
--               where provedor = 'telegram' and externo_id = '123456789');
