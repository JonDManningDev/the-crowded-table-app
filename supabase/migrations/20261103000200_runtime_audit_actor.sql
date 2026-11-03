begin;

-- Keep the API out of the Auth schema. The private eligibility helper can read
-- Auth, while this trigger still executes with the writer's privileges.
create or replace function app_private.stamp_audit() returns trigger
language plpgsql set search_path = '' as $$
declare actor uuid;
begin
  if tg_op = 'INSERT' and tg_table_name = 'user_accounts' then
    actor := (to_jsonb(new)->>'user_id')::uuid;
  elsif session_user = 'ct_api' then
    actor := app_private.verified_user();
    if actor is null then
      raise exception 'verified actor required' using errcode = '42501';
    end if;
  else
    actor := auth.uid();
  end if;
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
    new.created_by := actor;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := actor;
  return new;
end $$;

revoke usage on schema auth from ct_api;
revoke execute on function auth.uid() from ct_api;
commit;
