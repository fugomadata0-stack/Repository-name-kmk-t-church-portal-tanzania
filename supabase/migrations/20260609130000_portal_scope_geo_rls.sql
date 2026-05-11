-- Geo scope for mutations: VIEW stays broad (RBAC matrix); INSERT/UPDATE/DELETE respect portal_directory_profiles scopes.
-- Safe additive columns on members/families for jimbo/tawi FKs when missing.

alter table if exists public.church_members
  add column if not exists jimbo_id uuid references public.church_jimbo (id) on delete set null;
alter table if exists public.church_members
  add column if not exists tawi_id uuid references public.church_tawi (id) on delete set null;

alter table if exists public.church_families
  add column if not exists jimbo_id uuid references public.church_jimbo (id) on delete set null;
alter table if exists public.church_families
  add column if not exists tawi_id uuid references public.church_tawi (id) on delete set null;

create index if not exists church_members_jimbo_idx on public.church_members (jimbo_id);
create index if not exists church_members_tawi_idx on public.church_members (tawi_id);
create index if not exists church_families_jimbo_idx on public.church_families (jimbo_id);
create index if not exists church_families_tawi_idx on public.church_families (tawi_id);

-- ——— Scope helper (SECURITY DEFINER — reads portal_directory_profiles by auth.uid()) ———

create or replace function public.portal_scope_geo_write_allowed(
  p_dayosisi uuid,
  p_jimbo uuid,
  p_tawi uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r text;
  d_scope uuid;
  j_scope uuid;
  t_scope uuid;
begin
  select p.role_key,
         nullif(trim(p.dayosisi_scope), '')::uuid,
         nullif(trim(p.jimbo_scope), '')::uuid,
         nullif(trim(p.tawi_scope), '')::uuid
    into r, d_scope, j_scope, t_scope
  from public.portal_directory_profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  if r is null then
    return false;
  end if;

  if r in ('super_admin', 'chief_admin') then
    return true;
  end if;

  if r in ('viewer', 'reviewer', 'member_user') then
    return false;
  end if;

  if r in ('national_admin', 'office_admin', 'secretary')
     and d_scope is null and j_scope is null and t_scope is null then
    return true;
  end if;

  if r = 'tawi_admin' then
    if t_scope is null then return false; end if;
    return p_tawi is not null and p_tawi = t_scope;
  end if;

  if r = 'jimbo_admin' then
    if j_scope is null then return false; end if;
    if p_jimbo is not null and p_jimbo = j_scope then return true; end if;
    if p_tawi is not null then
      return exists (
        select 1 from public.church_tawi t
        where t.id = p_tawi and t.jimbo_id = j_scope
      );
    end if;
    return false;
  end if;

  if r = 'dayosisi_admin' then
    if d_scope is null then return false; end if;
    if p_dayosisi is not null and p_dayosisi = d_scope then return true; end if;
    if p_jimbo is not null then
      return exists (
        select 1 from public.church_jimbo j
        where j.id = p_jimbo and j.dayosisi_id = d_scope
      );
    end if;
    if p_tawi is not null then
      return exists (
        select 1 from public.church_tawi t
        join public.church_jimbo j on j.id = t.jimbo_id
        where t.id = p_tawi and j.dayosisi_id = d_scope
      );
    end if;
    return false;
  end if;

  if r = 'national_admin' then
    if d_scope is null and j_scope is null and t_scope is null then return true; end if;
    if t_scope is not null then
      if p_tawi is null then return false; end if;
      return p_tawi = t_scope;
    end if;
    if j_scope is not null then
      if p_jimbo is not null and p_jimbo = j_scope then return true; end if;
      if p_tawi is not null then
        return exists (select 1 from public.church_tawi t where t.id = p_tawi and t.jimbo_id = j_scope);
      end if;
      return false;
    end if;
    if d_scope is not null then
      if p_dayosisi is not null and p_dayosisi = d_scope then return true; end if;
      if p_jimbo is not null then
        return exists (select 1 from public.church_jimbo j where j.id = p_jimbo and j.dayosisi_id = d_scope);
      end if;
      if p_tawi is not null then
        return exists (
          select 1 from public.church_tawi t
          join public.church_jimbo j on j.id = t.jimbo_id
          where t.id = p_tawi and j.dayosisi_id = d_scope
        );
      end if;
    end if;
    return false;
  end if;

  if r in ('finance_admin', 'editor', 'approver') then
    if d_scope is null and j_scope is null and t_scope is null then
      return true;
    end if;
    if t_scope is not null then
      if p_tawi is null then return false; end if;
      return p_tawi = t_scope;
    end if;
    if j_scope is not null then
      if p_jimbo is not null and p_jimbo = j_scope then return true; end if;
      if p_tawi is not null then
        return exists (select 1 from public.church_tawi t where t.id = p_tawi and t.jimbo_id = j_scope);
      end if;
      if d_scope is not null and p_dayosisi is not null and p_dayosisi = d_scope then return true; end if;
      return false;
    end if;
    if d_scope is not null then
      if p_dayosisi is not null and p_dayosisi = d_scope then return true; end if;
      if p_jimbo is not null then
        return exists (select 1 from public.church_jimbo j where j.id = p_jimbo and j.dayosisi_id = d_scope);
      end if;
      if p_tawi is not null then
        return exists (
          select 1 from public.church_tawi t
          join public.church_jimbo j on j.id = t.jimbo_id
          where t.id = p_tawi and j.dayosisi_id = d_scope
        );
      end if;
    end if;
    return false;
  end if;

  if d_scope is null and j_scope is null and t_scope is null then
    return true;
  end if;

  return false;
end;
$$;

comment on function public.portal_scope_geo_write_allowed(uuid, uuid, uuid) is
  'True when auth.uid() may mutate a row tied to (dayosisi_id, jimbo_id, tawi_id) per portal_directory_profiles scopes.';

revoke all on function public.portal_scope_geo_write_allowed(uuid, uuid, uuid) from public;
grant execute on function public.portal_scope_geo_write_allowed(uuid, uuid, uuid) to authenticated;

-- Dayosisi row: geographic ids are (id, NULL, NULL)
create or replace function public.portal_scope_dayosisi_row_ok(p_dayosisi_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.portal_scope_geo_write_allowed(p_dayosisi_row_id, null, null);
$$;

revoke all on function public.portal_scope_dayosisi_row_ok(uuid) from public;
grant execute on function public.portal_scope_dayosisi_row_ok(uuid) to authenticated;

-- ——— Replace INSERT/UPDATE/DELETE policies (keep SELECT as RBAC-only) ———

-- church_families
drop policy if exists "church_families_insert_auth_rbac" on public.church_families;
drop policy if exists "church_families_update_auth_rbac" on public.church_families;
drop policy if exists "church_families_delete_auth_rbac" on public.church_families;

create policy "church_families_insert_auth_rbac"
  on public.church_families for insert to authenticated
  with check (
    public.portal_has_module_capability('waumini', 'create')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

create policy "church_families_update_auth_rbac"
  on public.church_families for update to authenticated
  using (
    public.portal_has_module_capability('waumini', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  )
  with check (
    public.portal_has_module_capability('waumini', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

create policy "church_families_delete_auth_rbac"
  on public.church_families for delete to authenticated
  using (
    public.portal_has_module_capability('waumini', 'delete')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

-- church_members
drop policy if exists "church_members_insert_auth_rbac" on public.church_members;
drop policy if exists "church_members_update_auth_rbac" on public.church_members;
drop policy if exists "church_members_delete_auth_rbac" on public.church_members;

create policy "church_members_insert_auth_rbac"
  on public.church_members for insert to authenticated
  with check (
    public.portal_has_module_capability('waumini', 'create')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

create policy "church_members_update_auth_rbac"
  on public.church_members for update to authenticated
  using (
    public.portal_has_module_capability('waumini', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  )
  with check (
    public.portal_has_module_capability('waumini', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

create policy "church_members_delete_auth_rbac"
  on public.church_members for delete to authenticated
  using (
    public.portal_has_module_capability('waumini', 'delete')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

-- church_jimbo
drop policy if exists "church_jimbo_insert_auth_rbac" on public.church_jimbo;
drop policy if exists "church_jimbo_update_auth_rbac" on public.church_jimbo;
drop policy if exists "church_jimbo_delete_auth_rbac" on public.church_jimbo;

create policy "church_jimbo_insert_auth_rbac"
  on public.church_jimbo for insert to authenticated
  with check (
    public.portal_has_module_capability('muundo', 'create')
    and public.portal_scope_geo_write_allowed(dayosisi_id, null, null)
  );

create policy "church_jimbo_update_auth_rbac"
  on public.church_jimbo for update to authenticated
  using (
    public.portal_has_module_capability('muundo', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, id, null)
  )
  with check (
    public.portal_has_module_capability('muundo', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, id, null)
  );

create policy "church_jimbo_delete_auth_rbac"
  on public.church_jimbo for delete to authenticated
  using (
    public.portal_has_module_capability('muundo', 'delete')
    and public.portal_scope_geo_write_allowed(dayosisi_id, id, null)
  );

-- church_tawi
drop policy if exists "church_tawi_insert_auth_rbac" on public.church_tawi;
drop policy if exists "church_tawi_update_auth_rbac" on public.church_tawi;
drop policy if exists "church_tawi_delete_auth_rbac" on public.church_tawi;

create policy "church_tawi_insert_auth_rbac"
  on public.church_tawi for insert to authenticated
  with check (
    public.portal_has_module_capability('muundo', 'create')
    and public.portal_scope_geo_write_allowed(null, jimbo_id, null)
  );

create policy "church_tawi_update_auth_rbac"
  on public.church_tawi for update to authenticated
  using (
    public.portal_has_module_capability('muundo', 'edit')
    and public.portal_scope_geo_write_allowed(null, jimbo_id, id)
  )
  with check (
    public.portal_has_module_capability('muundo', 'edit')
    and public.portal_scope_geo_write_allowed(null, jimbo_id, id)
  );

create policy "church_tawi_delete_auth_rbac"
  on public.church_tawi for delete to authenticated
  using (
    public.portal_has_module_capability('muundo', 'delete')
    and public.portal_scope_geo_write_allowed(null, jimbo_id, id)
  );

-- public.dayosisi (muundo — jedwali la ngazi kuu)
alter table if exists public.dayosisi enable row level security;

drop policy if exists "authenticated read dayosisi portal" on public.dayosisi;
drop policy if exists "authenticated insert dayosisi portal" on public.dayosisi;
drop policy if exists "authenticated update dayosisi portal" on public.dayosisi;
drop policy if exists "authenticated delete dayosisi portal" on public.dayosisi;

drop policy if exists "dayosisi_select_auth_rbac" on public.dayosisi;
drop policy if exists "dayosisi_insert_auth_scope" on public.dayosisi;
drop policy if exists "dayosisi_update_auth_scope" on public.dayosisi;
drop policy if exists "dayosisi_delete_auth_scope" on public.dayosisi;

create policy "dayosisi_select_auth_rbac"
  on public.dayosisi for select to authenticated
  using (public.portal_has_module_capability('muundo', 'view'));

create policy "dayosisi_insert_auth_scope"
  on public.dayosisi for insert to authenticated
  with check (
    public.portal_has_module_capability('muundo', 'create')
    and public.portal_scope_dayosisi_row_ok(id)
  );

create policy "dayosisi_update_auth_scope"
  on public.dayosisi for update to authenticated
  using (
    public.portal_has_module_capability('muundo', 'edit')
    and public.portal_scope_dayosisi_row_ok(id)
  )
  with check (
    public.portal_has_module_capability('muundo', 'edit')
    and public.portal_scope_dayosisi_row_ok(id)
  );

create policy "dayosisi_delete_auth_scope"
  on public.dayosisi for delete to authenticated
  using (
    public.portal_has_module_capability('muundo', 'delete')
    and public.portal_scope_dayosisi_row_ok(id)
  );

-- church_finance_entries
drop policy if exists "church_finance_entries_insert_auth_rbac" on public.church_finance_entries;
drop policy if exists "church_finance_entries_update_auth_rbac" on public.church_finance_entries;
drop policy if exists "church_finance_entries_delete_auth_rbac" on public.church_finance_entries;

create policy "church_finance_entries_insert_auth_rbac"
  on public.church_finance_entries for insert to authenticated
  with check (
    public.portal_has_module_capability('fedha', 'create')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

create policy "church_finance_entries_update_auth_rbac"
  on public.church_finance_entries for update to authenticated
  using (
    public.portal_has_module_capability('fedha', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  )
  with check (
    public.portal_has_module_capability('fedha', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

create policy "church_finance_entries_delete_auth_rbac"
  on public.church_finance_entries for delete to authenticated
  using (
    public.portal_has_module_capability('fedha', 'delete')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

-- church_viongozi (badala ya policy moja kwa authenticated yote)
drop policy if exists "church_viongozi_auth_all" on public.church_viongozi;
drop policy if exists "church_viongozi_insert_auth_rbac" on public.church_viongozi;
drop policy if exists "church_viongozi_update_auth_rbac" on public.church_viongozi;
drop policy if exists "church_viongozi_delete_auth_rbac" on public.church_viongozi;
drop policy if exists "church_viongozi_select_auth_rbac" on public.church_viongozi;

create policy "church_viongozi_select_auth_rbac"
  on public.church_viongozi for select to authenticated
  using (public.portal_has_module_capability('viongozi', 'view'));

create policy "church_viongozi_insert_auth_rbac"
  on public.church_viongozi for insert to authenticated
  with check (
    public.portal_has_module_capability('viongozi', 'create')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

create policy "church_viongozi_update_auth_rbac"
  on public.church_viongozi for update to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  )
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );

create policy "church_viongozi_delete_auth_rbac"
  on public.church_viongozi for delete to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'delete')
    and public.portal_scope_geo_write_allowed(dayosisi_id, jimbo_id, tawi_id)
  );
