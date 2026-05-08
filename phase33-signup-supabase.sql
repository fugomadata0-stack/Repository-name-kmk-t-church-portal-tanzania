-- Phase 33: public dynamic sign-up requests (approval based)

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

-- Kumbuka: endesha `phase33-password-validation-supabase.sql` na kisha
-- `phase33-auth-hooks-supabase.sql` ukiwezesha Auth Hooks kwenye Dashboard.
