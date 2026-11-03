begin;

-- Follow existing community-profile write lifecycle until Q-016 defines
-- additional consent/revocation behavior. Global preferences remain tenant-free.
create or replace function public.set_community_global_profile_visibility(p_tenant_id uuid,p_show_global_profile boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid;
begin
  v_actor := app_private.lock_tenant(p_tenant_id);
  update public.community_accounts set show_global_profile=p_show_global_profile
    where tenant_id=p_tenant_id and user_id=v_actor and standing in ('pending','approved');
  if not found then raise exception 'community_account_required' using errcode = '42501'; end if;
end $$;

commit;
