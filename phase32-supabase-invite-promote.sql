-- Phase 32 — optional Supabase schema (align with phase32-invite-promote-services.js)
-- Run after core auth/profiles.
-- Then run: `phase32-invite-promote-rls.sql` for RLS policies.

create table if not exists public.phase32_invitations (
  id text primary key,
  invite_token text unique not null,
  full_name text not null,
  email text not null,
  phone text,
  invite_type text not null,
  role_to_assign text,
  primary_role text,
  additional_roles text,
  assigned_level text,
  assigned_unit text,
  slot_number text,
  start_date date,
  end_date date,
  temp_or_permanent text,
  notes text,
  invite_expiry date,
  status text not null default 'Rasimu',
  created_at timestamptz default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  approved_by text,
  save_as_draft boolean default false
);

create table if not exists public.phase32_promotions (
  id text primary key,
  user_name text not null,
  user_email text,
  current_roles text,
  new_role text not null,
  promotion_type text,
  assigned_level text,
  assigned_unit text,
  start_date date,
  end_date date,
  reason text,
  notes text,
  approval_needed boolean default true,
  status text not null,
  submitted_at timestamptz default now(),
  approved_by text,
  save_as_draft boolean default false
);

create table if not exists public.phase32_permission_layers (
  id text primary key,
  user_name text not null,
  user_email text,
  primary_role text,
  layer text not null,
  scope text,
  unit text,
  start_date date,
  end_date date,
  temp_or_permanent text,
  reason text,
  notes text,
  status text not null,
  submitted_at timestamptz default now(),
  approved_by text,
  save_as_draft boolean default false
);

create table if not exists public.phase32_replacements (
  id text primary key,
  current_user text not null,
  replacement_user text,
  replacement_is_invite boolean default false,
  effective_date date,
  immediate boolean default true,
  transfer_pending_tasks boolean default false,
  reason text,
  notes text,
  status text not null,
  created_at timestamptz default now(),
  approved_by text
);

create index if not exists idx_phase32_inv_email on public.phase32_invitations (lower(email));
create index if not exists idx_phase32_inv_status on public.phase32_invitations (status);

comment on table public.phase32_invitations is 'KMK(T) admin invites — localStorage mirror kmt_phase32_invite_promote_v1';
