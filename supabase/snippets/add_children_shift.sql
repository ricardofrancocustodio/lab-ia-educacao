begin;

alter table public.children
add column if not exists shift text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'children_shift_check'
      and conrelid = 'public.children'::regclass
  ) then
    alter table public.children
    add constraint children_shift_check
    check (shift is null or shift in ('MANHA', 'TARDE', 'INTEGRAL'));
  end if;
end;
$$;

create index if not exists idx_children_shift
  on public.children (school_id, shift);

commit;
