-- Viongozi wa muundo: RLS ya eneo (scope) + uwezo wa moduli — bora kuliko majukumu peke yake.
-- Inahitaji: public.portal_scope_geo_write_allowed, public.portal_has_module_capability, church_structure_leaders.

create or replace function public.portal_scope_structure_entity_write_allowed(p_entity_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_d uuid;
  v_j uuid;
  v_t uuid;
begin
  if p_entity_id is null then
    return false;
  end if;

  with recursive w as (
    select id, parent_id, level, 1 as depth
    from public.church_structure_entities
    where id = p_entity_id
    union all
    select e.id, e.parent_id, e.level, w.depth + 1
    from public.church_structure_entities e
    join w on e.id = w.parent_id
    where w.depth < 18
  )
  select
    (select id from w where level = 'dayosisi' limit 1),
    (select id from w where level = 'jimbo' limit 1),
    (select id from w where level = 'tawi' limit 1)
    into v_d, v_j, v_t;

  return public.portal_scope_geo_write_allowed(v_d, v_j, v_t);
end;
$$;

comment on function public.portal_scope_structure_entity_write_allowed(uuid) is
  'True ikiwa auth.uid() anaruhusiwa kugeuza data inayohusishwa na entity ya muundo (hierarchy + portal_scope_geo_write_allowed).';

revoke all on function public.portal_scope_structure_entity_write_allowed(uuid) from public;
grant execute on function public.portal_scope_structure_entity_write_allowed(uuid) to authenticated;

drop policy if exists church_structure_leaders_select_auth on public.church_structure_leaders;
drop policy if exists church_structure_leaders_insert_auth on public.church_structure_leaders;
drop policy if exists church_structure_leaders_update_auth on public.church_structure_leaders;
drop policy if exists church_structure_leaders_delete_auth on public.church_structure_leaders;

create policy church_structure_leaders_select_auth
on public.church_structure_leaders
for select
to authenticated
using (
  public.portal_has_module_capability('muundo', 'view')
  and (
    public.current_app_role() in ('super_admin', 'chief_admin', 'viewer', 'reviewer', 'member_user')
    or public.portal_scope_structure_entity_write_allowed(entity_id)
  )
);

create policy church_structure_leaders_insert_auth
on public.church_structure_leaders
for insert
to authenticated
with check (
  public.portal_has_module_capability('muundo', 'create')
  and public.portal_scope_structure_entity_write_allowed(entity_id)
);

create policy church_structure_leaders_update_auth
on public.church_structure_leaders
for update
to authenticated
using (
  public.portal_has_module_capability('muundo', 'edit')
  and public.portal_scope_structure_entity_write_allowed(entity_id)
)
with check (
  public.portal_has_module_capability('muundo', 'edit')
  and public.portal_scope_structure_entity_write_allowed(entity_id)
);

create policy church_structure_leaders_delete_auth
on public.church_structure_leaders
for delete
to authenticated
using (
  public.portal_has_module_capability('muundo', 'delete')
  and public.portal_scope_structure_entity_write_allowed(entity_id)
);
