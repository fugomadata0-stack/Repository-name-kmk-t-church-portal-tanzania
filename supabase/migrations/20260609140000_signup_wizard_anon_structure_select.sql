-- Phase 33 signup wizard (Step 3/4): minimal anon SELECT-only access to active structure rows.
--
-- Tatizo: Wizard ya "Omba Akaunti" inahitaji kusoma orodha za Dayosisi, Majimbo, Matawi (na taxonomy
-- ya Jumuiya/Taasisi) kabla user hajaingia. Sera za uzalishaji
-- (20260506120000_production_rls_core_church_tables.sql) zilibatilisha uwezo wa anon kabisa
-- (`revoke all ... from anon`) ili kufunga API ya umma. Hii inasababisha
-- "permission denied for table church_jimbo" kwenye Step 3/4.
--
-- Suluhu: ongeza sera za SELECT-tu (anon) kwa rekodi `status = 'active'` pekee, kwenye majedwali
-- yanayohitajika na wizard. Sera za authenticated (RBAC + scope) hazibadilishwi hata kidogo.
--
-- Mipaka kali (no over-exposure):
--   * SELECT pekee — hakuna INSERT/UPDATE/DELETE kwa anon (hakuna GRANT, hakuna POLICY).
--   * Rekodi `status = 'active'` pekee — pending/inactive/archived hazifichuliwi kwa umma.
--   * Tables hasa za structure dropdowns (`dayosisi`, `church_jimbo`, `church_tawi`).
--   * `portal_domain_entities` — modules `jumuiya` na `taasisi` pekee (Idara/Kwaya/Jumuiya/Taasisi
--     labels zinazotumiwa na wizard). Modules nyingine zinabaki na ulinzi wa authenticated.

-- ——— public.dayosisi ———
alter table if exists public.dayosisi enable row level security;

drop policy if exists "dayosisi_select_anon_signup_active" on public.dayosisi;
create policy "dayosisi_select_anon_signup_active"
  on public.dayosisi for select to anon
  using (status = 'active');

grant select on public.dayosisi to anon;

-- ——— public.church_jimbo ———
alter table if exists public.church_jimbo enable row level security;

drop policy if exists "church_jimbo_select_anon_signup_active" on public.church_jimbo;
create policy "church_jimbo_select_anon_signup_active"
  on public.church_jimbo for select to anon
  using (status = 'active');

grant select on public.church_jimbo to anon;

-- ——— public.church_tawi ———
alter table if exists public.church_tawi enable row level security;

drop policy if exists "church_tawi_select_anon_signup_active" on public.church_tawi;
create policy "church_tawi_select_anon_signup_active"
  on public.church_tawi for select to anon
  using (status = 'active');

grant select on public.church_tawi to anon;

-- ——— public.portal_domain_entities ———
-- Modules `jumuiya` (Idara/Kwaya/Fellowship labels) na `taasisi` pekee — modules nyingine
-- (matukio, machapisho, n.k.) zinabaki kwa authenticated tu kupitia sera zilizopo.
alter table if exists public.portal_domain_entities enable row level security;

drop policy if exists "portal_domain_entities_select_anon_signup" on public.portal_domain_entities;
create policy "portal_domain_entities_select_anon_signup"
  on public.portal_domain_entities for select to anon
  using (
    module_key in ('jumuiya', 'taasisi')
    and status = 'active'
  );

grant select on public.portal_domain_entities to anon;

-- Idhini za kuandika kwa anon HAZIPO (hakuna grant, hakuna policy ya insert/update/delete).
-- Sera zote za authenticated (RBAC + scope) zinabaki bila kubadilishwa.
