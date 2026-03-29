-- Adiciona colunas de quarentena em assistant_responses
-- L7 — Contenção de respostas (Sprint 1)
begin;

alter table public.assistant_responses
  add column if not exists quarantined_at timestamptz null,
  add column if not exists quarantined_by text null,
  add column if not exists quarantine_reason text null;

create index if not exists idx_responses_quarantined
  on public.assistant_responses (quarantined_at)
  where quarantined_at is not null;

commit;
