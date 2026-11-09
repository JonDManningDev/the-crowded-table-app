import { directoryCursors } from '../src/directory-cursors.ts'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'

import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withEligibleActorTransaction, connectDatabase } from '../src/database.ts'
import { ownCommunityProfile, ownCommunityPreferences } from '../src/communities/service.ts'
import { ownProfile } from '../src/user-accounts/service.ts'
import { communityCommand } from '../src/communities/service.ts'
import { buildApi } from '../src/app.ts'
import { verifyBearer } from '../src/token-verifier.ts'
import { localStack } from '../../supabase/tests/local-stack.mjs'

const local = localStack()
const endpoint = new URL(process.env.DATABASE_URL)
assert.equal(endpoint.host, new URL(local.DB_URL).host)
assert.equal(endpoint.pathname, '/postgres')
const db = connectDatabase(endpoint.href)
const app = buildApi({ db, verify: verifyBearer(local.API_URL, local.ANON_KEY, local.issuer), cursors: directoryCursors(randomBytes(32).toString('hex')), cleanup: () => db.destroy() })
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
async function http(viewer,path,method='GET',body,expected=200) {
  const response=await fetch(base+path,{method,headers:{...(viewer?{Authorization:'Bearer '+viewer.token}:{}),
    ...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const data=await response.json()
  assert.equal(response.status,expected,JSON.stringify(data))
  assert.equal(response.headers.get('cache-control'),'private, no-store')
  return data
}
try {
  await admin.connect()
  base=await app.listen({host:'127.0.0.1',port:0})
  const owner=await user(), member=await user(), other=await user(), pending=await user(), outsider=await user()
  const tenant=await community(owner), unrelated=await community(outsider)
  const command=(actor,body)=>send(actor,'/api/communities/'+tenant+'/commands',body)
  const profile=(actor,body,status=200,scope=tenant)=>http(actor,'/api/communities/'+scope+'/me/profile','PATCH',body,status)
  const prefs=(actor,body,status=200,scope=tenant)=>http(actor,'/api/communities/'+scope+'/me/preferences',body?'PATCH':'GET',body,status)
  const summaries=(actor,query={},status=200)=>http(actor,'/api/me/communities?'+new URLSearchParams(query),'GET',undefined,status)
  const global=(actor,body,status=200)=>http(actor,'/api/me/profile',body?'PUT':'GET',body,status)
  const review=actor=>send(owner,'/api/communities/'+tenant+'/accounts/'+actor.id+'/review')
  const join={kind:'join',profile:{displayName:'Initial curated',bio:null}}
  await command(pending,join)
  await send(owner,'/api/communities/'+tenant+'/settings',{auto_approve_users:true},200,'PATCH')
  await command(member,join)
  await command(other,join)
  assert.deepEqual(await global(member),{profile:null})
  const first=(await global(member,{display_name:'  Global Name  ',bio:'  Bio  '})).profile
  assert.equal(first.display_name,'Global Name')
  assert.equal(first.bio,'Bio')
  assert.equal(first.created_by,member.id)
  assert.equal(first.updated_by,member.id)
  assert.equal(first.user_id,member.id)
  assert.deepEqual(Object.keys(first).sort(),['user_id','display_name','bio','created_at','updated_at','created_by','updated_by'].sort())
  const second=(await global(member,{display_name:'Changed',bio:'  '})).profile
  assert.equal(second.created_at,first.created_at)
  assert.equal(second.bio,null)
  assert.deepEqual(await global(other),{profile:null})
  for(const bad of [{display_name:' ' ,bio:null},{display_name:'x'.repeat(81),bio:null},
    {display_name:'Valid',bio:'x'.repeat(2001)},{display_name:'Name',bio:null,user_id:other.id},
    {display_name:'Name',bio:null,created_by:owner.id},{display_name:'Name'}]) await global(member,bad,400)
  await http(null,'/api/me/profile','GET',undefined,401)
  await http(member,'/api/me/profile?user_id='+other.id,'GET',undefined,400)
  await profile(member,{display_name:'  Curated  ',bio:'  '})
  const stored=(await admin.query('select display_name,bio,created_by,updated_by from public.community_account_profiles where tenant_id=$1 and user_id=$2',[tenant,member.id])).rows[0]
  assert.deepEqual(stored,{display_name:'Curated',bio:null,created_by:member.id,updated_by:member.id})
  assert.equal((await global(member)).profile.display_name,'Changed')
  await profile(member,{display_name:'Cross tenant',bio:null},404,unrelated)
  await profile(outsider,{display_name:'Unknown',bio:null},404)
  await profile(member,{display_name:' ',bio:null},400)
  await profile(member,{display_name:'Spoof',bio:null,user_id:other.id},400)
  await profile(pending,{display_name:'Onboarding',bio:null})
  assert.deepEqual(await prefs(member),{show_global_profile:false,allow_direct_messages:true,allow_private_invitations:true})
  for(let bits=0;bits<8;bits++) {
    const input={show_global_profile:!!(bits&1),allow_direct_messages:!!(bits&2),allow_private_invitations:!!(bits&4)}
    assert.deepEqual(await prefs(member,input),input)
    assert.deepEqual(await prefs(member),input)
  }
  assert.deepEqual(await prefs(member,{show_global_profile:false}),{show_global_profile:false,allow_direct_messages:true,allow_private_invitations:true})
  await prefs(pending,{show_global_profile:true})
  for(const bad of [{},{show_global_profile:'true'},{standing:'approved'},{user_id:other.id,show_global_profile:true}]) await prefs(member,bad,400)
  await prefs(member,{show_global_profile:true},404,unrelated)
  await prefs(outsider,undefined,404)
  assert.deepEqual((await summaries(member)).rows.map(r=>r.id),[tenant])
  const card=(await summaries(pending)).rows[0]
  assert.equal(card.is_member,true)
  assert.deepEqual(Object.keys(card).sort(),['id','name','city','state_province','country_code','operational_status','created_at','is_owned','is_managed','is_member'].sort())
  assert.deepEqual((await summaries(member,{filter:'managed'})).rows,[])
  await command(owner,{kind:'grant',target:member.id})
  assert.equal((await summaries(member,{filter:'managed'})).rows[0].id,tenant)
  assert.equal((await summaries(owner,{filter:'owned'})).rows[0].id,tenant)
  assert.deepEqual((await summaries(member,{filter:'owned'})).rows,[])
  for(const query of [{filter:'everyone'},{user_id:owner.id},{limit:'0'},{limit:'101'},{cursor:'bad'}]) await summaries(member,query,400)

  // Native role checks omit the application's self predicates deliberately.
  assert.equal((await withEligibleActorTransaction(db, { actorId: member.id, requestId: randomUUID() },async tx=>{
    // Global discovery has its own peer audience; the self operation stays exact.
    assert.equal((await ownProfile(tx,member.id)).profile.user_id,member.id)
    assert.ok((await sql`select user_id from public.community_account_preferences`.execute(tx)).rows.every(r=>r.user_id===member.id))
    const changed=await sql`update public.community_account_profiles set bio='Own only' returning user_id`.execute(tx)
    assert.ok(changed.rows.length && changed.rows.every(r=>r.user_id===member.id))
    const raw=await sql`select id from public.tenants`.execute(tx)
    assert.deepEqual(raw.rows,[{id:tenant}])
  })).eligible, true)
  await assert.rejects(withEligibleActorTransaction(db, { actorId: member.id, requestId: randomUUID() },tx=>sql`update public.user_account_profiles set updated_by=${other.id}`.execute(tx)),error=>error.code==='42501')
  await assert.rejects(withEligibleActorTransaction(db, { actorId: member.id, requestId: randomUUID() },async tx=>{
    await ownProfile(tx,member.id,{display_name:'Rollback',bio:null})
    throw Error('injected rollback')
  }),/injected rollback/)
  assert.equal((await global(member)).profile.display_name,'Changed')
  for(const viewer of [owner,member]) {
    for(const table of ['user_account_profiles','community_account_profiles','community_account_preferences']) {
      assert.ok((await viewer.client.from(table).select('*')).error)
      assert.ok((await viewer.client.from(table).update(table.endsWith('preferences')?{show_global_profile:true}:{display_name:'Bypass'}).eq(table==='user_account_profiles'?'user_id':'tenant_id',table==='user_account_profiles'?viewer.id:tenant)).error)
    }
    assert.ok((await viewer.client.from('my_community_summaries').select('*')).error)
    assert.ok((await viewer.client.from('tenants').select('id,community_account_profiles(*)').eq('id',tenant)).error)
    assert.ok((await viewer.client.schema('app_private').rpc('my_community_relationships')).error)
  }
  await admin.query('begin')
  try {
    await admin.query('create extension if not exists pg_graphql')
    await admin.query('set local role authenticated')
    await admin.query("select set_config('request.jwt.claim.sub',$1,true)",[owner.id])
    const resolve=async q=>(await admin.query('select graphql.resolve($1) as result',[q])).rows[0].result
    assert.equal((await resolve('{__typename}')).data.__typename,'Query')
    assert.ok((await resolve('{community_accountsCollection{edges{node{tenant_id}}}}')).errors?.length)
    for(const table of ['user_account_profiles','community_account_profiles','community_account_preferences','my_community_summaries']) {
      const result=await resolve('{ '+table+'Collection { edges { node { '+(table==='my_community_summaries'?'id':'user_id')+' } } } }')
      assert.ok(result.errors?.length)
    }
  } finally { await admin.query('rollback') }

  await command(owner,{kind:'suspend',target:member.id,revision:(await review(member)).revision,reason:'Fixture'})
  await profile(member,{display_name:'Suspended self',bio:null})
  await prefs(member,{allow_direct_messages:false},404)
  assert.equal((await summaries(member)).rows[0].is_member,true)
  assert.equal((await summaries(member)).rows[0].is_managed,false)
  await command(owner,{kind:'clear',target:member.id,revision:(await review(member)).revision})
  await command(member,{kind:'deactivate'})
  await profile(member,{display_name:'Inactive',bio:null},404)
  await prefs(member,{show_global_profile:true},404)
  assert.equal((await prefs(member)).show_global_profile,false)
  assert.deepEqual((await summaries(member)).rows,[])
  await command(member,{kind:'reactivate'})
  await command(owner,{kind:'archive',archived:true})
  assert.equal((await summaries(member)).rows[0].operational_status,'archived')
  await prefs(member,undefined,404)
  assert.ok(await prefs(owner))
  await profile(member,{display_name:'Archived',bio:null},404)
  await profile(owner,{display_name:'Archived owner',bio:null},404)
  await prefs(owner,{show_global_profile:true},404)
  await global(member,{display_name:'Global still editable',bio:null})
  assert.equal((await withEligibleActorTransaction(db, { actorId: member.id, requestId: randomUUID() },async tx=>{
    assert.deepEqual((await sql`select user_id,show_global_profile from public.community_account_preferences`.execute(tx)).rows,[])
    assert.deepEqual((await sql`select * from public.community_account_profiles where tenant_id=${tenant}`.execute(tx)).rows,[])
  })).eligible, true)
  await command(owner,{kind:'archive',archived:false})
  await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[member.id])
  await global(member,undefined,403)
  await prefs(member,undefined,403)
  await summaries(member,{},403)
  await admin.query('update auth.users set banned_until=null where id=$1',[member.id])
  async function held(viewer,work) {
    let release,ready
    const gate=new Promise(resolve=>{release=resolve}), started=new Promise(resolve=>{ready=resolve})
    const done=withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
      await work(tx)
      ready((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
      await gate
    })
    const pid=await Promise.race([started,done.then(()=>{throw Error('transaction ended before barrier')})])
    return {pid,release,done}
  }
  async function blocked(pid) {
    const deadline=Date.now()+1800
    while(!(await admin.query('select exists(select from pg_stat_activity where $1=any(pg_blocking_pids(pid))) as waiting',[pid])).rows[0].waiting) {
      assert.ok(Date.now()<deadline,'competing writer must block on the account row')
      await new Promise(resolve=>setTimeout(resolve,10))
    }
  }
  const edits=await held(member,async tx=>{
    await ownCommunityPreferences(tx,member.id,tenant,{show_global_profile:false})
    await ownCommunityProfile(tx,member.id,tenant,{display_name:'Held profile',bio:null})
  })
  try {
    await profile(other,{display_name:'Independent profile',bio:null})
    await prefs(other,{show_global_profile:true})
  } finally { edits.release(); await edits.done }
  await admin.query('begin')
  try {
    await admin.query('select id from public.tenants where id=$1 for update',[tenant])
    await profile(member,{display_name:'No tenant lock',bio:null})
    await prefs(other,{allow_direct_messages:false})
  } finally { await admin.query('rollback') }
  const sharing=await held(member,tx=>ownCommunityPreferences(tx,member.id,tenant,{show_global_profile:true}))
  const deactivate=command(member,{kind:'deactivate'})
  deactivate.catch(()=>{})
  try { await blocked(sharing.pid) } finally { sharing.release() }
  await sharing.done
  await deactivate
  assert.equal((await prefs(member)).show_global_profile,false)
  await command(member,{kind:'reactivate'})
  const inactive=await held(member,tx=>communityCommand(tx,member.id,tenant,{kind:'deactivate'}))
  const enable=prefs(member,{show_global_profile:true},404)
  enable.catch(()=>{})
  try { await blocked(inactive.pid) } finally { inactive.release() }
  await inactive.done
  await enable
  assert.equal((await prefs(member)).show_global_profile,false)
  await command(member,{kind:'reactivate'})

  // A real larger collection checks limits, ties, completeness and no unrelated tenant.
  const owned=[tenant]
  for(let n=0;n<101;n++) owned.push(await community(owner))
  await admin.query('begin')
  try {
    await admin.query('set local session_replication_role=replica')
    await admin.query("update public.tenants set created_at='2020-01-02T03:04:05.123456Z' where id=any($1::uuid[])",[owned])
    await admin.query('commit')
  } catch(error) { await admin.query('rollback'); throw error }
  const defaultPage=await summaries(owner)
  assert.equal(defaultPage.rows.length,50)
  const firstPage=await summaries(owner,{filter:'owned',limit:'100'})
  assert.equal(firstPage.rows.length,100)
  assert.ok(firstPage.next)
  const lastPage=await summaries(owner,{filter:'owned',cursor:firstPage.next,limit:'1'})
  const finalPage=await summaries(owner,{filter:'owned',cursor:lastPage.next})
  assert.equal(finalPage.next,null)
  const listed=[...firstPage.rows,...lastPage.rows,...finalPage.rows]
  assert.deepEqual(listed.map(r=>r.id),owned.sort())
  assert.ok(listed.every(r=>r.created_at==='2020-01-02T03:04:05.123456Z'))
  await summaries(owner,{filter:'all',cursor:firstPage.next},400)
  await summaries(outsider,{filter:'owned',cursor:firstPage.next},400)
  const badDate=JSON.parse(Buffer.from(firstPage.next,'base64url').toString())
  badDate[2]='0000-01-01T00:00:00.000000Z'
  await summaries(owner,{filter:'owned',cursor:Buffer.from(JSON.stringify(badDate)).toString('base64url')},400)
  assert.ok(!listed.some(r=>r.id===unrelated))
  console.log('PASS self-service real Auth/HTTP: profile normalization and attribution, private flags, lifecycle/archive boundaries, summary pagination, browser/runtime bypasses, rollback and independent edits; sharing/inactivity races in both orders')
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
    await admin.query('delete from public.user_account_profiles where user_id=any($1::uuid[])', [users])
    await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])', [users])
    await admin.query('commit')
    for (const id of users) assert.ifError((await authAdmin.deleteUser(id)).error)
  } finally { await app.close(); await admin.end() }
}
