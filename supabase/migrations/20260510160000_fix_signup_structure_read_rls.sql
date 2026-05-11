-- Fix Defect #1: signup submit/read blocked by RLS on structure tables.
-- Safe public read for signup dropdown sources (active rows only), no anon writes.

-- 1) Ensure `status` exists where signup structure reads depend on it.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'dayosisi'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'dayosisi' and column_name = 'status'
  ) then
    alter table public.dayosisi add column status text not null default 'active';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_jimbo'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'church_jimbo' and column_name = 'status'
  ) then
    alter table public.church_jimbo add column status text not null default 'active';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_tawi'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'church_tawi' and column_name = 'status'
  ) then
    alter table public.church_tawi add column status text not null default 'active';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_structure_entities'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'church_structure_entities' and column_name = 'status'
  ) then
    alter table public.church_structure_entities add column status text not null default 'active';
  end if;
end
$$;

update public.dayosisi set status = 'active' where status is null;
update public.church_jimbo set status = 'active' where status is null;
update public.church_tawi set status = 'active' where status is null;
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_structure_entities'
  ) then
    execute 'update public.church_structure_entities set status = ''active'' where status is null';
  end if;
end
$$;

-- 2) Explicitly keep anon as read-only on structure tables.
revoke insert, update, delete on public.dayosisi from anon;
revoke insert, update, delete on public.church_jimbo from anon;
revoke insert, update, delete on public.church_tawi from anon;
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_structure_entities'
  ) then
    execute 'revoke insert, update, delete on public.church_structure_entities from anon';
  end if;
end
$$;

-- 3) RLS: signup/public can only read active structure records.
alter table if exists public.dayosisi enable row level security;
drop policy if exists "dayosisi_select_anon_signup_active" on public.dayosisi;
create policy "dayosisi_select_anon_signup_active"
  on public.dayosisi
  for select
  to anon
  using (status = 'active');
grant select on public.dayosisi to anon;

alter table if exists public.church_jimbo enable row level security;
drop policy if exists "church_jimbo_select_anon_signup_active" on public.church_jimbo;
create policy "church_jimbo_select_anon_signup_active"
  on public.church_jimbo
  for select
  to anon
  using (status = 'active');
grant select on public.church_jimbo to anon;

alter table if exists public.church_tawi enable row level security;
drop policy if exists "church_tawi_select_anon_signup_active" on public.church_tawi;
create policy "church_tawi_select_anon_signup_active"
  on public.church_tawi
  for select
  to anon
  using (status = 'active');
grant select on public.church_tawi to anon;

-- Optional structure source used in some deployments.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_structure_entities'
  ) then
    execute 'alter table public.church_structure_entities enable row level security';
    execute 'drop policy if exists "church_structure_entities_select_anon_signup_active" on public.church_structure_entities';
    execute 'create policy "church_structure_entities_select_anon_signup_active"
      on public.church_structure_entities
      for select
      to anon
      using (status = ''active'')';
    execute 'grant select on public.church_structure_entities to anon';
  end if;
end
$$;
