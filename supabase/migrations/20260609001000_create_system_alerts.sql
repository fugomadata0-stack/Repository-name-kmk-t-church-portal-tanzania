-- Create missing system_alerts table for production recovery.
create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  module text,
  title text not null,
  message text,
  priority text not null default 'info',
  status text not null default 'open',
  target_role text,
  target_user_id uuid,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_alerts_status_idx on public.system_alerts (status);
create index if not exists system_alerts_type_idx on public.system_alerts (type);
create index if not exists system_alerts_module_idx on public.system_alerts (module);
create index if not exists system_alerts_priority_idx on public.system_alerts (priority);
create index if not exists system_alerts_target_role_idx on public.system_alerts (target_role);
create index if not exists system_alerts_target_user_id_idx on public.system_alerts (target_user_id);
create index if not exists system_alerts_created_at_idx on public.system_alerts (created_at desc);

alter table public.system_alerts enable row level security;

grant select on public.system_alerts to authenticated;
grant insert, update, delete on public.system_alerts to authenticated;

drop policy if exists system_alerts_auth_read_targeted on public.system_alerts;
create policy system_alerts_auth_read_targeted
on public.system_alerts
for select
to authenticated
using (
  target_user_id = auth.uid()
  or target_user_id is null
  or exists (
    select 1
    from public.portal_directory_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and (
        p.role_key = target_role
        or p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
      )
  )
);

drop policy if exists system_alerts_auth_manage_admin on public.system_alerts;
create policy system_alerts_auth_manage_admin
on public.system_alerts
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_directory_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
  )
)
with check (
  exists (
    select 1
    from public.portal_directory_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
  )
);
