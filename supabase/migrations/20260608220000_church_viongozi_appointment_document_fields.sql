-- Ensure church_viongozi supports appointment document metadata used by frontend.
alter table if exists public.church_viongozi
  add column if not exists appointment_document_url text,
  add column if not exists appointment_document_name text,
  add column if not exists appointment_document_path text,
  add column if not exists appointment_document_size bigint,
  add column if not exists appointment_document_type text,
  add column if not exists appointment_uploaded_at timestamptz;
