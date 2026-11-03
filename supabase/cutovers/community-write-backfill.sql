-- First part of the coordinated write cutover. Rehearse only in the disposable
-- upgrade database until the replacement commands and caller grants are ready.
-- The harness supplies the preflight view and commits after its final checks.
-- Begin here so accidental standalone execution also rolls back on failure.
begin isolation level read committed;
do $scope$
begin
  if current_database() !~ '^crowded_table_api_test_[0-9a-f]{32}$' then
    raise exception 'unreleased cutover requires an isolated upgrade database';
  end if;
end $scope$;
lock table public.tenants, public.tenant_settings, public.tenant_staff_assignments, public.community_accounts,
  public.user_account_profiles, public.community_account_profiles, public.tenant_admin_actions in access exclusive mode;
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
