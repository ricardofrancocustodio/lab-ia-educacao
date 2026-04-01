alter table public.knowledge_source_versions
  add column if not exists storage_bucket text null;

alter table public.knowledge_source_versions
  add column if not exists storage_path text null;