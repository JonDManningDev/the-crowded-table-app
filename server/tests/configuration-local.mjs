import { directoryCursors } from '../src/directory-cursors.ts'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withEligibleActorTransaction, connectDatabase } from '../src/database.ts'
import { configurationDetails, configurationSettings, configurationCopy, communityCommand } from '../src/communities/service.ts'
import { copySlots, staffFlags } from '../src/communities/types.ts'
import { loadConfigurationFacts, loadAccountRecordFacts, loadHistoryFacts } from '../src/communities/policies.ts'
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
    country: 'HN', timezone: 'UTC', region: '  Region  ', city: '  ', profile: { displayName: 'Owner', bio: null } }, 201)
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
  const creation=(await http(owner,path+'/history','GET')).rows
  assert.deepEqual(creation.map(row=>row.action).sort(),['community_approved','staff_created','tenant_settings.insert','tenants.insert'])
  assert.equal(new Set(creation.map(row=>row.operation_id)).size,1)
  assert.ok(creation.every(row=>row.created_by===owner.id&&row.reason===null))
  for(const row of creation.filter(row=>row.action.includes('.'))) {
    assert.deepEqual(row.details,{});assert.deepEqual(row.categories,[]);assert.equal(row.target_user_id,null)
  }
  // Canonical tenant storage rejects invalid values; only the API normalizes.
  await assert.rejects(withEligibleActorTransaction(db, { actorId: owner.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await sql`update public.tenants set name='  Noncanonical  ' where id=${tenant}`.execute(tx)
  }),error=>error.code==='23514')
  const cmd=(actor,body,status=200)=>send(actor,path+'/commands',body,status)
  const details=(actor,body,status=200)=>http(actor,path+'/details',body?'PATCH':'GET',body,status)
  const config=(actor,body,status=200)=>http(actor,path+'/settings',body?'PATCH':'GET',body,status)
  const copy=(actor,key,text,status=200)=>http(actor,path+'/copy'+(key?'/'+encodeURIComponent(key):''),key?(text===undefined?'DELETE':'PUT'):'GET',text===undefined?undefined:{text_value:text},status)
  const landing=(actor=null,handle=slug,status=200)=>http(actor,'/api/public/communities/'+handle,'GET',undefined,status)
  assert.equal((await details(owner)).state_province,'Region')
  assert.equal((await details(owner)).city,null)
  const join={kind:'join',profile:{displayName:'Configuration fixture',bio:null}}
  const requested=await cmd(pending,join)
  await config(owner,{auto_approve_users:true})
  assert.equal((await send(pending,path+'/accounts/'+pending.id+'/review')).request_id,requested.requestId)
  for(const actor of [settings,editor,member]) await cmd(actor,join)
  for(const actor of [settings,editor]) await cmd(owner,{kind:'grant',target:actor.id})
  const noPermissions=await staffFacts(settings)
  assert.equal(noPermissions.assignment.role,'admin')
  assert.equal(noPermissions.assignment.status,'active')
  for(const flag of staffFlags) assert.equal(noPermissions.assignment[flag],false)
  await cmd(owner,{kind:'permissions',target:settings.id,permissions:{can_manage_settings:true}})
  await cmd(owner,{kind:'permissions',target:editor.id,permissions:{can_modify_content:true}})
  // Exercise the public policy-loader contracts with real runtime RLS. Missing
  // child rows must not remove a visible tenant or invent staff authority.
  async function staffFacts(actor, targetTenant=tenant) {
    return withEligibleActorTransaction(db, { actorId:actor.id, requestId:randomUUID() }, async tx=>{
      await sql`select set_config('ct.tenant_id',${targetTenant},true)`.execute(tx)
      await sql`select id from public.tenants where id=${targetTenant} for share`.execute(tx)
      const facts=await loadConfigurationFacts(tx,actor.id,targetTenant)
      assert.deepEqual(await loadAccountRecordFacts(tx,actor.id,targetTenant),facts)
      assert.deepEqual(await loadHistoryFacts(tx,actor.id,targetTenant),facts)
      return facts
    })
  }
  for(const [actor,standing] of [[member,'approved'],[pending,'pending'],[outsider,undefined]]) {
    assert.deepEqual(await staffFacts(actor),{site:{operational_status:'active'},account:standing?{standing}:undefined,assignment:undefined})
  }
  const editorFacts=await staffFacts(editor)
  assert.deepEqual(editorFacts.account,{standing:'approved'})
  assert.equal(editorFacts.assignment.role,'admin')
  assert.equal(editorFacts.assignment.status,'active')
  assert.equal(editorFacts.assignment.can_modify_content,true)
  assert.equal(editorFacts.assignment.can_manage_settings,false)
  assert.deepEqual(await staffFacts(editor,otherTenant),{site:{operational_status:'active'},account:undefined,assignment:undefined})
  assert.deepEqual(await staffFacts(owner,randomUUID()),{site:undefined,account:undefined,assignment:undefined})
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
  const missingPath='/api/communities/'+randomUUID()
  for(const operation of ['details','settings','copy']) {
    assert.equal((await http(owner,missingPath+'/'+operation,'GET',undefined,404)).code,'missing')
  }
  await http(owner,'/api/communities/malformed/details','GET',undefined,400)
  await details(member,{name:'Unauthorized'},403)
  await details(settings,{name:'Not ownership'},403)
  await config(editor,{auto_approve_users:false},403)
  await copy(settings,'community.hero.heading','No content flag',403)
  for(const actor of [settings,editor,member,pending,outsider]) await cmd(actor,{kind:'archive',archived:true},403)
  await details(owner,{name:'Mixed forbidden patch',slug:'changed'},400)
  await config(settings,{pause_community_events:true,operational_status:'archived'},400)
  assert.equal((await details(owner)).name,'API fixture')
  assert.equal((await config(owner)).pause_community_events,false)
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
  // Authorized history preserves the automatic-event contract after API cutover.
  const copyHistory=(await http(owner,path+'/history','GET')).rows.filter(row=>row.action.startsWith('tenant_website_content_overrides.'))
  assert.equal(copyHistory.length,8)
  for(const row of copyHistory) {
    assert.deepEqual(row.details,{});assert.deepEqual(row.categories,[])
    assert.equal(row.target_user_id,null);assert.equal(row.created_by,editor.id);assert.equal(row.reason,null)
    assert.ok(row.content_key&&row.operation_id)
  }
  assert.deepEqual(await http(editor,path+'/history','GET'),{rows:[],next:null})
  await assert.rejects(withEligibleActorTransaction(db, { actorId: owner.id, requestId: randomUUID() },async tx=>{
    await configurationDetails(tx,owner.id,tenant,{name:'Rollback'})
    await configurationSettings(tx,owner.id,tenant,{pause_community_events:false})
    await configurationCopy(tx,owner.id,tenant,{key:'community.hero.heading',text:'Rollback copy'})
    throw Error('injected rollback')
  }, { initialTenantId: tenant }),/injected rollback/)
  assert.equal((await details(owner)).name,'Updated Community')
  assert.equal(await count(),before+1)

  // Product authority belongs to the API. A scoped trusted runtime writer can
  // bypass it, but not canonical storage, protected columns or archive fences.
  await assert.rejects(withEligibleActorTransaction(db, { actorId: member.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    assert.equal((await sql`update public.tenants set name='Scoped runtime' where id=${tenant}`.execute(tx)).numAffectedRows,1n)
    assert.equal((await sql`update public.tenant_settings set pause_community_events=false where tenant_id=${tenant}`.execute(tx)).numAffectedRows,1n)
    assert.equal((await sql`delete from public.tenant_website_content_overrides where tenant_id=${tenant}`.execute(tx)).numAffectedRows,6n)
    await sql`insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value)
      values(${tenant},'community.hero.heading','Scoped runtime')`.execute(tx)
    assert.equal((await sql`update public.tenant_website_content_overrides set text_value='Changed' where tenant_id=${tenant}`.execute(tx)).numAffectedRows,1n)
    assert.equal((await sql`update public.tenants set name='Wrong scope' where id=${otherTenant}`.execute(tx)).numAffectedRows,0n)
    throw Error('rollback trusted-writer probe')
  }),/rollback trusted-writer probe/)
  for(const patch of [sql`name='  noncanonical  '`,sql`city=''`,sql`state_province=' Region '`,sql`timezone='Not/AZone'`]) {
    await assert.rejects(withEligibleActorTransaction(db, { actorId: owner.id, requestId: randomUUID() },async tx=>{
      await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
      await sql`update public.tenants set ${patch} where id=${tenant}`.execute(tx)
    }),error=>error.code==='23514')
  }
  await assert.rejects(withEligibleActorTransaction(db, { actorId: editor.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await sql`update public.tenant_website_content_overrides set content_key='community.hero.heading' where tenant_id=${tenant}`.execute(tx)
  }),error=>error.code==='42501')
  assert.equal((await sql`select to_regprocedure('app_private.community_landing(text)') as fn`.execute(db)).rows[0].fn,null)
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
      const deadline=Date.now()+1500
      while(!(await admin.query("select exists(select from pg_stat_activity where usename='ct_api' and pg_backend_pid()=any(pg_blocking_pids(pid))) as waiting")).rows[0].waiting) {
        assert.ok(Date.now()<deadline,'configuration operation must wait for current authority')
        await new Promise(resolve=>setTimeout(resolve,10))
      }
      await admin.query('commit')
    } finally {await admin.query('rollback')}
    return response
  }
  await afterLockedChange(
    ()=>admin.query("update public.tenant_staff_assignments set status='paused' where tenant_id=$1 and user_id=$2",[tenant,editor.id]),
    ()=>copy(editor,'community.hero.heading','Paused assignment race',403))
  assert.equal((await staffFacts(editor)).assignment.status,'paused')
  await cmd(owner,{kind:'resume',target:editor.id})
  const priorMemberStanding=(await staffFacts(member)).account.standing
  await afterLockedChange(
    ()=>admin.query("update public.community_accounts set standing='inactive' where tenant_id=$1 and user_id=$2",[tenant,member.id]),
    ()=>details(member,undefined,404))
  assert.deepEqual((await staffFacts(member)).account,{standing:'inactive'})
  await admin.query('update public.community_accounts set standing=$3 where tenant_id=$1 and user_id=$2',[tenant,member.id,priorMemberStanding])
  await afterLockedChange(
    ()=>admin.query('update public.tenant_staff_assignments set can_modify_content=false where tenant_id=$1 and user_id=$2',[tenant,editor.id]),
    ()=>copy(editor,'community.hero.heading','Revoked content race',403))
  await cmd(owner,{kind:'permissions',target:editor.id,permissions:{can_modify_content:true}})
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
  assert.deepEqual(await staffFacts(editor),{site:{operational_status:'archived'},account:undefined,assignment:undefined})
  const archivedOwner=await staffFacts(owner)
  assert.deepEqual(archivedOwner.account,{standing:'approved'})
  assert.equal(archivedOwner.assignment.role,'owner')
  assert.equal((await landing(null,slug,404)).code,(await landing(null,'missing-'+randomUUID(),404)).code)
  await details(owner,{name:'Archived owner detail'})
  await config(owner,{auto_approve_users:false,pause_community_events:false})
  await copy(owner,'community.hero.heading','Archived owner copy')
  await withEligibleActorTransaction(db, { actorId: editor.id, requestId: randomUUID() },async tx=>{
    assert.deepEqual((await sql`select tenant_id from public.tenant_settings where tenant_id=${tenant}`.execute(tx)).rows,[])
    assert.deepEqual((await sql`select tenant_id from public.tenant_website_content_overrides where tenant_id=${tenant}`.execute(tx)).rows,[])
  }, { initialTenantId: tenant })
  await cmd(owner,{kind:'archive',archived:false})
  const beforeArchive=await count()
  await cmd(owner,{kind:'archive',archived:true})
  await cmd(owner,{kind:'archive',archived:true})
  for(const actor of [member,editor,settings,pending,outsider]) {
    await cmd(actor,{kind:'archive',archived:false},403)
    await details(actor,{name:'Archived denial'},403)
    await config(actor,{auto_approve_users:true},403)
    await copy(actor,'community.hero.heading','Archived denial',403)
  }
  await cmd(owner,{kind:'archive',archived:false})
  await cmd(owner,{kind:'archive',archived:false})
  assert.equal(await count(),beforeArchive+2,'archive/restore no-ops preserve one event per change')
  assert.equal((await landing()).name,'Archived owner detail')
  assert.equal((await landing()).overrides.find(r=>r.content_key==='community.hero.heading').text_value,'Archived owner copy')

  // Opposite ordering: an admitted settings edit holds its authority to commit.
  let release,ready
  const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{ready=resolve})
  const write=withEligibleActorTransaction(db, { actorId: settings.id, requestId: randomUUID() },async tx=>{
    await configurationSettings(tx,settings.id,tenant,{pause_community_events:true})
    ready((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
    await gate
  }, { initialTenantId: tenant })
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
  // Real runtime transactions on either side of a root lock, with competing
  // operations sent over HTTP. Archive and copy decisions reload after waits.
  async function committedBefore(work,compete,options) {
    let unlock,entered
    const gate=new Promise(resolve=>{unlock=resolve}),started=new Promise(resolve=>{entered=resolve})
    const transaction=withEligibleActorTransaction(db, { actorId: owner.id, requestId: randomUUID() },async tx=>{
      await work(tx)
      entered((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
      await gate
    }, options)
    const holder=await Promise.race([started,transaction.then(()=>{throw Error('writer exited before barrier')})])
    const competing=compete();competing.catch(()=>{})
    try {
      const deadline=Date.now()+1800
      while(!(await admin.query('select exists(select from pg_stat_activity where $1=any(pg_blocking_pids(pid))) as waiting',[holder])).rows[0].waiting) {
        assert.ok(Date.now()<deadline,'competing archive/copy operation must wait for root holder')
        await new Promise(resolve=>setTimeout(resolve,10))
      }
    } finally {unlock()}
    await transaction
    return competing
  }
  await committedBefore(
    tx=>configurationCopy(tx,owner.id,tenant,{key:'community.hero.heading',text:'Committed before archive'}),
    ()=>cmd(owner,{kind:'archive',archived:true}), { initialTenantId: tenant })
  assert.equal((await copy(owner)).rows.find(r=>r.content_key==='community.hero.heading').text_value,'Committed before archive')
  await cmd(owner,{kind:'archive',archived:false})
  await committedBefore(
    tx=>communityCommand(tx,owner.id,tenant,{kind:'archive',archived:true}),
    ()=>copy(editor,'community.hero.heading','Stale pre-archive authority',403))
  assert.equal((await copy(owner)).rows.find(r=>r.content_key==='community.hero.heading').text_value,'Committed before archive')
  await cmd(owner,{kind:'archive',archived:false})
  // Two real runtime transactions upgrade the same SHARE lock. PostgreSQL
  // chooses a deadlock victim; the whole operation retries with fresh facts.
  const attempts=[0,0], operationIds=[randomUUID(),randomUUID()], pids=[]
  let admitUpgrades, allShared
  const upgrades=new Promise(resolve=>{admitUpgrades=resolve})
  const shared=new Promise(resolve=>{allShared=resolve})
  const contenders=operationIds.map((requestId,index)=>withEligibleActorTransaction(db,{actorId:owner.id,requestId},async tx=>{
    attempts[index]++
    await sql`select id from public.tenants where id=${tenant} for share`.execute(tx)
    if(attempts[index]===1) {
      pids.push((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
      if(pids.length===2)allShared()
      await upgrades
    }
    return configurationDetails(tx,owner.id,tenant,{city:'Natural deadlock '+index})
  }, { initialTenantId: tenant }))
  contenders.forEach(p=>p.catch(()=>{}))
  let deadlockSettled=false
  const completedContenders=Promise.all(contenders)
  completedContenders.then(()=>{deadlockSettled=true},()=>{deadlockSettled=true})
  try {
    await Promise.race([shared,completedContenders]);admitUpgrades()
    const deadlockDeadline=Date.now()+1500
    // The detector may resolve the cycle before the observer samples it. The
    // SHARE barrier plus a successful retry still proves the real conflict.
    while(!deadlockSettled && attempts[0]+attempts[1]===2 &&
      (await admin.query("select count(*)::int as n from pg_stat_activity where pid=any($1::int[]) and wait_event_type='Lock'",[pids])).rows[0].n!==2) {
      assert.ok(Date.now()<deadlockDeadline,'observe both real lock upgrades before deadlock detection')
      await new Promise(resolve=>setTimeout(resolve,10))
    }
    await completedContenders
  } finally {admitUpgrades();await Promise.allSettled(contenders)}
  assert.equal(attempts[0]+attempts[1],3)
  for(const operationId of operationIds)assert.equal((await admin.query("select count(*)::int as n from public.tenant_admin_actions where operation_id=$1 and action='tenants.update'",[operationId])).rows[0].n,1)

  // A repeatable-read snapshot predating another committed writer produces a
  // natural 40001 when the operation tries to lock the changed tenant root.
  const serialEndpoint=new URL(endpoint)
  serialEndpoint.searchParams.set('options','-c default_transaction_isolation=repeatable\\ read')
  const serialDb=connectDatabase(serialEndpoint.href,1)
  let snapshotReady,resumeSnapshot,serialAttempts=0
  const snapshot=new Promise(resolve=>{snapshotReady=resolve})
  const resume=new Promise(resolve=>{resumeSnapshot=resolve})
  const serialOperation=randomUUID()
  try {
    const pending=withEligibleActorTransaction(serialDb,{actorId:owner.id,requestId:serialOperation},async tx=>{
      serialAttempts++
      assert.equal((await sql`select current_setting('transaction_isolation') as level`.execute(tx)).rows[0].level,'repeatable read')
      await sql`select id from public.tenants where id=${tenant}`.execute(tx)
      if(serialAttempts===1){snapshotReady();await resume}
      return configurationDetails(tx,owner.id,tenant,{city:'Natural serialization retry'})
    }, { initialTenantId: tenant })
    pending.catch(()=>{})
    await Promise.race([snapshot,pending])
    await details(owner,{city:'Concurrent committed update'})
    resumeSnapshot();await pending
    assert.equal(serialAttempts,2)
    assert.equal((await admin.query("select count(*)::int as n from public.tenant_admin_actions where operation_id=$1 and action='tenants.update'",[serialOperation])).rows[0].n,1)
  } finally {resumeSnapshot();await serialDb.destroy()}

  const singleDb=connectDatabase(endpoint.href,1)
  try {
    const cleared=async()=>assert.deepEqual((await sql`select nullif(current_setting('request.jwt.claim.sub',true),'') as actor,
      nullif(current_setting('ct.operation_id',true),'') as operation,nullif(current_setting('ct.tenant_id',true),'') as tenant`.execute(singleDb)).rows[0],{actor:null,operation:null,tenant:null})
    await withEligibleActorTransaction(singleDb,{actorId:owner.id,requestId:randomUUID()},tx=>configurationDetails(tx,owner.id,tenant), { initialTenantId: tenant })
    await cleared()
    await assert.rejects(withEligibleActorTransaction(singleDb,{actorId:outsider.id,requestId:randomUUID()},tx=>configurationDetails(tx,outsider.id,tenant), { initialTenantId: tenant }),error=>error.statusCode===404)
    await cleared()
    await assert.rejects(withEligibleActorTransaction(singleDb,{actorId:owner.id,requestId:randomUUID()},async tx=>{
      await configurationDetails(tx,owner.id,tenant);throw new Error('pool isolation rollback')
    }, { initialTenantId: tenant }),/pool isolation rollback/)
    await cleared()
    await withEligibleActorTransaction(singleDb,{actorId:editor.id,requestId:randomUUID()},async tx=>{
      assert.equal((await sql`select current_setting('request.jwt.claim.sub') as actor`.execute(tx)).rows[0].actor,editor.id)
      await configurationDetails(tx,editor.id,tenant)
    }, { initialTenantId: tenant })
    await cleared()
    const anonymousApp=buildApi({db:singleDb,verify:verifyBearer(local.API_URL,local.ANON_KEY,local.issuer),cursors:directoryCursors(randomBytes(32).toString('hex')),cleanup:async()=>{}})
    try {assert.equal((await anonymousApp.inject({method:'GET',url:'/api/public/communities/'+slug})).statusCode,200);await cleared()}
    finally {await anonymousApp.close()}
  } finally {await singleDb.destroy()}
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
