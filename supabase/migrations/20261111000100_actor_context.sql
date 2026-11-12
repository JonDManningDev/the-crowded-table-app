begin;

-- Ordered transaction-local setup needs no elevated Auth access. Keep the
-- existing narrow definer as the sole owner of the actor eligibility row lock.
create function app_private.begin_actor_context(p_actor uuid, p_operation uuid)
returns boolean
language plpgsql volatile security invoker
set search_path = ''
as $$
begin
  if p_actor is null or p_operation is null then
    return false;
  end if;
  perform pg_catalog.set_config('request.jwt.claim.sub', p_actor::text, true);
  perform pg_catalog.set_config('ct.operation_id', p_operation::text, true);
  return app_private.lock_eligible_actor();
end;
$$;
alter function app_private.begin_actor_context(uuid, uuid) owner to postgres;
revoke all on function app_private.begin_actor_context(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function app_private.begin_actor_context(uuid, uuid) to ct_api;

commit;
