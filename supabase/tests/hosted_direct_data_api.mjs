// Explicitly authorized hosted testing only. Never accepts another project.
// Uses real Auth sessions and random fixtures; secrets stay in process memory.
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ref = 'fsnipgsrlclbnfepcbvz';
assert.ok(process.argv.includes('--allow-hosted-testing'), 'Explicit hosted test opt-in required');
assert.equal(readFileSync('supabase/.temp/project-ref', 'utf8').trim(), ref);
const temporary = mkdtempSync(join(tmpdir(), 'crowded-table-hosted-'));
const identities = [];
const slug = `data-api-${randomUUID()}`;
let checks = 0;
function cli(args) {
  // Arguments are fixed commands or our generated SQL file path, never secrets.
  const output = execSync(`npx --yes supabase ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output);
}
function sql(statement) {
  const path = join(temporary, 'query.sql');
  writeFileSync(path, statement);
  return cli(`db query --linked --file "${path}"`).rows;
}
async function success(query) {
  const result = await query;
  assert.equal(result.error, null, JSON.stringify(result.error));
  checks++;
  return result.data;
}
async function denied(query, code) {
  const result = await query;
  assert.ok(result.error, 'Expected denied/empty request');
  if (code) assert.equal(result.error.code, code);
  checks++;
}
const keys = cli(`projects api-keys --project-ref ${ref} --output json`);
const url = `https://${ref}.supabase.co`;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, keys.find(k => k.name === 'service_role').api_key, options);
async function actor() {
  const email = `${randomUUID()}@example.test`;
  const password = `${randomUUID()}Aa1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null, created.error?.message);
  const id = created.data.user.id;
  identities.push(id);
  const client = createClient(url, keys.find(k => k.name === 'anon').api_key, options);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  assert.equal(signedIn.error, null, signedIn.error?.message);
  return { id, client };
}

try {
  const versions = sql('select version from supabase_migrations.schema_migrations order by version');
  assert.ok(versions.some(row => row.version === '20261024000300'));
  // Confirm cleanup is possible before any persistent fixture creation.
  sql('begin; set local session_replication_role=replica; rollback; select true as cleanup_supported');
  const owner = await actor(), member = await actor(), other = await actor(), unverified = await actor();
  const a = owner.client, b = member.client, c = other.client, u = unverified.client;
  // Keep a real session but make its account unverified to exercise database checks.
  sql(`update auth.users set email_confirmed_at=null where id='${unverified.id}'; select true as unverified_fixture`);
  const tenant = await success(a.rpc('create_tenant', { p_slug: slug, p_name: 'Hosted API fixture', p_country_code: 'HN', p_timezone: 'UTC' }));
  const second = await success(c.rpc('create_tenant', { p_slug: `${slug}-b`, p_name: 'Other fixture', p_country_code: 'HN', p_timezone: 'UTC' }));
  await success(b.rpc('join_community', { p_tenant_id: tenant }));
  await success(c.rpc('join_community', { p_tenant_id: tenant }));
  assert.equal((await success(a.from('tenant_staff_assignments').select('can_modify_content').eq('tenant_id', tenant).single())).can_modify_content, true);
  for (const display_name of [' First name ', ' Changed name ']) {
    const row = await success(b.from('user_account_profiles').upsert({ display_name, bio: ' ' }, { onConflict: 'user_id' }).select('user_id,display_name,bio,created_by,updated_by').single());
    assert.deepEqual(row, { user_id: member.id, display_name: display_name.trim(), bio: null, created_by: member.id, updated_by: member.id });
  }
  const preferenceFields = 'user_is_discoverable,enable_matchmaking,allow_direct_messages';
  assert.deepEqual(await success(b.from('user_accounts').select(preferenceFields).eq('user_id', member.id).single()), {
    user_is_discoverable: true, enable_matchmaking: true, allow_direct_messages: true,
  });
  // Use the frontend's complete save payload for all independent combinations.
  for (const user_is_discoverable of [false, true]) {
    for (const enable_matchmaking of [false, true]) {
      for (const allow_direct_messages of [false, true]) {
        const preferences = { user_is_discoverable, enable_matchmaking, allow_direct_messages };
        await success(b.from('user_accounts').update(preferences).eq('user_id', member.id).select('user_id').single());
        assert.deepEqual(await success(b.from('user_accounts').select(preferenceFields).eq('user_id', member.id).single()), preferences);
      }
    }
  }
  assert.equal(sql(`select updated_by from public.user_accounts where user_id='${member.id}'`)[0].updated_by, member.id);
  await denied(b.from('user_accounts').update({ allow_direct_messages: null }).eq('user_id', member.id), '23502');
  await denied(b.from('user_accounts').update({ allow_direct_messages: false }).eq('user_id', owner.id).select('user_id').single(), 'PGRST116');
  await denied(u.from('user_accounts').update({ allow_direct_messages: false }).eq('user_id', unverified.id).select('user_id').single(), 'PGRST116');
  await denied(b.from('user_accounts').update({ updated_by: owner.id }).eq('user_id', member.id), '42501');
  await success(b.from('user_accounts').update({ user_is_discoverable: false, enable_matchmaking: false }).eq('user_id', member.id).select('user_id').single());
  await success(b.from('user_accounts').update({ enable_matchmaking: true }).eq('user_id', member.id).select('user_id').single());
  assert.deepEqual(await success(b.from('user_accounts').select('user_is_discoverable,enable_matchmaking').eq('user_id', member.id).single()), { user_is_discoverable: false, enable_matchmaking: true });
  await denied(b.from('user_accounts').update({ user_is_discoverable: true }).eq('user_id', owner.id).select('user_id').single(), 'PGRST116');
  await denied(b.from('user_account_profiles').upsert({ user_id: owner.id, display_name: 'Spoof' }), '42501');
  await denied(b.from('user_account_profiles').update({ updated_by: owner.id }).eq('user_id', member.id), '42501');
  await denied(u.from('user_account_profiles').upsert({ display_name: 'Unverified' }), '42501');
  await denied(u.from('user_accounts').update({ enable_matchmaking: false }).eq('user_id', unverified.id).select('user_id').single(), 'PGRST116');
  for (const display_name of [' Community first ', ' Community updated ']) {
    const row = await success(b.from('community_account_profiles').upsert({ tenant_id: tenant, display_name, bio: '' }, { onConflict: 'tenant_id,user_id' }).select('user_id,display_name,bio').single());
    assert.deepEqual(row, { user_id: member.id, display_name: display_name.trim(), bio: null });
  }
  await success(b.from('community_accounts').update({ show_global_profile: true }).eq('tenant_id', tenant).select('tenant_id,show_global_profile').single());
  assert.equal((await success(b.from('community_accounts').select('show_global_profile').eq('tenant_id', tenant).single())).show_global_profile, true);
  await denied(b.from('community_accounts').update({ show_global_profile: true }).eq('tenant_id', second).select('tenant_id').single(), 'PGRST116');
  await denied(b.from('community_accounts').update({ standing: 'approved' }).eq('tenant_id', tenant), '42501');
  await denied(b.from('community_account_profiles').update({ tenant_id: second }).eq('tenant_id', tenant), '23514');
  await success(a.rpc('create_tenant_admin', { p_tenant_id: tenant, p_user_id: member.id }));
  assert.equal((await success(b.from('tenant_staff_assignments').select('can_modify_content').eq('tenant_id', tenant).single())).can_modify_content, false);
  const copy = { tenant_id: tenant, content_key: 'community.hero.heading', text_value: 'First content' };
  await denied(b.from('tenant_website_content_overrides').upsert(copy).select('content_key').single(), '42501');
  await denied(b.from('tenant_staff_assignments').update({ can_modify_content: true }).eq('tenant_id', tenant), '42501');
  await success(a.rpc('set_admin_permissions', { p_tenant_id: tenant, p_user_id: member.id, p_can_modify_content: true }));
  for (const text_value of ['First content', 'Changed content']) {
    const row = await success(b.from('tenant_website_content_overrides').upsert({ ...copy, text_value }, { onConflict: 'tenant_id,content_key' }).select('text_value,created_by,updated_by').single());
    assert.deepEqual(row, { text_value, created_by: member.id, updated_by: member.id });
  }
  await denied(b.from('tenant_website_content_overrides').upsert({ ...copy, tenant_id: second }), '42501');
  await denied(c.from('tenant_website_content_overrides').update({ text_value: 'Unauthorized' }).eq('tenant_id', tenant).select('content_key').single(), 'PGRST116');
  await success(b.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).eq('content_key', copy.content_key).select('content_key').single());
  await success(b.from('tenant_website_content_overrides').upsert(copy).select('content_key').single());
  await denied(b.rpc('set_admin_permissions', { p_tenant_id: tenant, p_user_id: member.id, p_can_modify_content: true }), '42501');
  await denied(b.from('tenants').update({ name: 'Unauthorized' }).eq('id', tenant).select('id').single(), 'PGRST116');
  await success(a.rpc('set_admin_permissions', { p_tenant_id: tenant, p_user_id: member.id, p_can_approve_users: true, p_can_create_admin: true }));
  assert.equal((await success(b.from('tenant_staff_assignments').select('can_modify_content').eq('tenant_id', tenant).single())).can_modify_content, true);
  assert.equal((await success(b.from('tenant_admin_candidates').select('*').eq('tenant_id', tenant))).length, 2);
  assert.equal((await success(b.from('tenant_pending_community_accounts').select('*').eq('tenant_id', tenant))).length, 2);
  assert.equal((await success(c.from('tenant_admin_candidates').select('*').eq('tenant_id', tenant))).length, 0);
  await denied(b.from('tenant_admin_candidates').select('bio'), '42703');
  await success(a.rpc('set_tenant_archived', { p_tenant_id: tenant, p_archived: true }));
  await denied(b.from('community_account_profiles').upsert({ tenant_id: tenant, display_name: 'Archived' }, { onConflict: 'tenant_id,user_id' }), '42501');
  await denied(b.from('community_accounts').update({ show_global_profile: false }).eq('tenant_id', tenant).select('tenant_id').single(), 'PGRST116');
  await denied(b.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).select('content_key').single(), 'PGRST116');
  await success(a.from('tenant_website_content_overrides').update({ text_value: 'Archived owner' }).eq('tenant_id', tenant).select('content_key').single());
  await success(a.from('tenant_website_content_overrides').delete().eq('tenant_id', tenant).select('content_key').single());
  await success(b.from('user_account_profiles').update({ bio: 'Global still editable' }).eq('user_id', member.id).select('user_id').single());
  console.log(`PASS ${checks} hosted PostgREST checks`);
} finally {
  if (identities.length) {
    const ids = identities.map(id => `'${id}'`).join(',');
    const slugs = `'${slug}','${slug}-b'`;
    // Restrict cleanup to this invocation's random IDs. No existing user data.
    sql(`begin; set local session_replication_role=replica;
      delete from public.tenant_admin_actions where tenant_id in (select id from public.tenants where slug in (${slugs}));
      delete from public.tenant_website_content_overrides where tenant_id in (select id from public.tenants where slug in (${slugs}));
      delete from public.community_account_profiles where user_id in (${ids});
      delete from public.community_accounts where user_id in (${ids});
      delete from public.tenant_staff_assignments where user_id in (${ids});
      delete from public.tenant_settings where tenant_id in (select id from public.tenants where slug in (${slugs}));
      delete from public.tenants where slug in (${slugs});
      delete from public.user_account_profiles where user_id in (${ids});
      delete from public.user_accounts where user_id in (${ids}); commit; select true as fixtures_removed;`);
    for (const id of identities) {
      const removed = await admin.auth.admin.deleteUser(id);
      assert.equal(removed.error, null, removed.error?.message);
    }
    const remaining = sql(`select (select count(*) from auth.users where id in (${ids})) as users, (select count(*) from public.tenants where slug in (${slugs})) as tenants`);
    assert.deepEqual(remaining, [{ users: 0, tenants: 0 }]);
    console.log('PASS hosted fixture cleanup (zero test users/tenants remain)');
  }
  rmSync(temporary, { recursive: true, force: true });
}
