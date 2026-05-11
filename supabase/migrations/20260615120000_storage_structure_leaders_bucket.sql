-- Faili za hati za uteuzi za viongozi wa muundo — bucket ya faragha + RLS (njia: {entity_id}/uteuzi/...).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'structure-leaders',
  'structure-leaders',
  false,
  12582912,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "structure_leaders_storage_select" on storage.objects;
create policy "structure_leaders_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'structure-leaders'
  and public.portal_has_module_capability('muundo', 'view')
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and (
    public.current_app_role() in ('super_admin', 'chief_admin', 'viewer', 'reviewer', 'member_user')
    or public.portal_scope_structure_entity_write_allowed(split_part(name, '/', 1)::uuid)
  )
);

drop policy if exists "structure_leaders_storage_insert" on storage.objects;
create policy "structure_leaders_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'structure-leaders'
  and public.portal_has_module_capability('muundo', 'create')
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and public.portal_scope_structure_entity_write_allowed(split_part(name, '/', 1)::uuid)
);

drop policy if exists "structure_leaders_storage_update" on storage.objects;
create policy "structure_leaders_storage_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'structure-leaders'
  and public.portal_has_module_capability('muundo', 'edit')
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and public.portal_scope_structure_entity_write_allowed(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'structure-leaders'
  and public.portal_has_module_capability('muundo', 'edit')
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and public.portal_scope_structure_entity_write_allowed(split_part(name, '/', 1)::uuid)
);

drop policy if exists "structure_leaders_storage_delete" on storage.objects;
create policy "structure_leaders_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'structure-leaders'
  and public.portal_has_module_capability('muundo', 'delete')
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and public.portal_scope_structure_entity_write_allowed(split_part(name, '/', 1)::uuid)
);
