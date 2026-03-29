begin;

create extension if not exists "pgcrypto";

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  role text not null check (role in ('superadmin', 'auditor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  role text not null check (role in (
    'network_manager',
    'content_curator',
    'public_operator',
    'secretariat',
    'coordination',
    'treasury',
    'direction',
    'auditor',
    'observer'
  )),
  phone text null,
  status text not null default 'pending' check (status in ('draft', 'pending', 'invited', 'active', 'disabled')),
  active boolean not null default true,
  invite_sent_at timestamptz null,
  invite_token text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, email)
);

create table if not exists public.app_pages (
  key text primary key,
  label text not null,
  menu_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.role_page_permissions (
  school_id uuid not null references public.schools(id) on delete cascade,
  role text not null,
  page_key text not null references public.app_pages(key) on delete cascade,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  primary key (school_id, role, page_key)
);

create table if not exists public.user_page_permissions (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_key text not null references public.app_pages(key) on delete cascade,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  primary key (school_id, user_id, page_key)
);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  document_type text not null,
  owning_area text not null,
  canonical_reference text null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_source_versions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  version_label text not null,
  version_number integer not null default 1,
  checksum text null,
  file_name text null,
  mime_type text null,
  raw_text text null,
  chunk_count integer not null default 0,
  published_at timestamptz not null default now(),
  is_current boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  unique (source_document_id, version_number)
);

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  category text not null,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  source_document_id uuid null references public.source_documents(id) on delete set null,
  source_version_id uuid null references public.knowledge_source_versions(id) on delete set null,
  source_title text null,
  source_version_label text null,
  source_version_number integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institutional_consultations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  channel text not null default 'webchat',
  requester_id text null,
  requester_name text null,
  primary_topic text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'WAITING_HUMAN', 'RESOLVED', 'CLOSED')),
  assigned_assistant_key text not null default 'public.assistant',
  opened_at timestamptz not null default now(),
  resolved_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.consultation_messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  consultation_id uuid not null references public.institutional_consultations(id) on delete cascade,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND')),
  actor_type text not null check (actor_type in ('CITIZEN', 'ASSISTANT', 'HUMAN')),
  actor_name text null,
  message_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_responses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  consultation_id uuid not null references public.institutional_consultations(id) on delete cascade,
  assistant_key text not null check (assistant_key in ('public.assistant', 'administration.secretariat', 'administration.treasury', 'administration.direction')),
  response_text text not null,
  source_version_id uuid null references public.knowledge_source_versions(id) on delete set null,
  confidence_score numeric(4,3) null,
  response_mode text not null default 'AUTOMATIC',
  consulted_sources jsonb not null default '[]'::jsonb,
  supporting_source_title text null,
  supporting_source_excerpt text null,
  supporting_source_version_label text null,
  origin_message_id uuid null references public.consultation_messages(id) on delete set null,
  response_message_id uuid null references public.consultation_messages(id) on delete set null,
  fallback_to_human boolean not null default false,
  corrected_from_response_id uuid null references public.assistant_responses(id) on delete set null,
  corrected_at timestamptz null,
  corrected_by text null,
  quarantined_at timestamptz null,
  quarantined_by text null,
  quarantine_reason text null,
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  snapshot_date date not null,
  consultations_total integer not null default 0,
  consultations_resolved integer not null default 0,
  source_coverage_rate numeric(5,2) not null default 0,
  avg_confidence numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (school_id, snapshot_date)
);

create table if not exists public.ai_provider_settings (
  school_id uuid primary key references public.schools(id) on delete cascade,
  active_provider text not null default 'openai' check (active_provider in ('openai', 'groq', 'gemini')),
  openai_chat_model text null,
  groq_model text null,
  updated_by text null,
  updated_at timestamptz not null default now()
);

create table if not exists public.formal_audit_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  consultation_id uuid null references public.institutional_consultations(id) on delete set null,
  event_type text not null,
  severity text not null default 'INFO' check (severity in ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  actor_type text not null check (actor_type in ('SYSTEM', 'ASSISTANT', 'HUMAN')),
  actor_name text null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.interaction_feedback (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  consultation_id uuid not null references public.institutional_consultations(id) on delete cascade,
  response_id uuid not null references public.assistant_responses(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('helpful', 'not_helpful', 'incorrect')),
  comment text null,
  created_by text null,
  created_at timestamptz not null default now(),
  unique (response_id, feedback_type, created_by)
);

create table if not exists public.interaction_source_evidence (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  consultation_id uuid not null references public.institutional_consultations(id) on delete cascade,
  response_id uuid not null references public.assistant_responses(id) on delete cascade,
  source_document_id uuid null references public.source_documents(id) on delete set null,
  source_version_id uuid null references public.knowledge_source_versions(id) on delete set null,
  source_title text null,
  source_excerpt text null,
  relevance_score numeric(5,4) null,
  evidence_type text not null default 'retrieval',
  retrieval_method text null,
  used_as_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  consultation_id uuid not null references public.institutional_consultations(id) on delete cascade,
  response_id uuid null references public.assistant_responses(id) on delete set null,
  incident_type text not null,
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
  topic text null,
  details jsonb not null default '{}'::jsonb,
  opened_by text null,
  opened_at timestamptz not null default now(),
  resolved_by text null,
  resolved_at timestamptz null,
  resolution_notes text null
);

create index if not exists idx_platform_members_email on public.platform_members (email);
create index if not exists idx_platform_members_user_id on public.platform_members (user_id);
create index if not exists idx_school_members_school_role on public.school_members (school_id, role);
create index if not exists idx_kb_school_category on public.knowledge_base (school_id, category);
create index if not exists idx_consultations_school_status on public.institutional_consultations (school_id, status, opened_at desc);
create index if not exists idx_messages_consultation_created on public.consultation_messages (consultation_id, created_at);
create index if not exists idx_responses_school_assistant on public.assistant_responses (school_id, assistant_key, created_at desc);
create index if not exists idx_responses_consultation_delivered on public.assistant_responses (consultation_id, delivered_at desc);
create index if not exists idx_audit_school_created on public.formal_audit_events (school_id, created_at desc);
create index if not exists idx_feedback_school_created on public.interaction_feedback (school_id, created_at desc);
create index if not exists idx_feedback_response_type on public.interaction_feedback (response_id, feedback_type);
create index if not exists idx_evidence_response_primary on public.interaction_source_evidence (response_id, used_as_primary);
create index if not exists idx_evidence_school_created on public.interaction_source_evidence (school_id, created_at desc);
create index if not exists idx_incidents_school_status on public.incident_reports (school_id, status, opened_at desc);
create index if not exists idx_incidents_response on public.incident_reports (response_id, opened_at desc);

create table if not exists public.response_corrections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  feedback_id uuid not null references public.interaction_feedback(id) on delete cascade,
  response_id uuid not null references public.assistant_responses(id) on delete cascade,
  consultation_id uuid null references public.institutional_consultations(id) on delete set null,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED')),
  correction_type text not null check (correction_type in ('wrong_information', 'outdated_content', 'hallucination', 'inappropriate_tone', 'wrong_source', 'incomplete_answer', 'other')),
  root_cause text not null check (root_cause in ('outdated_knowledge_source', 'missing_knowledge_source', 'prompt_issue', 'model_hallucination', 'wrong_retrieval', 'ambiguous_question', 'other')),
  corrected_answer text not null,
  justification text null,
  affected_source_id uuid null references public.source_documents(id) on delete set null,
  recommended_action text not null check (recommended_action in ('update_source', 'create_source', 'suspend_source', 'adjust_prompt', 'no_action', 'other')),
  action_details text null,
  submitted_by text not null,
  submitted_by_user_id uuid null,
  submitted_at timestamptz not null default now(),
  reviewed_by text null,
  reviewed_at timestamptz null,
  review_notes text null,
  approved_by text null,
  approved_at timestamptz null,
  approval_notes text null,
  applied_by text null,
  applied_at timestamptz null,
  applied_destination text null,
  applied_notes text null,
  rejected_by text null,
  rejected_at timestamptz null,
  rejection_reason text null
);

create index if not exists idx_corrections_school_status on public.response_corrections (school_id, status, submitted_at desc);
create index if not exists idx_corrections_feedback on public.response_corrections (feedback_id);
create index if not exists idx_corrections_response on public.response_corrections (response_id);

create table if not exists public.correction_kb_changes (
  id uuid primary key default gen_random_uuid(),
  correction_id uuid not null references public.response_corrections(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  source_document_id uuid references public.source_documents(id) on delete set null,
  version_id uuid references public.knowledge_source_versions(id) on delete set null,
  change_type text not null check (change_type in ('content_updated', 'source_created', 'source_suspended', 'prompt_adjusted', 'embedding_refreshed', 'faq_updated', 'other')),
  change_description text not null,
  before_snapshot text,
  after_snapshot text,
  applied_by text not null,
  applied_by_user_id uuid,
  applied_at timestamptz not null default now()
);

create index if not exists idx_kb_changes_correction on public.correction_kb_changes (correction_id);
create index if not exists idx_kb_changes_source on public.correction_kb_changes (source_document_id);
create index if not exists idx_kb_changes_school on public.correction_kb_changes (school_id, applied_at desc);

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

create index if not exists idx_official_content_school_module on public.official_content_records (school_id, module_key, scope_key);

insert into public.app_pages (key, label, menu_order, active) values
  ('dashboard', 'Dashboard de Inteligencia', 10, true),
  ('chat-manager', 'Atendimento', 20, true),
  ('reports', 'Relatorios', 30, true),
  ('audit', 'Auditoria Formal', 40, true),
  ('users', 'Usuarios', 50, true),
  ('preferences', 'Preferencias', 60, true),
  ('knowledge', 'Base de Conhecimento', 70, true),
  ('official-content', 'Conteudo Oficial', 80, true)
on conflict (key) do update
set label = excluded.label,
    menu_order = excluded.menu_order,
    active = excluded.active;

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
  foreach p in array array['dashboard','chat-manager','reports','audit','users','preferences','knowledge','official-content'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'content_curator';
  foreach p in array array['dashboard','reports','audit','knowledge','official-content'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'public_operator';
  foreach p in array array['dashboard','chat-manager','reports','knowledge','official-content'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'secretariat';
  foreach p in array array['dashboard','chat-manager','knowledge','official-content'] loop
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

  r := 'treasury';
  foreach p in array array['dashboard','chat-manager','reports','knowledge','audit'] loop
    insert into public.role_page_permissions (school_id, role, page_key, allowed)
    values (p_school_id, r, p, true)
    on conflict (school_id, role, page_key) do update set allowed = excluded.allowed, updated_at = now();
  end loop;

  r := 'direction';
  foreach p in array array['dashboard','chat-manager','reports','audit','knowledge','official-content'] loop
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


