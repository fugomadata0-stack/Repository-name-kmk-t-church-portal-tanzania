-- PHASE 27: Elimu & Mafunzo
-- Supabase-ready table definitions

create table if not exists trainings (
  id bigserial primary key,
  training_id text unique,
  title text not null,
  category text,
  description text,
  trainer text,
  dayosisi text,
  jimbo text,
  tawi text,
  start_date date,
  end_date date,
  venue text,
  materials_placeholder text,
  status text default 'Planning',
  notes text,
  participants_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists training_participants (
  id bigserial primary key,
  training_id bigint references trainings(id) on delete cascade,
  participant_name text,
  participant_count integer default 1,
  registered_at timestamptz default now()
);

create table if not exists trainers (
  id bigserial primary key,
  trainer_name text not null,
  specialization text,
  dayosisi text,
  jimbo text,
  tawi text,
  created_at timestamptz default now()
);

create table if not exists training_materials (
  id bigserial primary key,
  training_id bigint references trainings(id) on delete cascade,
  material_name text,
  file_url text,
  uploaded_at timestamptz default now()
);

create table if not exists certificates_placeholder (
  id bigserial primary key,
  training_id bigint references trainings(id) on delete cascade,
  participant_name text,
  certificate_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists training_reports (
  id bigserial primary key,
  training_id bigint references trainings(id) on delete cascade,
  report_title text,
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
