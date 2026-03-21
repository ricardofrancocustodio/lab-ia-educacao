begin;

create table if not exists public.official_content_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  module_key text not null check (module_key in ('calendar', 'enrollment', 'faq', 'notices')),
  scope_key text not null check (scope_key in ('network', 'school')),
  title text null,
  summary text null,
  content_payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  source_document_id uuid null references public.source_documents(id) on delete set null,
  source_version_id uuid null references public.knowledge_source_versions(id) on delete set null,
  updated_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, module_key, scope_key)
);

create index if not exists idx_official_content_school_module
  on public.official_content_records (school_id, module_key, scope_key);

insert into public.app_pages (key, label, menu_order, active)
values ('official-content', 'Conteudo Oficial', 80, true)
on conflict (key) do update
set label = excluded.label,
    menu_order = excluded.menu_order,
    active = excluded.active;

commit;
