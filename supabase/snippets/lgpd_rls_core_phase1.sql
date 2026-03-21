begin;

create or replace function public.is_platform_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.platform_members pm
    where pm.user_id = auth.uid()
      and pm.active = true
      and pm.role = 'superadmin'
  );
$$;

create or replace function public.is_school_member(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_platform_superadmin()
    or exists (
      select 1
      from public.school_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = p_school_id
        and sm.active = true
        and sm.status = 'active'
    );
$$;

create or replace function public.has_school_role(p_school_id uuid, p_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_platform_superadmin()
    or exists (
      select 1
      from public.school_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = p_school_id
        and sm.active = true
        and sm.status = 'active'
        and sm.role = any (p_roles)
    );
$$;

create or replace function public.can_manage_school_access(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_school_role(
    p_school_id,
    array['network_manager', 'direction']::text[]
  );
$$;

create or replace function public.can_manage_school_content(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_school_role(
    p_school_id,
    array['network_manager', 'content_curator', 'direction', 'secretariat', 'coordination']::text[]
  );
$$;

create or replace function public.can_operate_school_service(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_school_role(
    p_school_id,
    array['network_manager', 'direction', 'secretariat', 'coordination', 'public_operator', 'treasury']::text[]
  );
$$;

create or replace function public.can_read_school_governance(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_school_role(
    p_school_id,
    array['network_manager', 'direction', 'auditor', 'content_curator', 'treasury']::text[]
  );
$$;

create or replace function public.can_manage_ai_settings(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_school_role(
    p_school_id,
    array['network_manager', 'direction']::text[]
  );
$$;

alter table public.school_members enable row level security;
alter table public.role_page_permissions enable row level security;
alter table public.user_page_permissions enable row level security;
alter table public.source_documents enable row level security;
alter table public.knowledge_source_versions enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.institutional_consultations enable row level security;
alter table public.consultation_messages enable row level security;
alter table public.assistant_responses enable row level security;
alter table public.ai_provider_settings enable row level security;
alter table public.formal_audit_events enable row level security;
alter table public.interaction_feedback enable row level security;
alter table public.interaction_source_evidence enable row level security;
alter table public.incident_reports enable row level security;
alter table public.official_content_records enable row level security;

drop policy if exists "read school members by school context" on public.school_members;
create policy "read school members by school context"
on public.school_members for select
to authenticated
using (
  public.is_school_member(school_members.school_id)
);

drop policy if exists "write school members by access managers" on public.school_members;
create policy "write school members by access managers"
on public.school_members for all
to authenticated
using (
  public.can_manage_school_access(school_members.school_id)
)
with check (
  public.can_manage_school_access(school_members.school_id)
);

drop policy if exists "read role page permissions by school context" on public.role_page_permissions;
create policy "read role page permissions by school context"
on public.role_page_permissions for select
to authenticated
using (
  public.is_school_member(role_page_permissions.school_id)
);

drop policy if exists "write role page permissions by access managers" on public.role_page_permissions;
create policy "write role page permissions by access managers"
on public.role_page_permissions for all
to authenticated
using (
  public.can_manage_school_access(role_page_permissions.school_id)
)
with check (
  public.can_manage_school_access(role_page_permissions.school_id)
);

drop policy if exists "read user page permissions by school context" on public.user_page_permissions;
create policy "read user page permissions by school context"
on public.user_page_permissions for select
to authenticated
using (
  user_page_permissions.user_id = auth.uid()
  or public.can_manage_school_access(user_page_permissions.school_id)
);

drop policy if exists "write user page permissions by access managers" on public.user_page_permissions;
create policy "write user page permissions by access managers"
on public.user_page_permissions for all
to authenticated
using (
  public.can_manage_school_access(user_page_permissions.school_id)
)
with check (
  public.can_manage_school_access(user_page_permissions.school_id)
);

drop policy if exists "read source documents by content readers" on public.source_documents;
create policy "read source documents by content readers"
on public.source_documents for select
to authenticated
using (
  public.is_school_member(source_documents.school_id)
);

drop policy if exists "write source documents by content managers" on public.source_documents;
create policy "write source documents by content managers"
on public.source_documents for all
to authenticated
using (
  public.can_manage_school_content(source_documents.school_id)
)
with check (
  public.can_manage_school_content(source_documents.school_id)
);

drop policy if exists "read source versions by content readers" on public.knowledge_source_versions;
create policy "read source versions by content readers"
on public.knowledge_source_versions for select
to authenticated
using (
  public.is_school_member(knowledge_source_versions.school_id)
);

drop policy if exists "write source versions by content managers" on public.knowledge_source_versions;
create policy "write source versions by content managers"
on public.knowledge_source_versions for all
to authenticated
using (
  public.can_manage_school_content(knowledge_source_versions.school_id)
)
with check (
  public.can_manage_school_content(knowledge_source_versions.school_id)
);

drop policy if exists "read knowledge base by school context" on public.knowledge_base;
create policy "read knowledge base by school context"
on public.knowledge_base for select
to authenticated
using (
  public.is_school_member(knowledge_base.school_id)
);

drop policy if exists "write knowledge base by content managers" on public.knowledge_base;
create policy "write knowledge base by content managers"
on public.knowledge_base for all
to authenticated
using (
  public.can_manage_school_content(knowledge_base.school_id)
)
with check (
  public.can_manage_school_content(knowledge_base.school_id)
);

drop policy if exists "read consultations by service operators" on public.institutional_consultations;
create policy "read consultations by service operators"
on public.institutional_consultations for select
to authenticated
using (
  public.can_operate_school_service(institutional_consultations.school_id)
  or public.can_read_school_governance(institutional_consultations.school_id)
);

drop policy if exists "write consultations by service operators" on public.institutional_consultations;
create policy "write consultations by service operators"
on public.institutional_consultations for all
to authenticated
using (
  public.can_operate_school_service(institutional_consultations.school_id)
)
with check (
  public.can_operate_school_service(institutional_consultations.school_id)
);

drop policy if exists "read consultation messages by service operators" on public.consultation_messages;
create policy "read consultation messages by service operators"
on public.consultation_messages for select
to authenticated
using (
  public.can_operate_school_service(consultation_messages.school_id)
  or public.can_read_school_governance(consultation_messages.school_id)
);

drop policy if exists "write consultation messages by service operators" on public.consultation_messages;
create policy "write consultation messages by service operators"
on public.consultation_messages for all
to authenticated
using (
  public.can_operate_school_service(consultation_messages.school_id)
)
with check (
  public.can_operate_school_service(consultation_messages.school_id)
);

drop policy if exists "read assistant responses by service operators" on public.assistant_responses;
create policy "read assistant responses by service operators"
on public.assistant_responses for select
to authenticated
using (
  public.can_operate_school_service(assistant_responses.school_id)
  or public.can_read_school_governance(assistant_responses.school_id)
);

drop policy if exists "write assistant responses by service operators" on public.assistant_responses;
create policy "write assistant responses by service operators"
on public.assistant_responses for all
to authenticated
using (
  public.can_operate_school_service(assistant_responses.school_id)
)
with check (
  public.can_operate_school_service(assistant_responses.school_id)
);

drop policy if exists "read ai provider settings by ai managers" on public.ai_provider_settings;
create policy "read ai provider settings by ai managers"
on public.ai_provider_settings for select
to authenticated
using (
  public.can_manage_ai_settings(ai_provider_settings.school_id)
);

drop policy if exists "write ai provider settings by ai managers" on public.ai_provider_settings;
create policy "write ai provider settings by ai managers"
on public.ai_provider_settings for all
to authenticated
using (
  public.can_manage_ai_settings(ai_provider_settings.school_id)
)
with check (
  public.can_manage_ai_settings(ai_provider_settings.school_id)
);

drop policy if exists "read formal audit events by governance roles" on public.formal_audit_events;
create policy "read formal audit events by governance roles"
on public.formal_audit_events for select
to authenticated
using (
  public.can_read_school_governance(formal_audit_events.school_id)
);

drop policy if exists "write formal audit events by governance roles" on public.formal_audit_events;

drop policy if exists "read interaction feedback by service operators" on public.interaction_feedback;
create policy "read interaction feedback by service operators"
on public.interaction_feedback for select
to authenticated
using (
  public.can_operate_school_service(interaction_feedback.school_id)
  or public.can_read_school_governance(interaction_feedback.school_id)
);

drop policy if exists "write interaction feedback by service operators" on public.interaction_feedback;
create policy "write interaction feedback by service operators"
on public.interaction_feedback for all
to authenticated
using (
  public.can_operate_school_service(interaction_feedback.school_id)
)
with check (
  public.can_operate_school_service(interaction_feedback.school_id)
);

drop policy if exists "read interaction evidence by governance roles" on public.interaction_source_evidence;
create policy "read interaction evidence by governance roles"
on public.interaction_source_evidence for select
to authenticated
using (
  public.can_read_school_governance(interaction_source_evidence.school_id)
);

drop policy if exists "write interaction evidence by governance roles" on public.interaction_source_evidence;

drop policy if exists "read incidents by governance roles" on public.incident_reports;
create policy "read incidents by governance roles"
on public.incident_reports for select
to authenticated
using (
  public.can_read_school_governance(incident_reports.school_id)
  or public.can_operate_school_service(incident_reports.school_id)
);

drop policy if exists "write incidents by governance roles" on public.incident_reports;
create policy "write incidents by governance roles"
on public.incident_reports for all
to authenticated
using (
  public.can_read_school_governance(incident_reports.school_id)
  or public.can_operate_school_service(incident_reports.school_id)
)
with check (
  public.can_read_school_governance(incident_reports.school_id)
  or public.can_operate_school_service(incident_reports.school_id)
);

drop policy if exists "read official content by school context" on public.official_content_records;
create policy "read official content by school context"
on public.official_content_records for select
to authenticated
using (
  public.is_school_member(official_content_records.school_id)
);

drop policy if exists "write official content by content managers" on public.official_content_records;
create policy "write official content by content managers"
on public.official_content_records for all
to authenticated
using (
  public.can_manage_school_content(official_content_records.school_id)
)
with check (
  public.can_manage_school_content(official_content_records.school_id)
);

commit;


