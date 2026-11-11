begin;

-- API policies own record audiences and participant grant authority. Preserve
-- creation's scope policy, archive SELECT fence and exact column privileges.
drop policy participant_read on public.community_account_permissions;
drop policy participant_edit on public.community_account_permissions;
create policy participant_scope_read on public.community_account_permissions for select to ct_api
  using (tenant_id=app_private.command_scope());
create policy participant_scope_edit on public.community_account_permissions for update to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
drop function app_private.can_manage_account_records(uuid,text);

-- Staff command reads, G-02, required permission roots, trusted attribution and
-- semantic event validation/classification remain at their existing boundaries.
notify pgrst,'reload schema';
commit;
