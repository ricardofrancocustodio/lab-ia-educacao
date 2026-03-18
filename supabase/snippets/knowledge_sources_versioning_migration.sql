begin;

alter table public.source_documents
  add column if not exists description text null;

alter table public.knowledge_source_versions
  add column if not exists file_name text null,
  add column if not exists mime_type text null,
  add column if not exists raw_text text null,
  add column if not exists chunk_count integer not null default 0;

create index if not exists idx_source_documents_school_area on public.source_documents (school_id, owning_area, updated_at desc);
create index if not exists idx_source_versions_document_current on public.knowledge_source_versions (source_document_id, is_current, published_at desc);

commit;
