create or replace function public.current_app_role()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role')::text, 'member') $$;

alter table public.reports_registry enable row level security;
alter table public.report_exports enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.dashboard_metrics enable row level security;
alter table public.smart_insights enable row level security;
alter table public.comparative_reports enable row level security;
alter table public.report_logs enable row level security;

drop policy if exists "reports_select_strict" on public.reports_registry;
create policy "reports_select_strict" on public.reports_registry
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer','member'));

drop policy if exists "reports_rw_strict" on public.reports_registry;
create policy "reports_rw_strict" on public.reports_registry
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer'));

drop policy if exists "exports_rw_strict" on public.report_exports;
create policy "exports_rw_strict" on public.report_exports
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer'));

drop policy if exists "metrics_select_strict" on public.dashboard_metrics;
create policy "metrics_select_strict" on public.dashboard_metrics
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer','member'));

drop policy if exists "insights_select_strict" on public.smart_insights;
create policy "insights_select_strict" on public.smart_insights
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer','member'));

drop policy if exists "comparative_select_strict" on public.comparative_reports;
create policy "comparative_select_strict" on public.comparative_reports
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer','member'));

drop policy if exists "report_logs_insert_strict" on public.report_logs;
create policy "report_logs_insert_strict" on public.report_logs
for insert to authenticated
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','finance_officer'));
