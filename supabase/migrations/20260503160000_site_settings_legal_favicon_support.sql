-- Favicon, viungo vya sheria, msaada

alter table public.site_settings
  add column if not exists favicon_url text;
alter table public.site_settings
  add column if not exists privacy_policy_url text;
alter table public.site_settings
  add column if not exists terms_of_service_url text;
alter table public.site_settings
  add column if not exists cookies_notice_url text;
alter table public.site_settings
  add column if not exists support_url text;

comment on column public.site_settings.privacy_policy_url is 'Sera ya faragha (URL)';
comment on column public.site_settings.favicon_url is 'Ikoni ya kivinjari (URL)';
