-- Phase 34: Mialiko, Vyeo, Historia — chief_admin & super_admin (RLS)
-- Matrix ya ruhusa: endelea kutumia portal_module_matrix (hakuna jedwali jipya).

-- ——— Invites ———
create table if not exists public.phase34_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role_key text not null references public.portal_roles (role_key),
  scope_level text not null check (scope_level in ('national', 'diocese', 'jimbo', 'tawi')),
  dayosisi_scope text,
  jimbo_scope text,
  tawi_scope text,
  message text,
  invite_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists phase34_invites_email_idx on public.phase34_invites (lower(email));
create index if not exists phase34_invites_status_idx on public.phase34_invites (status);
create index if not exists phase34_invites_created_idx on public.phase34_invites (created_at desc);

-- ——— Historia ya mabadiliko ya jukumu ———
create table if not exists public.phase34_role_change_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.portal_directory_profiles (id) on delete cascade,
  previous_role_key text not null,
  new_role_key text not null references public.portal_roles (role_key),
  action text not null check (action in ('promote', 'demote')),
  reason text,
  performed_by uuid references auth.users (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists phase34_rch_profile_idx on public.phase34_role_change_history (profile_id);
create index if not exists phase34_rch_created_idx on public.phase34_role_change_history (created_at desc);

-- ——— Triggers: sasisha updated_at ———
create or replace function public.phase34_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists phase34_invites_touch on public.phase34_invites;
create trigger phase34_invites_touch
  before update on public.phase34_invites
  for each row execute procedure public.phase34_touch_updated_at();

-- ——— Audit (audit_logs) ———
create or replace function public.phase34_audit_invite_row()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (action, entity, entity_id, meta, user_id)
    values (
      'phase34_invite_insert',
      'phase34_invites',
      new.id::text,
      jsonb_build_object('email', new.email, 'role_key', new.role_key, 'status', new.status),
      uid
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (action, entity, entity_id, meta, user_id)
    values (
      'phase34_invite_update',
      'phase34_invites',
      new.id::text,
      jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)),
      uid
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (action, entity, entity_id, meta, user_id)
    values (
      'phase34_invite_delete',
      'phase34_invites',
      old.id::text,
      jsonb_build_object('row', to_jsonb(old)),
      uid
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists phase34_invites_audit on public.phase34_invites;
create trigger phase34_invites_audit
  after insert or update or delete on public.phase34_invites
  for each row execute procedure public.phase34_audit_invite_row();

create or replace function public.phase34_audit_rch_row()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (action, entity, entity_id, meta, user_id)
    values (
      'phase34_role_change',
      'phase34_role_change_history',
      new.id::text,
      jsonb_build_object(
        'profile_id', new.profile_id,
        'from', new.previous_role_key,
        'to', new.new_role_key,
        'action', new.action
      ),
      uid
    );
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists phase34_rch_audit on public.phase34_role_change_history;
create trigger phase34_rch_audit
  after insert on public.phase34_role_change_history
  for each row execute procedure public.phase34_audit_rch_row();

-- ——— RLS: chief_admin + super_admin tu ———
alter table public.phase34_invites enable row level security;
alter table public.phase34_role_change_history enable row level security;

revoke all on table public.phase34_invites from public;
revoke all on table public.phase34_role_change_history from public;

grant select, insert, update, delete on table public.phase34_invites to authenticated;
grant select, insert, update, delete on table public.phase34_role_change_history to authenticated;
grant all on table public.phase34_invites to service_role;
grant all on table public.phase34_role_change_history to service_role;

drop policy if exists "phase34_inv_select" on public.phase34_invites;
create policy "phase34_inv_select"
  on public.phase34_invites for select to authenticated
  using (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "phase34_inv_insert" on public.phase34_invites;
create policy "phase34_inv_insert"
  on public.phase34_invites for insert to authenticated
  with check (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "phase34_inv_update" on public.phase34_invites;
create policy "phase34_inv_update"
  on public.phase34_invites for update to authenticated
  using (public.current_app_role() in ('chief_admin', 'super_admin'))
  with check (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "phase34_inv_delete" on public.phase34_invites;
create policy "phase34_inv_delete"
  on public.phase34_invites for delete to authenticated
  using (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "phase34_rch_select" on public.phase34_role_change_history;
create policy "phase34_rch_select"
  on public.phase34_role_change_history for select to authenticated
  using (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "phase34_rch_insert" on public.phase34_role_change_history;
create policy "phase34_rch_insert"
  on public.phase34_role_change_history for insert to authenticated
  with check (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "phase34_rch_update" on public.phase34_role_change_history;
create policy "phase34_rch_update"
  on public.phase34_role_change_history for update to authenticated
  using (public.current_app_role() in ('chief_admin', 'super_admin'))
  with check (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "phase34_rch_delete" on public.phase34_role_change_history;
create policy "phase34_rch_delete"
  on public.phase34_role_change_history for delete to authenticated
  using (public.current_app_role() in ('chief_admin', 'super_admin'));

-- ——— RBAC matrix: moduli mpya ———
insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select
  r.role_key,
  'invite_promote_permissions',
  case when r.role_key in ('chief_admin', 'super_admin') then true else false end,
  case when r.role_key in ('chief_admin', 'super_admin') then true else false end,
  case when r.role_key in ('chief_admin', 'super_admin') then true else false end,
  case when r.role_key in ('chief_admin', 'super_admin') then true else false end,
  case when r.role_key in ('chief_admin', 'super_admin') then true else false end,
  false
from public.portal_roles r
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();
