-- KMK(T) Step 15 — Supabase safety reconcile (additive, idempotent, production-safe)
-- Fixes: PGRST204 schema cache drift, permission denied (grants), missing buckets

-- ——— 1) Columns referenced by PostgREST / frontend (IF NOT EXISTS) ———

alter table if exists public.audit_logs
  add column if not exists action_category text;

alter table if exists public.documents
  add column if not exists is_public boolean not null default false;

alter table if exists public.gallery
  add column if not exists is_public boolean not null default false;

alter table if exists public.videos
  add column if not exists is_public boolean not null default false;

alter table if exists public.audios
  add column if not exists is_public boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'phase33_signup_requests'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'phase33_signup_requests'
      and column_name = 'dynamic_payload'
  ) then
    alter table public.phase33_signup_requests
      add column dynamic_payload jsonb not null default '{}'::jsonb;
  end if;
exception when others then null;
end $$;

-- ——— 2) Grants (Data API + RLS) ———

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'audit_logs') then
    grant select, insert on public.audit_logs to authenticated;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'portal_upload_registry') then
    grant select, insert, update on public.portal_upload_registry to authenticated;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'portal_security_audit_logs') then
    grant select, insert on public.portal_security_audit_logs to authenticated;
  end if;
exception when others then null;
end $$;

grant select (id, title, image_url, category, created_at, is_public, status) on public.gallery to anon;
grant select (id, title, video_url, thumbnail_url, created_at, is_public, status) on public.videos to anon;
grant select (id, title, audio_url, created_at, is_public, status) on public.audios to anon;
grant select (id, title, category, created_at, status, is_public) on public.documents to anon;

-- ——— 3) Storage buckets (15 rasmi — on conflict do update) ———

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-gallery', 'church-gallery', true, 31457280,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-videos', 'church-videos', true, 20971520,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-audio', 'church-audio', true, 125829120,
  array['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/webm','audio/aac','application/octet-stream']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-events-media', 'church-events-media', true, 26214400,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-images', 'church-images', true, 31457280,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/svg+xml','image/heic','image/heif','image/avif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-media', 'church-media', true, 524288000,
  array['video/mp4','video/webm','audio/mpeg','audio/mp3','audio/wav','application/octet-stream']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-files', 'church-files', true, 157286400,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/zip','application/octet-stream']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-documents', 'church-documents', true, 104857600,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/zip']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'developer-photos', 'developer-photos', true, 26214400,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership-cv-attachments', 'leadership-cv-attachments', false, 104857600,
  array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership-certificate-assets', 'leadership-certificate-assets', false, 26214400,
  array['application/pdf','image/jpeg','image/png','image/webp','image/gif','image/svg+xml']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets', 'site-assets', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf','text/plain']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'structure-leaders', 'structure-leaders', false, 52428800,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portal-uploads', 'portal-uploads', true, 262144000,
  array['application/pdf','image/jpeg','image/png','video/mp4','audio/mpeg','application/octet-stream']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificates', 'certificates', true, 157286400,
  array['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ——— 4) Storage policies (public buckets: anon read) ———

drop policy if exists "public_portal_buckets_read_anon" on storage.objects;
create policy "public_portal_buckets_read_anon"
  on storage.objects for select to anon
  using (
    bucket_id in (
      'developer-photos',
      'church-documents',
      'church-events-media',
      'church-gallery',
      'church-videos',
      'church-audio',
      'church-files',
      'church-images',
      'church-media',
      'site-assets',
      'portal-uploads',
      'certificates'
    )
  );

-- ——— 5) Public RPC grants (idempotent) ———

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'portal_public_gallery_list'
  ) then
    grant execute on function public.portal_public_gallery_list(int) to anon, authenticated;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'portal_public_projects_list'
  ) then
    grant execute on function public.portal_public_projects_list(int) to anon, authenticated;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'portal_public_national_leadership'
  ) then
    grant execute on function public.portal_public_national_leadership() to anon, authenticated;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'portal_audit_dashboard_summary'
  ) then
    grant execute on function public.portal_audit_dashboard_summary(int) to authenticated;
  end if;
exception when others then null;
end $$;

notify pgrst, 'reload schema';
