-- Migration: Renomear instituicoes sandbox para nomes reais
-- Secretaria Sandbox A -> Secretaria de Educacao do DF
-- Secretaria Sandbox B -> Secretaria de Educacao de Goias
-- Escola Sandbox A -> CEF 01 de Brasilia
-- Escola Sandbox B -> CEPI Lyceu de Goiania

begin;

-- Atualizar redes (education_department)
update public.schools
set name = 'Secretaria de Educacao do DF', slug = 'seedf'
where slug in ('rede-a', 'rede-a-sandbox');

update public.schools
set name = 'Secretaria de Educacao de Goias', slug = 'seduc-go'
where slug in ('rede-b', 'rede-b-sandbox');

-- Atualizar escolas (school_unit)
update public.schools
set name = 'CEF 01 de Brasilia', slug = 'cef01-brasilia'
where slug in ('escola-a', 'escola-a-sandbox');

update public.schools
set name = 'CEPI Lyceu de Goiania', slug = 'cepi-lyceu-goiania'
where slug in ('escola-b', 'escola-b-sandbox');

-- Atualizar nomes dos gestores de rede nos membros
update public.school_members
set name = 'Gestor de Rede DF'
where email = 'gestor.rede-a@lab-ia.gov.br';

update public.school_members
set name = 'Gestor de Rede GO'
where email = 'gestor.rede-b@lab-ia.gov.br';

commit;
