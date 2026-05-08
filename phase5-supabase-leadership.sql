-- PHASE 5: Leadership Management tables (Supabase PostgreSQL)

create extension if not exists "pgcrypto";

create table if not exists public.leaders (
  id uuid primary key default gen_random_uuid(),
  picha text,
  jina text not null,
  jinsia text,
  tarehe_kuzaliwa date,
  cheo text not null,
  ngazi text not null,
  dayosisi text,
  jimbo text,
  tawi text,
  simu text,
  email text,
  anwani text,
  tarehe_kuanza date,
  tarehe_kumaliza date,
  elimu text,
  uzoefu text,
  wasifu text,
  nyaraka text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.leader_assignments (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.leaders(id) on delete cascade,
  role_name text not null,
  leadership_level text,
  dayosisi text,
  jimbo text,
  tawi text,
  start_date date,
  end_date date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.leadership_history (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references public.leaders(id) on delete set null,
  kiongozi text not null,
  cheo text not null,
  eneo text,
  kuanza date,
  kumaliza date,
  status text default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.leader_documents (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references public.leaders(id) on delete set null,
  kiongozi text not null,
  aina text not null,
  file_name text not null,
  file_url text,
  uploaded_by text,
  uploaded_date date default current_date,
  visibility text default 'restricted',
  created_at timestamptz not null default now()
);

create index if not exists idx_leaders_cheo on public.leaders(cheo);
create index if not exists idx_leaders_dayosisi on public.leaders(dayosisi);
create index if not exists idx_assignments_leader_id on public.leader_assignments(leader_id);
create index if not exists idx_history_leader_id on public.leadership_history(leader_id);
create index if not exists idx_docs_leader_id on public.leader_documents(leader_id);

alter table public.leaders enable row level security;
alter table public.leader_assignments enable row level security;
alter table public.leadership_history enable row level security;
alter table public.leader_documents enable row level security;

drop policy if exists "authenticated read leaders" on public.leaders;
create policy "authenticated read leaders" on public.leaders
for select to authenticated using (true);

drop policy if exists "authenticated write leaders" on public.leaders;
create policy "authenticated write leaders" on public.leaders
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read leader_assignments" on public.leader_assignments;
create policy "authenticated read leader_assignments" on public.leader_assignments
for select to authenticated using (true);

drop policy if exists "authenticated write leader_assignments" on public.leader_assignments;
create policy "authenticated write leader_assignments" on public.leader_assignments
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read leadership_history" on public.leadership_history;
create policy "authenticated read leadership_history" on public.leadership_history
for select to authenticated using (true);

drop policy if exists "authenticated write leadership_history" on public.leadership_history;
create policy "authenticated write leadership_history" on public.leadership_history
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read leader_documents" on public.leader_documents;
create policy "authenticated read leader_documents" on public.leader_documents
for select to authenticated using (true);

drop policy if exists "authenticated write leader_documents" on public.leader_documents;
create policy "authenticated write leader_documents" on public.leader_documents
for all to authenticated using (true) with check (true);
