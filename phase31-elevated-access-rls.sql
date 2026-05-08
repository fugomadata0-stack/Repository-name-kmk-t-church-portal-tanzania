-- PHASE 31 RLS: elevated access (uses public.current_app_role() from phase16-security-rls.sql)

alter table public.elevated_access_requests enable row level security;
alter table public.elevated_access_assignments enable row level security;
alter table public.elevated_access_routing enable row level security;

drop policy if exists "ear_select" on public.elevated_access_requests;
create policy "ear_select" on public.elevated_access_requests for select to authenticated using (
  owner_user_key = (select auth.uid()::text)
  or public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "ear_insert_own" on public.elevated_access_requests;
create policy "ear_insert_own" on public.elevated_access_requests for insert to authenticated with check (
  owner_user_key = (select auth.uid()::text)
);

drop policy if exists "ear_update_own_or_admin" on public.elevated_access_requests;
create policy "ear_update_own_or_admin" on public.elevated_access_requests for update to authenticated using (
  owner_user_key = (select auth.uid()::text)
  or public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'admin')
) with check (
  owner_user_key = (select auth.uid()::text)
  or public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'admin')
);

drop policy if exists "ear_assign_select" on public.elevated_access_assignments;
create policy "ear_assign_select" on public.elevated_access_assignments for select to authenticated using (
  owner_user_key = (select auth.uid()::text)
  or public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'admin')
);

drop policy if exists "ear_assign_write_admin" on public.elevated_access_assignments;
create policy "ear_assign_write_admin" on public.elevated_access_assignments for insert to authenticated with check (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'admin')
);

drop policy if exists "ear_assign_update" on public.elevated_access_assignments;
create policy "ear_assign_update" on public.elevated_access_assignments for update to authenticated using (
  owner_user_key = (select auth.uid()::text)
  or public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'admin')
) with check (
  owner_user_key = (select auth.uid()::text)
  or public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'admin')
);

drop policy if exists "ear_routing_read" on public.elevated_access_routing;
create policy "ear_routing_read" on public.elevated_access_routing for select to authenticated using (true);

drop policy if exists "ear_routing_write" on public.elevated_access_routing;
create policy "ear_routing_write" on public.elevated_access_routing for all to authenticated using (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin')
) with check (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin')
);
