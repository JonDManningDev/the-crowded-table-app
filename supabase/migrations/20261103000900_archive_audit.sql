begin;
insert into app_private.account_action_types(code,usage) values ('tenants.archive','system'),('tenants.restore','system');
-- The existing owner-only tenant logger sees the actual before/after state.
-- Keep one event for this change and distinguish it from a tenant detail edit.
create or replace function app_private.append_admin_action() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  row_data jsonb;
  code text := tg_table_name || '.' || lower(tg_op);
begin
  row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_table_name='tenants' and tg_op='UPDATE' and
    (to_jsonb(old)->>'operational_status') is distinct from (row_data->>'operational_status') then
    code := case when row_data->>'operational_status'='archived' then 'tenants.archive' else 'tenants.restore' end;
  end if;
  insert into public.tenant_admin_actions(tenant_id,action,target_user_id,content_key,created_by)
    values(coalesce((row_data->>'tenant_id')::uuid,(row_data->>'id')::uuid),code,(row_data->>'user_id')::uuid,
      row_data->>'content_key',auth.uid());
  return null;
end $$;
commit;
