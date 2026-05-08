-- Safu za ziada kwenye site_settings + sera za anon kwa DEMO ya portal (ondoa uzalishaji).
-- Endesha baada ya 20260502000000_portal_site_about_audit.sql

alter table public.site_settings
  add column if not exists categories jsonb not null default '[]'::jsonb;

alter table public.site_settings
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;

-- Demo: anon key inaweza kusoma/kuandika mipangilio (si salama uzalishani)
drop policy if exists "site_settings_anon_all_demo" on public.site_settings;
create policy "site_settings_anon_all_demo" on public.site_settings for all to anon using (true) with check (true);

drop policy if exists "about_kmkt_anon_all_demo" on public.about_kmkt;
create policy "about_kmkt_anon_all_demo" on public.about_kmkt for all to anon using (true) with check (true);

grant all on public.site_settings to anon;
grant all on public.about_kmkt to anon;

-- Jedwali la Phase 15 (system/branding/church) — anon demo
drop policy if exists "system_settings_anon_demo" on public.system_settings;
create policy "system_settings_anon_demo" on public.system_settings for all to anon using (true) with check (true);
grant all on public.system_settings to anon;

drop policy if exists "branding_settings_anon_demo" on public.branding_settings;
create policy "branding_settings_anon_demo" on public.branding_settings for all to anon using (true) with check (true);
grant all on public.branding_settings to anon;

drop policy if exists "church_identity_anon_demo" on public.church_identity;
create policy "church_identity_anon_demo" on public.church_identity for all to anon using (true) with check (true);
grant all on public.church_identity to anon;
