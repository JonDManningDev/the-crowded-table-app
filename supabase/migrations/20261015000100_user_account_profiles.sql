begin;

create table public.user_account_profiles (
  user_id uuid primary key references public.user_accounts(user_id) on delete restrict,
  display_name text not null check (display_name = btrim(display_name) and char_length(display_name) between 1 and 40),
  bio text check (char_length(bio) <= 300)
);
alter table public.user_account_profiles enable row level security;
revoke all on public.user_account_profiles from anon, authenticated;
grant select, insert, update on public.user_account_profiles to authenticated;
create policy own_profile_read on public.user_account_profiles for select to authenticated
  using (user_id = (select app_private.verified_user()));
create policy own_profile_insert on public.user_account_profiles for insert to authenticated
  with check (user_id = (select app_private.verified_user()));
create policy own_profile_update on public.user_account_profiles for update to authenticated
  using (user_id = (select app_private.verified_user()))
  with check (user_id = (select app_private.verified_user()));

commit;
