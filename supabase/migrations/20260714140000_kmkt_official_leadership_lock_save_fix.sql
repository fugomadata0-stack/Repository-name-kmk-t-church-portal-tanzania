-- Ruhusu kuhifadhi wasifu/CV kwa viongozi rasmi waliofungwa:
-- linganisha simu/WhatsApp kwa tarakimu pekee (si muundo wa +255 vs 0755).

create or replace function public.kmkt_normalize_phone(p text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g'), '');
$$;

create or replace function public.kmkt_guard_official_leadership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.official_locked is true then
    raise exception 'Official KMK(T) national leadership record is locked and cannot be deleted.';
  end if;

  if tg_op = 'UPDATE' and old.official_locked is true then
    if
      upper(coalesce(new.full_name, '')) <> upper(coalesce(old.full_name, '')) or
      upper(coalesce(new.jina, '')) <> upper(coalesce(old.jina, '')) or
      upper(coalesce(new.title, '')) <> upper(coalesce(old.title, '')) or
      upper(coalesce(new.cheo, '')) <> upper(coalesce(old.cheo, '')) or
      kmkt_normalize_phone(new.simu) is distinct from kmkt_normalize_phone(old.simu) or
      coalesce(new.email, '') <> coalesce(old.email, '') or
      kmkt_normalize_phone(new.whatsapp) is distinct from kmkt_normalize_phone(old.whatsapp) or
      coalesce(new.official_lock_key, '') <> coalesce(old.official_lock_key, '')
    then
      raise exception 'Official KMK(T) national leadership identity fields are locked.';
    end if;

    if new.official_locked is distinct from true then
      raise exception 'Official KMK(T) national leadership lock cannot be removed.';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

notify pgrst, 'reload schema';
