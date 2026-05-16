-- Enterprise storage: vikomo vya ukubwa, aina za MIME, RBAC ya ofisi, na analytics ya buckets.
-- Sababu kuu ya "upload failed": allowed_mime_types / file_size_limit kwenye storage.buckets
-- hazilingani na faili halisi (mfano .doc bila application/msword, au picha HEIC).

-- ——— 1) Sanidi upya buckets (idempotent: on conflict do update) ———

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'developer-photos',
  'developer-photos',
  true,
  26214400,
  array[
    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/svg+xml'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-documents',
  'church-documents',
  true,
  104857600,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-files',
  'church-files',
  true,
  157286400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-images',
  'church-images',
  true,
  31457280,
  array[
    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif',
    'image/svg+xml', 'image/heic', 'image/heif', 'image/avif'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-media',
  'church-media',
  true,
  524288000,
  array[
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/3gpp', 'video/x-matroska',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm',
    'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-m4a', 'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-events-media',
  'church-events-media',
  true,
  26214400,
  array[
    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-gallery',
  'church-gallery',
  true,
  31457280,
  array[
    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/avif'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Thumbnails za video (si faili za video — lakini kikomo kipana kwa picha kubwa za preview)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-videos',
  'church-videos',
  true,
  20971520,
  array[
    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/avif'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-audio',
  'church-audio',
  true,
  125829120,
  array[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm',
    'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-m4a', 'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  52428800,
  array[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'image/x-icon', 'image/vnd.microsoft.icon', 'image/avif',
    'application/pdf', 'text/plain', 'text/css', 'application/json'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership-cv-attachments',
  'leadership-cv-attachments',
  false,
  104857600,
  array[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'structure-leaders',
  'structure-leaders',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ——— 2) RBAC: ofisi na taifa — wezesha nyaraka / file manager (bado chini ya sera za storage) ———

update public.portal_module_matrix
set
  can_create = true,
  can_edit = true,
  can_delete = true,
  can_upload = coalesce(can_upload, true),
  can_download = coalesce(can_download, true),
  updated_at = now()
where role_key in ('national_admin', 'office_admin')
  and module_key in ('documents', 'file_manager');

-- ——— 3) Analytics: jumla ya buckets kuu + nyaraka + CV + muundo ———

create or replace function public.portal_storage_buckets_usage_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_allowed boolean;
  buckets jsonb := '{}'::jsonb;
  total_files bigint := 0;
  total_bytes bigint := 0;
  rec record;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  v_allowed :=
    public.portal_has_module_capability('super_admin', 'view')
    or public.portal_has_module_capability('usalama', 'view');

  if not v_allowed then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  for rec in
    select
      o.bucket_id,
      count(*)::bigint as file_count,
      coalesce(
        sum(
          case
            when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
            else 0::bigint
          end
        ),
        0::bigint
      ) as bytes
    from storage.objects o
    where o.bucket_id in (
      'church-files', 'church-images', 'church-media', 'site-assets',
      'church-documents', 'developer-photos', 'leadership-cv-attachments',
      'church-events-media', 'church-gallery', 'church-videos', 'church-audio',
      'structure-leaders'
    )
    group by o.bucket_id
  loop
    buckets :=
      buckets
      || jsonb_build_object(
        rec.bucket_id,
        jsonb_build_object('file_count', rec.file_count, 'bytes', rec.bytes)
      );
    total_files := total_files + rec.file_count;
    total_bytes := total_bytes + rec.bytes;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'buckets', buckets,
    'total_files', total_files,
    'total_bytes', total_bytes
  );
end;
$$;

comment on function public.portal_storage_buckets_usage_summary() is
  'Jumla ya idadi ya faili na bytes kwa buckets za portal (RBAC: super_admin au usalama can_view).';

revoke all on function public.portal_storage_buckets_usage_summary() from public;
grant execute on function public.portal_storage_buckets_usage_summary() to authenticated;
