-- PHASE 10 migration validation runner
-- NOTE:
-- 1) Run `phase10-supabase-national-core.sql`
-- 2) Run `phase10-security-national-rls.sql`
-- 3) Run this file to validate deployment

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'church_settings') then
    raise exception 'Missing table: church_settings';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'dioceses') then
    raise exception 'Missing table: dioceses';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'members') then
    raise exception 'Missing table: members';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'audit_logs') then
    raise exception 'Missing table: audit_logs';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'custom_fields') then
    raise exception 'Missing table: custom_fields';
  end if;
end $$;

select 'phase10_schema_ok' as check_name, count(*) as dioceses_count
from public.dioceses;

select 'phase10_roles_ok' as check_name, count(*) as role_count
from public.user_roles;

select 'phase10_seed_leader_ok' as check_name, count(*) as leader_count
from public.national_leaders
where full_name ilike '%SOSPITER MASAMAKI CHANGURU%';
