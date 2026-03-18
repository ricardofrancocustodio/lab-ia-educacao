-- Sync school_members -> role entity tables (multi-escola)
-- Execute no SQL Editor do Supabase.

begin;

-- 1) tabela faltante de admin por escola
create table if not exists public.admins (
  id uuid not null default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  email text not null,
  phone text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint admins_pkey primary key (id),
  constraint admins_school_email_key unique (school_id, email)
);

-- 2) garanta unicidade por escola+email para evitar conflito entre escolas
create unique index if not exists coordinators_school_email_uk
  on public.coordinators (school_id, email);
create unique index if not exists secretaries_school_email_uk
  on public.secretaries (school_id, email);
create unique index if not exists teachers_school_email_uk
  on public.teachers (school_id, email);
create unique index if not exists support_staff_school_email_uk
  on public.support_staff (school_id, email);
create unique index if not exists finance_staff_school_email_uk
  on public.finance_staff (school_id, email);
create unique index if not exists it_staff_school_email_uk
  on public.it_staff (school_id, email);

-- opcional, mas recomendado: manter school_members consistente por escola+email
create unique index if not exists school_members_school_email_uk
  on public.school_members (school_id, email);

create or replace function public.sync_school_member_role_entity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_school_id uuid;
  v_email text;
  v_role text;
  v_name text;
  v_active boolean;
begin
  if tg_op = 'DELETE' then
    v_school_id := old.school_id;
    v_email := lower(trim(old.email));

    -- limpa vínculos dependentes de coordenador/professor antes de remover perfil
    update public.visit_slots
    set coordinator_id = null
    where coordinator_id in (
      select c.id from public.coordinators c
      where c.school_id = v_school_id
        and lower(c.email) = v_email
    );

    delete from public.coordinator_segments
    where coordinator_id in (
      select c.id from public.coordinators c
      where c.school_id = v_school_id
        and lower(c.email) = v_email
    );

    delete from public.teacher_segments
    where teacher_id in (
      select t.id from public.teachers t
      where t.school_id = v_school_id
        and lower(t.email) = v_email
    );

    delete from public.admins
    where school_id = v_school_id and lower(email) = v_email;
    delete from public.coordinators
    where school_id = v_school_id and lower(email) = v_email;
    delete from public.secretaries
    where school_id = v_school_id and lower(email) = v_email;
    delete from public.teachers
    where school_id = v_school_id and lower(email) = v_email;
    delete from public.support_staff
    where school_id = v_school_id and lower(email) = v_email;
    delete from public.finance_staff
    where school_id = v_school_id and lower(email) = v_email;
    delete from public.it_staff
    where school_id = v_school_id and lower(email) = v_email;

    return old;
  end if;

  v_school_id := new.school_id;
  v_email := lower(trim(new.email));
  v_role := lower(trim(new.role));
  v_name := coalesce(new.name, '');
  v_active := coalesce(new.active, true);

  -- limpa vínculos dependentes de coordenador/professor antes de trocar role
  update public.visit_slots
  set coordinator_id = null
  where coordinator_id in (
    select c.id from public.coordinators c
    where c.school_id = v_school_id
      and lower(c.email) = v_email
  );

  delete from public.coordinator_segments
  where coordinator_id in (
    select c.id from public.coordinators c
    where c.school_id = v_school_id
      and lower(c.email) = v_email
  );

  delete from public.teacher_segments
  where teacher_id in (
    select t.id from public.teachers t
    where t.school_id = v_school_id
      and lower(t.email) = v_email
  );

  -- remove de todas as entidades da mesma escola para manter 1 papel por e-mail
  delete from public.admins
  where school_id = v_school_id and lower(email) = v_email;
  delete from public.coordinators
  where school_id = v_school_id and lower(email) = v_email;
  delete from public.secretaries
  where school_id = v_school_id and lower(email) = v_email;
  delete from public.teachers
  where school_id = v_school_id and lower(email) = v_email;
  delete from public.support_staff
  where school_id = v_school_id and lower(email) = v_email;
  delete from public.finance_staff
  where school_id = v_school_id and lower(email) = v_email;
  delete from public.it_staff
  where school_id = v_school_id and lower(email) = v_email;

  -- recria na tabela correta
  if v_role = 'admin' then
    insert into public.admins (school_id, name, email, active)
    values (v_school_id, v_name, v_email, v_active)
    on conflict (school_id, email)
    do update set
      name = excluded.name,
      active = excluded.active;
  elsif v_role = 'coordinator' then
    insert into public.coordinators (school_id, name, email, active)
    values (v_school_id, v_name, v_email, v_active)
    on conflict (school_id, email)
    do update set
      name = excluded.name,
      active = excluded.active;
  elsif v_role = 'secretary' then
    insert into public.secretaries (school_id, name, email, active)
    values (v_school_id, v_name, v_email, v_active)
    on conflict (school_id, email)
    do update set
      name = excluded.name,
      active = excluded.active;
  elsif v_role = 'teacher' then
    insert into public.teachers (school_id, name, email, active)
    values (v_school_id, v_name, v_email, v_active)
    on conflict (school_id, email)
    do update set
      name = excluded.name,
      active = excluded.active;
  elsif v_role = 'support' then
    insert into public.support_staff (school_id, name, email, active)
    values (v_school_id, v_name, v_email, v_active)
    on conflict (school_id, email)
    do update set
      name = excluded.name,
      active = excluded.active;
  elsif v_role = 'finance' then
    insert into public.finance_staff (school_id, name, email, active)
    values (v_school_id, v_name, v_email, v_active)
    on conflict (school_id, email)
    do update set
      name = excluded.name,
      active = excluded.active;
  elsif v_role = 'it' then
    insert into public.it_staff (school_id, name, email, active)
    values (v_school_id, v_name, v_email, v_active)
    on conflict (school_id, email)
    do update set
      name = excluded.name,
      active = excluded.active;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_school_member_role_entity_ins_upd on public.school_members;
create trigger trg_sync_school_member_role_entity_ins_upd
after insert or update of role, name, email, active
on public.school_members
for each row
execute function public.sync_school_member_role_entity();

drop trigger if exists trg_sync_school_member_role_entity_del on public.school_members;
create trigger trg_sync_school_member_role_entity_del
after delete
on public.school_members
for each row
execute function public.sync_school_member_role_entity();

-- 3) backfill para dados existentes
insert into public.admins (school_id, name, email, active)
select sm.school_id, coalesce(sm.name, ''), lower(trim(sm.email)), coalesce(sm.active, true)
from public.school_members sm
where lower(trim(sm.role)) = 'admin' and sm.email is not null
on conflict (school_id, email)
do update set
  name = excluded.name,
  active = excluded.active;

insert into public.coordinators (school_id, name, email, active)
select sm.school_id, coalesce(sm.name, ''), lower(trim(sm.email)), coalesce(sm.active, true)
from public.school_members sm
where lower(trim(sm.role)) = 'coordinator' and sm.email is not null
on conflict (school_id, email)
do update set
  name = excluded.name,
  active = excluded.active;

insert into public.secretaries (school_id, name, email, active)
select sm.school_id, coalesce(sm.name, ''), lower(trim(sm.email)), coalesce(sm.active, true)
from public.school_members sm
where lower(trim(sm.role)) = 'secretary' and sm.email is not null
on conflict (school_id, email)
do update set
  name = excluded.name,
  active = excluded.active;

insert into public.teachers (school_id, name, email, active)
select sm.school_id, coalesce(sm.name, ''), lower(trim(sm.email)), coalesce(sm.active, true)
from public.school_members sm
where lower(trim(sm.role)) = 'teacher' and sm.email is not null
on conflict (school_id, email)
do update set
  name = excluded.name,
  active = excluded.active;

insert into public.support_staff (school_id, name, email, active)
select sm.school_id, coalesce(sm.name, ''), lower(trim(sm.email)), coalesce(sm.active, true)
from public.school_members sm
where lower(trim(sm.role)) = 'support' and sm.email is not null
on conflict (school_id, email)
do update set
  name = excluded.name,
  active = excluded.active;

insert into public.finance_staff (school_id, name, email, active)
select sm.school_id, coalesce(sm.name, ''), lower(trim(sm.email)), coalesce(sm.active, true)
from public.school_members sm
where lower(trim(sm.role)) = 'finance' and sm.email is not null
on conflict (school_id, email)
do update set
  name = excluded.name,
  active = excluded.active;

insert into public.it_staff (school_id, name, email, active)
select sm.school_id, coalesce(sm.name, ''), lower(trim(sm.email)), coalesce(sm.active, true)
from public.school_members sm
where lower(trim(sm.role)) = 'it' and sm.email is not null
on conflict (school_id, email)
do update set
  name = excluded.name,
  active = excluded.active;

commit;
