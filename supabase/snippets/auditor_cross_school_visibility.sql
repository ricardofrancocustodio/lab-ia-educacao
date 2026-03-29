-- Migration: Auditor cross-school visibility
-- Adds auditor role support in platform_members and grants page permissions across all schools.

-- 1) Expand platform_members role constraint to allow 'auditor'
ALTER TABLE public.platform_members DROP CONSTRAINT IF EXISTS platform_members_role_check;
ALTER TABLE public.platform_members ADD CONSTRAINT platform_members_role_check CHECK (role IN ('superadmin', 'auditor'));

-- 2) Insert auditor as platform member (idempotent)
INSERT INTO public.platform_members (user_id, name, email, role, active)
VALUES ('fe89c276-3c9a-4740-9194-e40d6ad8b8b9', 'Auditor Externo', 'auditor.externo@lab-ia.gov.br', 'auditor', true)
ON CONFLICT (email) DO UPDATE SET role = 'auditor', active = true, updated_at = now();

-- 3) Ensure auditor has page access (dashboard, reports, audit, incidents, feedback) across ALL schools
INSERT INTO public.role_page_permissions (school_id, role, page_key, allowed)
SELECT s.id, 'auditor', p.page_key, true
FROM public.schools s
CROSS JOIN (
  VALUES ('dashboard'), ('reports'), ('audit'), ('incidents'), ('feedback')
) AS p(page_key)
ON CONFLICT (school_id, role, page_key) DO NOTHING;
