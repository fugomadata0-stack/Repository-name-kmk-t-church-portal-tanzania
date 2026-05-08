-- PHASE 22: Huduma ya Kichungaji / Pastoral Care
-- Supabase-ready table definitions

create table if not exists pastoral_cases (
  id bigserial primary key,
  member_name text not null,
  huduma_type text not null,
  description text,
  dayosisi text,
  jimbo text,
  tawi text,
  leader_name text,
  priority text default 'Normal',
  status text default 'Open',
  followup_date date,
  notes text,
  confidential boolean default false,
  role_scope text default 'dayosisi',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists prayer_requests (
  id bigserial primary key,
  pastoral_case_id bigint references pastoral_cases(id) on delete cascade,
  member_name text,
  request_detail text,
  priority text,
  status text,
  followup_date date,
  created_at timestamptz default now()
);

create table if not exists member_followups (
  id bigserial primary key,
  pastoral_case_id bigint references pastoral_cases(id) on delete cascade,
  member_name text,
  assigned_leader text,
  followup_date date,
  status text,
  created_at timestamptz default now()
);

create table if not exists pastoral_visits (
  id bigserial primary key,
  pastoral_case_id bigint references pastoral_cases(id) on delete cascade,
  member_name text,
  visit_type text,
  assigned_leader text,
  visit_date date,
  status text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists confidential_notes (
  id bigserial primary key,
  pastoral_case_id bigint references pastoral_cases(id) on delete cascade,
  member_name text,
  note text,
  visibility text default 'restricted',
  created_at timestamptz default now()
);

create table if not exists pastoral_reports (
  id bigserial primary key,
  pastoral_case_id bigint references pastoral_cases(id) on delete set null,
  report_title text not null,
  report_detail text,
  report_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists activity_logs (
  id bigserial primary key,
  module text not null,
  action text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
