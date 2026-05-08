create table if not exists reports_registry (
  id bigserial primary key,
  report_name text not null,
  module text,
  scope text,
  format text,
  last_generated date,
  status text default 'processing',
  created_at timestamptz default now()
);

create table if not exists report_exports (
  id bigserial primary key,
  file_name text,
  module text,
  format text,
  generated_by text,
  date date,
  size text,
  created_at timestamptz default now()
);

create table if not exists analytics_snapshots (
  id bigserial primary key,
  snapshot_date date,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists dashboard_metrics (
  id bigserial primary key,
  reportsGenerated integer default 0,
  insights integer default 0,
  attendancePerformance text,
  financialHealth text,
  membershipGrowth text,
  ministryEngagement text,
  communicationReach text,
  systemHealth text,
  created_at timestamptz default now()
);

create table if not exists smart_insights (
  id bigserial primary key,
  title text,
  detail text,
  created_at timestamptz default now()
);

create table if not exists comparative_reports (
  id bigserial primary key,
  category text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists report_logs (
  id bigserial primary key,
  actor_role text,
  action text,
  description text,
  payload jsonb,
  created_at timestamptz default now()
);

alter table reports_registry enable row level security;
alter table report_exports enable row level security;
alter table analytics_snapshots enable row level security;
alter table dashboard_metrics enable row level security;
alter table smart_insights enable row level security;
alter table comparative_reports enable row level security;
alter table report_logs enable row level security;

drop policy if exists "reports_registry_all_auth" on reports_registry;
create policy "reports_registry_all_auth" on reports_registry for all to authenticated using (true) with check (true);
drop policy if exists "report_exports_all_auth" on report_exports;
create policy "report_exports_all_auth" on report_exports for all to authenticated using (true) with check (true);
drop policy if exists "analytics_snapshots_all_auth" on analytics_snapshots;
create policy "analytics_snapshots_all_auth" on analytics_snapshots for all to authenticated using (true) with check (true);
drop policy if exists "dashboard_metrics_all_auth" on dashboard_metrics;
create policy "dashboard_metrics_all_auth" on dashboard_metrics for all to authenticated using (true) with check (true);
drop policy if exists "smart_insights_all_auth" on smart_insights;
create policy "smart_insights_all_auth" on smart_insights for all to authenticated using (true) with check (true);
drop policy if exists "comparative_reports_all_auth" on comparative_reports;
create policy "comparative_reports_all_auth" on comparative_reports for all to authenticated using (true) with check (true);
drop policy if exists "report_logs_all_auth" on report_logs;
create policy "report_logs_all_auth" on report_logs for all to authenticated using (true) with check (true);
