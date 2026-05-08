-- Dev: same permissive access as anon for authenticated sessions (Supabase Auth).
-- Tighten before production.

grant select, insert, update, delete on public.dayosisi to authenticated;

drop policy if exists "authenticated read dayosisi portal" on public.dayosisi;
create policy "authenticated read dayosisi portal" on public.dayosisi for select to authenticated using (true);

drop policy if exists "authenticated insert dayosisi portal" on public.dayosisi;
create policy "authenticated insert dayosisi portal" on public.dayosisi for insert to authenticated with check (true);

drop policy if exists "authenticated update dayosisi portal" on public.dayosisi;
create policy "authenticated update dayosisi portal" on public.dayosisi for update to authenticated using (true) with check (true);

drop policy if exists "authenticated delete dayosisi portal" on public.dayosisi;
create policy "authenticated delete dayosisi portal" on public.dayosisi for delete to authenticated using (true);
