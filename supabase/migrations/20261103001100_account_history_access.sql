begin;
-- Category checks must intersect the runtime scope instead of inheriting the
-- broad command policy. Browser owners now use the same checked HTTP endpoint.
drop policy command_scope on public.tenant_admin_actions;
create policy command_insert on public.tenant_admin_actions for insert to ct_api
  with check (tenant_id=app_private.command_scope());
drop policy owner_audit on public.tenant_admin_actions;
revoke select on public.tenant_admin_actions from public,anon,authenticated,service_role;
revoke all on app_private.tenant_admin_action_categories from public,anon,authenticated,service_role;

create function app_private.can_read_account_action(p_tenant uuid,p_action uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select p_tenant=app_private.command_scope()
    and exists(select from public.tenant_admin_actions where id=p_action and tenant_id=p_tenant)
    and exists(
    select from public.tenant_staff_assignments s
    join public.community_accounts c using(tenant_id,user_id)
    join public.tenants t on t.id=s.tenant_id
    where s.tenant_id=p_tenant and s.user_id=app_private.verified_user()
      and s.status='active' and c.standing='approved'
      and (s.role='owner' or (t.operational_status='active' and exists(
        select from app_private.tenant_admin_action_categories category where category.action_id=p_action
          and ((category.category='community_account' and s.can_audit_community_accounts)
            or (category.category='staff_account' and s.can_audit_staff_accounts))
      )))
  )
$$;
revoke all on function app_private.can_read_account_action(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function app_private.can_read_account_action(uuid,uuid) to ct_api;
grant select(id,tenant_id,action,target_user_id,content_key,created_at,created_by,operation_id,reason,details)
  on public.tenant_admin_actions to ct_api;
create policy history_read on public.tenant_admin_actions for select to ct_api
  using (tenant_id=app_private.command_scope() and app_private.can_read_account_action(tenant_id,id));
grant select(action_id,category) on app_private.tenant_admin_action_categories to ct_api;
create policy history_category_read on app_private.tenant_admin_action_categories for select to ct_api
  using (exists(select from public.tenant_admin_actions a where a.id=action_id));

-- Stable keyset pagination preserves sub-millisecond event order.
create index tenant_actions_history_order on public.tenant_admin_actions(tenant_id,created_at desc,id desc);
notify pgrst,'reload schema';
commit;
