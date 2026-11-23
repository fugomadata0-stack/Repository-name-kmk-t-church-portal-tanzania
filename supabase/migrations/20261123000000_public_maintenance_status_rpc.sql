-- Public, minimal maintenance status endpoint.
-- Exposes only the maintenance flag and display message; no other site settings.
create or replace function public.get_public_maintenance_status()
returns table (maintenance_enabled boolean, maintenance_message text)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(s.maintenance_mode, false),
    coalesce(nullif(trim(s.maintenance_message), ''), '')
  from public.site_settings s
  order by s.updated_at desc nulls last
  limit 1;
$$;

revoke all on function public.get_public_maintenance_status() from public;
grant execute on function public.get_public_maintenance_status() to anon, authenticated;
