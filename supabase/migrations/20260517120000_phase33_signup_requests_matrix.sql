-- Phase 33: maombi ya usajili wa umma + matrix ya moduli registration_requests

-- ——— jedwali (ikiwa halipo) ———
create table if not exists public.phase33_signup_requests (
  id text primary key,
  full_name text not null,
  gender text,
  phone text not null,
  email text not null,
  requested_role text not null,
  request_reason text not null,
  previous_responsibility text,
  requested_scope text,
  unit_name text,
  dynamic_payload jsonb default '{}'::jsonb,
  status text not null default 'Pending Approval',
  verification_flag text default '',
  submitted_at timestamptz default now()
);

create unique index if not exists uq_phase33_email_phone_pending
on public.phase33_signup_requests (lower(email), phone, requested_role)
where status in ('Submitted','Pending Approval','Under Review','Needs Correction');

create index if not exists idx_phase33_status on public.phase33_signup_requests (status);
create index if not exists idx_phase33_submitted_at on public.phase33_signup_requests (submitted_at desc);

-- ——— RPC za nenosiri ———
create or replace function public.phase33_analyze_password(p text)
returns jsonb
language sql
immutable
security invoker
set search_path = public
as $$
  with s as (select coalesce(p, '') as t),
  d as (
    select
      char_length(s.t) as len,
      (s.t ~ '^[A-Z]') as first_upper,
      (s.t ~ '[a-z]') as has_lower,
      (s.t ~ '[@#$!]') as has_special,
      char_length(regexp_replace(s.t, '[^0-9]', '', 'g')) as digit_count
    from s
  )
  select jsonb_build_object(
    'length', d.len >= 8,
    'firstUpper', d.first_upper,
    'hasLower', d.has_lower,
    'hasSpecial', d.has_special,
    'fourDigits', d.digit_count >= 4,
    'valid', d.len >= 8 and d.first_upper and d.has_lower and d.has_special and d.digit_count >= 4,
    'digitCount', d.digit_count
  )
  from d;
$$;

create or replace function public.phase33_password_valid(p text)
returns boolean
language sql
immutable
security invoker
set search_path = public
as $$
  select coalesce((phase33_analyze_password(p) ->> 'valid')::boolean, false);
$$;

grant execute on function public.phase33_analyze_password(text) to anon, authenticated;
grant execute on function public.phase33_password_valid(text) to anon, authenticated;

-- ——— RLS ———
alter table if exists public.phase33_signup_requests enable row level security;

revoke all on table public.phase33_signup_requests from public;
grant insert on table public.phase33_signup_requests to anon;
grant select, insert, update, delete on table public.phase33_signup_requests to authenticated;
grant all on table public.phase33_signup_requests to service_role;

drop policy if exists "p33_signup_insert_public" on public.phase33_signup_requests;
create policy "p33_signup_insert_public"
on public.phase33_signup_requests
for insert
to anon, authenticated
with check (
  requested_role in (
    'Diocese Data Officer',
    'Jimbo Data Officer',
    'Branch Data Officer',
    'Department Officer',
    'Fellowship Officer',
    'Choir Officer',
    'Institution Officer',
    'Events Officer',
    'Publications/Media Officer',
    'Viewer / Mtazamaji'
  )
);

drop policy if exists "p33_signup_select_admin" on public.phase33_signup_requests;
create policy "p33_signup_select_admin"
on public.phase33_signup_requests
for select
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'admin', 'office_admin'));

drop policy if exists "p33_signup_update_admin" on public.phase33_signup_requests;
create policy "p33_signup_update_admin"
on public.phase33_signup_requests
for update
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'))
with check (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "p33_signup_delete_admin" on public.phase33_signup_requests;
create policy "p33_signup_delete_admin"
on public.phase33_signup_requests
for delete
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'));

-- ——— RBAC matrix: fungamanisha na usalama ———
insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select
  role_key,
  'registration_requests',
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_audit
from public.portal_module_matrix
where module_key = 'usalama'
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();
