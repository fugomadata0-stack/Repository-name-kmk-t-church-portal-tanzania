-- PHASE33 SIGNUP RLS HARDENING (PRODUCTION SAFE)

begin;

-- Ensure RLS is enabled
alter table public.phase33_signup_requests enable row level security;

-- Table privileges: public can insert only
revoke all on table public.phase33_signup_requests from anon, authenticated;
grant insert on table public.phase33_signup_requests to anon, authenticated;

-- Drop potentially conflicting old policies
drop policy if exists "phase33_signup_public_insert_pending" on public.phase33_signup_requests;
drop policy if exists "p33_signup_insert_public" on public.phase33_signup_requests;
drop policy if exists "phase33_signup_admin_select" on public.phase33_signup_requests;
drop policy if exists "phase33_signup_admin_update" on public.phase33_signup_requests;
drop policy if exists "phase33_signup_admin_delete" on public.phase33_signup_requests;

-- Public insert policy: pending only + basic input validation + duplicate pending prevention
create policy "phase33_signup_public_insert_pending"
on public.phase33_signup_requests
for insert
to anon, authenticated
with check (
  coalesce(status, 'pending') = 'pending'
  and length(trim(coalesce(full_name, ''))) >= 3
  and length(trim(coalesce(email, ''))) >= 6
  and position('@' in coalesce(email, '')) > 1
  and length(trim(coalesce(requested_role, ''))) >= 2
  and length(trim(coalesce(request_reason, ''))) >= 5
  and length(regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g')) between 9 and 15
  and not exists (
    select 1
    from public.phase33_signup_requests p
    where lower(trim(p.email)) = lower(trim(phase33_signup_requests.email))
      and coalesce(p.status, 'pending') = 'pending'
  )
);

-- Admin read access
create policy "phase33_signup_admin_select"
on public.phase33_signup_requests
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
);

-- Admin update access
create policy "phase33_signup_admin_update"
on public.phase33_signup_requests
for update
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
);

-- Admin delete access
create policy "phase33_signup_admin_delete"
on public.phase33_signup_requests
for delete
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
);

commit;
