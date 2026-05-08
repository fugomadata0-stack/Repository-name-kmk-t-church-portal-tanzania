-- Step 11: Leadership / Viongozi Pro Level

alter table if exists public.church_viongozi
  add column if not exists full_name text null,
  add column if not exists photo_url text null,
  add column if not exists gender text null,
  add column if not exists email text null,
  add column if not exists position_id uuid null,
  add column if not exists leadership_level text null,
  add column if not exists assigned_entity text null,
  add column if not exists idara_name text null,
  add column if not exists huduma_name text null,
  add column if not exists taasisi_name text null,
  add column if not exists jumuiya_name text null,
  add column if not exists start_date date null,
  add column if not exists end_date date null,
  add column if not exists term_status text not null default 'active',
  add column if not exists appointment_document_url text null,
  add column if not exists notes text null;

create table if not exists public.leadership_positions (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  level_key text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leadership_terms (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  position_id uuid null references public.leadership_positions (id) on delete set null,
  start_date date not null,
  end_date date null,
  term_status text not null default 'active',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leadership_documents (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  file_url text not null,
  file_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.leadership_positions enable row level security;
alter table public.leadership_terms enable row level security;
alter table public.leadership_documents enable row level security;
grant select, insert, update, delete on public.leadership_positions to authenticated;
grant select, insert, update, delete on public.leadership_terms to authenticated;
grant select, insert, update, delete on public.leadership_documents to authenticated;

drop policy if exists leadership_positions_auth_all on public.leadership_positions;
create policy leadership_positions_auth_all on public.leadership_positions
for all to authenticated
using (public.portal_has_module_capability('viongozi', 'view'))
with check (public.portal_has_module_capability('viongozi', 'edit'));

drop policy if exists leadership_terms_auth_all on public.leadership_terms;
create policy leadership_terms_auth_all on public.leadership_terms
for all to authenticated
using (public.portal_has_module_capability('viongozi', 'view'))
with check (public.portal_has_module_capability('viongozi', 'edit'));

drop policy if exists leadership_documents_auth_all on public.leadership_documents;
create policy leadership_documents_auth_all on public.leadership_documents
for all to authenticated
using (public.portal_has_module_capability('viongozi', 'view'))
with check (public.portal_has_module_capability('viongozi', 'edit'));

insert into public.leadership_positions (title, level_key)
values
  ('Askofu Mkuu', 'KMK(T) National Level'),
  ('Askofu', 'Dayosisi Level'),
  ('Katibu Mkuu', 'KMK(T) National Level'),
  ('Mhazini Mkuu', 'KMK(T) National Level'),
  ('Mchungaji', 'Jimbo Level'),
  ('Mzee wa Kanisa', 'Tawi/Kituo Level'),
  ('Mwenyekiti', 'Jumuiya Level'),
  ('Katibu', 'Idara Level'),
  ('Mhasibu', 'Taasisi Level'),
  ('Kiongozi wa Idara', 'Idara Level'),
  ('Mkurugenzi wa Taasisi', 'Taasisi Level')
on conflict (title) do nothing;

create or replace function public.portal_leadership_term_autoclose()
returns trigger
language plpgsql
as $$
begin
  if new.end_date is not null and new.end_date < current_date and new.term_status = 'active' then
    new.term_status := 'ended';
  end if;
  return new;
end;
$$;

drop trigger if exists leadership_terms_autoclose on public.leadership_terms;
create trigger leadership_terms_autoclose
before insert or update on public.leadership_terms
for each row execute procedure public.portal_leadership_term_autoclose();
