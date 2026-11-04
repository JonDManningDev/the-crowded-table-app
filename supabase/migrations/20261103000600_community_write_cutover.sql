begin;
lock table public.tenants, public.tenant_settings, public.tenant_staff_assignments, public.community_accounts,
  public.user_account_profiles, public.community_account_profiles, public.tenant_admin_actions in access exclusive mode;
create temporary view community_cutover_preflight(result) as
with accounts as (
  select c.standing, c.show_global_profile, p.user_id is null as missing_profile,
    g.user_id is not null and g.display_name = btrim(g.display_name)
      and char_length(g.display_name) between 1 and 80
      and (g.bio is null or char_length(g.bio) <= 2000) as usable_global
  from public.community_accounts c
  left join public.community_account_profiles p using (tenant_id, user_id)
  left join public.user_account_profiles g on g.user_id = c.user_id
), staff as (
  select s.role, s.status, c.standing
  from public.tenant_staff_assignments s left join public.community_accounts c using (tenant_id, user_id)
), blockers as (
  select
    (select count(*) from public.tenants t where not exists (
      select from public.tenant_staff_assignments s join public.community_accounts c using (tenant_id,user_id)
      where s.tenant_id=t.id and s.role='owner' and s.status='active' and c.standing='approved'
    )) as owners_requiring_repair,
    (select count(*) from staff where role <> 'owner' and status = 'active' and standing is distinct from 'approved') as ineligible_active_staff,
    (select count(*) from accounts where missing_profile and not usable_global) as missing_profile_sources,
    (select count(*) from accounts where standing not in ('pending','approved','suspended','removed')) as unknown_standings
), backfills as (
  select count(*) as accounts,
    count(*) filter (where missing_profile and usable_global) as copy_global_profile_once,
    count(*) filter (where not missing_profile) as preserve_curated_profile,
    count(*) filter (where standing = 'pending') as adopt_pending_request,
    count(*) filter (where standing in ('approved','suspended','removed')) as approximate_first_approval,
    count(*) filter (where standing in ('suspended','removed')) as mark_restricted,
    count(*) filter (where standing = 'removed') as convert_to_inactive,
    count(*) filter (where standing = 'removed' and show_global_profile) as clear_inactive_sharing
  from accounts
)
select jsonb_build_object(
  'ready', owners_requiring_repair = 0 and ineligible_active_staff = 0 and missing_profile_sources = 0 and unknown_standings = 0,
  'blockers', to_jsonb(blockers), 'backfills', to_jsonb(backfills)
) from blockers cross join backfills;

do $guard$
begin
  if (select (result->>'ready')::boolean from pg_temp.community_cutover_preflight) is not true then
    raise exception 'community cutover preflight failed: %',
      (select result->'blockers' from pg_temp.community_cutover_preflight);
  end if;
  if auth.uid() is not null then
    raise exception 'community backfill requires migration attribution';
  end if;
end $guard$;
drop view pg_temp.community_cutover_preflight;
alter table public.community_accounts
  add column first_approved_at timestamptz,
  add column has_disciplinary_restriction boolean not null default false;

create table public.community_account_preferences (
  tenant_id uuid not null,
  user_id uuid not null,
  show_global_profile boolean not null default false,
  allow_direct_messages boolean not null default true,
  allow_private_invitations boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.user_accounts,
  updated_by uuid references public.user_accounts,
  primary key (tenant_id,user_id),
  foreign key (tenant_id,user_id) references public.community_accounts
);
create table public.community_account_permissions (
  tenant_id uuid not null,
  user_id uuid not null,
  can_post_public_events boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.user_accounts,
  updated_by uuid references public.user_accounts,
  primary key (tenant_id,user_id),
  foreign key (tenant_id,user_id) references public.community_accounts
);
create table app_private.community_account_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  kind text not null check (kind in ('join','reactivation')),
  requested_at timestamptz not null default clock_timestamp(),
  requested_by uuid not null check (requested_by = user_id),
  unique (tenant_id,user_id),
  foreign key (tenant_id,user_id) references public.community_accounts
);
alter table public.community_account_preferences enable row level security;
alter table public.community_account_permissions enable row level security;
alter table app_private.community_account_requests enable row level security;
revoke all on public.community_account_preferences, public.community_account_permissions,
  app_private.community_account_requests from public, anon, authenticated, service_role, ct_api;

-- Capture original values before transforming the source account. New rows
-- carry trusted migration attribution. The original account keeps its history.
insert into public.community_account_preferences (tenant_id,user_id,show_global_profile)
select tenant_id,user_id,standing <> 'removed' and show_global_profile from public.community_accounts;
insert into public.community_account_permissions (tenant_id,user_id)
select tenant_id,user_id from public.community_accounts;
-- The original schema allowed whitespace in a bio. Copy the stored value
-- exactly even if it predates normalization on interactive profile edits.
alter table public.community_account_profiles disable trigger b_normalize;
insert into public.community_account_profiles (tenant_id,user_id,display_name,bio)
select a.tenant_id,a.user_id,g.display_name,g.bio from public.community_accounts a
join public.user_account_profiles g using (user_id)
on conflict (tenant_id,user_id) do nothing;
alter table public.community_account_profiles enable trigger b_normalize;

alter table public.tenant_admin_actions
  add column operation_id uuid,
  add column details jsonb not null default '{}'::jsonb,
  add column reason text;
-- One operation per original event. No evidence links separate old events.
alter table public.tenant_admin_actions disable trigger immutable_audit;
update public.tenant_admin_actions set operation_id=id,
  details=jsonb_build_object('operation_id_source','legacy_action_id');
alter table public.tenant_admin_actions enable trigger immutable_audit;
alter table public.tenant_admin_actions alter column operation_id set not null;

with adopted as (
  insert into app_private.community_account_requests (tenant_id,user_id,kind,requested_at,requested_by)
  select tenant_id,user_id,'join',created_at,user_id from public.community_accounts where standing='pending'
  returning *
)
insert into public.tenant_admin_actions (tenant_id,target_user_id,action,operation_id,details)
select tenant_id,user_id,'community_join_request_adopted',gen_random_uuid(),
  jsonb_build_object('request_id',id,'requested_at_source','community_accounts.created_at','approximate',true)
from adopted;

create table app_private.tenant_admin_action_categories (
  action_id uuid not null references public.tenant_admin_actions,
  category text not null check (category in ('community_account','staff_account')),
  primary key (action_id,category)
);
alter table app_private.tenant_admin_action_categories enable row level security;
revoke all on app_private.tenant_admin_action_categories from public, anon, authenticated, service_role, ct_api;
insert into app_private.tenant_admin_action_categories (action_id,category)
select id,'community_account' from public.tenant_admin_actions where action in
  ('community_accounts.insert','community_accounts.update','community_accounts.delete',
   'community_join_request_adopted','tenant_staff_assignments.insert')
union all
select id,'staff_account' from public.tenant_admin_actions where action in
  ('tenant_staff_assignments.insert','tenant_staff_assignments.update','tenant_staff_assignments.delete');
create trigger immutable_category before update or delete on app_private.tenant_admin_action_categories
  for each row execute function app_private.reject_audit_mutation();

-- Do not manufacture a user edit or a generic administrative update while
-- translating stored facts. All changes to trigger state are transactional.
alter table public.community_accounts disable trigger log_admin_action;
alter table public.community_accounts disable trigger z_audit;
alter table public.community_accounts drop constraint community_accounts_standing_check;
update public.community_accounts set
  first_approved_at=created_at,
  has_disciplinary_restriction=standing in ('suspended','removed'),
  standing=case when standing='removed' then 'inactive' else standing end
where standing <> 'pending';
alter table public.community_accounts enable trigger z_audit;
drop trigger log_admin_action on public.community_accounts;
alter table public.community_accounts
  drop column show_global_profile,
  add foreign key (standing) references public.community_standing,
  add check (standing not in ('approved','suspended') or first_approved_at is not null),
  add check (standing = 'inactive' or has_disciplinary_restriction = (standing = 'suspended'));

create trigger z_audit before insert or update on public.community_account_preferences
  for each row execute function app_private.stamp_audit();
create trigger z_audit before insert or update on public.community_account_permissions
  for each row execute function app_private.stamp_audit();

create function app_private.stamp_first_approval() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and old.first_approved_at is not null then
    if new.first_approved_at is distinct from old.first_approved_at then
      raise exception 'first_approval_immutable' using errcode='23514';
    end if;
  elsif new.first_approved_at is not null then
    raise exception 'first_approval_must_be_stamped' using errcode='23514';
  elsif new.standing='approved' then
    new.first_approved_at := clock_timestamp();
  end if;
  return new;
end $$;
create trigger b_first_approval before insert or update on public.community_accounts
  for each row execute function app_private.stamp_first_approval();

-- Lock the account before checking a newly enabled preference. An inactive
-- transition holds that same row lock and always clears any earlier opt-in.
create function app_private.guard_community_sharing() returns trigger language plpgsql
security definer set search_path='' as $$
begin
  if tg_table_name='community_accounts' then
    update public.community_account_preferences set show_global_profile=false
      where tenant_id=new.tenant_id and user_id=new.user_id and show_global_profile;
  else
    perform 1 from public.community_accounts where tenant_id=new.tenant_id
      and user_id=new.user_id and standing <> 'inactive' for update;
    if not found then raise exception 'inactive_community_sharing' using errcode='23514'; end if;
  end if;
  return new;
end $$;
create trigger clear_inactive_sharing after update of standing on public.community_accounts
  for each row when (new.standing='inactive') execute function app_private.guard_community_sharing();
create trigger validate_sharing before insert or update on public.community_account_preferences
  for each row when (new.show_global_profile) execute function app_private.guard_community_sharing();

-- The child PKs ensure at most one row. The reverse deferred foreign keys
-- require a preferences and a permissions row when an account commits.
alter table public.community_accounts
  add foreign key (tenant_id,user_id) references public.community_account_preferences deferrable initially deferred,
  add foreign key (tenant_id,user_id) references public.community_account_permissions deferrable initially deferred;

alter table public.tenant_settings
  add column pause_community_events boolean not null default false,
  add column allow_public_chat_visibility boolean not null default false,
  add column allow_public_activity_visibility boolean not null default false,
  add column allow_public_directory_visibility boolean not null default false;

alter table public.tenant_staff_assignments rename column can_create_admin to can_grant_staff;
alter table public.tenant_staff_assignments
  drop constraint tenant_staff_assignments_status_check,
  add check (status in ('active','paused','revoked')),
  add column can_discipline_users boolean not null default false,
  add column can_discipline_staff boolean not null default false,
  add column can_manage_community_activities boolean not null default false,
  add column can_manage_official_activities boolean not null default false,
  add column can_manage_community_permissions boolean not null default false,
  add column can_see_private_events boolean not null default false,
  add column can_manage_settings boolean not null default false,
  add column can_moderate_all_chats boolean not null default false,
  add column can_audit_community_accounts boolean not null default false,
  add column can_audit_staff_accounts boolean not null default false,
  drop constraint owner_permissions;

-- Do not rewrite original attribution or emit a staff action for a schema
-- conversion. Non-owner flags retain their exact previous values.
drop trigger a_invariants on public.tenant_staff_assignments;
alter table public.tenant_staff_assignments disable trigger z_audit;
alter table public.tenant_staff_assignments disable trigger log_admin_action;
update public.tenant_staff_assignments set
  can_discipline_users=true,
  can_discipline_staff=true,
  can_manage_community_activities=true,
  can_manage_official_activities=true,
  can_manage_community_permissions=true,
  can_see_private_events=true,
  can_manage_settings=true,
  can_moderate_all_chats=true,
  can_audit_community_accounts=true,
  can_audit_staff_accounts=true
where role='owner';
set constraints all immediate;
alter table public.tenant_staff_assignments enable trigger z_audit;
drop trigger log_admin_action on public.tenant_staff_assignments;
set constraints all deferred;

-- A composite FK checks standing on either side of an active assignment,
-- including under concurrent writes. Paused and revoked staff confer no power.
alter table public.community_accounts add unique (tenant_id,user_id,standing);
alter table public.tenant_staff_assignments
  add column required_account_standing text generated always as
    (case when status='active' then 'approved'::text end) stored,
  add foreign key (tenant_id,user_id,required_account_standing)
    references public.community_accounts (tenant_id,user_id,standing) deferrable initially deferred,
  add constraint owner_permissions check (role <> 'owner' or
    (status='active' and can_approve_users and can_grant_staff and can_modify_content
     and can_discipline_users and can_discipline_staff and can_manage_community_activities
     and can_manage_official_activities and can_manage_community_permissions and can_see_private_events
     and can_manage_settings and can_moderate_all_chats and can_audit_community_accounts and can_audit_staff_accounts));

-- Creation commands supply all owner flags. A CHECK rejects an incomplete
-- assignment and this guard prevents changing its identity or authority later.
create function app_private.protect_staff_assignment() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.role='owner' then
    raise exception 'owner_assignment_immutable' using errcode='23514';
  elsif tg_op='DELETE' then
    return old;
  elsif (new.tenant_id,new.user_id,new.role) is distinct from (old.tenant_id,old.user_id,old.role) then
    raise exception 'staff_identity_immutable' using errcode='23514';
  end if;
  return new;
end $$;
create trigger a_invariants before update or delete on public.tenant_staff_assignments
  for each row execute function app_private.protect_staff_assignment();


-- Close the complete legacy lifecycle surface in the transaction that opens the API.
drop view public.tenant_admin_candidates, public.tenant_pending_community_accounts;
drop function public.create_tenant(text,text,text,text,text,text,boolean), public.join_community(uuid),
  public.set_auto_approve_users(uuid,boolean), public.approve_community_account(uuid,uuid),
  public.create_tenant_admin(uuid,uuid), public.set_admin_permissions(uuid,uuid,boolean,boolean,boolean),
  public.set_tenant_archived(uuid,boolean);
drop function app_private.lock_tenant(uuid,boolean,boolean), app_private.has_permission(uuid,text);
drop policy own_community_preferences_update on public.community_accounts;
drop policy own_community_profile_insert on public.community_account_profiles;
revoke insert(tenant_id,display_name,bio),update(tenant_id) on public.community_account_profiles from authenticated;
alter policy self_profile on public.community_account_profiles using (
  user_id=app_private.verified_user() and exists(select from public.community_accounts c
  where (c.tenant_id,c.user_id)=(community_account_profiles.tenant_id,community_account_profiles.user_id)
  and c.standing in ('approved','pending','suspended')));
alter policy own_community_profile_update on public.community_account_profiles using (
  user_id=app_private.verified_user() and app_private.active_tenant(tenant_id) and exists(select from public.community_accounts c
  where (c.tenant_id,c.user_id)=(community_account_profiles.tenant_id,community_account_profiles.user_id)
  and c.standing in ('approved','pending','suspended'))) with check (user_id=app_private.verified_user());
grant select(tenant_id,show_global_profile,allow_direct_messages,allow_private_invitations),
  update(show_global_profile,allow_direct_messages,allow_private_invitations) on public.community_account_preferences to authenticated;
create policy own_preferences on public.community_account_preferences for all to authenticated
  using (user_id=app_private.verified_user() and exists(select from public.community_accounts c
    where (c.tenant_id,c.user_id)=(community_account_preferences.tenant_id,community_account_preferences.user_id)
    and c.standing in ('pending','approved','suspended')))
  with check (user_id=app_private.verified_user() and app_private.active_tenant(tenant_id));

alter table public.community_accounts add column revision uuid not null default gen_random_uuid();
create function app_private.stamp_community_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision := gen_random_uuid(); return new; end $$;
create trigger b_revision before update on public.community_accounts for each row execute function app_private.stamp_community_revision();

-- Only the server login uses this transaction-local tenant selector.
create function app_private.command_scope() returns uuid language sql stable set search_path='' as $$
  select case when app_private.verified_user() is not null then nullif(current_setting('ct.tenant_id',true),'')::uuid end
$$;
grant execute on function app_private.command_scope() to ct_api;
create policy command_scope on public.tenants for all to ct_api
  using (id=app_private.command_scope()) with check (id=app_private.command_scope());
create policy command_scope on public.tenant_settings for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
create policy command_scope on public.community_accounts for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
create policy command_scope on public.community_account_profiles for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
create policy command_scope on public.community_account_preferences for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
create policy command_scope on public.community_account_permissions for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
create policy command_scope on public.tenant_staff_assignments for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
create policy command_scope on public.tenant_admin_actions for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
create policy command_scope on app_private.community_account_requests for all to ct_api
  using (tenant_id=app_private.command_scope()) with check (tenant_id=app_private.command_scope());
grant select(id,operational_status), insert(id,name,slug,country_code,city,state_province,timezone),
  update(operational_status) on public.tenants to ct_api;
grant select(tenant_id,auto_approve_users), insert(tenant_id),update(auto_approve_users) on public.tenant_settings to ct_api;
grant select(first_approved_at,has_disciplinary_restriction,revision), insert(tenant_id,user_id,standing),
  update(standing,has_disciplinary_restriction) on public.community_accounts to ct_api;
grant insert(tenant_id,user_id,display_name,bio) on public.community_account_profiles to ct_api;
grant insert(tenant_id,user_id) on public.community_account_preferences,public.community_account_permissions to ct_api;
grant select(tenant_id,user_id,role,status,can_approve_users, can_grant_staff, can_modify_content, can_discipline_users, can_discipline_staff, can_manage_community_activities, can_manage_official_activities, can_manage_community_permissions, can_see_private_events, can_manage_settings, can_moderate_all_chats, can_audit_community_accounts, can_audit_staff_accounts),
  insert(tenant_id,user_id,role,can_approve_users, can_grant_staff, can_modify_content, can_discipline_users, can_discipline_staff, can_manage_community_activities, can_manage_official_activities, can_manage_community_permissions, can_see_private_events, can_manage_settings, can_moderate_all_chats, can_audit_community_accounts, can_audit_staff_accounts), update(status,can_approve_users, can_grant_staff, can_modify_content, can_discipline_users, can_discipline_staff, can_manage_community_activities, can_manage_official_activities, can_manage_community_permissions, can_see_private_events, can_manage_settings, can_moderate_all_chats, can_audit_community_accounts, can_audit_staff_accounts) on public.tenant_staff_assignments to ct_api;
grant select,delete,insert(id,tenant_id,user_id,requested_by,kind) on app_private.community_account_requests to ct_api;
grant insert(tenant_id,target_user_id,action,details,reason) on public.tenant_admin_actions to ct_api;

-- Actor, time, correlation and history audience cannot be supplied by the HTTP caller.
alter table public.tenant_admin_actions alter column operation_id set default gen_random_uuid();
create table app_private.account_action_types(code text primary key, usage text not null check (usage in ('legacy','command','system')));
insert into app_private.account_action_types
  select t||'.'||op,'legacy' from unnest(array['community_accounts','tenant_staff_assignments']) t
    cross join unnest(array['insert','update','delete']) op
  union all select t||'.'||op,'system' from unnest(array['tenants','tenant_settings','tenant_website_content_overrides']) t
    cross join unnest(array['insert','update','delete']) op;
insert into app_private.account_action_types values ('community_join_request_adopted','legacy');
insert into app_private.account_action_types select action,'command' from unnest(array[
  'community_join_requested','community_join_withdrawn','community_approved','community_deactivated','community_suspended',
  'community_removed','community_restriction_cleared','community_reactivation_requested','community_reactivation_withdrawn',
  'community_reactivated','staff_created','staff_paused','staff_resumed','staff_revoked','staff_reappointed','staff_permissions_changed']) action;
alter table public.tenant_admin_actions add foreign key(action) references app_private.account_action_types(code);
create function app_private.attribute_command() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if session_user='ct_api' then
    new.created_by := app_private.verified_user();
    new.operation_id := nullif(current_setting('ct.operation_id',true),'')::uuid;
    if new.created_by is null or new.operation_id is null or new.tenant_id is distinct from app_private.command_scope()
      or exists(select from app_private.account_action_types where code=new.action and usage='legacy') then
      raise exception 'invalid command attribution' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
create trigger attribute_command before insert on public.tenant_admin_actions for each row execute function app_private.attribute_command();
create function app_private.classify_command() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.action like 'staff\_%' then
    insert into app_private.tenant_admin_action_categories values(new.id,'staff_account');
  end if;
  if new.action like 'community\_%' or new.action in ('staff_created','staff_reappointed')
      or (new.action='staff_revoked' and new.details->>'before_status'='active') then
    insert into app_private.tenant_admin_action_categories values(new.id,'community_account');
  end if;
  return new;
end $$;
create trigger classify_command after insert on public.tenant_admin_actions for each row execute function app_private.classify_command();
notify pgrst,'reload schema';
commit;
