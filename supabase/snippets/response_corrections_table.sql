-- Migration: response_corrections table for structured correction lifecycle
-- Replaces the simple corrected_at/by approach with a full tracked workflow:
-- SUBMITTED → IN_REVIEW → APPROVED → APPLIED (or REJECTED)

BEGIN;

CREATE TABLE IF NOT EXISTS public.response_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL REFERENCES public.interaction_feedback(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES public.assistant_responses(id) ON DELETE CASCADE,
  consultation_id UUID NULL REFERENCES public.institutional_consultations(id) ON DELETE SET NULL,

  -- Lifecycle status
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED')),

  -- Structured form fields
  correction_type TEXT NOT NULL CHECK (correction_type IN (
    'wrong_information', 'outdated_content', 'hallucination',
    'inappropriate_tone', 'wrong_source', 'incomplete_answer', 'other'
  )),
  root_cause TEXT NOT NULL CHECK (root_cause IN (
    'outdated_knowledge_source', 'missing_knowledge_source', 'prompt_issue',
    'model_hallucination', 'wrong_retrieval', 'ambiguous_question', 'other'
  )),
  corrected_answer TEXT NOT NULL,
  justification TEXT NULL,
  affected_source_id UUID NULL REFERENCES public.source_documents(id) ON DELETE SET NULL,
  recommended_action TEXT NOT NULL CHECK (recommended_action IN (
    'update_source', 'create_source', 'suspend_source', 'adjust_prompt', 'no_action', 'other'
  )),
  action_details TEXT NULL,

  -- Submission
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Review
  reviewed_by TEXT NULL,
  reviewed_at TIMESTAMPTZ NULL,
  review_notes TEXT NULL,

  -- Approval
  approved_by TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  approval_notes TEXT NULL,

  -- Application
  applied_by TEXT NULL,
  applied_at TIMESTAMPTZ NULL,
  applied_destination TEXT NULL,
  applied_notes TEXT NULL,

  -- Rejection
  rejected_by TEXT NULL,
  rejected_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_corrections_school_status ON public.response_corrections (school_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_corrections_feedback ON public.response_corrections (feedback_id);
CREATE INDEX IF NOT EXISTS idx_corrections_response ON public.response_corrections (response_id);

COMMIT;
