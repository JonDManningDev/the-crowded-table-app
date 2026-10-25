// Isolated local migration replay with a minimal Auth schema contract. Real Auth
// and HTTP behavior are covered by test db and direct_data_api.mjs respectively.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const container = 'supabase_db_the-crowded-table-app';
const database = `crowded_table_api_test_${randomUUID().replaceAll('-', '')}`;
assert.match(database, /^crowded_table_api_test_[0-9a-f]{32}$/);
const migrations = new URL('../migrations/', import.meta.url);
const files = readdirSync(migrations).filter(name => name.endsWith('.sql')).sort();
assert.equal(files.at(-1), '20261024000300_account_communication_preferences.sql', 'update this test when the migration set changes');
const owner = '30000000-0000-0000-0000-000000000001';
const admin = '30000000-0000-0000-0000-000000000002';
function sql(statement) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'],
    { input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
const asUser = (id, statement) => `set role authenticated; set request.jwt.claim.sub='${id}'; ${statement}`;
function init() {
  execFileSync('docker', ['exec', container, 'createdb', '-U', 'postgres', database]);
  sql(`create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
    create function auth.uid() returns uuid language sql stable as $fn$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $fn$;
    grant usage on schema auth to authenticated,anon;`);
}
function cleanup() {
  execFileSync('docker', ['exec', container, 'dropdb', '-U', 'postgres', '--if-exists', '--force', database]);
}
function apply(file) { sql(readFileSync(new URL(file, migrations), 'utf8')); }
try {
  init();
  for (const file of files) apply(file);
  assert.equal(sql(`select count(*) from pg_policies where schemaname='public' and cmd<>'SELECT';`), '10');
  cleanup();
  init();
  for (const file of files.filter(file => file < '20261024000200_direct_data_api.sql')) apply(file);
  sql(`insert into auth.users(id,email,email_confirmed_at) values ('${owner}','owner@example.test',now()),('${admin}','admin@example.test',now());`);
  const tenant = sql(asUser(owner, `select public.create_tenant('upgrade-fixture','Original tenant','HN','UTC');`));
  sql(asUser(admin, `select public.join_community('${tenant}'); select public.save_user_account_profile('Original name','Original bio'); select public.save_community_profile('${tenant}','Community name','Community bio'); select public.set_user_account_preferences(false,true);`));
  sql(asUser(owner, `select public.create_tenant_admin('${tenant}','${admin}'); select public.set_admin_permissions('${tenant}','${admin}',true,false); select public.set_website_content_override('${tenant}','community.hero.heading','Original copy'); select public.set_tenant_archived('${tenant}',true);`));
  apply('20261024000200_direct_data_api.sql');
  apply('20261024000300_account_communication_preferences.sql');
  assert.equal(sql(`select bool_and(allow_direct_messages) from public.user_accounts;`), 't');
  assert.equal(sql(`select can_modify_content from public.tenant_staff_assignments where role='owner';`), 't');
  assert.equal(sql(`select can_approve_users and not can_create_admin and not can_modify_content from public.tenant_staff_assignments where role='admin';`), 't');
  assert.equal(sql(`select display_name || '/' || bio from public.user_account_profiles where user_id='${admin}';`), 'Original name/Original bio');
  assert.equal(sql(`select display_name || '/' || bio from public.community_account_profiles where user_id='${admin}';`), 'Community name/Community bio');
  assert.equal(sql(`select not user_is_discoverable and enable_matchmaking from public.user_accounts where user_id='${admin}';`), 't');
  assert.equal(sql(`select text_value from public.tenant_website_content_overrides;`), 'Original copy');
  assert.equal(sql(`select operational_status from public.tenants;`), 'archived');
  assert.equal(sql(`select tgenabled from pg_trigger where tgrelid='public.tenant_staff_assignments'::regclass and tgname='a_invariants';`), 'O');
  sql(asUser(owner, `select public.set_admin_permissions('${tenant}','${admin}',p_can_modify_content=>true); select public.set_admin_permissions('${tenant}','${admin}',false,true);`));
  assert.equal(sql(`select not can_approve_users and can_create_admin and can_modify_content from public.tenant_staff_assignments where role='admin';`), 't');
  const freshTenant = sql(asUser(owner, `select public.create_tenant('after-upgrade','New tenant','HN','UTC');`));
  assert.equal(sql(`select can_modify_content from public.tenant_staff_assignments where tenant_id='${freshTenant}' and role='owner';`), 't');
  console.log('PASS clean migration replay and populated upgrade: owner backfill, preserved data/grants, legacy permission callers, new owner invariants');
} finally { cleanup(); }
