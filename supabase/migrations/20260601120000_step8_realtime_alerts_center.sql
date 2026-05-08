-- Step 8: Realtime notifications + smart alerts + activity center hardening.

alter table public.notifications
  add column if not exists module text not null default 'general',
  add column if not exists priority text not null default 'info' check (priority in ('info', 'success', 'warning', 'critical')),
  add column if not exists read_status boolean not null default false,
  add column if not exists action_url text null;
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (
    type in ('auth', 'approval', 'finance', 'document', 'system', 'structure', 'media', 'event', 'info', 'success', 'warning', 'error')
  );

create index if not exists notifications_module_idx on public.notifications (module);
create index if not exists notifications_priority_idx on public.notifications (priority);

create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'system',
  module text not null default 'dashboard',
  title text not null,
  message text not null,
  priority text not null default 'warning' check (priority in ('info', 'success', 'warning', 'critical')),
  target_role text null,
  target_user_id uuid null references auth.users (id) on delete set null,
  action_url text null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  metadata jsonb null,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_alerts_created_idx on public.system_alerts (created_at desc);
create index if not exists system_alerts_status_idx on public.system_alerts (status);
create index if not exists system_alerts_priority_idx on public.system_alerts (priority);
create index if not exists system_alerts_module_idx on public.system_alerts (module);

create or replace function public.system_alerts_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists system_alerts_touch_updated_at on public.system_alerts;
create trigger system_alerts_touch_updated_at
  before update on public.system_alerts
  for each row execute procedure public.system_alerts_touch_updated_at();

alter table public.system_alerts enable row level security;
revoke all on table public.system_alerts from anon;
grant select, insert, update on table public.system_alerts to authenticated;

drop policy if exists "system_alerts_select_auth_rbac" on public.system_alerts;
create policy "system_alerts_select_auth_rbac"
  on public.system_alerts for select to authenticated
  using (
    public.portal_has_module_capability('dashboard', 'view')
    and (
      public.portal_has_module_capability('dashboard', 'audit')
      or (target_user_id is not null and target_user_id = auth.uid())
      or (
        target_role is not null
        and exists (
          select 1
          from public.portal_directory_profiles p
          where p.auth_user_id = auth.uid()
            and p.status = 'active'
            and p.role_key = system_alerts.target_role
        )
      )
      or (created_by is not null and created_by = auth.uid())
      or (target_role is null and target_user_id is null)
    )
  );

drop policy if exists "system_alerts_insert_auth_rbac" on public.system_alerts;
create policy "system_alerts_insert_auth_rbac"
  on public.system_alerts for insert to authenticated
  with check (
    public.portal_has_module_capability('dashboard', 'audit')
    or public.portal_has_module_capability('notifications', 'create')
  );

drop policy if exists "system_alerts_update_auth_rbac" on public.system_alerts;
create policy "system_alerts_update_auth_rbac"
  on public.system_alerts for update to authenticated
  using (
    public.portal_has_module_capability('dashboard', 'audit')
    or public.portal_has_module_capability('notifications', 'edit')
  )
  with check (
    public.portal_has_module_capability('dashboard', 'audit')
    or public.portal_has_module_capability('notifications', 'edit')
  );

create or replace function public.portal_enqueue_notification(
  p_title text,
  p_message text,
  p_type text default 'system',
  p_target_role text default null,
  p_target_user_id uuid default null,
  p_is_global boolean default false,
  p_module text default 'general',
  p_priority text default 'info',
  p_action_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
  v_type text;
  v_priority text;
begin
  v_type := coalesce(nullif(trim(p_type), ''), 'system');
  if v_type not in ('auth', 'approval', 'finance', 'document', 'system', 'structure', 'media', 'event', 'info', 'success', 'warning', 'error') then
    v_type := 'system';
  end if;
  v_priority := coalesce(nullif(trim(p_priority), ''), 'info');
  if v_priority not in ('info', 'success', 'warning', 'critical') then
    v_priority := 'info';
  end if;

  insert into public.notifications (title, message, type, target_role, target_user_id, is_global, created_by, is_read, module, priority, action_url)
  values (
    left(trim(p_title), 500),
    trim(p_message),
    v_type,
    nullif(trim(p_target_role), ''),
    p_target_user_id,
    coalesce(p_is_global, false),
    auth.uid(),
    false,
    coalesce(nullif(trim(p_module), ''), 'general'),
    v_priority,
    nullif(trim(p_action_url), '')
  )
  returning id into nid;
  return nid;
end;
$$;

revoke all on function public.portal_enqueue_notification(text, text, text, text, uuid, boolean, text, text, text) from public;
grant execute on function public.portal_enqueue_notification(text, text, text, text, uuid, boolean, text, text, text) to authenticated;
