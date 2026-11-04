import { connectDatabase } from '../../server/src/database.ts';
import { withVerifiedActor } from '../../server/src/actor-transaction.ts';
import { createCommunity, communityCommand } from '../../server/src/communities/commands.ts';
// Real Supabase SDK/PostgREST and concurrent SQL checks. Local Docker only.
// Creates uniquely identified synthetic fixtures and removes only those fixtures.
import assert from 'node:assert/strict';
import { localStack } from './local-stack.mjs';
import { execFileSync } from 'node:child_process';
import { holdLocalTransaction } from './hold-local-transaction.mjs';
import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const container = 'supabase_db_the-crowded-table-app';
const config = localStack();
const url = new URL(config.API_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'local API required');
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
if (!process.env.DATABASE_URL) process.loadEnvFile(new URL('../../server/.env.local',import.meta.url));
const endpoint = new URL(process.env.DATABASE_URL);
assert.equal(endpoint.host,new URL(config.DB_URL).host);
assert.equal(endpoint.pathname,'/postgres');
const db = connectDatabase(endpoint.href);
const create = (actor, name) => withVerifiedActor(db,actor,randomUUID(),tx => createCommunity(tx,actor,{
  name: 'API fixture',slug: name,country:'HN',region:'',city:'',timezone:'UTC',profile:{displayName:'Owner',bio:null}}));
const command = (actor, body) => withVerifiedActor(db,actor,randomUUID(),tx => communityCommand(tx,actor,tenant,body));
const hold = statement => holdLocalTransaction(container, 'postgres', statement);

try {
  sql(`insert into auth.users(id,email,email_confirmed_at) values ${identities.map(id => `('${id}','${id}@example.test',${id === unverified ? 'null' : 'now()'})`).join(',')};`);
  tenant = (await create(owner,slug)).tenantId;
  secondTenant = (await create(other,slug+'-b')).tenantId;
  await command(owner,{kind:'auto-approval',enabled:true});
  for (const actor of [member,other]) await command(actor,{kind:'join',profile:{displayName:'Participant',bio:null}});
  const a = client(owner), b = client(member), c = client(other), u = client(unverified);

  await denied(b.from('user_accounts').select('allow_direct_messages'), '42501');
  await denied(b.from('user_accounts').update({ allow_direct_messages: false }).eq('user_id', member), '42501');
  for (const display_name of ['First name', 'Changed name']) {
    const row = await success(b.from('user_account_profiles').upsert({ display_name, bio: ' ' }, { onConflict: 'user_id' }).select('user_id,display_name,bio,created_by,updated_by').single());
    assert.deepEqual(row, { user_id: member, display_name, bio: null, created_by: member, updated_by: member });
  }
  await denied(b.from('user_account_profiles').update({ updated_by: owner }).eq('user_id', member), '42501');
  await denied(b.from('user_account_profiles').upsert({ user_id: owner, display_name: 'Spoofed' }), '42501');
  await denied(u.from('user_account_profiles').upsert({ display_name: 'Unverified' }), '42501');
  await denied(u.from('user_accounts').update({ enable_matchmaking: false }).eq('user_id', unverified).select('user_id').single(), '42501');

  for (const display_name of ['Community name', 'Community updated']) {
    const row = await success(b.from('community_account_profiles').update({ display_name, bio: '' }).eq('tenant_id',tenant).select('user_id,display_name,bio').single());
    assert.deepEqual(row, { user_id: member, display_name, bio: null });
  }
  await success(c.from('community_account_profiles').update({ display_name: 'Other member' }).eq('tenant_id',tenant).select('user_id').single());
  await success(b.from('community_account_preferences').update({ show_global_profile: true }).eq('tenant_id', tenant).select('tenant_id').single());
  await denied(b.from('community_account_preferences').update({ show_global_profile: true }).eq('tenant_id', secondTenant).select('tenant_id').single(), 'PGRST116');
  await denied(b.from('community_accounts').update({ standing: 'approved' }).eq('tenant_id', tenant), '42501');
  await denied(b.from('community_account_profiles').update({ tenant_id: secondTenant }).eq('tenant_id', tenant), '42501');

  // Hold both edits for one member. Another member can still update both rows.
  const releaseMember = await hold(asUser(member, `update public.community_account_profiles set bio='Held' where tenant_id='${tenant}'; update public.community_account_preferences set show_global_profile=false where tenant_id='${tenant}'`));
  try {
    await success(c.from('community_account_profiles').update({ bio: 'Concurrent' }).eq('tenant_id', tenant).select('user_id').single().abortSignal(AbortSignal.timeout(2000)));
    await success(c.from('community_account_preferences').update({ show_global_profile: true }).eq('tenant_id', tenant).select('tenant_id').single().abortSignal(AbortSignal.timeout(2000)));
  } finally { await releaseMember(); }
  // A profile edit also has no explicit lock on the tenant itself.
  const releaseTenant = await hold(`select id from public.tenants where id='${tenant}' for update`);
  try {
    await success(b.from('community_account_profiles').update({ bio: 'No tenant lock' }).eq('tenant_id', tenant).select('user_id').single().abortSignal(AbortSignal.timeout(2000)));
  } finally { await releaseTenant(); }

  await command(owner,{kind:'grant',target:member});
  await command(owner,{kind:'permissions',target:member,permissions:{can_modify_content:true}});
  const copy = { tenant_id: tenant, content_key: 'community.hero.heading', text_value: 'First content' };
  await success(b.from('tenant_website_content_overrides').upsert(copy, { onConflict: 'tenant_id,content_key' }).select('content_key').single());
  copy.text_value = 'Changed content';
  await success(b.from('tenant_website_content_overrides').upsert(copy, { onConflict: 'tenant_id,content_key' }).select('content_key').single());
  await denied(c.from('tenant_website_content_overrides').update({ text_value: 'Unauthorized' }).eq('tenant_id', tenant).select('content_key').single(), 'PGRST116');
  await success(b.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).eq('content_key', copy.content_key).select('content_key').single());
  await denied(b.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).eq('content_key', 'unknown').select('content_key').single(), 'PGRST116');
  await success(b.from('tenant_website_content_overrides').upsert(copy).select('content_key').single());
  await denied(b.rpc('set_admin_permissions', { p_tenant_id: tenant, p_user_id: member, p_can_modify_content: true }), 'PGRST202');
  await denied(b.from('tenants').update({ name: 'Unauthorized' }).eq('id', tenant).select('id').single(), 'PGRST116');
  await success(a.from('tenants').update({ name: ' Renamed ', city: ' ' }).eq('id', tenant).select('id').single());
  for (const rpc of ['create_tenant','join_community','set_tenant_archived','approve_community_account','set_admin_permissions','create_tenant_admin','set_auto_approve_users']) {
    await denied(a.rpc(rpc), 'PGRST202');
  }
  await denied(a.from('tenants').update({operational_status:'archived'}).eq('id',tenant),'42501');
  await denied(a.from('tenant_staff_assignments').update({can_grant_staff:false}).eq('tenant_id',tenant),'42501');
  await denied(a.from('community_accounts').insert({tenant_id:tenant,user_id:unverified,standing:'approved'}),'42501');
  await denied(a.from('tenant_admin_candidates').select('*'),'PGRST205');
  await command(owner,{kind:'archive',archived:true});
  assert.deepEqual(await success(b.from('community_accounts').select('*').eq('tenant_id', tenant)), []);
  assert.deepEqual(await success(b.from('community_account_profiles').select('*').eq('tenant_id', tenant).eq('user_id', member)), []);
  assert.deepEqual(await success(c.from('community_account_profiles').select('*').eq('tenant_id', tenant)), []);
  assert.deepEqual(await success(b.from('community_account_preferences').select('show_global_profile').eq('tenant_id',tenant)),[]);
  const card = await success(b.from('my_community_summaries').select('id,operational_status').eq('id', tenant).single());
  assert.equal(card.operational_status, 'archived');
  await denied(b.from('community_account_profiles').upsert({ tenant_id: tenant, display_name: 'Archived' }, { onConflict: 'tenant_id,user_id' }), '42501');
  await denied(b.from('community_account_preferences').update({ show_global_profile: false }).eq('tenant_id', tenant).select('tenant_id').single(), 'PGRST116');
  await denied(b.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).select('content_key').single(), 'PGRST116');
  await success(a.from('tenant_website_content_overrides').update({ text_value: 'Archived owner' }).eq('tenant_id', tenant).select('content_key').single());
  await success(b.from('user_account_profiles').update({ bio: 'Global still editable' }).eq('user_id', member).select('user_id').single());
  sql(`update auth.users set banned_until=now()+interval '1 day' where id='${member}';`);
  await denied(b.from('user_accounts').update({ enable_matchmaking: false }).eq('user_id', member).select('user_id').single(), '42501');
  await denied(b.from('user_account_profiles').upsert({ display_name: 'Banned' }), '42501');
  const creations = await Promise.allSettled([owner,other].map(actor => create(actor,slug+'-race')));
  assert.equal(creations.filter(r => r.status==='fulfilled').length,1);
  assert.equal(creations.filter(r => r.status==='rejected' && r.reason.code==='23505').length,1);
  console.log(`PASS ${checks} real PostgREST checks, independent member edits, retired commands and concurrent slug claims`);
} finally {
  await db.destroy();
  // Only our random identities/tenants, only the hardcoded local Docker DB.
  // Bypass deletion-protection/audit triggers for fixture cleanup, never test operations.
  const ids = identities.map(id => `'${id}'`).join(',');
  const fixtureSlugs = `'${slug}','${slug}-b','${slug}-race'`;
  sql(`begin; set local session_replication_role=replica;
    delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id in (select id from public.tenants where slug in (${fixtureSlugs})));
    delete from app_private.community_account_requests where user_id in (${ids});
    delete from public.community_account_permissions where user_id in (${ids});
    delete from public.community_account_preferences where user_id in (${ids});
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
