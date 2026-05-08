-- PHASE 31: Supabase Storage — barua za kuunga mkono / supporting letters
-- Endesha baada ya `phase31-supabase-elevated-access.sql`. Njia ya faili: letters/<auth.uid>/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'elevated-access-letters',
  'elevated-access-letters',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "ear_letters_insert_own" on storage.objects;
create policy "ear_letters_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'elevated-access-letters'
  and name like ('letters/' || (select auth.uid()::text) || '/%')
);

drop policy if exists "ear_letters_select_own" on storage.objects;
create policy "ear_letters_select_own" on storage.objects for select to authenticated using (
  bucket_id = 'elevated-access-letters'
  and name like ('letters/' || (select auth.uid()::text) || '/%')
);

drop policy if exists "ear_letters_update_own" on storage.objects;
create policy "ear_letters_update_own" on storage.objects for update to authenticated using (
  bucket_id = 'elevated-access-letters'
  and name like ('letters/' || (select auth.uid()::text) || '/%')
);

drop policy if exists "ear_letters_delete_own" on storage.objects;
create policy "ear_letters_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'elevated-access-letters'
  and name like ('letters/' || (select auth.uid()::text) || '/%')
);

drop policy if exists "ear_letters_admin_read" on storage.objects;
create policy "ear_letters_admin_read" on storage.objects for select to authenticated using (
  bucket_id = 'elevated-access-letters'
  and public.current_app_role() in ('chief_admin', 'super_admin', 'national_admin', 'office_admin', 'admin')
);
