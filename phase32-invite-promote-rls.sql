-- Phase 32 RLS: Invite User, Promote Existing User, Permission Layers, Replacement
-- Inategemea helper `public.current_app_role()` kutoka phase16-security-rls.sql

alter table if exists public.phase32_invitations enable row level security;
alter table if exists public.phase32_promotions enable row level security;
alter table if exists public.phase32_permission_layers enable row level security;
alter table if exists public.phase32_replacements enable row level security;

-- =========================
-- INVITATIONS
-- =========================
drop policy if exists "p32_inv_select_admin" on public.phase32_invitations;
create policy "p32_inv_select_admin"
on public.phase32_invitations
for select
to authenticated
using (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_inv_insert_admin" on public.phase32_invitations;
create policy "p32_inv_insert_admin"
on public.phase32_invitations
for insert
to authenticated
with check (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_inv_update_admin" on public.phase32_invitations;
create policy "p32_inv_update_admin"
on public.phase32_invitations
for update
to authenticated
using (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
)
with check (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_inv_delete_chief_super" on public.phase32_invitations;
create policy "p32_inv_delete_chief_super"
on public.phase32_invitations
for delete
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'));

-- =========================
-- PROMOTIONS
-- =========================
drop policy if exists "p32_pro_select_admin" on public.phase32_promotions;
create policy "p32_pro_select_admin"
on public.phase32_promotions
for select
to authenticated
using (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_pro_insert_admin" on public.phase32_promotions;
create policy "p32_pro_insert_admin"
on public.phase32_promotions
for insert
to authenticated
with check (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_pro_update_admin" on public.phase32_promotions;
create policy "p32_pro_update_admin"
on public.phase32_promotions
for update
to authenticated
using (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
)
with check (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_pro_delete_chief_super" on public.phase32_promotions;
create policy "p32_pro_delete_chief_super"
on public.phase32_promotions
for delete
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'));

-- =========================
-- PERMISSION LAYERS
-- =========================
drop policy if exists "p32_layer_select_admin" on public.phase32_permission_layers;
create policy "p32_layer_select_admin"
on public.phase32_permission_layers
for select
to authenticated
using (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_layer_insert_admin" on public.phase32_permission_layers;
create policy "p32_layer_insert_admin"
on public.phase32_permission_layers
for insert
to authenticated
with check (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_layer_update_admin" on public.phase32_permission_layers;
create policy "p32_layer_update_admin"
on public.phase32_permission_layers
for update
to authenticated
using (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
)
with check (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_layer_delete_chief_super" on public.phase32_permission_layers;
create policy "p32_layer_delete_chief_super"
on public.phase32_permission_layers
for delete
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'));

-- =========================
-- REPLACEMENTS
-- =========================
drop policy if exists "p32_rep_select_admin" on public.phase32_replacements;
create policy "p32_rep_select_admin"
on public.phase32_replacements
for select
to authenticated
using (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_rep_insert_admin" on public.phase32_replacements;
create policy "p32_rep_insert_admin"
on public.phase32_replacements
for insert
to authenticated
with check (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_rep_update_admin" on public.phase32_replacements;
create policy "p32_rep_update_admin"
on public.phase32_replacements
for update
to authenticated
using (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
)
with check (
  public.current_app_role() in (
    'chief_admin',
    'super_admin',
    'national_admin',
    'office_admin',
    'admin'
  )
);

drop policy if exists "p32_rep_delete_chief_super" on public.phase32_replacements;
create policy "p32_rep_delete_chief_super"
on public.phase32_replacements
for delete
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'));
