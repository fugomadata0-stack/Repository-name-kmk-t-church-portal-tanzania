-- PHASE 20 Security RLS (production-ready enforcement)

create or replace function public.current_app_role()
returns text language sql stable as $$
  select coalesce((auth.jwt() ->> 'app_role')::text, 'public_viewer')
$$;

create or replace function public.current_scope_diocese()
returns text language sql stable as $$
  select coalesce((auth.jwt() ->> 'diocese_name')::text, '')
$$;

create or replace function public.current_scope_jimbo()
returns text language sql stable as $$
  select coalesce((auth.jwt() ->> 'jimbo_name')::text, '')
$$;

create or replace function public.current_scope_branch()
returns text language sql stable as $$
  select coalesce((auth.jwt() ->> 'branch_name')::text, '')
$$;

create or replace function public.can_see_confidential(required_role text)
returns boolean language sql stable as $$
  select case
    when public.current_app_role() in ('chief_admin','super_admin') then true
    when required_role = 'diocese_admin' and public.current_app_role() in ('diocese_admin','national_admin','office_admin') then true
    else false
  end
$$;

alter table public.auth_user_profiles enable row level security;
alter table public.role_scope_mapping enable row level security;
alter table public.confidential_field_rules enable row level security;
alter table public.scoped_access_units enable row level security;
alter table public.scoped_access_assignments enable row level security;
alter table public.super_admin_slots_v2 enable row level security;
alter table public.submission_records enable row level security;
alter table public.submission_status_history enable row level security;
alter table public.system_notifications enable row level security;
alter table public.system_audit_logs enable row level security;
alter table public.global_categories enable row level security;
alter table public.global_types enable row level security;
alter table public.global_custom_fields enable row level security;
alter table public.global_file_uploads enable row level security;
alter table public.chief_admin_seed enable row level security;

-- Chief and super scope
drop policy if exists "auth_profiles_admin_access" on public.auth_user_profiles;
create policy "auth_profiles_admin_access" on public.auth_user_profiles
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'));

drop policy if exists "auth_profiles_self_read" on public.auth_user_profiles;
create policy "auth_profiles_self_read" on public.auth_user_profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists "chief_seed_chief_only" on public.chief_admin_seed;
create policy "chief_seed_chief_only" on public.chief_admin_seed
for select to authenticated
using (public.current_app_role() in ('chief_admin','super_admin'));

drop policy if exists "super_slots_admin_control" on public.super_admin_slots_v2;
create policy "super_slots_admin_control" on public.super_admin_slots_v2
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin'));

-- Scoped unit access
drop policy if exists "scoped_units_scope_select" on public.scoped_access_units;
create policy "scoped_units_scope_select" on public.scoped_access_units
for select to authenticated
using (
  public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin')
  or (scope_level = 'Dayosisi' and unit_name = public.current_scope_diocese())
  or (scope_level = 'Jimbo' and unit_name = public.current_scope_jimbo())
  or (scope_level = 'Tawi' and unit_name = public.current_scope_branch())
);

drop policy if exists "scoped_units_scope_write" on public.scoped_access_units;
create policy "scoped_units_scope_write" on public.scoped_access_units
for all to authenticated
using (
  public.current_app_role() in ('chief_admin','super_admin','national_admin')
  or (scope_level = 'Dayosisi' and public.current_app_role() = 'diocese_admin' and unit_name = public.current_scope_diocese())
  or (scope_level = 'Jimbo' and public.current_app_role() = 'jimbo_admin' and unit_name = public.current_scope_jimbo())
  or (scope_level = 'Tawi' and public.current_app_role() = 'branch_admin' and unit_name = public.current_scope_branch())
)
with check (
  public.current_app_role() in ('chief_admin','super_admin','national_admin')
  or (scope_level = 'Dayosisi' and public.current_app_role() = 'diocese_admin' and unit_name = public.current_scope_diocese())
  or (scope_level = 'Jimbo' and public.current_app_role() = 'jimbo_admin' and unit_name = public.current_scope_jimbo())
  or (scope_level = 'Tawi' and public.current_app_role() = 'branch_admin' and unit_name = public.current_scope_branch())
);

drop policy if exists "scoped_assignments_select" on public.scoped_access_assignments;
create policy "scoped_assignments_select" on public.scoped_access_assignments
for select to authenticated
using (true);

drop policy if exists "scoped_assignments_write" on public.scoped_access_assignments;
create policy "scoped_assignments_write" on public.scoped_access_assignments
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','diocese_admin','jimbo_admin','branch_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','diocese_admin','jimbo_admin','branch_admin'));

-- Workflow + audit + notifications
drop policy if exists "submission_records_scope_select" on public.submission_records;
create policy "submission_records_scope_select" on public.submission_records
for select to authenticated
using (
  public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','approver','reviewer')
  or (scope_level = 'Dayosisi' and unit_name = public.current_scope_diocese())
  or (scope_level = 'Jimbo' and unit_name = public.current_scope_jimbo())
  or (scope_level = 'Tawi' and unit_name = public.current_scope_branch())
);

drop policy if exists "submission_records_scope_write" on public.submission_records;
create policy "submission_records_scope_write" on public.submission_records
for all to authenticated
using (
  public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','approver')
  or (scope_level = 'Dayosisi' and public.current_app_role() in ('diocese_admin','diocese_data_officer') and unit_name = public.current_scope_diocese())
  or (scope_level = 'Jimbo' and public.current_app_role() in ('jimbo_admin','jimbo_data_officer') and unit_name = public.current_scope_jimbo())
  or (scope_level = 'Tawi' and public.current_app_role() in ('branch_admin','branch_data_officer') and unit_name = public.current_scope_branch())
)
with check (
  public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','approver')
  or (scope_level = 'Dayosisi' and public.current_app_role() in ('diocese_admin','diocese_data_officer') and unit_name = public.current_scope_diocese())
  or (scope_level = 'Jimbo' and public.current_app_role() in ('jimbo_admin','jimbo_data_officer') and unit_name = public.current_scope_jimbo())
  or (scope_level = 'Tawi' and public.current_app_role() in ('branch_admin','branch_data_officer') and unit_name = public.current_scope_branch())
);

drop policy if exists "submission_history_select" on public.submission_status_history;
create policy "submission_history_select" on public.submission_status_history
for select to authenticated
using (true);

drop policy if exists "submission_history_insert" on public.submission_status_history;
create policy "submission_history_insert" on public.submission_status_history
for insert to authenticated
with check (true);

drop policy if exists "notifications_role_scope" on public.system_notifications;
create policy "notifications_role_scope" on public.system_notifications
for select to authenticated
using (
  target_user is null or target_user = auth.uid()
  or target_role is null
  or target_role = public.current_app_role()
  or public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin')
);

drop policy if exists "notifications_admin_write" on public.system_notifications;
create policy "notifications_admin_write" on public.system_notifications
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'));

drop policy if exists "audit_logs_admin_read" on public.system_audit_logs;
create policy "audit_logs_admin_read" on public.system_audit_logs
for select to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','executive_viewer'));

drop policy if exists "audit_logs_insert_all_auth" on public.system_audit_logs;
create policy "audit_logs_insert_all_auth" on public.system_audit_logs
for insert to authenticated
with check (true);

-- Confidential field rule visibility
drop policy if exists "confidential_rules_admin_only" on public.confidential_field_rules;
create policy "confidential_rules_admin_only" on public.confidential_field_rules
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin','national_admin'));

-- Custom config tables writable by admins
drop policy if exists "global_config_admin_rw_categories" on public.global_categories;
create policy "global_config_admin_rw_categories" on public.global_categories
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'));

drop policy if exists "global_config_admin_rw_types" on public.global_types;
create policy "global_config_admin_rw_types" on public.global_types
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'));

drop policy if exists "global_config_admin_rw_fields" on public.global_custom_fields;
create policy "global_config_admin_rw_fields" on public.global_custom_fields
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin'));

drop policy if exists "file_uploads_visibility_scope" on public.global_file_uploads;
create policy "file_uploads_visibility_scope" on public.global_file_uploads
for select to authenticated
using (
  visibility_level = 'Public'
  or public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','diocese_admin','jimbo_admin','branch_admin')
);

drop policy if exists "file_uploads_write_scope" on public.global_file_uploads;
create policy "file_uploads_write_scope" on public.global_file_uploads
for all to authenticated
using (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','diocese_admin','jimbo_admin','branch_admin'))
with check (public.current_app_role() in ('chief_admin','super_admin','national_admin','office_admin','diocese_admin','jimbo_admin','branch_admin'));
