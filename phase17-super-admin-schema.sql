-- PHASE 17: Super Admin Control Center
-- Supabase-ready tables for monitoring, diagnostics, and command-center actions.

create table if not exists public.system_health (
  id bigserial primary key,
  name text not null,
  status text not null default 'Monitoring',
  detail text,
  color text default 'blue',
  created_at timestamptz not null default now()
);

create table if not exists public.module_health (
  id bigserial primary key,
  module_name text not null,
  status text not null default 'Unknown',
  last_sync timestamptz default now(),
  coverage text default '0%',
  created_at timestamptz not null default now()
);

create table if not exists public.service_status (
  id bigserial primary key,
  service_name text not null,
  status text not null default 'Unknown',
  latency_ms integer default 0,
  uptime text default '-',
  created_at timestamptz not null default now()
);

create table if not exists public.error_logs (
  id bigserial primary key,
  module_name text,
  error_type text not null default 'System',
  severity text not null default 'Info',
  message text,
  message_preview text,
  status text not null default 'Open',
  assigned_to text default 'Unassigned',
  created_at timestamptz not null default now()
);

create table if not exists public.performance_metrics (
  id bigserial primary key,
  metric_name text not null,
  metric_value text,
  metric_status text default 'Normal',
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_flags (
  id bigserial primary key,
  enabled boolean not null default false,
  message text default 'Normal operations',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.admin_actions (
  id bigserial primary key,
  action_name text not null,
  action_payload jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  related_error_id bigint references public.error_logs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.diagnostics_logs (
  id bigserial primary key,
  note text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_error_logs_created_at on public.error_logs (created_at desc);
create index if not exists idx_admin_actions_created_at on public.admin_actions (created_at desc);
create index if not exists idx_admin_actions_related_error on public.admin_actions (related_error_id);

-- Singleton row so Super Admins can UPDATE maintenance (RLS allows INSERT only for Chief Admin).
insert into public.maintenance_flags (enabled, message)
select false, 'Normal operations'
where not exists (select 1 from public.maintenance_flags limit 1);

-- Starter rows when tables are empty (run as DB owner / SQL editor; bypasses RLS).
insert into public.system_health (name, status, detail, color)
select * from (
  values
    ('Auth Status', 'Healthy', 'Supabase Auth ready', 'green'),
    ('Database Placeholder', 'Monitoring', 'Connection stable', 'blue'),
    ('Storage Status', 'Healthy', 'Buckets available', 'green'),
    ('Realtime Status', 'Healthy', 'Channels stable', 'emerald'),
    ('Notification Services', 'Healthy', 'In-app active', 'green'),
    ('Payment Gateway Placeholder', 'Placeholder', 'Future integration', 'slate'),
    ('Media Processing Placeholder', 'Placeholder', 'Queue staged', 'slate'),
    ('Report Engine', 'Healthy', 'Generation available', 'green')
) as v(name, status, detail, color)
where not exists (select 1 from public.system_health limit 1);

insert into public.module_health (module_name, status, coverage, last_sync)
select * from (
  values
    ('Access Control', 'Healthy', '100%', now()),
    ('People & Ministry', 'Healthy', '98%', now()),
    ('Reports', 'Healthy', '97%', now()),
    ('Library', 'Warning', '90%', now())
) as v(module_name, status, coverage, last_sync)
where not exists (select 1 from public.module_health limit 1);

insert into public.service_status (service_name, status, latency_ms, uptime)
select * from (
  values
    ('Auth Service', 'Online', 44, '99.98%'),
    ('Database', 'Online', 55, '99.91%'),
    ('Storage', 'Online', 62, '99.87%'),
    ('Realtime', 'Online', 41, '99.94%')
) as v(service_name, status, latency_ms, uptime)
where not exists (select 1 from public.service_status limit 1);

insert into public.performance_metrics (metric_name, metric_value, metric_status)
select * from (
  values
    ('Page Load Trend', '1.4s avg', 'Good'),
    ('API Response Placeholder', '220ms avg', 'Stable'),
    ('Storage Growth', '+4.1% monthly', 'Track'),
    ('Media Upload Trend', '286/day', 'High'),
    ('Notification Queue Placeholder', '31 pending', 'Normal'),
    ('Report Generation Trend', '84/day', 'Good')
) as v(metric_name, metric_value, metric_status)
where not exists (select 1 from public.performance_metrics limit 1);

insert into public.error_logs (module_name, error_type, severity, message, message_preview, status, assigned_to)
select * from (
  values
    ('System', 'Seed', 'Info', 'Phase 17 starter row for dashboard wiring.', 'Starter row — not a production incident.', 'Resolved', 'System'),
    ('Auth', 'Login Retry', 'Warning', 'Repeated login attempts from one IP.', 'Repeated login attempts from one IP.', 'Open', 'Security Team')
) as v(module_name, error_type, severity, message, message_preview, status, assigned_to)
where not exists (select 1 from public.error_logs limit 1);
