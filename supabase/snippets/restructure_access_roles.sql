begin;

create table if not exists public.platform_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  role text not null check (role in ('superadmin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_members_email on public.platform_members (email);
create index if not exists idx_platform_members_user_id on public.platform_members (user_id);

alter table public.school_members add column if not exists phone text null;
alter table public.school_members add column if not exists status text not null default 'pending';
alter table public.school_members add column if not exists invite_sent_at timestamptz null;
alter table public.school_members add column if not exists invite_token text null;

update public.school_members
set role = case lower(trim(role))
  when 'admin' then 'network_manager'
  when 'secretary' then 'secretariat'
  when 'coordinator' then 'coordination'
  when 'finance' then 'secretariat'
  when 'it' then 'content_curator'
  when 'teacher' then 'teacher'
  when 'support' then 'public_operator'
  else role
end;

alter table public.school_members drop constraint if exists school_members_role_check;
alter table public.school_members drop constraint if exists school_members_status_check;

alter table public.school_members
  add constraint school_members_status_check check (status in ('draft', 'pending', 'invited', 'active', 'disabled'));

alter table public.school_members
  add constraint school_members_role_check
  check (role in (
    'network_manager',
    'content_curator',
    'public_operator',
    'secretariat',
    'coordination',
    'teacher',
    'direction',
    'auditor',
    'observer'
  ));

create or replace function public.seed_default_role_page_permissions(p_school_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  r text;
  p text;
begin
  delete from public.role_page_permissions where school_id = p_school_id;

  r := 'network_manager';
  foreach p in array array['dashboard','chat-manager','reports','audit','users','preferences','knowledge'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'content_curator';
  foreach p in array array['dashboard','reports','audit','knowledge'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'public_operator';
  foreach p in array array['dashboard','chat-manager','reports','knowledge'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'secretariat';
  foreach p in array array['dashboard','chat-manager','knowledge'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'coordination';
  foreach p in array array['dashboard','chat-manager','reports','knowledge'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'teacher';
  foreach p in array array['notices','notifications'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'direction';
  foreach p in array array['dashboard','chat-manager','reports','audit','knowledge'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'auditor';
  foreach p in array array['dashboard','reports','audit'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'observer';
  foreach p in array array['dashboard','reports','knowledge'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;
end;
$$;

commit;
