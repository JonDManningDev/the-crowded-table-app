begin;
-- PostgREST includes the composite key in UPDATE readback. Both key columns
-- identify the holder's own row, under private_preference_read and the archive rule.
grant select(user_id) on public.community_account_preferences to authenticated;
notify pgrst,'reload schema';
commit;
