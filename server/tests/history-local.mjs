import { directoryCursors } from '../src/directory-cursors.ts'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { staffFlags } from '../src/communities/community-commands.ts'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { withEligibleActorTransaction } from '../src/actor-transaction.ts'
import { accountHistory } from '../src/communities/service.ts'
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
try {
  await admin.connect()
  base=await app.listen({host:'127.0.0.1',port:0})
  assert.equal((await fetch(base+'/health/ready')).status,200)
  const owner=await user(), cr=await user(), sr=await user(), both=await user(), manager=await user(), target=await user(), outsider=await user()
  const tenant=await community(owner), otherTenant=await community(outsider)
  const cmd=(viewer,body)=>send(viewer,'/api/communities/'+tenant+'/commands',body)
  const history=(viewer,query={},scope=tenant,status=200)=>send(viewer,'/api/communities/'+scope+'/history?'+new URLSearchParams(query),undefined,status)
  const empty={rows:[],next:null}, exact=eventId=>({eventId})
  const noPermissions=Object.fromEntries(staffFlags.map(flag=>[flag,false]))
  const review=viewer=>send(owner,'/api/communities/'+tenant+'/accounts/'+viewer.id+'/review')
  await send(owner,'/api/communities/'+tenant+'/settings',{auto_approve_users:true},200,'PATCH')
  for(const viewer of [cr,sr,both,manager,target]) {
    await cmd(viewer,{kind:'join',profile:{displayName:'History fixture',bio:null}})
    await cmd(owner,{kind:'grant',target:viewer.id})
  }
  await cmd(owner,{kind:'permissions',target:cr.id,permissions:{can_audit_community_accounts:true}})
  await cmd(owner,{kind:'permissions',target:sr.id,permissions:{can_audit_staff_accounts:true}})
  await cmd(owner,{kind:'permissions',target:both.id,permissions:{can_audit_community_accounts:true,can_audit_staff_accounts:true}})
  await cmd(owner,{kind:'permissions',target:manager.id,permissions:{can_grant_staff:true,can_discipline_users:true}})
  const secret='Private suspension '+randomUUID()
  await cmd(owner,{kind:'suspend',target:target.id,revision:(await review(target)).revision,reason:secret})
  const all=(await history(owner)).rows
  const suspension=all.find(r=>r.action==='community_suspended')
  const linked=all.find(r=>r.action==='staff_revoked'&&r.operation_id===suspension.operation_id)
  assert.equal(suspension.reason,secret)
  assert.equal(linked.reason,null)
  assert.deepEqual(suspension.categories,['community_account'])
  assert.deepEqual(linked.categories,['community_account','staff_account'])
  assert.equal(linked.created_by,owner.id)
  const staffPage=await history(sr)
  assert.ok(staffPage.rows.some(r=>r.id===linked.id))
  assert.ok(!JSON.stringify(staffPage).includes(secret))
  assert.deepEqual(await history(sr,exact(suspension.id)),empty)
  assert.deepEqual(await history(sr,exact(randomUUID())),empty)
  assert.deepEqual((await history(cr,exact(suspension.id))).rows,[suspension])
  assert.deepEqual((await history(sr,exact(linked.id))).rows,[linked])
  assert.deepEqual(await history(cr,{eventId:linked.id,target:owner.id}),empty)
  assert.deepEqual(await history(cr,{eventId:suspension.id,category:'staff_account'}),empty)
  assert.deepEqual(await history(cr,{eventId:suspension.id,limit:'1',cursor:'invalid'}),{rows:[suspension],next:null})
  for(const viewer of [manager,target,outsider]) assert.deepEqual(await history(viewer),empty)
  assert.deepEqual(await history(owner,{},otherTenant),empty)
  assert.deepEqual(await history(owner,{},randomUUID()),empty)
  assert.equal((await fetch(base+'/api/communities/'+tenant+'/history')).status,401)
  for(const query of [{limit:'0'},{limit:'101'},{category:'all'},{target:'bad'},{eventId:'bad'},{select:'*'},{actor:owner.id},{cursor:'bad'}]) await history(owner,query,tenant,400)
  const response=await fetch(base+'/api/communities/'+tenant+'/history',{headers:{Authorization:'Bearer '+owner.token}})
  assert.equal(response.headers.get('cache-control'),'private, no-store')
  assert.deepEqual(Object.keys(suspension).sort(),['id','tenant_id','action','target_user_id','content_key','created_at','created_by','operation_id','reason','details','categories'].sort())

  // Trusted setup simulates preserved legacy records, with equal microsecond times.
  const legacy=[]
  for(const [action,categories] of [['tenant_staff_assignments.insert',['community_account','staff_account']],['tenant_staff_assignments.update',['staff_account']],['tenants.update',[]]]) {
    const id=randomUUID(), operation=randomUUID()
    await admin.query("insert into public.tenant_admin_actions(id,tenant_id,action,target_user_id,created_by,created_at,operation_id) values($1,$2,$3,$4,$5,'2020-01-02T03:04:05.123456Z',$6)",[id,tenant,action,target.id,owner.id,operation])
    for(const category of categories) await admin.query('insert into app_private.tenant_admin_action_categories values($1,$2)',[id,category])
    legacy.push({id,action,categories,operation})
  }
  for(const event of legacy) {
    const row=(await history(owner,exact(event.id))).rows[0]
    assert.equal(row.action,event.action)
    assert.equal(row.created_at,'2020-01-02T03:04:05.123456Z')
    assert.equal(row.created_by,owner.id)
    assert.equal(row.operation_id,event.operation)
    assert.deepEqual(row.categories,event.categories)
    assert.equal((await history(cr,exact(event.id))).rows.length,event.categories.includes('community_account')?1:0)
    assert.equal((await history(sr,exact(event.id))).rows.length,event.categories.includes('staff_account')?1:0)
  }
  await cmd(owner,{kind:'clear',target:target.id,revision:(await review(target)).revision})
  await cmd(owner,{kind:'reappoint',target:target.id,permissions:noPermissions})
  await cmd(target,{kind:'deactivate'})
  await cmd(target,{kind:'reactivate'})
  await cmd(owner,{kind:'revoke',target:target.id,reason:'Independent staff revocation'})
  const paused=(await history(owner,{target:target.id})).rows.find(r=>r.action==='staff_revoked'&&r.details.before_status==='paused')
  assert.deepEqual(paused.categories,['staff_account'])
  assert.deepEqual(await history(cr,exact(paused.id)),empty)
  assert.equal((await history(sr,exact(paused.id))).rows[0].reason,'Independent staff revocation')
  assert.deepEqual(await history(sr,exact(suspension.id)),empty)

  // Filtering precedes pagination; both flags never duplicate a dual event.
  for(const viewer of [owner,cr,sr,both]) {
    for(const filters of [{},{target:target.id},{category:'community_account'},{category:'staff_account',target:target.id}]) {
      const whole=(await history(viewer,{...filters,limit:'100'})).rows
      const ids=[]
      let cursor
      do {
        const part=await history(viewer,{...filters,limit:'2',...(cursor?{cursor}:{})})
        ids.push(...part.rows.map(r=>r.id))
        cursor=part.next
      } while(cursor)
      assert.deepEqual(ids,whole.map(r=>r.id))
      assert.equal(new Set(ids).size,ids.length)
    }
  }
  const first=await history(sr,{limit:'1'})
  assert.ok(first.next)
  for(const [viewer,query,scope] of [[cr,{cursor:first.next},tenant],[sr,{cursor:first.next},otherTenant],[sr,{cursor:first.next,target:target.id},tenant],[sr,{cursor:first.next,category:'staff_account'},tenant]]) await history(viewer,query,scope,400)
  const invalidDate=JSON.parse(Buffer.from(first.next,'base64url').toString())
  for(const time of ['2026-02-31T00:00:00.000000Z','0000-01-01T00:00:00.000000Z']) {
    invalidDate[4]=time
    await history(sr,{cursor:Buffer.from(JSON.stringify(invalidDate)).toString('base64url')},tenant,400)
  }
  await cmd(owner,{kind:'permissions',target:sr.id,permissions:{can_audit_staff_accounts:false}})
  assert.deepEqual(await history(sr,{cursor:first.next}),empty)
  await cmd(owner,{kind:'permissions',target:sr.id,permissions:{can_audit_staff_accounts:true}})
  assert.ok((await history(sr,{cursor:first.next})).rows.length)

  // A larger timeline proves the default/max bounds and permits a different
  // page size after a cursor, without losing sub-millisecond ordering.
  await admin.query(`with added as (
    insert into public.tenant_admin_actions(tenant_id,action,target_user_id,created_by,created_at,operation_id)
    select $1,'tenant_staff_assignments.update',$2,$3,
      '2019-01-01T00:00:00.000001Z'::timestamptz+n*interval '1 microsecond',gen_random_uuid()
    from generate_series(1,105) n returning id
  ) insert into app_private.tenant_admin_action_categories select id,'staff_account' from added`,[tenant,target.id,owner.id])
  const defaultPage=await history(sr)
  assert.equal(defaultPage.rows.length,50)
  assert.ok(defaultPage.next)
  const maxPage=await history(sr,{limit:'100'})
  assert.equal(maxPage.rows.length,100)
  const remainder=await history(sr,{cursor:defaultPage.next,limit:'100'})
  assert.deepEqual([...defaultPage.rows,...remainder.rows].slice(0,100),maxPage.rows)
  assert.equal(remainder.next,null)
  assert.equal(new Set([...defaultPage.rows,...remainder.rows].map(row=>row.id)).size,defaultPage.rows.length+remainder.rows.length)

  // Omit all service audience predicates: real runtime RLS must still protect reasons.
  const raw=(viewer,scope=tenant)=>db.transaction().execute(async tx=>{
    if(viewer) await sql`select set_config('request.jwt.claim.sub',${viewer.id},true)`.execute(tx)
    if(scope) await sql`select set_config('ct.tenant_id',${scope},true)`.execute(tx)
    return (await sql`select id,tenant_id,reason from public.tenant_admin_actions order by id`.execute(tx)).rows
  })
  assert.deepEqual(await raw(null),[])
  assert.deepEqual(await raw(sr,null),[])
  assert.deepEqual(await raw(manager),[])
  assert.deepEqual(await raw(outsider),[])
  assert.ok(!(await raw(sr)).some(r=>r.id===suspension.id||r.reason===secret))
  assert.ok((await raw(cr)).some(r=>r.id===suspension.id&&r.reason===secret))
  assert.ok((await raw(owner)).some(r=>r.id===legacy[2].id))
  assert.ok(!(await raw(owner)).some(r=>r.tenant_id===otherTenant))
  await assert.rejects(withEligibleActorTransaction(db, { actorId: owner.id, requestId: randomUUID() },async tx=>{
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await sql`insert into public.tenant_admin_actions(tenant_id,target_user_id,action,details)
      values(${tenant},${target.id},'staff_revoked',
        '{"before_status":"active","after_status":"revoked","report_evidence":"private"}'::jsonb)`.execute(tx)
  }),error=>error.code==='23514')
  await db.transaction().execute(async tx=>{
    await sql`select set_config('request.jwt.claim.sub',${sr.id},true),set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    assert.deepEqual((await sql`select * from app_private.tenant_admin_action_categories where action_id=${suspension.id}`.execute(tx)).rows,[])
    assert.equal((await sql`select app_private.can_read_account_action(${tenant},${suspension.id}) as allowed`.execute(tx)).rows[0].allowed,false)
  })
  for(const viewer of [owner,sr,cr]) {
    for(const select of ['*','id,reason','id,tenant_admin_action_categories(*)']) assert.ok((await viewer.client.from('tenant_admin_actions').select(select).eq('tenant_id',tenant)).error)
    assert.ok((await viewer.client.from('tenants').select('id,tenant_admin_actions(*)').eq('id',tenant)).error)
    assert.ok((await viewer.client.schema('app_private').from('tenant_admin_action_categories').select('*')).error)
  }
  assert.ok((await createClient(local.API_URL,local.ANON_KEY,authOptions).from('tenant_admin_actions').select('id')).error)
  await admin.query('begin')
  try {
    await admin.query('create extension if not exists pg_graphql')
    await admin.query('set local role authenticated')
    await admin.query("select set_config('request.jwt.claim.sub',$1,true)",[owner.id])
    const resolve=async q=>(await admin.query('select graphql.resolve($1) as result',[q])).rows[0].result
    assert.equal((await resolve('{__typename}')).data.__typename,'Query')
    assert.ok((await resolve('{community_accountsCollection{edges{node{tenant_id}}}}')).errors?.length)
    const denied=await resolve('{ tenant_admin_actionsCollection { edges { node { id reason } } } }')
    assert.ok(denied.errors?.length&&!denied.data?.tenant_admin_actionsCollection)
  } finally { await admin.query('rollback') }

  await cmd(sr,{kind:'deactivate'})
  await cmd(sr,{kind:'reactivate'})
  assert.deepEqual(await history(sr),empty)
  assert.deepEqual(await raw(sr),[])
  await cmd(owner,{kind:'resume',target:sr.id})
  await cmd(owner,{kind:'suspend',target:sr.id,revision:(await review(sr)).revision,reason:'Reader suspended'})
  assert.deepEqual(await history(sr),empty)
  assert.deepEqual(await raw(sr),[])
  await cmd(owner,{kind:'clear',target:sr.id,revision:(await review(sr)).revision})
  await cmd(owner,{kind:'reappoint',target:sr.id,permissions:{...noPermissions,can_audit_staff_accounts:true}})
  await cmd(sr,{kind:'deactivate'})
  assert.deepEqual(await history(sr),empty)
  assert.deepEqual(await raw(sr),[])
  await cmd(sr,{kind:'reactivate'})
  await cmd(owner,{kind:'resume',target:sr.id})
  await cmd(owner,{kind:'revoke',target:sr.id})
  assert.deepEqual(await history(sr),empty)
  assert.deepEqual(await raw(sr),[])
  await cmd(owner,{kind:'reappoint',target:sr.id,permissions:{...noPermissions,can_audit_staff_accounts:true}})
  await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[sr.id])
  await history(sr,{},tenant,403)
  assert.deepEqual(await raw(sr),[])
  await admin.query('update auth.users set banned_until=null where id=$1',[sr.id])
  // Observe an actual blocked HTTP request, then commit a privilege/archive change.
  async function afterLockedChange(change,competing) {
    await admin.query('begin')
    let response
    try {
      await admin.query('select id from public.tenants where id=$1 for update',[tenant])
      await change()
      response=competing()
      response.catch(()=>{})
      const deadline=Date.now()+1800
      while(!(await admin.query("select exists(select from pg_stat_activity where usename='ct_api' and pg_backend_pid()=any(pg_blocking_pids(pid))) as waiting")).rows[0].waiting) {
        assert.ok(Date.now()<deadline,'history must wait for tenant serialization')
        await new Promise(resolve=>setTimeout(resolve,10))
      }
      await admin.query('commit')
    } finally { await admin.query('rollback') }
    return response
  }
  assert.deepEqual(await afterLockedChange(
    ()=>admin.query('update public.tenant_staff_assignments set can_audit_staff_accounts=false where tenant_id=$1 and user_id=$2',[tenant,sr.id]),
    ()=>history(sr,exact(linked.id))),empty)
  await cmd(owner,{kind:'permissions',target:sr.id,permissions:{can_audit_staff_accounts:true}})
  assert.deepEqual(await afterLockedChange(
    ()=>admin.query("update public.tenants set operational_status='archived' where id=$1",[tenant]),
    ()=>history(sr)),empty)
  assert.deepEqual(await history(cr),empty)
  assert.deepEqual(await raw(sr),[])
  assert.deepEqual(await raw(cr),[])
  assert.equal((await history(owner,exact(suspension.id))).rows[0].reason,secret)
  assert.ok((await raw(owner)).some(r=>r.id===suspension.id))
  await cmd(owner,{kind:'archive',archived:false})

  // In the opposite order a checked read holds authority until it completes.
  let releaseRead, signalReady
  const release=new Promise(resolve=>{releaseRead=resolve})
  const ready=new Promise(resolve=>{signalReady=resolve})
  const reader=withEligibleActorTransaction(db, { actorId: sr.id, requestId: randomUUID() },async tx=>{
    const result=await accountHistory(tx,sr.id,tenant,exact(linked.id))
    signalReady((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
    await release
    return result
  })
  const holder=await Promise.race([ready,reader.then(()=>{throw Error('read exited before barrier')})])
  const writer=cmd(owner,{kind:'permissions',target:sr.id,permissions:{can_audit_staff_accounts:false}})
  writer.catch(()=>{})
  try {
    const deadline=Date.now()+1800
    while(!(await admin.query('select exists(select from pg_stat_activity where $1=any(pg_blocking_pids(pid))) as waiting',[holder])).rows[0].waiting) {
      assert.ok(Date.now()<deadline,'permission writer must wait for checked read')
      await new Promise(resolve=>setTimeout(resolve,10))
    }
  } finally { releaseRead() }
  const readResult=await reader
  assert.equal(readResult.eligible,true)
  assert.deepEqual(readResult.value.rows,[linked])
  await writer
  assert.deepEqual(await history(sr,exact(linked.id)),empty)
  console.log('PASS history categories, exact lookup and disciplinary reason isolation; legacy preservation, pagination, current eligibility, browser/GraphQL/runtime bypasses and both serialization orders')
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
