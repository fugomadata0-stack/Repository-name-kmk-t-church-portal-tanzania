-- SEO, viunganishi vya umma, hali ya matengenezoe — site_settings

alter table public.site_settings
  add column if not exists meta_title text;
alter table public.site_settings
  add column if not exists meta_description text;
alter table public.site_settings
  add column if not exists og_image_url text;
alter table public.site_settings
  add column if not exists canonical_base_url text;
alter table public.site_settings
  add column if not exists maintenance_mode boolean not null default false;
alter table public.site_settings
  add column if not exists maintenance_message text;
alter table public.site_settings
  add column if not exists social_links jsonb not null default '{}'::jsonb;

comment on column public.site_settings.meta_title is 'Kichwa cha tab / SEO';
comment on column public.site_settings.maintenance_mode is 'Uonyesho wa juu ya matengenezoe (portal)';
