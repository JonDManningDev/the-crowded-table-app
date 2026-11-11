begin;

-- Product permissions are evaluated by the API after the tenant root lock.
-- Keep tenant scope, column privileges and independent archive SELECT fences.
drop trigger a_configuration on public.tenants;
drop function app_private.guard_configuration_details();
drop policy configuration_settings_edit on public.tenant_settings;
drop policy api_copy_read on public.tenant_website_content_overrides;
drop policy api_copy_insert on public.tenant_website_content_overrides;
drop policy api_copy_update on public.tenant_website_content_overrides;
drop policy api_copy_delete on public.tenant_website_content_overrides;
create policy command_scope on public.tenant_website_content_overrides for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
drop function app_private.can_edit_configuration(uuid,text);

-- API creation/detail edits supply canonical values. Existing CHECKs reject
-- untrimmed/empty tenant text; identity, slug and timezone invariants remain.
drop trigger b_normalize on public.tenants;
create or replace function app_private.normalize_editable_text() returns trigger
language plpgsql set search_path='' as $$
begin
  new.display_name := btrim(new.display_name);
  new.bio := nullif(btrim(new.bio),'');
  return new;
end $$;

-- Generic configuration/archive loggers and their audit classification remain
-- authoritative until the complete semantic writer cutover in issue #11.
notify pgrst,'reload schema';
commit;
