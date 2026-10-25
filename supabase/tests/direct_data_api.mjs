// Real Supabase SDK/PostgREST and concurrent SQL checks. Local Docker only.
// Creates uniquely identified synthetic fixtures and removes only those fixtures.
import assert from 'node:assert/strict';
import { execFileSync, execSync, spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const container = 'supabase_db_the-crowded-table-app';
const config = JSON.parse(execSync('npx --yes supabase status --output json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const url = new URL(config.API_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '54321', 'local API required');
const owner = randomUUID(), member = randomUUID(), other = randomUUID(), unverified = randomUUID();
const identities = [owner, member, other, unverified];
const slug = `data-api-${randomUUID()}`;
let tenant, secondTenant;
let checks = 0;
function sql(statement) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
const asUser = (id, statement) => `set role authenticated; set request.jwt.claim.sub='${id}'; ${statement}`;
function client(id) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url');
  const signature = createHmac('sha256', config.JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return createClient(config.API_URL, config.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${header}.${payload}.${signature}` } },
  });
}
async function success(query) {
  const result = await query;
  assert.equal(result.error, null, JSON.stringify(result.error));
  checks++;
  return result.data;
}
async function denied(query, code) {
  const result = await query;
  assert.ok(result.error, 'expected denied/empty request');
  if (code) assert.equal(result.error.code, code);
  checks++;
}
async function waitForBlocked(functionName) {
  assert.match(functionName, /^[a-z_]+$/);
  for (let i = 0; i < 50; i++) {
    if (sql(`select exists(select 1 from pg_stat_activity where wait_event_type='Lock' and query like '%${functionName}%' and pid<>pg_backend_pid());`) === 't') return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.fail(`${functionName} did not wait for the coordinating transaction`);
}
// Hold a real open transaction until the caller releases it; no timing sleeps.
async function hold(statement) {
  const process = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']);
  let output = '', error = '';
  const finished = new Promise((resolve, reject) => {
    process.on('error', reject);
    process.on('close', code => code === 0 ? resolve() : reject(new Error(error || `psql exited ${code}`)));
  });
  // Attach rejection handling immediately while waiting for readiness.
  finished.catch(() => {});
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { process.stdin.end('rollback;'); reject(new Error('lock acquisition timed out')); }, 10000);
    process.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('fixture_lock_ready')) { clearTimeout(timer); resolve(); }
    });
    process.stderr.on('data', chunk => { error += chunk; });
    finished.catch(err => { clearTimeout(timer); reject(err); });
  });
  process.stdin.write(`begin; ${statement}; select 'fixture_lock_ready';\n`);
  await ready;
  return async (commit = false) => { process.stdin.end(commit ? 'commit;\n' : 'rollback;\n'); await finished; };
}

try {
  sql(`insert into auth.users(id,email,email_confirmed_at) values ${identities.map(id => `('${id}','${id}@example.test',${id === unverified ? 'null' : 'now()'})`).join(',')};`);
  tenant = sql(asUser(owner, `select public.create_tenant('${slug}','API fixture','HN','UTC');`));
  secondTenant = sql(asUser(other, `select public.create_tenant('${slug}-b','Other fixture','HN','UTC');`));
  sql(asUser(member, `select public.join_community('${tenant}');`));
  sql(asUser(other, `select public.join_community('${tenant}');`));
  const a = client(owner), b = client(member), c = client(other), u = client(unverified);

  for (const display_name of ['First name', 'Changed name']) {
    const row = await success(b.from('user_account_profiles').upsert({ display_name, bio: ' ' }, { onConflict: 'user_id' }).select('user_id,display_name,bio,created_by,updated_by').single());
    assert.deepEqual(row, { user_id: member, display_name, bio: null, created_by: member, updated_by: member });
  }
  await success(b.from('user_accounts').update({ user_is_discoverable: false, enable_matchmaking: false }).eq('user_id', member).select('user_id').single());
  await success(b.from('user_accounts').update({ enable_matchmaking: true }).eq('user_id', member).select('user_id').single());
  assert.deepEqual(await success(b.from('user_accounts').select('user_is_discoverable,enable_matchmaking').single()), { user_is_discoverable: false, enable_matchmaking: true });
  await denied(b.from('user_accounts').update({ user_is_discoverable: true }).eq('user_id', owner).select('user_id').single(), 'PGRST116');
  await denied(b.from('user_account_profiles').update({ updated_by: owner }).eq('user_id', member), '42501');
  await denied(b.from('user_account_profiles').upsert({ user_id: owner, display_name: 'Spoofed' }), '42501');
  await denied(u.from('user_account_profiles').upsert({ display_name: 'Unverified' }), '42501');
  await denied(u.from('user_accounts').update({ enable_matchmaking: false }).eq('user_id', unverified).select('user_id').single(), 'PGRST116');

  for (const display_name of ['Community name', 'Community updated']) {
    const row = await success(b.from('community_account_profiles').upsert({ tenant_id: tenant, display_name, bio: '' }, { onConflict: 'tenant_id,user_id' }).select('user_id,display_name,bio').single());
    assert.deepEqual(row, { user_id: member, display_name, bio: null });
  }
  await success(c.from('community_account_profiles').upsert({ tenant_id: tenant, display_name: 'Other member' }, { onConflict: 'tenant_id,user_id' }).select('user_id').single());
  await success(b.from('community_accounts').update({ show_global_profile: true }).eq('tenant_id', tenant).select('tenant_id').single());
  await denied(b.from('community_accounts').update({ show_global_profile: true }).eq('tenant_id', secondTenant).select('tenant_id').single(), 'PGRST116');
  await denied(b.from('community_accounts').update({ standing: 'approved' }).eq('tenant_id', tenant), '42501');
  await denied(b.from('community_account_profiles').update({ tenant_id: secondTenant }).eq('tenant_id', tenant), '23514');

  // Hold both edits for one member. Another member can still update both rows.
  const releaseMember = await hold(asUser(member, `update public.community_account_profiles set bio='Held' where tenant_id='${tenant}'; update public.community_accounts set show_global_profile=false where tenant_id='${tenant}'`));
  try {
    await success(c.from('community_account_profiles').update({ bio: 'Concurrent' }).eq('tenant_id', tenant).select('user_id').single().abortSignal(AbortSignal.timeout(2000)));
    await success(c.from('community_accounts').update({ show_global_profile: true }).eq('tenant_id', tenant).select('tenant_id').single().abortSignal(AbortSignal.timeout(2000)));
  } finally { await releaseMember(); }
  // A profile edit also has no explicit lock on the tenant itself.
  const releaseTenant = await hold(`select id from public.tenants where id='${tenant}' for update`);
  try {
    await success(b.from('community_account_profiles').update({ bio: 'No tenant lock' }).eq('tenant_id', tenant).select('user_id').single().abortSignal(AbortSignal.timeout(2000)));
  } finally { await releaseTenant(); }

  await success(a.rpc('create_tenant_admin', { p_tenant_id: tenant, p_user_id: member }));
  await success(a.rpc('set_admin_permissions', { p_tenant_id: tenant, p_user_id: member, p_can_modify_content: true }));
  const copy = { tenant_id: tenant, content_key: 'community.hero.heading', text_value: 'First content' };
  await success(b.from('tenant_website_content_overrides').upsert(copy, { onConflict: 'tenant_id,content_key' }).select('content_key').single());
  copy.text_value = 'Changed content';
  await success(b.from('tenant_website_content_overrides').upsert(copy, { onConflict: 'tenant_id,content_key' }).select('content_key').single());
  await denied(c.from('tenant_website_content_overrides').update({ text_value: 'Unauthorized' }).eq('tenant_id', tenant).select('content_key').single(), 'PGRST116');
  await success(b.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).eq('content_key', copy.content_key).select('content_key').single());
  await denied(b.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).eq('content_key', 'unknown').select('content_key').single(), 'PGRST116');
  await success(b.from('tenant_website_content_overrides').upsert(copy).select('content_key').single());
  await denied(b.rpc('set_admin_permissions', { p_tenant_id: tenant, p_user_id: member, p_can_modify_content: true }), '42501');
  await denied(b.from('tenants').update({ name: 'Unauthorized' }).eq('id', tenant).select('id').single(), 'PGRST116');
  await success(a.from('tenants').update({ name: ' Renamed ', city: ' ' }).eq('id', tenant).select('id').single());
  await success(a.rpc('set_admin_permissions', { p_tenant_id: tenant, p_user_id: member, p_can_approve_users: true, p_can_create_admin: true }));
  assert.equal((await success(b.from('tenant_staff_assignments').select('can_modify_content').eq('tenant_id', tenant).single())).can_modify_content, true);
  assert.equal((await success(b.from('tenant_admin_candidates').select('*'))).length, 2);
  assert.equal((await success(b.from('tenant_pending_community_accounts').select('*'))).length, 2);
  await denied(b.from('tenant_admin_candidates').select('bio'), '42703');

  // Retained approval RPC must wait for an uncommitted permission revocation.
  const revoke = await hold(asUser(owner, `select public.set_admin_permissions('${tenant}','${member}',false,false)`));
  let approvalFinished = false;
  const approval = b.rpc('approve_community_account', { p_tenant_id: tenant, p_user_id: other }).then(r => { approvalFinished = true; return r; });
  try {
    // Wait for a real blocked statement, not an assumed scheduling delay.
    await waitForBlocked('approve_community_account');
    assert.ok(!approvalFinished, 'approval waits for permission change');
  } finally { await revoke(true); }
  await denied(approval, '42501');
  const archive = await hold(asUser(owner, `select public.set_tenant_archived('${tenant}',true)`));
  const joining = a.rpc('join_community', { p_tenant_id: tenant }).then(result => result);
  try { await waitForBlocked('join_community'); } finally { await archive(true); }
  await denied(joining, '42501');
  await denied(b.from('community_account_profiles').upsert({ tenant_id: tenant, display_name: 'Archived' }, { onConflict: 'tenant_id,user_id' }), '42501');
  await denied(b.from('community_accounts').update({ show_global_profile: false }).eq('tenant_id', tenant).select('tenant_id').single(), 'PGRST116');
  await denied(b.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).select('content_key').single(), 'PGRST116');
  await success(a.from('tenant_website_content_overrides').update({ text_value: 'Archived owner' }).eq('tenant_id', tenant).select('content_key').single());
  await success(b.from('user_account_profiles').update({ bio: 'Global still editable' }).eq('user_id', member).select('user_id').single());
  sql(`update auth.users set banned_until=now()+interval '1 day' where id='${member}';`);
  await denied(b.from('user_accounts').update({ enable_matchmaking: false }).eq('user_id', member).select('user_id').single(), 'PGRST116');
  await denied(b.from('user_account_profiles').upsert({ display_name: 'Banned' }), '42501');
  const creations = await Promise.all([a, c].map(actor => actor.rpc('create_tenant', {
    p_slug: `${slug}-race`, p_name: 'Concurrent creation', p_country_code: 'HN', p_timezone: 'UTC',
  })));
  assert.equal(creations.filter(result => result.error === null).length, 1);
  assert.equal(creations.filter(result => result.error?.code === '23505').length, 1);
  assert.equal(sql(`select count(*) from public.tenants t join public.tenant_settings s on s.tenant_id=t.id join public.tenant_staff_assignments a on a.tenant_id=t.id and a.role='owner' where t.slug='${slug}-race';`), '1');
  console.log(`PASS ${checks} real PostgREST checks, independent member edits, tenant-lock-free profile save, retained permission/archive/slug races`);
} finally {
  // Only our random identities/tenants, only the hardcoded local Docker DB.
  // Bypass deletion-protection/audit triggers for fixture cleanup, never test operations.
  const ids = identities.map(id => `'${id}'`).join(',');
  const fixtureSlugs = `'${slug}','${slug}-b','${slug}-race'`;
  sql(`begin; set local session_replication_role=replica;
    delete from public.tenant_admin_actions where tenant_id in (select id from public.tenants where slug in (${fixtureSlugs}));
    delete from public.tenant_website_content_overrides where tenant_id in (select id from public.tenants where slug in (${fixtureSlugs}));
    delete from public.community_account_profiles where user_id in (${ids});
    delete from public.community_accounts where user_id in (${ids});
    delete from public.tenant_staff_assignments where user_id in (${ids});
    delete from public.tenant_settings where tenant_id in (select id from public.tenants where slug in (${fixtureSlugs}));
    delete from public.tenants where slug in (${fixtureSlugs});
    delete from public.user_account_profiles where user_id in (${ids});
    delete from public.user_accounts where user_id in (${ids});
    delete from auth.users where id in (${ids}); commit;`);
}
