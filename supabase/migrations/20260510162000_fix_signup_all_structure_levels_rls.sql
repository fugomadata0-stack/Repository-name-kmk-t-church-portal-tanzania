-- FIX DEFECT #1 FULL: Omba Akaunti all structure levels RLS + submit support
-- Public/signup users read active structure options only. No public writes.

-- Ensure `status` exists on structure sources used by signup lookups.
do $$
begin
  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'dayosisi'
  ) and not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dayosisi' and column_name = 'status'
  ) then
    alter table public.dayosisi add column status text default 'active';
  end if;

  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_dayosisi'
  ) and not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'church_dayosisi' and column_name = 'status'
  ) then
    alter table public.church_dayosisi add column status text default 'active';
  end if;

  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_jimbo'
  ) and not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'church_jimbo' and column_name = 'status'
  ) then
    alter table public.church_jimbo add column status text default 'active';
  end if;

  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_tawi'
  ) and not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'church_tawi' and column_name = 'status'
  ) then
    alter table public.church_tawi add column status text default 'active';
  end if;

  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_structure_entities'
  ) and not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'church_structure_entities' and column_name = 'status'
  ) then
    alter table public.church_structure_entities add column status text default 'active';
  end if;

  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'portal_domain_entities'
  ) and not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'portal_domain_entities' and column_name = 'status'
  ) then
    alter table public.portal_domain_entities add column status text default 'active';
  end if;
end
$$;

-- No anonymous writes on structure tables.
revoke insert, update, delete on public.dayosisi from anon;
revoke insert, update, delete on public.church_jimbo from anon;
revoke insert, update, delete on public.church_tawi from anon;
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_dayosisi') then
    execute 'revoke insert, update, delete on public.church_dayosisi from anon';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_structure_entities') then
    execute 'revoke insert, update, delete on public.church_structure_entities from anon';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'portal_domain_entities') then
    execute 'revoke insert, update, delete on public.portal_domain_entities from anon';
  end if;
end
$$;

-- dayosisi/church_dayosisi (public signup read: active only)
alter table if exists public.dayosisi enable row level security;
drop policy if exists "dayosisi_select_signup_active" on public.dayosisi;
create policy "dayosisi_select_signup_active"
  on public.dayosisi for select to anon, authenticated
  using (coalesce(status, 'active') = 'active');
grant select on public.dayosisi to anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_dayosisi') then
    execute 'alter table public.church_dayosisi enable row level security';
    execute 'drop policy if exists "church_dayosisi_select_signup_active" on public.church_dayosisi';
    execute 'create policy "church_dayosisi_select_signup_active"
      on public.church_dayosisi for select to anon, authenticated
      using (coalesce(status, ''active'') = ''active'')';
    execute 'grant select on public.church_dayosisi to anon, authenticated';
  end if;
end
$$;

alter table if exists public.church_jimbo enable row level security;
drop policy if exists "church_jimbo_select_signup_active" on public.church_jimbo;
create policy "church_jimbo_select_signup_active"
  on public.church_jimbo for select to anon, authenticated
  using (coalesce(status, 'active') = 'active');
grant select on public.church_jimbo to anon, authenticated;

alter table if exists public.church_tawi enable row level security;
drop policy if exists "church_tawi_select_signup_active" on public.church_tawi;
create policy "church_tawi_select_signup_active"
  on public.church_tawi for select to anon, authenticated
  using (coalesce(status, 'active') = 'active');
grant select on public.church_tawi to anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_structure_entities') then
    execute 'alter table public.church_structure_entities enable row level security';
    execute 'drop policy if exists "church_structure_entities_select_signup_active" on public.church_structure_entities';
    execute 'create policy "church_structure_entities_select_signup_active"
      on public.church_structure_entities for select to anon, authenticated
      using (coalesce(status, ''active'') = ''active'')';
    execute 'grant select on public.church_structure_entities to anon, authenticated';
  end if;
end
$$;

-- Idara / Huduma / Taasisi / Jumuiya options in signup source table.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'portal_domain_entities') then
    execute 'alter table public.portal_domain_entities enable row level security';
    execute 'drop policy if exists "portal_domain_entities_select_signup_structure_active" on public.portal_domain_entities';
    execute 'create policy "portal_domain_entities_select_signup_structure_active"
      on public.portal_domain_entities for select to anon, authenticated
      using (
        coalesce(status, ''active'') = ''active''
        and (
          module_key in (''jumuiya'', ''taasisi'', ''muundo'')
          or submodule_key in (''Idara'', ''Huduma'', ''Taasisi'', ''Jumuiya'')
        )
      )';
    execute 'grant select on public.portal_domain_entities to anon, authenticated';
  end if;
end
$$;
