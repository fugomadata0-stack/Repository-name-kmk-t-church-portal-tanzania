-- Realtime kamili: ongeza jedwali muhimu kwenye `supabase_realtime` + replica identity (updates sahihi).

do $$
declare
  t text;
  tables text[] := array[
    'notifications',
    'notification_reads',
    'system_alerts',
    'site_settings',
    'about_kmkt',
    'live_streams',
    'communications',
    'developer_profile',
    'aid_requests',
    'aid_beneficiaries',
    'aid_disbursements'
  ];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach t in array tables
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end if;
  end loop;
end $$;

do $$
declare
  t text;
  tables text[] := array[
    'notifications',
    'notification_reads',
    'system_alerts',
    'site_settings',
    'about_kmkt',
    'live_streams',
    'communications',
    'developer_profile',
    'aid_requests',
    'aid_beneficiaries',
    'aid_disbursements'
  ];
begin
  foreach t in array tables
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table if exists public.%I replica identity full', t);
    end if;
  end loop;
end $$;
