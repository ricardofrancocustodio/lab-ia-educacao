-- Registrar pagina "feedback" e permissoes padroes por perfil
-- Execute no SQL Editor do Supabase ou via npx supabase db query --linked

begin;

-- 1. Registrar a pagina no catalogo
insert into public.app_pages (key, label, menu_order, active)
values ('feedback', 'Feedback da IA', 40, true)
on conflict (key) do update
set label = excluded.label,
    menu_order = excluded.menu_order,
    active = excluded.active;

-- 2. Inserir permissoes de "feedback" para cada escola existente
-- Perfis com acesso: superadmin, network_manager, content_curator, auditor, direction, public_operator
-- Perfis SEM acesso: secretariat, coordination, treasury, observer

insert into public.role_page_permissions (school_id, role, page_key, allowed)
select s.id, r.role, 'feedback', true
from public.schools s
cross join (
  values ('superadmin'), ('network_manager'), ('content_curator'),
         ('auditor'), ('direction'), ('public_operator')
) as r(role)
on conflict (school_id, role, page_key) do update
set allowed = true, updated_at = now();

-- 3. Atualizar a funcao seed para incluir "feedback" nos perfis corretos
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
  foreach p in array array['dashboard','chat-manager','reports','audit','incidents','feedback','users','preferences','knowledge','official-content','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'content_curator';
  foreach p in array array['dashboard','reports','audit','incidents','feedback','knowledge','official-content','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'public_operator';
  foreach p in array array['dashboard','chat-manager','reports','incidents','feedback','knowledge','official-content','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'secretariat';
  foreach p in array array['dashboard','chat-manager','knowledge','official-content','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'coordination';
  foreach p in array array['dashboard','chat-manager','reports','incidents','knowledge','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'treasury';
  foreach p in array array['dashboard','chat-manager','reports','knowledge','audit','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'direction';
  foreach p in array array['dashboard','chat-manager','reports','audit','incidents','feedback','knowledge','official-content','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'auditor';
  foreach p in array array['dashboard','reports','audit','incidents','feedback'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'observer';
  foreach p in array array['dashboard','reports','knowledge','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;
end;
$$;

commit;
