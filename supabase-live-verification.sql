-- KMK(T) Supabase Live Verification Pack
-- Run these queries in Supabase SQL Editor after migrations.

-- 1) Confirm key public tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'phase32_invitations',
    'phase32_promotions',
    'phase32_permission_layers',
    'phase32_replacements',
    'elevated_access_requests',
    'elevated_access_assignments'
  )
order by table_name;

-- 2) Count all public tables (sanity check)
select count(*) as public_table_count
from information_schema.tables
where table_schema = 'public';

-- 3) Confirm RLS enabled on critical tables
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'phase32_invitations',
    'phase32_promotions',
    'phase32_permission_layers',
    'phase32_replacements',
    'elevated_access_requests',
    'elevated_access_assignments'
  )
order by tablename;

-- 4) Confirm policies exist for critical tables
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'phase32_invitations',
    'phase32_promotions',
    'phase32_permission_layers',
    'phase32_replacements',
    'elevated_access_requests',
    'elevated_access_assignments'
  )
order by tablename, policyname;

-- 5) Quick read health for phase32 tables
select
  (select count(*) from public.phase32_invitations) as invitations_count,
  (select count(*) from public.phase32_promotions) as promotions_count,
  (select count(*) from public.phase32_permission_layers) as permission_layers_count,
  (select count(*) from public.phase32_replacements) as replacements_count;

-- 6) Quick read health for elevated access tables (if present)
-- If these tables are absent in your project variant, this query may error.
-- Comment out this block if your schema uses different names.
select
  (select count(*) from public.elevated_access_requests) as elevated_requests_count,
  (select count(*) from public.elevated_access_assignments) as elevated_assignments_count;
