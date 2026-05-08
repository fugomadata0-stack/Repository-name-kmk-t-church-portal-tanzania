-- PHASE 4: Church Structure migration bundle (Supabase PostgreSQL)

create extension if not exists "pgcrypto";

create table if not exists public.dayosisi (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  jina text not null,
  askofu text not null,
  mkoa text not null,
  ofisi text,
  anwani text,
  simu text,
  email text,
  maelezo text,
  logo_url text,
  gps text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.majimbo (
  id uuid primary key default gen_random_uuid(),
  dayosisi_id uuid not null references public.dayosisi(id) on delete cascade,
  code text unique not null,
  jina text not null,
  mkuu text not null,
  mkoa text not null,
  wilaya text,
  kata text,
  anwani text,
  simu text,
  email text,
  maelezo text,
  gps text,
  notes text,
  status text not null default 'active',
  matawi_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.matawi (
  id uuid primary key default gen_random_uuid(),
  dayosisi_id uuid not null references public.dayosisi(id) on delete cascade,
  jimbo_id uuid not null references public.majimbo(id) on delete cascade,
  code text unique not null,
  jina text not null,
  mchungaji text not null,
  mkoa text not null,
  wilaya text,
  kata text,
  mtaa text,
  anwani text,
  simu text,
  email text,
  ratiba text,
  picha_url text,
  gps text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.church_units (
  id uuid primary key default gen_random_uuid(),
  unit_type text not null,
  ref_id uuid not null,
  parent_ref_id uuid,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  region text,
  district text,
  ward text,
  street text,
  gps text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  module text not null,
  action text not null,
  description text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_majimbo_dayosisi_id on public.majimbo(dayosisi_id);
create index if not exists idx_matawi_dayosisi_id on public.matawi(dayosisi_id);
create index if not exists idx_matawi_jimbo_id on public.matawi(jimbo_id);
create index if not exists idx_activity_logs_module on public.activity_logs(module);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

alter table public.dayosisi enable row level security;
alter table public.majimbo enable row level security;
alter table public.matawi enable row level security;
alter table public.church_units enable row level security;
alter table public.locations enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "authenticated read dayosisi" on public.dayosisi;
create policy "authenticated read dayosisi" on public.dayosisi
for select to authenticated using (true);

drop policy if exists "authenticated write dayosisi" on public.dayosisi;
create policy "authenticated write dayosisi" on public.dayosisi
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read majimbo" on public.majimbo;
create policy "authenticated read majimbo" on public.majimbo
for select to authenticated using (true);

drop policy if exists "authenticated write majimbo" on public.majimbo;
create policy "authenticated write majimbo" on public.majimbo
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read matawi" on public.matawi;
create policy "authenticated read matawi" on public.matawi
for select to authenticated using (true);

drop policy if exists "authenticated write matawi" on public.matawi;
create policy "authenticated write matawi" on public.matawi
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read church_units" on public.church_units;
create policy "authenticated read church_units" on public.church_units
for select to authenticated using (true);

drop policy if exists "authenticated write church_units" on public.church_units;
create policy "authenticated write church_units" on public.church_units
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read locations" on public.locations;
create policy "authenticated read locations" on public.locations
for select to authenticated using (true);

drop policy if exists "authenticated write locations" on public.locations;
create policy "authenticated write locations" on public.locations
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read activity_logs" on public.activity_logs;
create policy "authenticated read activity_logs" on public.activity_logs
for select to authenticated using (true);

drop policy if exists "authenticated write activity_logs" on public.activity_logs;
create policy "authenticated write activity_logs" on public.activity_logs
for all to authenticated using (true) with check (true);
