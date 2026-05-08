-- PHASE 25: Mali za Kanisa / Assets Register
-- Supabase-ready table definitions

create table if not exists assets (
  id bigserial primary key,
  asset_id text unique,
  asset_name text not null,
  category text,
  description text,
  serial_number text,
  dayosisi text,
  jimbo text,
  tawi text,
  location text,
  acquisition_date date,
  estimated_value numeric default 0,
  condition text,
  responsible_person text,
  notes text,
  status text default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists asset_categories (
  id bigserial primary key,
  category_name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists asset_documents (
  id bigserial primary key,
  asset_id bigint references assets(id) on delete cascade,
  document_name text,
  document_type text,
  file_url text,
  uploaded_at timestamptz default now()
);

create table if not exists asset_maintenance (
  id bigserial primary key,
  asset_id bigint references assets(id) on delete cascade,
  maintenance_date date default current_date,
  status text default 'Pending',
  notes text,
  created_at timestamptz default now()
);

create table if not exists asset_valuations (
  id bigserial primary key,
  asset_id bigint references assets(id) on delete cascade,
  estimated_value numeric default 0,
  valuation_date date default current_date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists asset_reports (
  id bigserial primary key,
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
