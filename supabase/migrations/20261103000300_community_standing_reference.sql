begin;

-- Scope defaults to the application migration creator. PostgreSQL's global
-- PUBLIC EXECUTE default cannot be subtracted by a per-schema revoke.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

create table public.community_standing (
  standing text primary key,
  enable_standard_chat_visibility boolean not null,
  enable_standard_activity_visibility boolean not null,
  enable_other_profile_visibility boolean not null,
  enable_own_profile_management boolean not null,
  enable_standard_participation boolean not null,
  enable_standard_dms boolean not null
);
insert into public.community_standing (
  standing, enable_standard_chat_visibility, enable_standard_activity_visibility,
  enable_other_profile_visibility, enable_own_profile_management, enable_standard_participation, enable_standard_dms
) values
  ('pending',   false, false, false, true,  false, false),
  ('approved',  true,  true,  true,  true,  true,  true),
  ('suspended', true,  true,  true,  true,  false, true),
  ('inactive',  false, false, false, false, false, false);

alter table public.community_standing enable row level security;
revoke all on public.community_standing from public, anon, authenticated, service_role, ct_api;
grant select (standing, enable_standard_chat_visibility, enable_standard_activity_visibility,
  enable_other_profile_visibility, enable_own_profile_management, enable_standard_participation, enable_standard_dms)
  on public.community_standing to ct_api;
create policy api_standing_reference on public.community_standing for select to ct_api using (true);
commit;
