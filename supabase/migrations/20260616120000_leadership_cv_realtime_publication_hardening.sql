-- Uhakikishaji wa Realtime (cloud): ongeza jedwali za CV kwenye publication ikiwa bado hazipo.
-- Inafuata mchoro wa pg_publication_tables (sawa na structure_leaders_maps_realtime).

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_profiles'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_profiles';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_experience'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_experience';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_education'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_education';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_certificates'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_certificates';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_skills'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_skills';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_attachments'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_attachments';
    end if;
  end if;
end $$;

-- Realtime inategemea WAL: REPLICA IDENTITY FULL inarahisisha matukio ya UPDATE/DELETE yenye data ya awali (bora kwa cloud).
alter table if exists public.leadership_profiles replica identity full;
alter table if exists public.leadership_experience replica identity full;
alter table if exists public.leadership_education replica identity full;
alter table if exists public.leadership_certificates replica identity full;
alter table if exists public.leadership_skills replica identity full;
alter table if exists public.leadership_attachments replica identity full;
