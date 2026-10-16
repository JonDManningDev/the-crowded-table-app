begin;

-- D-111: global presentation uses the same limits/audit contract as curated profiles.
-- The previous migration is already deployed; preserve its data with a forward repair.
alter table public.user_account_profiles
  drop constraint user_account_profiles_display_name_check,
  drop constraint user_account_profiles_bio_check,
  add constraint user_account_profiles_display_name_check check
    (display_name = btrim(display_name) and char_length(display_name) between 1 and 80),
  add constraint user_account_profiles_bio_check check (char_length(bio) <= 2000),
  add column created_at timestamptz not null default clock_timestamp(),
  add column updated_at timestamptz not null default clock_timestamp(),
  add column created_by uuid references public.user_accounts(user_id) on delete restrict,
  add column updated_by uuid references public.user_accounts(user_id) on delete restrict;
-- Legacy write times/actors were not recorded. Timestamps start at adoption;
-- leave historical actors null instead of fabricating attribution.
create index user_account_profiles_created_by on public.user_account_profiles(created_by);
create index user_account_profiles_updated_by on public.user_account_profiles(updated_by);
create trigger a_invariants before insert or update or delete on public.user_account_profiles
  for each row execute function app_private.protect_invariants();
create trigger z_audit before insert or update on public.user_account_profiles
  for each row execute function app_private.stamp_audit();

-- D-113/D-114: three independent preferences, with defaults for existing/new accounts.
alter table public.user_accounts
  add column user_is_discoverable boolean not null default true,
  add column enable_matchmaking boolean not null default true;
alter table public.community_accounts
  add column show_global_profile boolean not null default false;

-- Q-016 is unresolved. Keep self-only table reads; future audience APIs must
-- return authorized projections and enforce live preferences, eligibility and blocks.
drop policy own_profile_insert on public.user_account_profiles;
drop policy own_profile_update on public.user_account_profiles;
revoke all on public.user_account_profiles from public, anon, authenticated;
grant select on public.user_account_profiles to authenticated;

create function public.save_user_account_profile(p_display_name text,p_bio text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app_private.verified_user();
begin
  if v_actor is null then raise exception 'verified_account_required' using errcode = '42501'; end if;
  insert into public.user_account_profiles(user_id,display_name,bio)
    values (v_actor,btrim(p_display_name),nullif(btrim(p_bio),''))
    on conflict (user_id) do update set display_name=excluded.display_name,bio=excluded.bio;
end $$;

-- Null means unchanged, allowing independent updates without resetting the other flag.
create function public.set_user_account_preferences(
  p_user_is_discoverable boolean default null,p_enable_matchmaking boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app_private.verified_user();
begin
  if v_actor is null then raise exception 'verified_account_required' using errcode = '42501'; end if;
  update public.user_accounts set
    user_is_discoverable=coalesce(p_user_is_discoverable,user_is_discoverable),
    enable_matchmaking=coalesce(p_enable_matchmaking,enable_matchmaking)
    where user_id=v_actor;
end $$;

create function public.set_community_global_profile_visibility(p_tenant_id uuid,p_show_global_profile boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app_private.verified_user();
begin
  if v_actor is null then raise exception 'verified_account_required' using errcode = '42501'; end if;
  -- Consent can be withdrawn even while suspended/archived. This command grants
  -- neither standing nor audience access and cannot mutate another user's row.
  update public.community_accounts set show_global_profile=p_show_global_profile
    where tenant_id=p_tenant_id and user_id=v_actor;
  if not found then raise exception 'community_account_required' using errcode = '42501'; end if;
end $$;

revoke all on function public.save_user_account_profile(text,text),
  public.set_user_account_preferences(boolean,boolean),
  public.set_community_global_profile_visibility(uuid,boolean) from public, anon, authenticated;
grant execute on function public.save_user_account_profile(text,text),
  public.set_user_account_preferences(boolean,boolean),
  public.set_community_global_profile_visibility(uuid,boolean) to authenticated;

commit;
