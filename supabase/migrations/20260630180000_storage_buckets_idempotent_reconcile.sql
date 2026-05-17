-- Idempotent reconcile: buckets 15 rasmi za KMK(T) National Church Portal.
-- Inalingana na app-next/src/config/storageBuckets.ts
-- Inaweza kurun mara nyingi bila kuharibu (on conflict do update).

-- church-gallery
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-gallery', 'church-gallery', true, 31457280,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- church-videos (thumbnails)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-videos', 'church-videos', true, 20971520,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- church-audio
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-audio', 'church-audio', true, 125829120,
  array['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/webm','audio/aac','application/octet-stream']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- church-events-media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-events-media', 'church-events-media', true, 26214400,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- church-images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-images', 'church-images', true, 31457280,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/svg+xml','image/heic','image/heif','image/avif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- church-media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-media', 'church-media', true, 524288000,
  array['video/mp4','video/webm','audio/mpeg','audio/mp3','audio/wav','application/octet-stream']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- church-files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-files', 'church-files', true, 157286400,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/zip','application/octet-stream']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- church-documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-documents', 'church-documents', true, 104857600,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/zip']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- developer-photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'developer-photos', 'developer-photos', true, 26214400,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- leadership-cv-attachments (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership-cv-attachments', 'leadership-cv-attachments', false, 104857600,
  array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- leadership-certificate-assets (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership-certificate-assets', 'leadership-certificate-assets', false, 26214400,
  array['application/pdf','image/jpeg','image/png','image/webp','image/gif','image/svg+xml']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- site-assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets', 'site-assets', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf','text/plain']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- structure-leaders (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'structure-leaders', 'structure-leaders', false, 52428800,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- portal-uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portal-uploads', 'portal-uploads', true, 262144000,
  array['application/pdf','image/jpeg','image/png','video/mp4','audio/mpeg','application/octet-stream']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- certificates
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificates', 'certificates', true, 157286400,
  array['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
