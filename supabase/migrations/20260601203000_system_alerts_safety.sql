create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  message text not null default '',
  type text default 'general',
  status text not null default 'open',
  severity text default 'info',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_alerts enable row level security;
grant select, insert, update on table public.system_alerts to authenticated;

drop policy if exists "system_alerts_select_auth" on public.system_alerts;
create policy "system_alerts_select_auth"
on public.system_alerts
for select
to authenticated
using (true);

drop policy if exists "system_alerts_insert_auth" on public.system_alerts;
create policy "system_alerts_insert_auth"
on public.system_alerts
for insert
to authenticated
with check (true);

drop policy if exists "system_alerts_update_auth" on public.system_alerts;
create policy "system_alerts_update_auth"
on public.system_alerts
for update
to authenticated
using (true)
with check (true);
