-- Fix Phase33 signup RLS insert + structure read
-- Goal: allow public signup request insert safely, keep review/edit protected for admins.

alter table if exists public.phase33_signup_requests enable row level security;

-- Keep grants explicit.
revoke all on table public.phase33_signup_requests from public;
grant insert on table public.phase33_signup_requests to anon;
grant select, insert, update, delete on table public.phase33_signup_requests to authenticated;
grant all on table public.phase33_signup_requests to service_role;

-- Optional schema alignment for requested scope ids (safe additive changes).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'phase33_signup_requests'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'phase33_signup_requests' and column_name = 'requested_scope_level'
    ) then
      alter table public.phase33_signup_requests add column requested_scope_level text;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'phase33_signup_requests' and column_name = 'requested_scope_entity_id'
    ) then
      alter table public.phase33_signup_requests add column requested_scope_entity_id uuid;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'phase33_signup_requests' and column_name = 'dayosisi_id'
    ) then
      alter table public.phase33_signup_requests add column dayosisi_id uuid;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'phase33_signup_requests' and column_name = 'jimbo_id'
    ) then
      alter table public.phase33_signup_requests add column jimbo_id uuid;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'phase33_signup_requests' and column_name = 'tawi_id'
    ) then
      alter table public.phase33_signup_requests add column tawi_id uuid;
    end if;
  end if;
end
$$;

-- Public insert policy (anon/authenticated) for signup wizard.
drop policy if exists "p33_signup_insert_public" on public.phase33_signup_requests;
create policy "p33_signup_insert_public"
on public.phase33_signup_requests
for insert
to anon, authenticated
with check (
  nullif(trim(full_name), '') is not null
  and nullif(trim(email), '') is not null
  and nullif(trim(phone), '') is not null
  and nullif(trim(requested_role), '') is not null
  and nullif(trim(request_reason), '') is not null
  and (
    status is null
    or lower(trim(status)) in ('pending', 'pending approval')
  )
);

-- Review policies for admins only.
drop policy if exists "p33_signup_select_admin" on public.phase33_signup_requests;
create policy "p33_signup_select_admin"
on public.phase33_signup_requests
for select
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'admin', 'office_admin'));

drop policy if exists "p33_signup_update_admin" on public.phase33_signup_requests;
create policy "p33_signup_update_admin"
on public.phase33_signup_requests
for update
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'admin', 'office_admin'))
with check (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'admin', 'office_admin'));

drop policy if exists "p33_signup_delete_admin" on public.phase33_signup_requests;
create policy "p33_signup_delete_admin"
on public.phase33_signup_requests
for delete
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'admin', 'office_admin'));

-- Structure read for signup (active only) and no public writes.
alter table if exists public.dayosisi enable row level security;
drop policy if exists "dayosisi_select_signup_active" on public.dayosisi;
create policy "dayosisi_select_signup_active"
  on public.dayosisi for select to anon, authenticated
  using (coalesce(status, 'active') = 'active');
grant select on public.dayosisi to anon, authenticated;
revoke insert, update, delete on public.dayosisi from anon;

alter table if exists public.church_jimbo enable row level security;
drop policy if exists "church_jimbo_select_signup_active" on public.church_jimbo;
create policy "church_jimbo_select_signup_active"
  on public.church_jimbo for select to anon, authenticated
  using (coalesce(status, 'active') = 'active');
grant select on public.church_jimbo to anon, authenticated;
revoke insert, update, delete on public.church_jimbo from anon;

alter table if exists public.church_tawi enable row level security;
drop policy if exists "church_tawi_select_signup_active" on public.church_tawi;
create policy "church_tawi_select_signup_active"
  on public.church_tawi for select to anon, authenticated
  using (coalesce(status, 'active') = 'active');
grant select on public.church_tawi to anon, authenticated;
revoke insert, update, delete on public.church_tawi from anon;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_structure_entities'
  ) then
    execute 'alter table public.church_structure_entities enable row level security';
    execute 'drop policy if exists "church_structure_entities_select_signup_active" on public.church_structure_entities';
    execute 'create policy "church_structure_entities_select_signup_active"
      on public.church_structure_entities for select to anon, authenticated
      using (coalesce(status, ''active'') = ''active'')';
    execute 'grant select on public.church_structure_entities to anon, authenticated';
    execute 'revoke insert, update, delete on public.church_structure_entities from anon';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_dayosisi'
  ) then
    execute 'alter table public.church_dayosisi enable row level security';
    execute 'drop policy if exists "church_dayosisi_select_signup_active" on public.church_dayosisi';
    execute 'create policy "church_dayosisi_select_signup_active"
      on public.church_dayosisi for select to anon, authenticated
      using (coalesce(status, ''active'') = ''active'')';
    execute 'grant select on public.church_dayosisi to anon, authenticated';
    execute 'revoke insert, update, delete on public.church_dayosisi from anon';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'portal_domain_entities'
  ) then
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
    execute 'revoke insert, update, delete on public.portal_domain_entities from anon';
  end if;
end
$$;
