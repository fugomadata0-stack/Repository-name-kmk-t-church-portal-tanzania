-- Misaada ya Kanisa / Aid Management — beneficiaries, requests, disbursements, RBAC, notification RPC.

-- ——— RPC: enqueue notification bila hitaji la ruhusa ya moduli ya Notifications ———

create or replace function public.portal_enqueue_notification(
  p_title text,
  p_message text,
  p_type text default 'system',
  p_target_role text default null,
  p_target_user_id uuid default null,
  p_is_global boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
  v_type text;
begin
  v_type := coalesce(nullif(trim(p_type), ''), 'system');
  if v_type not in ('info', 'success', 'warning', 'error', 'event', 'finance', 'system') then
    v_type := 'system';
  end if;
  insert into public.notifications (title, message, type, target_role, target_user_id, is_global, created_by, is_read)
  values (
    left(trim(p_title), 500),
    trim(p_message),
    v_type,
    nullif(trim(p_target_role), ''),
    p_target_user_id,
    coalesce(p_is_global, false),
    auth.uid(),
    false
  )
  returning id into nid;
  return nid;
end;
$$;

revoke all on function public.portal_enqueue_notification(text, text, text, text, uuid, boolean) from public;
grant execute on function public.portal_enqueue_notification(text, text, text, text, uuid, boolean) to authenticated;

-- ——— aid_categories (reference / seed) ———

create table if not exists public.aid_categories (
  id uuid primary key default gen_random_uuid(),
  name_sw text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (name_sw)
);

insert into public.aid_categories (name_sw, sort_order) values
  ('Wazee', 10),
  ('Wajane', 20),
  ('Yatima', 30),
  ('Walemavu', 40),
  ('Watoto', 50),
  ('Vijana', 60),
  ('Wagonjwa', 70),
  ('Familia zenye uhitaji', 80),
  ('Wengine', 90)
on conflict (name_sw) do nothing;

-- ——— aid_beneficiaries ———

create table if not exists public.aid_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  gender text not null default ''
    check (gender in ('male', 'female', 'other', '')),
  phone text not null default '',
  address text not null default '',
  group_category text not null default 'Wengine'
    check (group_category in (
      'Wazee', 'Wajane', 'Yatima', 'Walemavu', 'Watoto', 'Vijana', 'Wagonjwa', 'Familia zenye uhitaji', 'Wengine'
    )),
  special_condition text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users (id) on delete set null
);

create index if not exists aid_beneficiaries_name_idx on public.aid_beneficiaries (lower(full_name));
create index if not exists aid_beneficiaries_phone_idx on public.aid_beneficiaries (phone);

-- ——— aid_requests ———

create table if not exists public.aid_requests (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.aid_beneficiaries (id) on delete restrict,
  aid_type text not null default 'other'
    check (aid_type in ('cash', 'food', 'medical', 'education', 'clothes', 'shelter', 'other')),
  description text not null default '',
  amount numeric(14, 2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  urgency_level text not null default 'medium'
    check (urgency_level in ('low', 'medium', 'high', 'emergency')),
  request_date date not null default (now()::date),
  request_month text generated always as (
    extract(year from request_date)::text || '-' ||
    lpad(extract(month from request_date)::text, 2, '0')
  ) stored,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'review', 'approved', 'rejected', 'completed')),
  reviewed_by text not null default '',
  review_notes text not null default '',
  review_date date null,
  approved_by text not null default '',
  approved_signature text not null default '',
  approval_notes text not null default '',
  approved_at timestamptz null,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users (id) on delete set null
);

create index if not exists aid_requests_beneficiary_idx on public.aid_requests (beneficiary_id);
create index if not exists aid_requests_status_idx on public.aid_requests (status);
create index if not exists aid_requests_urgency_idx on public.aid_requests (urgency_level);

-- Vipengele vya uendelezaji: safu zisizokuwepo (ADD IF NOT EXISTS)
alter table public.aid_beneficiaries add column if not exists special_condition text not null default '';
alter table public.aid_requests add column if not exists urgency_level text not null default 'medium';
alter table public.aid_requests add column if not exists review_notes text not null default '';
alter table public.aid_requests add column if not exists review_date date;
alter table public.aid_requests add column if not exists approval_status text not null default 'pending';
alter table public.aid_requests add column if not exists completed_at timestamptz;

do $m$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'aid_requests' and column_name = 'request_month'
  ) then
    alter table public.aid_requests
      add column request_month text
      generated always as (
        extract(year from request_date)::text || '-' ||
        lpad(extract(month from request_date)::text, 2, '0')
      ) stored;
  end if;
end;
$m$;

create index if not exists aid_requests_month_idx on public.aid_requests (request_month);

-- ——— aid_disbursements (delivery / completion) ———

create table if not exists public.aid_disbursements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.aid_requests (id) on delete cascade,
  delivered_by text not null default '',
  delivered_at timestamptz null,
  delivery_method text not null default 'physical_items'
    check (delivery_method in ('cash', 'mobile_money', 'bank', 'physical_items')),
  delivery_reference text not null default '',
  delivery_notes text not null default '',
  recipient_confirmation text not null default '',
  amount_delivered numeric(14, 2) null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id)
);

create index if not exists aid_disbursements_request_idx on public.aid_disbursements (request_id);

alter table public.aid_disbursements add column if not exists delivery_reference text not null default '';
alter table public.aid_disbursements add column if not exists recipient_confirmation text not null default '';
alter table public.aid_disbursements add column if not exists completed_at timestamptz null;

-- ——— updated_at triggers ———

create or replace function public.aid_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists aid_beneficiaries_touch on public.aid_beneficiaries;
create trigger aid_beneficiaries_touch
  before update on public.aid_beneficiaries
  for each row execute procedure public.aid_touch_updated_at();

drop trigger if exists aid_requests_touch on public.aid_requests;
create trigger aid_requests_touch
  before update on public.aid_requests
  for each row execute procedure public.aid_touch_updated_at();

drop trigger if exists aid_disbursements_touch on public.aid_disbursements;
create trigger aid_disbursements_touch
  before update on public.aid_disbursements
  for each row execute procedure public.aid_touch_updated_at();

-- ——— RLS ———

alter table public.aid_categories enable row level security;
alter table public.aid_beneficiaries enable row level security;
alter table public.aid_requests enable row level security;
alter table public.aid_disbursements enable row level security;

revoke all on table public.aid_categories from anon;
revoke all on table public.aid_beneficiaries from anon;
revoke all on table public.aid_requests from anon;
revoke all on table public.aid_disbursements from anon;

grant select on table public.aid_categories to authenticated;
grant select, insert, update, delete on table public.aid_beneficiaries to authenticated;
grant select, insert, update, delete on table public.aid_requests to authenticated;
grant select, insert, update, delete on table public.aid_disbursements to authenticated;

drop policy if exists "aid_categories_select_auth_rbac" on public.aid_categories;
create policy "aid_categories_select_auth_rbac"
  on public.aid_categories for select to authenticated
  using (public.portal_has_module_capability('aid_management', 'view'));

drop policy if exists "aid_beneficiaries_select_auth_rbac" on public.aid_beneficiaries;
create policy "aid_beneficiaries_select_auth_rbac"
  on public.aid_beneficiaries for select to authenticated
  using (public.portal_has_module_capability('aid_management', 'view'));

drop policy if exists "aid_beneficiaries_insert_auth_rbac" on public.aid_beneficiaries;
create policy "aid_beneficiaries_insert_auth_rbac"
  on public.aid_beneficiaries for insert to authenticated
  with check (public.portal_has_module_capability('aid_management', 'create'));

drop policy if exists "aid_beneficiaries_update_auth_rbac" on public.aid_beneficiaries;
create policy "aid_beneficiaries_update_auth_rbac"
  on public.aid_beneficiaries for update to authenticated
  using (public.portal_has_module_capability('aid_management', 'edit'))
  with check (public.portal_has_module_capability('aid_management', 'edit'));

drop policy if exists "aid_beneficiaries_delete_auth_rbac" on public.aid_beneficiaries;
create policy "aid_beneficiaries_delete_auth_rbac"
  on public.aid_beneficiaries for delete to authenticated
  using (public.portal_has_module_capability('aid_management', 'delete'));

drop policy if exists "aid_requests_select_auth_rbac" on public.aid_requests;
create policy "aid_requests_select_auth_rbac"
  on public.aid_requests for select to authenticated
  using (public.portal_has_module_capability('aid_management', 'view'));

drop policy if exists "aid_requests_insert_auth_rbac" on public.aid_requests;
create policy "aid_requests_insert_auth_rbac"
  on public.aid_requests for insert to authenticated
  with check (public.portal_has_module_capability('aid_management', 'create'));

drop policy if exists "aid_requests_update_auth_rbac" on public.aid_requests;
create policy "aid_requests_update_auth_rbac"
  on public.aid_requests for update to authenticated
  using (public.portal_has_module_capability('aid_management', 'edit'))
  with check (public.portal_has_module_capability('aid_management', 'edit'));

drop policy if exists "aid_requests_delete_auth_rbac" on public.aid_requests;
create policy "aid_requests_delete_auth_rbac"
  on public.aid_requests for delete to authenticated
  using (public.portal_has_module_capability('aid_management', 'delete'));

drop policy if exists "aid_disbursements_select_auth_rbac" on public.aid_disbursements;
create policy "aid_disbursements_select_auth_rbac"
  on public.aid_disbursements for select to authenticated
  using (public.portal_has_module_capability('aid_management', 'view'));

drop policy if exists "aid_disbursements_insert_auth_rbac" on public.aid_disbursements;
create policy "aid_disbursements_insert_auth_rbac"
  on public.aid_disbursements for insert to authenticated
  with check (public.portal_has_module_capability('aid_management', 'edit'));

drop policy if exists "aid_disbursements_update_auth_rbac" on public.aid_disbursements;
create policy "aid_disbursements_update_auth_rbac"
  on public.aid_disbursements for update to authenticated
  using (public.portal_has_module_capability('aid_management', 'edit'))
  with check (public.portal_has_module_capability('aid_management', 'edit'));

drop policy if exists "aid_disbursements_delete_auth_rbac" on public.aid_disbursements;
create policy "aid_disbursements_delete_auth_rbac"
  on public.aid_disbursements for delete to authenticated
  using (public.portal_has_module_capability('aid_management', 'delete'));

-- ——— RBAC matrix: aid_management ———

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
) values
('super_admin', 'aid_management', true, true, true, true, true, true),
('chief_admin', 'aid_management', true, true, true, true, true, true),
('national_admin', 'aid_management', true, true, true, true, true, true),
('office_admin', 'aid_management', true, true, true, false, true, false),
('finance_admin', 'aid_management', true, false, true, false, true, true),
('secretary', 'aid_management', true, true, true, false, true, false),
('approver', 'aid_management', true, false, true, false, true, false),
('reviewer', 'aid_management', true, false, true, false, true, false),
('dayosisi_admin', 'aid_management', true, true, true, false, true, false),
('jimbo_admin', 'aid_management', true, true, true, false, true, false),
('tawi_admin', 'aid_management', true, true, true, false, true, false),
('viewer', 'aid_management', true, false, false, false, true, false)
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();
