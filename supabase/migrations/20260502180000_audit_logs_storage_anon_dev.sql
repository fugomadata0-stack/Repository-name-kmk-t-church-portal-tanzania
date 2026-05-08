-- Dev/demo: ruhusa za anon kwenye audit_logs na upakiaji wa site-assets chini ya audit-logs/
-- ONDOA au punguza kabla ya production — tumia Supabase Auth + RLS kali.

drop policy if exists "audit_logs_select_anon_demo" on public.audit_logs;
create policy "audit_logs_select_anon_demo" on public.audit_logs for select to anon using (true);

drop policy if exists "audit_logs_insert_anon_demo" on public.audit_logs;
create policy "audit_logs_insert_anon_demo" on public.audit_logs for insert to anon with check (true);

grant select, insert on public.audit_logs to anon;

-- Ruhusu anon kupakia mafaili chini ya prefix hili (hazina siri)
drop policy if exists "site_assets_audit_logs_insert_anon_demo" on storage.objects;
create policy "site_assets_audit_logs_insert_anon_demo" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'site-assets'
    and name like 'audit-logs/%'
  );
