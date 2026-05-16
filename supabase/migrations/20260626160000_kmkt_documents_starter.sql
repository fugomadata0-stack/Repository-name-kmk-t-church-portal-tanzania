-- Nyaraka za kuanzia (PDF kwenye tovuti ya Vercel — /docs/kmkt-mwongozo-portal.pdf)

insert into public.documents (
  title,
  category,
  file_url,
  description,
  type,
  department,
  uploaded_by,
  branch,
  visibility_level,
  status,
  file_name,
  mime_type,
  uploaded_at
)
select
  'Mwongozo wa Portal ya KMK(T)',
  'Mwongozo',
  'https://v0-church-portal-tanzania.vercel.app/docs/kmkt-mwongozo-portal.pdf',
  'Utangulizi wa matumizi ya portal ya Kanisa la Mennonite la Kiinjili Tanzania — moduli, uongozi, na usalama.',
  'PDF',
  'Ofisi ya KMK(T)',
  'Katibu Mkuu',
  'Mara — Musoma',
  'public',
  'active',
  'kmkt-mwongozo-portal.pdf',
  'application/pdf',
  now()
where not exists (
  select 1 from public.documents where lower(trim(title)) = lower('Mwongozo wa Portal ya KMK(T)')
);

insert into public.documents (
  title,
  category,
  file_url,
  description,
  type,
  department,
  uploaded_by,
  branch,
  visibility_level,
  status,
  file_name,
  mime_type,
  uploaded_at
)
select
  'Taarifa za Mawasiliano — Ofisi Kuu',
  'Mawasiliano',
  'https://v0-church-portal-tanzania.vercel.app/branding/kmkt-logo.svg',
  'Mawasiliano ya ofisi kuu: mennonitekiinjilikmkt@gmail.com · 0755 927 252 · S.L.P 317 Musoma.',
  'Taarifa',
  'Ofisi ya KMK(T)',
  'Katibu Mkuu',
  'Mara — Musoma',
  'public',
  'active',
  'kmkt-mawasiliano.svg',
  'image/svg+xml',
  now()
where not exists (
  select 1 from public.documents where lower(trim(title)) = lower('Taarifa za Mawasiliano — Ofisi Kuu')
);
