begin;
-- Lifecycle services already hold the target account and verified tenant scope.
-- They must clear consent for another account and for an inactive final state.
-- No column or external-role grants change. API policies authorize the action;
-- command_scope remains a tenant fence, not a staff permission decision. The
-- restrictive archive SELECT policy still applies to these runtime rows.
create policy command_sharing_read on public.community_account_preferences for select to ct_api
  using (tenant_id=app_private.command_scope());
create policy command_sharing_clear on public.community_account_preferences for update to ct_api
  using (tenant_id=app_private.command_scope())
  with check (tenant_id=app_private.command_scope() and not show_global_profile);
commit;
