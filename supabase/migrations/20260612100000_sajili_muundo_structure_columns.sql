-- Sajili Muundo: extra contact / classification fields on church_structure_entities.
-- Idempotent additive migration (no demo data).

alter table public.church_structure_entities
  add column if not exists whatsapp text,
  add column if not exists entity_type text;

comment on column public.church_structure_entities.whatsapp is 'WhatsApp ya mawasiliano ya kitengo cha muundo.';
comment on column public.church_structure_entities.entity_type is 'Aina / chaguo-msingi la kitengo (mf. parokia, kituo, idara rasmi).';
