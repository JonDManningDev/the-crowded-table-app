begin;
revoke all on public.community_accounts from public,anon,authenticated,service_role;
drop policy self_community on public.community_accounts;
grant select(created_at,updated_at,created_by,updated_by) on public.community_accounts to ct_api;

-- Fixed internal projection for an anonymous audience. UUIDs are pagination
-- positions only: HTTP strips them and authenticates/encrypts its cursor.
-- No Auth, preference, permission, bio, standing or audit fields are projected.
create function app_private.public_community_directory(p_slug text,p_after uuid,p_limit integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare site uuid; result jsonb;
begin
  if p_limit is null or p_limit<1 or p_limit>100 then raise invalid_parameter_value; end if;
  select id into site from public.tenants where slug=p_slug for share;
  if site is null then return null; end if;
  -- This statement runs after the tenant lock, including after waiting for a
  -- writer. VOLATILE PL/pgSQL obtains a fresh snapshot for the current gate.
  if not exists(select from public.tenants t join public.tenant_settings s on s.tenant_id=t.id
    where t.id=site and t.operational_status='active' and s.allow_public_directory_visibility) then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id',d.user_id,'display_name',d.display_name,'staff_role',d.staff_role) order by d.user_id),'[]'::jsonb)
  into result from (
    select c.user_id,p.display_name,case when c.standing='approved' and s.status='active' then s.role end as staff_role
    from public.community_accounts c join public.community_account_profiles p using(tenant_id,user_id)
    left join public.tenant_staff_assignments s using(tenant_id,user_id)
    where c.tenant_id=site and c.standing in ('approved','suspended') and (p_after is null or c.user_id>p_after)
    order by c.user_id limit p_limit+1
  ) d;
  return result;
end $$;
revoke all on function app_private.public_community_directory(text,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function app_private.public_community_directory(text,uuid,integer) to ct_api;
notify pgrst,'reload schema';
commit;
