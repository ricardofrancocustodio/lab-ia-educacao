begin;

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

create index if not exists idx_feedback_school_created on public.interaction_feedback (school_id, created_at desc);
create index if not exists idx_feedback_response_type on public.interaction_feedback (response_id, feedback_type);
create index if not exists idx_evidence_response_primary on public.interaction_source_evidence (response_id, used_as_primary);
create index if not exists idx_evidence_school_created on public.interaction_source_evidence (school_id, created_at desc);
create index if not exists idx_incidents_school_status on public.incident_reports (school_id, status, opened_at desc);
create index if not exists idx_incidents_response on public.incident_reports (response_id, opened_at desc);

commit;
