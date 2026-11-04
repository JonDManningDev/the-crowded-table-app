import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withVerifiedActor } from '../src/actor-transaction.ts'
import { readAccountRecord, setParticipantPermission } from '../src/communities/records.ts'
import { staffFlags } from '../../shared/community-commands.ts'
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
  const owner=await user(), grant=await user(), manager=await user(), member=await user(), pending=await user(), outsider=await user()
  const tenant=await community(owner), otherTenant=await community(outsider)
  const path='/api/communities/'+tenant
  const cmd=(actor,body,status=200)=>http(actor,path+'/commands','POST',body,status)
  const staff=(actor,target,status=200)=>http(actor,path+'/staff/'+target,'GET',undefined,status)
  const permissions=(actor,target,value,status=200)=>http(actor,path+'/accounts/'+target+'/permissions',value===undefined?'GET':'PATCH',value===undefined?undefined:{can_post_public_events:value},status)
  const list=(actor,kind,query='',status=200)=>http(actor,path+'/'+kind+query,'GET',undefined,status)
  const join={kind:'join',profile:{displayName:'Records fixture',bio:null}}
  await cmd(pending,join)
  await http(owner,path+'/settings','PATCH',{auto_approve_users:true})
  for(const actor of [grant,manager,member]) await cmd(actor,join)
  for(const actor of [grant,manager]) await cmd(owner,{kind:'grant',target:actor.id})
  await cmd(owner,{kind:'permissions',target:grant.id,permissions:{can_grant_staff:true,can_audit_staff_accounts:true}})
  await cmd(owner,{kind:'permissions',target:manager.id,permissions:{can_manage_community_permissions:true,can_audit_community_accounts:true}})
  const metadata=['tenant_id','user_id','created_at','updated_at','created_by','updated_by']
  const expectedStaff=[...metadata,'role','status',...staffFlags].sort()
  const expectedPermissions=[...metadata,'can_post_public_events'].sort()
  for(const actor of [owner,grant]) {
    assert.deepEqual(Object.keys(await staff(actor,manager.id)).sort(),expectedStaff)
    assert.equal((await list(actor,'staff')).rows.length,3)
  }
  for(const actor of [manager,grant]) assert.equal((await staff(actor,actor.id)).status,'active')
  for(const actor of [manager,member,pending,outsider]) {
    await staff(actor,owner.id,404);await list(actor,'staff','',404)
  }
  await staff(member,member.id,404)
  for(const actor of [owner,manager]) {
    assert.deepEqual(Object.keys(await permissions(actor,pending.id)).sort(),expectedPermissions)
    assert.equal((await list(actor,'participant-permissions')).rows.length,5)
  }
  for(const actor of [grant,member,pending]) {
    assert.equal((await permissions(actor,actor.id)).can_post_public_events,false)
    await permissions(actor,owner.id,undefined,404)
    await permissions(actor,actor.id,true,403)
    await list(actor,'participant-permissions','',404)
  }
  await permissions(outsider,outsider.id,undefined,404)
  for(const endpoint of ['/staff/'+owner.id,'/staff','/participant-permissions','/accounts/'+member.id+'/permissions']) {
    await http(null,path+endpoint,'GET',undefined,401)
    await http({token:'invalid'},path+endpoint,'GET',undefined,401)
    await http(owner,'/api/communities/'+otherTenant+endpoint,'GET',undefined,404)
  }
  await permissions(manager,outsider.id,true,404)
  await http(owner,'/api/communities/'+otherTenant+'/accounts/'+outsider.id+'/permissions','PATCH',{can_post_public_events:true},403)
  for(const body of [{},{can_post_public_events:'true'},{can_post_public_events:true,user_id:outsider.id},
    {can_post_public_events:true,created_by:owner.id},{can_grant_staff:true},{can_post_public_events:true,standing:'approved'}]) {
    await http(manager,path+'/accounts/'+member.id+'/permissions','PATCH',body,400)
  }
  await send(owner,path+'/staff/'+member.id,{status:'active'},404,'PATCH')
  await staff(owner,randomUUID(),404)
  await permissions(owner,randomUUID(),undefined,404)
  await list(owner,'staff','?limit=0',400);await list(owner,'staff','?limit=101',400)
  await list(owner,'staff','?target='+member.id,400);await list(owner,'staff','?cursor=garbage',400)
  for(const kind of ['staff','participant-permissions']) {
    const all=(await list(owner,kind)).rows.map(r=>r.user_id)
    const collected=[];let next=null
    do {
      const page=await list(owner,kind,'?limit=1'+(next?'&cursor='+next:''))
      collected.push(...page.rows.map(r=>r.user_id));next=page.next
      if(next) {
        await list(kind==='staff'?grant:manager,kind,'?cursor='+next,400)
        await list(owner,kind==='staff'?'participant-permissions':'staff','?cursor='+next,400)
        await http(outsider,'/api/communities/'+otherTenant+'/'+kind+'?cursor='+next,'GET',undefined,400)
      }
    } while(next)
    assert.deepEqual(collected,all);assert.deepEqual([...all].sort(),all)
    assert.equal((await list(owner,kind,'?limit=100')).next,null)
  }
  const changed=await permissions(manager,grant.id,true)
  assert.equal(changed.can_post_public_events,true);assert.equal(changed.updated_by,manager.id)
  assert.equal((await staff(grant,grant.id)).can_manage_community_permissions,false)
  const repeated=await permissions(manager,grant.id,true)
  assert.deepEqual(repeated,changed)
  const audit=(await admin.query("select a.*,array(select category from app_private.tenant_admin_action_categories c where c.action_id=a.id) categories from public.tenant_admin_actions a where a.tenant_id=$1 and a.action='community_permissions_changed'",[tenant])).rows
  assert.equal(audit.length,1);assert.deepEqual(audit[0].details,{before:false,after:true})
  assert.deepEqual(audit[0].categories,['community_account']);assert.equal(audit[0].created_by,manager.id)
  assert.equal(audit[0].target_user_id,grant.id);assert.equal(audit[0].reason,null);assert.ok(audit[0].operation_id)
  assert.equal((await http(grant,path+'/history?eventId='+audit[0].id)).rows.length,0)
  assert.equal((await http(manager,path+'/history?eventId='+audit[0].id)).rows.length,1)
  await assert.rejects(withVerifiedActor(db,manager.id,randomUUID(),async tx=>{
    await setParticipantPermission(tx,manager.id,tenant,grant.id,false);throw Error('injected rollback')
  }),/injected rollback/)
  assert.deepEqual(await permissions(manager,grant.id),changed)
  assert.equal((await admin.query("select count(*)::int n from public.tenant_admin_actions where tenant_id=$1 and action='community_permissions_changed'",[tenant])).rows[0].n,1)
  await withVerifiedActor(db,member.id,randomUUID(),async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    assert.deepEqual((await sql`select user_id from public.community_account_permissions order by user_id`.execute(tx)).rows,[{user_id:member.id}])
    assert.equal((await sql`update public.community_account_permissions set can_post_public_events=true where tenant_id=${tenant}`.execute(tx)).numAffectedRows,0n)
  })
  for(const field of ['user_id','tenant_id','created_by','updated_by']) await assert.rejects(withVerifiedActor(db,manager.id,randomUUID(),async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await sql`update public.community_account_permissions set ${sql.id(field)}=${member.id} where tenant_id=${tenant}`.execute(tx)
  }),error=>error.code==='42501')
  await assert.rejects(withVerifiedActor(db,manager.id,randomUUID(),async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await sql`insert into public.tenant_admin_actions(tenant_id,target_user_id,action,details,reason)
      values(${tenant},${member.id},'community_permissions_changed','{"before":false,"after":true}', 'private text')`.execute(tx)
  }),error=>error.code==='23514')
  for(const actor of [owner,grant,manager,member]) for(const relation of ['tenant_staff_assignments','community_account_permissions']) {
    assert.equal((await actor.client.from(relation).select('*')).error?.code,'42501')
    assert.equal((await actor.client.from(relation).update(relation==='tenant_staff_assignments'?{can_grant_staff:true}:{can_post_public_events:true}).eq('tenant_id',tenant)).error?.code,'42501')
    assert.ok((await actor.client.from('community_accounts').select('tenant_id,'+relation+'(*)')).error)
  }
  assert.ok((await owner.client.schema('app_private').rpc('can_manage_account_records',{p_tenant:tenant,p_kind:'participant'})).error)
  await admin.query('begin')
  try {
    await admin.query('create extension if not exists pg_graphql');await admin.query('set local role authenticated')
    await admin.query("select set_config('request.jwt.claim.sub',$1,true)",[owner.id])
    const resolve=async q=>(await admin.query('select graphql.resolve($1) as result',[q])).rows[0].result
    assert.ok((await resolve('{community_accountsCollection{edges{node{tenant_id}}}}')).data.community_accountsCollection.edges.length)
    for(const relation of ['tenant_staff_assignments','community_account_permissions']) {
      assert.ok((await resolve('{'+relation+'Collection{edges{node{user_id}}}}')).errors?.length)
      assert.ok((await resolve('mutation { update'+relation+'Collection(set:{'+(relation==='tenant_staff_assignments'?'can_grant_staff':'can_post_public_events')+':true},atMost:1){affectedCount}}')).errors?.length)
    }
  } finally {await admin.query('rollback')}
  // Pending, suspended and inactive targets retain stored participant permissions.
  for(const actor of [pending,member]) assert.equal((await permissions(manager,actor.id,true)).can_post_public_events,true)
  await cmd(owner,{kind:'suspend',target:member.id,revision:(await http(owner,path+'/accounts/'+member.id+'/review')).revision})
  assert.equal((await permissions(member,member.id)).can_post_public_events,true)
  await permissions(member,member.id,false,403)
  await cmd(member,{kind:'deactivate'})
  assert.equal((await permissions(member,member.id)).can_post_public_events,true)
  assert.equal((await permissions(manager,member.id,false)).can_post_public_events,false)
  await cmd(grant,{kind:'deactivate'})
  assert.equal((await staff(grant,grant.id)).status,'paused');await list(grant,'staff','',404)
  await cmd(grant,{kind:'reactivate'})
  await list(grant,'staff','',404);await cmd(owner,{kind:'resume',target:grant.id})
  assert.equal((await list(grant,'staff')).rows.length,3)
  await cmd(owner,{kind:'revoke',target:grant.id})
  assert.equal((await staff(grant,grant.id)).status,'revoked');await list(grant,'staff','',404)
  await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[manager.id])
  await permissions(manager,manager.id,undefined,403);await permissions(manager,member.id,true,403)
  await admin.query('update auth.users set banned_until=null where id=$1',[manager.id])

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

  const savedCursor=(await list(manager,'participant-permissions','?limit=1')).next
  await afterLockedChange(
    ()=>admin.query('update public.tenant_staff_assignments set can_manage_community_permissions=false where tenant_id=$1 and user_id=$2',[tenant,manager.id]),
    ()=>permissions(manager,member.id,true,403))
  await list(manager,'participant-permissions','?cursor='+savedCursor,404)
  await cmd(owner,{kind:'permissions',target:manager.id,permissions:{can_manage_community_permissions:true}})
  await afterLockedChange(
    ()=>admin.query("update public.tenants set operational_status='archived' where id=$1",[tenant]),
    ()=>permissions(manager,member.id,true,403))
  for(const actor of [manager,grant,member,pending]) {
    await staff(actor,actor.id,404);await permissions(actor,actor.id,undefined,404)
    await list(actor,'staff','',404);await list(actor,'participant-permissions','',404)
  }
  assert.equal((await staff(owner,grant.id)).status,'revoked')
  assert.equal((await list(owner,'staff')).rows.length,3)
  assert.equal((await list(owner,'participant-permissions')).rows.length,5)
  assert.equal((await permissions(owner,member.id,true)).can_post_public_events,true)
  await withVerifiedActor(db,manager.id,randomUUID(),async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    for(const relation of ['public.tenant_staff_assignments','public.community_account_permissions']) {
      assert.deepEqual((await sql`select user_id from ${sql.table(relation)}`.execute(tx)).rows,[])
    }
  })
  await cmd(owner,{kind:'archive',archived:false})
  // A checked read holds its tenant snapshot until it finishes; revocation waits.
  async function admittedOperation(work,compete) {
    let release,ready
    const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{ready=resolve})
    const operation=withVerifiedActor(db,manager.id,randomUUID(),async tx=>{
      const result=await work(tx)
      ready((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
      await gate;return result
    })
    const holder=await Promise.race([started,operation.then(()=>{throw Error('operation exited before barrier')})])
    const response=compete();response.catch(()=>{})
    try {
      const deadline=Date.now()+1800
      while(!(await admin.query('select exists(select from pg_stat_activity where $1=any(pg_blocking_pids(pid))) as waiting',[holder])).rows[0].waiting) {
        assert.ok(Date.now()<deadline,'permission command must wait for admitted operation')
        await new Promise(resolve=>setTimeout(resolve,10))
      }
    } finally {release()}
    const result=await operation;await response;return result
  }
  assert.equal((await admittedOperation(tx=>readAccountRecord(tx,manager.id,tenant,'participant',member.id),
    ()=>cmd(owner,{kind:'permissions',target:manager.id,permissions:{can_manage_community_permissions:false}}))).can_post_public_events,true)
  await permissions(manager,member.id,undefined,404)
  await cmd(owner,{kind:'permissions',target:manager.id,permissions:{can_manage_community_permissions:true}})
  await admittedOperation(tx=>setParticipantPermission(tx,manager.id,tenant,member.id,false),
    ()=>cmd(owner,{kind:'permissions',target:manager.id,permissions:{can_manage_community_permissions:false}}))
  assert.equal((await permissions(owner,member.id)).can_post_public_events,false)
  await permissions(manager,member.id,true,403)
  console.log('PASS staff holder/manager reads, participant permission separation, bounded scoped pages, standing/archive/Auth boundaries, immutable attribution and community-only audit, no-op/rollback, raw bypasses and both serialization orders')

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
