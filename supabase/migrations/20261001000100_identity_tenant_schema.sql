-- Application-owned schema. Supabase supplies auth.users, auth.uid(), and API roles.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.user_accounts (
  user_id uuid primary key references auth.users(id) on delete restrict
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    char_length(slug) between 3 and 63
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and slug not in ('admin','api','app','auth','account','accounts','callback',
      'community','communities','create','dashboard','discover','help','home',
      'login','logout','new','privacy','profile','reset-password','settings',
      'signup','support','terms','www')
  ),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  country_code text not null check (country_code = any(string_to_array(
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW',' '))),
  state_province text check (state_province = btrim(state_province) and char_length(state_province) between 1 and 120),
  city text check (city = btrim(city) and char_length(city) between 1 and 120),
  timezone text not null,
  operational_status text not null default 'active' check (operational_status in ('active','archived'))
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete restrict,
  auto_approve_users boolean not null default false
);

create table public.tenant_staff_assignments (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.user_accounts(user_id) on delete restrict,
  role text not null check (role in ('owner','admin')),
  status text not null default 'active' check (status in ('active','revoked')),
  can_approve_users boolean not null default false,
  can_create_admin boolean not null default false,
  primary key (tenant_id,user_id),
  constraint owner_permissions check (role <> 'owner' or
    (status = 'active' and can_approve_users and can_create_admin))
);
create unique index one_owner_per_tenant on public.tenant_staff_assignments(tenant_id) where role = 'owner';
create index staff_by_user on public.tenant_staff_assignments(user_id,tenant_id);

create table public.community_accounts (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.user_accounts(user_id) on delete restrict,
  standing text not null default 'pending' check (standing in ('pending','approved','suspended','removed')),
  primary key (tenant_id,user_id)
);
create index community_accounts_by_user on public.community_accounts(user_id,tenant_id);
create index community_accounts_approval_queue on public.community_accounts(tenant_id,standing,user_id);

create table public.community_account_profiles (
  tenant_id uuid not null,
  user_id uuid not null,
  display_name text not null check (display_name = btrim(display_name) and char_length(display_name) between 1 and 80),
  bio text check (char_length(bio) <= 2000),
  primary key (tenant_id,user_id),
  foreign key (tenant_id,user_id) references public.community_accounts(tenant_id,user_id) on delete restrict
);
create index profiles_by_user on public.community_account_profiles(user_id,tenant_id);

create table public.tenant_website_content_overrides (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  content_key text not null check (content_key in (
    'community.hero.eyebrow','community.hero.heading','community.hero.description',
    'community.welcome.eyebrow','community.welcome.heading','community.welcome.body','community.welcome.emphasis')),
  text_value text not null check (char_length(btrim(text_value)) > 0 and char_length(text_value) <=
    case when content_key like '%.eyebrow' then 120 when content_key like '%.heading' then 200
      when content_key like '%.body' then 2000 else 500 end),
  primary key (tenant_id,content_key)
);

-- Immutable audit entries intentionally omit updated_at/updated_by.
-- Only identifiers and safe operation metadata are logged, never profile/copy bodies.
create table public.tenant_admin_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  action text not null,
  target_user_id uuid references public.user_accounts(user_id) on delete restrict,
  content_key text,
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.user_accounts(user_id) on delete restrict
);
create index tenant_actions_by_time on public.tenant_admin_actions(tenant_id,created_at desc,id);

-- Uniform audit fields and deletion restrictions, including on relation tables.
do $migration$
declare t text;
begin
  foreach t in array array['user_accounts','tenants','tenant_settings','tenant_staff_assignments',
    'community_accounts','community_account_profiles','tenant_website_content_overrides'] loop
    execute format('alter table public.%I
      add column created_at timestamptz not null default clock_timestamp(),
      add column updated_at timestamptz not null default clock_timestamp(),
      add column created_by uuid references public.user_accounts(user_id) on delete restrict,
      add column updated_by uuid references public.user_accounts(user_id) on delete restrict',t);
    execute format('create index %I on public.%I(created_by)', t || '_created_by',t);
    execute format('create index %I on public.%I(updated_by)', t || '_updated_by',t);
  end loop;
end $migration$;
create index tenant_actions_by_actor on public.tenant_admin_actions(created_by);
create index tenant_actions_by_target on public.tenant_admin_actions(target_user_id);

create function app_private.stamp_audit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
    -- Signup is attributed to the newly created identity, even without a session.
    new.created_by := case when tg_table_name = 'user_accounts' then (to_jsonb(new)->>'user_id')::uuid else auth.uid() end;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := case when tg_op = 'INSERT' then new.created_by else auth.uid() end;
  return new;
end $$;

create function app_private.protect_invariants() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'tenants' and tg_op <> 'DELETE' then
    if tg_op = 'UPDATE' and (new.id <> old.id or new.slug <> old.slug) then
      raise exception 'tenant_identity_immutable' using errcode = '23514';
    end if;
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
      raise exception 'invalid_timezone' using errcode = '23514';
    end if;
  elsif tg_table_name = 'tenant_staff_assignments' then
    if tg_op = 'INSERT' and new.role = 'owner' then
      new.can_approve_users := true;
      new.can_create_admin := true;
    elsif tg_op <> 'INSERT' then
      if old.role = 'owner' and (tg_op = 'DELETE' or new is distinct from old) then
        raise exception 'owner_assignment_immutable' using errcode = '23514';
      end if;
      if tg_op = 'UPDATE' and (new.tenant_id <> old.tenant_id or new.user_id <> old.user_id or new.role <> old.role) then
        raise exception 'staff_identity_immutable' using errcode = '23514';
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if to_jsonb(new)->'tenant_id' is distinct from to_jsonb(old)->'tenant_id'
       or to_jsonb(new)->'user_id' is distinct from to_jsonb(old)->'user_id' then
      raise exception 'account_identity_immutable' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create function app_private.require_tenant_roots() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := case when tg_table_name = 'tenants' then (to_jsonb(new)->>'id')::uuid
    when tg_op = 'DELETE' then (to_jsonb(old)->>'tenant_id')::uuid else (to_jsonb(new)->>'tenant_id')::uuid end;
  if exists (select 1 from public.tenants where id = v_tenant) then
    if (select count(*) from public.tenant_staff_assignments where tenant_id = v_tenant and role = 'owner' and status = 'active') <> 1
       or not exists (select 1 from public.tenant_settings where tenant_id = v_tenant) then
      raise exception 'tenant_requires_owner_and_settings' using errcode = '23514';
    end if;
  end if;
  return null;
end $$;
create constraint trigger tenant_roots after insert or update on public.tenants
  deferrable initially deferred for each row execute function app_private.require_tenant_roots();
create constraint trigger staff_roots after insert or update or delete on public.tenant_staff_assignments
  deferrable initially deferred for each row execute function app_private.require_tenant_roots();
create constraint trigger settings_roots after insert or update or delete on public.tenant_settings
  deferrable initially deferred for each row execute function app_private.require_tenant_roots();

do $migration$
declare t text;
begin
  foreach t in array array['user_accounts','tenants','tenant_settings','tenant_staff_assignments',
    'community_accounts','community_account_profiles','tenant_website_content_overrides'] loop
    execute format('create trigger a_invariants before insert or update or delete on public.%I for each row execute function app_private.protect_invariants()',t);
    execute format('create trigger z_audit before insert or update on public.%I for each row execute function app_private.stamp_audit()',t);
  end loop;
  foreach t in array array['user_accounts','tenants','tenant_settings','tenant_staff_assignments',
    'community_accounts','community_account_profiles','tenant_website_content_overrides','tenant_admin_actions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated',t);
    execute format('grant select on table public.%I to authenticated',t);
  end loop;
end $migration$;

create function app_private.provision_user_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_accounts(user_id) values (new.id);
  return new;
end $$;
create trigger crowded_table_user_created after insert on auth.users
  for each row execute function app_private.provision_user_account();
-- Existing identities receive their application account as part of adoption.
insert into public.user_accounts(user_id) select id from auth.users on conflict do nothing;

create function app_private.append_admin_action() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.tenant_admin_actions(tenant_id,action,target_user_id,content_key,created_by)
  values (coalesce((r->>'tenant_id')::uuid,(r->>'id')::uuid),
    tg_table_name || '.' || lower(tg_op), (r->>'user_id')::uuid,r->>'content_key',auth.uid());
  return null;
end $$;
do $migration$
declare t text;
begin
  foreach t in array array['tenants','tenant_settings','tenant_staff_assignments','community_accounts','tenant_website_content_overrides'] loop
    execute format('create trigger log_admin_action after insert or update or delete on public.%I for each row execute function app_private.append_admin_action()',t);
  end loop;
end $migration$;
create function app_private.reject_audit_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'audit_is_append_only' using errcode = '23514'; end $$;
create trigger immutable_audit before update or delete on public.tenant_admin_actions
  for each row execute function app_private.reject_audit_mutation();

revoke all on all functions in schema app_private from public, anon, authenticated;
commit;
