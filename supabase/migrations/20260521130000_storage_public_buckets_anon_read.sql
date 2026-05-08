-- Vitendo vya GET kwa URL za umma (/object/public/...) vinatumia role ya anon — hazileti JWT.
-- Sera zilizo "for select to authenticated" pekee zilizuia onyesho la picha/video kwa <img> na tag za media.
-- Bucket zifuatazo zimesanidiwa public=true; sera hii inalingana na kusoma kwa umma bila kuondoa RBAC ya kuongeza/kufuta.

drop policy if exists "public_portal_buckets_read_anon" on storage.objects;
create policy "public_portal_buckets_read_anon"
  on storage.objects for select to anon
  using (
    bucket_id in (
      'developer-photos',
      'church-documents',
      'church-events-media',
      'church-gallery',
      'church-videos',
      'church-audio',
      'church-files',
      'church-images',
      'church-media',
      'site-assets'
    )
  );
