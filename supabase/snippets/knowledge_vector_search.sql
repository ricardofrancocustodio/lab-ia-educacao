begin;

create extension if not exists vector;

alter table public.knowledge_base
  add column if not exists embedding vector(1536);

create index if not exists idx_kb_school_source_version
  on public.knowledge_base (school_id, source_version_id);

create index if not exists idx_kb_embedding_cosine
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_knowledge(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_school_id uuid
)
returns table (
  id uuid,
  school_id uuid,
  category text,
  question text,
  answer text,
  keywords text[],
  source_document_id uuid,
  source_title text,
  source_version_id uuid,
  source_version_label text,
  source_version_number integer,
  similarity float
)
language sql
stable
as $$
  select
    kb.id,
    kb.school_id,
    kb.category,
    kb.question,
    kb.answer,
    kb.keywords,
    kb.source_document_id,
    kb.source_title,
    kb.source_version_id,
    kb.source_version_label,
    kb.source_version_number,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base kb
  where kb.school_id = p_school_id
    and kb.embedding is not null
    and 1 - (kb.embedding <=> query_embedding) >= coalesce(match_threshold, 0.45)
  order by kb.embedding <=> query_embedding
  limit coalesce(match_count, 3);
$$;

comment on function public.match_knowledge(vector(1536), float, int, uuid)
  is 'Busca semantica na knowledge_base por similaridade de embedding, filtrando pela escola.';

commit;
