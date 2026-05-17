-- KMK(T) Step 4 — Contribution Forms Engine (additive)

create table if not exists public.church_contribution_form_uploads (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null,
  file_name text not null,
  file_kind text not null check (file_kind in ('xlsx', 'csv', 'pdf')),
  file_hash text,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  row_count int not null default 0 check (row_count >= 0),
  rows_ok int not null default 0 check (rows_ok >= 0),
  rows_fail int not null default 0 check (rows_fail >= 0),
  rows_skipped int not null default 0 check (rows_skipped >= 0),
  total_amount_tz numeric(18, 2) not null default 0 check (total_amount_tz >= 0),
  validation_json jsonb not null default '[]'::jsonb,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'partial')),
  verified_by text,
  verified_at timestamptz,
  uploaded_by text,
  scope_level text,
  entity_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists church_contribution_form_uploads_batch_code_idx
  on public.church_contribution_form_uploads (lower(trim(batch_code)));

create index if not exists church_contribution_form_uploads_hash_idx
  on public.church_contribution_form_uploads (file_hash)
  where file_hash is not null and length(trim(file_hash)) > 0;

create index if not exists church_contribution_form_uploads_status_idx
  on public.church_contribution_form_uploads (verification_status, created_at desc);

comment on table public.church_contribution_form_uploads is
  'Historia ya upakiaji wa fomu za michango — validation, verification, batch traceability.';

alter table if exists public.church_income_lines
  add column if not exists upload_batch_id uuid;

do $$
begin
  alter table public.church_income_lines
    add constraint church_income_lines_upload_batch_fk
    foreign key (upload_batch_id) references public.church_contribution_form_uploads (id) on delete set null;
exception when others then null;
end $$;

create index if not exists church_income_lines_upload_batch_idx
  on public.church_income_lines (upload_batch_id)
  where upload_batch_id is not null;

alter table public.church_contribution_form_uploads enable row level security;

drop policy if exists church_contribution_form_uploads_select on public.church_contribution_form_uploads;
create policy church_contribution_form_uploads_select on public.church_contribution_form_uploads
  for select to authenticated
  using (
    public.portal_has_module_capability('mapato_income', 'view')
    or public.portal_has_module_capability('fedha', 'view')
  );

drop policy if exists church_contribution_form_uploads_mutate on public.church_contribution_form_uploads;
create policy church_contribution_form_uploads_mutate on public.church_contribution_form_uploads
  for all to authenticated
  using (
    public.portal_has_module_capability('mapato_income', 'edit')
    or public.portal_has_module_capability('fedha', 'edit')
  )
  with check (
    public.portal_has_module_capability('mapato_income', 'create')
    or public.portal_has_module_capability('mapato_income', 'edit')
    or public.portal_has_module_capability('fedha', 'create')
    or public.portal_has_module_capability('fedha', 'edit')
  );

grant select, insert, update, delete on public.church_contribution_form_uploads to authenticated;

notify pgrst, 'reload schema';
