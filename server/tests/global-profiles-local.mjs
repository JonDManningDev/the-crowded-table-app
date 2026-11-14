import { directoryCursors } from '../src/directory-cursors.ts'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withEligibleActorTransaction, connectDatabase } from '../src/database.ts'
import { readGlobalProfile } from '../src/user-accounts/service.ts'
import { holdBlockWrite, runBlockWriteWithHook } from './helpers/block-write.mjs'
import { buildApi } from '../src/app.ts'
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
  assert.equal((await sql`select to_regprocedure('app_private.can_inspect_global_profile(uuid)') as fn`.execute(db)).rows[0].fn,null)
  const owner=await user(),viewer=await user(),target=await user(),stranger=await user(),pending=await user(),missing=await user()
  const prefix='Global-'+randomUUID()
  for(const actor of [owner,viewer,target,stranger,pending]) await http(actor,'/api/me/profile','PUT',{display_name:prefix+' Same',bio:'Global biography'})
  const prefs=(actor,discoverable,matchmaking=true)=>http(actor,'/api/me/preferences','PUT',{
    user_is_discoverable:discoverable,enable_matchmaking:matchmaking,allow_direct_messages:false})
  const inspect=(actor,user,status=200)=>http(actor,'/api/profiles/'+user,'GET',undefined,status)
  const search=(actor,q=prefix,suffix='',status=200)=>http(actor,'/api/profiles?q='+encodeURIComponent(q)+suffix,'GET',undefined,status)
  const list=(actor,suffix='',status=200)=>http(actor,'/api/me/blocks'+suffix,'GET',undefined,status)
  const block=(actor,user,status=200)=>http(actor,'/api/me/blocks/'+user,'PUT',{confirmed:true},status)
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
  // Product profile/account audiences now belong to API predicates. Runtime
  // facts retain their granted columns, self writes and explicit sharing scope.
  await withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    assert.deepEqual((await sql`select user_id from public.user_accounts where user_id=${target.id}`.execute(tx)).rows,[{user_id:target.id}])
    await sql`select set_config('ct.profile_target',${target.id},true)`.execute(tx)
    assert.equal((await sql`update public.user_accounts set user_is_discoverable=true where user_id=${target.id}`.execute(tx)).numAffectedRows,0n)
    await sql`select set_config('ct.profile_target','',true)`.execute(tx)
    assert.deepEqual((await sql`select user_id from public.community_account_preferences where user_id=${target.id}`.execute(tx)).rows,[])
    assert.deepEqual((await sql`select user_id from public.user_account_profiles where user_id=${target.id}`.execute(tx)).rows,[{user_id:target.id}])
  })
  const communityProfile=(actor,user,status=200)=>http(actor,'/api/communities/'+second+'/accounts/'+user+'/profile','GET',undefined,status)
  const directory=(actor,suffix='')=>http(actor,'/api/communities/'+second+'/directory'+suffix)
  const withheld={status:'blocked'}
  await prefs(viewer,true);await prefs(target,true)
  const initialSearch=(await search(viewer)).rows
  const initialDirectory=(await directory(viewer)).rows
  const memberCursor=(await directory(viewer,'?limit=1')).next
  assert.ok(memberCursor)
  const memberTail=await directory(viewer,'?cursor='+memberCursor)
  assert.ok(initialSearch.some(row=>row.user_id===target.id))
  for(const row of initialSearch) assert.deepEqual(Object.keys(row).sort(),['display_name','user_id'])
  assert.deepEqual(initialDirectory.find(row=>row.account.user_id===target.id).profile,{display_name:'Community identity'})
  assert.equal((await communityProfile(viewer,target.id)).bio,'Independent biography')
  await block(viewer,target.id)
  for(const [actor,user] of [[viewer,target.id],[target,viewer.id]]) {
    assert.deepEqual(await inspect(actor,user),withheld)
    assert.deepEqual(await communityProfile(actor,user),withheld)
  }
  assert.deepEqual((await search(viewer)).rows,initialSearch)
  assert.deepEqual((await directory(viewer)).rows,initialDirectory)
  assert.deepEqual(await directory(viewer,'?cursor='+memberCursor),memberTail)
  const saved=(await list(viewer)).rows[0]
  assert.deepEqual(Object.keys(saved).sort(),['blocked_user_id','blocker_user_id','created_at','created_by'])
  assert.equal(saved.blocker_user_id,viewer.id);assert.equal(saved.created_by,viewer.id);assert.equal(saved.blocked_user_id,target.id)
  assert.deepEqual(await list(target),{rows:[],next:null})
  await Promise.all([block(viewer,target.id),block(viewer,target.id)])
  assert.deepEqual((await list(viewer)).rows,[saved])
  await block(target,viewer.id)
  await Promise.all([unblock(viewer,target.id),unblock(viewer,target.id)])
  assert.deepEqual(await inspect(viewer,target.id),withheld)
  assert.deepEqual(await communityProfile(target,viewer.id),withheld)
  assert.equal((await list(target)).rows.length,1)
  await unblock(target,viewer.id)
  assert.equal((await inspect(viewer,target.id)).user_id,target.id)
  assert.equal((await communityProfile(target,viewer.id)).bio,'Independent biography')
  assert.deepEqual((await directory(viewer)).rows,initialDirectory)
  await prefs(viewer,false);await prefs(target,false)
  await block(viewer,viewer.id,400)
  assert.equal((await block(viewer,viewer.id.toUpperCase(),400)).code,'invalid_target')
  assert.deepEqual(await block(viewer,randomUUID()),{blocked:true})
  assert.deepEqual((await list(viewer)).rows,[])
  assert.deepEqual(await block(viewer,missing.id),{blocked:true})
  assert.equal((await list(viewer)).rows[0].blocked_user_id,missing.id)
  await inspect(viewer,missing.id,404)
  await unblock(viewer,missing.id)
  await block(pending,target.id)
  await communityProfile(pending,target.id,404)
  await unblock(pending,target.id)
  await sharing(target,second,false)
  await block(viewer,target.id)
  await inspect(viewer,target.id,404)
  await cmd(owner,second,{kind:'archive',archived:true})
  await communityProfile(viewer,target.id,404)
  await cmd(owner,second,{kind:'archive',archived:false})
  await unblock(viewer,target.id)
  await inspect(viewer,target.id,404)
  await sharing(target,second,true)
  for(const body of [{confirmed:false},{},{confirmed:true,source:{kind:'global_profile'}},
    {confirmed:true,blocker_user_id:stranger.id}]) {
    await http(viewer,'/api/me/blocks/'+target.id,'PUT',body,400)
  }
  await http(viewer,'/api/profiles/'+target.id+'?source_id='+first,'GET',undefined,400)
  for(const path of ['/api/profiles','/api/profiles/'+target.id,'/api/me/blocks']) await http(null,path,'GET',undefined,401)
  await http(null,'/api/me/blocks/'+target.id,'PUT',{confirmed:true},401)
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
  await block(target,viewer.id)
  assert.ok((await search(viewer)).rows.some(row=>row.user_id===target.id))
  await withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    assert.deepEqual((await sql`select user_id from public.user_account_profiles where user_id=${target.id}`.execute(tx)).rows,[{user_id:target.id}])
    assert.deepEqual((await sql`select blocker_user_id,blocked_user_id from public.user_account_blocks`.execute(tx)).rows,[{blocker_user_id:target.id,blocked_user_id:viewer.id}])
    assert.equal((await sql`delete from public.user_account_blocks where blocker_user_id=${target.id}`.execute(tx)).numAffectedRows,0n)
  })
  await withEligibleActorTransaction(db,{actorId:stranger.id,requestId:randomUUID()},async tx=>{
    assert.deepEqual((await sql`select blocked_user_id from public.user_account_blocks`.execute(tx)).rows,[])
  })
  await unblock(target,viewer.id)
  await assert.rejects(runBlockWriteWithHook(endpoint.href, { actorId: viewer.id, requestId: randomUUID() },
    target.id, 'blockUser', client => client.query("do $$ begin raise exception 'injected block rollback'; end $$")),
    error => error.code === 'P0001' && error.message === 'injected block rollback')
  assert.deepEqual((await list(viewer)).rows, [])
  assert.equal((await inspect(viewer,target.id)).user_id,target.id)
  // The trusted runtime can write its own row. Roll back the storage probe.
  await assert.rejects(withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    await sql`insert into public.user_account_blocks(blocked_user_id) values(${target.id})`.execute(tx)
    throw Error('trusted writer rollback')
  }),/trusted writer rollback/)
  await assert.rejects(withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    await sql`insert into public.user_account_blocks(blocker_user_id,blocked_user_id) values(${stranger.id},${target.id})`.execute(tx)
  }),error=>error.code==='42501')
  await withEligibleActorTransaction(db, { actorId: viewer.id, requestId: randomUUID() },async tx=>{
    assert.equal((await sql`update public.user_account_profiles set bio='Bypass' where user_id=${target.id}`.execute(tx)).numAffectedRows,0n)
  })
  // Locking a profile preference must not delay creating the block.
  await admin.query('begin')
  try {
    await admin.query('update public.user_accounts set user_is_discoverable=false where user_id=$1',[target.id])
    await block(viewer,target.id)
  } finally {await admin.query('rollback')}
  await unblock(viewer,target.id)

  // The same unordered pair serializes block and unblock in both orders.
  async function waitForPair(holder) {
    const deadline=Date.now()+1800
    while(!(await admin.query(`select exists(select from pg_stat_activity
      where wait_event_type='Lock' and wait_event='advisory' and $1=any(pg_blocking_pids(pid))) as waiting`,[holder])).rows[0].waiting) {
      assert.ok(Date.now()<deadline,'opposing write must wait for the pair lock')
      await new Promise(resolve=>setTimeout(resolve,10))
    }
  }
  const held=holdBlockWrite(endpoint.href,{actorId:viewer.id,requestId:randomUUID()},target.id,'blockUser')
  let removing
  try {
    const holder=await Promise.race([held.started,held.result.then(()=>{throw Error('block ended before barrier')})])
    removing=unblock(viewer,target.id)
    removing.catch(()=>{})
    await waitForPair(holder)
  } finally {held.release();await Promise.allSettled([held.result,removing])}
  assert.deepEqual(await held.result,{blocked:true})
  assert.deepEqual(await removing,{blocked:false})
  assert.deepEqual((await list(viewer)).rows,[])

  await block(viewer,target.id)
  const removeFirst=holdBlockWrite(endpoint.href,{actorId:viewer.id,requestId:randomUUID()},target.id,'unblockUser')
  let adding
  try {
    const holder=await Promise.race([removeFirst.started,removeFirst.result.then(()=>{throw Error('unblock ended before barrier')})])
    adding=block(viewer,target.id)
    adding.catch(()=>{})
    await waitForPair(holder)
  } finally {removeFirst.release();await Promise.allSettled([removeFirst.result,adding])}
  assert.deepEqual(await removeFirst.result,{blocked:false})
  assert.deepEqual(await adding,{blocked:true})
  assert.equal((await list(viewer)).rows[0].blocked_user_id,target.id)
  await unblock(viewer,target.id)

  await prefs(target,true)
  // A read already admitted by its statement may finish; the next read withholds details.
  let release,ready
  const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{ready=resolve})
  const profileReads = new Set()
  const pausedDb = db.withPlugin({
    transformQuery({node,queryId}) {
      if (node.kind === 'RawNode' && node.sqlFragments.some(fragment=>fragment.includes('from public.user_account_profiles p'))) profileReads.add(queryId)
      return node
    },
    async transformResult({result,queryId}) {
      if (profileReads.delete(queryId)) { ready();await gate }
      return result
    },
  })
  const read=readGlobalProfile(pausedDb,{actorId:viewer.id,requestId:randomUUID()},target.id)
  await Promise.race([started,read.then(()=>{throw Error('read ended before barrier')})])
  try {await block(target,viewer.id)} finally {release()}
  const readResult=await read
  assert.equal(readResult.user_id,target.id)
  assert.deepEqual(await inspect(viewer,target.id),withheld);await unblock(target,viewer.id)
  await prefs(target,false);await sharing(target,second,true)
  await sharing(target,second,false);await inspect(viewer,target.id,404)
  await prefs(target,true);await prefs(target,false);await inspect(viewer,target.id,404)
  await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[viewer.id])
  await inspect(viewer,viewer.id,403);await search(viewer,prefix,'',403);await list(viewer,'',403)
  await block(viewer,target.id,403)
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
  assert.deepEqual(await search(viewer,bulkName,'&limit=100&cursor='+maxPage.next),tail)
  await unblock(viewer,blockedLater)
  for(const id of bulkUsers) await block(viewer,id)
  const ownDefault=await list(viewer),ownMax=await list(viewer,'?limit=100')
  assert.equal(ownDefault.rows.length,50);assert.equal(ownMax.rows.length,100)
  const ownTail=await list(viewer,'?limit=100&cursor='+ownMax.next)
  assert.equal(ownTail.rows.length,2);assert.equal(ownTail.next,null)
  assert.equal(new Set([...ownMax.rows,...ownTail.rows].map(row=>row.blocked_user_id)).size,102)
  assert.deepEqual((await search(viewer,bulkName)).rows,defaultPage.rows)
  assert.equal((await search(owner,bulkName)).rows.length,50)
  await list(owner,'?cursor='+ownMax.next,400)
  console.log('PASS global discovery vs exact consent, OR sharing and lifecycle boundaries, literal search/pages, bilateral profile withholding, independent lists, account-ID confirmation and pair locks, attribution/idempotence/rollback, snapshot revocation and REST/GraphQL/runtime bypasses')

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
