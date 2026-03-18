begin;

create or replace function public.grant_platform_superadmin(
  p_email text,
  p_name text default null,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_email text := lower(trim(p_email));
  v_name text := coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1));
  v_id uuid;
begin
  insert into public.platform_members (user_id, name, email, role, active)
  values (p_user_id, v_name, v_email, 'superadmin', true)
  on conflict (email) do update
  set user_id = coalesce(excluded.user_id, public.platform_members.user_id),
      name = excluded.name,
      role = 'superadmin',
      active = true,
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

commit;

-- Exemplo:
-- select public.grant_platform_superadmin('seu.email@dominio.gov.br', 'Nome do Responsavel', null);
