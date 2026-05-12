-- Master settings hub: broadcast INSERT/UPDATE so Realtime clients refresh branding/PDF cache without stale localStorage-only reads.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_master_settings'
    ) then
      execute 'alter publication supabase_realtime add table public.portal_master_settings';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_theme_settings'
    ) then
      execute 'alter publication supabase_realtime add table public.portal_theme_settings';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_template_settings'
    ) then
      execute 'alter publication supabase_realtime add table public.portal_template_settings';
    end if;
  end if;
end $$;

alter table if exists public.portal_master_settings replica identity full;
alter table if exists public.portal_theme_settings replica identity full;
alter table if exists public.portal_template_settings replica identity full;
