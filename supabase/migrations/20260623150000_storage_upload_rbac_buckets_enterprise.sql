-- Upakiaji wa faili: RLS ya INSERT iruhusu create AU edit (kulingana na UI / matumizi ya uhariri).
-- Pia: buckets za ziada, vikomo vya ukubwa, na analytics.

-- ——— 1) Vikomo vya ukubwa kwenye buckets (bytes) ———

update storage.buckets set file_size_limit = 209715200 where id = 'church-documents';
update storage.buckets set file_size_limit = 262144000 where id = 'church-files';
update storage.buckets set file_size_limit = 52428800 where id = 'developer-photos';
update storage.buckets set file_size_limit = 52428800 where id = 'church-images';
update storage.buckets set file_size_limit = 838860800 where id = 'church-media';
update storage.buckets set file_size_limit = 157286400 where id = 'leadership-cv-attachments';
update storage.buckets set file_size_limit = 73400320 where id = 'site-assets';
update storage.buckets set file_size_limit = 52428800 where id = 'structure-leaders';

-- ——— 2) Buckets mpya (portal-uploads + certificates) ———

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portal-uploads',
  'portal-uploads',
  true,
  262144000,
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
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificates',
  'certificates',
  true,
  157286400,
  array[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ——— 3) Sera za storage kwa buckets mpya ———

drop policy if exists "portal_uploads_storage_select" on storage.objects;
create policy "portal_uploads_storage_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portal-uploads'
    and (
      public.portal_has_module_capability('file_manager', 'view')
      or public.portal_has_module_capability('documents', 'view')
    )
  );

drop policy if exists "portal_uploads_storage_insert" on storage.objects;
create policy "portal_uploads_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portal-uploads'
    and (
      public.portal_has_module_capability('file_manager', 'create')
      or public.portal_has_module_capability('file_manager', 'edit')
    )
  );

drop policy if exists "portal_uploads_storage_update" on storage.objects;
create policy "portal_uploads_storage_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portal-uploads'
    and (
      public.portal_has_module_capability('file_manager', 'edit')
    )
  )
  with check (
    bucket_id = 'portal-uploads'
    and public.portal_has_module_capability('file_manager', 'edit')
  );

drop policy if exists "portal_uploads_storage_delete" on storage.objects;
create policy "portal_uploads_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portal-uploads'
    and public.portal_has_module_capability('file_manager', 'delete')
  );

drop policy if exists "certificates_storage_select" on storage.objects;
create policy "certificates_storage_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'certificates'
    and (
      public.portal_has_module_capability('viongozi', 'view')
      or public.portal_has_module_capability('documents', 'view')
    )
  );

drop policy if exists "certificates_storage_insert" on storage.objects;
create policy "certificates_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'certificates'
    and (
      public.portal_has_module_capability('viongozi', 'create')
      or public.portal_has_module_capability('viongozi', 'edit')
      or public.portal_has_module_capability('documents', 'create')
      or public.portal_has_module_capability('documents', 'edit')
    )
  );

drop policy if exists "certificates_storage_update" on storage.objects;
create policy "certificates_storage_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'certificates'
    and (
      public.portal_has_module_capability('viongozi', 'edit')
      or public.portal_has_module_capability('documents', 'edit')
    )
  )
  with check (
    bucket_id = 'certificates'
    and (
      public.portal_has_module_capability('viongozi', 'edit')
      or public.portal_has_module_capability('documents', 'edit')
    )
  );

drop policy if exists "certificates_storage_delete" on storage.objects;
create policy "certificates_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'certificates'
    and (
      public.portal_has_module_capability('viongozi', 'delete')
      or public.portal_has_module_capability('documents', 'delete')
    )
  );

-- ——— 4) Ofisi: wezesha uhariri wa wasifu wa developer (picha + storage) ———

update public.portal_module_matrix
set
  can_create = true,
  can_edit = true,
  updated_at = now()
where role_key = 'office_admin'
  and module_key = 'developer';

-- ——— 5) Badilisha INSERT policies (create AU edit) ———

drop policy if exists "developer_photos_insert_auth" on storage.objects;
create policy "developer_photos_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'developer-photos'
    and (
      public.portal_has_module_capability('developer', 'create')
      or public.portal_has_module_capability('developer', 'edit')
    )
  );

drop policy if exists "church_documents_insert_auth" on storage.objects;
create policy "church_documents_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-documents'
    and (
      public.portal_has_module_capability('documents', 'create')
      or public.portal_has_module_capability('documents', 'edit')
    )
  );

drop policy if exists "church_files_insert_auth" on storage.objects;
create policy "church_files_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-files'
    and (
      public.portal_has_module_capability('file_manager', 'create')
      or public.portal_has_module_capability('file_manager', 'edit')
    )
  );

drop policy if exists "church_images_insert_auth" on storage.objects;
create policy "church_images_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-images'
    and (
      public.portal_has_module_capability('file_manager', 'create')
      or public.portal_has_module_capability('file_manager', 'edit')
    )
  );

drop policy if exists "church_media_bucket_insert_auth" on storage.objects;
create policy "church_media_bucket_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-media'
    and (
      public.portal_has_module_capability('file_manager', 'create')
      or public.portal_has_module_capability('file_manager', 'edit')
    )
  );

drop policy if exists "church_events_media_insert_auth" on storage.objects;
create policy "church_events_media_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-events-media'
    and (
      public.portal_has_module_capability('events', 'create')
      or public.portal_has_module_capability('events', 'edit')
    )
  );

drop policy if exists "church_gallery_insert_auth" on storage.objects;
create policy "church_gallery_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-gallery'
    and (
      public.portal_has_module_capability('gallery', 'create')
      or public.portal_has_module_capability('gallery', 'edit')
    )
  );

drop policy if exists "church_gallery_habari_insert_auth" on storage.objects;
create policy "church_gallery_habari_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-gallery'
    and (
      public.portal_has_module_capability('habari', 'create')
      or public.portal_has_module_capability('habari', 'edit')
      or public.portal_has_module_capability('gallery', 'create')
      or public.portal_has_module_capability('gallery', 'edit')
    )
  );

drop policy if exists "church_videos_insert_auth" on storage.objects;
create policy "church_videos_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-videos'
    and (
      public.portal_has_module_capability('video_library', 'create')
      or public.portal_has_module_capability('video_library', 'edit')
    )
  );

drop policy if exists "church_audio_insert_auth" on storage.objects;
create policy "church_audio_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-audio'
    and (
      public.portal_has_module_capability('audio_library', 'create')
      or public.portal_has_module_capability('audio_library', 'edit')
    )
  );

drop policy if exists "structure_leaders_storage_insert" on storage.objects;
create policy "structure_leaders_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'structure-leaders'
    and (
      public.portal_has_module_capability('muundo', 'create')
      or public.portal_has_module_capability('muundo', 'edit')
    )
    and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    and public.portal_scope_structure_entity_write_allowed(split_part(name, '/', 1)::uuid)
  );

drop policy if exists "church_files_insert_school_logs_taasisi" on storage.objects;
create policy "church_files_insert_school_logs_taasisi"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-files'
    and name like 'school-logs/%'
    and (
      public.portal_has_module_capability('taasisi', 'create')
      or public.portal_has_module_capability('taasisi', 'edit')
    )
  );

drop policy if exists leadership_cv_storage_insert on storage.objects;
create policy leadership_cv_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'leadership-cv-attachments'
    and (
      public.portal_has_module_capability('viongozi', 'create')
      or public.portal_has_module_capability('viongozi', 'edit')
    )
    and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = split_part(name, '/', 1)::uuid
        and public.portal_scope_geo_write_allowed(v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

-- ——— 6) Jedwali file_manager_items: ruhusu buckets mpya ———

do $$
declare
  cname text;
begin
  select c.conname into cname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'file_manager_items'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%bucket_name%';
  if cname is not null then
    execute format('alter table public.file_manager_items drop constraint %I', cname);
  end if;
end
$$;

alter table public.file_manager_items
  add constraint file_manager_items_bucket_name_check
  check (
    bucket_name in (
      'church-files',
      'church-images',
      'church-media',
      'portal-uploads',
      'certificates'
    )
  );

-- ——— 7) RPC ya analytics — ongeza buckets mpya ———

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
      'structure-leaders', 'portal-uploads', 'certificates'
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

-- ——— 8) Soma kwa anon (URL za umma / <img>) — ongeza buckets mpya ———

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
