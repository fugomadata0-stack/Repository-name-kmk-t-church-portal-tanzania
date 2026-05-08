create table if not exists attendance_records (
  id bigserial primary key,
  record_type text not null, -- service, meeting, ministry, event, camp
  tarehe date,
  aina_ibada text,
  aina text,
  dayosisi text,
  jimbo text,
  tawi text,
  msimamizi text,
  item text,
  eneo text,
  participants integer default 0,
  present integer default 0,
  absent integer default 0,
  waliopo integer default 0,
  waliokosekana integer default 0,
  rate text,
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

create table if not exists attendance_items (
  id bigserial primary key,
  jina text not null,
  tawi text,
  aina_kikao text,
  tarehe date,
  muda text,
  status text default 'present',
  recorded_by text,
  created_at timestamptz default now()
);

create table if not exists attendance_summaries (
  id bigserial primary key,
  scope_type text, -- dayosisi/jimbo/tawi/type
  scope_key text,
  summary_date date,
  total_attendance integer default 0,
  total_absent integer default 0,
  attendance_rate numeric(5,2) default 0,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists attendance_reports (
  id bigserial primary key,
  report_name text,
  from_date date,
  to_date date,
  generated_by text,
  payload jsonb,
  created_at timestamptz default now()
);

alter table attendance_records enable row level security;
alter table attendance_items enable row level security;
alter table attendance_summaries enable row level security;
alter table attendance_reports enable row level security;

drop policy if exists "attendance_records_all_auth" on attendance_records;
create policy "attendance_records_all_auth" on attendance_records for all to authenticated using (true) with check (true);
drop policy if exists "attendance_items_all_auth" on attendance_items;
create policy "attendance_items_all_auth" on attendance_items for all to authenticated using (true) with check (true);
drop policy if exists "attendance_summaries_all_auth" on attendance_summaries;
create policy "attendance_summaries_all_auth" on attendance_summaries for all to authenticated using (true) with check (true);
drop policy if exists "attendance_reports_all_auth" on attendance_reports;
create policy "attendance_reports_all_auth" on attendance_reports for all to authenticated using (true) with check (true);
