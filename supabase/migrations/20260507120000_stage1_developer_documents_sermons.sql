-- Stage 1: Developer profile (singleton), church documents, sermons (Mahubiri).
-- RBAC: portal_has_module_capability — matrix seeds: super_admin full CRUD; others view-only (mirrors nyaraka visibility).

-- ——— Tables ———

create table if not exists public.developer_profile (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  po_box text not null default '',
  photo_url text,
  bio text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '',
  file_url text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  preacher text not null default '',
  date date not null default (now()::date),
  scripture text not null default '',
  media_type text not null check (media_type in ('audio', 'video')),
  media_url text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists documents_category_idx on public.documents (category);
create index if not exists documents_created_idx on public.documents (created_at desc);
create index if not exists sermons_preacher_idx on public.sermons (preacher);
create index if not exists sermons_date_idx on public.sermons (date desc);

-- Default singleton developer — insert once when table empty
insert into public.developer_profile (full_name, email, phone, address, po_box, bio)
select * from (values (
  'Mr Fugo',
  'fugomadata0@gmail.com',
  '0624683622',
  'Mwanza, Simiyu, Geita',
  'P.O. Box 308 Itilima DC',
  'Mr Fugo ni mwasifu wa kiufundi wa mfumo wa KMKT. Ana uzoefu wa uundaji programu, uunganisho wa mifumo na Supabase, na msaada wa kiufundi kwa timu ya kanisa. Anapatikana Mwanza, Simiyu, na Geita kwa masuala ya kiufundi na maendeleo ya mfumo.'
)) as v(full_name, email, phone, address, po_box, bio)
where not exists (select 1 from public.developer_profile limit 1);

-- ——— RLS (RBAC per module: developer, documents, mahubiri) ———

alter table public.developer_profile enable row level security;
alter table public.documents enable row level security;
alter table public.sermons enable row level security;

drop policy if exists "developer_profile_select_auth_rbac" on public.developer_profile;
create policy "developer_profile_select_auth_rbac"
  on public.developer_profile for select to authenticated
  using (public.portal_has_module_capability('developer', 'view'));

drop policy if exists "developer_profile_insert_auth_rbac" on public.developer_profile;
create policy "developer_profile_insert_auth_rbac"
  on public.developer_profile for insert to authenticated
  with check (public.portal_has_module_capability('developer', 'create'));

drop policy if exists "developer_profile_update_auth_rbac" on public.developer_profile;
create policy "developer_profile_update_auth_rbac"
  on public.developer_profile for update to authenticated
  using (public.portal_has_module_capability('developer', 'edit'))
  with check (public.portal_has_module_capability('developer', 'edit'));

drop policy if exists "developer_profile_delete_auth_rbac" on public.developer_profile;
create policy "developer_profile_delete_auth_rbac"
  on public.developer_profile for delete to authenticated
  using (public.portal_has_module_capability('developer', 'delete'));

drop policy if exists "documents_select_auth_rbac" on public.documents;
create policy "documents_select_auth_rbac"
  on public.documents for select to authenticated
  using (public.portal_has_module_capability('documents', 'view'));

drop policy if exists "documents_insert_auth_rbac" on public.documents;
create policy "documents_insert_auth_rbac"
  on public.documents for insert to authenticated
  with check (public.portal_has_module_capability('documents', 'create'));

drop policy if exists "documents_update_auth_rbac" on public.documents;
create policy "documents_update_auth_rbac"
  on public.documents for update to authenticated
  using (public.portal_has_module_capability('documents', 'edit'))
  with check (public.portal_has_module_capability('documents', 'edit'));

drop policy if exists "documents_delete_auth_rbac" on public.documents;
create policy "documents_delete_auth_rbac"
  on public.documents for delete to authenticated
  using (public.portal_has_module_capability('documents', 'delete'));

drop policy if exists "sermons_select_auth_rbac" on public.sermons;
create policy "sermons_select_auth_rbac"
  on public.sermons for select to authenticated
  using (public.portal_has_module_capability('mahubiri', 'view'));

drop policy if exists "sermons_insert_auth_rbac" on public.sermons;
create policy "sermons_insert_auth_rbac"
  on public.sermons for insert to authenticated
  with check (public.portal_has_module_capability('mahubiri', 'create'));

drop policy if exists "sermons_update_auth_rbac" on public.sermons;
create policy "sermons_update_auth_rbac"
  on public.sermons for update to authenticated
  using (public.portal_has_module_capability('mahubiri', 'edit'))
  with check (public.portal_has_module_capability('mahubiri', 'edit'));

drop policy if exists "sermons_delete_auth_rbac" on public.sermons;
create policy "sermons_delete_auth_rbac"
  on public.sermons for delete to authenticated
  using (public.portal_has_module_capability('mahubiri', 'delete'));

revoke all on table public.developer_profile from anon;
revoke all on table public.documents from anon;
revoke all on table public.sermons from anon;
grant select, insert, update, delete on table public.developer_profile to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.sermons to authenticated;

-- ——— RBAC matrix seeds (Stage 1 modules) ———
-- Nyaraka-like can_view; create/edit/delete/export: super_admin only (others view-only).

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
) values
('super_admin', 'developer', true, true, true, true, true, false),
('super_admin', 'documents', true, true, true, true, true, false),
('super_admin', 'mahubiri', true, true, true, true, true, false),

('chief_admin', 'developer', true, false, false, false, true, false),
('chief_admin', 'documents', true, false, false, false, true, false),
('chief_admin', 'mahubiri', true, false, false, false, true, false),

('national_admin', 'developer', true, false, false, false, true, false),
('national_admin', 'documents', true, false, false, false, true, false),
('national_admin', 'mahubiri', true, false, false, false, true, false),

('office_admin', 'developer', true, false, false, false, true, false),
('office_admin', 'documents', true, false, false, false, true, false),
('office_admin', 'mahubiri', true, false, false, false, true, false),

('finance_admin', 'developer', true, false, false, false, true, false),
('finance_admin', 'documents', true, false, false, false, true, false),
('finance_admin', 'mahubiri', true, false, false, false, true, false),

('secretary', 'developer', true, false, false, false, true, false),
('secretary', 'documents', true, false, false, false, true, false),
('secretary', 'mahubiri', true, false, false, false, true, false),

('approver', 'developer', true, false, false, false, true, false),
('approver', 'documents', true, false, false, false, true, false),
('approver', 'mahubiri', true, false, false, false, true, false),

('reviewer', 'developer', false, false, false, false, false, false),
('reviewer', 'documents', false, false, false, false, false, false),
('reviewer', 'mahubiri', false, false, false, false, false, false),

('dayosisi_admin', 'developer', false, false, false, false, false, false),
('dayosisi_admin', 'documents', false, false, false, false, false, false),
('dayosisi_admin', 'mahubiri', false, false, false, false, false, false),

('jimbo_admin', 'developer', false, false, false, false, false, false),
('jimbo_admin', 'documents', false, false, false, false, false, false),
('jimbo_admin', 'mahubiri', false, false, false, false, false, false),

('tawi_admin', 'developer', false, false, false, false, false, false),
('tawi_admin', 'documents', false, false, false, false, false, false),
('tawi_admin', 'mahubiri', false, false, false, false, false, false),

('viewer', 'developer', false, false, false, false, false, false),
('viewer', 'documents', false, false, false, false, false, false),
('viewer', 'mahubiri', false, false, false, false, false, false)
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();

-- ——— Storage buckets ———

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'developer-photos',
  'developer-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
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
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: authenticated + RBAC module capability

drop policy if exists "developer_photos_select_auth" on storage.objects;
create policy "developer_photos_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'developer-photos');

drop policy if exists "developer_photos_insert_auth" on storage.objects;
create policy "developer_photos_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'developer-photos'
    and public.portal_has_module_capability('developer', 'create')
  );

drop policy if exists "developer_photos_update_auth" on storage.objects;
create policy "developer_photos_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'developer-photos' and public.portal_has_module_capability('developer', 'edit'))
  with check (bucket_id = 'developer-photos' and public.portal_has_module_capability('developer', 'edit'));

drop policy if exists "developer_photos_delete_auth" on storage.objects;
create policy "developer_photos_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'developer-photos' and public.portal_has_module_capability('developer', 'delete'));

drop policy if exists "church_documents_select_auth" on storage.objects;
create policy "church_documents_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'church-documents');

drop policy if exists "church_documents_insert_auth" on storage.objects;
create policy "church_documents_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-documents'
    and public.portal_has_module_capability('documents', 'create')
  );

drop policy if exists "church_documents_update_auth" on storage.objects;
create policy "church_documents_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'church-documents' and public.portal_has_module_capability('documents', 'edit'))
  with check (bucket_id = 'church-documents' and public.portal_has_module_capability('documents', 'edit'));

drop policy if exists "church_documents_delete_auth" on storage.objects;
create policy "church_documents_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'church-documents' and public.portal_has_module_capability('documents', 'delete'));
