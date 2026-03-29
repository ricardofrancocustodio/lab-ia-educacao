-- Migration: Add submitted_by_user_id to response_corrections for self-review prevention
-- Date: 2025-06-XX
-- Purpose: Store the auth UUID of the submitter so we can reliably prevent self-review

ALTER TABLE public.response_corrections
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid null;

COMMENT ON COLUMN public.response_corrections.submitted_by_user_id IS 'Auth user UUID of the correction submitter, used for self-review prevention';
