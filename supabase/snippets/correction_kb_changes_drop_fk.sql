-- Migration: Remove FK constraint on correction_kb_changes.correction_id
-- Reason: correction_id now references EITHER response_corrections.id OR formal_audit_events.id
-- (treatment flow auto-apply uses formal_audit_events.id as the source reference)
-- Add source_table column to disambiguate which table the correction_id refers to.

-- 1. Drop the existing FK constraint
ALTER TABLE public.correction_kb_changes
  DROP CONSTRAINT IF EXISTS correction_kb_changes_correction_id_fkey;

-- 2. Add source_table column for disambiguation
ALTER TABLE public.correction_kb_changes
  ADD COLUMN IF NOT EXISTS source_table text NOT NULL DEFAULT 'response_corrections'
  CHECK (source_table IN ('response_corrections', 'formal_audit_events'));

COMMENT ON COLUMN public.correction_kb_changes.source_table IS 'Indica se correction_id referencia response_corrections ou formal_audit_events';
