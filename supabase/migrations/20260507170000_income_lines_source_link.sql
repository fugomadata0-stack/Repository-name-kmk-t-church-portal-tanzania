-- Link income lines to finance income sources + approval metadata

alter table public.church_income_lines
  add column if not exists source_id uuid references public.church_income_sources (id) on delete set null,
  add column if not exists approval_required text not null default 'No' check (approval_required in ('Yes', 'No'));

create index if not exists church_income_lines_source_id_idx
  on public.church_income_lines (source_id);

create unique index if not exists church_income_lines_receipt_no_unique
  on public.church_income_lines (lower(trim(receipt_no)))
  where receipt_no is not null and trim(receipt_no) <> '';
