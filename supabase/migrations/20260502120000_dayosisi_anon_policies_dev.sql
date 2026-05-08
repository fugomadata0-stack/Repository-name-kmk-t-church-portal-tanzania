-- OPTIONAL: Ruhusu anon key kusoma/kuandika dayosisi kwa maendeleo ya portal bila Auth.
-- Uondoelee uzalishaji: tumia sera za authenticated tu na Supabase Auth.
-- Endesha tu ikiwa unahitaji CRUD ya portal ya HTML/React bila kuingia.

alter table public.dayosisi enable row level security;

drop policy if exists "anon read dayosisi portal" on public.dayosisi;
create policy "anon read dayosisi portal" on public.dayosisi for select to anon using (true);

drop policy if exists "anon insert dayosisi portal" on public.dayosisi;
create policy "anon insert dayosisi portal" on public.dayosisi for insert to anon with check (true);

drop policy if exists "anon update dayosisi portal" on public.dayosisi;
create policy "anon update dayosisi portal" on public.dayosisi for update to anon using (true) with check (true);

drop policy if exists "anon delete dayosisi portal" on public.dayosisi;
create policy "anon delete dayosisi portal" on public.dayosisi for delete to anon using (true);

grant select, insert, update, delete on public.dayosisi to anon;
