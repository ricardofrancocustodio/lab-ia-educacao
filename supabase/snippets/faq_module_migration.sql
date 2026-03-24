-- FAQ Module Migration: pergunta/resposta, status, vigência, versionamento, auditoria, conflito

begin;

-- ============================================================================
-- 1. TABELA PRINCIPAL: faq_items (perguntas/respostas com status e vigência)
-- ============================================================================
create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  scope_key text not null check (scope_key in ('network', 'school')),
  question text not null,
  answer text not null,
  category text not null default 'Geral',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  valid_from timestamptz null default now(),
  valid_to timestamptz null,
  item_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete set null,
  created_by_email text not null,
  updated_by uuid not null references auth.users(id) on delete set null,
  updated_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, scope_key, question)
);

create index if not exists idx_faq_items_school_scope
  on public.faq_items (school_id, scope_key, status);

create index if not exists idx_faq_items_valid_dates
  on public.faq_items (school_id, status, valid_from, valid_to)
  where status = 'published';

create index if not exists idx_faq_items_created_by
  on public.faq_items (created_by);

-- ============================================================================
-- 2. HISTÓRICO DE VERSÕES: faq_versions (versionamento)
-- ============================================================================
create table if not exists public.faq_versions (
  id uuid primary key default gen_random_uuid(),
  faq_item_id uuid not null references public.faq_items(id) on delete cascade,
  version_number integer not null,
  question text not null,
  answer text not null,
  category text not null,
  status text not null check (status in ('draft', 'review', 'published', 'archived')),
  valid_from timestamptz null,
  valid_to timestamptz null,
  change_summary text null,
  created_by uuid not null references auth.users(id) on delete set null,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  unique (faq_item_id, version_number)
);

create index if not exists idx_faq_versions_faq_item
  on public.faq_versions (faq_item_id, version_number desc);

create index if not exists idx_faq_versions_created_at
  on public.faq_versions (created_at desc);

-- ============================================================================
-- 3. AUDITORIA: faq_audit_log (rastreamento de mudanças)
-- ============================================================================
create table if not exists public.faq_audit_log (
  id uuid primary key default gen_random_uuid(),
  faq_item_id uuid not null references public.faq_items(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  action text not null check (action in ('created', 'updated', 'published', 'archived', 'deleted', 'reviewed', 'rejected')),
  user_id uuid not null references auth.users(id) on delete set null,
  user_email text not null,
  user_role text not null,
  changes_payload jsonb not null default '{}'::jsonb,
  status_before text null,
  status_after text null,
  ip_address text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_faq_audit_log_faq_item
  on public.faq_audit_log (faq_item_id, created_at desc);

create index if not exists idx_faq_audit_log_user
  on public.faq_audit_log (user_id, created_at desc);

create index if not exists idx_faq_audit_log_school_action
  on public.faq_audit_log (school_id, action, created_at desc);

-- ============================================================================
-- 4. CONFLITOS: faq_conflicts (rede vs escola)
-- ============================================================================
create table if not exists public.faq_conflicts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  faq_item_network_id uuid references public.faq_items(id) on delete set null,
  faq_item_school_id uuid references public.faq_items(id) on delete set null,
  conflict_type text not null check (conflict_type in ('duplicate_question', 'conflicting_answers', 'overlap', 'outdated_network')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  description text null,
  resolved boolean not null default false,
  resolution_type text check (resolution_type in ('merge_to_network', 'merge_to_school', 'keep_both', 'archive_network', 'archive_school', 'manual_review')),
  resolution_note text null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faq_conflicts_school_resolved
  on public.faq_conflicts (school_id, resolved, created_at desc);

create index if not exists idx_faq_conflicts_items
  on public.faq_conflicts (faq_item_network_id, faq_item_school_id);

-- ============================================================================
-- 5. TESTES DE IA: faq_ai_test_results (validação com IA)
-- ============================================================================
create table if not exists public.faq_ai_test_results (
  id uuid primary key default gen_random_uuid(),
  faq_item_id uuid not null references public.faq_items(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  test_query text not null,
  test_category text null,
  ai_response text not null,
  ai_provider text not null,
  match_score decimal(3, 2) not null check (match_score >= 0 and match_score <= 1),
  is_relevant boolean not null default true,
  feedback_type text check (feedback_type in ('correct', 'needs_refinement', 'incorrect', 'missing_context')),
  tester_notes text null,
  tester_id uuid not null references auth.users(id) on delete set null,
  tester_email text not null,
  test_date timestamptz not null default now(),
  constraint fk_faq_ai_test_school foreign key (school_id) references public.schools(id) on delete cascade
);

create index if not exists idx_faq_ai_test_results_faq_item
  on public.faq_ai_test_results (faq_item_id, test_date desc);

create index if not exists idx_faq_ai_test_results_school
  on public.faq_ai_test_results (school_id, is_relevant, test_date desc);

create index if not exists idx_faq_ai_test_results_match_score
  on public.faq_ai_test_results (school_id, match_score desc)
  where is_relevant = true;

-- ============================================================================
-- 6. APP PAGES (registra página faq se não existir)
-- ============================================================================
insert into public.app_pages (key, label, menu_order, active)
values ('faq', 'FAQ Oficial', 81, true)
on conflict (key) do update
set label = excluded.label,
    menu_order = excluded.menu_order,
    active = excluded.active;

-- ============================================================================
-- 7. RLS (Row-Level Security) - Controle de acesso por escola e função
-- ============================================================================
alter table public.faq_items enable row level security;
alter table public.faq_versions enable row level security;
alter table public.faq_audit_log enable row level security;
alter table public.faq_conflicts enable row level security;
alter table public.faq_ai_test_results enable row level security;

-- Policy: usuários veem apenas FAQs de suas escolas (publicadas ou draft/review se forem editores)
create policy faq_items_read on public.faq_items for select
  using (
    school_id in (
      select school_id from public.school_members where user_id = auth.uid()
      union
      select school_id from public.school_members where school_id in (
        select id from public.schools where parent_id = (
          select parent_id from public.schools where id = (
            select school_id from public.school_members where user_id = auth.uid() limit 1
          )
        )
      )
    )
    or status = 'published'
  );

-- Policy: apenas editores podem criar FAQs
create policy faq_items_insert on public.faq_items for insert
  with check (
    auth.uid() in (
      select user_id from public.school_members
      where school_id = faq_items.school_id
      and role in ('secretariat', 'direction', 'coordination', 'content_curator', 'network_manager', 'superadmin')
    )
    or auth.uid() in (
      select user_id from public.platform_members
      where role in ('content_curator', 'network_manager', 'superadmin')
    )
  );

-- Policy: apenas autores ou editores podem atualizar FAQs
create policy faq_items_update on public.faq_items for update
  using (
    created_by = auth.uid()
    or auth.uid() in (
      select user_id from public.school_members
      where school_id = faq_items.school_id
      and role in ('secretariat', 'direction', 'coordination', 'content_curator', 'network_manager', 'superadmin')
    )
    or auth.uid() in (
      select user_id from public.platform_members
      where role in ('content_curator', 'network_manager', 'superadmin')
    )
  );

-- Policy: auditoria visível apenas para auditores e superadmins
create policy faq_audit_read on public.faq_audit_log for select
  using (
    school_id in (
      select school_id from public.school_members where user_id = auth.uid()
    )
    or auth.uid() in (
      select user_id from public.platform_members
      where role in ('auditor', 'superadmin', 'network_manager')
    )
  );

commit;
