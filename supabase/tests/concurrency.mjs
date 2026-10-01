// Runs only against the disposable, unexposed migration-test container.
// Fixtures intentionally persist until that dedicated container is removed.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const container = 'crowded-table-migration-test';
function sql(statement) {
  return new Promise((resolve, reject) => {
    const p = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']);
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', code => resolve({ code, out: out.trim(), err }));
    p.stdin.end(statement);
  });
}
async function success(statement) {
  const result = await sql(statement);
  assert.equal(result.code, 0, result.err);
  return result.out;
}
const owner = '90000000-0000-0000-0000-000000000001';
const member = '90000000-0000-0000-0000-000000000002';
const admin = '90000000-0000-0000-0000-000000000003';
const asUser = id => `set role authenticated; set request.jwt.claim.sub = '${id}';`;
await success(`insert into auth.users(id,email,email_confirmed_at) values
 ('${owner}','race-owner@example.test',now()),('${member}','race-member@example.test',now()),('${admin}','race-admin@example.test',now());`);
const tenant = await success(`${asUser(owner)} select public.create_tenant('race-community','Race Community','HN','UTC');`);
await success(`${asUser(admin)} select public.join_community('${tenant}');`);
await success(`${asUser(owner)} select public.create_tenant_admin('${tenant}','${admin}'); select public.set_admin_permissions('${tenant}','${admin}',true,false);`);

// Wait until the first connection holds the lock rather than relying on a sleep
// to order the competing operation. The sleep only keeps that lock long enough
// for a second real connection to attempt its command.
async function orderedRace(first, second, marker) {
  const running = sql(`set application_name='${marker}'; begin; ${first} select pg_sleep(2); commit;`);
  let observed = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await success(`select exists(select 1 from pg_stat_activity where application_name='${marker}' and wait_event='PgSleep');`) === 't') {
      observed = true; break;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.ok(observed, 'first transaction acquired its lock');
  const competing = sql(second);
  const results = await Promise.all([running, competing]);
  assert.equal(results[0].code, 0, results[0].err);
  return results[1];
}

const archived = await orderedRace(`${asUser(owner)} select public.set_tenant_archived('${tenant}',true);`,
 `${asUser(member)} select public.join_community('${tenant}');`, 'crowded_archive_race');
assert.notEqual(archived.code, 0);
assert.match(archived.err, /tenant_unavailable/);
assert.equal(await success(`select count(*) from public.community_accounts where tenant_id='${tenant}' and user_id='${member}';`), '0');
console.log('PASS archive versus join: no post-archive participation');

await success(`${asUser(owner)} select public.set_tenant_archived('${tenant}',false);`);
await success(`${asUser(member)} select public.join_community('${tenant}');`);
const revoked = await orderedRace(`${asUser(owner)} select public.set_admin_permissions('${tenant}','${admin}',false,false);`,
 `${asUser(admin)} select public.approve_community_account('${tenant}','${member}');`, 'crowded_permission_race');
assert.notEqual(revoked.code, 0);
assert.match(revoked.err, /approval_permission_required/);
assert.equal(await success(`select standing from public.community_accounts where tenant_id='${tenant}' and user_id='${member}';`), 'pending');
console.log('PASS permission revocation versus approval: live permission rechecked');

const creations = await Promise.all([owner, member].map(id => sql(`${asUser(id)} select public.create_tenant('race-unique','Unique','HN','UTC');`)));
assert.equal(creations.filter(r => r.code === 0).length, 1);
assert.equal(creations.filter(r => /duplicate key/.test(r.err)).length, 1);
assert.equal(await success(`select count(*) from public.tenant_staff_assignments s join public.tenants t on t.id=s.tenant_id where t.slug='race-unique' and s.role='owner';`), '1');
console.log('PASS concurrent slug claims: one complete tenant and owner');
