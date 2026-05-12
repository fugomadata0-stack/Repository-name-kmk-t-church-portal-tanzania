-- Professional realtime completion for dashboard-critical tables.
-- Ensures dashboard subscriptions map to actual published tables.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance_records') then
      execute 'alter publication supabase_realtime add table public.attendance_records';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance_sessions') then
      execute 'alter publication supabase_realtime add table public.attendance_sessions';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audios') then
      execute 'alter publication supabase_realtime add table public.audios';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audit_logs') then
      execute 'alter publication supabase_realtime add table public.audit_logs';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_families') then
      execute 'alter publication supabase_realtime add table public.church_families';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_finance_entries') then
      execute 'alter publication supabase_realtime add table public.church_finance_entries';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_income_lines') then
      execute 'alter publication supabase_realtime add table public.church_income_lines';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_income_sources') then
      execute 'alter publication supabase_realtime add table public.church_income_sources';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_jimbo') then
      execute 'alter publication supabase_realtime add table public.church_jimbo';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_members') then
      execute 'alter publication supabase_realtime add table public.church_members';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_tawi') then
      execute 'alter publication supabase_realtime add table public.church_tawi';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dayosisi') then
      execute 'alter publication supabase_realtime add table public.dayosisi';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents') then
      execute 'alter publication supabase_realtime add table public.documents';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events') then
      execute 'alter publication supabase_realtime add table public.events';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'file_manager_items') then
      execute 'alter publication supabase_realtime add table public.file_manager_items';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gallery') then
      execute 'alter publication supabase_realtime add table public.gallery';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'news_posts') then
      execute 'alter publication supabase_realtime add table public.news_posts';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_directory_profiles') then
      execute 'alter publication supabase_realtime add table public.portal_directory_profiles';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_domain_entities') then
      execute 'alter publication supabase_realtime add table public.portal_domain_entities';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_module_matrix') then
      execute 'alter publication supabase_realtime add table public.portal_module_matrix';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_visibility_rules') then
      execute 'alter publication supabase_realtime add table public.portal_visibility_rules';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sermons') then
      execute 'alter publication supabase_realtime add table public.sermons';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'videos') then
      execute 'alter publication supabase_realtime add table public.videos';
    end if;
  end if;
end $$;

alter table if exists public.attendance_records replica identity full;
alter table if exists public.attendance_sessions replica identity full;
alter table if exists public.audios replica identity full;
alter table if exists public.audit_logs replica identity full;
alter table if exists public.church_families replica identity full;
alter table if exists public.church_finance_entries replica identity full;
alter table if exists public.church_income_lines replica identity full;
alter table if exists public.church_income_sources replica identity full;
alter table if exists public.church_jimbo replica identity full;
alter table if exists public.church_members replica identity full;
alter table if exists public.church_tawi replica identity full;
alter table if exists public.dayosisi replica identity full;
alter table if exists public.documents replica identity full;
alter table if exists public.events replica identity full;
alter table if exists public.file_manager_items replica identity full;
alter table if exists public.gallery replica identity full;
alter table if exists public.news_posts replica identity full;
alter table if exists public.portal_directory_profiles replica identity full;
alter table if exists public.portal_domain_entities replica identity full;
alter table if exists public.portal_module_matrix replica identity full;
alter table if exists public.portal_visibility_rules replica identity full;
alter table if exists public.sermons replica identity full;
alter table if exists public.videos replica identity full;
