begin;

-- 1) Telefone do membro (destino do consolidado por usuário)
alter table public.school_members
add column if not exists phone text null;

create index if not exists idx_school_members_school_phone
  on public.school_members (school_id, phone);

-- 2) Rastreio de entrega por usuário para isolamento do consolidado
create table if not exists public.notification_queue_deliveries (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  queue_ref text not null,
  sent_at timestamptz not null default now(),
  constraint notification_queue_deliveries_pkey primary key (school_id, user_id, queue_ref)
);

create index if not exists idx_nqd_school_user
  on public.notification_queue_deliveries (school_id, user_id);

commit;

