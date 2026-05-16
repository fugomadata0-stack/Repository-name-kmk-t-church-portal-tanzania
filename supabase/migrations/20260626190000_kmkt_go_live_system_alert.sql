-- Tangazo la ndani ya portal — portal iko live (system_alerts).

insert into public.system_alerts (
  type,
  module,
  title,
  message,
  priority,
  status,
  action_url
)
select
  'announcement',
  'portal',
  'Portal ya KMK(T) iko tayari',
  'Mfumo mpya wa kidijitali umeanzishwa. Tumia moduli za Waumini, Habari, Matukio, na Mipangilio. Wasiliana na chief_admin kwa mialiko na ruhusa.',
  'info',
  'open',
  'https://v0-church-portal-tanzania.vercel.app/'
where not exists (
  select 1 from public.system_alerts where lower(trim(title)) = lower('Portal ya KMK(T) iko tayari')
);
