import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withEligibleActorTransaction, connectDatabase } from '../src/database.ts'
import { readMemberDirectory, readPublicDirectory } from '../src/communities/service.ts'
import { directoryCursors } from '../src/directory-cursors.ts'
import { buildApi } from '../src/app.ts'
import { verifyBearer } from '../src/token-verifier.ts'
import { localStack } from '../../supabase/tests/local-stack.mjs'

const local = localStack()
const endpoint = new URL(process.env.DATABASE_URL)
assert.equal(endpoint.host, new URL(local.DB_URL).host)
assert.equal(endpoint.pathname, '/postgres')
const db = connectDatabase(endpoint.href)
const cursorKey=randomBytes(32).toString('hex'), cursors=directoryCursors(cursorKey)
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
  await admin.connect()
  base=await app.listen({host:'127.0.0.1',port:0})
  assert.equal((await fetch(base+'/health/ready')).status,200)
  const owner=await user(), manager=await user(), member=await user(), pending=await user(), suspended=await user(), inactive=await user(),
    paused=await user(), revoked=await user(), missing=await user(), outsider=await user()
  const tenant=await community(owner), otherTenant=await community(outsider)
  const slug=(await admin.query('select slug from public.tenants where id=$1',[tenant])).rows[0].slug
  const otherSlug=(await admin.query('select slug from public.tenants where id=$1',[otherTenant])).rows[0].slug
  const path='/api/communities/'+tenant
  const cmd=(actor,body,status=200)=>http(actor,path+'/commands','POST',body,status)
  const directory=(actor,query='',status=200)=>http(actor,path+'/directory'+query,'GET',undefined,status)
  const accounts=(actor,query='',status=200)=>http(actor,path+'/accounts'+query,'GET',undefined,status)
  const facts=(actor,target,status=200)=>http(actor,path+'/accounts/'+target,'GET',undefined,status)
  const publicDirectory=(actor=null,query='',status=200,handle=slug)=>http(actor,'/api/public/communities/'+handle+'/directory'+query,'GET',undefined,status)
  const config=(body)=>http(owner,path+'/settings','PATCH',body)
  const join={kind:'join',profile:{displayName:'Same name',bio:'Private biography'}}
  await cmd(pending,join)
  await config({auto_approve_users:true})
  for(const actor of [manager,member,suspended,inactive,paused,revoked,missing]) await cmd(actor,join)
  for(const actor of [manager,paused,revoked]) await cmd(owner,{kind:'grant',target:actor.id})
  await cmd(owner,{kind:'permissions',target:manager.id,permissions:{can_grant_staff:true,can_discipline_users:true}})
  await cmd(owner,{kind:'suspend',target:suspended.id,revision:(await http(owner,path+'/accounts/'+suspended.id+'/review')).revision,reason:'Private disciplinary reason'})
  await cmd(inactive,{kind:'deactivate'})
  await cmd(paused,{kind:'deactivate'});await cmd(paused,{kind:'reactivate'})
  await cmd(owner,{kind:'revoke',target:revoked.id})
  await admin.query('delete from public.community_account_profiles where tenant_id=$1 and user_id=$2',[tenant,missing.id])
  const factKeys=['tenant_id','user_id','standing','first_approved_at','has_disciplinary_restriction','created_at','updated_at','created_by','updated_by'].sort()
  const profileKeys=['tenant_id','user_id','display_name','bio','created_at','updated_at','created_by','updated_by'].sort()
  const expected=[owner,manager,member,suspended,paused,revoked,missing].map(a=>a.id).sort()
  for(const actor of [owner,manager,member,suspended,paused,revoked]) {
    const page=await directory(actor)
    assert.deepEqual(page.rows.map(r=>r.account.user_id),expected);assert.equal(page.next,null)
    for(const row of page.rows) {
      assert.deepEqual(Object.keys(row).sort(),['account','profile','staff_role'])
      assert.deepEqual(Object.keys(row.account).sort(),factKeys)
      if(row.profile) assert.deepEqual(Object.keys(row.profile).sort(),profileKeys)
      assert.equal(row.staff_role,row.account.user_id===owner.id?'owner':row.account.user_id===manager.id?'admin':null)
    }
    assert.equal(page.rows.find(r=>r.account.user_id===missing.id).profile,null)
    assert.equal(page.rows.find(r=>r.account.user_id===suspended.id).account.has_disciplinary_restriction,true)
    assert.deepEqual(Object.keys(await facts(actor,inactive.id)).sort(),factKeys)
    assert.equal((await http(actor,path+'/accounts/'+inactive.id+'/profile')).user_id,inactive.id)
  }
  for(const actor of [pending,inactive,outsider]) {
    await directory(actor,'',404);await facts(actor,member.id,404)
    await http(actor,path+'/accounts/'+member.id+'/profile','GET',undefined,404)
  }
  for(const actor of [pending,inactive,suspended]) assert.equal((await facts(actor,actor.id)).user_id,actor.id)
  for(const actor of [member,manager,suspended]) await facts(actor,pending.id,404)
  assert.equal((await facts(owner,pending.id)).standing,'pending')
  assert.equal((await accounts(owner)).rows.length,9)
  for(const actor of [manager,member,pending,inactive,outsider]) await accounts(actor,'',404)
  await facts(owner,outsider.id,404);await facts(owner,randomUUID(),404)
  await http(owner,'/api/communities/'+otherTenant+'/accounts/'+outsider.id,'GET',undefined,404)
  await http(owner,'/api/communities/'+otherTenant+'/directory','GET',undefined,404)
  for(const endpoint of ['/directory','/accounts','/accounts/'+member.id]) await http(null,path+endpoint,'GET',undefined,401)
  // The public flag is independent of authorized member reads and other public flags.
  await publicDirectory(null,'',404)
  await config({allow_public_chat_visibility:true,allow_public_activity_visibility:true})
  await publicDirectory(null,'',404)
  await config({allow_public_chat_visibility:false,allow_public_activity_visibility:false,allow_public_directory_visibility:true})
  const publicPage=await publicDirectory()
  assert.equal(publicPage.rows.length,6)
  assert.equal(publicPage.rows.filter(r=>r.staff_role==='owner').length,1)
  assert.equal(publicPage.rows.filter(r=>r.staff_role==='admin').length,1)
  for(const row of publicPage.rows) assert.deepEqual(Object.keys(row).sort(),['display_name','staff_role'])
  for(const actor of [owner,member,pending,inactive,outsider]) assert.deepEqual(await publicDirectory(actor),publicPage)
  await publicDirectory({token:'invalid'},'',401)
  await publicDirectory(null,'',404,'missing-'+randomUUID())
  await publicDirectory(null,'',400,'wild%25')
  await publicDirectory(null,'?user_id='+member.id,400)
  await publicDirectory(null,'?limit=101',400);await directory(owner,'?limit=0',400)
  await directory(owner,'?standing=inactive',400);await facts(owner,'not-a-uuid',400)
  for(const [read,count] of [[q=>directory(owner,q),7],[q=>accounts(owner,q),9],[q=>publicDirectory(null,q),6]]) {
    let next=null,seen=[]
    do {
      const page=await read('?limit=1'+(next?'&cursor='+next:''))
      assert.equal(page.rows.length,1);seen.push(...page.rows);next=page.next
    } while(next)
    assert.equal(seen.length,count)
    assert.deepEqual(seen,(await read('')).rows)
  }
  const memberCursor=(await directory(owner,'?limit=1')).next
  await directory(member,'?cursor='+memberCursor,400)
  await accounts(owner,'?cursor='+memberCursor,400)
  await publicDirectory(null,'?cursor='+memberCursor,400)
  const publicCursor=(await publicDirectory(null,'?limit=1')).next
  assert.equal(Buffer.from(publicCursor,'base64url').length,64)
  assert.ok(!Buffer.from(publicCursor,'base64url').toString().includes(expected[0]))
  await publicDirectory(null,'?cursor='+publicCursor,400,otherSlug)
  await publicDirectory(null,'?cursor='+publicCursor.slice(0,20)+(publicCursor[20]==='A'?'B':'A')+publicCursor.slice(21),400)
  await publicDirectory(null,'?cursor='+Buffer.from(member.id).toString('base64url'),400)
  assert.equal(directoryCursors(cursorKey).decode(['public-directory',slug],publicCursor),cursors.decode(['public-directory',slug],publicCursor))
  assert.throws(()=>directoryCursors(randomBytes(32).toString('hex')).decode(['public-directory',slug],publicCursor),/invalid_cursor/)
  assert.throws(()=>directoryCursors('invalid'),/DIRECTORY_CURSOR_KEY/)
  // No preferences or participant/staff permissions become directory fields.
  await http(member,path+'/me/preferences','PATCH',{show_global_profile:false,allow_direct_messages:false,allow_private_invitations:false})
  assert.equal((await directory(member)).rows.length,7)
  await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[member.id])
  await directory(member,'',403);await facts(member,member.id,403)
  await admin.query('update auth.users set banned_until=null where id=$1',[member.id])
  const anonymous=createClient(local.API_URL,local.ANON_KEY,authOptions)
  for(const client of [anonymous,owner.client,member.client]) {
    assert.equal((await client.from('community_accounts').select('*')).error?.code,'42501')
    assert.ok((await client.from('community_accounts').select('tenant_id,community_account_profiles(*)')).error)
    assert.ok((await client.schema('app_private').rpc('public_community_directory',{p_slug:slug,p_after:null,p_limit:50})).error)
  }
  await admin.query('begin')
  try {
    await admin.query('create extension if not exists pg_graphql');await admin.query('set local role authenticated')
    await admin.query("select set_config('request.jwt.claim.sub',$1,true)",[owner.id])
    const resolve=async q=>(await admin.query('select graphql.resolve($1) as result',[q])).rows[0].result
    assert.equal((await resolve('{__typename}')).data.__typename,'Query')
    assert.ok((await resolve('{community_accountsCollection{edges{node{user_id standing}}}}')).errors?.length)
  } finally {await admin.query('rollback')}

  // Empty and missing-profile directories do not confuse unavailable with empty.
  await http(outsider,'/api/communities/'+otherTenant+'/settings','PATCH',{allow_public_directory_visibility:true})
  await admin.query('delete from public.community_account_profiles where tenant_id=$1',[otherTenant])
  assert.deepEqual(await publicDirectory(null,'',200,otherSlug),{rows:[],next:null})
  const bulkTenant=await community(owner)
  bulkUsers.push(...Array.from({length:102},()=>randomUUID()))
  await admin.query('begin')
  try {
    await admin.query("insert into auth.users(id,email,email_confirmed_at) select id,id::text||'@example.test',now() from unnest($1::uuid[]) id",[bulkUsers])
    await admin.query("insert into public.community_accounts(tenant_id,user_id,standing) select $1,id,'approved' from unnest($2::uuid[]) id",[bulkTenant,bulkUsers])
    for(const relation of ['community_account_preferences','community_account_permissions']) {
      await admin.query('insert into public.'+relation+'(tenant_id,user_id) select $1,id from unnest($2::uuid[]) id',[bulkTenant,bulkUsers])
    }
    await admin.query("insert into public.community_account_profiles(tenant_id,user_id,display_name) select $1,id,'Duplicate name' from unnest($2::uuid[]) id",[bulkTenant,bulkUsers])
    await admin.query('commit')
  } catch(error) {await admin.query('rollback');throw error}
  await http(owner,'/api/communities/'+bulkTenant+'/settings','PATCH',{allow_public_directory_visibility:true})
  const bulkSlug=(await admin.query('select slug from public.tenants where id=$1',[bulkTenant])).rows[0].slug
  for(const endpoint of ['/api/communities/'+bulkTenant+'/directory','/api/communities/'+bulkTenant+'/accounts','/api/public/communities/'+bulkSlug+'/directory']) {
    const actor=endpoint.startsWith('/api/public/')?null:owner
    const first=await http(actor,endpoint), maximum=await http(actor,endpoint+'?limit=100')
    assert.equal(first.rows.length,50);assert.ok(first.next)
    assert.equal(maximum.rows.length,100);assert.ok(maximum.next)
    const rest=await http(actor,endpoint+'?limit=100&cursor='+maximum.next)
    assert.equal(rest.rows.length,3);assert.equal(rest.next,null)
    if(actor) assert.equal(new Set([...maximum.rows,...rest.rows].map(row=>row.user_id??row.account.user_id)).size,103)
    else assert.equal([...maximum.rows,...rest.rows].filter(row=>row.display_name==='Duplicate name').length,102)
  }
  await assert.rejects(sql`select app_private.public_community_directory(${slug},null,101)`.execute(db),error=>error.code==='22023')
  assert.equal((await sql`select app_private.public_community_directory('wild%',null,1) as rows`.execute(db)).rows[0].rows,null)
  async function afterLockedChange(change,compete) {
    await admin.query('begin')
    let response
    try {
      await admin.query('select id from public.tenants where id=$1 for update',[tenant])
      await change()
      response=compete();response.catch(()=>{})
      const deadline=Date.now()+1800
      while(!(await admin.query("select exists(select from pg_stat_activity where usename='ct_api' and pg_backend_pid()=any(pg_blocking_pids(pid))) as waiting")).rows[0].waiting) {
        assert.ok(Date.now()<deadline,'configuration operation must wait for current authority')
        await new Promise(resolve=>setTimeout(resolve,10))
      }
      await admin.query('commit')
    } finally {await admin.query('rollback')}
    return response
  }


  await afterLockedChange(
    ()=>admin.query('update public.tenant_settings set allow_public_directory_visibility=false where tenant_id=$1',[tenant]),
    ()=>publicDirectory(null,'?cursor='+publicCursor,404))
  assert.equal((await directory(member)).rows.length,7)
  await config({allow_public_directory_visibility:true})
  const savedCursor=(await directory(member,'?limit=1')).next
  await afterLockedChange(
    ()=>admin.query("update public.community_accounts set standing='inactive' where tenant_id=$1 and user_id=$2",[tenant,member.id]),
    ()=>directory(member,'?cursor='+savedCursor,404))
  assert.equal((await facts(member,member.id)).standing,'inactive')
  await cmd(member,{kind:'reactivate'})
  await afterLockedChange(
    ()=>admin.query("update public.tenants set operational_status='archived' where id=$1",[tenant]),
    ()=>publicDirectory(null,'',404))
  await directory(owner,'',404)
  for(const actor of [manager,member,pending,inactive,suspended]) {
    await directory(actor,'',404);await facts(actor,actor.id,404);await accounts(actor,'',404)
  }
  assert.equal((await accounts(owner)).rows.length,9)
  assert.equal((await facts(owner,inactive.id)).standing,'inactive')
  assert.equal((await http(owner,path+'/accounts/'+inactive.id+'/profile')).user_id,inactive.id)
  // The archived-owner branch must stay inside the exact tenant/target filter.
  for(const target of [owner,manager,member,pending,suspended,inactive,paused,revoked]) {
    const archivedProfile=await http(owner,path+'/accounts/'+target.id+'/profile')
    assert.equal(archivedProfile.user_id,target.id);assert.equal(archivedProfile.tenant_id,tenant)
  }
  for(const target of [missing,outsider,{id:randomUUID()}]) {
    await http(owner,path+'/accounts/'+target.id+'/profile','GET',undefined,404)
  }
  assert.equal((await withEligibleActorTransaction(db, { actorId: member.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    assert.deepEqual((await sql`select user_id from public.community_accounts where tenant_id=${tenant}`.execute(tx)).rows,[])
    assert.deepEqual((await sql`select user_id from public.community_account_profiles where tenant_id=${tenant}`.execute(tx)).rows,[])
  })).eligible, true)
  await cmd(owner,{kind:'archive',archived:false})
  // Once admitted, a page finishes before a gate/standing change can commit.
  async function admittedRead(read,compete,actor) {
    let release,ready
    const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{ready=resolve})
    const work=async tx=>{
      const result=await read(tx)
      ready((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
      await gate;return result
    }
    const operation=actor?withEligibleActorTransaction(db, { actorId: actor.id, requestId: randomUUID() },work):db.transaction().execute(work)
    const holder=await Promise.race([started,operation.then(()=>{throw Error('read exited before barrier')})])
    const change=compete();change.catch(()=>{})
    try {
      const deadline=Date.now()+1800
      while(!(await admin.query('select exists(select from pg_stat_activity where $1=any(pg_blocking_pids(pid))) as waiting',[holder])).rows[0].waiting) {
        assert.ok(Date.now()<deadline,'gate change must wait for admitted directory read')
        await new Promise(resolve=>setTimeout(resolve,10))
      }
    } finally {release()}
    const result=await operation;await change
    if (actor) { assert.equal(result.eligible,true);return result.value }
    return result
  }
  assert.equal((await admittedRead(tx=>readPublicDirectory(tx,slug,{},cursors),
    ()=>config({allow_public_directory_visibility:false}))).rows.length,6)
  await publicDirectory(null,'',404)
  assert.equal((await admittedRead(tx=>readMemberDirectory(tx,member.id,tenant,{},cursors),
    ()=>cmd(member,{kind:'deactivate'}),member)).rows.length,7)
  await directory(member,'',404)
  console.log('PASS member/public directories, exact and owner account facts, safe field/badge projections, opaque cursor boundaries and tampering, full page limits, lifecycle and archive gates, raw bypasses and both read/change serialization orders')

} finally {
  try {
    await admin.query('begin')
    await admin.query('set local session_replication_role=replica')
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
