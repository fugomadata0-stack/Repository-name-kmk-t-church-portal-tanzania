-- PHASE 23: Wageni & Follow-up
-- Supabase-ready table definitions

create table if not exists visitors (
  id bigserial primary key,
  visitor_name text not null,
  phone text,
  email text,
  address text,
  dayosisi text,
  jimbo text,
  tawi text,
  invited_by text,
  source text default 'Other',
  notes text,
  visit_date date default current_date,
  followup_date date,
  followup_status text default 'Pending',
  status text default 'New',
  visit_count integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists visitor_followups (
  id bigserial primary key,
  visitor_id bigint references visitors(id) on delete cascade,
  visitor_name text,
  assigned_to text,
  followup_date date,
  followup_status text default 'Pending',
  result_notes text,
  created_at timestamptz default now()
);

create table if not exists visitor_notes (
  id bigserial primary key,
  visitor_id bigint references visitors(id) on delete cascade,
  note text,
  created_at timestamptz default now()
);

create table if not exists visitor_sms_logs (
  id bigserial primary key,
  visitor_id bigint references visitors(id) on delete cascade,
  phone text,
  message text,
  status text default 'sent',
  sent_at timestamptz default now()
);

create table if not exists visitor_conversion_logs (
  id bigserial primary key,
  visitor_id bigint references visitors(id) on delete cascade,
  visitor_name text,
  converted_by text,
  converted_at timestamptz default now(),
  notes text
);

create table if not exists activity_logs (
  id bigserial primary key,
  module text not null,
  action text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
