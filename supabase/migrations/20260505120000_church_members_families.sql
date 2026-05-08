-- Waumini & Familia — jedwali halisi (data kwa Supabase; si seed za UI tu)
-- Jedwali public.dayosisi linaundwa na migration 20260502015000_dayosisi_table_core.sql.
-- RLS: anon kwa maendeleo — vuta kwa uzalishani na tumia authenticated + RLS kali.

create table if not exists public.church_families (
  id uuid primary key default gen_random_uuid(),
  family_name text not null,
  dayosisi_id uuid references public.dayosisi (id) on delete set null,
  jimbo_name text,
  tawi_name text,
  phone text,
  email text,
  maelezo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_families_dayosisi_idx on public.church_families (dayosisi_id);
create index if not exists church_families_name_idx on public.church_families (family_name);

create table if not exists public.church_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.church_families (id) on delete set null,
  first_name text not null default '',
  last_name text not null default '',
  gender text,
  birth_date date,
  phone text,
  email text,
  membership_status text not null default 'active'
    check (membership_status in ('active', 'visitor', 'transferred', 'deceased', 'suspended')),
  baptism_date date,
  baptism_place text,
  is_baptized boolean not null default false,
  member_number text,
  dayosisi_id uuid references public.dayosisi (id) on delete set null,
  tawi_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_members_member_number_unique unique (member_number)
);

create index if not exists church_members_family_idx on public.church_members (family_id);
create index if not exists church_members_status_idx on public.church_members (membership_status);
create index if not exists church_members_dayosisi_idx on public.church_members (dayosisi_id);
create index if not exists church_members_baptism_idx on public.church_members (baptism_date) where baptism_date is not null;

alter table public.church_families enable row level security;
alter table public.church_members enable row level security;

drop policy if exists "church_families_anon_all" on public.church_families;
create policy "church_families_anon_all" on public.church_families for all to anon using (true) with check (true);

drop policy if exists "church_families_auth_all" on public.church_families;
create policy "church_families_auth_all" on public.church_families for all to authenticated using (true) with check (true);

drop policy if exists "church_members_anon_all" on public.church_members;
create policy "church_members_anon_all" on public.church_members for all to anon using (true) with check (true);

drop policy if exists "church_members_auth_all" on public.church_members;
create policy "church_members_auth_all" on public.church_members for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.church_families to anon, authenticated;
grant select, insert, update, delete on public.church_members to anon, authenticated;

-- Mifano ya kuanzia (haitoi makosa wakati wa kurudia) — dayosisi_id inalingana na seed ya MARA
insert into public.church_families (family_name, jimbo_name, tawi_name, phone, maelezo, dayosisi_id)
select 'Familia ya Mfano — Petro', 'Jimbo la Mfano', 'Tawi la Amani', '+255700000001', 'Rekodi ya mfano — futa baada ya majaribio.', d.id
from public.dayosisi d
where d.code = 'MARA'
  and not exists (select 1 from public.church_families where family_name = 'Familia ya Mfano — Petro');

insert into public.church_members (
  family_id, first_name, last_name, gender, membership_status, is_baptized, baptism_date, baptism_place, tawi_name, phone, dayosisi_id
)
select f.id, 'Yohana', 'Petro', 'male', 'active', true, '2010-04-15'::date, 'Kanisa Kuu', 'Tawi la Amani', '+255700000002', f.dayosisi_id
from public.church_families f
where f.family_name = 'Familia ya Mfano — Petro'
  and not exists (select 1 from public.church_members m where m.first_name = 'Yohana' and m.last_name = 'Petro');

insert into public.church_members (
  family_id, first_name, last_name, gender, membership_status, is_baptized, tawi_name, dayosisi_id
)
select f.id, 'Rebeka', 'Petro', 'female', 'visitor', false, 'Tawi la Amani', f.dayosisi_id
from public.church_families f
where f.family_name = 'Familia ya Mfano — Petro'
  and not exists (select 1 from public.church_members m where m.first_name = 'Rebeka' and m.last_name = 'Petro');
