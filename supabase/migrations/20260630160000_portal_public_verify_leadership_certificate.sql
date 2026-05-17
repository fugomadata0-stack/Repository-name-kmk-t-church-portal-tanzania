-- Uhakiki wa umma kwa cheti rasmi (verification_id) — security definer, data finyu.

create or replace function public.portal_public_verify_leadership_certificate(p_verification_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
  r public.leadership_official_certificates%rowtype;
begin
  v := trim(coalesce(p_verification_id, ''));
  if v = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_id');
  end if;

  select *
  into r
  from public.leadership_official_certificates c
  where lower(c.verification_id) = lower(v)
  limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'found', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'certificate_number', r.certificate_number,
    'verification_id', r.verification_id,
    'holder_full_name', r.holder_full_name,
    'position_title', r.position_title,
    'hierarchy_label', r.hierarchy_label,
    'document_kind', r.document_kind,
    'status', r.status,
    'source_type', r.source_type,
    'issued_at', r.issued_at,
    'approved_at', r.approved_at,
    'verify_url', r.verify_url
  );
end;
$$;

comment on function public.portal_public_verify_leadership_certificate(text) is
  'Public verify page: official leadership certificate by verification_id (KMK-VRF-…).';

revoke all on function public.portal_public_verify_leadership_certificate(text) from public;
grant execute on function public.portal_public_verify_leadership_certificate(text) to anon, authenticated;

notify pgrst, 'reload schema';
