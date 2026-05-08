-- Vyanzo vya mapato (catalog) na mistari ya mapato (Income Management) — RLS dev.

create table if not exists public.church_income_sources (
  id uuid primary key default gen_random_uuid(),
  chanzo text not null,
  category text,
  subtitle text,
  aina text not null check (aina in ('Mapato Halisi', 'Taarifa ya Msingi')),
  maelezo text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_income_sources_chanzo_idx on public.church_income_sources (lower(trim(chanzo)));

create table if not exists public.church_income_lines (
  id uuid primary key default gen_random_uuid(),
  income_code text not null,
  source_name text not null,
  main_category text,
  sub_category text,
  church_level text,
  income_type text not null default 'Cash',
  frequency text not null default 'One-time',
  budgeted text not null default 'No',
  restricted_fund text not null default 'No',
  fund_purpose text,
  collection_date date,
  service_event_date date,
  collector_receiver text,
  approved_by text,
  receipt_no text,
  transaction_reference text,
  amount_tz numeric(18, 2) not null default 0 check (amount_tz >= 0),
  currency text not null default 'TZS',
  status text not null default 'active',
  branch_center text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_income_lines_date_idx on public.church_income_lines (collection_date desc nulls last);
create unique index if not exists church_income_lines_code_unique on public.church_income_lines (lower(trim(income_code)));

alter table public.church_income_sources enable row level security;
alter table public.church_income_lines enable row level security;

drop policy if exists "church_income_sources_anon_all" on public.church_income_sources;
create policy "church_income_sources_anon_all" on public.church_income_sources for all to anon using (true) with check (true);
drop policy if exists "church_income_sources_auth_all" on public.church_income_sources;
create policy "church_income_sources_auth_all" on public.church_income_sources for all to authenticated using (true) with check (true);

drop policy if exists "church_income_lines_anon_all" on public.church_income_lines;
create policy "church_income_lines_anon_all" on public.church_income_lines for all to anon using (true) with check (true);
drop policy if exists "church_income_lines_auth_all" on public.church_income_lines;
create policy "church_income_lines_auth_all" on public.church_income_lines for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.church_income_sources to anon, authenticated;
grant select, insert, update, delete on public.church_income_lines to anon, authenticated;
