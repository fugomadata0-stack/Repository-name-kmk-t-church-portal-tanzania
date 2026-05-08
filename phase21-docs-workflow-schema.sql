-- PHASE 21: Nyaraka Rasmi & Approval Workflow

create table if not exists public.documents (
  id bigserial primary key,
  document_id text not null unique,
  title text not null,
  type text not null,
  module text,
  owner text,
  current_stage text default 'Draft',
  status text default 'Draft',
  updated_at timestamptz default now(),
  expiry_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.document_templates (
  id bigserial primary key,
  template_name text not null,
  type text not null,
  version text default 'v1.0',
  status text default 'Active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.approval_requests (
  id bigserial primary key,
  request_id text not null unique,
  document_id bigint references public.documents(id) on delete cascade,
  document text,
  submitted_by text,
  current_reviewer text,
  approval_stage text,
  deadline date,
  status text default 'Pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.approval_steps (
  id bigserial primary key,
  approval_request_id bigint references public.approval_requests(id) on delete cascade,
  step_action text not null,
  status text,
  acted_by uuid references auth.users(id) on delete set null,
  acted_at timestamptz default now(),
  notes text
);

create table if not exists public.document_versions (
  id bigserial primary key,
  document_id bigint references public.documents(id) on delete cascade,
  document_name text,
  version text not null,
  changed_by text,
  changed_at timestamptz default now(),
  notes text
);

create table if not exists public.document_archive (
  id bigserial primary key,
  document_id bigint references public.documents(id) on delete cascade,
  archived_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz default now(),
  reason text
);

create table if not exists public.document_audit_logs (
  id bigserial primary key,
  action text not null,
  payload jsonb default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_documents_status on public.documents (status);
create index if not exists idx_approval_requests_status on public.approval_requests (status);
create index if not exists idx_document_versions_document_id on public.document_versions (document_id);
