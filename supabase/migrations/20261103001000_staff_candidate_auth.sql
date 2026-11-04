begin;
-- The API cannot read auth.users. Return only candidate-set membership for
-- a grant manager in this tenant. Appointment holds the target Auth row
-- through commit so a concurrent ban cannot race a previously valid check.
create function app_private.is_staff_candidate(p_tenant uuid,p_target uuid,p_lock boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_tenant is distinct from app_private.command_scope() or not exists (
    select from public.tenant_staff_assignments actor join public.tenants t on t.id=actor.tenant_id
    join public.community_accounts target on target.tenant_id=t.id and target.user_id=p_target
    where actor.tenant_id=p_tenant and actor.user_id=app_private.verified_user() and actor.status='active'
      and actor.can_grant_staff and t.operational_status='active' and target.standing='approved'
  ) then return false; end if;
  if p_lock then perform id from auth.users where id=p_target for share; end if;
  return exists(select from auth.users where id=p_target and email is not null and email_confirmed_at is not null
    and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=now()));
end $$;
revoke all on function app_private.is_staff_candidate(uuid,uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function app_private.is_staff_candidate(uuid,uuid,boolean) to ct_api;
commit;
