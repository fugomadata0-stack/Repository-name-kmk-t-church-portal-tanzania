-- PHASE 26: Miradi & Maendeleo
-- Supabase-ready table definitions

create table if not exists projects (
  id bigserial primary key,
  project_id text unique,
  title text not null,
  category text,
  description text,
  dayosisi text,
  jimbo text,
  tawi text,
  start_date date,
  end_date date,
  target_amount numeric default 0,
  collected_amount numeric default 0,
  responsible_leader text,
  image_placeholder text,
  status text default 'Planning',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_contributions (
  id bigserial primary key,
  project_id bigint references projects(id) on delete cascade,
  amount numeric default 0,
  contributor text,
  contribution_date date default current_date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists project_expenses (
  id bigserial primary key,
  project_id bigint references projects(id) on delete cascade,
  amount numeric default 0,
  expense_type text,
  expense_date date default current_date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists project_updates (
  id bigserial primary key,
  project_id bigint references projects(id) on delete cascade,
  update_note text,
  update_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists project_gallery (
  id bigserial primary key,
  project_id bigint references projects(id) on delete cascade,
  image_url text,
  caption text,
  uploaded_at timestamptz default now()
);

create table if not exists project_reports (
  id bigserial primary key,
  project_id bigint references projects(id) on delete cascade,
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
