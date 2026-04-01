-- Migration: Switch embeddings from text-embedding-3-small (1536) to BAAI/bge-m3 (1024)
-- BGE-M3 is a 100% open-source multilingual model with strong Portuguese support.
-- Run this once. It drops existing embeddings since they are incompatible with new dimension.

begin;

-- 1. Drop existing IVFFlat index (depends on old dimension)
drop index if exists idx_kb_embedding_cosine;

-- 2. Remove old column and recreate with new dimension
alter table public.knowledge_base
  drop column if exists embedding;

alter table public.knowledge_base
  add column embedding vector(1024);

-- 3. Recreate IVFFlat index for cosine similarity (1024 dims)
create index idx_kb_embedding_cosine
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Replace match_knowledge function for 1024-dim vectors
create or replace function public.match_knowledge(
  query_embedding vector(1024),
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
    and 1 - (kb.embedding <=> query_embedding) >= coalesce(match_threshold, 0.40)
  order by kb.embedding <=> query_embedding
  limit coalesce(match_count, 5);
$$;

-- 5. Also support filtering by source_document_id for discipline-scoped search
create or replace function public.match_teaching_knowledge(
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  p_school_id uuid,
  p_source_document_ids uuid[]
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
    and (p_source_document_ids is null or kb.source_document_id = any(p_source_document_ids))
    and 1 - (kb.embedding <=> query_embedding) >= coalesce(match_threshold, 0.40)
  order by kb.embedding <=> query_embedding
  limit coalesce(match_count, 5);
$$;

commit;
