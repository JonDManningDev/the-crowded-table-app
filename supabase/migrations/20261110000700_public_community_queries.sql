begin;
-- Trusted API orchestration selectors, SELECT only. These do not provide
-- identity, write scope, product authorization or an external Data API grant.
create policy public_exact_slug on public.tenants for select to ct_api
  using (slug=nullif(current_setting('ct.public_slug',true),''));
create policy public_read_scope on public.tenant_settings for select to ct_api
  using (tenant_id=nullif(current_setting('ct.public_tenant_id',true),'')::uuid);
create policy public_read_scope on public.tenant_website_content_overrides for select to ct_api
  using (tenant_id=nullif(current_setting('ct.public_tenant_id',true),'')::uuid);
create policy public_read_scope on public.community_accounts for select to ct_api
  using (tenant_id=nullif(current_setting('ct.public_tenant_id',true),'')::uuid);
create policy public_read_scope on public.community_account_profiles for select to ct_api
  using (tenant_id=nullif(current_setting('ct.public_tenant_id',true),'')::uuid);
create policy public_read_scope on public.tenant_staff_assignments for select to ct_api
  using (tenant_id=nullif(current_setting('ct.public_tenant_id',true),'')::uuid);

-- PostgreSQL row-locking SELECTs also require an UPDATE USING policy.
-- Permit locking the exact root; WITH CHECK false grants no public write path.
create policy public_root_lock on public.tenants for update to ct_api
  using (slug=nullif(current_setting('ct.public_slug',true),'')) with check (false);

-- Independent restrictive archive policies remain on every content relation.
-- Column privileges and all external grants are unchanged.
drop function app_private.community_landing(text);
drop function app_private.public_community_directory(text,uuid,integer);
notify pgrst,'reload schema';
commit;
