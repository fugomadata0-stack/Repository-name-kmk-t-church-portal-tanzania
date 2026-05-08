-- Demo (anon key): ruhusu upakiaji wa picha za tovuti — hero/cross/gallery/about
-- Ondoa uzalishani; tumia Auth halisi + sera kali.

drop policy if exists "site_assets_branding_anon_insert_demo" on storage.objects;
create policy "site_assets_branding_anon_insert_demo" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'site-assets'
    and (
      name like 'hero/%'
      or name like 'cross/%'
      or name like 'gallery/%'
      or name like 'about/%'
    )
  );
