-- Adiciona hierarquia pai/filho em segments sem quebrar o sistema atual.
-- Execute no SQL Editor do Supabase.

begin;

alter table public.segments
add column if not exists parent_segment_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'segments_parent_segment_id_fkey'
      and conrelid = 'public.segments'::regclass
  ) then
    alter table public.segments
      add constraint segments_parent_segment_id_fkey
      foreign key (parent_segment_id)
      references public.segments (id)
      on delete set null;
  end if;
end;
$$;

create index if not exists idx_segments_school_parent
  on public.segments (school_id, parent_segment_id);

create index if not exists idx_segments_parent_only
  on public.segments (parent_segment_id);

-- Regra opcional de integridade: não permitir pai de outra escola.
-- Mantida como trigger para respeitar seu modelo atual (id global).
create or replace function public.validate_segment_parent_school()
returns trigger
language plpgsql
as $$
declare
  v_parent_school uuid;
begin
  if new.parent_segment_id is null then
    return new;
  end if;

  select school_id
    into v_parent_school
  from public.segments
  where id = new.parent_segment_id;

  if v_parent_school is null then
    raise exception 'parent_segment_id % não encontrado', new.parent_segment_id;
  end if;

  if v_parent_school <> new.school_id then
    raise exception 'parent_segment_id deve pertencer à mesma escola';
  end if;

  if new.parent_segment_id = new.id then
    raise exception 'segmento não pode ser pai de si mesmo';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_segment_parent_school on public.segments;
create trigger trg_validate_segment_parent_school
before insert or update of parent_segment_id, school_id
on public.segments
for each row
execute function public.validate_segment_parent_school();

-- ------------------------------------------------------------
-- EXEMPLO DE BACKFILL (escola 492c0f32-e7f6-4e78-ad90-d68673c4d412)
-- Ajuste os IDs conforme seu ambiente.
-- ------------------------------------------------------------

-- Fundamental I (pai): 05ceece3-28f2-4318-b2fa-27fe6237299d
-- Fundamental II (pai): d83237f0-c7ef-470b-96d3-b488d0889676

-- Filhos do FUND1: 1º,2º,3º,4º Ano
update public.segments
set parent_segment_id = '05ceece3-28f2-4318-b2fa-27fe6237299d'
where school_id = '492c0f32-e7f6-4e78-ad90-d68673c4d412'
  and id in (
    '1315f833-df48-400c-9d72-672f3f085569', -- 1º Ano
    'a084218a-7ae4-465d-91fb-8a73e30d9cf3', -- 2º Ano
    'a4a27399-e51f-4d7b-9aeb-dd0b55baf69d', -- 3º Ano
    'a478c03e-c911-4d48-a7e6-7319ef06d0dd'  -- 4º Ano
  );

-- Filhos do FUND2: 5º,6º,7º,8º,9º Ano
update public.segments
set parent_segment_id = 'd83237f0-c7ef-470b-96d3-b488d0889676'
where school_id = '492c0f32-e7f6-4e78-ad90-d68673c4d412'
  and id in (
    '6cf329bc-d988-41a4-a13b-7ce1f687abef', -- 5º Ano
    '47c2def4-8a95-45ba-97f3-2c430c73a012', -- 6º Ano
    'caa9f381-7206-420a-96dd-dff8e49db8c7', -- 7º Ano
    '89302a86-11b2-4f48-a073-e9f1641f90b2', -- 8º Ano
    'f7312a71-e483-4c7a-b912-8133fba38ab4'  -- 9º Ano
  );

-- Segmentos pai ficam com parent_segment_id = null.
update public.segments
set parent_segment_id = null
where school_id = '492c0f32-e7f6-4e78-ad90-d68673c4d412'
  and id in (
    '05ceece3-28f2-4318-b2fa-27fe6237299d', -- Fundamental I
    'd83237f0-c7ef-470b-96d3-b488d0889676'  -- Fundamental II
  );

commit;

