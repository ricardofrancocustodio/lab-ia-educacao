begin;

alter table public.school_members drop constraint if exists school_members_role_check;

alter table public.school_members
  add constraint school_members_role_check
  check (role in (
    'network_manager',
    'content_curator',
    'public_operator',
    'secretariat',
    'coordination',
    'teacher',
    'direction',
    'auditor',
    'observer'
  ));

create or replace function public.default_member_scope_for_role(p_role text, p_institution_type text)
returns text
language plpgsql
stable
as $$
begin
  case lower(coalesce(p_role, ''))
    when 'network_manager' then
      return 'department_staff';
    when 'secretariat' then
      if lower(coalesce(p_institution_type, '')) = 'school_unit' then
        return 'school_staff';
      end if;
      return 'department_staff';
    when 'direction', 'coordination', 'public_operator', 'content_curator' then
      if lower(coalesce(p_institution_type, '')) = 'school_unit' then
        return 'school_staff';
      end if;
      return 'department_staff';
    when 'teacher' then
      return 'school_staff';
    when 'auditor' then
      return 'department_staff';
    when 'observer' then
      return 'external_observer';
    else
      return 'department_staff';
  end case;
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
    when 'network_manager' then
      if v_institution_type <> 'education_department' then
        raise exception 'O papel % so pode ser vinculado diretamente a secretarias/redes.', new.role;
      end if;
      if new.member_scope <> 'department_staff' then
        raise exception 'O papel % exige member_scope=department_staff.', new.role;
      end if;

    when 'secretariat' then
      if v_institution_type = 'school_unit' then
        if v_parent_school_id is null then
          raise exception 'O papel % em unidade escolar exige parent_school_id configurado.', new.role;
        end if;
        if new.member_scope <> 'school_staff' then
          raise exception 'O papel % em unidade escolar exige member_scope=school_staff.', new.role;
        end if;
      elsif v_institution_type = 'education_department' then
        if new.member_scope <> 'department_staff' then
          raise exception 'O papel % em secretaria/rede exige member_scope=department_staff.', new.role;
        end if;
      else
        raise exception 'O papel % nao pode ser vinculado ao tipo institucional informado.', new.role;
      end if;

    when 'direction', 'coordination', 'public_operator' then
      if v_institution_type = 'school_unit' and v_parent_school_id is null then
        raise exception 'O papel % em unidade escolar exige parent_school_id configurado.', new.role;
      end if;
      if new.member_scope not in ('department_staff', 'school_staff') then
        raise exception 'O papel % exige member_scope interno (department_staff ou school_staff).', new.role;
      end if;

    when 'teacher' then
      if v_institution_type <> 'school_unit' then
        raise exception 'O papel % so pode ser vinculado diretamente a unidades escolares.', new.role;
      end if;
      if v_parent_school_id is null then
        raise exception 'O papel % em unidade escolar exige parent_school_id configurado.', new.role;
      end if;
      if new.member_scope <> 'school_staff' then
        raise exception 'O papel % exige member_scope=school_staff.', new.role;
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

insert into public.role_page_permissions (school_id, role, page_key, allowed)
select s.id, 'teacher', p.page_key, true
from public.schools s
cross join (values ('notices'), ('notifications'), ('teaching-content')) as p(page_key)
on conflict (school_id, role, page_key) do update
set allowed = excluded.allowed,
    updated_at = now();

commit;