-- Phase 33 RLS
-- Inategemea public.current_app_role() kutoka phase16-security-rls.sql

alter table if exists public.phase33_signup_requests enable row level security;

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
