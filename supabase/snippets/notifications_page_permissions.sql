-- Criar tabelas de notificacoes (se nao existirem) e registrar pagina + permissoes
-- Execute via npx supabase db query --linked

begin;

-- ============================================================================
-- 1. TABELAS BASE (se ainda nao existirem)
-- ============================================================================

-- 1a) notification_system_settings — config global por escola
create table if not exists public.notification_system_settings (
  school_id uuid not null references public.schools(id) on delete cascade,
  key text not null default 'notifications',
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_system_settings_pkey primary key (school_id, key)
);

-- 1b) notification_queue — fila de notificacoes
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  topic text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  sent boolean not null default false,
  dispatch_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);

create index if not exists idx_notif_queue_school_sent
  on public.notification_queue (school_id, sent);

create index if not exists idx_notif_queue_dispatch_date
  on public.notification_queue (dispatch_date);

create index if not exists idx_notif_queue_school_user
  on public.notification_queue (school_id, user_id);

-- 1c) notification_queue_deliveries — rastreio por usuario
create table if not exists public.notification_queue_deliveries (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  queue_ref text not null,
  sent_at timestamptz not null default now(),
  constraint notification_queue_deliveries_pkey primary key (school_id, user_id, queue_ref)
);

create index if not exists idx_nqd_school_user
  on public.notification_queue_deliveries (school_id, user_id);

-- 1d) user_notification_settings — preferencias por usuario
create table if not exists public.user_notification_settings (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_notification_settings_pkey primary key (school_id, user_id, key)
);

create index if not exists idx_user_notif_settings_school_user
  on public.user_notification_settings (school_id, user_id);

-- ============================================================================
-- 2. REGISTRAR PAGINA NO CATALOGO
-- ============================================================================

insert into public.app_pages (key, label, menu_order, active)
values ('notifications', 'Notificacoes', 45, true)
on conflict (key) do update
set label = excluded.label,
    menu_order = excluded.menu_order,
    active = excluded.active;

-- ============================================================================
-- 3. PERMISSOES POR ESCOLA
-- ============================================================================
-- Perfis com acesso: superadmin, network_manager, direction, secretariat, coordination
-- Perfis SEM acesso: content_curator, public_operator, treasury, auditor, observer

insert into public.role_page_permissions (school_id, role, page_key, allowed)
select s.id, r.role, 'notifications', true
from public.schools s
cross join (
  values ('superadmin'), ('network_manager'), ('direction'),
         ('secretariat'), ('coordination')
) as r(role)
on conflict (school_id, role, page_key) do update
set allowed = true, updated_at = now();

-- ============================================================================
-- 4. ATUALIZAR FUNCAO SEED
-- ============================================================================

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
  foreach p in array array['dashboard','chat-manager','reports','audit','incidents','feedback','notifications','users','preferences','knowledge','official-content','notices'] loop
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
  foreach p in array array['dashboard','chat-manager','notifications','knowledge','official-content','notices'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'coordination';
  foreach p in array array['dashboard','chat-manager','reports','incidents','notifications','knowledge','notices'] loop
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
  foreach p in array array['dashboard','chat-manager','reports','audit','incidents','feedback','notifications','knowledge','official-content','notices'] loop
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
