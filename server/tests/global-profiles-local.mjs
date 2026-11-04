import { directoryCursors } from '../src/directory-cursors.ts'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withEligibleActorTransaction } from '../src/actor-transaction.ts'
import { inspectGlobalProfile, setOwnBlock } from '../src/user-accounts/service.ts'
import { buildApi } from '../src/app.ts'
import { connectDatabase } from '../src/database.ts'
import { verifyBearer } from '../src/token-verifier.ts'
import { localStack } from '../../supabase/tests/local-stack.mjs'

const local = localStack()
const endpoint = new URL(process.env.DATABASE_URL)
assert.equal(endpoint.host, new URL(local.DB_URL).host)
assert.equal(endpoint.pathname, '/postgres')
const db = connectDatabase(endpoint.href)
const cursorKey=randomBytes(32).toString('hex')
const app = buildApi({ db, verify: verifyBearer(local.API_URL, local.ANON_KEY, local.issuer), cursors: directoryCursors(cursorKey), cleanup: () => db.destroy() })
const admin = new pg.Client({ connectionString: local.DB_URL })
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const authAdmin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, authOptions).auth.admin
const users = [], tenants = [], bulkUsers = []
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
async function http(viewer,path,method='GET',body,status=200) {
  const response=await fetch(base+path,{method,headers:{...(viewer?{Authorization:'Bearer '+viewer.token}:{}),
    ...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const data=await response.json()
  assert.equal(response.status,status,JSON.stringify(data))
  assert.equal(response.headers.get('cache-control'),path.startsWith('/api/public/')?'no-store':'private, no-store')
  return data
}
try {
  await admin.connect();base=await app.listen({host:'127.0.0.1',port:0})
  assert.equal((await fetch(base+'/health/ready')).status,200)
  const owner=await user(),viewer=await user(),target=await user(),stranger=await user(),pending=await user(),missing=await user()
  const prefix='Global-'+randomUUID()
  for(const actor of [owner,viewer,target,stranger,pending]) await http(actor,'/api/me/profile','PUT',{display_name:prefix+' Same',bio:'Global biography'})
  const prefs=(actor,discoverable,matchmaking=true)=>http(actor,'/api/me/preferences','PUT',{
    user_is_discoverable:discoverable,enable_matchmaking:matchmaking,allow_direct_messages:false})
  const inspect=(actor,user,status=200)=>http(actor,'/api/profiles/'+user,'GET',undefined,status)
  const search=(actor,q=prefix,suffix='',status=200)=>http(actor,'/api/profiles?q='+encodeURIComponent(q)+suffix,'GET',undefined,status)
  const list=(actor,suffix='',status=200)=>http(actor,'/api/me/blocks'+suffix,'GET',undefined,status)
  const block=(actor,user,source={kind:'global_profile'},status=200)=>http(actor,'/api/me/blocks/'+user,'PUT',{confirmed:true,source},status)
  const unblock=(actor,user)=>http(actor,'/api/me/blocks/'+user,'DELETE')
  const expected=['user_id','display_name','bio','created_at','updated_at','created_by','updated_by'].sort()
  assert.equal((await search(viewer)).rows.length,5)
  assert.deepEqual(Object.keys(await inspect(viewer,target.id)).sort(),expected)
  await inspect(viewer,missing.id,404);await inspect(viewer,randomUUID(),404)
  await prefs(viewer,false);await prefs(target,false)
  assert.equal((await inspect(viewer,viewer.id)).user_id,viewer.id)
  await inspect(viewer,target.id,404)
  assert.equal((await search(viewer)).rows.length,3)
  const first=await community(owner),second=await community(owner),other=await community(stranger)
  const cmd=(actor,tenant,body,status=200)=>http(actor,'/api/communities/'+tenant+'/commands','POST',body,status)
  const sharing=(actor,tenant,value)=>http(actor,'/api/communities/'+tenant+'/me/preferences','PATCH',{show_global_profile:value})
  for(const tenant of [first,second]) {
    await http(owner,'/api/communities/'+tenant+'/settings','PATCH',{auto_approve_users:true})
    for(const actor of [viewer,target]) await cmd(actor,tenant,{kind:'join',profile:{displayName:'Community identity',bio:'Independent biography'}})
  }
  await sharing(target,second,true)
  assert.equal((await inspect(viewer,target.id)).bio,'Global biography')
  assert.ok(!(await search(viewer)).rows.some(row=>row.user_id===target.id))
  await prefs(target,false,false)
  assert.equal((await inspect(viewer,target.id)).user_id,target.id)
  await sharing(target,first,true);await sharing(target,second,false)
  assert.equal((await inspect(viewer,target.id)).user_id,target.id)
  await sharing(target,first,false);await inspect(viewer,target.id,404)
  await sharing(target,second,true)
  await cmd(owner,second,{kind:'archive',archived:true});await inspect(viewer,target.id,404);await inspect(owner,target.id,404)
  await cmd(owner,second,{kind:'archive',archived:false})
  const revision=async actor=>(await http(owner,'/api/communities/'+second+'/accounts/'+actor.id+'/review')).revision
  await cmd(owner,second,{kind:'suspend',target:target.id,revision:await revision(target)})
  assert.equal((await inspect(viewer,target.id)).user_id,target.id)
  await cmd(owner,second,{kind:'suspend',target:viewer.id,revision:await revision(viewer)})
  assert.equal((await inspect(viewer,target.id)).user_id,target.id)
  await cmd(owner,second,{kind:'clear',target:target.id,revision:await revision(target)})
  await cmd(owner,second,{kind:'clear',target:viewer.id,revision:await revision(viewer)})
  await cmd(viewer,second,{kind:'deactivate'});await inspect(viewer,target.id,404)
  await cmd(viewer,second,{kind:'reactivate'})
  await cmd(target,second,{kind:'deactivate'});await inspect(viewer,target.id,404)
  await cmd(target,second,{kind:'reactivate'});await inspect(viewer,target.id,404)
  await sharing(target,second,true)
  await http(owner,'/api/communities/'+second+'/settings','PATCH',{auto_approve_users:false})
  await cmd(pending,second,{kind:'join',profile:{displayName:'Pending',bio:null}})
  await inspect(pending,target.id,404)
  // Other users' preferences and context-only profiles are not raw runtime rows.
  assert.equal((await withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    assert.deepEqual((await sql`select user_id from public.user_accounts where user_id=${target.id}`.execute(tx)).rows,[])
    assert.deepEqual((await sql`select user_id from public.community_account_preferences where user_id=${target.id}`.execute(tx)).rows,[])
    assert.deepEqual((await sql`select user_id from public.user_account_profiles where user_id=${target.id}`.execute(tx)).rows,[])
  })).eligible, true)
  const source={kind:'community_profile',tenantId:second}
  await prefs(viewer,true)
  assert.equal((await inspect(target,viewer.id)).user_id,viewer.id)
  await block(viewer,target.id)
  await inspect(viewer,target.id,404);await inspect(target,viewer.id,404)
  assert.equal((await http(viewer,'/api/communities/'+second+'/accounts/'+target.id+'/profile')).display_name,'Community identity')
  assert.ok((await http(viewer,'/api/communities/'+second+'/directory')).rows.some(row=>row.account.user_id===target.id))
  const saved=(await list(viewer)).rows[0]
  assert.deepEqual(Object.keys(saved).sort(),['blocked_user_id','blocker_user_id','created_at','created_by'])
  assert.equal(saved.blocker_user_id,viewer.id);assert.equal(saved.created_by,viewer.id);assert.equal(saved.blocked_user_id,target.id)
  assert.deepEqual(await list(target),{rows:[],next:null})
  await Promise.all([block(viewer,target.id),block(viewer,target.id)])
  assert.deepEqual((await list(viewer)).rows,[saved])
  await block(target,viewer.id,{kind:'global_profile'},404)
  await block(target,viewer.id,source)
  await Promise.all([unblock(viewer,target.id),unblock(viewer,target.id)])
  await inspect(viewer,target.id,404);await inspect(target,viewer.id,404)
  assert.equal((await list(target)).rows.length,1)
  await unblock(target,viewer.id)
  assert.equal((await inspect(viewer,target.id)).user_id,target.id)
  assert.equal((await inspect(target,viewer.id)).user_id,viewer.id)
  await prefs(viewer,false)
  // Encounter selectors must resolve a real, currently readable profile.
  await block(viewer,viewer.id,source,400)
  await block(viewer,randomUUID(),{kind:'global_profile'},404)
  await block(viewer,missing.id,{kind:'global_profile'},404)
  await block(viewer,target.id,{kind:'community_profile',tenantId:other},404)
  await block(pending,target.id,source,404)
  await sharing(target,second,false)
  await block(viewer,target.id,{kind:'global_profile'},404)
  await block(viewer,target.id,source)
  await unblock(viewer,target.id)
  await sharing(target,second,true)
  for(const body of [{confirmed:false,source},{confirmed:true},{confirmed:true,source:{kind:'activity',id:randomUUID()}},
    {confirmed:true,source,blocker_user_id:stranger.id},{confirmed:true,source:{...source,allowed:true}}]) {
    await http(viewer,'/api/me/blocks/'+target.id,'PUT',body,400)
  }
  await http(viewer,'/api/profiles/'+target.id+'?source_id='+first,'GET',undefined,400)
  for(const path of ['/api/profiles','/api/profiles/'+target.id,'/api/me/blocks']) await http(null,path,'GET',undefined,401)
  await http(null,'/api/me/blocks/'+target.id,'PUT',{confirmed:true,source},401)
  await http({token:'bad'},'/api/profiles','GET',undefined,401)
  await search(viewer,prefix,'&limit=101',400);await list(viewer,'?q=test',400)
  await http(stranger,'/api/me/profile','PUT',{display_name:prefix+' %_needle',bio:null})
  assert.equal((await search(viewer,'%_needle')).rows[0].user_id,stranger.id)
  assert.equal((await search(viewer,prefix.toLowerCase())).rows.length,3)
  const cursor=(await search(viewer,prefix,'&limit=1')).next
  await search(owner,prefix,'&cursor='+cursor,400)
  await search(viewer,'other','&cursor='+cursor,400)
  await list(viewer,'?cursor='+cursor,400)
  await prefs(target,true)
  await block(target,viewer.id,source)
  assert.ok(!(await search(viewer)).rows.some(row=>row.user_id===target.id))
  assert.equal((await withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    assert.deepEqual((await sql`select user_id from public.user_account_profiles where user_id=${target.id}`.execute(tx)).rows,[])
    assert.deepEqual((await sql`select blocked_user_id from public.user_account_blocks`.execute(tx)).rows,[])
    assert.equal((await sql`delete from public.user_account_blocks where blocker_user_id=${target.id}`.execute(tx)).numAffectedRows,0n)
  })).eligible, true)
  await unblock(target,viewer.id)
  await assert.rejects(withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    await setOwnBlock(tx,viewer.id,target.id,{confirmed:true,source});throw Error('injected rollback')
  }),/injected rollback/)
  assert.equal((await inspect(viewer,target.id)).user_id,target.id)
  await assert.rejects(withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    await sql`insert into public.user_account_blocks(blocked_user_id) values(${target.id})`.execute(tx)
  }),error=>error.code==='42501')
  await assert.rejects(withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    await sql`insert into public.user_account_blocks(blocker_user_id,blocked_user_id) values(${stranger.id},${target.id})`.execute(tx)
  }),error=>error.code==='42501')
  assert.equal((await withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    assert.equal((await sql`update public.user_account_profiles set bio='Bypass' where user_id=${target.id}`.execute(tx)).numAffectedRows,0n)
  })).eligible, true)
  // The insert policy rechecks a stale source selector at the mutation statement.
  await prefs(target,false);await sharing(target,second,false)
  await assert.rejects(withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.block_source','global_profile',true)`.execute(tx)
    await sql`insert into public.user_account_blocks(blocked_user_id) values(${target.id})`.execute(tx)
  }),error=>error.code==='42501')
  await prefs(target,true)
  // A read already admitted by its statement may finish; the next read is denied.
  let release,ready
  const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{ready=resolve})
  const read=withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    const profile=await inspectGlobalProfile(tx,target.id);ready();await gate;return profile
  })
  await Promise.race([started,read.then(()=>{throw Error('read ended before barrier')})])
  try {await block(target,viewer.id,source)} finally {release()}
  const readResult=await read
  assert.equal(readResult.eligible,true)
  assert.equal(readResult.value.user_id,target.id)
  await inspect(viewer,target.id,404);await unblock(target,viewer.id)
  await prefs(target,false);await sharing(target,second,true)
  await sharing(target,second,false);await inspect(viewer,target.id,404)
  await prefs(target,true);await prefs(target,false);await inspect(viewer,target.id,404)
  await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[viewer.id])
  await inspect(viewer,viewer.id,403);await search(viewer,prefix,'',403);await list(viewer,'',403)
  await block(viewer,target.id,source,403)
  await admin.query('update auth.users set banned_until=null where id=$1',[viewer.id])

  for(const client of [createClient(local.API_URL,local.ANON_KEY,authOptions),viewer.client,owner.client]) {
    for(const relation of ['user_account_profiles','user_account_blocks']) assert.equal((await client.from(relation).select('*')).error?.code,'42501')
    assert.equal((await client.from('user_account_blocks').insert({blocked_user_id:target.id})).error?.code,'42501')
    assert.equal((await client.from('user_account_blocks').delete().eq('blocked_user_id',target.id)).error?.code,'42501')
    assert.ok((await client.schema('app_private').rpc('inspect_global_profile',{p_target:target.id})).error)
  }
  await admin.query('begin')
  try {
    await admin.query('create extension if not exists pg_graphql');await admin.query('set local role authenticated')
    await admin.query("select set_config('request.jwt.claim.sub',$1,true)",[viewer.id])
    const resolve=async q=>(await admin.query('select graphql.resolve($1) as result',[q])).rows[0].result
    assert.equal((await resolve('{__typename}')).data.__typename,'Query')
    for(const table of ['user_account_profiles','user_account_blocks']) assert.ok((await resolve('{'+table+'Collection{edges{node{created_at}}}}')).errors?.length)
    assert.ok((await resolve('mutation{insertIntouser_account_blocksCollection(objects:[{blocked_user_id:"'+target.id+'"}]){affectedCount}}')).errors?.length)
  } finally {await admin.query('rollback')}
  // Large pages use equal names without losing UUID positions; fixture-only SQL
  // identities are deleted by SQL, not sent to the Auth identity API.
  bulkUsers.push(...Array.from({length:102},()=>randomUUID()))
  const bulkName='Bulk-'+randomUUID()
  await admin.query('begin')
  try {
    await admin.query("insert into auth.users(id,email,email_confirmed_at) select id,id::text||'@example.test',now() from unnest($1::uuid[]) id",[bulkUsers])
    await admin.query('insert into public.user_account_profiles(user_id,display_name) select id,$2 from unnest($1::uuid[]) id',[bulkUsers,bulkName])
    await admin.query('commit')
  } catch(error) {await admin.query('rollback');throw error}
  const defaultPage=await search(viewer,bulkName),maxPage=await search(viewer,bulkName,'&limit=100')
  assert.equal(defaultPage.rows.length,50);assert.equal(maxPage.rows.length,100)
  const tail=await search(viewer,bulkName,'&limit=100&cursor='+maxPage.next)
  assert.equal(tail.rows.length,2);assert.equal(tail.next,null)
  assert.equal(new Set([...maxPage.rows,...tail.rows].map(row=>row.user_id)).size,102)
  const blockedLater=tail.rows[0].user_id
  await block(viewer,blockedLater)
  assert.equal((await search(viewer,bulkName,'&limit=100&cursor='+maxPage.next)).rows.length,1)
  await unblock(viewer,blockedLater)
  for(const id of bulkUsers) await block(viewer,id)
  const ownDefault=await list(viewer),ownMax=await list(viewer,'?limit=100')
  assert.equal(ownDefault.rows.length,50);assert.equal(ownMax.rows.length,100)
  const ownTail=await list(viewer,'?limit=100&cursor='+ownMax.next)
  assert.equal(ownTail.rows.length,2);assert.equal(ownTail.next,null)
  assert.equal(new Set([...ownMax.rows,...ownTail.rows].map(row=>row.blocked_user_id)).size,102)
  assert.equal((await search(viewer,bulkName)).rows.length,0)
  assert.equal((await search(owner,bulkName)).rows.length,50)
  await list(owner,'?cursor='+ownMax.next,400)
  console.log('PASS global discovery vs exact consent, OR sharing and lifecycle boundaries, literal search/pages, bilateral profile blocks and unchanged community identity, validated source/confirmation, attribution/idempotence/rollback, snapshot revocation and REST/GraphQL/runtime bypasses')

} finally {
  try {
    await admin.query('begin')
    await admin.query('set local session_replication_role=replica')
    await admin.query('delete from public.user_account_blocks where blocker_user_id=any($1::uuid[]) or blocked_user_id=any($1::uuid[])',[[...users,...bulkUsers]])
    await admin.query('delete from public.user_account_profiles where user_id=any($1::uuid[])',[[...users,...bulkUsers]])
    await admin.query('delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id=any($1::uuid[]))',[tenants])
    await admin.query('delete from app_private.community_account_requests where tenant_id=any($1::uuid[])',[tenants])
    for (const table of ['community_account_permissions','community_account_preferences','tenant_admin_actions','tenant_website_content_overrides','community_account_profiles','community_accounts','tenant_staff_assignments','tenant_settings']) {
      await admin.query('delete from public.' + table + ' where tenant_id=any($1::uuid[])', [tenants])
    }
    await admin.query('delete from public.tenants where id=any($1::uuid[])', [tenants])
    await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])', [[...users,...bulkUsers]])
    await admin.query('delete from auth.users where id=any($1::uuid[])',[bulkUsers])
    await admin.query('commit')
    for (const id of users) assert.ifError((await authAdmin.deleteUser(id)).error)
  } finally { await app.close(); await admin.end() }
}
