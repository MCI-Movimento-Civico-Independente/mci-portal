-- Central de administração: registro de auditoria. Revise antes de rodar. Idempotente.
--
-- Guarda quem fez cada mudança sensível (papéis de acesso e comitês). Gravado só
-- pelo servidor do portal. RLS ligado e SEM policies, como nas outras tabelas.

create table if not exists public.auditoria_admin (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.contas (id) on delete set null,
  acao text not null,
  alvo text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists auditoria_admin_idx on public.auditoria_admin (criado_em desc);
alter table public.auditoria_admin enable row level security;
