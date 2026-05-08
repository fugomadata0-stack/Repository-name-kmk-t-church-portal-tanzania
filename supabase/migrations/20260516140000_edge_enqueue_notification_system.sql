-- RPC kwa Edge Functions / cron (hakuna auth.uid) — arifa za mfumo baada ya kutuma ujumbe.

create or replace function public.portal_enqueue_notification_system(p_title text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
begin
  insert into public.notifications (title, message, type, target_role, target_user_id, is_global, created_by, is_read)
  values (
    left(trim(p_title), 500),
    trim(p_message),
    'system',
    null,
    null,
    true,
    null,
    false
  )
  returning id into nid;
  return nid;
end;
$$;

comment on function public.portal_enqueue_notification_system(text, text) is
  'Enqueue global system notification without auth.uid() — for Edge Functions using service role.';

revoke all on function public.portal_enqueue_notification_system(text, text) from public;
grant execute on function public.portal_enqueue_notification_system(text, text) to service_role;
