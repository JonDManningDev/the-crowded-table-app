begin;

-- Replace the signature so every authenticated caller uses one ordered setup.
drop function app_private.begin_actor_context(uuid, uuid);

create function app_private.begin_actor_context(p_actor uuid, p_operation uuid, p_initial_tenant uuid)
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
  if not app_private.lock_eligible_actor() then
    return false;
  end if;
  perform pg_catalog.set_config('ct.tenant_id', coalesce(p_initial_tenant::text, ''), true);
  return true;
end;
$$;
alter function app_private.begin_actor_context(uuid, uuid, uuid) owner to postgres;
revoke all on function app_private.begin_actor_context(uuid, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function app_private.begin_actor_context(uuid, uuid, uuid) to ct_api;

commit;
