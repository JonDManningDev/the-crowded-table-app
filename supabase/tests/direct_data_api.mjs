import { connectDatabase } from '../../server/src/database.ts';
import { withEligibleActorTransaction } from '../../server/src/actor-transaction.ts';
import { configurationSettings, createCommunity, communityCommand } from '../../server/src/communities/service.ts';
// Real Supabase SDK/PostgREST and concurrent SQL checks. Local Docker only.
// Creates uniquely identified synthetic fixtures and removes only those fixtures.
import assert from 'node:assert/strict';
import { localStack } from './local-stack.mjs';
import { execFileSync } from 'node:child_process';

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
const create = async (actor, name) => {
  const result = await withEligibleActorTransaction(db,{actorId:actor,requestId:randomUUID()},tx => createCommunity(tx,actor,{
    name: 'API fixture',slug: name,country:'HN',region:'',city:'',timezone:'UTC',profile:{displayName:'Owner',bio:null}}));
  assert.equal(result.eligible,true);
  return result.value;
};
const command = async (actor, body) => {
  const result = await withEligibleActorTransaction(db,{actorId:actor,requestId:randomUUID()},tx => communityCommand(tx,actor,tenant,body));
  assert.equal(result.eligible,true);
  return result.value;
};

try {
  sql(`insert into auth.users(id,email,email_confirmed_at) values ${identities.map(id => `('${id}','${id}@example.test',${id === unverified ? 'null' : 'now()'})`).join(',')};`);
  tenant = (await create(owner,slug)).tenantId;
  secondTenant = (await create(other,slug+'-b')).tenantId;
  const settings = await withEligibleActorTransaction(db,{actorId:owner,requestId:randomUUID()},tx=>configurationSettings(tx,owner,tenant,{auto_approve_users:true}));
  assert.equal(settings.eligible,true);
  for (const actor of [member,other]) await command(actor,{kind:'join',profile:{displayName:'Participant',bio:null}});
  const a = client(owner), b = client(member), c = client(other), u = client(unverified);

  await denied(b.from('user_accounts').select('allow_direct_messages'), '42501');
  await denied(b.from('user_accounts').update({ allow_direct_messages: false }).eq('user_id', member), '42501');
  // Migrated self-service tables are closed even to their original holder.
  for (const table of ['user_account_profiles','community_account_profiles','community_account_preferences']) {
    await denied(b.from(table).select('*'), '42501');
    await denied(b.from(table).update(table.endsWith('preferences') ? {show_global_profile:true} : {display_name:'Bypass'}).eq(table==='user_account_profiles'?'user_id':'tenant_id',table==='user_account_profiles'?member:tenant), '42501');
  }
  await denied(b.from('user_account_profiles').upsert({display_name:'Bypass'}), '42501');
  await denied(b.from('my_community_summaries').select('*'), 'PGRST205');
  await denied(b.from('community_accounts').update({standing:'approved'}).eq('tenant_id',tenant), '42501');
  for (const actor of [a,b]) {
    for (const table of ['tenants','tenant_settings','tenant_website_content_overrides','tenant_staff_assignments','community_account_permissions']) {
      await denied(actor.from(table).select('*'),'42501');
    }
    await denied(actor.from('tenants').update({name:'Bypass'}).eq('id',tenant),'42501');
    await denied(actor.from('tenant_settings').update({auto_approve_users:true}).eq('tenant_id',tenant),'42501');
    await denied(actor.from('tenant_website_content_overrides').upsert({tenant_id:tenant,content_key:'community.hero.heading',text_value:'Bypass'}),'42501');
    await denied(actor.from('tenant_website_content_overrides').delete().eq('tenant_id',tenant),'42501');
    for (const rpc of ['lookup_tenant','create_tenant','join_community','set_tenant_archived','approve_community_account','set_admin_permissions','create_tenant_admin','set_auto_approve_users']) await denied(actor.rpc(rpc),'PGRST202');
  }
  await denied(a.from('community_account_permissions').update({can_post_public_events:true}).eq('tenant_id',tenant),'42501');
  await denied(a.from('tenant_staff_assignments').update({can_grant_staff:false}).eq('tenant_id',tenant),'42501');
  await denied(a.from('community_accounts').insert({tenant_id:tenant,user_id:unverified,standing:'approved'}),'42501');
  await denied(a.from('tenant_admin_candidates').select('*'),'PGRST205');
  await command(owner,{kind:'archive',archived:true});
  await denied(b.from('community_accounts').select('*').eq('tenant_id',tenant),'42501');
  sql(`update auth.users set banned_until=now()+interval '1 day' where id='${member}';`);
  await denied(b.from('user_account_profiles').upsert({display_name:'Banned'}),'42501');
  const creations = await Promise.allSettled([owner,other].map(actor => create(actor,slug+'-race')));
  assert.equal(creations.filter(r => r.status==='fulfilled').length,1);
  assert.equal(creations.filter(r => r.status==='rejected' && r.reason.code==='23505').length,1);
  console.log(`PASS ${checks} real PostgREST checks, retired self-service/configuration/command paths and concurrent slug claims`);
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
