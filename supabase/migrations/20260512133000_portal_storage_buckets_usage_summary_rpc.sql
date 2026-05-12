-- Aggregated storage usage for System Health — avoids PostgREST 406 / broker issues when selecting storage.objects via REST.
-- Uses SECURITY DEFINER + portal_has_module_capability (same RBAC as super_admin / usalama).

create or replace function public.portal_storage_buckets_usage_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_allowed boolean;
  buckets jsonb := '{}'::jsonb;
  total_files bigint := 0;
  total_bytes bigint := 0;
  rec record;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  v_allowed :=
    public.portal_has_module_capability('super_admin', 'view')
    or public.portal_has_module_capability('usalama', 'view');

  if not v_allowed then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  for rec in
    select
      o.bucket_id,
      count(*)::bigint as file_count,
      coalesce(
        sum(
          case
            when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
            else 0::bigint
          end
        ),
        0::bigint
      ) as bytes
    from storage.objects o
    where o.bucket_id in ('church-files', 'church-images', 'church-media', 'site-assets')
    group by o.bucket_id
  loop
    buckets :=
      buckets
      || jsonb_build_object(
        rec.bucket_id,
        jsonb_build_object('file_count', rec.file_count, 'bytes', rec.bytes)
      );
    total_files := total_files + rec.file_count;
    total_bytes := total_bytes + rec.bytes;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'buckets', buckets,
    'total_files', total_files,
    'total_bytes', total_bytes
  );
end;
$$;

comment on function public.portal_storage_buckets_usage_summary() is
  'Jumla ya idadi ya faili na bytes kwa buckets kuu za portal (RBAC: super_admin au usalama can_view).';

revoke all on function public.portal_storage_buckets_usage_summary() from public;
grant execute on function public.portal_storage_buckets_usage_summary() to authenticated;
