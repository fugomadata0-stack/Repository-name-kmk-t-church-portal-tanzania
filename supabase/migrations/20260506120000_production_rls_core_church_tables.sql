-- Production RLS: core church + domain tables (authenticated + RBAC only).
--
-- Prerequisites (so the portal keeps working after this migration):
-- 1) Frontend must sign in with Supabase Auth (JWT) — same PostgREST queries, role is no longer "anon".
-- 2) Each operator needs a row in public.portal_directory_profiles with:
--      auth_user_id = auth.uid(), status = 'active', and role_key matching portal_roles.
-- 3) portal_module_matrix already defines can_view / can_create / can_edit / can_delete per module.
--
-- "Owner" semantics: tables have no per-row owner column; UPDATE is allowed when the user's role
-- has can_edit on the relevant module (same as authorized staff). Future created_by columns can
-- narrow USING/WITH CHECK without changing policy names.

-- ——— Helper: RBAC check via directory profile + module matrix (SECURITY DEFINER bypasses RLS on reads) ———

create or replace function public.portal_has_module_capability(p_module_key text, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_directory_profiles p
    join public.portal_module_matrix m on m.role_key = p.role_key
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and m.module_key = p_module_key
      and (
        (p_capability = 'view' and m.can_view)
        or (p_capability = 'create' and m.can_create)
        or (p_capability = 'edit' and m.can_edit)
        or (p_capability = 'delete' and m.can_delete)
      )
  );
$$;

comment on function public.portal_has_module_capability(text, text) is
  'True when auth.uid() is an active portal_directory_profiles user with the given capability on portal_module_matrix.';

revoke all on function public.portal_has_module_capability(text, text) from public;
grant execute on function public.portal_has_module_capability(text, text) to authenticated;

-- ——— church_families (module: waumini) ———

alter table public.church_families enable row level security;

drop policy if exists "church_families_anon_all" on public.church_families;
drop policy if exists "church_families_auth_all" on public.church_families;

create policy "church_families_select_auth_rbac"
  on public.church_families for select to authenticated
  using (public.portal_has_module_capability('waumini', 'view'));

create policy "church_families_insert_auth_rbac"
  on public.church_families for insert to authenticated
  with check (public.portal_has_module_capability('waumini', 'create'));

create policy "church_families_update_auth_rbac"
  on public.church_families for update to authenticated
  using (public.portal_has_module_capability('waumini', 'edit'))
  with check (public.portal_has_module_capability('waumini', 'edit'));

create policy "church_families_delete_auth_rbac"
  on public.church_families for delete to authenticated
  using (public.portal_has_module_capability('waumini', 'delete'));

revoke all on table public.church_families from anon;
grant select, insert, update, delete on table public.church_families to authenticated;

-- ——— church_members (module: waumini) ———

alter table public.church_members enable row level security;

drop policy if exists "church_members_anon_all" on public.church_members;
drop policy if exists "church_members_auth_all" on public.church_members;

create policy "church_members_select_auth_rbac"
  on public.church_members for select to authenticated
  using (public.portal_has_module_capability('waumini', 'view'));

create policy "church_members_insert_auth_rbac"
  on public.church_members for insert to authenticated
  with check (public.portal_has_module_capability('waumini', 'create'));

create policy "church_members_update_auth_rbac"
  on public.church_members for update to authenticated
  using (public.portal_has_module_capability('waumini', 'edit'))
  with check (public.portal_has_module_capability('waumini', 'edit'));

create policy "church_members_delete_auth_rbac"
  on public.church_members for delete to authenticated
  using (public.portal_has_module_capability('waumini', 'delete'));

revoke all on table public.church_members from anon;
grant select, insert, update, delete on table public.church_members to authenticated;

-- ——— church_jimbo (module: muundo) ———

alter table public.church_jimbo enable row level security;

drop policy if exists "church_jimbo_anon_all" on public.church_jimbo;
drop policy if exists "church_jimbo_auth_all" on public.church_jimbo;

create policy "church_jimbo_select_auth_rbac"
  on public.church_jimbo for select to authenticated
  using (public.portal_has_module_capability('muundo', 'view'));

create policy "church_jimbo_insert_auth_rbac"
  on public.church_jimbo for insert to authenticated
  with check (public.portal_has_module_capability('muundo', 'create'));

create policy "church_jimbo_update_auth_rbac"
  on public.church_jimbo for update to authenticated
  using (public.portal_has_module_capability('muundo', 'edit'))
  with check (public.portal_has_module_capability('muundo', 'edit'));

create policy "church_jimbo_delete_auth_rbac"
  on public.church_jimbo for delete to authenticated
  using (public.portal_has_module_capability('muundo', 'delete'));

revoke all on table public.church_jimbo from anon;
grant select, insert, update, delete on table public.church_jimbo to authenticated;

-- ——— church_tawi (module: muundo) ———

alter table public.church_tawi enable row level security;

drop policy if exists "church_tawi_anon_all" on public.church_tawi;
drop policy if exists "church_tawi_auth_all" on public.church_tawi;

create policy "church_tawi_select_auth_rbac"
  on public.church_tawi for select to authenticated
  using (public.portal_has_module_capability('muundo', 'view'));

create policy "church_tawi_insert_auth_rbac"
  on public.church_tawi for insert to authenticated
  with check (public.portal_has_module_capability('muundo', 'create'));

create policy "church_tawi_update_auth_rbac"
  on public.church_tawi for update to authenticated
  using (public.portal_has_module_capability('muundo', 'edit'))
  with check (public.portal_has_module_capability('muundo', 'edit'));

create policy "church_tawi_delete_auth_rbac"
  on public.church_tawi for delete to authenticated
  using (public.portal_has_module_capability('muundo', 'delete'));

revoke all on table public.church_tawi from anon;
grant select, insert, update, delete on table public.church_tawi to authenticated;

-- ——— church_finance_entries (module: fedha) ———

alter table public.church_finance_entries enable row level security;

drop policy if exists "church_finance_entries_anon_all" on public.church_finance_entries;
drop policy if exists "church_finance_entries_auth_all" on public.church_finance_entries;

create policy "church_finance_entries_select_auth_rbac"
  on public.church_finance_entries for select to authenticated
  using (public.portal_has_module_capability('fedha', 'view'));

create policy "church_finance_entries_insert_auth_rbac"
  on public.church_finance_entries for insert to authenticated
  with check (public.portal_has_module_capability('fedha', 'create'));

create policy "church_finance_entries_update_auth_rbac"
  on public.church_finance_entries for update to authenticated
  using (public.portal_has_module_capability('fedha', 'edit'))
  with check (public.portal_has_module_capability('fedha', 'edit'));

create policy "church_finance_entries_delete_auth_rbac"
  on public.church_finance_entries for delete to authenticated
  using (public.portal_has_module_capability('fedha', 'delete'));

revoke all on table public.church_finance_entries from anon;
grant select, insert, update, delete on table public.church_finance_entries to authenticated;

-- ——— church_income_sources (module: vyanzo_mapato) ———

alter table public.church_income_sources enable row level security;

drop policy if exists "church_income_sources_anon_all" on public.church_income_sources;
drop policy if exists "church_income_sources_auth_all" on public.church_income_sources;

create policy "church_income_sources_select_auth_rbac"
  on public.church_income_sources for select to authenticated
  using (public.portal_has_module_capability('vyanzo_mapato', 'view'));

create policy "church_income_sources_insert_auth_rbac"
  on public.church_income_sources for insert to authenticated
  with check (public.portal_has_module_capability('vyanzo_mapato', 'create'));

create policy "church_income_sources_update_auth_rbac"
  on public.church_income_sources for update to authenticated
  using (public.portal_has_module_capability('vyanzo_mapato', 'edit'))
  with check (public.portal_has_module_capability('vyanzo_mapato', 'edit'));

create policy "church_income_sources_delete_auth_rbac"
  on public.church_income_sources for delete to authenticated
  using (public.portal_has_module_capability('vyanzo_mapato', 'delete'));

revoke all on table public.church_income_sources from anon;
grant select, insert, update, delete on table public.church_income_sources to authenticated;

-- ——— church_income_lines (module: mapato_income) ———

alter table public.church_income_lines enable row level security;

drop policy if exists "church_income_lines_anon_all" on public.church_income_lines;
drop policy if exists "church_income_lines_auth_all" on public.church_income_lines;

create policy "church_income_lines_select_auth_rbac"
  on public.church_income_lines for select to authenticated
  using (public.portal_has_module_capability('mapato_income', 'view'));

create policy "church_income_lines_insert_auth_rbac"
  on public.church_income_lines for insert to authenticated
  with check (public.portal_has_module_capability('mapato_income', 'create'));

create policy "church_income_lines_update_auth_rbac"
  on public.church_income_lines for update to authenticated
  using (public.portal_has_module_capability('mapato_income', 'edit'))
  with check (public.portal_has_module_capability('mapato_income', 'edit'));

create policy "church_income_lines_delete_auth_rbac"
  on public.church_income_lines for delete to authenticated
  using (public.portal_has_module_capability('mapato_income', 'delete'));

revoke all on table public.church_income_lines from anon;
grant select, insert, update, delete on table public.church_income_lines to authenticated;

-- ——— portal_domain_entities (module_key column drives RBAC) ———

alter table public.portal_domain_entities enable row level security;

drop policy if exists "portal_domain_entities_anon_all" on public.portal_domain_entities;
drop policy if exists "portal_domain_entities_auth_all" on public.portal_domain_entities;

create policy "portal_domain_entities_select_auth_rbac"
  on public.portal_domain_entities for select to authenticated
  using (public.portal_has_module_capability(module_key, 'view'));

create policy "portal_domain_entities_insert_auth_rbac"
  on public.portal_domain_entities for insert to authenticated
  with check (public.portal_has_module_capability(module_key, 'create'));

create policy "portal_domain_entities_update_auth_rbac"
  on public.portal_domain_entities for update to authenticated
  using (public.portal_has_module_capability(module_key, 'edit'))
  with check (public.portal_has_module_capability(module_key, 'edit'));

create policy "portal_domain_entities_delete_auth_rbac"
  on public.portal_domain_entities for delete to authenticated
  using (public.portal_has_module_capability(module_key, 'delete'));

revoke all on table public.portal_domain_entities from anon;
grant select, insert, update, delete on table public.portal_domain_entities to authenticated;
