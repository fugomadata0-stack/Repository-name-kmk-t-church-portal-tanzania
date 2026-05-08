-- Global schema alignment and hardening for Supabase-facing modules.
-- Safe, additive only (no destructive changes).

-- 1) Common governance fields on major domain tables
alter table if exists public.dayosisi
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.church_jimbo
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.church_tawi
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.church_viongozi
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.church_finance_entries
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.church_income_sources
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.church_income_lines
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.church_structure_entities
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.church_families
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.church_members
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

alter table if exists public.developer_profile
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.documents
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.sermons
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.gallery
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.videos
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.audios
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.file_manager_items
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.leadership_documents
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.attendance_records
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.member_cards
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.family_members
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.site_settings_types
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

alter table if exists public.site_settings_sections
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null,
  add column if not exists status text not null default 'active';

-- 2) File/media metadata alignment across uploads and media modules
alter table if exists public.church_viongozi
  add column if not exists appointment_document_url text,
  add column if not exists appointment_document_name text,
  add column if not exists appointment_document_path text,
  add column if not exists appointment_document_size bigint,
  add column if not exists appointment_document_type text,
  add column if not exists appointment_uploaded_at timestamptz;

alter table if exists public.documents
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text,
  add column if not exists uploaded_at timestamptz;

alter table if exists public.gallery
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text,
  add column if not exists uploaded_at timestamptz;

alter table if exists public.videos
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text,
  add column if not exists uploaded_at timestamptz;

alter table if exists public.audios
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text,
  add column if not exists uploaded_at timestamptz;

alter table if exists public.file_manager_items
  add column if not exists uploaded_at timestamptz;

alter table if exists public.leadership_documents
  add column if not exists file_path text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text,
  add column if not exists uploaded_at timestamptz;

-- 3) Helpful indexes for common filters/sorting used by services
create index if not exists documents_uploaded_at_idx on public.documents (uploaded_at desc);
create index if not exists gallery_uploaded_at_idx on public.gallery (uploaded_at desc);
create index if not exists videos_uploaded_at_idx on public.videos (uploaded_at desc);
create index if not exists audios_uploaded_at_idx on public.audios (uploaded_at desc);
create index if not exists church_viongozi_appointment_uploaded_at_idx on public.church_viongozi (appointment_uploaded_at desc);
