-- Metadata ya nyaraka kwa moduli ya Documents (portal).

alter table if exists public.documents
  add column if not exists type text,
  add column if not exists department text,
  add column if not exists uploaded_by text,
  add column if not exists branch text,
  add column if not exists visibility_level text not null default 'internal';

comment on column public.documents.visibility_level is 'internal | public | restricted';

create index if not exists documents_visibility_idx on public.documents (visibility_level);
create index if not exists documents_department_idx on public.documents (department);
