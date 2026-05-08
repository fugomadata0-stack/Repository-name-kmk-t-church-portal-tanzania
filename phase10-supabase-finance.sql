create table if not exists finance_transactions (
  id bigserial primary key,
  transaction_type text not null, -- income/expense
  tarehe date,
  aina_mapato text,
  aina_matumizi text,
  chanzo text,
  kategoria text,
  dayosisi text,
  jimbo text,
  tawi text,
  kiasi numeric(14,2) default 0,
  payment_method text,
  recorded_by text,
  approved_by text,
  reference_no text,
  description text,
  attachment text,
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

create table if not exists finance_categories (
  id bigserial primary key,
  name text not null,
  kind text, -- income/expense
  created_at timestamptz default now()
);

create table if not exists finance_budgets (
  id bigserial primary key,
  kipindi text,
  kategoria text,
  budget numeric(14,2) default 0,
  used numeric(14,2) default 0,
  remaining numeric(14,2) default 0,
  status text default 'on_track',
  created_at timestamptz default now()
);

create table if not exists finance_approvals (
  id bigserial primary key,
  reference text,
  aina text,
  kiasi numeric(14,2) default 0,
  submitted_by text,
  reviewer text,
  stage text,
  status text default 'pending',
  date date,
  created_at timestamptz default now()
);

create table if not exists finance_attachments (
  id bigserial primary key,
  transaction_id bigint references finance_transactions(id) on delete cascade,
  file_name text,
  file_path text,
  uploaded_by text,
  created_at timestamptz default now()
);

create table if not exists finance_reports (
  id bigserial primary key,
  report_name text,
  from_date date,
  to_date date,
  payload jsonb,
  generated_by text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  actor_role text,
  module text,
  action text,
  description text,
  payload jsonb,
  created_at timestamptz default now()
);

alter table finance_transactions enable row level security;
alter table finance_categories enable row level security;
alter table finance_budgets enable row level security;
alter table finance_approvals enable row level security;
alter table finance_attachments enable row level security;
alter table finance_reports enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "finance_transactions_all_auth" on finance_transactions;
create policy "finance_transactions_all_auth" on finance_transactions for all to authenticated using (true) with check (true);
drop policy if exists "finance_categories_all_auth" on finance_categories;
create policy "finance_categories_all_auth" on finance_categories for all to authenticated using (true) with check (true);
drop policy if exists "finance_budgets_all_auth" on finance_budgets;
create policy "finance_budgets_all_auth" on finance_budgets for all to authenticated using (true) with check (true);
drop policy if exists "finance_approvals_all_auth" on finance_approvals;
create policy "finance_approvals_all_auth" on finance_approvals for all to authenticated using (true) with check (true);
drop policy if exists "finance_attachments_all_auth" on finance_attachments;
create policy "finance_attachments_all_auth" on finance_attachments for all to authenticated using (true) with check (true);
drop policy if exists "finance_reports_all_auth" on finance_reports;
create policy "finance_reports_all_auth" on finance_reports for all to authenticated using (true) with check (true);
drop policy if exists "audit_logs_all_auth" on audit_logs;
create policy "audit_logs_all_auth" on audit_logs for all to authenticated using (true) with check (true);
