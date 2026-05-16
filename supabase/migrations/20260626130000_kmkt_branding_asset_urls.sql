-- Weka URL za nembo/hero baada ya seed: npm run seed:branding (site-assets)

do $$
declare
  base text := 'https://tjtsrirwdssocaplsfql.supabase.co/storage/v1/object/public/site-assets';
  logo text := base || '/about/logo/kmkt-logo.svg';
  fav text := base || '/favicon/favicon.svg';
  hero text := base || '/about/hero/church-hero.svg';
begin
  update public.portal_theme_settings
  set logo_url = logo, favicon_url = fav, updated_at = now()
  where singleton_key = 'default';

  update public.church_identity
  set logo_url = logo, favicon_url = fav, cover_image_url = hero, updated_at = now()
  where singleton_key = 'default';

  update public.about_kmkt
  set logo_url = logo, hero_image_url = hero, updated_at = now();

  update public.national_leadership_profiles
  set profile_photo_url = base || '/about/national/askofu_mkuu.svg', updated_at = now()
  where role_key = 'askofu_mkuu';

  update public.national_leadership_profiles
  set profile_photo_url = base || '/about/national/katibu_mkuu.svg', updated_at = now()
  where role_key = 'katibu_mkuu';

  update public.national_leadership_profiles
  set profile_photo_url = base || '/about/national/naibu_katibu_mkuu.svg', updated_at = now()
  where role_key = 'naibu_katibu_mkuu';

  update public.national_leadership_profiles
  set profile_photo_url = base || '/about/national/mhasibu_mkuu.svg', updated_at = now()
  where role_key = 'mhasibu_mkuu';

  update public.site_settings
  set favicon_url = fav, updated_at = now()
  where favicon_url is null or trim(favicon_url) = '';
end $$;
