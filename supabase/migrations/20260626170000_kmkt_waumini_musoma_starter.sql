-- Hatua 13: waumini — Musoma (sasisha mfano + familia za kuanzia halisi zaidi).

update public.church_families
set
  jimbo_name = 'Jimbo la Musoma',
  tawi_name = 'Tawi la Makao Makuu — Musoma',
  maelezo = 'Rekodi ya mfano — badilisha kwa data halisi ya familia.',
  updated_at = now()
where family_name = 'Familia ya Mfano — Petro';

update public.church_members m
set tawi_name = 'Tawi la Makao Makuu — Musoma', updated_at = now()
from public.church_families f
where m.family_id = f.id and f.family_name = 'Familia ya Mfano — Petro';

insert into public.church_families (family_name, jimbo_name, tawi_name, phone, maelezo, dayosisi_id)
select
  'Familia Makundi — Musoma',
  'Jimbo la Musoma',
  'Tawi la Makao Makuu — Musoma',
  '+255754001001',
  'Familia ya kuanzia — Jimbo la Musoma.',
  d.id
from public.dayosisi d
where lower(trim(d.code)) = 'mara'
  and not exists (select 1 from public.church_families where family_name = 'Familia Makundi — Musoma');

insert into public.church_members (
  family_id, first_name, last_name, gender, membership_status, is_baptized, baptism_date, baptism_place, tawi_name, phone, dayosisi_id, member_number
)
select
  f.id, 'Juma', 'Makundi', 'male', 'active', true, '2005-06-12'::date, 'Kanisa Kuu Musoma', 'Tawi la Makao Makuu — Musoma', '+255754001002', f.dayosisi_id, 'KMKT-MARA-0001'
from public.church_families f
where f.family_name = 'Familia Makundi — Musoma'
  and not exists (select 1 from public.church_members where member_number = 'KMKT-MARA-0001');

insert into public.church_members (
  family_id, first_name, last_name, gender, membership_status, is_baptized, tawi_name, phone, dayosisi_id, member_number
)
select
  f.id, 'Neema', 'Makundi', 'female', 'active', true, 'Tawi la Makao Makuu — Musoma', '+255754001003', f.dayosisi_id, 'KMKT-MARA-0002'
from public.church_families f
where f.family_name = 'Familia Makundi — Musoma'
  and not exists (select 1 from public.church_members where member_number = 'KMKT-MARA-0002');

insert into public.church_families (family_name, jimbo_name, tawi_name, phone, maelezo, dayosisi_id)
select
  'Familia Shirima — Musoma',
  'Jimbo la Musoma',
  'Tawi la Makao Makuu — Musoma',
  '+255754002001',
  'Familia ya kuanzia — Jimbo la Musoma.',
  d.id
from public.dayosisi d
where lower(trim(d.code)) = 'mara'
  and not exists (select 1 from public.church_families where family_name = 'Familia Shirima — Musoma');

insert into public.church_members (
  family_id, first_name, last_name, gender, membership_status, is_baptized, baptism_date, tawi_name, dayosisi_id, member_number
)
select
  f.id, 'Joseph', 'Shirima', 'male', 'active', true, '1998-03-20'::date, 'Tawi la Makao Makuu — Musoma', f.dayosisi_id, 'KMKT-MARA-0003'
from public.church_families f
where f.family_name = 'Familia Shirima — Musoma'
  and not exists (select 1 from public.church_members where member_number = 'KMKT-MARA-0003');

insert into public.church_members (
  family_id, first_name, last_name, gender, membership_status, is_baptized, tawi_name, dayosisi_id, member_number
)
select
  f.id, 'Grace', 'Shirima', 'female', 'visitor', false, 'Tawi la Makao Makuu — Musoma', f.dayosisi_id, 'KMKT-MARA-0004'
from public.church_families f
where f.family_name = 'Familia Shirima — Musoma'
  and not exists (select 1 from public.church_members where member_number = 'KMKT-MARA-0004');
