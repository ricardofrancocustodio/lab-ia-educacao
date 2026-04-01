begin;

-- Ajuste os nomes/slugs se o seu ambiente usar outros identificadores.
-- Este script cria duas redes distintas, vincula CEF 01 (DF) e CEPI Lyceu (GO) a redes-pai diferentes
-- e garante um Gestor de Rede para cada uma.

with desired_networks as (
  select *
  from (
    values
      ('seedf', 'Secretaria de Educacao do DF', 'gestor.rede-a@lab-ia.gov.br'),
      ('seduc-go', 'Secretaria de Educacao de Goias', 'gestor.rede-b@lab-ia.gov.br')
  ) as t(network_slug, network_name, manager_email)
), upsert_networks as (
  insert into public.schools (
    name,
    slug,
    institution_type,
    parent_school_id
  )
  select
    dn.network_name,
    dn.network_slug,
    'education_department',
    null
  from desired_networks dn
  on conflict (slug) do update
  set
    name = excluded.name,
    institution_type = 'education_department',
    parent_school_id = null
  returning id, slug, name
)
select 1;

with network_map as (
  select s.id, s.slug, s.name
  from public.schools s
  where s.slug in ('seedf', 'seduc-go')
), school_map as (
  select s.id, s.slug, s.name
  from public.schools s
  where s.slug in ('cef01-brasilia', 'cepi-lyceu-goiania')
)
update public.schools s
set
  institution_type = 'school_unit',
  parent_school_id = case
    when s.slug = 'cef01-brasilia' then (select id from network_map where slug = 'seedf')
    when s.slug = 'cepi-lyceu-goiania' then (select id from network_map where slug = 'seduc-go')
    else s.parent_school_id
  end
where s.slug in ('cef01-brasilia', 'cepi-lyceu-goiania');

-- Garante um Gestor de Rede em cada rede-pai.
with target_members as (
  select *
  from (
    values
      ('seedf', 'Gestor de Rede DF', 'gestor.rede-a@lab-ia.gov.br'),
      ('seduc-go', 'Gestor de Rede GO', 'gestor.rede-b@lab-ia.gov.br')
  ) as t(network_slug, member_name, member_email)
), resolved_networks as (
  select
    tm.member_name,
    lower(trim(tm.member_email)) as member_email,
    s.id as school_id
  from target_members tm
  join public.schools s
    on s.slug = tm.network_slug
)
insert into public.school_members (
  school_id,
  name,
  email,
  role,
  member_scope,
  status,
  active
)
select
  rn.school_id,
  rn.member_name,
  rn.member_email,
  'network_manager',
  'department_staff',
  'active',
  true
from resolved_networks rn
on conflict (school_id, email) do update
set
  name = excluded.name,
  role = 'network_manager',
  member_scope = 'department_staff',
  status = 'active',
  active = true,
  updated_at = now();

-- Opcional: se existir um gestor antigo preso na mesma rede das duas escolas,
-- revise manualmente e mova/remova para evitar ambiguidade.
-- Exemplo de consulta de conferência:
-- select sm.email, sm.role, sm.member_scope, s.name as institution_name, s.slug, s.institution_type, s.parent_school_id
-- from public.school_members sm
-- join public.schools s on s.id = sm.school_id
-- where sm.role = 'network_manager'
-- order by s.slug, sm.email;

commit;
