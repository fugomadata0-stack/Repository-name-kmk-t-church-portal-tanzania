-- Log za shule za kanisa: pakizi kwenye church-files/school-logs/ kwa watumiaji wenye taasisi create/edit/delete.
-- Pia ongeza MIME za kawaida za CSV kwa bucket ya church-files.

update storage.buckets
set allowed_mime_types = coalesce(allowed_mime_types, array[]::text[])
  || array['text/csv', 'application/csv', 'application/octet-stream']::text[]
where id = 'church-files';

drop policy if exists "church_files_insert_school_logs_taasisi" on storage.objects;
create policy "church_files_insert_school_logs_taasisi"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-files'
    and name like 'school-logs/%'
    and public.portal_has_module_capability('taasisi', 'create')
  );

drop policy if exists "church_files_update_school_logs_taasisi" on storage.objects;
create policy "church_files_update_school_logs_taasisi"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'church-files'
    and name like 'school-logs/%'
    and public.portal_has_module_capability('taasisi', 'edit')
  )
  with check (
    bucket_id = 'church-files'
    and name like 'school-logs/%'
    and public.portal_has_module_capability('taasisi', 'edit')
  );

drop policy if exists "church_files_delete_school_logs_taasisi" on storage.objects;
create policy "church_files_delete_school_logs_taasisi"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'church-files'
    and name like 'school-logs/%'
    and public.portal_has_module_capability('taasisi', 'delete')
  );
