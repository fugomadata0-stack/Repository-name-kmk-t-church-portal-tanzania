-- Ongeza role_key / catalog_level_key kwa church_viongozi (salama, hiari).

alter table public.church_viongozi
  add column if not exists role_key text,
  add column if not exists catalog_level_key text,
  add column if not exists jimbo_leader_variant text;

create index if not exists church_viongozi_role_key_idx
  on public.church_viongozi (role_key)
  where role_key is not null;

create index if not exists church_viongozi_catalog_level_idx
  on public.church_viongozi (catalog_level_key, role_key)
  where catalog_level_key is not null;

comment on column public.church_viongozi.role_key is
  'Funguo ya cheo kutoka leadership_role_catalog.role_key';
comment on column public.church_viongozi.catalog_level_key is
  'Ngazi: tawi | jimbo | dayosisi | national';
comment on column public.church_viongozi.jimbo_leader_variant is
  'Mchungaji au Shemasi kwa mkuu_wa_jimbo';

notify pgrst, 'reload schema';
