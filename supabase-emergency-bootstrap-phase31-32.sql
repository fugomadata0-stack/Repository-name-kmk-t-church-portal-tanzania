-- KMK(T) Emergency Bootstrap: Phase 31 + Phase 32 core tables
-- Use this only if standard migration order failed or was run on wrong project.
-- Safe to re-run (uses IF NOT EXISTS and guarded policy creation).

begin;

-- =========================
-- Phase 31 (Elevated Access)
-- =========================
create table if not exists public.elevated_access_requests (
  id text primary key,
  requester_name text,
  requester_email text,
  requester_role text,
  requested_role text,
  permission_layer text,
  scope text,
  unit text,
  reason text,
  notes text,
  status text default 'Inasubiri',
  start_date date,
  end_date date,
  temp_or_permanent text default 'Temporary',
  approved_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.elevated_access_assignments (
  id text primary key,
  request_id text,
  user_name text,
  user_email text,
  current_role text,
  assigned_role text,
  permission_layer text,
  scope text,
  unit text,
  status text default 'Active',
  start_date date,
  end_date date,
  temp_or_permanent text default 'Temporary',
  approved_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.elevated_access_routing (
  id text primary key,
  route_key text,
  required_role text,
  required_layer text,
  scope text,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================
-- Phase 32 (Invite/Promote)
-- =========================
create table if not exists public.phase32_invitations (
  id text primary key,
  invite_token text,
  full_name text,
  email text,
  phone text,
  invite_type text,
  role_to_assign text,
  primary_role text,
  additional_roles text,
  assigned_level text,
  assigned_unit text,
  slot_number text,
  start_date date,
  end_date date,
  temp_or_permanent text default 'Permanent',
  notes text,
  invite_expiry date,
  status text default 'Rasimu',
  created_at timestamptz default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  approved_by text,
  save_as_draft boolean default false
);

create table if not exists public.phase32_promotions (
  id text primary key,
  user_name text,
  user_email text,
  current_roles text,
  new_role text,
  promotion_type text,
  assigned_level text,
  assigned_unit text,
  start_date date,
  end_date date,
  reason text,
  notes text,
  approval_needed boolean default true,
  status text default 'Rasimu',
  submitted_at timestamptz default now(),
  approved_by text,
  save_as_draft boolean default false
);

create table if not exists public.phase32_permission_layers (
  id text primary key,
  user_name text,
  user_email text,
  primary_role text,
  layer text,
  scope text,
  unit text,
  start_date date,
  end_date date,
  temp_or_permanent text default 'Permanent',
  reason text,
  notes text,
  status text default 'Rasimu',
  submitted_at timestamptz default now(),
  approved_by text,
  save_as_draft boolean default false
);

create table if not exists public.phase32_replacements (
  id text primary key,
  current_user text,
  replacement_user text,
  replacement_is_invite boolean default false,
  effective_date date,
  immediate boolean default true,
  transfer_pending_tasks boolean default false,
  reason text,
  notes text,
  status text default 'Inasubiri',
  created_at timestamptz default now(),
  approved_by text
);

-- =========================
-- RLS + temporary permissive policies
-- (stabilize first; tighten later with project-specific policies)
-- =========================
alter table public.elevated_access_requests enable row level security;
alter table public.elevated_access_assignments enable row level security;
alter table public.elevated_access_routing enable row level security;
alter table public.phase32_invitations enable row level security;
alter table public.phase32_promotions enable row level security;
alter table public.phase32_permission_layers enable row level security;
alter table public.phase32_replacements enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='elevated_access_requests' and policyname='ea_req_auth_all') then
    create policy ea_req_auth_all on public.elevated_access_requests for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='elevated_access_assignments' and policyname='ea_asg_auth_all') then
    create policy ea_asg_auth_all on public.elevated_access_assignments for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='elevated_access_routing' and policyname='ea_route_auth_all') then
    create policy ea_route_auth_all on public.elevated_access_routing for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='phase32_invitations' and policyname='p32_inv_auth_all') then
    create policy p32_inv_auth_all on public.phase32_invitations for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='phase32_promotions' and policyname='p32_pro_auth_all') then
    create policy p32_pro_auth_all on public.phase32_promotions for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='phase32_permission_layers' and policyname='p32_lay_auth_all') then
    create policy p32_lay_auth_all on public.phase32_permission_layers for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='phase32_replacements' and policyname='p32_rep_auth_all') then
    create policy p32_rep_auth_all on public.phase32_replacements for all to authenticated using (true) with check (true);
  end if;
end $$;

commit;

-- Post-check (optional)
-- select table_schema, table_name from information_schema.tables
-- where table_schema='public' and (table_name like 'phase32_%' or table_name like 'elevated_access_%')
-- order by table_name;
