-- Jedwali la dayosisi (Muundo) — lazima liwe kabla ya sera za anon (20260502120000) na FK za waumini.
-- Safu zinalingana na app-next/src/services/dayosisiService.ts

create table if not exists public.dayosisi (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  jina text not null,
  askofu text not null default '',
  mkoa text not null default '',
  ofisi text,
  anwani text,
  simu text,
  email text,
  maelezo text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dayosisi_code_lower_unique on public.dayosisi (lower(trim(code)));

-- Mifano (id thabiti ili FK za seed za waumini ziwe na thamani)
insert into public.dayosisi (id, code, jina, askofu, mkoa, ofisi, simu, email, maelezo, status)
select 'a1111111-1111-4111-8111-111111111111'::uuid,
       'MARA',
       'Dayosisi ya Mara',
       'Lameck Nicodemus Manji',
       'Mara',
       'Musoma',
       '+255700111001',
       'mara@kmkt.or.tz',
       '',
       'active'
where not exists (select 1 from public.dayosisi where lower(trim(code)) = 'mara');

insert into public.dayosisi (id, code, jina, askofu, mkoa, ofisi, simu, email, maelezo, status)
select 'a2222222-2222-4222-8222-222222222222'::uuid,
       'MWZ',
       'Dayosisi ya Mwanza',
       'Paulo Petro Chemere',
       'Mwanza',
       'Mwanza',
       '+255700111002',
       'mwanza@kmkt.or.tz',
       '',
       'active'
where not exists (select 1 from public.dayosisi where lower(trim(code)) = 'mwz');
