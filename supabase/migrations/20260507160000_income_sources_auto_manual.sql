-- Auto + Manual source structure for church_income_sources

alter table public.church_income_sources
  add column if not exists source_type text not null default 'custom' check (source_type in ('predefined', 'custom')),
  add column if not exists source_code text,
  add column if not exists frequency text not null default 'Monthly' check (frequency in ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual', 'One-time')),
  add column if not exists restricted_fund text not null default 'No' check (restricted_fund in ('Yes', 'No')),
  add column if not exists approval_required text not null default 'No' check (approval_required in ('Yes', 'No'));

create unique index if not exists church_income_sources_source_code_unique
  on public.church_income_sources (lower(trim(source_code)))
  where source_code is not null and trim(source_code) <> '';
