-- Live Validation Center RLS
alter table if exists public.validation_runs enable row level security;

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

drop policy if exists validation_runs_select on public.validation_runs;
create policy validation_runs_select
on public.validation_runs
for select
to authenticated
using (public.is_control_center_admin());

drop policy if exists validation_runs_insert on public.validation_runs;
create policy validation_runs_insert
on public.validation_runs
for insert
to authenticated
with check (public.is_control_center_admin());

drop policy if exists validation_runs_delete on public.validation_runs;
create policy validation_runs_delete
on public.validation_runs
for delete
to authenticated
using (public.current_app_role() = 'Chief Admin');
