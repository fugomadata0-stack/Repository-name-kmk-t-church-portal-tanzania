-- Picha za viongozi (initiale, tofauti) — hosted kwenye Vercel /national/*.svg

do $$
declare
  base text := 'https://v0-church-portal-tanzania.vercel.app/national';
begin
  update public.national_leadership_profiles
  set profile_photo_url = base || '/askofu_mkuu.svg', updated_at = now()
  where role_key = 'askofu_mkuu';

  update public.national_leadership_profiles
  set profile_photo_url = base || '/katibu_mkuu.svg', updated_at = now()
  where role_key = 'katibu_mkuu';

  update public.national_leadership_profiles
  set profile_photo_url = base || '/naibu_katibu_mkuu.svg', updated_at = now()
  where role_key = 'naibu_katibu_mkuu';

  update public.national_leadership_profiles
  set profile_photo_url = base || '/mhasibu_mkuu.svg', updated_at = now()
  where role_key = 'mhasibu_mkuu';

  update public.church_structure_leaders
  set photo_url = base || '/askofu_mkuu.svg', updated_at = now()
  where lower(trim(position_title)) = lower('Mkuu wa Jimbo');

  update public.church_structure_leaders
  set photo_url = base || '/katibu_mkuu.svg', updated_at = now()
  where lower(trim(position_title)) = lower('Kiongozi wa Tawi');
end $$;

alter table public.church_viongozi disable trigger trg_kmkt_guard_official_leadership_upd;

update public.church_viongozi set photo_url = 'https://v0-church-portal-tanzania.vercel.app/national/askofu_mkuu.svg', updated_at = now()
where official_lock_key = 'kmkt_official_askofu_mkuu';

update public.church_viongozi set photo_url = 'https://v0-church-portal-tanzania.vercel.app/national/katibu_mkuu.svg', updated_at = now()
where official_lock_key = 'kmkt_official_katibu_mkuu';

update public.church_viongozi set photo_url = 'https://v0-church-portal-tanzania.vercel.app/national/naibu_katibu_mkuu.svg', updated_at = now()
where official_lock_key = 'kmkt_official_naibu_katibu_mkuu';

update public.church_viongozi set photo_url = 'https://v0-church-portal-tanzania.vercel.app/national/mhasibu_mkuu.svg', updated_at = now()
where official_lock_key = 'kmkt_official_mhasibu';

alter table public.church_viongozi enable trigger trg_kmkt_guard_official_leadership_upd;
