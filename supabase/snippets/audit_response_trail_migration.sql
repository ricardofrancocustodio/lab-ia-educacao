begin;

alter table public.assistant_responses
  add column if not exists response_mode text not null default 'AUTOMATIC',
  add column if not exists consulted_sources jsonb not null default '[]'::jsonb,
  add column if not exists supporting_source_title text null,
  add column if not exists supporting_source_excerpt text null,
  add column if not exists supporting_source_version_label text null,
  add column if not exists origin_message_id uuid null references public.consultation_messages(id) on delete set null,
  add column if not exists response_message_id uuid null references public.consultation_messages(id) on delete set null,
  add column if not exists fallback_to_human boolean not null default false,
  add column if not exists corrected_from_response_id uuid null references public.assistant_responses(id) on delete set null,
  add column if not exists corrected_at timestamptz null,
  add column if not exists corrected_by text null,
  add column if not exists delivered_at timestamptz not null default now();

create index if not exists idx_responses_consultation_delivered on public.assistant_responses (consultation_id, delivered_at desc);

commit;
