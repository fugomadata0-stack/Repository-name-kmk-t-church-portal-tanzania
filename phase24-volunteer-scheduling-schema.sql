-- PHASE 24: Ratiba za Huduma & Volunteers
-- Supabase-ready table definitions

create table if not exists volunteers (
  id bigserial primary key,
  name text not null,
  phone text,
  team text,
  dayosisi text,
  jimbo text,
  tawi text,
  availability text,
  status text default 'Pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists service_teams (
  id bigserial primary key,
  team_name text not null,
  team_lead text,
  dayosisi text,
  jimbo text,
  tawi text,
  status text default 'Active',
  created_at timestamptz default now()
);

create table if not exists duty_rosters (
  id bigserial primary key,
  schedule_id bigint,
  volunteer_name text,
  team text,
  duty_role text,
  duty_date date,
  status text default 'Planned',
  created_at timestamptz default now()
);

create table if not exists service_schedules (
  id bigserial primary key,
  schedule_date date not null,
  huduma_type text,
  team text,
  volunteer text,
  role text,
  location text,
  time text,
  status text default 'Planned',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists volunteer_reports (
  id bigserial primary key,
  schedule_id bigint,
  report_title text not null,
  report_detail text,
  report_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists schedule_conflicts (
  id bigserial primary key,
  schedule_id bigint,
  conflict_type text,
  description text,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table if not exists activity_logs (
  id bigserial primary key,
  module text not null,
  action text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
