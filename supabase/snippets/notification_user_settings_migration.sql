-- Notification settings by school + user, and queue traceability by user/day
-- Execute no SQL Editor do Supabase.

begin;

-- 1) Normalize notification_system_settings PK for multi-escola
alter table public.notification_system_settings
drop constraint if exists notification_system_settings_pkey;

alter table public.notification_system_settings
add constraint notification_system_settings_pkey primary key (school_id, key);

-- 2) Queue: track recipient user and dispatch day
alter table public.notification_queue
add column if not exists user_id uuid null references auth.users (id) on delete set null;

alter table public.notification_queue
add column if not exists dispatch_date date null;

update public.notification_queue
set dispatch_date = (created_at at time zone 'utc')::date
where dispatch_date is null;

alter table public.notification_queue
alter column dispatch_date set default (now() at time zone 'utc')::date;

alter table public.notification_queue
alter column dispatch_date set not null;

create index if not exists idx_queue_school_user
  on public.notification_queue (school_id, user_id);

create index if not exists idx_queue_dispatch_date
  on public.notification_queue (dispatch_date);

-- remove duplicates only for tracked users before creating unique index
with ranked as (
  select
    ctid,
    row_number() over (
      partition by school_id, user_id, topic, dispatch_date
      order by id
    ) as rn
  from public.notification_queue
  where user_id is not null
)
delete from public.notification_queue q
using ranked r
where q.ctid = r.ctid
  and r.rn > 1;

create unique index if not exists uq_queue_user_topic_day
  on public.notification_queue (school_id, user_id, topic, dispatch_date)
  where user_id is not null;

-- 3) User-level notification overrides
create table if not exists public.user_notification_settings (
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_notification_settings_pkey primary key (school_id, user_id, key)
);

create index if not exists idx_user_notification_settings_school_user
  on public.user_notification_settings (school_id, user_id);

-- 4) Effective setting resolver (school default + user override)
create or replace function public.get_effective_notification_setting(
  p_school_id uuid,
  p_user_id uuid,
  p_key text default 'notifications'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school jsonb := '{}'::jsonb;
  v_user jsonb := '{}'::jsonb;
begin
  select coalesce(ns.value, '{}'::jsonb)
    into v_school
  from public.notification_system_settings ns
  where ns.school_id = p_school_id
    and ns.key = p_key;

  select coalesce(us.value, '{}'::jsonb)
    into v_user
  from public.user_notification_settings us
  where us.school_id = p_school_id
    and us.user_id = p_user_id
    and us.key = p_key;

  if coalesce((v_user ->> 'use_school_default')::boolean, false) then
    return v_school;
  end if;

  return v_school || v_user;
end;
$$;

-- 5) RLS
alter table public.notification_system_settings enable row level security;
alter table public.user_notification_settings enable row level security;

drop policy if exists "read notification settings by school member" on public.notification_system_settings;
create policy "read notification settings by school member"
on public.notification_system_settings for select
to authenticated
using (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notification_system_settings.school_id
  )
);

drop policy if exists "admin write notification settings" on public.notification_system_settings;
create policy "admin write notification settings"
on public.notification_system_settings for all
to authenticated
using (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notification_system_settings.school_id
      and sm.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = notification_system_settings.school_id
      and sm.role = 'admin'
  )
);

drop policy if exists "read own user notification settings" on public.user_notification_settings;
create policy "read own user notification settings"
on public.user_notification_settings for select
to authenticated
using (
  (
    user_id = auth.uid()
    and exists (
      select 1
      from public.school_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = user_notification_settings.school_id
    )
  )
  or exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = user_notification_settings.school_id
      and sm.role = 'admin'
  )
);

drop policy if exists "write own user notification settings" on public.user_notification_settings;
create policy "write own user notification settings"
on public.user_notification_settings for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = user_notification_settings.school_id
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.school_members sm
    where sm.user_id = auth.uid()
      and sm.school_id = user_notification_settings.school_id
  )
);

commit;

