begin;

create or replace function public.sync_auth_users_to_school_members(
  p_school_id uuid,
  p_default_role text default 'observer',
  p_only_confirmed boolean default true
)
returns integer
language plpgsql
security definer
as $$
declare
  v_rows integer := 0;
begin
  if p_default_role not in ('network_manager', 'content_curator', 'public_operator', 'secretariat', 'coordination', 'treasury', 'direction', 'auditor', 'observer') then
    raise exception 'p_default_role invalido: %', p_default_role;
  end if;

  with source_users as (
    select
      au.id as user_id,
      lower(trim(au.email)) as email,
      coalesce(
        nullif(trim(au.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(au.raw_user_meta_data ->> 'name'), ''),
        split_part(lower(trim(au.email)), '@', 1)
      ) as display_name
    from auth.users au
    where au.email is not null
      and trim(au.email) <> ''
      and (
        not p_only_confirmed
        or au.email_confirmed_at is not null
      )
  ), upserted as (
    insert into public.school_members (
      school_id,
      user_id,
      name,
      email,
      role,
      active
    )
    select
      p_school_id,
      su.user_id,
      su.display_name,
      su.email,
      p_default_role,
      true
    from source_users su
    on conflict (school_id, email) do update
    set user_id = excluded.user_id,
        name = excluded.name,
        email = excluded.email,
        active = true,
        updated_at = now()
    returning 1
  )
  select count(*) into v_rows from upserted;

  return v_rows;
end;
$$;

comment on function public.sync_auth_users_to_school_members(uuid, text, boolean)
is 'Sincroniza auth.users para public.school_members de uma escola, preservando o role existente em conflitos por school_id+email.';

commit;

-- Exemplo de uso:
-- select public.sync_auth_users_to_school_members(
--   'UUID_DA_SCHOOL',
--   'observer',
--   true
-- );

