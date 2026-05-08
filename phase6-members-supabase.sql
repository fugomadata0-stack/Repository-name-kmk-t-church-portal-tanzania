-- PHASE 6 Members module (Supabase-ready)
create extension if not exists "pgcrypto";

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  picha text,
  jina text not null,
  jinsia text,
  tarehe_kuzaliwa date,
  umri int,
  simu text,
  email text,
  anwani text,
  mkoa text,
  wilaya text,
  kata text,
  mtaa text,
  dayosisi text,
  jimbo text,
  tawi text,
  huduma text,
  ndoa text,
  kazi text,
  ubatizo text,
  tarehe_kujiunga date,
  kitambulisho text,
  emergency_name text,
  emergency_phone text,
  uanachama text default 'Confirmed',
  status text default 'active',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.member_families (
  id uuid primary key default gen_random_uuid(),
  jina text not null,
  mkuu text,
  idadi int default 1,
  tawi text,
  simu text,
  anwani text,
  notes text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.baptism_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  muumini text not null,
  tarehe date,
  mahali text,
  mchungaji text,
  cert text,
  certificate_url text,
  notes text,
  status text default 'verified',
  created_at timestamptz default now()
);

create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  muumini text not null,
  aina text,
  file text not null,
  file_url text,
  uploaded date default current_date,
  visibility text default 'restricted',
  created_at timestamptz default now()
);

create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  note text not null,
  created_by text,
  created_at timestamptz default now()
);

create index if not exists idx_members_dayosisi on public.members(dayosisi);
create index if not exists idx_members_jimbo on public.members(jimbo);
create index if not exists idx_members_tawi on public.members(tawi);
create index if not exists idx_member_docs_member_id on public.member_documents(member_id);
create index if not exists idx_baptism_member_id on public.baptism_records(member_id);

alter table public.members enable row level security;
alter table public.member_families enable row level security;
alter table public.baptism_records enable row level security;
alter table public.member_documents enable row level security;
alter table public.member_notes enable row level security;

drop policy if exists "members_select_authenticated" on public.members;
create policy "members_select_authenticated" on public.members for select to authenticated using (true);
drop policy if exists "members_write_authenticated" on public.members;
create policy "members_write_authenticated" on public.members for all to authenticated using (true) with check (true);

drop policy if exists "families_rw_authenticated" on public.member_families;
create policy "families_rw_authenticated" on public.member_families for all to authenticated using (true) with check (true);

drop policy if exists "baptism_rw_authenticated" on public.baptism_records;
create policy "baptism_rw_authenticated" on public.baptism_records for all to authenticated using (true) with check (true);

drop policy if exists "member_docs_rw_authenticated" on public.member_documents;
create policy "member_docs_rw_authenticated" on public.member_documents for all to authenticated using (true) with check (true);

drop policy if exists "member_notes_rw_authenticated" on public.member_notes;
create policy "member_notes_rw_authenticated" on public.member_notes for all to authenticated using (true) with check (true);
