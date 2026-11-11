import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID, createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { cpus, totalmem } from 'node:os'
import { execFileSync, fork } from 'node:child_process'
import pg from 'pg'
import { Kysely, PostgresDialect, sql } from 'kysely'
import { createClient } from '@supabase/supabase-js'
import { localStack } from '../../supabase/tests/local-stack.mjs'

// Opt-in local experiment, outside normal test runs. Snapshot a reviewed git
// revision first; modes baseline/compare/full/cold never modify saved credentials
// or source files. See docs/research/auth-transaction-optimization.md for scope.
mkdirSync('server/test-results/auth-optimization',{recursive:true})
if(process.argv[2]==='snapshot') {
  const revision=execFileSync('git',['rev-parse','--verify',process.argv[3]+'^{commit}'],{encoding:'utf8'}).trim()
  const root=resolve('server/test-results/auth-optimization/baseline-src'), files={}
  const paths=execFileSync('git',['ls-tree','-r','--name-only',revision,'--','server/src'],{encoding:'utf8'}).trim().split('\n')
  for(const path of paths) {
    const destination=resolve(root,path.slice('server/src/'.length))
    assert.ok(destination.startsWith(root+sep))
    const source=execFileSync('git',['show',revision+':'+path],{encoding:'utf8'}).replace(/\r\n/g,'\n')
    if(existsSync(destination))assert.equal(readFileSync(destination,'utf8').replace(/\r\n/g,'\n'),source,'Existing snapshot differs: '+path)
    else {mkdirSync(join(destination,'..'),{recursive:true});writeFileSync(destination,source)}
    files[path]=createHash('sha256').update(source).digest('hex')
  }
  writeFileSync('server/test-results/auth-optimization/baseline-source.json',JSON.stringify({revision,files},null,2))
  console.log('Verified source snapshot '+revision+' ('+paths.length+' files)')
  process.exit(0)
}
const mode=process.argv[2]
assert.ok(['baseline','compare','full','cold'].includes(mode),'Specify baseline, compare, full or cold mode; snapshot requires a git revision')
function sourceHashes(root) {
  const files={}
  function visit(directory,prefix='') {
    for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const relative=prefix+entry.name
      if(entry.isDirectory())visit(join(directory,entry.name),relative+'/')
      else if(entry.isFile())files['server/src/'+relative]=createHash('sha256').update(readFileSync(join(directory,entry.name),'utf8').replace(/\r\n/g,'\n')).digest('hex')
    }
  }
  visit(root);return files
}
const baselineSource=JSON.parse(readFileSync('server/test-results/auth-optimization/baseline-source.json','utf8'))
assert.deepEqual(sourceHashes('server/test-results/auth-optimization/baseline-src'),baselineSource.files,'Baseline snapshot bytes changed')
const candidateSource=sourceHashes('server/src')
process.loadEnvFile('server/.env.local')
const local = localStack(), endpoint = new URL(process.env.DATABASE_URL)
assert.ok(['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname))
assert.equal(endpoint.username, 'ct_api'); assert.equal(endpoint.pathname, '/postgres')
endpoint.host = new URL(local.DB_URL).host
const als = new AsyncLocalStorage(), originalFetch = globalThis.fetch
globalThis.fetch = async (...args) => {
  const record = als.getStore(), url = String(args[0]?.url ?? args[0])
  if (record && url.startsWith(local.API_URL + '/auth/')) {
    const start = performance.now()
    try { return await originalFetch(...args) }
    finally { record.authRequests++; record.authNetwork += performance.now()-start }
  }
  return originalFetch(...args)
}
class MeasuredPool extends pg.Pool {
  async connect() {
    const start=performance.now(), client=await super.connect(), record=als.getStore()
    if(record) record.acquire+=performance.now()-start
    if(!client.measured) {
      client.measured=true
      const query=client.query.bind(client)
      client.query=async (...args)=>{
        const record=als.getStore(), start=performance.now(), text=typeof args[0]==='string'?args[0]:args[0].text
        if(record && text==='begin') { record.attempts++; record.txStart=start }
        try { return await query(...args) }
        finally {
          if(record) {
            record.queries.push({sql:text,ms:performance.now()-start,pid:client.processID})
            if(record.capture) record.captured.push({text,values:args[1]??[]})
            if(text==='commit'||text==='rollback') record.transaction+=performance.now()-record.txStart
          }
        }
      }
    }
    return client
  }
}
const variants=[], users=[], tenants=[], rows=[], admin=new pg.Client({connectionString:local.DB_URL})
const previousRun=process.argv[3]?JSON.parse(readFileSync(process.argv[3],'utf8')):null
if(previousRun)assert.notEqual(resolve(process.argv[3]).toLowerCase(),resolve(`server/test-results/auth-optimization/${mode}.json`).toLowerCase(),
  'Preserve the original results under a different filename before resuming')
const cellKey=r=>[r.transport,r.endpoint,r.scenario??'owner',r.concurrency,r.repeat].join('/')
if(previousRun) {
  // Only retain complete, successful baseline/B pairs. An interrupted or
  // expired-token cell is rerun together with its mate on the new fixture.
  const groups=new Map()
  for(const row of previousRun.rows) {
    const key=cellKey(row)
    if(!groups.has(key))groups.set(key,[])
    groups.get(key).push(row)
  }
  const valid=row=>row.invalidSamples===0 && row.errors===0 && row.n===2000 && row.samples.length===row.n
  for(const pair of groups.values())if(pair.length===2 && pair.every(valid) &&
    pair.some(row=>row.variant==='baseline') && pair.some(row=>row.variant==='candidate'))rows.push(...pair)
}
function completedPair(endpoint,concurrency,repeat,scenario) {
  return rows.filter(r=>r.endpoint===endpoint&&r.concurrency===concurrency&&r.repeat===repeat&&r.scenario===scenario).length===2
}
let statsRelation=null
async function statistics(){return statsRelation?(await admin.query(`select queryid::text,calls,total_exec_time,total_plan_time,rows,shared_blks_hit,shared_blks_read from ${statsRelation} where userid='ct_api'::regrole`)).rows:[]}
const authOptions={auth:{persistSession:false,autoRefreshToken:false}}
const authAdmin=createClient(local.API_URL,local.SERVICE_ROLE_KEY,authOptions).auth.admin
const output=new URL(`../test-results/auth-optimization/${mode}.json`,import.meta.url)
const record=()=>({acquire:0,verify:0,authRequests:0,authNetwork:0,transaction:0,attempts:0,queries:[],captured:[]})
const summarize=values=>{ const a=[...values].sort((a,b)=>a-b); return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],mean:a.reduce((a,b)=>a+b,0)/a.length} }
async function variant(name,src) {
  const modules=await Promise.all(['app','database','token-verifier','directory-cursors','communities/service','user-accounts/service'].map(p=>import(new URL(`${src}/${p}.ts`,import.meta.url))))
  const [application,database,token,cursor,community,account]=modules
  const pool=new MeasuredPool({connectionString:endpoint.href,max:4,connectionTimeoutMillis:4000,statement_timeout:5000,lock_timeout:2000,idle_in_transaction_session_timeout:8000,options:'-c default_transaction_isolation=read\\ committed'})
  pool.on('error',()=>{})
  const db=new Kysely({dialect:new PostgresDialect({pool})}), cursors=cursor.directoryCursors('ab'.repeat(32))
  await database.checkRuntime(db)
  const runtime=(await sql`select current_user,session_user,current_setting('server_version') as version,current_setting('transaction_isolation') as isolation`.execute(db)).rows[0]
  assert.equal(runtime.current_user,'ct_api');assert.equal(runtime.session_user,'ct_api');assert.equal(runtime.isolation,'read committed')
  const rawVerify=token.verifyBearer(local.API_URL,local.ANON_KEY,local.issuer)
  const verify=async authorization=>{const start=performance.now();try{return await rawVerify(authorization)}finally{const r=als.getStore();if(r)r.verify+=performance.now()-start}}
  const app=application.buildApi({db,verify,cursors,cleanup:()=>db.destroy()})
  const listeners=app.server.listeners('request')
  app.server.removeAllListeners('request')
  app.server.on('request',function(...args){als.run(record(),()=>{for(const listener of listeners)listener.apply(this,args)})})
  app.addHook('onRequest',(request,reply,done)=>{request.measure=als.getStore();done()})
  const completed=new Map()
  app.addHook('onSend',async(request,reply,payload)=>{
    // Authentication can respond before the later request hook runs.
    const measurement=request.measure??als.getStore(),id=request.headers['x-benchmark-id']
    if(id && measurement){completed.set(id,measurement);measurement.requestId=request.id}
    return payload
  })
  const base=await app.listen({host:'127.0.0.1',port:0})
  const v={name,db,pool,app,base,completed,runtime,community:community.createCommunityService({db,cursors}),account:account.createUserAccountService({db,cursors}),database}
  variants.push(v);return v
}
async function user() {
  const email=randomUUID()+'@example.test',password=randomUUID()
  const created=await authAdmin.createUser({email,password,email_confirm:true});assert.ifError(created.error);users.push(created.data.user.id)
  const signed=await createClient(local.API_URL,local.ANON_KEY,authOptions).auth.signInWithPassword({email,password});assert.ifError(signed.error)
  return {id:signed.data.user.id,token:signed.data.session.access_token,refreshToken:signed.data.session.refresh_token}
}
async function freshToken(actor) {
  // Renew before each full workload pair, outside warmups/timing. A long pair
  // must not inherit the tail of an earlier token's one-hour lifetime.
  const refreshed=await createClient(local.API_URL,local.ANON_KEY,authOptions).auth.refreshSession({refresh_token:actor.refreshToken})
  assert.ifError(refreshed.error);assert.equal(refreshed.data.user.id,actor.id)
  actor.token=refreshed.data.session.access_token;actor.refreshToken=refreshed.data.session.refresh_token
  metadata.tokenRefreshes=(metadata.tokenRefreshes??0)+1
}
async function http(v,actor,path,method='GET',body) {
  const id=randomUUID(),start=performance.now()
  const response=await fetch(v.base+path,{method,headers:{authorization:'Bearer '+actor.token,'content-type':'application/json','x-benchmark-id':id},...(body?{body:JSON.stringify(body)}:{})})
  const data=await response.json(),r=v.completed.get(id);v.completed.delete(id)
  assert.ok(r);r.ms=performance.now()-start;r.status=response.status
  return {data,r}
}
async function run(v,actor,tenant,endpointName,transport,concurrency,repeat,n=2000,options={}) {
  const samples=[];let sequence=0
  async function one(measured) {
    const index=sequence++,target=options.targets?.[index%options.targets.length]??tenant
    const path=endpointName==='preferences'?'/api/me/preferences':`/api/communities/${target}/${endpointName==='history'?'history?limit=20':options.settings?'settings':'details'}`
    const body=endpointName==='write'?options.settings?{pause_community_events:Boolean(index%2)}:{name:`Benchmark ${repeat}-${index}`} : endpointName==='noop'?{name:'Benchmark no-op'}:undefined
    let r=record(),data;const start=performance.now()
    try {
      if(transport==='http') ({r,data}=await http(v,actor,path,body?'PATCH':'GET',body))
      else {
        data=await als.run(r,()=>endpointName==='details'?v.community.readDetails({actorId:actor.id,requestId:randomUUID()},{tenantId:target}):v.account.readAccountPreferences({actorId:actor.id,requestId:randomUUID()}))
        r.ms=performance.now()-start;r.status=200
      }
    } catch(error) {
      r.ms=performance.now()-start;r.status=error.statusCode??599;r.error=error.code??error.name
    }
    r.valid=r.status===(options.expectedStatus??200) && Boolean(data)
    if(!options.expectedStatus&&['details','preferences','history','write','noop'].includes(endpointName)) {
      const expected=endpointName==='preferences'?5:(v.name==='baseline'?10:8)+(endpointName==='write'?2:endpointName==='noop'?1:0)
      r.valid&&=r.queries.length===expected
    }
    if(measured)samples.push(r)
    else assert.ok(r.valid,'warmup failed; no timed comparison is valid')
  }
  for(let i=0;i<200;i+=concurrency)await Promise.all(Array.from({length:Math.min(concurrency,200-i)},()=>one(false)))
  const beforeStatistics=await statistics()
  let next=0;const start=performance.now()
  const waits={samples:0,lockObservations:0,maxBlocked:0};let observation=null
  const timer=mode==='full'?setInterval(()=>{
    if(observation)return
    observation=admin.query("select pid,wait_event_type,wait_event,pg_blocking_pids(pid) as blockers from pg_stat_activity where usename='ct_api' and state='active'")
      .then(result=>{waits.samples++;const blocked=result.rows.filter(r=>r.wait_event_type==='Lock').length;waits.lockObservations+=blocked;waits.maxBlocked=Math.max(waits.maxBlocked,blocked)})
      .finally(()=>{observation=null})
  },20):null
  try {await Promise.all(Array.from({length:concurrency},async()=>{while(next++<n)await one(true)}))}
  finally {if(timer)clearInterval(timer)}
  const elapsed=performance.now()-start
  if(observation)await observation
  const result={variant:v.name,endpoint:endpointName,scenario:options.label??'owner',transport,concurrency,repeat,n,elapsed,throughput:n/(elapsed/1000),latency:summarize(samples.map(r=>r.ms)),acquire:summarize(samples.map(r=>r.acquire)),transaction:summarize(samples.map(r=>r.transaction)),verify:summarize(samples.map(r=>r.verify)),commands:[...new Set(samples.map(r=>r.queries.length))],retries:samples.reduce((a,r)=>a+Math.max(0,r.attempts-1),0),authRequests:samples.reduce((a,r)=>a+r.authRequests,0),errors:samples.filter(r=>r.status!==(options.expectedStatus??200)).length,outcomes:samples.reduce((a,r)=>{a[r.status]=(a[r.status]??0)+1;return a},{}),queryMetrics:Object.values(samples.flatMap(r=>r.queries).reduce((a,q)=>{a[q.sql]??={sql:q.sql,times:[]};a[q.sql].times.push(q.ms);return a},{})).map(q=>({sql:q.sql,duration:summarize(q.times)})),samples:samples.map(r=>({ms:r.ms,status:r.status,error:r.error,acquire:r.acquire,transaction:r.transaction,verify:r.verify,requestId:r.requestId,pid:r.queries[0]?.pid}))}
  result.invalidSamples=samples.filter(r=>!r.valid).length
  result.waitSampling=waits
  const previous=new Map(beforeStatistics.map(row=>[row.queryid,row]))
  result.statementDeltas=(await statistics()).map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,key==='queryid'?value:Number(value)-Number(previous.get(row.queryid)?.[key]??0)]))).filter(row=>row.calls>0)
  rows.push(result);save();console.log(JSON.stringify({...result,samples:undefined,queryMetrics:undefined}))
  assert.equal(result.invalidSamples,0,'failed samples were retained; comparison rejected')
}
let metadata={}
function save(){writeFileSync(output,JSON.stringify({metadata,rows},null,2))}
async function plans(v,owner,tenant,label) {
  const r=record();r.capture=true
  await als.run(r,()=>v.community.readDetails({actorId:owner.id,requestId:randomUUID()},{tenantId:tenant}))
  const client=await v.pool.connect(),captured=r.captured,results=[]
  try {
    for(const q of captured.slice(0,5))await client.query(q.text,q.values)
    for(const q of captured.slice(5,-2))results.push({sql:q.text,plan:(await client.query('explain (analyze,buffers,format json) '+q.text,q.values)).rows[0]['QUERY PLAN']})
  } finally {await client.query('rollback');client.release()}
  metadata.plans??=[];metadata.plans.push({variant:v.name,label,results});save()
}
async function createTenant(v,owner) {
  const created=await http(v,owner,'/api/communities','POST',{slug:'bench-'+randomUUID(),name:'Benchmark',country:'HN',timezone:'UTC',region:'',city:'',profile:{displayName:'Benchmark owner',bio:null}})
  assert.equal(created.r.status,201,JSON.stringify(created.data));tenants.push(created.data.tenantId);return created.data.tenantId
}
async function cold(owner,tenant) {
  await freshToken(owner)
  metadata.cold=[]
  for(let repeat=0;repeat<30;repeat++)for(const [poolWarm,verifierWarm] of [[true,false],[false,true],[false,false],[true,true]])for(const variant of repeat%2?['candidate','baseline']:['baseline','candidate']) {
    const result=await new Promise((resolve,reject)=>{
      const child=fork(new URL('./auth-optimization-cold-worker.mjs',import.meta.url),[],{stdio:['ignore','ignore','pipe','ipc']})
      const timeout=setTimeout(()=>{child.kill();reject(new Error('cold worker timeout'))},15000)
      let message=null
      child.on('message',data=>{message=data})
      child.on('error',reject)
      child.on('exit',code=>{clearTimeout(timeout);if(code!==0||!message?.ok)reject(new Error(message?.error??'cold worker failed'));else resolve(message.result)})
      child.send({variant,poolWarm,verifierWarm,database:endpoint.href,api:local.API_URL,key:local.ANON_KEY,issuer:local.issuer,token:owner.token,actor:owner.id,tenant})
    })
    metadata.cold.push({variant,poolWarm,verifierWarm,repeat,...result});save()
  }
}
async function full(vs,owner,tenant) {
  for(const v of vs)await plans(v,owner,tenant,'small fixture')
  const population=[]
  for(let i=0;i<50;i++)population.push(await user())
  while(tenants.length<16)await createTenant(vs[0],owner)
  const targets=[...tenants]
  for(const id of targets) {
    assert.equal((await http(vs[0],owner,`/api/communities/${id}/settings`,'PATCH',{auto_approve_users:true})).r.status,200)
    for(const actor of population)await vs[0].community.executeCommand({actorId:actor.id,requestId:randomUUID()},{tenantId:id},{kind:'join',profile:{displayName:'Benchmark participant',bio:null}})
  }
  await admin.query('begin');await admin.query('set local session_replication_role=replica')
  for(const id of targets)await admin.query(`insert into public.tenant_admin_actions(id,tenant_id,action,details,created_at,created_by,operation_id)
    select gen_random_uuid(),$1::uuid,'tenants.update','{}'::jsonb,'2025-01-01'::timestamptz+g*interval '1 second',$2::uuid,gen_random_uuid() from generate_series(1,1000) g`,[id,owner.id])
  await admin.query('commit')
  const cutoff=(await admin.query('select clock_timestamp() as time')).rows[0].time
  metadata.fixture={seed:1776,tenants:16,accountsPerTenant:51,seededHistoryPerTenant:1000,meaning:'Synthetic scale scenario, not a claim about future production volume.'}
  for(const v of vs)await plans(v,owner,tenant,'seeded fixture')
  async function resetWrites() {
    await admin.query('begin');await admin.query('set local session_replication_role=replica')
    await admin.query('delete from public.tenant_admin_actions where tenant_id=any($1::uuid[]) and created_at>$2',[targets,cutoff])
    await admin.query("update public.tenants set name='Benchmark no-op' where id=any($1::uuid[])",[targets])
    await admin.query('commit')
  }
  // The screen already covers small-fixture details/preferences at c1/c4.
  // This stage covers all four endpoints at all three concurrency levels on
  // the seeded fixture, plus isolated no-op and contending-write workloads.
  const cells=[]
  for(const endpoint of ['details','preferences','write','history'])for(const concurrency of [1,4,16])cells.push({endpoint,concurrency,options:{targets,label:'distributed'}})
  for(const concurrency of [1,4,16])for(const endpoint of ['write','noop'])cells.push({endpoint,concurrency,options:{label:'one-tenant'}})
  for(let repeat=0;repeat<5;repeat++)for(const cell of cells) {
    if(completedPair(cell.endpoint,cell.concurrency,repeat,cell.options.label))continue
    await freshToken(owner)
    for(const v of repeat%2?[vs[1],vs[0]]:vs) {
      await resetWrites()
      await run(v,owner,tenant,cell.endpoint,'http',cell.concurrency,repeat,2000,cell.options)
    }
  }
  // Separate fixture classes retain their own response/status distributions.
  // These shorter probes validate outcome mix; they do not replace the above
  // five-repeat authorized-workload performance cells.
  const [staff,member,pending,suspended,inactive]=population
  assert.equal((await http(vs[0],owner,`/api/communities/${tenant}/commands`,'POST',{kind:'grant',target:staff.id})).r.status,200)
  assert.equal((await http(vs[0],owner,`/api/communities/${tenant}/commands`,'POST',{kind:'permissions',target:staff.id,permissions:{can_manage_settings:true}})).r.status,200)
  await admin.query("update public.community_accounts set standing=case user_id when $2::uuid then 'pending' when $3::uuid then 'suspended' else 'inactive' end,has_disciplinary_restriction=(user_id=$3::uuid) where tenant_id=$1 and user_id=any($4::uuid[])",[tenant,pending.id,suspended.id,[pending.id,suspended.id,inactive.id]])
  const outsider=await user()
  for(const [label,actor,status] of [['admin',staff,200],['member-no-assignment',member,200],['pending',pending,404],['suspended',suspended,200],['inactive',inactive,404],['outsider',outsider,404]]) {
    if(completedPair('details',1,0,label))continue
    await freshToken(actor)
    for(const v of vs)await run(v,actor,tenant,'details','http',1,0,2000,{label,expectedStatus:status})
  }
  await freshToken(owner)
  if(!completedPair('details',1,0,'missing-tenant'))for(const v of vs)await run(v,owner,randomUUID(),'details','http',1,0,2000,{label:'missing-tenant',expectedStatus:404})
  assert.equal((await http(vs[0],owner,`/api/communities/${tenant}/commands`,'POST',{kind:'archive',archived:true})).r.status,200)
  for(const v of vs) {
    if(!completedPair('details',1,0,'archived-owner'))await run(v,owner,tenant,'details','http',1,0,2000,{label:'archived-owner',expectedStatus:200})
    if(!completedPair('details',1,0,'archived-non-owner'))await run(v,staff,tenant,'details','http',1,0,2000,{label:'archived-non-owner',expectedStatus:404})
  }
}
try {
  await admin.connect()
  const baseline=await variant('baseline','../test-results/auth-optimization/baseline-src')
  metadata={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineSource,candidateSource,lockfile:createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),node:process.version,cpu:cpus()[0].model,logicalCpus:cpus().length,memory:totalmem(),runtime:baseline.runtime,poolMax:4,timeoutsMs:{connection:4000,statement:5000,lock:2000,idleTransaction:8000},packages:Object.fromEntries(['kysely','pg','fastify','@supabase/supabase-js'].map(name=>[name,JSON.parse(readFileSync('node_modules/'+name+'/package.json','utf8')).version])),topology:'Windows API to local Docker PostgreSQL on loopback',migration:(await admin.query('select max(version) as version from supabase_migrations.schema_migrations')).rows[0].version,started:new Date().toISOString()}
  if(previousRun) {
    assert.equal(previousRun.metadata.lockfile,metadata.lockfile)
    assert.deepEqual(previousRun.metadata.baselineSource,metadata.baselineSource)
    assert.deepEqual(previousRun.metadata.candidateSource,metadata.candidateSource)
    assert.deepEqual(previousRun.metadata.runtime,metadata.runtime)
    assert.equal(previousRun.metadata.migration,metadata.migration)
    metadata.resumed={file:process.argv[3],started:previousRun.metadata.started,retainedCells:rows.length}
  }
  const extension=(await admin.query("select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_stat_statements'")).rows[0]
  if(extension) {
    statsRelation='"'+extension.nspname.replaceAll('"','""')+'".pg_stat_statements'
    try {await statistics();metadata.statementTracking=(await admin.query("select current_setting('pg_stat_statements.track') as track,current_setting('pg_stat_statements.track_planning') as planning")).rows[0]}
    catch {statsRelation=null;metadata.statementTracking='unavailable; no settings changed'}
  } else metadata.statementTracking='extension unavailable; no settings changed'
  const owner=await user()
  metadata.signingAlgorithm=JSON.parse(Buffer.from(owner.token.split('.')[0],'base64url')).alg
  const tenant=await createTenant(baseline,owner)
  if(mode==='baseline') {
    for(const transport of ['service','http'])for(const endpoint of ['details','preferences'])for(const concurrency of [1,4])await run(baseline,owner,tenant,endpoint,transport,concurrency,0)
  } else {
    const candidate=await variant('candidate','../src')
    assert.deepEqual((await http(baseline,owner,`/api/communities/${tenant}/details`)).data,(await http(candidate,owner,`/api/communities/${tenant}/details`)).data)
    if(mode==='full') {await full([baseline,candidate],owner,tenant);await cold(owner,tenant)}
    else if(mode==='cold')await cold(owner,tenant)
    else for(let repeat=0;repeat<5;repeat++)for(const transport of ['service','http'])for(const endpoint of ['details','preferences'])for(const concurrency of [1,4])for(const v of repeat%2?[candidate,baseline]:[baseline,candidate])await run(v,owner,tenant,endpoint,transport,concurrency,repeat)
  }
} finally {
  save()
  try {
    await admin.query('begin');await admin.query('set local session_replication_role=replica')
    await admin.query('delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id=any($1::uuid[]))',[tenants])
    await admin.query('delete from app_private.community_account_requests where tenant_id=any($1::uuid[])',[tenants])
    for(const table of ['community_account_permissions','community_account_preferences','tenant_admin_actions','tenant_website_content_overrides','community_account_profiles','community_accounts','tenant_staff_assignments','tenant_settings'])await admin.query('delete from public.'+table+' where tenant_id=any($1::uuid[])',[tenants])
    await admin.query('delete from public.tenants where id=any($1::uuid[])',[tenants]);await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])',[users]);await admin.query('commit')
    for(const id of users)assert.ifError((await authAdmin.deleteUser(id)).error)
  } finally {for(const v of variants)await v.app.close();await admin.end()}
}
