-- Stage 4: Notifications Center — notifications + notification_reads (hali ya kusoma kwa kila mtumiaji).
-- RBAC: portal_has_module_capability('notifications', …)

-- ——— notifications (schema ya portal) ———

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'info'
    check (type in ('info', 'success', 'warning', 'error', 'event', 'finance', 'system')),
  target_role text null,
  target_user_id uuid null references auth.users (id) on delete set null,
  created_by uuid null references auth.users (id) on delete set null,
  is_global boolean not null default false,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_created_idx on public.notifications (created_at desc);
create index if not exists notifications_global_idx on public.notifications (is_global) where is_global = true;
create index if not exists notifications_target_user_idx on public.notifications (target_user_id);
create index if not exists notifications_target_role_idx on public.notifications (target_role);

-- Per-user read state (uthibitisho wa kusoma kwa broadcast / role — si kwa kituo kimoja tu)

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists notification_reads_user_idx on public.notification_reads (user_id);

-- updated_at

create or replace function public.notifications_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notifications_touch_updated_at on public.notifications;
create trigger notifications_touch_updated_at
  before update on public.notifications
  for each row execute procedure public.notifications_touch_updated_at();

-- ——— RLS: notifications ———

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

revoke all on table public.notifications from anon;
revoke all on table public.notification_reads from anon;

grant select, insert, update, delete on table public.notifications to authenticated;
grant select, insert, delete on table public.notification_reads to authenticated;

-- SELECT: role / global / direct user / creator; watumiaji wenye edit wanaona zote
drop policy if exists "notifications_select_auth_rbac" on public.notifications;
create policy "notifications_select_auth_rbac"
  on public.notifications for select to authenticated
  using (
    public.portal_has_module_capability('notifications', 'view')
    and (
      public.portal_has_module_capability('notifications', 'edit')
      or is_global = true
      or (target_user_id is not null and target_user_id = auth.uid())
      or (
        target_role is not null
        and exists (
          select 1
          from public.portal_directory_profiles p
          where p.auth_user_id = auth.uid()
            and p.status = 'active'
            and p.role_key = notifications.target_role
        )
      )
      or (created_by is not null and created_by = auth.uid())
    )
  );

drop policy if exists "notifications_insert_auth_rbac" on public.notifications;
create policy "notifications_insert_auth_rbac"
  on public.notifications for insert to authenticated
  with check (public.portal_has_module_capability('notifications', 'create'));

drop policy if exists "notifications_update_auth_rbac" on public.notifications;
create policy "notifications_update_auth_rbac"
  on public.notifications for update to authenticated
  using (public.portal_has_module_capability('notifications', 'edit'))
  with check (public.portal_has_module_capability('notifications', 'edit'));

drop policy if exists "notifications_delete_auth_rbac" on public.notifications;
create policy "notifications_delete_auth_rbac"
  on public.notifications for delete to authenticated
  using (public.portal_has_module_capability('notifications', 'delete'));

-- SELECT reads: safu zako tu
drop policy if exists "notification_reads_select_own" on public.notification_reads;
create policy "notification_reads_select_own"
  on public.notification_reads for select to authenticated
  using (user_id = auth.uid());

-- INSERT read: lazima uwe mwisho wa taarifa unayoiona (si lazima edit — mtumiaji wa kawaida anaweza kusoma)
drop policy if exists "notification_reads_insert_own" on public.notification_reads;
create policy "notification_reads_insert_own"
  on public.notification_reads for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.notifications n
      where n.id = notification_id
        and public.portal_has_module_capability('notifications', 'view')
        and (
          public.portal_has_module_capability('notifications', 'edit')
          or n.is_global = true
          or (n.target_user_id is not null and n.target_user_id = auth.uid())
          or (
            n.target_role is not null
            and exists (
              select 1 from public.portal_directory_profiles p
              where p.auth_user_id = auth.uid()
                and p.status = 'active'
                and p.role_key = n.target_role
            )
          )
          or (n.created_by is not null and n.created_by = auth.uid())
        )
    )
  );

-- DELETE read (rudisha kuwa "hujasoma")
drop policy if exists "notification_reads_delete_own" on public.notification_reads;
create policy "notification_reads_delete_own"
  on public.notification_reads for delete to authenticated
  using (user_id = auth.uid());

-- ——— RBAC matrix ———

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select
  role_key,
  'notifications',
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_audit
from public.portal_module_matrix
where module_key = 'events'
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();
