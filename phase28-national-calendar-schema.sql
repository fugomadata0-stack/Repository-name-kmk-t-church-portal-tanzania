-- PHASE 28: National Calendar / Kalenda Kuu
-- Supabase-ready table definitions

create table if not exists national_calendar (
  id bigserial primary key,
  title text not null,
  type text,
  scope text,
  dayosisi text,
  jimbo text,
  tawi text,
  date date,
  time text,
  status text default 'Scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists calendar_events (
  id bigserial primary key,
  title text not null,
  type text,
  scope text,
  dayosisi text,
  jimbo text,
  tawi text,
  date date,
  time text,
  status text default 'Scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists calendar_conflicts (
  id bigserial primary key,
  conflict_key text,
  title_a text,
  title_b text,
  date date,
  time text,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table if not exists calendar_sync_logs (
  id bigserial primary key,
  sync_scope text,
  synced_dayosisi text,
  sync_status text default 'success',
  synced_at timestamptz default now()
);

create table if not exists calendar_reminders (
  id bigserial primary key,
  event_id bigint,
  reminder_type text,
  reminder_time timestamptz,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists activity_logs (
  id bigserial primary key,
  module text not null,
  action text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
