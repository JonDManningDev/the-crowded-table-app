// Isolated local migration replay with a minimal Auth schema contract. Real Auth
// and HTTP behavior are covered by test db and direct_data_api.mjs respectively.
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { holdLocalTransaction } from './hold-local-transaction.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const container = 'supabase_db_the-crowded-table-app';
const database = `crowded_table_api_test_${randomUUID().replaceAll('-', '')}`;
assert.match(database, /^crowded_table_api_test_[0-9a-f]{32}$/);
const migrations = new URL('../migrations/', import.meta.url);
const files = readdirSync(migrations).filter(name => name.endsWith('.sql')).sort();
const cutover = '20261103000600_community_write_cutover.sql';
const legacy = files.filter(file => file < cutover);
const owner = '30000000-0000-0000-0000-000000000001';
const admin = '30000000-0000-0000-0000-000000000002';
function sql(statement) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'],
    { input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
const asUser = (id, statement) => `set role authenticated; set request.jwt.claim.sub='${id}'; ${statement}`;
function init() {
  execFileSync('docker', ['exec', container, 'createdb', '-U', 'postgres', database]);
  sql(`create schema if not exists extensions; grant usage on schema extensions to public; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
    create function auth.uid() returns uuid language sql stable as $fn$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $fn$;
    grant usage on schema auth to authenticated,anon;`);
}
function cleanup() {
  execFileSync('docker', ['exec', container, 'dropdb', '-U', 'postgres', '--if-exists', '--force', database]);
}
const preflight = readFileSync(new URL('../preflight/community_foundation.sql', import.meta.url), 'utf8');
function runCommunityCutover(extraSql = '') {
  const migration = readFileSync(new URL(cutover, migrations), 'utf8');
  assert.match(migration, /commit;\s*$/);
  sql(migration.replace(/commit;\s*$/, extraSql + '\ncommit;'));
}
function checkCommunityUpgradeInputs(tenant) {
  const pending = randomUUID(), suspended = randomUUID(), removed = randomUUID();
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${pending}','pending@example.test',now()),('${suspended}','suspended@example.test',now()),('${removed}','removed@example.test',now());
    insert into public.community_accounts (tenant_id,user_id,standing,show_global_profile) values
    ('${tenant}','${pending}','pending',false),('${tenant}','${suspended}','suspended',true),('${tenant}','${removed}','removed',true);
    insert into public.user_account_profiles(user_id,display_name) values ('${pending}','Only global'),('${removed}','Former member');`);
  // The old creator did not participate and the delegated staff user is still pending.
  const before = JSON.parse(sql(preflight));
  assert.equal(before.ready, false);
  assert.deepEqual(before.blockers, { owners_requiring_repair: 1, ineligible_active_staff: 1, missing_profile_sources: 1, unknown_standings: 0 });
  assert.throws(() => runCommunityCutover(), /community cutover preflight failed/);
  assert.equal(sql("select to_regclass('public.community_account_preferences') is null"), 't');
  // Simulate explicitly repaired inputs in this disposable database only.
  sql(`insert into public.community_accounts(tenant_id,user_id,standing) values ('${tenant}','${owner}','approved');
    insert into public.user_account_profiles(user_id,display_name) values ('${suspended}','Suspended');
    update public.community_accounts set standing='approved' where tenant_id='${tenant}' and user_id='${admin}';`);
  const after = JSON.parse(sql(preflight));
  assert.equal(after.ready, true);
  assert.deepEqual(after.backfills, { accounts: 5, copy_global_profile_once: 4, preserve_curated_profile: 1,
    adopt_pending_request: 1, approximate_first_approval: 4, mark_restricted: 2, convert_to_inactive: 1, clear_inactive_sharing: 1 });
}
function verifyCommunityBackfill(tenant) {
  const oldAudit = "select id,tenant_id,action,target_user_id,content_key,created_at,created_by from public.tenant_admin_actions";
  const auditSnapshot = sql(`select jsonb_agg(to_jsonb(a) order by id) from (${oldAudit}) a`);
  const oldAccounts = sql("select jsonb_agg(to_jsonb(a) order by user_id) from public.community_accounts a");
  // Inject a failure after DDL and data conversion, then retry the entire unit.
  assert.throws(() => runCommunityCutover("select 1/0;"), /division by zero/);
  assert.equal(sql("select jsonb_agg(to_jsonb(a) order by user_id) from public.community_accounts a"), oldAccounts);
  assert.equal(sql("select to_regclass('app_private.community_account_requests') is null"), 't');
  runCommunityCutover();
  assert.equal(sql(`select bool_and(c.relrowsecurity and not has_any_column_privilege(r.name,c.oid,'INSERT,REFERENCES')
    and not has_table_privilege(r.name,c.oid,'DELETE,TRUNCATE,TRIGGER'))
    from pg_class c cross join (values ('anon'),('authenticated'),('service_role')) r(name)
    where c.oid in ('public.community_account_preferences'::regclass,'public.community_account_permissions'::regclass,
      'app_private.community_account_requests'::regclass,'app_private.tenant_admin_action_categories'::regclass)`), 't');
  const previous = JSON.parse(oldAccounts);
  const evidence = JSON.parse(sql(`select jsonb_agg(to_jsonb(a) order by user_id) from (
    select c.*, p.show_global_profile, p.allow_direct_messages, p.allow_private_invitations,
      m.can_post_public_events, profile.display_name, profile.bio
    from public.community_accounts c join public.community_account_preferences p using (tenant_id,user_id)
    join public.community_account_permissions m using (tenant_id,user_id)
    join public.community_account_profiles profile using (tenant_id,user_id)) a`));
  assert.equal(evidence.length, previous.length);
  for (const [i, row] of evidence.entries()) {
    const old = previous[i];
    assert.equal(row.user_id, old.user_id);
    assert.equal(row.standing, old.standing === 'removed' ? 'inactive' : old.standing);
    assert.equal(row.has_disciplinary_restriction, ['suspended','removed'].includes(old.standing));
    assert.equal(row.first_approved_at, old.standing === 'pending' ? null : old.created_at);
    for (const field of ['tenant_id','created_at','updated_at','created_by','updated_by']) assert.equal(row[field], old[field]);
    assert.equal(row.show_global_profile, old.standing !== 'removed' && old.show_global_profile);
    assert.equal(row.allow_direct_messages && row.allow_private_invitations, true);
    assert.equal(row.can_post_public_events, false);
    if (row.user_id === admin) assert.deepEqual([row.display_name,row.bio], ['Community name','Community bio']);
  }
  assert.equal(sql(`select jsonb_agg(to_jsonb(a) order by id) from (${oldAudit}
    where action <> 'community_join_request_adopted') a`), auditSnapshot);
  assert.equal(sql(`select count(*) from app_private.community_account_requests r
    join public.community_accounts c using (tenant_id,user_id)
    join public.tenant_admin_actions a on a.tenant_id=r.tenant_id and a.target_user_id=r.user_id
      and a.details->>'request_id'=r.id::text and a.action='community_join_request_adopted'
    where c.standing='pending' and r.kind='join' and r.requested_at=c.created_at and r.requested_by=c.user_id
      and a.created_by is null and a.details->>'approximate'='true'
      and a.details->>'requested_at_source'='community_accounts.created_at'`), '1');
  assert.equal(sql(`select count(*) from public.community_account_profiles p join public.user_account_profiles g using (user_id)
    where p.user_id <> '${admin}' and p.display_name=g.display_name and p.bio is not distinct from g.bio and p.created_by is null`), '4');
  sql(`update public.user_account_profiles set display_name='Changed later' where user_id='${owner}'`);
  assert.equal(sql(`select display_name from public.community_account_profiles where tenant_id='${tenant}' and user_id='${owner}'`), 'Owner');
  assert.throws(() => sql(`delete from public.community_account_permissions where tenant_id='${tenant}' and user_id='${admin}'`), /foreign key constraint/);
  assert.throws(() => sql("set role authenticated; select * from public.community_account_preferences"), /permission denied/);
  assert.equal(sql("select has_table_privilege('ct_api','app_private.community_account_requests','SELECT') and (select relrowsecurity from pg_class where oid='app_private.community_account_requests'::regclass)"), 't');
  const flags = ['can_discipline_users','can_discipline_staff','can_manage_community_activities',
    'can_manage_official_activities','can_manage_community_permissions','can_see_private_events',
    'can_manage_settings','can_moderate_all_chats','can_audit_community_accounts','can_audit_staff_accounts'];
  assert.equal(sql(`select bool_and(${flags.join(' and ')} and can_approve_users and can_grant_staff
    and can_modify_content and required_account_standing='approved') from public.tenant_staff_assignments where role='owner'`), 't');
  assert.equal(sql(`select not (${flags.join(' or ')}) and not can_approve_users and can_grant_staff and can_modify_content
    from public.tenant_staff_assignments where role='admin'`), 't');
  assert.equal(sql(`select not (pause_community_events or allow_public_chat_visibility or allow_public_activity_visibility
    or allow_public_directory_visibility) from public.tenant_settings`), 't');
  assert.equal(sql(`select bool_and(case action
    when 'tenant_staff_assignments.insert' then cats=array['community_account','staff_account']
    when 'tenant_staff_assignments.update' then cats=array['staff_account']
    when 'community_accounts.insert' then cats=array['community_account']
    when 'community_accounts.update' then cats=array['community_account']
    when 'community_join_request_adopted' then cats=array['community_account']
    else cardinality(cats)=0 end)
    from (select a.action,array(select category from app_private.tenant_admin_action_categories where action_id=a.id order by category) cats
      from public.tenant_admin_actions a) history`), 't');
  assert.throws(() => sql("delete from app_private.tenant_admin_action_categories"), /audit_is_append_only/);
  assert.throws(() => sql("update public.tenant_admin_actions set reason='changed'"), /audit_is_append_only/);
  assert.throws(() => sql(`update public.community_accounts set first_approved_at=now() where user_id='${admin}'`), /first_approval_immutable/);
  assert.throws(() => sql(`update public.community_accounts set standing='inactive' where user_id='${owner}'`), /foreign key constraint/);
  assert.throws(() => sql(`update public.tenant_staff_assignments set status='paused' where role='owner'`), /owner_assignment_immutable/);
  sql(`update public.community_accounts set standing='inactive' where standing='suspended';`);
  assert.equal(sql(`select bool_and(not p.show_global_profile) from public.community_accounts c
    join public.community_account_preferences p using (tenant_id,user_id) where c.standing='inactive'`), 't');
  assert.throws(() => sql(`update public.community_account_preferences p set show_global_profile=true
    from public.community_accounts c where (c.tenant_id,c.user_id)=(p.tenant_id,p.user_id) and c.standing='inactive'`), /inactive_community_sharing/);
  console.log('PASS coordinated account/staff backfills, preflight rejection, late rollback, audit provenance and categories, private preferences and active owner integrity');
}
async function verifySharingRace() {
  const target = sql("select user_id from public.community_accounts where standing='pending'");
  assert.match(target, /^[a-f0-9-]{36}$/);
  const optIn = `update public.community_account_preferences set show_global_profile=true where user_id='${target}'`;
  // Rejection-only integrity: legitimate lifecycle writers coordinate account
  // then preference and explicitly clear consent in the same transaction.
  const deactivate = `select 1 from public.community_accounts where user_id='${target}' for update;
    update public.community_account_preferences set show_global_profile=false where user_id='${target}';
    update public.community_accounts set standing='inactive' where user_id='${target}'`;
  for (const [first, second] of [[optIn, deactivate],[deactivate, optIn]]) {
    const release = await holdLocalTransaction(container, database, first);
    const waiter = promisify(execFile)('docker', ['exec', container, 'psql', '-XqAt', '-U', 'postgres',
      '-d', database, '-v', 'ON_ERROR_STOP=1', '-c', `set application_name='sharing_waiter'; ${second}`],
      { timeout: 60000 });
    waiter.catch(() => {}); // The denied order can reject while its holder is exiting.
    try {
      const deadline = Date.now() + 30000;
      let blocked = false;
      while (!blocked && Date.now() < deadline) {
        blocked = sql(`select exists(select from pg_stat_activity where datname=current_database()
          and application_name='sharing_waiter' and cardinality(pg_blocking_pids(pid))>0)`) === 't';
      }
      assert.ok(blocked, 'competing write must wait for the row lock');
    } finally { await release(true); }
    if (second === optIn) await assert.rejects(waiter, /inactive_community_sharing/);
    else await waiter;
    assert.equal(sql(`select c.standing='inactive' and not p.show_global_profile from public.community_accounts c
      join public.community_account_preferences p using (tenant_id,user_id) where c.user_id='${target}'`), 't');
    if (first === optIn) sql(`update public.community_accounts set standing='pending' where user_id='${target}'`);
  }
}
function apply(...names) {
  sql(names.map(file => readFileSync(new URL(file, migrations), 'utf8')).join('\n'));
}
function applicationSnapshot() {
  const relations = JSON.parse(sql(`select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','app_private') and c.relkind in ('r','p')`));
  return Object.fromEntries(relations.map(relation => [relation,
    sql(`select coalesce(jsonb_agg(row order by row::text),'[]'::jsonb) from (select to_jsonb(t) as row from ${relation} t) snapshot`)]));
}
try {
  init();
  apply(...legacy);
  const fixtures = new URL('../upgrade-fixtures/pre-community-api/', import.meta.url);
  for (const name of readdirSync(fixtures).filter(file => file.endsWith('.test.sql'))) {
    const results = sql(readFileSync(new URL(name, fixtures), 'utf8'));
    assert.doesNotMatch(results, /^not ok /m, name);
  }
  assert.equal(sql(`select count(*) from pg_policies where schemaname='public' and cmd<>'SELECT';`), '10');
  runCommunityCutover();
  apply(...files.filter(file => file > cutover));
  assert.equal(sql('select count(*) from public.community_account_preferences'), '0');
  cleanup();
  init();
  apply(...files.filter(file => file < '20261024000200_direct_data_api.sql'));
  sql(`insert into auth.users(id,email,email_confirmed_at) values ('${owner}','owner@example.test',now()),('${admin}','admin@example.test',now());`);
  const tenant = sql(asUser(owner, `select public.create_tenant('upgrade-fixture','Original tenant','HN','UTC');`));
  sql(asUser(admin, `select public.join_community('${tenant}'); select public.save_user_account_profile('Original name','Original bio'); select public.save_community_profile('${tenant}','Community name','Community bio'); select public.set_user_account_preferences(false,true);`));
  sql(asUser(owner, `select public.create_tenant_admin('${tenant}','${admin}'); select public.set_admin_permissions('${tenant}','${admin}',true,false); select public.set_website_content_override('${tenant}','community.hero.heading','Original copy'); select public.set_tenant_archived('${tenant}',true);`));
  sql(`insert into public.user_account_profiles(user_id,display_name,bio) values ('${owner}','Owner','  Original bio  ')`);
  apply(...legacy.filter(file => file >= '20261024000200_direct_data_api.sql'));
  assert.equal(sql(`select has_column_privilege('authenticated','public.user_accounts','enable_matchmaking','UPDATE');`), 'f');
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
  assert.equal(sql(asUser(owner, `begin;
    select public.create_tenant('after-upgrade','New tenant','HN','UTC') as id \\gset
    select can_modify_content from public.tenant_staff_assignments where tenant_id=:'id' and role='owner';
    rollback;`)), 't');
  checkCommunityUpgradeInputs(tenant);
  verifyCommunityBackfill(tenant);
  const profileSnapshot = sql(`select jsonb_agg(to_jsonb(p) order by tenant_id,user_id) from public.community_account_profiles p`);
  apply(...files.filter(file => file > cutover && file < '20261110000100'));
  const policySnapshot = applicationSnapshot();
  assert.ok(JSON.parse(policySnapshot['public.tenant_admin_actions']).length > 0, 'upgrade has retained history');
  assert.ok(JSON.parse(policySnapshot['app_private.tenant_admin_action_categories']).length > 0, 'upgrade has retained history categories');
  apply(...files.filter(file => file >= '20261110000100'));
  assert.deepEqual(applicationSnapshot(), policySnapshot, 'policy migration preserves all application rows, history/categories and attribution');
  console.log('PASS populated policy upgrade preserves every application table, historical events/categories and metadata');
  assert.equal(sql(`select jsonb_agg(to_jsonb(p) order by tenant_id,user_id) from public.community_account_profiles p`),
    profileSnapshot, 'later policy migrations preserve existing profile bytes and attribution');
  assert.equal(sql(`select bio='  Original bio  ' from public.community_account_profiles where tenant_id='${tenant}' and user_id='${owner}'`), 't');
  assert.throws(() => sql(`update public.community_account_profiles set bio='  New padded bio  '
    where tenant_id='${tenant}' and user_id='${owner}'`), /community_profile_canonical_bio/);
  await verifySharingRace();
  console.log('PASS two-session deactivation and profile-sharing race in both lock orders');
  console.log('PASS clean migration replay and populated upgrade: owner backfill, preserved data/grants, legacy permission callers, new owner invariants');
} finally { cleanup(); }
