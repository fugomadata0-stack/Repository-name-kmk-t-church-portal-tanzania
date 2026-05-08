-- PHASE 7: Ministries Module (Supabase-ready)
create table if not exists ministries (
  id bigserial primary key,
  jina text not null,
  aina text not null,
  maelezo text,
  kiongozi text not null,
  msaidizi text,
  dayosisi text not null,
  jimbo text not null,
  tawi text not null,
  tarehe_kuanzishwa date,
  lengo text,
  ratiba text,
  status text default 'active',
  notes text,
  logo text,
  washiriki integer default 0,
  shughuli integer default 0,
  created_at timestamptz default now()
);

create table if not exists ministry_members (
  id bigserial primary key,
  jina text not null,
  idara text not null,
  role text not null,
  tawi text,
  simu text,
  kujiunga date,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists ministry_leaders (
  id bigserial primary key,
  kiongozi text not null,
  idara text not null,
  cheo text not null,
  dayosisi text,
  jimbo text,
  tawi text,
  simu text,
  email text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists ministry_activities (
  id bigserial primary key,
  jina text not null,
  idara text not null,
  tarehe date,
  muda text,
  mahali text,
  msimamizi text,
  maelezo text,
  budget numeric(14,2),
  washiriki integer default 0,
  status text default 'planned',
  notes text,
  created_at timestamptz default now()
);

create table if not exists ministry_contributions (
  id bigserial primary key,
  idara text not null,
  aina text not null,
  kiasi numeric(14,2) not null default 0,
  mlipaji text,
  tarehe date,
  method text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table ministries enable row level security;
alter table ministry_members enable row level security;
alter table ministry_leaders enable row level security;
alter table ministry_activities enable row level security;
alter table ministry_contributions enable row level security;

drop policy if exists "authenticated ministries all" on ministries;
create policy "authenticated ministries all" on ministries for all to authenticated using (true) with check (true);
drop policy if exists "authenticated ministry_members all" on ministry_members;
create policy "authenticated ministry_members all" on ministry_members for all to authenticated using (true) with check (true);
drop policy if exists "authenticated ministry_leaders all" on ministry_leaders;
create policy "authenticated ministry_leaders all" on ministry_leaders for all to authenticated using (true) with check (true);
drop policy if exists "authenticated ministry_activities all" on ministry_activities;
create policy "authenticated ministry_activities all" on ministry_activities for all to authenticated using (true) with check (true);
drop policy if exists "authenticated ministry_contributions all" on ministry_contributions;
create policy "authenticated ministry_contributions all" on ministry_contributions for all to authenticated using (true) with check (true);
