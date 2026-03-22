begin;

alter table public.schools
  add column if not exists institution_type text not null default 'education_department',
  add column if not exists parent_school_id uuid null references public.schools(id) on delete restrict;

create index if not exists idx_schools_institution_type on public.schools (institution_type);
create index if not exists idx_schools_parent_school on public.schools (parent_school_id);

alter table public.school_members
  add column if not exists member_scope text not null default 'department_staff',
  add column if not exists affiliation_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_school_members_scope on public.school_members (school_id, member_scope);

update public.schools
set institution_type = coalesce(nullif(trim(institution_type), ''), 'education_department')
where institution_type is null
   or trim(institution_type) = '';

update public.school_members
set member_scope = coalesce(nullif(trim(member_scope), ''), 'department_staff')
where member_scope is null
   or trim(member_scope) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'schools_institution_type_check'
      and conrelid = 'public.schools'::regclass
  ) then
    alter table public.schools
      add constraint schools_institution_type_check
      check (institution_type in ('education_department', 'school_unit'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'school_members_member_scope_check'
      and conrelid = 'public.school_members'::regclass
  ) then
    alter table public.school_members
      add constraint school_members_member_scope_check
      check (member_scope in ('department_staff', 'school_staff', 'external_auditor', 'external_observer'));
  end if;
end $$;

create or replace function public.default_member_scope_for_role(p_role text, p_institution_type text)
returns text
language plpgsql
stable
as $$
begin
  case lower(coalesce(p_role, ''))
    when 'network_manager', 'secretariat', 'treasury' then
      return 'department_staff';
    when 'direction', 'coordination', 'public_operator', 'content_curator' then
      if lower(coalesce(p_institution_type, '')) = 'school_unit' then
        return 'school_staff';
      end if;
      return 'department_staff';
    when 'auditor' then
      return 'department_staff';
    when 'observer' then
      return 'external_observer';
    else
      return 'department_staff';
  end case;
end;
$$;

create or replace function public.resolve_governing_department_id(p_school_id uuid)
returns uuid
language sql
stable
as $$
  select case
    when s.institution_type = 'school_unit' then s.parent_school_id
    else s.id
  end
  from public.schools s
  where s.id = p_school_id
$$;

create or replace function public.validate_school_hierarchy()
returns trigger
language plpgsql
as $$
declare
  v_parent_type text;
begin
  new.institution_type := lower(coalesce(new.institution_type, 'education_department'));

  if new.parent_school_id = new.id then
    raise exception 'A instituicao nao pode apontar para si mesma como parent_school_id.';
  end if;

  if new.institution_type = 'education_department' and new.parent_school_id is not null then
    raise exception 'Secretarias/rede nao podem ter parent_school_id.';
  end if;

  if new.institution_type = 'school_unit' and new.parent_school_id is null then
    raise exception 'Unidades escolares precisam estar vinculadas a uma secretaria/rede via parent_school_id.';
  end if;

  if new.parent_school_id is not null then
    select s.institution_type
      into v_parent_type
    from public.schools s
    where s.id = new.parent_school_id;

    if v_parent_type is null then
      raise exception 'Instituicao pai nao encontrada para o parent_school_id informado.';
    end if;

    if v_parent_type <> 'education_department' then
      raise exception 'A instituicao pai deve ser do tipo education_department.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_school_member_affiliation()
returns trigger
language plpgsql
as $$
declare
  v_institution_type text;
  v_parent_school_id uuid;
begin
  select s.institution_type, s.parent_school_id
    into v_institution_type, v_parent_school_id
  from public.schools s
  where s.id = new.school_id;

  if v_institution_type is null then
    raise exception 'Instituicao nao encontrada para o school_id informado em school_members.';
  end if;

  new.role := lower(coalesce(new.role, ''));
  new.member_scope := lower(coalesce(nullif(trim(new.member_scope), ''), public.default_member_scope_for_role(new.role, v_institution_type)));

  case new.role
    when 'network_manager', 'secretariat', 'treasury' then
      if v_institution_type <> 'education_department' then
        raise exception 'O papel % so pode ser vinculado diretamente a secretarias/redes.', new.role;
      end if;
      if new.member_scope <> 'department_staff' then
        raise exception 'O papel % exige member_scope=department_staff.', new.role;
      end if;

    when 'direction', 'coordination', 'public_operator' then
      if v_institution_type = 'school_unit' and v_parent_school_id is null then
        raise exception 'O papel % em unidade escolar exige parent_school_id configurado.', new.role;
      end if;
      if new.member_scope not in ('department_staff', 'school_staff') then
        raise exception 'O papel % exige member_scope interno (department_staff ou school_staff).', new.role;
      end if;

    when 'content_curator' then
      if new.member_scope not in ('department_staff', 'school_staff') then
        raise exception 'Curadoria de conteudo deve ser interna a uma secretaria/rede ou unidade escolar.';
      end if;

    when 'auditor' then
      if new.member_scope not in ('department_staff', 'external_auditor') then
        raise exception 'Auditoria deve ser vinculada como department_staff ou external_auditor.';
      end if;

    when 'observer' then
      if new.member_scope not in ('department_staff', 'external_observer') then
        raise exception 'Observador deve ser vinculado como department_staff ou external_observer.';
      end if;

    else
      raise exception 'Role % nao suportado na politica de afiliacao institucional.', new.role;
  end case;

  return new;
end;
$$;

drop trigger if exists trg_validate_school_hierarchy on public.schools;
create trigger trg_validate_school_hierarchy
before insert or update of institution_type, parent_school_id
on public.schools
for each row
execute function public.validate_school_hierarchy();

drop trigger if exists trg_validate_school_member_affiliation on public.school_members;
create trigger trg_validate_school_member_affiliation
before insert or update of school_id, role, member_scope
on public.school_members
for each row
execute function public.validate_school_member_affiliation();

comment on column public.schools.institution_type is 'Tipo da instituicao no modelo de isolamento: education_department ou school_unit.';
comment on column public.schools.parent_school_id is 'Quando institution_type=school_unit, aponta para a secretaria/rede responsavel.';
comment on column public.school_members.member_scope is 'Escopo do vinculo do membro com a instituicao: department_staff, school_staff, external_auditor ou external_observer.';
comment on column public.school_members.affiliation_metadata is 'Metadados opcionais do vinculo institucional para governanca e auditoria.';

commit;

