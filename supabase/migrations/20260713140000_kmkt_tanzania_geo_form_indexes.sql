-- KMK(T) — indexes kwa uchujaji wa mikoa/wilaya kwenye fomu (additive, idempotent)

create index if not exists idx_church_tawi_mkoa_wilaya
  on public.church_tawi (mkoa, wilaya)
  where mkoa is not null;

create index if not exists idx_church_viongozi_mkoa_wilaya
  on public.church_viongozi (mkoa, wilaya)
  where mkoa is not null;

create index if not exists idx_church_institution_projects_location
  on public.church_institution_projects (location_region, location_district)
  where location_region is not null;

notify pgrst, 'reload schema';
