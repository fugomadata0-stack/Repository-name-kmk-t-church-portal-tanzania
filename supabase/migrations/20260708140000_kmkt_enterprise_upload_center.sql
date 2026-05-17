-- KMK(T) Step 11 — Enterprise Upload Center (additive; preserves existing buckets)

-- ——— Central upload registry with versioning ———
create table if not exists public.portal_upload_registry (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('receipt', 'report', 'certificate', 'signature', 'project', 'contribution')
  ),
  bucket text not null,
  file_path text not null,
  public_url text,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  version_number int not null default 1 check (version_number >= 1),
  parent_upload_id uuid references public.portal_upload_registry (id) on delete set null,
  entity_type text,
  entity_id uuid,
  uploaded_by uuid,
  status text not null default 'active' check (status in ('active', 'superseded', 'deleted')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_upload_registry_category_idx
  on public.portal_upload_registry (category, created_at desc);
create index if not exists portal_upload_registry_entity_idx
  on public.portal_upload_registry (entity_type, entity_id)
  where entity_id is not null;
create index if not exists portal_upload_registry_parent_idx
  on public.portal_upload_registry (parent_upload_id)
  where parent_upload_id is not null;

-- ——— Link contribution batches to stored source files ———
alter table if exists public.church_contribution_form_uploads
  add column if not exists storage_bucket text;
alter table if exists public.church_contribution_form_uploads
  add column if not exists storage_path text;
alter table if exists public.church_contribution_form_uploads
  add column if not exists registry_id uuid;

do $$
begin
  alter table public.church_contribution_form_uploads
    add constraint church_contribution_form_uploads_registry_fk
    foreign key (registry_id) references public.portal_upload_registry (id) on delete set null;
exception when others then null;
end $$;

alter table public.portal_upload_registry enable row level security;

grant select, insert, update on public.portal_upload_registry to authenticated;

drop policy if exists portal_upload_registry_select on public.portal_upload_registry;
create policy portal_upload_registry_select on public.portal_upload_registry
  for select to authenticated
  using (
    public.portal_has_module_capability('file_manager', 'view')
    or (category = 'receipt' and public.portal_has_module_capability('fedha', 'view'))
    or (category = 'report' and public.portal_has_module_capability('ripoti', 'view'))
    or (category in ('certificate', 'signature') and public.portal_has_module_capability('viongozi', 'view'))
    or (category = 'project' and public.portal_has_module_capability('taasisi', 'view'))
    or (category = 'contribution' and public.portal_has_module_capability('mapato_income', 'view'))
  );

drop policy if exists portal_upload_registry_insert on public.portal_upload_registry;
create policy portal_upload_registry_insert on public.portal_upload_registry
  for insert to authenticated
  with check (
    public.portal_has_module_capability('file_manager', 'create')
    or (category = 'receipt' and public.portal_has_module_capability('fedha', 'create'))
    or (category = 'report' and public.portal_has_module_capability('ripoti', 'create'))
    or (category in ('certificate', 'signature') and public.portal_has_module_capability('viongozi', 'create'))
    or (category = 'project' and public.portal_has_module_capability('taasisi', 'create'))
    or (category = 'contribution' and public.portal_has_module_capability('mapato_income', 'create'))
  );

drop policy if exists portal_upload_registry_update on public.portal_upload_registry;
create policy portal_upload_registry_update on public.portal_upload_registry
  for update to authenticated
  using (
    public.portal_has_module_capability('file_manager', 'edit')
    or uploaded_by = auth.uid()
  )
  with check (
    public.portal_has_module_capability('file_manager', 'edit')
    or uploaded_by = auth.uid()
  );

-- Widen portal-uploads MIME for receipts/reports (additive)
do $$
begin
  update storage.buckets
  set allowed_mime_types = array(
    select distinct unnest(
      coalesce(allowed_mime_types, array[]::text[])
      || array[
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel', 'text/csv', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    )
  )
  where id = 'portal-uploads';
exception when others then null;
end $$;

notify pgrst, 'reload schema';
