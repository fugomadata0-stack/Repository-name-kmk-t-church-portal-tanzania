-- PHASE 31: Elevated access requests (roles / permission layers / temporary acting)
-- Run after auth.users exists. Pair with phase31-elevated-access-rls.sql for policies.

create table if not exists public.elevated_access_requests (
  id text primary key,
  owner_user_key text not null,
  applicant_name text not null,
  email text not null,
  phone text,
  current_roles text,
  current_scope text,
  request_category text not null,
  requested_role_permission text not null,
  requested_level text,
  requested_unit text,
  justification text,
  start_date date,
  end_date date,
  notes text,
  supporting_letter text,
  status_sw text not null default 'Rasimu',
  submitted_at timestamptz,
  reviewed_by text,
  timeline jsonb not null default '[]'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists elevated_access_requests_email_idx on public.elevated_access_requests (email);
create index if not exists elevated_access_requests_status_idx on public.elevated_access_requests (status_sw);
create index if not exists elevated_access_requests_owner_idx on public.elevated_access_requests (owner_user_key);

create table if not exists public.elevated_access_assignments (
  id text primary key,
  request_id text references public.elevated_access_requests (id) on delete set null,
  owner_user_key text,
  applicant_name text,
  role_permission text not null,
  level text,
  unit text,
  start_date date,
  expiry_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists elevated_access_assignments_request_idx on public.elevated_access_assignments (request_id);
create index if not exists elevated_access_assignments_owner_idx on public.elevated_access_assignments (owner_user_key);

create table if not exists public.elevated_access_routing (
  id bigserial primary key,
  request_type text not null,
  route text not null,
  module_hint text,
  created_at timestamptz not null default now()
);

-- Optional display name for attachment (path/URL stored in supporting_letter)
alter table public.elevated_access_requests add column if not exists supporting_letter_name text;
