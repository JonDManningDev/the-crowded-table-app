import { directoryCursors } from '../src/directory-cursors.ts'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withEligibleActorTransaction } from '../src/actor-transaction.ts'
import { configurationDetails, configurationSettings, configurationCopy } from '../src/communities/service.ts'
import { copySlots } from '../src/communities/community-configuration.ts'
import { buildApi } from '../src/app.ts'
import { connectDatabase } from '../src/database.ts'
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
  const owner=await user(), settings=await user(), editor=await user(), member=await user(), pending=await user(), outsider=await user()
  const tenant=await community(owner), otherTenant=await community(outsider)
  const slug=(await admin.query('select slug from public.tenants where id=$1',[tenant])).rows[0].slug
  const path='/api/communities/'+tenant
  const cmd=(actor,body,status=200)=>send(actor,path+'/commands',body,status)
  const details=(actor,body,status=200)=>http(actor,path+'/details',body?'PATCH':'GET',body,status)
  const config=(actor,body,status=200)=>http(actor,path+'/settings',body?'PATCH':'GET',body,status)
  const copy=(actor,key,text,status=200)=>http(actor,path+'/copy'+(key?'/'+encodeURIComponent(key):''),key?(text===undefined?'DELETE':'PUT'):'GET',text===undefined?undefined:{text_value:text},status)
  const landing=(actor=null,handle=slug,status=200)=>http(actor,'/api/public/communities/'+handle,'GET',undefined,status)
  const join={kind:'join',profile:{displayName:'Configuration fixture',bio:null}}
  const requested=await cmd(pending,join)
  await config(owner,{auto_approve_users:true})
  assert.equal((await send(pending,path+'/accounts/'+pending.id+'/review')).request_id,requested.requestId)
  for(const actor of [settings,editor,member]) await cmd(actor,join)
  for(const actor of [settings,editor]) await cmd(owner,{kind:'grant',target:actor.id})
  await cmd(owner,{kind:'permissions',target:settings.id,permissions:{can_manage_settings:true}})
  await cmd(owner,{kind:'permissions',target:editor.id,permissions:{can_modify_content:true}})
  await cmd(owner,{kind:'auto-approval',enabled:false},400)

  for(const actor of [owner,settings,editor,member]) {
    assert.equal((await details(actor)).id,tenant)
    assert.equal((await config(actor)).tenant_id,tenant)
    assert.deepEqual(await copy(actor),{rows:[]})
  }
  for(const actor of [pending,outsider]) {
    await details(actor,undefined,404);await config(actor,undefined,404);await copy(actor,undefined,undefined,404)
  }
  await http(null,path+'/details','GET',undefined,401)
  await http(owner,'/api/communities/'+otherTenant+'/details','GET',undefined,404)
  await details(member,{name:'Unauthorized'},403)
  await details(settings,{name:'Not ownership'},403)
  await config(editor,{auto_approve_users:false},403)
  await copy(settings,'community.hero.heading','No content flag',403)
  const changed=await details(owner,{name:'  Updated Community  ',city:'  ',state_province:'  Region  ',country_code:'GT',timezone:'America/Guatemala'})
  assert.equal(changed.name,'Updated Community');assert.equal(changed.city,null);assert.equal(changed.state_province,'Region')
  assert.equal(changed.created_by,owner.id);assert.equal(changed.updated_by,owner.id);assert.equal(changed.slug,slug)
  for(const bad of [{},{slug:'changed'},{id:otherTenant},{operational_status:'archived'},{created_by:outsider.id},{name:' '},{country_code:'ZZ'},{timezone:'Not/AZone'}]) await details(owner,bad,400)
  for(const bad of [{},{tenant_id:otherTenant},{auto_approve_users:'true'},{operational_status:'archived'}]) await config(owner,bad,400)
  const initial=await config(owner)
  assert.equal(initial.pause_community_events,false)
  for(const flag of ['pause_community_events','allow_public_chat_visibility','allow_public_activity_visibility','allow_public_directory_visibility']) {
    const result=await config(settings,{[flag]:true})
    assert.equal(result[flag],true);assert.equal(result.updated_by,settings.id)
  }
  const privatePause=await config(settings,{pause_community_events:true,allow_public_chat_visibility:false,allow_public_activity_visibility:false,allow_public_directory_visibility:false})
  assert.equal(privatePause.pause_community_events,true)

  for(const [key,max] of Object.entries(copySlots)) {
    const value=key==='community.hero.heading'?'<script>literal text</script>':key.endsWith('eyebrow')?'👋'.repeat(100):'x'.repeat(max)
    const result=await copy(editor,key,value)
    const row=result.rows.find(r=>r.content_key===key)
    assert.equal(row.text_value,value);assert.equal(row.created_by,editor.id);assert.equal(row.updated_by,editor.id)
    assert.equal(row.tenant_id,tenant)
    await copy(editor,key,'x'.repeat(max+1),400)
  }
  await copy(editor,'community.hero.heading','   ',400)
  await copy(editor,'unrecognized.slot','Invalid',400)
  await http(editor,path+'/copy/community.hero.heading','PUT',{text_value:'text',created_by:owner.id},400)
  const publicRow=await landing()
  assert.deepEqual(Object.keys(publicRow).sort(),['id','slug','name','country_code','state_province','city','timezone','auto_approve_users',
    'allow_public_chat_visibility','allow_public_activity_visibility','allow_public_directory_visibility','overrides'].sort())
  assert.equal(publicRow.overrides.length,7)
  assert.ok(publicRow.overrides.every(r=>JSON.stringify(Object.keys(r).sort())===JSON.stringify(['tenant_id','content_key','text_value'].sort())))
  assert.ok(!JSON.stringify(publicRow).includes('pause_community_events'))
  for(const actor of [owner,member,pending,outsider]) assert.deepEqual(await landing(actor),publicRow)
  await landing({token:'invalid'},slug,401)
  await landing(null,'missing-'+randomUUID(),404)
  for(const suffix of ['?select=*','?slug=anything','?limit=100']) await http(null,'/api/public/communities/'+slug+suffix,'GET',undefined,400)
  await landing(null,'wild*card',400)
  assert.equal((await fetch(base+'/api/public/communities')).status,404)

  const count=async()=>(await admin.query('select count(*)::int as n from public.tenant_admin_actions where tenant_id=$1',[tenant])).rows[0].n
  const before=await count()
  await details(owner,{name:'Updated Community'})
  await config(settings,{pause_community_events:true})
  await copy(editor,'community.hero.heading','<script>literal text</script>')
  assert.equal(await count(),before,'unchanged writes must not duplicate audit events')
  await copy(editor,'community.hero.heading')
  await copy(editor,'community.hero.heading',undefined,404)
  assert.equal((await landing()).overrides.length,6)
  const audit=(await admin.query("select action,content_key,created_by,operation_id,details,reason from public.tenant_admin_actions where tenant_id=$1 and action like 'tenant_website_content_overrides.%' order by created_at,id",[tenant])).rows
  assert.equal(audit.length,8)
  assert.ok(audit.every(r=>r.created_by===editor.id&&r.operation_id&&r.reason===null&&JSON.stringify(r.details)==='{}'))
  assert.equal(audit.at(-1).action,'tenant_website_content_overrides.delete')
  assert.ok(!JSON.stringify(audit).includes('literal text'))
  await assert.rejects(withEligibleActorTransaction(db, { actorId: owner.id, requestId: randomUUID() },async tx=>{
    await configurationDetails(tx,owner.id,tenant,{name:'Rollback'})
    await configurationSettings(tx,owner.id,tenant,{pause_community_events:false})
    await configurationCopy(tx,owner.id,tenant,{key:'community.hero.heading',text:'Rollback copy'})
    throw Error('injected rollback')
  }),/injected rollback/)
  assert.equal((await details(owner)).name,'Updated Community')
  assert.equal(await count(),before+1)

  // Real runtime-role bypass probes omit service-level write authorization.
  await assert.rejects(withEligibleActorTransaction(db, { actorId: member.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await sql`update public.tenants set name='Bypass' where id=${tenant}`.execute(tx)
  }),error=>error.code==='42501')
  assert.equal((await withEligibleActorTransaction(db, { actorId: member.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    assert.equal((await sql`update public.tenant_settings set pause_community_events=false where tenant_id=${tenant}`.execute(tx)).numAffectedRows,0n)
    assert.equal((await sql`delete from public.tenant_website_content_overrides where tenant_id=${tenant}`.execute(tx)).numAffectedRows,0n)
  })).eligible, true)
  await assert.rejects(withEligibleActorTransaction(db, { actorId: editor.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await sql`update public.tenant_website_content_overrides set content_key='community.hero.heading' where tenant_id=${tenant}`.execute(tx)
  }),error=>error.code==='42501')
  assert.deepEqual((await sql`select * from app_private.community_landing('wild%')`.execute(db)).rows,[])
  for(const actor of [owner,editor,member]) {
    for(const table of ['tenants','tenant_settings','tenant_website_content_overrides']) assert.ok((await actor.client.from(table).select('*')).error)
    assert.ok((await actor.client.rpc('lookup_tenant',{p_slug:slug})).error)
    assert.ok((await actor.client.from('community_accounts').select('tenant_id,tenants(*)').eq('tenant_id',tenant)).error)
    assert.ok((await actor.client.schema('app_private').rpc('community_landing',{p_slug:slug})).error)
  }
  await admin.query('begin')
  try {
    await admin.query('create extension if not exists pg_graphql');await admin.query('set local role authenticated')
    await admin.query("select set_config('request.jwt.claim.sub',$1,true)",[owner.id])
    const resolve=async q=>(await admin.query('select graphql.resolve($1) as result',[q])).rows[0].result
    assert.equal((await resolve('{__typename}')).data.__typename,'Query')
    assert.ok((await resolve('{community_accountsCollection{edges{node{tenant_id}}}}')).errors?.length)
    for(const table of ['tenants','tenant_settings','tenant_website_content_overrides']) {
      assert.ok((await resolve('{'+table+'Collection{edges{node{'+(table==='tenants'?'id':'tenant_id')+'}}}}')).errors?.length)
    }
    assert.ok((await resolve('mutation { updatetenantsCollection(set:{name:"Bypass"},filter:{id:{eq:"'+tenant+'"}},atMost:1){affectedCount}}')).errors?.length)
  } finally { await admin.query('rollback') }
  await cmd(owner,{kind:'suspend',target:member.id,revision:(await send(owner,path+'/accounts/'+member.id+'/review')).revision})
  for(const read of [details,config,copy]) assert.ok(await read(member))
  await cmd(editor,{kind:'deactivate'})
  await copy(editor,undefined,undefined,404)
  await cmd(editor,{kind:'reactivate'})
  await copy(editor,'community.hero.heading','Paused assignment',403)
  await cmd(owner,{kind:'resume',target:editor.id})
  await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[editor.id])
  await copy(editor,'community.hero.heading','Banned',403)
  await admin.query('update auth.users set banned_until=null where id=$1',[editor.id])

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
    ()=>admin.query('update public.tenant_staff_assignments set can_manage_settings=false where tenant_id=$1 and user_id=$2',[tenant,settings.id]),
    ()=>config(settings,{auto_approve_users:false},403))
  assert.equal((await config(owner)).auto_approve_users,true)
  await cmd(owner,{kind:'permissions',target:settings.id,permissions:{can_manage_settings:true}})
  await afterLockedChange(
    ()=>admin.query("update public.tenants set operational_status='archived' where id=$1",[tenant]),
    ()=>copy(editor,'community.hero.heading','Archived race',403))
  for(const actor of [member,editor,settings,pending,outsider]) {
    await details(actor,undefined,404);await config(actor,undefined,404);await copy(actor,undefined,undefined,404)
  }
  assert.equal((await landing(null,slug,404)).code,(await landing(null,'missing-'+randomUUID(),404)).code)
  await details(owner,{name:'Archived owner detail'})
  await config(owner,{auto_approve_users:false,pause_community_events:false})
  await copy(owner,'community.hero.heading','Archived owner copy')
  assert.equal((await withEligibleActorTransaction(db, { actorId: editor.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    assert.deepEqual((await sql`select tenant_id from public.tenant_settings where tenant_id=${tenant}`.execute(tx)).rows,[])
    assert.deepEqual((await sql`select tenant_id from public.tenant_website_content_overrides where tenant_id=${tenant}`.execute(tx)).rows,[])
  })).eligible, true)
  await cmd(owner,{kind:'archive',archived:false})
  assert.equal((await landing()).name,'Archived owner detail')
  assert.equal((await landing()).overrides.find(r=>r.content_key==='community.hero.heading').text_value,'Archived owner copy')

  // Opposite ordering: an admitted settings edit holds its authority to commit.
  let release,ready
  const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{ready=resolve})
  const write=withEligibleActorTransaction(db, { actorId: settings.id, requestId: randomUUID() },async tx=>{
    await configurationSettings(tx,settings.id,tenant,{pause_community_events:true})
    ready((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
    await gate
  })
  const holder=await Promise.race([started,write.then(()=>{throw Error('writer exited before barrier')})])
  const revoke=cmd(owner,{kind:'permissions',target:settings.id,permissions:{can_manage_settings:false}})
  revoke.catch(()=>{})
  try {
    const deadline=Date.now()+1800
    while(!(await admin.query('select exists(select from pg_stat_activity where $1=any(pg_blocking_pids(pid))) as waiting',[holder])).rows[0].waiting) {
      assert.ok(Date.now()<deadline,'permission change must wait for admitted configuration write')
      await new Promise(resolve=>setTimeout(resolve,10))
    }
  } finally {release()}
  await write;await revoke
  assert.equal((await config(owner)).pause_community_events,true)
  await config(settings,{pause_community_events:false},403)
  console.log('PASS public exact-slug landing, safe copy projection, full configuration audience/field matrix, archive and eligibility boundaries, immutable attribution, no-op/retry/reset, rollback, raw bypasses and both authority serialization orders')
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
    await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])', [users])
    await admin.query('commit')
    for (const id of users) assert.ifError((await authAdmin.deleteUser(id)).error)
  } finally { await app.close(); await admin.end() }
}
