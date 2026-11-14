begin;

-- Account-ID blocks no longer lock a target's global preference row.
drop policy profile_target_lock on public.user_accounts;

commit;
