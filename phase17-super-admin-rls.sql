-- PHASE 17: Super Admin Control Center RLS
-- Enforces secure access for Chief Admin and Super Admin roles.

alter table if exists public.system_health enable row level security;
alter table if exists public.module_health enable row level security;
alter table if exists public.service_status enable row level security;
alter table if exists public.error_logs enable row level security;
alter table if exists public.performance_metrics enable row level security;
alter table if exists public.maintenance_flags enable row level security;
alter table if exists public.admin_actions enable row level security;
alter table if exists public.diagnostics_logs enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'app_role'), '');
$$;

create or replace function public.is_control_center_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('Chief Admin', 'Super Admin');
$$;

drop policy if exists phase17_system_health_select on public.system_health;
create policy phase17_system_health_select
on public.system_health
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists phase17_system_health_mutate on public.system_health;
create policy phase17_system_health_mutate
on public.system_health
for all
to authenticated
using (public.current_app_role() = 'Chief Admin')
with check (public.current_app_role() = 'Chief Admin');

drop policy if exists phase17_module_health_select on public.module_health;
create policy phase17_module_health_select
on public.module_health
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists phase17_module_health_mutate on public.module_health;
create policy phase17_module_health_mutate
on public.module_health
for all
to authenticated
using (public.current_app_role() = 'Chief Admin')
with check (public.current_app_role() = 'Chief Admin');

drop policy if exists phase17_service_status_select on public.service_status;
create policy phase17_service_status_select
on public.service_status
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists phase17_service_status_mutate on public.service_status;
create policy phase17_service_status_mutate
on public.service_status
for all
to authenticated
using (public.current_app_role() = 'Chief Admin')
with check (public.current_app_role() = 'Chief Admin');

drop policy if exists phase17_error_logs_select on public.error_logs;
create policy phase17_error_logs_select
on public.error_logs
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists phase17_error_logs_insert on public.error_logs;
create policy phase17_error_logs_insert
on public.error_logs
for insert
to authenticated
with check (public.is_control_center_admin());

drop policy if exists phase17_error_logs_update on public.error_logs;
create policy phase17_error_logs_update
on public.error_logs
for update
to authenticated
using (public.is_control_center_admin())
with check (public.is_control_center_admin());

drop policy if exists phase17_error_logs_delete on public.error_logs;
create policy phase17_error_logs_delete
on public.error_logs
for delete
to authenticated
using (public.current_app_role() = 'Chief Admin');

drop policy if exists phase17_performance_metrics_select on public.performance_metrics;
create policy phase17_performance_metrics_select
on public.performance_metrics
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists phase17_performance_metrics_mutate on public.performance_metrics;
create policy phase17_performance_metrics_mutate
on public.performance_metrics
for all
to authenticated
using (public.current_app_role() = 'Chief Admin')
with check (public.current_app_role() = 'Chief Admin');

drop policy if exists phase17_maintenance_flags_select on public.maintenance_flags;
create policy phase17_maintenance_flags_select
on public.maintenance_flags
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists phase17_maintenance_flags_update on public.maintenance_flags;
create policy phase17_maintenance_flags_update
on public.maintenance_flags
for update
to authenticated
using (public.is_control_center_admin())
with check (public.is_control_center_admin());

drop policy if exists phase17_maintenance_flags_insert on public.maintenance_flags;
create policy phase17_maintenance_flags_insert
on public.maintenance_flags
for insert
to authenticated
with check (public.current_app_role() = 'Chief Admin');

drop policy if exists phase17_admin_actions_select on public.admin_actions;
create policy phase17_admin_actions_select
on public.admin_actions
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists phase17_admin_actions_insert on public.admin_actions;
create policy phase17_admin_actions_insert
on public.admin_actions
for insert
to authenticated
with check (public.is_control_center_admin());

drop policy if exists phase17_diagnostics_logs_select on public.diagnostics_logs;
create policy phase17_diagnostics_logs_select
on public.diagnostics_logs
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists phase17_diagnostics_logs_insert on public.diagnostics_logs;
create policy phase17_diagnostics_logs_insert
on public.diagnostics_logs
for insert
to authenticated
with check (public.is_control_center_admin());
