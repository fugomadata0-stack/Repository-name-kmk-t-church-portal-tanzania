-- Maudhui ya kuanzia: muundo, habari, matukio, picha (idempotent; inalingana na KMK(T) Musoma).

-- ——— Jimbo / Tawi (Mara — makao makuu) ———
insert into public.church_jimbo (dayosisi_id, jina, mkuu, mkoa, simu, status)
select d.id, 'Jimbo la Musoma', 'LAMECK NICODEMUS MANJI', 'Mara', '0755927252', 'active'
from public.dayosisi d
where lower(trim(d.code)) = 'mara'
  and not exists (
    select 1 from public.church_jimbo j
    where j.dayosisi_id = d.id and lower(trim(j.jina)) = lower('Jimbo la Musoma')
  );

insert into public.church_tawi (jimbo_id, jina, aina, kiongozi, simu, status)
select j.id, 'Tawi la Makao Makuu — Musoma', 'Tawi', 'MCH JOHN MUTTANI SEAN', '+255783858902', 'active'
from public.church_jimbo j
join public.dayosisi d on d.id = j.dayosisi_id
where lower(trim(d.code)) = 'mara' and lower(trim(j.jina)) = lower('Jimbo la Musoma')
  and not exists (
    select 1 from public.church_tawi t
    where t.jimbo_id = j.id and lower(trim(t.jina)) = lower('Tawi la Makao Makuu — Musoma')
  );

-- ——— Familia / wanachama wa mfano (ikiwa hayapo) ———
insert into public.church_families (family_name, jimbo_name, tawi_name, phone, maelezo, dayosisi_id)
select
  'Familia ya Mfano — Petro',
  'Jimbo la Musoma',
  'Tawi la Makao Makuu — Musoma',
  '+255700000001',
  'Rekodi ya mfano — badilisha kwa data halisi.',
  d.id
from public.dayosisi d
where lower(trim(d.code)) = 'mara'
  and not exists (select 1 from public.church_families where family_name = 'Familia ya Mfano — Petro');

-- ——— Habari (published, public) ———
insert into public.news_posts (
  title, content, category, image_url, slug, summary, author, status, publish_date, is_public, featured
)
select
  'Karibu kwenye Portal ya KMK(T)',
  E'Kanisa la Mennonite la Kiinjili Tanzania lina furaha kukaribisha waumini na viongozi kwenye mfumo mpya wa kidijitali wa usimamizi wa kanisa.\n\nPortal hii inasaidia: usajili wa waumini, matukio, habari, nyaraka, na ripoti za uongozi wa kitaifa.',
  'Taarifa',
  base || '/about/hero/church-hero.svg',
  'karibu-portal-kmkt',
  'Utangulizi wa portal rasmi ya KMK(T) Tanzania.',
  'Ofisi ya KMK(T)',
  'published',
  now(),
  true,
  true
from (select 'https://tjtsrirwdssocaplsfql.supabase.co/storage/v1/object/public/site-assets' as base) s
where not exists (select 1 from public.news_posts where slug = 'karibu-portal-kmkt');

insert into public.news_posts (
  title, content, category, image_url, slug, summary, author, status, publish_date, is_public, featured
)
select
  'Uongozi wa Kitaifa — Huduma Endelevu',
  E'KMK(T) inaendelea na huduma za kiroho na uongozi wa kitaifa chini ya Askofu Mkuu, Katibu Mkuu, Naibu Katibu Mkuu, na Mhasibu Mkuu.\n\nWasiliana na ofisi: mennonitekiinjilikmkt@gmail.com · 0755 927 252.',
  'Uongozi',
  base || '/about/logo/kmkt-logo.svg',
  'uongozi-kitaifa-kmkt',
  'Taarifa fupi kuhusu uongozi wa kitaifa wa KMK(T).',
  'Katibu Mkuu',
  'published',
  now() - interval '2 days',
  true,
  false
from (select 'https://tjtsrirwdssocaplsfql.supabase.co/storage/v1/object/public/site-assets' as base) s
where not exists (select 1 from public.news_posts where slug = 'uongozi-kitaifa-kmkt');

-- ——— Matukio (umma, ijayo) ———
insert into public.events (
  title, description, event_date, event_time, location, organizer, speaker, status, is_public, poster_url
)
select
  'Mkutano wa Jimbo — Musoma',
  'Mkutano wa viongozi na wawakilishi wa Jimbo la Musoma. Ratiba kamili itatangazwa na ofisi ya Katibu Mkuu.',
  (current_date + interval '21 days')::date,
  '09:00',
  'Musoma, Mara',
  'KMK(T) — Jimbo la Musoma',
  'LAMECK NICODEMUS MANJI',
  'upcoming',
  true,
  base || '/about/hero/church-hero.svg'
from (select 'https://tjtsrirwdssocaplsfql.supabase.co/storage/v1/object/public/site-assets' as base) s
where not exists (
  select 1 from public.events where lower(trim(title)) = lower('Mkutano wa Jimbo — Musoma')
);

insert into public.events (
  title, description, event_date, event_time, location, organizer, speaker, status, is_public, poster_url
)
select
  'Ibada ya Pamoja ya KMK(T)',
  'Ibada ya pamoja ya viongozi na waumini — siku ya maombi na ushirika.',
  (current_date + interval '35 days')::date,
  '10:00',
  'S.L.P 317, Musoma — Mara',
  'KMK(T) National',
  'MCH JOHN MUTTANI SEAN',
  'upcoming',
  true,
  base || '/about/logo/kmkt-logo.svg'
from (select 'https://tjtsrirwdssocaplsfql.supabase.co/storage/v1/object/public/site-assets' as base) s
where not exists (
  select 1 from public.events where lower(trim(title)) = lower('Ibada ya Pamoja ya KMK(T)')
);

-- ——— Picha (gallery) ———
insert into public.gallery (title, image_url, category)
select
  'Ushirika wa Waumini — KMK(T)',
  base || '/about/hero/church-hero.svg',
  'Kanisa'
from (select 'https://tjtsrirwdssocaplsfql.supabase.co/storage/v1/object/public/site-assets' as base) s
where not exists (
  select 1 from public.gallery where lower(trim(title)) = lower('Ushirika wa Waumini — KMK(T)')
);

insert into public.gallery (title, image_url, category)
select
  'Nembo ya KMK(T)',
  base || '/about/logo/kmkt-logo.svg',
  'Utambulisho'
from (select 'https://tjtsrirwdssocaplsfql.supabase.co/storage/v1/object/public/site-assets' as base) s
where not exists (
  select 1 from public.gallery where lower(trim(title)) = lower('Nembo ya KMK(T)')
);
