begin;

create table if not exists public.ai_provider_settings (
  school_id uuid primary key references public.schools(id) on delete cascade,
  active_provider text not null default 'openai' check (active_provider in ('openai', 'groq', 'gemini')),
  openai_chat_model text null,
  groq_model text null,
  updated_by text null,
  updated_at timestamptz not null default now()
);

commit;
