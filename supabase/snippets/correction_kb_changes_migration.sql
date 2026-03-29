-- Migration: correction_kb_changes table
-- Tracks the link between corrections (response_corrections) and actual KB changes
-- Implements G4 (rastreabilidade correção → mudança na base de conhecimento)

CREATE TABLE IF NOT EXISTS public.correction_kb_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_id uuid NOT NULL REFERENCES public.response_corrections(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  source_document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  version_id uuid REFERENCES public.knowledge_source_versions(id) ON DELETE SET NULL,
  change_type text NOT NULL CHECK (change_type IN (
    'content_updated',
    'source_created',
    'source_suspended',
    'prompt_adjusted',
    'embedding_refreshed',
    'faq_updated',
    'other'
  )),
  change_description text NOT NULL,
  before_snapshot text,
  after_snapshot text,
  applied_by text NOT NULL,
  applied_by_user_id uuid,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_changes_correction ON public.correction_kb_changes (correction_id);
CREATE INDEX IF NOT EXISTS idx_kb_changes_source ON public.correction_kb_changes (source_document_id);
CREATE INDEX IF NOT EXISTS idx_kb_changes_school ON public.correction_kb_changes (school_id, applied_at DESC);

COMMENT ON TABLE public.correction_kb_changes IS 'Rastreabilidade: cada registro documenta uma mudança real na base de conhecimento originada por uma correção aprovada/aplicada.';
