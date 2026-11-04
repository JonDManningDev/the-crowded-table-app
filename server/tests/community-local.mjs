import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withVerifiedActor } from '../src/actor-transaction.ts'
import { communityCommand } from '../src/communities/commands.ts'
import { buildApi } from '../src/app.ts'
import { connectDatabase } from '../src/database.ts'
import { verifyBearer } from '../src/auth.ts'
import { localStack } from '../../supabase/tests/local-stack.mjs'

const local = localStack()
const endpoint = new URL(process.env.DATABASE_URL)
assert.equal(endpoint.host, new URL(local.DB_URL).host)
assert.equal(endpoint.pathname, '/postgres')
const db = connectDatabase(endpoint.href)
const app = buildApi(db, verifyBearer(local.API_URL, local.ANON_KEY, local.issuer))
const admin = new pg.Client({ connectionString: local.DB_URL })
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const authAdmin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, authOptions).auth.admin
const users = [], tenants = []
async function user() {
  const email = randomUUID() + '@example.test', password = randomUUID()
  const created = await authAdmin.createUser({ email, password, email_confirm: true })
  assert.ifError(created.error)
  users.push(created.data.user.id)
  const client = createClient(local.API_URL, local.ANON_KEY, authOptions)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  assert.ifError(error)
  return { id: data.user.id, token: data.session.access_token, client }
}
let base
async function send(viewer, path, body, expected = 200, method = body ? 'POST' : 'GET') {
  const response = await fetch(base + path, { method,
    headers: { Authorization: 'Bearer ' + viewer.token, 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }) })
  const data = await response.json()
  assert.equal(response.status, expected, JSON.stringify(data))
  return data
}
async function community(owner) {
  const data = await send(owner, '/api/communities', { slug: 'test-' + randomUUID(), name: 'API fixture',
    country: 'HN', timezone: 'UTC', region: '', city: '', profile: { displayName: 'Owner', bio: null } }, 201)
  tenants.push(data.tenantId)
  return data.tenantId
}
try {
  await admin.connect()
  base = await app.listen({ host: '127.0.0.1', port: 0 })
  const url = base + '/api/community-standings'
  const result = await fetch(url)
  assert.equal(result.status, 200)
  const rows = await result.json()
  assert.deepEqual(rows.map(row => row.standing), ['approved', 'inactive', 'pending', 'suspended'])
  const fields = ['enable_standard_chat_visibility', 'enable_standard_activity_visibility', 'enable_other_profile_visibility',
    'enable_own_profile_management', 'enable_standard_participation', 'enable_standard_dms']
  const bits = rows.map(row => {
    assert.deepEqual(Object.keys(row).sort(), ['standing', ...fields].sort())
    return fields.map(key => row[key])
  })
  assert.deepEqual(bits, [[true,true,true,true,true,true], [false,false,false,false,false,false],
    [false,false,false,true,false,false], [true,true,true,true,false,true]])
  assert.equal((await fetch(url, { headers: { Authorization: 'Bearer invalid' } })).status, 401)
  assert.equal((await fetch(url + '?tenant_id=unknown')).status, 400)
  assert.equal((await fetch(url, { method: 'DELETE' })).status, 404)
  const owner = await user(), member = await user(), other = await user()
  const tenant = await community(owner), another = await community(other)
  const cmd = (viewer, body, expected) => send(viewer, '/api/communities/' + tenant + '/commands', body, expected)
  const review = (viewer, target) => send(viewer, '/api/communities/' + tenant + '/accounts/' + target + '/review')
  const join = { kind: 'join', profile: { displayName: 'Member', bio: null } }
  async function graph(query) {
    const response=await fetch(local.API_URL+'/graphql/v1',{method:'POST',
      headers:{apikey:local.ANON_KEY,Authorization:'Bearer '+owner.token,'Content-Type':'application/json'},
      body:JSON.stringify({query})})
    return response.json()
  }
  const graphRead = `{ community_accountsCollection(filter:{tenant_id:{eq:"${tenant}"}}){ edges { node { tenant_id } } } }`
  const graphChange = field => `mutation { updatetenantsCollection(set:{${field}},
    filter:{id:{eq:"${tenant}"}},atMost:1){affectedCount} }`
  const deniedGraph = await graph(graphChange('operational_status:"archived"'))
  assert.ok(deniedGraph.errors?.length && !deniedGraph.data?.updatetenantsCollection)
  // The local HTTP gateway can report a disabled extension. Exercise the
  // enabled resolver under the authenticated database role without activating it.
  await admin.query('begin')
  try {
    await admin.query('create extension if not exists pg_graphql')
    await admin.query('set local role authenticated')
    await admin.query("select set_config('request.jwt.claim.sub',$1,true)",[owner.id])
    const resolve = async q => (await admin.query('select graphql.resolve($1) as result',[q])).rows[0].result
    const allowed = await resolve(graphRead)
    assert.equal(allowed.data?.community_accountsCollection?.edges[0]?.node.tenant_id,tenant,JSON.stringify(allowed.errors))
    const change = await resolve(graphChange('name:"GraphQL fixture"'))
    assert.ok(change.errors?.length && !change.data?.updatetenantsCollection)
    const denied = await resolve(graphChange('operational_status:"archived"'))
    assert.ok(denied.errors?.length && !denied.data?.updatetenantsCollection)
  } finally { await admin.query('rollback') }
  const first = await cmd(member, join)
  await cmd(member, { kind: 'withdraw', requestId: first.requestId })
  const second = await cmd(member, { kind: 'reactivate' })
  assert.notEqual(second.requestId,first.requestId)
  let state = await review(member, member.id)
  await cmd(other, { kind: 'approve', requestId: second.requestId, revision: state.revision }, 403)
  await cmd(owner, { kind: 'approve', requestId: first.requestId, revision: state.revision }, 409)
  await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[member.id])
  await cmd(owner, { kind: 'approve', requestId: second.requestId, revision: state.revision })
  const candidates = viewer => send(viewer,'/api/communities/'+tenant+'/staff-candidates')
  assert.ok(!(await candidates(owner)).rows.some(r => r.user_id === member.id))
  await cmd(owner,{kind:'grant',target:member.id},409)
  await admin.query('update auth.users set banned_until=null where id=$1',[member.id])
  assert.deepEqual((await candidates(other)).rows,[])
  const candidate = (await candidates(owner)).rows.find(r=>r.user_id===member.id)
  assert.deepEqual(candidate,{ tenant_id:tenant,user_id:member.id,standing:'approved',display_name:'Member',staff_status:null,staff_role:null })
  await cmd(owner, { kind: 'grant', target: member.id })
  await cmd(owner, { kind: 'permissions', target: member.id, permissions: { can_grant_staff: true } })
  await cmd(member, { kind: 'archive', archived: true }, 403)
  await cmd(member, { kind: 'permissions', target: member.id, permissions: { can_manage_settings: true, can_audit_staff_accounts: true } }, 403)
  await cmd(member, { kind: 'deactivate' })
  await cmd(member, { kind: 'reactivate' })
  await cmd(owner, { kind: 'resume', target: member.id })
  state = await review(owner, member.id)
  await cmd(owner, { kind: 'suspend', target: member.id, revision: state.revision, reason: 'Fixture reason' })
  const audit = await admin.query(`select a.action,a.created_by,a.reason,c.category from public.tenant_admin_actions a
    join app_private.tenant_admin_action_categories c on c.action_id=a.id where a.operation_id=(select operation_id
    from public.tenant_admin_actions where tenant_id=$1 and action='community_suspended')`, [tenant])
  assert.equal(audit.rowCount,3)
  assert.ok(audit.rows.every(r => r.created_by===owner.id && (r.reason===null || r.category==='community_account' && r.action==='community_suspended')))
  await cmd(owner, { kind: 'clear', target: member.id, revision: state.revision }, 409)
  await cmd(owner, { kind: 'clear', target: member.id, revision: (await review(owner,member.id)).revision })
  const profile = (viewer, scope, target, suffix = '') => fetch(base + '/api/communities/' + scope + '/accounts/' + target + '/profile' + suffix,
    { headers: viewer ? { Authorization: 'Bearer ' + viewer.token } : {} })
  const read = async (viewer, target, name) => {
    const response = await profile(viewer, tenant, target)
    assert.equal(response.status, 200)
    const row = await response.json()
    assert.deepEqual(Object.keys(row).sort(), ['tenant_id','user_id','display_name','bio','created_at','updated_at','created_by','updated_by'].sort())
    assert.equal(row.tenant_id, tenant)
    assert.equal(row.user_id, target)
    assert.equal(row.display_name, name)
  }
  await read(member, owner.id, 'Owner')
  assert.equal((await profile(null, tenant, member.id)).status, 401)
  assert.equal((await profile(other, tenant, member.id)).status, 404)
  assert.equal((await profile(other, another, member.id)).status, 404)
  assert.equal((await profile(owner, tenant, member.id, '?select=*')).status, 400)
  for (const standing of ['pending','suspended','inactive']) {
    await admin.query("update public.community_accounts set standing=$1,has_disciplinary_restriction=($1='suspended') where tenant_id=$2 and user_id=$3", [standing,tenant,member.id])
    assert.equal((await profile(member,tenant,owner.id)).status, standing === 'suspended' ? 200 : 404)
    assert.equal((await profile(member,tenant,member.id)).status, standing === 'inactive' ? 404 : 200)
    assert.equal((await profile(owner,tenant,member.id)).status, standing === 'pending' ? 404 : 200)
  }
  await admin.query("update public.community_accounts set standing='approved' where tenant_id=$1 and user_id=$2", [tenant,member.id])
  await cmd(owner, { kind: 'archive', archived: true })
  await read(owner, member.id, 'Member')
  for (const viewer of [member,other]) assert.equal((await profile(viewer,tenant,member.id)).status,404)
  // Omit the service predicate, as a faulty future query could. The independent
  // archive guard must still prevent a non-owner's runtime read.
  await db.transaction().execute(async tx => {
    await sql`select set_config('request.jwt.claim.sub', ${member.id}, true)`.execute(tx)
    assert.deepEqual(await tx.selectFrom('community_account_profiles').select('user_id').where('tenant_id','=',tenant).execute(), [])
  })
  await cmd(owner, { kind: 'archive', archived: false })
  await read(member, owner.id, 'Owner')
  const queue = viewer => send(viewer,'/api/communities/'+tenant+'/requests')
  await cmd(other, join)
  const queued = (await queue(owner)).rows
  assert.equal(queued.length,1)
  assert.deepEqual((await queue(member)).rows,[])
  await cmd(owner,{kind:'approve',requestId:queued[0].id,revision:queued[0].revision})
  await cmd(owner,{kind:'grant',target:other.id})
  await cmd(owner,{kind:'permissions',target:other.id,permissions:{can_discipline_users:true}})
  const { staffFlags } = await import('../../shared/community-commands.ts')
  const permissions = Object.fromEntries(staffFlags.map(flag=>[flag,false]))
  await cmd(other,{kind:'reappoint',target:member.id,permissions},403)
  await cmd(owner,{kind:'reappoint',target:member.id,permissions})
  state = await review(owner,member.id)
  await cmd(other,{kind:'remove',target:member.id,revision:state.revision},403)
  await cmd(owner,{kind:'revoke',target:member.id,reason:'Staff change'})
  await cmd(other,{kind:'remove',target:member.id,revision:(await review(other,member.id)).revision})
  const restricted = await cmd(member,{kind:'reactivate'})
  assert.equal((await cmd(member,{kind:'reactivate'})).requestId,restricted.requestId)
  assert.equal((await queue(other)).rows[0].id,restricted.requestId)
  await cmd(member,{kind:'withdraw',requestId:restricted.requestId})
  await cmd(member,{kind:'reactivate'})
  await cmd(other,{kind:'clear',target:member.id,revision:(await review(other,member.id)).revision})
  assert.equal((await queue(other)).rows.length,0)
  assert.equal((await cmd(member,{kind:'reactivate'})).outcome,'approved')
  await cmd(owner,{kind:'deactivate'},403)
  await cmd(owner,{kind:'grant',target:member.id,permissions},400)
  await send(owner,'/api/communities/'+tenant+'/settings',{auto_approve_users:true},200,'PATCH')
  const applicant = await user()
  assert.equal((await cmd(applicant,join)).outcome,'approved')

  // Hold the serialization lock and prove that the real competing API call
  // waits before reading authority. Release only after observing the blocker.
  async function afterLockedChange(change, competing) {
    await admin.query('begin')
    let response
    try {
      await admin.query('select id from public.tenants where id=$1 for update',[tenant])
      await change()
      response = competing()
      response.catch(() => {})
      const deadline = Date.now()+1800
      let blocked = false
      while (!blocked && Date.now()<deadline) {
        blocked = (await admin.query("select exists(select from pg_stat_activity where usename='ct_api' and pg_backend_pid()=any(pg_blocking_pids(pid))) as waiting")).rows[0].waiting
        if (!blocked) await new Promise(resolve=>setTimeout(resolve,10))
      }
      assert.ok(blocked,'command must wait for the tenant lock')
      await admin.query('commit')
    } finally { await admin.query('rollback') }
    return response
  }
  const waitingMember = await user()
  await send(owner,'/api/communities/'+tenant+'/settings',{auto_approve_users:false},200,'PATCH')
  const older = await cmd(waitingMember,join)
  const previousRevision = (await review(waitingMember,waitingMember.id)).revision
  // Run the real withdrawal and reapplication through the service on a held
  // connection. An approval queued behind them must see the replacement UUID.
  let releaseWriter, signalReady
  const ready = new Promise(resolve=>{signalReady=resolve})
  const release = new Promise(resolve=>{releaseWriter=resolve})
  const writer = withVerifiedActor(db, waitingMember.id, randomUUID(), async tx => {
    await communityCommand(tx,waitingMember.id,tenant,{kind:'withdraw',requestId:older.requestId})
    const fresh = await communityCommand(tx,waitingMember.id,tenant,{kind:'reactivate'})
    signalReady((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
    await release
    return fresh
  })
  const holder = await Promise.race([ready,writer.then(()=>{throw Error('writer exited before barrier')})])
  const approval = cmd(owner,{kind:'approve',requestId:older.requestId,revision:previousRevision},409)
  approval.catch(()=>{})
  try {
    const deadline = Date.now()+1800
    while (!(await admin.query("select exists(select from pg_stat_activity where $1=any(pg_blocking_pids(pid))) as waiting",[holder])).rows[0].waiting) {
      assert.ok(Date.now()<deadline,'stale approval waited behind replacement request')
      await new Promise(resolve=>setTimeout(resolve,10))
    }
  } finally { releaseWriter() }
  const fresh = await writer
  await approval
  assert.equal((await review(waitingMember,waitingMember.id)).request_id,fresh.requestId)
  const operation = randomUUID()
  await assert.rejects(withVerifiedActor(db,waitingMember.id,operation,async tx=>{
    await communityCommand(tx,waitingMember.id,tenant,{kind:'withdraw',requestId:fresh.requestId})
    throw Error('injected rollback')
  }),/injected rollback/)
  assert.equal((await review(waitingMember,waitingMember.id)).request_id,fresh.requestId)
  assert.equal((await admin.query('select id from public.tenant_admin_actions where operation_id=$1',[operation])).rowCount,0)
  const preview = await review(other,member.id)
  await afterLockedChange(()=>admin.query('update public.tenant_staff_assignments set can_discipline_users=false where tenant_id=$1 and user_id=$2',[tenant,other.id]),
    ()=>cmd(other,{kind:'remove',target:member.id,revision:preview.revision},403))
  await afterLockedChange(()=>admin.query("update public.tenants set operational_status='archived' where id=$1",[tenant]),
    ()=>cmd(member,{kind:'deactivate'},404))
  await cmd(owner,{kind:'archive',archived:false})
  assert.equal((await cmd(owner,{kind:'archive',archived:false})).outcome,'already_applied')
  const restores = await admin.query("select count(*)::int as n from public.tenant_admin_actions where tenant_id=$1 and action='tenants.restore' and created_by=$2",[tenant,owner.id])
  assert.equal(restores.rows[0].n,2)
  assert.equal((await review(member,member.id)).standing,'approved')

  // Invalid creation after tenant/settings insertion must roll back every root and action.
  const failedSlug = 'rollback-'+randomUUID()
  await send(owner,'/api/communities',{slug:failedSlug,name:'Rollback fixture',country:'HN',timezone:'UTC',region:'',city:'',
    profile:{displayName:'   ',bio:null}},400)
  assert.equal((await admin.query('select id from public.tenants where slug=$1',[failedSlug])).rowCount,0)
  console.log('PASS verified community writes, request identity, staff delegation and reappointment, discipline audit isolation, archive and authority races, rollback and profile reads')
} finally {
  try {
    await admin.query('begin')
    await admin.query('set local session_replication_role=replica')
    await admin.query('delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id=any($1::uuid[]))',[tenants])
    await admin.query('delete from app_private.community_account_requests where tenant_id=any($1::uuid[])',[tenants])
    for (const table of ['community_account_permissions','community_account_preferences','tenant_admin_actions','community_account_profiles','community_accounts','tenant_staff_assignments','tenant_settings']) {
      await admin.query('delete from public.' + table + ' where tenant_id=any($1::uuid[])', [tenants])
    }
    await admin.query('delete from public.tenants where id=any($1::uuid[])', [tenants])
    await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])', [users])
    await admin.query('commit')
    for (const id of users) assert.ifError((await authAdmin.deleteUser(id)).error)
  } finally { await app.close(); await admin.end() }
}
