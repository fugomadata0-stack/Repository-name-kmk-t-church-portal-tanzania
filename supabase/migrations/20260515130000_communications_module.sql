-- Stage 6: SMS & Email Communications — campaigns, recipients, templates, RBAC/RLS.
-- Module key: communications (portal_module_matrix). Mirrors legacy mawasiliano rows.

-- ——— communications ———

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  subject text null,
  custom_recipients_raw text null,
  channel text not null default 'sms'
    check (channel in ('sms', 'email', 'both')),
  target_type text not null default 'all'
    check (target_type in (
      'all', 'role', 'group', 'individual', 'beneficiaries', 'event_participants', 'members', 'custom_list'
    )),
  target_role text null,
  target_user_id uuid null,
  target_group text null,
  target_email text null,
  target_phone text null,
  recipients_count integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz null,
  sent_at timestamptz null,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communications_status_idx on public.communications (status);
create index if not exists communications_created_idx on public.communications (created_at desc);
create index if not exists communications_scheduled_idx on public.communications (scheduled_at)
  where scheduled_at is not null;

-- ——— communication_recipients ———

create table if not exists public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communications (id) on delete cascade,
  recipient_name text null,
  recipient_email text null,
  recipient_phone text null,
  recipient_type text null,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text null,
  error_message text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists communication_recipients_comm_idx on public.communication_recipients (communication_id);
create index if not exists communication_recipients_delivery_idx on public.communication_recipients (delivery_status);

-- ——— communication_templates ———

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'sms'
    check (channel in ('sms', 'email', 'both')),
  subject text null,
  body text not null,
  category text null,
  is_active boolean not null default true,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_templates_active_idx on public.communication_templates (is_active);

-- ——— updated_at ———

create or replace function public.communications_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists communications_touch on public.communications;
create trigger communications_touch
  before update on public.communications
  for each row execute procedure public.communications_touch_updated_at();

drop trigger if exists communication_templates_touch on public.communication_templates;
create trigger communication_templates_touch
  before update on public.communication_templates
  for each row execute procedure public.communications_touch_updated_at();

-- ——— RLS ———

alter table public.communications enable row level security;
alter table public.communication_recipients enable row level security;
alter table public.communication_templates enable row level security;

revoke all on table public.communications from anon;
revoke all on table public.communication_recipients from anon;
revoke all on table public.communication_templates from anon;

grant select, insert, update, delete on table public.communications to authenticated;
grant select, insert, update, delete on table public.communication_recipients to authenticated;
grant select, insert, update, delete on table public.communication_templates to authenticated;

-- communications
drop policy if exists "communications_select_auth_rbac" on public.communications;
create policy "communications_select_auth_rbac"
  on public.communications for select to authenticated
  using (public.portal_has_module_capability('communications', 'view'));

drop policy if exists "communications_insert_auth_rbac" on public.communications;
create policy "communications_insert_auth_rbac"
  on public.communications for insert to authenticated
  with check (public.portal_has_module_capability('communications', 'create'));

drop policy if exists "communications_update_auth_rbac" on public.communications;
create policy "communications_update_auth_rbac"
  on public.communications for update to authenticated
  using (public.portal_has_module_capability('communications', 'edit'))
  with check (public.portal_has_module_capability('communications', 'edit'));

drop policy if exists "communications_delete_auth_rbac" on public.communications;
create policy "communications_delete_auth_rbac"
  on public.communications for delete to authenticated
  using (public.portal_has_module_capability('communications', 'delete'));

-- communication_recipients (inherit capability from communications module)
drop policy if exists "communication_recipients_select_auth_rbac" on public.communication_recipients;
create policy "communication_recipients_select_auth_rbac"
  on public.communication_recipients for select to authenticated
  using (public.portal_has_module_capability('communications', 'view'));

drop policy if exists "communication_recipients_insert_auth_rbac" on public.communication_recipients;
create policy "communication_recipients_insert_auth_rbac"
  on public.communication_recipients for insert to authenticated
  with check (public.portal_has_module_capability('communications', 'create'));

drop policy if exists "communication_recipients_update_auth_rbac" on public.communication_recipients;
create policy "communication_recipients_update_auth_rbac"
  on public.communication_recipients for update to authenticated
  using (public.portal_has_module_capability('communications', 'edit'))
  with check (public.portal_has_module_capability('communications', 'edit'));

drop policy if exists "communication_recipients_delete_auth_rbac" on public.communication_recipients;
create policy "communication_recipients_delete_auth_rbac"
  on public.communication_recipients for delete to authenticated
  using (public.portal_has_module_capability('communications', 'delete'));

-- communication_templates
drop policy if exists "communication_templates_select_auth_rbac" on public.communication_templates;
create policy "communication_templates_select_auth_rbac"
  on public.communication_templates for select to authenticated
  using (public.portal_has_module_capability('communications', 'view'));

drop policy if exists "communication_templates_insert_auth_rbac" on public.communication_templates;
create policy "communication_templates_insert_auth_rbac"
  on public.communication_templates for insert to authenticated
  with check (public.portal_has_module_capability('communications', 'create'));

drop policy if exists "communication_templates_update_auth_rbac" on public.communication_templates;
create policy "communication_templates_update_auth_rbac"
  on public.communication_templates for update to authenticated
  using (public.portal_has_module_capability('communications', 'edit'))
  with check (public.portal_has_module_capability('communications', 'edit'));

drop policy if exists "communication_templates_delete_auth_rbac" on public.communication_templates;
create policy "communication_templates_delete_auth_rbac"
  on public.communication_templates for delete to authenticated
  using (public.portal_has_module_capability('communications', 'delete'));

-- ——— RBAC: clone mawasiliano → communications, then tighten reviewer/viewer ———

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select
  role_key,
  'communications',
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_audit
from public.portal_module_matrix
where module_key = 'mawasiliano'
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();

update public.portal_module_matrix set
  can_view = true,
  can_create = false,
  can_edit = false,
  can_delete = false,
  can_export = false,
  can_audit = false,
  updated_at = now()
where module_key = 'communications'
  and role_key in ('reviewer', 'viewer');

-- Iwapo hakuna mawasiliano ya zamani kwenye matrix (mfumo wa majaribio), weka chanzo cha msingi.
insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select v.role_key, 'communications', v.can_view, v.can_create, v.can_edit, v.can_delete, v.can_export, v.can_audit
from (values
  ('super_admin', true, true, true, true, true, false),
  ('chief_admin', true, true, true, true, true, false),
  ('national_admin', true, true, true, true, true, false),
  ('office_admin', true, true, true, false, true, false),
  ('finance_admin', true, true, true, false, true, false),
  ('secretary', true, true, true, false, true, false),
  ('approver', true, false, true, false, true, false),
  ('reviewer', true, false, false, false, false, false),
  ('viewer', true, false, false, false, false, false)
) as v(role_key, can_view, can_create, can_edit, can_delete, can_export, can_audit)
where not exists (select 1 from public.portal_module_matrix where module_key = 'communications')
on conflict (role_key, module_key) do nothing;
