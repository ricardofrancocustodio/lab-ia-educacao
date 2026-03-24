begin;

create table if not exists public.ai_provider_settings (
  school_id uuid primary key references public.schools(id) on delete cascade,
  active_provider text not null default 'groq' check (active_provider = 'groq'),
    groq_model text null,
  updated_by text null,
  updated_at timestamptz not null default now()
);

commit;
