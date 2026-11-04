import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { readFileSync } from 'node:fs'
import { accessCatalog } from '../../supabase/tests/access-catalog.mjs'
import { buildApi } from '../src/app.ts'
import { connectDatabase } from '../src/database.ts'
import { verifyBearer } from '../src/auth.ts'
import { localStack } from '../../supabase/tests/local-stack.mjs'

const local = localStack()
const endpoint = new URL(process.env.DATABASE_URL)
assert.equal(endpoint.host, new URL(local.DB_URL).host)
assert.equal(endpoint.pathname, '/postgres')
const db = connectDatabase(endpoint.href)
const app = buildApi(db, verifyBearer(local.API_URL, local.ANON_KEY, local.issuer), randomBytes(32).toString('hex'))
const admin = new pg.Client({ connectionString: local.DB_URL })
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const authAdmin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, authOptions).auth.admin
const users = [], tenants = []
const privileged=createClient(local.API_URL,local.SERVICE_ROLE_KEY,authOptions)
const bucket='ct-access-audit-'+randomUUID()
let bucketCreated=false
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
  const catalog=await accessCatalog(admin)
  assert.deepEqual(catalog.runtime,JSON.parse(readFileSync(new URL('../access-runtime-manifest.json',import.meta.url),'utf8')),'runtime privilege drift requires review')
  assert.deepEqual(catalog.external_relation_grants,[]);assert.deepEqual(catalog.external_function_grants,[])
  assert.ok(catalog.relations.every(r=>r.owner==='postgres'&&r.rls))
  assert.ok(catalog.functions.every(f=>f.owner==='postgres'&&f.config?.includes('search_path=""')))
  assert.deepEqual(catalog.role,[{rolname:'ct_api',rolcanlogin:true,rolinherit:false,rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolbypassrls:false}])
  assert.ok(catalog.memberships.every(m=>m.member==='postgres'&&m.role==='ct_api'))
  assert.ok(catalog.publications.every(p=>!p.puballtables&&p.tables.every(t=>!t.startsWith('public.')&&!t.startsWith('app_private.'))))
  assert.deepEqual(catalog.platform_policies,[])
  assert.ok(catalog.schema_permissions.every(s=>!s.create && (s.nspname!=='app_private'||s.rolname==='ct_api'||!s.usage)))
  await assert.rejects(sql`select email from auth.users`.execute(db),error=>error.code==='42501')
  await assert.rejects(db.transaction().execute(tx=>sql`set local role postgres`.execute(tx)),error=>error.code==='42501')
  const owner=await user(),member=await user(),outsider=await user()
  const tenant=await community(owner),path='/api/communities/'+tenant
  const cmd=(actor,body,status=200)=>http(actor,path+'/commands','POST',body,status)
  const own=(actor,status=200)=>http(actor,path+'/me/request','GET',undefined,status)
  assert.deepEqual(await own(owner),{request:null})
  await own(outsider,404);await own(null,401)
  const joined=await cmd(member,{kind:'join',profile:{displayName:'Pending audit',bio:'Not a queue field'}})
  const request=(await own(member)).request
  assert.deepEqual(Object.keys(request).sort(),['kind','request_id','requested_at'])
  assert.equal(request.request_id,joined.requestId);assert.equal(request.kind,'join');assert.ok(Number.isFinite(Date.parse(request.requested_at)))
  await http(member,path+'/me/request?userId='+owner.id,'GET',undefined,400)
  const queued=(await http(owner,path+'/requests')).rows[0]
  assert.deepEqual(Object.keys(queued).sort(),['display_name','first_approved_at','has_disciplinary_restriction','id','kind','requested_at','revision','standing','user_id'])
  const reviewed=await http(owner,path+'/accounts/'+member.id+'/review')
  assert.deepEqual(Object.keys(reviewed).sort(),['request_id','revision','standing']);assert.equal(reviewed.request_id,null)
  const candidates=(await http(owner,path+'/staff-candidates')).rows
  assert.ok(candidates.length);assert.deepEqual(Object.keys(candidates[0]).sort(),['display_name','staff_role','staff_status','standing','tenant_id','user_id'])
  await cmd(owner,{kind:'archive',archived:true});await own(owner,404);await own(member,404)
  await cmd(owner,{kind:'archive',archived:false});assert.equal((await own(member)).request.request_id,request.request_id)
  await cmd(member,{kind:'withdraw',requestId:request.request_id});assert.deepEqual(await own(member),{request:null})
  await cmd(owner,{kind:'remove',target:member.id,revision:(await http(owner,path+'/accounts/'+member.id+'/review')).revision})
  const returning=await cmd(member,{kind:'reactivate'})
  assert.equal((await own(member)).request.kind,'reactivation');assert.equal((await own(member)).request.request_id,returning.requestId)
  await cmd(owner,{kind:'clear',target:member.id,revision:(await http(owner,path+'/accounts/'+member.id+'/review')).revision})
  assert.deepEqual(await own(member),{request:null})
  const reapplied=await cmd(member,{kind:'reactivate'})
  assert.equal((await own(member)).request.kind,'join');assert.notEqual(reapplied.requestId,request.request_id)
  // Probe every current application relation through the actual gateway roles.
  for(const [name,key,token] of [['anon',local.ANON_KEY,local.ANON_KEY],['authenticated',local.ANON_KEY,owner.token],['service_role',local.SERVICE_ROLE_KEY,local.SERVICE_ROLE_KEY]]) {
    const headers={apikey:key,Authorization:'Bearer '+token}
    for(const relation of catalog.relations.filter(r=>r.relation.startsWith('public.'))) {
      const response=await fetch(local.API_URL+'/rest/v1/'+relation.relation.slice(7)+'?select=*&limit=0',{headers})
      assert.ok(!response.ok,name+' read bypass on '+relation.relation)
      assert.equal((await response.json()).code,'42501')
    }
    const privateRead=await fetch(local.API_URL+'/rest/v1/community_account_requests?select=*&limit=0',{headers:{...headers,'Accept-Profile':'app_private'}})
    assert.equal(privateRead.status,406)
    const openapi=await fetch(local.API_URL+'/rest/v1/',{headers:{...headers,Accept:'application/openapi+json'}})
    assert.equal(openapi.status,200)
    assert.ok(Object.keys((await openapi.json()).paths).every(p=>p==='/'),name+' OpenAPI leaked callable application objects')
  }
  await admin.query('begin')
  try {
    await admin.query('create extension if not exists pg_graphql');await admin.query('set local role authenticated')
    await admin.query("select set_config('request.jwt.claim.sub',$1,true)",[owner.id])
    const resolve=async q=>(await admin.query('select graphql.resolve($1) as result',[q])).rows[0].result
    assert.equal((await resolve('{__typename}')).data.__typename,'Query')
    for(const relation of catalog.relations.filter(r=>r.relation.startsWith('public.'))) {
      const table=relation.relation.slice(7)
      assert.ok((await resolve('{'+table+'Collection{edges{node{__typename}}}}')).errors?.length,'GraphQL exposed '+table)
    }
  } finally {await admin.query('rollback')}
  // A private fixture proves Storage denial against an object that really exists.
  assert.ifError((await privileged.storage.createBucket(bucket,{public:false})).error);bucketCreated=true
  assert.ifError((await privileged.storage.from(bucket).upload('private.txt','private audit fixture',{contentType:'text/plain'})).error)
  const anonymous=createClient(local.API_URL,local.ANON_KEY,authOptions)
  for(const client of [anonymous,owner.client]) {
    assert.ok((await client.storage.from(bucket).download('private.txt')).error)
    assert.ok((await client.storage.from(bucket).upload('forbidden.txt','not admitted')).error)
    const listing=await client.storage.from(bucket).list()
    assert.ok(listing.error||listing.data.length===0)
  }
  const publicUrl=anonymous.storage.from(bucket).getPublicUrl('private.txt').data.publicUrl
  assert.ok(!(await fetch(publicUrl)).ok)
  // No private realtime policy admits this otherwise valid authenticated caller.
  await owner.client.realtime.setAuth(owner.token)
  const channel=owner.client.channel('ct-audit-'+randomUUID(),{config:{private:true}})
  try {
    const status=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Realtime admission did not complete')),8000)
      channel.subscribe(value=>{if(['SUBSCRIBED','CHANNEL_ERROR','TIMED_OUT'].includes(value)){clearTimeout(timer);resolve(value)}})
    })
    assert.equal(status,'CHANNEL_ERROR','private realtime join must be explicitly denied, not merely time out')
  } finally {await owner.client.removeChannel(channel);owner.client.realtime.disconnect()}
  // Real signup, provisioning, confirmation and recovery token exchanges remain
  // independent of the sealed Data API. Links are generated by local Auth admin;
  // this does not claim browser callback or external SMTP delivery verification.
  const email=randomUUID()+'@example.test',password=randomUUID(),authClient=createClient(local.API_URL,local.ANON_KEY,authOptions)
  const signup=await authClient.auth.signUp({email,password})
  assert.ifError(signup.error);assert.ok(signup.data.user);users.push(signup.data.user.id);assert.equal(signup.data.session,null)
  assert.equal((await admin.query('select count(*)::int n from public.user_accounts where user_id=$1',[signup.data.user.id])).rows[0].n,1)
  const confirmation=await authAdmin.generateLink({type:'signup',email,password})
  assert.ifError(confirmation.error)
  const verified=await authClient.auth.verifyOtp({type:'signup',token_hash:confirmation.data.properties.hashed_token})
  assert.ifError(verified.error);assert.ok(verified.data.session)
  const actor={id:signup.data.user.id,token:verified.data.session.access_token}
  assert.equal(typeof (await http(actor,'/api/me/preferences')).user_is_discoverable,'boolean')
  assert.ifError((await authClient.auth.resetPasswordForEmail(email)).error)
  const recovery=await authAdmin.generateLink({type:'recovery',email})
  assert.ifError(recovery.error)
  assert.ifError((await authClient.auth.verifyOtp({type:'recovery',token_hash:recovery.data.properties.hashed_token})).error)
  const nextPassword=randomUUID()
  assert.ifError((await authClient.auth.updateUser({password:nextPassword})).error)
  const signedIn=await createClient(local.API_URL,local.ANON_KEY,authOptions).auth.signInWithPassword({email,password:nextPassword})
  assert.ifError(signedIn.error);assert.ok(signedIn.data.session)
  console.log('PASS exact runtime privilege manifest, caller/definer/owner boundaries, own join/return projection and fixed response fields, all-relation REST/OpenAPI/GraphQL lockout, private Storage/Realtime denials, Auth signup/provisioning/confirmation/recovery')

} finally {
  try {
    if(bucketCreated) {
      assert.ifError((await privileged.storage.from(bucket).remove(['private.txt'])).error)
      assert.ifError((await privileged.storage.deleteBucket(bucket)).error)
    }
    await admin.query('begin')
    await admin.query('set local session_replication_role=replica')
    await admin.query('delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id=any($1::uuid[]))',[tenants])
    await admin.query('delete from app_private.community_account_requests where tenant_id=any($1::uuid[])',[tenants])
    for (const table of ['community_account_permissions','community_account_preferences','tenant_admin_actions','tenant_website_content_overrides','community_account_profiles','community_accounts','tenant_staff_assignments','tenant_settings']) {
      await admin.query('delete from public.' + table + ' where tenant_id=any($1::uuid[])', [tenants])
    }
    await admin.query('delete from public.tenants where id=any($1::uuid[])', [tenants])
    await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])', [users])
    await admin.query('commit')
    for (const id of users) assert.ifError((await authAdmin.deleteUser(id)).error)
  } finally { await app.close(); await admin.end() }
}
