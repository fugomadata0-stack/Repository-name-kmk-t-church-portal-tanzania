-- Hatua 14: Mahubiri, Video, Sauti, Mawasiliano (maudhui ya kuanzia).

-- ——— Mahubiri ———
insert into public.sermons (title, preacher, date, scripture, media_type, media_url, description, status)
select
  'Uongozi wa Kiroho — KMK(T)',
  'LAMECK NICODEMUS MANJI',
  (current_date - interval '14 days')::date,
  'Mathayo 28:19-20',
  'video',
  'https://www.youtube.com/watch?v=QwZJgdq-9l0',
  'Hotuba ya kuanzia kuhusu uongozi na huduma ya KMK(T) Tanzania.',
  'active'
where not exists (
  select 1 from public.sermons where lower(trim(title)) = lower('Uongozi wa Kiroho — KMK(T)')
);

insert into public.sermons (title, preacher, date, scripture, media_type, media_url, description, status)
select
  'Ibada ya Jumapili — Musoma',
  'MCH JOHN MUTTANI SEAN',
  (current_date - interval '7 days')::date,
  'Zaburi 23:1-6',
  'audio',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'Rekodi ya sauti ya ibada (mfano wa maudhui — badilisha na faili halisi).',
  'active'
where not exists (
  select 1 from public.sermons where lower(trim(title)) = lower('Ibada ya Jumapili — Musoma')
);

-- ——— Video ———
insert into public.videos (title, video_url, thumbnail_url, status)
select
  'Mkutano wa Jimbo — Muhtasari',
  'https://www.youtube.com/watch?v=QwZJgdq-9l0',
  'https://v0-church-portal-tanzania.vercel.app/about/hero/church-hero.svg',
  'active'
where not exists (
  select 1 from public.videos where lower(trim(title)) = lower('Mkutano wa Jimbo — Muhtasari')
);

-- ——— Sauti ———
insert into public.audios (title, audio_url, status)
select
  'Wimbo wa Sifa — KMK(T)',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'active'
where not exists (
  select 1 from public.audios where lower(trim(title)) = lower('Wimbo wa Sifa — KMK(T)')
);

-- ——— Mifano ya mawasiliano ———
insert into public.communication_templates (name, channel, subject, body, category, is_active)
select
  'Tangazo la Mkutano — SMS',
  'sms',
  null,
  'KMK(T): Mkutano wa {jimbo} utafanyika {tarehe} saa {saa} — {mahali}. Mch JOHN MUTTANI SEAN.',
  'Matukio',
  true
where not exists (
  select 1 from public.communication_templates where name = 'Tangazo la Mkutano — SMS'
);

insert into public.communication_templates (name, channel, subject, body, category, is_active)
select
  'Karibu Portal — Barua pepe',
  'email',
  'Karibu kwenye Portal ya KMK(T)',
  E'Ndugu {name},\n\nAkaunti yako ya portal ya KMK(T) iko tayari. Ingia kwenye https://v0-church-portal-tanzania.vercel.app\n\nBaraka,\nOfisi ya KMK(T)',
  'Portal',
  true
where not exists (
  select 1 from public.communication_templates where name = 'Karibu Portal — Barua pepe'
);

insert into public.communications (
  title, message, subject, channel, target_type, target_group, status, recipients_count, sent_at
)
select
  'Karibu kwenye Portal ya KMK(T)',
  'Kanisa la Mennonite la Kiinjili Tanzania lina furaha kutangaza mfumo mpya wa kidijitali. Ingia, sasisha wasifu wako, na tumia moduli za waumini, matukio, na habari.',
  'Portal ya KMK(T) — Tanguazo',
  'both',
  'all',
  'Watumishi wa KMK(T)',
  'sent',
  0,
  now() - interval '1 day'
where not exists (
  select 1 from public.communications where lower(trim(title)) = lower('Karibu kwenye Portal ya KMK(T)')
);

insert into public.communications (
  title, message, channel, target_type, target_group, status, scheduled_at, recipients_count
)
select
  'Kumbusho: Mkutano wa Jimbo la Musoma',
  'Kumbusho kwa viongozi na wawakilishi: Mkutano wa Jimbo la Musoma utafanyika hivi karibuni. Tafadhali thibitisha mahudhurio kupitia portal.',
  'sms',
  'group',
  'Jimbo la Musoma',
  'draft',
  (current_date + interval '14 days')::timestamptz + time '09:00',
  0
where not exists (
  select 1 from public.communications where lower(trim(title)) = lower('Kumbusho: Mkutano wa Jimbo la Musoma')
);
