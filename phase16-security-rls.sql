-- PHASE 16 strict RLS pass for Access Control domain

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'app_role')::text, 'public_viewer')
$$;

create or replace function public.current_scope_diocese()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'diocese_name')::text, '')
$$;

create or replace function public.current_scope_jimbo()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'jimbo_name')::text, '')
$$;

create or replace function public.current_scope_branch()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'branch_name')::text, '')
$$;

alter table public.chief_admin_profile enable row level security;
alter table public.super_admin_slots enable row level security;
alter table public.super_admin_registration_requests enable row level security;
alter table public.unit_access_slots enable row level security;
alter table public.data_submissions enable row level security;
alter table public.role_permissions_matrix enable row level security;
alter table public.workflow_notifications enable row level security;

drop policy if exists "chief_admin_self_view" on public.chief_admin_profile;
create policy "chief_admin_self_view" on public.chief_admin_profile
for select to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "chief_admin_write_only" on public.chief_admin_profile;
create policy "chief_admin_write_only" on public.chief_admin_profile
for all to authenticated
using (public.current_app_role() = 'chief_admin')
with check (public.current_app_role() = 'chief_admin');

drop policy if exists "super_slots_admin_view" on public.super_admin_slots;
create policy "super_slots_admin_view" on public.super_admin_slots
for select to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin'));

drop policy if exists "super_slots_chief_write" on public.super_admin_slots;
create policy "super_slots_chief_write" on public.super_admin_slots
for all to authenticated
using (public.current_app_role() = 'chief_admin')
with check (public.current_app_role() = 'chief_admin');

drop policy if exists "super_reg_requests_view" on public.super_admin_registration_requests;
create policy "super_reg_requests_view" on public.super_admin_registration_requests
for select to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "super_reg_requests_insert" on public.super_admin_registration_requests;
create policy "super_reg_requests_insert" on public.super_admin_registration_requests
for insert to authenticated
with check (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin'));

drop policy if exists "super_reg_requests_chief_update" on public.super_admin_registration_requests;
create policy "super_reg_requests_chief_update" on public.super_admin_registration_requests
for update to authenticated
using (public.current_app_role() = 'chief_admin')
with check (public.current_app_role() = 'chief_admin');

drop policy if exists "unit_access_slots_scope_select" on public.unit_access_slots;
create policy "unit_access_slots_scope_select" on public.unit_access_slots
for select to authenticated
using (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin')
  or (public.current_app_role() in ('diocese_admin', 'diocese_data_officer') and unit_name = public.current_scope_diocese())
  or (public.current_app_role() in ('jimbo_admin', 'jimbo_data_officer') and unit_name = public.current_scope_jimbo())
  or (public.current_app_role() in ('branch_admin', 'branch_data_officer') and unit_name = public.current_scope_branch())
);

drop policy if exists "unit_access_slots_scope_write" on public.unit_access_slots;
create policy "unit_access_slots_scope_write" on public.unit_access_slots
for all to authenticated
using (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin')
  or (public.current_app_role() in ('diocese_admin') and unit_name = public.current_scope_diocese())
  or (public.current_app_role() in ('jimbo_admin') and unit_name = public.current_scope_jimbo())
  or (public.current_app_role() in ('branch_admin') and unit_name = public.current_scope_branch())
)
with check (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin')
  or (public.current_app_role() in ('diocese_admin') and unit_name = public.current_scope_diocese())
  or (public.current_app_role() in ('jimbo_admin') and unit_name = public.current_scope_jimbo())
  or (public.current_app_role() in ('branch_admin') and unit_name = public.current_scope_branch())
);

drop policy if exists "submissions_scope_select" on public.data_submissions;
create policy "submissions_scope_select" on public.data_submissions
for select to authenticated
using (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'approver', 'reviewer')
  or (public.current_app_role() in ('diocese_admin', 'diocese_data_officer') and unit_name = public.current_scope_diocese())
  or (public.current_app_role() in ('jimbo_admin', 'jimbo_data_officer') and unit_name = public.current_scope_jimbo())
  or (public.current_app_role() in ('branch_admin', 'branch_data_officer') and unit_name = public.current_scope_branch())
);

drop policy if exists "submissions_scope_write" on public.data_submissions;
create policy "submissions_scope_write" on public.data_submissions
for all to authenticated
using (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'approver')
  or (public.current_app_role() in ('diocese_data_officer') and unit_name = public.current_scope_diocese())
  or (public.current_app_role() in ('jimbo_data_officer') and unit_name = public.current_scope_jimbo())
  or (public.current_app_role() in ('branch_data_officer') and unit_name = public.current_scope_branch())
)
with check (
  public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'approver')
  or (public.current_app_role() in ('diocese_data_officer') and unit_name = public.current_scope_diocese())
  or (public.current_app_role() in ('jimbo_data_officer') and unit_name = public.current_scope_jimbo())
  or (public.current_app_role() in ('branch_data_officer') and unit_name = public.current_scope_branch())
);

drop policy if exists "permissions_admin_only" on public.role_permissions_matrix;
create policy "permissions_admin_only" on public.role_permissions_matrix
for all to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'))
with check (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "workflow_notifications_admin_read" on public.workflow_notifications;
create policy "workflow_notifications_admin_read" on public.workflow_notifications
for select to authenticated
using (public.current_app_role() <> 'public_viewer');

drop policy if exists "workflow_notifications_admin_write" on public.workflow_notifications;
create policy "workflow_notifications_admin_write" on public.workflow_notifications
for all to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin'))
with check (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin'));
