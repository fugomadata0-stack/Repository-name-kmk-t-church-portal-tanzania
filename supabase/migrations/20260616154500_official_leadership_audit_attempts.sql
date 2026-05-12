-- Audit attempted edit/delete actions on locked official national leaders.

create or replace function public.kmkt_guard_official_leadership()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor uuid;
begin
  actor := auth.uid();
  if tg_op = 'DELETE' and old.official_locked is true then
    insert into public.audit_logs (action, entity, entity_id, meta, user_id)
    values (
      'official_leadership_delete_blocked',
      'church_viongozi',
      old.id::text,
      jsonb_build_object(
        'official_lock_key', old.official_lock_key,
        'full_name', old.full_name,
        'title', old.title,
        'reason', 'locked_record_delete_denied'
      ),
      actor
    );
    raise exception 'Official KMK(T) national leadership record is locked and cannot be deleted.';
  end if;

  if tg_op = 'UPDATE' and old.official_locked is true then
    if
      upper(coalesce(new.full_name, '')) <> upper(coalesce(old.full_name, '')) or
      upper(coalesce(new.jina, '')) <> upper(coalesce(old.jina, '')) or
      upper(coalesce(new.title, '')) <> upper(coalesce(old.title, '')) or
      upper(coalesce(new.cheo, '')) <> upper(coalesce(old.cheo, '')) or
      coalesce(new.simu, '') <> coalesce(old.simu, '') or
      coalesce(new.email, '') <> coalesce(old.email, '') or
      coalesce(new.whatsapp, '') <> coalesce(old.whatsapp, '') or
      coalesce(new.official_lock_key, '') <> coalesce(old.official_lock_key, '')
    then
      insert into public.audit_logs (action, entity, entity_id, meta, user_id)
      values (
        'official_leadership_update_blocked',
        'church_viongozi',
        old.id::text,
        jsonb_build_object(
          'official_lock_key', old.official_lock_key,
          'full_name', old.full_name,
          'title', old.title,
          'reason', 'locked_identity_change_denied'
        ),
        actor
      );
      raise exception 'Official KMK(T) national leadership identity fields are locked.';
    end if;

    if new.official_locked is distinct from true then
      insert into public.audit_logs (action, entity, entity_id, meta, user_id)
      values (
        'official_leadership_unlock_blocked',
        'church_viongozi',
        old.id::text,
        jsonb_build_object(
          'official_lock_key', old.official_lock_key,
          'full_name', old.full_name,
          'title', old.title,
          'reason', 'lock_removal_denied'
        ),
        actor
      );
      raise exception 'Official KMK(T) national leadership lock cannot be removed.';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;
