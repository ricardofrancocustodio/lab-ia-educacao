begin;

insert into public.app_pages (key, label, menu_order, active) values
  ('dashboard', 'Dashboard de Inteligencia', 10, true),
  ('chat-manager', 'Atendimento', 20, true),
  ('reports', 'Relatorios', 30, true),
  ('audit', 'Auditoria Formal', 40, true),
  ('users', 'Usuarios', 50, true),
  ('preferences', 'Preferencias', 60, true),
  ('knowledge', 'Base de Conhecimento', 70, true)
on conflict (key) do update
set label = excluded.label,
    menu_order = excluded.menu_order,
    active = excluded.active;

do $$
declare
  s record;
begin
  for s in select id from public.schools loop
    perform public.seed_default_role_page_permissions(s.id);
  end loop;
end;
$$;

commit;
