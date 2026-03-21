-- Validacao estrutural do pacote RLS LGPD
-- Execute apos o deploy em homologacao e depois em producao.

-- 1) Confirmar que RLS esta habilitado nas tabelas criticas
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'school_members',
    'role_page_permissions',
    'user_page_permissions',
    'source_documents',
    'knowledge_source_versions',
    'knowledge_base',
    'institutional_consultations',
    'consultation_messages',
    'assistant_responses',
    'ai_provider_settings',
    'formal_audit_events',
    'interaction_feedback',
    'interaction_source_evidence',
    'incident_reports',
    'official_content_records'
  )
order by c.relname;

-- 2) Confirmar que as helper functions existem
select
  routine_name,
  routine_type,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_platform_superadmin',
    'is_school_member',
    'has_school_role',
    'can_manage_school_access',
    'can_manage_school_content',
    'can_operate_school_service',
    'can_read_school_governance',
    'can_manage_ai_settings'
  )
order by routine_name;

-- 3) Listar policies das tabelas criticas
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'school_members',
    'role_page_permissions',
    'user_page_permissions',
    'source_documents',
    'knowledge_source_versions',
    'knowledge_base',
    'institutional_consultations',
    'consultation_messages',
    'assistant_responses',
    'ai_provider_settings',
    'formal_audit_events',
    'interaction_feedback',
    'interaction_source_evidence',
    'incident_reports',
    'official_content_records'
  )
order by tablename, policyname;

-- 4) Verificar se ainda ha papeis legados na base
select
  lower(trim(role)) as role_key,
  count(*) as total
from public.school_members
group by lower(trim(role))
having lower(trim(role)) in ('admin', 'secretary', 'coordinator', 'finance', 'it', 'teacher', 'support')
order by role_key;

-- 5) Distribuicao atual de membros ativos por papel
select
  role,
  status,
  active,
  count(*) as total
from public.school_members
group by role, status, active
order by role, status, active;

-- 6) Confirmar se ha usuarios ativos sem escola vinculada
select count(*) as active_users_without_school_member
from auth.users u
where not exists (
  select 1
  from public.school_members sm
  where sm.user_id = u.id
    and sm.active = true
    and sm.status = 'active'
)
and not exists (
  select 1
  from public.platform_members pm
  where pm.user_id = u.id
    and pm.active = true
    and pm.role = 'superadmin'
);

-- 7) Conferir tabelas sensiveis com dados para smoke test
select 'institutional_consultations' as table_name, count(*) as total from public.institutional_consultations
union all
select 'consultation_messages', count(*) from public.consultation_messages
union all
select 'assistant_responses', count(*) from public.assistant_responses
union all
select 'formal_audit_events', count(*) from public.formal_audit_events
union all
select 'incident_reports', count(*) from public.incident_reports
union all
select 'official_content_records', count(*) from public.official_content_records
union all
select 'source_documents', count(*) from public.source_documents
union all
select 'knowledge_source_versions', count(*) from public.knowledge_source_versions
order by table_name;

-- 8) Validacao manual assistida
-- Depois desta checagem estrutural, validar com usuarios reais por perfil:
-- superadmin, network_manager, content_curator, secretariat, direction, auditor e observer.
