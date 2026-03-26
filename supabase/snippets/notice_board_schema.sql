-- Notice Board schema (multi-escola) + RLS
-- Execute no SQL Editor do Supabase.

begin;

create table if not exists public.notices (
  id uuid not null default gen_random_uuid(),
  school_id uuid not null,
  title text not null,
  content text not null,
  type text not null check (type in ('internal', 'external')),
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  published_at timestamptz not null default now(),
  expiry_date timestamptz null,
  author_id uuid null,
  target_segment_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notices_pkey primary key (id),
  constraint notices_school_id_id_key unique (school_id, id),
  constraint notices_school_id_fkey foreign key (school_id) references public.schools (id) on delete cascade,
  constraint notices_author_id_fkey foreign key (author_id) references auth.users (id) on delete set null
  -- constraint notices_target_segment_fkey: desabilitado ate tabela segments existir
  -- foreign key (school_id, target_segment_id) references public.segments (school_id, id) on delete set null
);

create table if not exists public.notice_attachments (
  id uuid not null default gen_random_uuid(),
  school_id uuid not null,
  notice_id uuid not null,
  file_name text not null,
  file_url text not null,
  file_type text null,
  file_size integer null,
  created_at timestamptz not null default now(),
  constraint notice_attachments_pkey primary key (id),
  constraint notice_attachments_school_id_fkey foreign key (school_id) references public.schools (id) on delete cascade,
  -- integridade multi-tenant: anexo sempre da mesma escola do aviso
  constraint notice_attachments_notice_fkey foreign key (school_id, notice_id)
    references public.notices (school_id, id) on delete cascade
);

create index if not exists idx_notices_school_id on public.notices (school_id);
create index if not exists idx_notices_school_type_priority on public.notices (school_id, type, priority);
create index if not exists idx_notices_published_at on public.notices (published_at desc);
create index if not exists idx_notices_expiry on public.notices (expiry_date);
create index if not exists idx_notice_attachments_school_notice on public.notice_attachments (school_id, notice_id);

create or replace function public.set_updated_at_notices()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_notices on public.notices;
create trigger trg_set_updated_at_notices
before update on public.notices
for each row
execute function public.set_updated_at_notices();

alter table public.notices enable row level security;
alter table public.notice_attachments enable row level security;

-- READ: qualquer membro da mesma escola
drop policy if exists "read notices by school member" on public.notices;
create policy "read notices by school member"
on public.notices
for select
to authenticated
using (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notices.school_id
  )
);

drop policy if exists "read notice attachments by school member" on public.notice_attachments;
create policy "read notice attachments by school member"
on public.notice_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notice_attachments.school_id
  )
);

-- WRITE: network_manager/secretariat/coordination/direction da mesma escola
drop policy if exists "write notices by allowed roles" on public.notices;
create policy "write notices by allowed roles"
on public.notices
for all
to authenticated
using (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notices.school_id
      and sm.role in ('network_manager', 'secretariat', 'coordination', 'direction')
  )
)
with check (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notices.school_id
      and sm.role in ('network_manager', 'secretariat', 'coordination', 'direction')
  )
);

drop policy if exists "write notice attachments by allowed roles" on public.notice_attachments;
create policy "write notice attachments by allowed roles"
on public.notice_attachments
for all
to authenticated
using (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notice_attachments.school_id
      and sm.role in ('network_manager', 'secretariat', 'coordination', 'direction')
  )
)
with check (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notice_attachments.school_id
      and sm.role in ('network_manager', 'secretariat', 'coordination', 'direction')
  )
);

commit;

