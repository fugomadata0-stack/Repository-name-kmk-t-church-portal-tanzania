-- KMK(T) Leadership Certificate System — SAFE additive migration only.
-- Does NOT drop or rename existing tables.
-- NOTE: public.leadership_certificates already exists (CV Engine: per-leader certificate records).
--       Enterprise workflow certificates live in public.leadership_official_certificates.

-- ——— Sequence (before number generator) ———
create sequence if not exists public.leadership_certificate_number_seq;

-- ——— Helpers ———
create or replace function public.leadership_certificate_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.leadership_generate_certificate_number(p_prefix text default 'KMK-CERT')
returns text
language plpgsql
set search_path = public
as $$
declare
  seq bigint;
  yr text := to_char(now() at time zone 'Africa/Dar_es_Salaam', 'YYYY');
  pref text := upper(coalesce(nullif(trim(p_prefix), ''), 'KMK-CERT'));
begin
  seq := nextval('public.leadership_certificate_number_seq');
  return pref || '-' || yr || '-' || lpad(seq::text, 6, '0');
exception
  when undefined_table then
    return pref || '-' || yr || '-' || lpad(floor(random() * 999999)::text, 6, '0');
end;
$$;

create or replace function public.leadership_generate_verification_id()
returns text
language plpgsql
set search_path = public
as $$
declare
  raw text;
begin
  raw := encode(gen_random_bytes(12), 'hex');
  return 'KMK-VRF-' || upper(raw);
end;
$$;

-- ——— Extend leadership_profiles (existing 1:1 CV table) ———
alter table if exists public.leadership_profiles
  add column if not exists certificate_workflow_status text not null default 'draft',
  add column if not exists last_official_certificate_id uuid,
  add column if not exists last_verification_id text,
  add column if not exists profile_status_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leadership_profiles_certificate_workflow_status_check'
  ) then
    alter table public.leadership_profiles
      add constraint leadership_profiles_certificate_workflow_status_check
      check (
        certificate_workflow_status in (
          'draft', 'pending', 'verified', 'approved', 'rejected', 'archived'
        )
      );
  end if;
exception when others then
  null;
end $$;

-- ——— A) Official certificates (workflow) ———
-- Distinct from leadership_certificates (CV skill/certificate rows).
create table if not exists public.leadership_official_certificates (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references public.church_viongozi (id) on delete set null,
  national_role_key text,
  source_type text not null default 'church_viongozi'
    check (source_type in ('church_viongozi', 'national_leadership')),
  document_kind text not null default 'appointment_certificate'
    check (
      document_kind in (
        'appointment_certificate',
        'executive_cv',
        'leadership_profile_pdf',
        'appointment_letter',
        'service_certificate',
        'identity_card'
      )
    ),
  certificate_number text not null,
  verification_id text not null,
  verify_url text,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'verified', 'approved', 'rejected', 'archived')),
  hierarchy_label text not null default '',
  position_title text not null default '',
  holder_full_name text not null default '',
  payload jsonb not null default '{}'::jsonb,
  pdf_storage_path text,
  pdf_file_name text,
  pdf_mime_type text default 'application/pdf',
  pdf_bytes bigint,
  pdf_version int not null default 1,
  qr_payload text,
  issued_at timestamptz,
  issued_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  archived_at timestamptz,
  credential_issue_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leadership_official_certificates_source_check check (
    (source_type = 'church_viongozi' and leader_id is not null)
    or (source_type = 'national_leadership' and national_role_key is not null)
  )
);

create unique index if not exists leadership_official_certificates_number_uidx
  on public.leadership_official_certificates (certificate_number);

create unique index if not exists leadership_official_certificates_verification_uidx
  on public.leadership_official_certificates (verification_id);

create index if not exists leadership_official_certificates_leader_idx
  on public.leadership_official_certificates (leader_id, status, updated_at desc);

create index if not exists leadership_official_certificates_status_idx
  on public.leadership_official_certificates (status, created_at desc);

create index if not exists leadership_official_certificates_national_idx
  on public.leadership_official_certificates (national_role_key, status)
  where national_role_key is not null;

-- FK to credential issues (optional link) — defensive
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'leadership_credential_issues'
  ) then
    if not exists (
      select 1 from pg_constraint where conname = 'leadership_official_certificates_credential_issue_fkey'
    ) then
      alter table public.leadership_official_certificates
        add constraint leadership_official_certificates_credential_issue_fkey
        foreign key (credential_issue_id) references public.leadership_credential_issues (id)
        on delete set null;
    end if;
  end if;
exception when others then
  null;
end $$;

-- Link profile → last certificate (after table exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leadership_profiles_last_official_certificate_fkey'
  ) then
    alter table public.leadership_profiles
      add constraint leadership_profiles_last_official_certificate_fkey
      foreign key (last_official_certificate_id) references public.leadership_official_certificates (id)
      on delete set null;
  end if;
exception when others then
  null;
end $$;

-- Auto certificate number + verification id on insert
create or replace function public.leadership_official_certificates_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.certificate_number is null or trim(new.certificate_number) = '' then
    new.certificate_number := public.leadership_generate_certificate_number('KMK-CERT');
  end if;
  if new.verification_id is null or trim(new.verification_id) = '' then
    new.verification_id := public.leadership_generate_verification_id();
  end if;
  if new.qr_payload is null or trim(new.qr_payload) = '' then
    new.qr_payload := coalesce(new.verify_url, new.verification_id);
  end if;
  if new.issued_at is null and new.status in ('verified', 'approved') then
    new.issued_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leadership_official_certificates_before_insert on public.leadership_official_certificates;
create trigger trg_leadership_official_certificates_before_insert
before insert on public.leadership_official_certificates
for each row execute function public.leadership_official_certificates_before_insert();

drop trigger if exists trg_leadership_official_certificates_touch on public.leadership_official_certificates;
create trigger trg_leadership_official_certificates_touch
before update on public.leadership_official_certificates
for each row execute function public.leadership_certificate_touch_updated_at();

-- ——— B) CV documents (versioned uploads) ———
create table if not exists public.leadership_cv_documents (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  document_kind text not null default 'cv_pdf'
    check (document_kind in ('cv_pdf', 'profile_pdf', 'appointment_letter', 'service_certificate', 'identity_card', 'other')),
  storage_path text not null,
  file_name text not null default '',
  mime_type text,
  file_size bigint,
  version_number int not null default 1,
  is_current boolean not null default true,
  replaced_by_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'verified', 'approved', 'rejected', 'archived')),
  notes text,
  uploaded_by uuid references auth.users (id) on delete set null,
  official_certificate_id uuid references public.leadership_official_certificates (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadership_cv_documents_leader_idx
  on public.leadership_cv_documents (leader_id, document_kind, is_current);

create index if not exists leadership_cv_documents_version_idx
  on public.leadership_cv_documents (leader_id, document_kind, version_number desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leadership_cv_documents_replaced_by_fkey'
  ) then
    alter table public.leadership_cv_documents
      add constraint leadership_cv_documents_replaced_by_fkey
      foreign key (replaced_by_id) references public.leadership_cv_documents (id)
      on delete set null;
  end if;
exception when others then
  null;
end $$;

drop trigger if exists trg_leadership_cv_documents_touch on public.leadership_cv_documents;
create trigger trg_leadership_cv_documents_touch
before update on public.leadership_cv_documents
for each row execute function public.leadership_certificate_touch_updated_at();

-- ——— C) Approvals workflow ———
create table if not exists public.leadership_approvals (
  id uuid primary key default gen_random_uuid(),
  official_certificate_id uuid not null references public.leadership_official_certificates (id) on delete cascade,
  approval_step int not null default 1,
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'verified', 'approved', 'rejected', 'archived')),
  approver_user_id uuid references auth.users (id) on delete set null,
  approver_name text,
  approver_title text,
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadership_approvals_certificate_idx
  on public.leadership_approvals (official_certificate_id, approval_step);

drop trigger if exists trg_leadership_approvals_touch on public.leadership_approvals;
create trigger trg_leadership_approvals_touch
before update on public.leadership_approvals
for each row execute function public.leadership_certificate_touch_updated_at();

-- ——— D) Signatures (versioned) ———
create table if not exists public.leadership_signatures (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references public.church_viongozi (id) on delete cascade,
  scope text not null default 'leader' check (scope in ('leader', 'institutional', 'national')),
  national_role_key text,
  storage_path text not null,
  file_name text not null default '',
  mime_type text,
  file_size bigint,
  version_number int not null default 1,
  is_current boolean not null default true,
  replaced_by_id uuid,
  status text not null default 'approved'
    check (status in ('draft', 'pending', 'verified', 'approved', 'rejected', 'archived')),
  signed_by_name text,
  signed_by_title text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadership_signatures_leader_idx
  on public.leadership_signatures (leader_id, is_current) where leader_id is not null;

create index if not exists leadership_signatures_national_idx
  on public.leadership_signatures (national_role_key, is_current) where national_role_key is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leadership_signatures_replaced_by_fkey'
  ) then
    alter table public.leadership_signatures
      add constraint leadership_signatures_replaced_by_fkey
      foreign key (replaced_by_id) references public.leadership_signatures (id)
      on delete set null;
  end if;
exception when others then
  null;
end $$;

drop trigger if exists trg_leadership_signatures_touch on public.leadership_signatures;
create trigger trg_leadership_signatures_touch
before update on public.leadership_signatures
for each row execute function public.leadership_certificate_touch_updated_at();

-- ——— E) Official seals (versioned) ———
create table if not exists public.leadership_seals (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references public.church_viongozi (id) on delete cascade,
  scope text not null default 'institutional' check (scope in ('leader', 'institutional', 'national', 'dayosisi', 'jimbo', 'tawi')),
  scope_entity_id uuid,
  national_role_key text,
  storage_path text not null,
  file_name text not null default '',
  mime_type text,
  file_size bigint,
  version_number int not null default 1,
  is_current boolean not null default true,
  replaced_by_id uuid,
  status text not null default 'approved'
    check (status in ('draft', 'pending', 'verified', 'approved', 'rejected', 'archived')),
  seal_label text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadership_seals_scope_idx
  on public.leadership_seals (scope, is_current);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leadership_seals_replaced_by_fkey'
  ) then
    alter table public.leadership_seals
      add constraint leadership_seals_replaced_by_fkey
      foreign key (replaced_by_id) references public.leadership_seals (id)
      on delete set null;
  end if;
exception when others then
  null;
end $$;

drop trigger if exists trg_leadership_seals_touch on public.leadership_seals;
create trigger trg_leadership_seals_touch
before update on public.leadership_seals
for each row execute function public.leadership_certificate_touch_updated_at();

-- ——— F) Audit logs ———
create table if not exists public.leadership_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (
      entity_type in (
        'leadership_profiles',
        'leadership_official_certificates',
        'leadership_cv_documents',
        'leadership_approvals',
        'leadership_signatures',
        'leadership_seals',
        'leadership_credential_issues'
      )
    ),
  entity_id uuid not null,
  action text not null
    check (action in ('create', 'update', 'delete', 'status_change', 'approve', 'reject', 'archive', 'upload', 'issue')),
  old_status text,
  new_status text,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leadership_audit_logs_entity_idx
  on public.leadership_audit_logs (entity_type, entity_id, created_at desc);

create index if not exists leadership_audit_logs_created_idx
  on public.leadership_audit_logs (created_at desc);

-- Generic audit writer
create or replace function public.leadership_write_audit_log(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_old_status text default null,
  p_new_status text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leadership_audit_logs (
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    actor_user_id,
    metadata
  )
  values (
    p_entity_type,
    p_entity_id,
    p_action,
    p_old_status,
    p_new_status,
    auth.uid(),
    coalesce(p_metadata, '{}'::jsonb)
  );
exception when others then
  null;
end;
$$;

revoke all on function public.leadership_write_audit_log(text, uuid, text, text, text, jsonb) from public;
grant execute on function public.leadership_write_audit_log(text, uuid, text, text, text, jsonb) to authenticated;

-- Status change audit on official certificates
create or replace function public.leadership_official_certificates_audit_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.leadership_write_audit_log(
      'leadership_official_certificates',
      new.id,
      'create',
      null,
      new.status,
      jsonb_build_object('certificate_number', new.certificate_number, 'verification_id', new.verification_id)
    );
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    perform public.leadership_write_audit_log(
      'leadership_official_certificates',
      new.id,
      case
        when new.status = 'approved' then 'approve'
        when new.status = 'rejected' then 'reject'
        when new.status = 'archived' then 'archive'
        else 'status_change'
      end,
      old.status,
      new.status,
      jsonb_build_object('certificate_number', new.certificate_number)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leadership_official_certificates_audit on public.leadership_official_certificates;
create trigger trg_leadership_official_certificates_audit
after insert or update on public.leadership_official_certificates
for each row execute function public.leadership_official_certificates_audit_status();

-- Approval step → sync certificate status (defensive)
create or replace function public.leadership_approvals_sync_certificate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' then
    update public.leadership_official_certificates c
    set
      status = 'approved',
      approved_at = coalesce(new.decided_at, now()),
      approved_by = coalesce(new.approver_user_id, auth.uid()),
      updated_at = now()
  where c.id = new.official_certificate_id
    and c.status in ('draft', 'pending', 'verified');
  elsif new.status = 'rejected' then
    update public.leadership_official_certificates c
    set
      status = 'rejected',
      rejected_at = coalesce(new.decided_at, now()),
      rejected_by = coalesce(new.approver_user_id, auth.uid()),
      rejection_reason = coalesce(new.decision_notes, c.rejection_reason),
      updated_at = now()
    where c.id = new.official_certificate_id
      and c.status not in ('archived', 'approved');
  elsif new.status = 'verified' then
    update public.leadership_official_certificates c
    set status = 'verified', updated_at = now()
    where c.id = new.official_certificate_id and c.status in ('draft', 'pending');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leadership_approvals_sync on public.leadership_approvals;
create trigger trg_leadership_approvals_sync
after insert or update on public.leadership_approvals
for each row execute function public.leadership_approvals_sync_certificate();

-- ——— Storage: certificate assets (PDF, images, signatures, seals) ———
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership-certificate-assets',
  'leadership-certificate-assets',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {leader_uuid|national}/{kind}/{filename}
drop policy if exists leadership_cert_assets_select on storage.objects;
create policy leadership_cert_assets_select
on storage.objects for select to authenticated
using (
  bucket_id = 'leadership-certificate-assets'
  and public.portal_has_module_capability('viongozi', 'view')
);

drop policy if exists leadership_cert_assets_insert on storage.objects;
create policy leadership_cert_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'leadership-certificate-assets'
  and (
    public.portal_has_module_capability('viongozi', 'create')
    or public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  )
);

drop policy if exists leadership_cert_assets_update on storage.objects;
create policy leadership_cert_assets_update
on storage.objects for update to authenticated
using (
  bucket_id = 'leadership-certificate-assets'
  and (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  )
)
with check (
  bucket_id = 'leadership-certificate-assets'
  and (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  )
);

drop policy if exists leadership_cert_assets_delete on storage.objects;
create policy leadership_cert_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'leadership-certificate-assets'
  and public.portal_has_module_capability('viongozi', 'delete')
);

-- ——— RLS enable ———
alter table public.leadership_official_certificates enable row level security;
alter table public.leadership_cv_documents enable row level security;
alter table public.leadership_approvals enable row level security;
alter table public.leadership_signatures enable row level security;
alter table public.leadership_seals enable row level security;
alter table public.leadership_audit_logs enable row level security;

grant select, insert, update, delete on public.leadership_official_certificates to authenticated;
grant select, insert, update, delete on public.leadership_cv_documents to authenticated;
grant select, insert, update, delete on public.leadership_approvals to authenticated;
grant select, insert, update, delete on public.leadership_signatures to authenticated;
grant select, insert, update, delete on public.leadership_seals to authenticated;
grant select on public.leadership_audit_logs to authenticated;
grant insert on public.leadership_audit_logs to authenticated;

-- Geo helper for church-scoped rows
create or replace function public.leadership_leader_geo_allowed(p_leader_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.church_viongozi v
    where v.id = p_leader_id
      and public.portal_scope_geo_write_allowed(v.dayosisi_id, v.jimbo_id, v.tawi_id)
  );
$$;

-- leadership_official_certificates policies
drop policy if exists leadership_official_certificates_select on public.leadership_official_certificates;
create policy leadership_official_certificates_select on public.leadership_official_certificates
  for select to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'view')
    or public.portal_has_module_capability('mipangilio', 'view')
  );

drop policy if exists leadership_official_certificates_insert on public.leadership_official_certificates;
create policy leadership_official_certificates_insert on public.leadership_official_certificates
  for insert to authenticated
  with check (
    (
      public.portal_has_module_capability('viongozi', 'create')
      or public.portal_has_module_capability('viongozi', 'edit')
    )
    and (
      leader_id is null
      or public.leadership_leader_geo_allowed(leader_id)
      or source_type = 'national_leadership'
    )
  );

drop policy if exists leadership_official_certificates_update on public.leadership_official_certificates;
create policy leadership_official_certificates_update on public.leadership_official_certificates
  for update to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  )
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  );

drop policy if exists leadership_official_certificates_delete on public.leadership_official_certificates;
create policy leadership_official_certificates_delete on public.leadership_official_certificates
  for delete to authenticated
  using (public.portal_has_module_capability('viongozi', 'delete'));

-- leadership_cv_documents
drop policy if exists leadership_cv_documents_select on public.leadership_cv_documents;
create policy leadership_cv_documents_select on public.leadership_cv_documents
  for select to authenticated using (public.portal_has_module_capability('viongozi', 'view'));

drop policy if exists leadership_cv_documents_insert on public.leadership_cv_documents;
create policy leadership_cv_documents_insert on public.leadership_cv_documents
  for insert to authenticated
  with check (
    public.portal_has_module_capability('viongozi', 'create')
    and public.leadership_leader_geo_allowed(leader_id)
  );

drop policy if exists leadership_cv_documents_update on public.leadership_cv_documents;
create policy leadership_cv_documents_update on public.leadership_cv_documents
  for update to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'edit')
    and public.leadership_leader_geo_allowed(leader_id)
  )
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    and public.leadership_leader_geo_allowed(leader_id)
  );

drop policy if exists leadership_cv_documents_delete on public.leadership_cv_documents;
create policy leadership_cv_documents_delete on public.leadership_cv_documents
  for delete to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'delete')
    and public.leadership_leader_geo_allowed(leader_id)
  );

-- leadership_approvals
drop policy if exists leadership_approvals_select on public.leadership_approvals;
create policy leadership_approvals_select on public.leadership_approvals
  for select to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'view')
    or public.portal_has_module_capability('mipangilio', 'view')
  );

drop policy if exists leadership_approvals_insert on public.leadership_approvals;
create policy leadership_approvals_insert on public.leadership_approvals
  for insert to authenticated
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  );

drop policy if exists leadership_approvals_update on public.leadership_approvals;
create policy leadership_approvals_update on public.leadership_approvals
  for update to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  )
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  );

-- leadership_signatures
drop policy if exists leadership_signatures_select on public.leadership_signatures;
create policy leadership_signatures_select on public.leadership_signatures
  for select to authenticated using (public.portal_has_module_capability('viongozi', 'view'));

drop policy if exists leadership_signatures_insert on public.leadership_signatures;
create policy leadership_signatures_insert on public.leadership_signatures
  for insert to authenticated
  with check (
    (public.portal_has_module_capability('viongozi', 'create') or public.portal_has_module_capability('viongozi', 'edit'))
    and (leader_id is null or public.leadership_leader_geo_allowed(leader_id))
  );

drop policy if exists leadership_signatures_update on public.leadership_signatures;
create policy leadership_signatures_update on public.leadership_signatures
  for update to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'edit')
    and (leader_id is null or public.leadership_leader_geo_allowed(leader_id))
  )
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    and (leader_id is null or public.leadership_leader_geo_allowed(leader_id))
  );

drop policy if exists leadership_signatures_delete on public.leadership_signatures;
create policy leadership_signatures_delete on public.leadership_signatures
  for delete to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'delete')
    and (leader_id is null or public.leadership_leader_geo_allowed(leader_id))
  );

-- leadership_seals
drop policy if exists leadership_seals_select on public.leadership_seals;
create policy leadership_seals_select on public.leadership_seals
  for select to authenticated using (public.portal_has_module_capability('viongozi', 'view'));

drop policy if exists leadership_seals_insert on public.leadership_seals;
create policy leadership_seals_insert on public.leadership_seals
  for insert to authenticated
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  );

drop policy if exists leadership_seals_update on public.leadership_seals;
create policy leadership_seals_update on public.leadership_seals
  for update to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  )
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  );

drop policy if exists leadership_seals_delete on public.leadership_seals;
create policy leadership_seals_delete on public.leadership_seals
  for delete to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'delete')
    or public.portal_has_module_capability('mipangilio', 'edit')
  );

-- leadership_audit_logs (read-only for users; inserts via triggers/RPC)
drop policy if exists leadership_audit_logs_select on public.leadership_audit_logs;
create policy leadership_audit_logs_select on public.leadership_audit_logs
  for select to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'view')
    or public.portal_has_module_capability('mipangilio', 'view')
  );

drop policy if exists leadership_audit_logs_insert on public.leadership_audit_logs;
create policy leadership_audit_logs_insert on public.leadership_audit_logs
  for insert to authenticated
  with check (
    public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  );

-- ——— Realtime publication (defensive) ———
do $cert_rt$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_official_certificates'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_official_certificates';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_cv_documents'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_cv_documents';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_approvals'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_approvals';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_signatures'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_signatures';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_seals'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_seals';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_audit_logs'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_audit_logs';
    end if;
  end if;
end $cert_rt$;

alter table if exists public.leadership_official_certificates replica identity full;
alter table if exists public.leadership_cv_documents replica identity full;
alter table if exists public.leadership_approvals replica identity full;
alter table if exists public.leadership_signatures replica identity full;
alter table if exists public.leadership_seals replica identity full;
alter table if exists public.leadership_audit_logs replica identity full;

-- Compatibility view: maps enterprise certificates (user-facing name)
drop view if exists public.leadership_certificate_system_v;
create view public.leadership_certificate_system_v
with (security_invoker = true)
as
select
  id,
  leader_id,
  national_role_key,
  source_type,
  document_kind,
  certificate_number,
  verification_id,
  verify_url,
  status,
  hierarchy_label,
  position_title,
  holder_full_name,
  pdf_storage_path,
  pdf_version,
  issued_at,
  approved_at,
  created_at,
  updated_at
from public.leadership_official_certificates;

grant select on public.leadership_certificate_system_v to authenticated;

comment on table public.leadership_official_certificates is
  'Enterprise leadership certificates (Draft→Approved workflow). Distinct from leadership_certificates (CV Engine rows).';
comment on table public.leadership_cv_documents is
  'Versioned CV/PDF uploads linked to leaders and optional official certificates.';
comment on table public.leadership_approvals is
  'Multi-step approval workflow; syncs status on leadership_official_certificates.';
comment on table public.leadership_signatures is
  'Versioned signature image uploads per leader or institutional scope.';
comment on table public.leadership_seals is
  'Versioned official seal uploads (institutional / hierarchy scope).';
comment on table public.leadership_audit_logs is
  'Immutable-style audit trail for certificate system entities.';
