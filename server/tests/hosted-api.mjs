import { directoryCursors } from '../src/directory-cursors.ts'
// Opted-in hosted development verification. The HTTP server runs on loopback.
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { hostedTools, projectRef } from '../../supabase/tests/hosted-tools.mjs'
import { accessCatalog } from '../../supabase/tests/access-catalog.mjs'
import { buildApi } from '../src/app.ts'
import { verifyBearer } from '../src/token-verifier.ts'
import { connectDatabase, checkRuntime } from '../src/database.ts'

const {cli,query}=hostedTools()
const projectUrl=`https://${projectRef}.supabase.co`
assert.equal(process.env.SUPABASE_URL,projectUrl)
const endpoint=new URL(process.env.DATABASE_URL)
assert.equal(endpoint.username,'ct_api.'+projectRef)
assert.equal(endpoint.port,'5432');assert.equal(endpoint.searchParams.get('sslmode'),'verify-full')
const keys=cli(['projects','api-keys','--project-ref',projectRef,'--output','json'])
const anonKey=keys.find(k=>k.name==='anon').api_key,serviceKey=keys.find(k=>k.name==='service_role').api_key
const options={auth:{persistSession:false,autoRefreshToken:false}}
const authAdmin=createClient(projectUrl,serviceKey,options).auth.admin
const db=connectDatabase(endpoint.href)
const app=buildApi({ db, verify: verifyBearer(projectUrl,anonKey), cursors: directoryCursors(randomBytes(32).toString('hex')), cleanup: () => db.destroy() })
const users=[],tenants=[]
let base,checks=0
const evidence=new URL('../../docs/evidence/hosted-api-cutover-2026-11-03/',import.meta.url)
function normalized(runtime){return {...runtime,relations:runtime.relations.map(row=>({...row,...Object.fromEntries(['select','insert','update'].map(k=>[k,Array.isArray(row[k])?row[k]:row[k].slice(1,-1).split(',').filter(Boolean)]))}))}}
async function capture(){return accessCatalog({query:async text=>({rows:query(text)})})}
async function actor(){
  const email=randomUUID()+'@example.test',password=randomUUID()+'Aa1!'
  const made=await authAdmin.createUser({email,password,email_confirm:true});assert.ifError(made.error);users.push(made.data.user.id)
  const client=createClient(projectUrl,anonKey,options),signed=await client.auth.signInWithPassword({email,password})
  assert.ifError(signed.error);checks++
  return {id:made.data.user.id,token:signed.data.session.access_token,client}
}
async function http(actor,path,method='GET',body,expected=200){
  const response=await fetch(base+path,{method,headers:{...(actor&&{Authorization:'Bearer '+actor.token}),...(body&&{'Content-Type':'application/json'})},...(body&&{body:JSON.stringify(body)})})
  assert.equal(response.status,expected,method+' '+path)
  if(actor) assert.equal(response.headers.get('cache-control'),'private, no-store')
  checks++;return response.json()
}
try {
  await checkRuntime(db)
  const catalog=await capture()
  assert.deepEqual(normalized(catalog.runtime),normalized(JSON.parse(readFileSync(new URL('../access-runtime-manifest.json',import.meta.url),'utf8'))))
  assert.deepEqual(catalog.external_relation_grants,[]);assert.deepEqual(catalog.external_function_grants,[])
  assert.ok(catalog.relations.every(r=>r.owner==='postgres'&&r.rls))
  assert.ok(catalog.functions.every(f=>f.owner==='postgres'&&f.config?.includes('search_path=""')))
  assert.ok(catalog.role.every(r=>!r.rolsuper&&!r.rolbypassrls&&!r.rolinherit&&!r.rolcreaterole))
  assert.ok(!catalog.memberships.some(r=>r.member==='ct_api'))
  assert.ok(catalog.publications.every(p=>!p.puballtables&&p.tables.every(t=>!t.startsWith('public.')&&!t.startsWith('app_private.'))))
  assert.deepEqual(catalog.platform_policies,[])
  assert.deepEqual(catalog.migrations.map(m=>m.version),readdirSync(new URL('../../supabase/migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort().map(f=>f.split('_')[0]))
  await assert.rejects(sql`select email from auth.users`.execute(db),e=>e.code==='42501')
  console.log('PASS hosted catalog, migration parity and restricted runtime')
  base=await app.listen({host:'127.0.0.1',port:0})
  const owner=await actor(),member=await actor(),other=await actor()
  const flags={user_is_discoverable:true,enable_matchmaking:true,allow_direct_messages:true}
  await http(null,'/api/me/preferences','GET',undefined,401)
  await http({token:'forged'},'/api/me/preferences','GET',undefined,401)
  for(let bits=0;bits<8;bits++){
    const expected={user_is_discoverable:!!(bits&1),enable_matchmaking:!!(bits&2),allow_direct_messages:!!(bits&4)}
    await http(owner,'/api/me/preferences','PUT',expected)
    assert.deepEqual(await http(owner,'/api/me/preferences'),expected)
    assert.deepEqual(await http(member,'/api/me/preferences'),flags)
  }
  await http(owner,'/api/me/preferences','PUT',{...flags,user_id:member.id},400)
  await http(owner,'/api/me/profile','PUT',{display_name:'Hosted owner',bio:'Fixture only'})
  await http(member,'/api/me/profile','PUT',{display_name:'Hosted member',bio:null})
  const slug='hosted-api-'+randomUUID()
  const made=await http(owner,'/api/communities','POST',{name:'Hosted cutover fixture',slug,country:'HN',timezone:'UTC',region:'',city:'',profile:{displayName:'Curated owner',bio:null}},201)
  tenants.push(made.tenantId);const path='/api/communities/'+made.tenantId
  await http(null,'/api/public/communities/'+slug)
  const joined=await http(member,path+'/commands','POST',{kind:'join',profile:{displayName:'Curated member',bio:null}})
  assert.equal((await http(member,path+'/me/request')).request.request_id,joined.requestId)
  await http(other,path+'/me/request','GET',undefined,404)
  const review=await http(owner,path+'/accounts/'+member.id+'/review')
  await http(owner,path+'/commands','POST',{kind:'approve',requestId:joined.requestId,revision:review.revision})
  assert.deepEqual(await http(member,path+'/me/request'),{request:null})
  assert.equal((await http(member,path+'/directory')).rows.length,2)
  await http(member,path+'/settings','PATCH',{allow_public_directory_visibility:true},403)
  await http(owner,path+'/settings','PATCH',{allow_public_directory_visibility:true})
  assert.equal((await http(null,'/api/public/communities/'+slug+'/directory')).rows.length,2)
  await http(owner,path+'/commands','POST',{kind:'grant',target:member.id})
  await http(member,path+'/staff/'+member.id)
  await http(other,path+'/staff/'+member.id,'GET',undefined,404)
  await http(owner,path+'/accounts/'+member.id+'/permissions','PATCH',{can_post_public_events:true})
  assert.ok((await http(owner,path+'/history')).rows.length)
  assert.deepEqual(await http(other,path+'/history'),{rows:[],next:null})
  await http(owner,'/api/profiles/'+member.id)
  await http(owner,'/api/me/blocks/'+member.id,'PUT',{confirmed:true,source:{kind:'global_profile'}})
  await http(owner,'/api/profiles/'+member.id,'GET',undefined,404)
  await http(member,'/api/profiles/'+owner.id,'GET',undefined,404)
  await http(member,path+'/accounts/'+owner.id+'/profile')
  await http(owner,'/api/me/blocks/'+member.id,'DELETE')
  await http(owner,'/api/profiles/'+member.id)
  await http(owner,path+'/commands','POST',{kind:'archive',archived:true})
  await http(member,path+'/directory','GET',undefined,404)
  await http(owner,path+'/accounts')
  await http(owner,path+'/commands','POST',{kind:'archive',archived:false})
  console.log('PASS real Auth/local HTTP reads, writes, isolation, blocks and archive')
  for(const [key,token] of [[anonKey,anonKey],[anonKey,owner.token],[serviceKey,serviceKey]]){
    const headers={apikey:key,Authorization:'Bearer '+token}
    for(const relation of catalog.relations.filter(r=>r.relation.startsWith('public.'))){
      const response=await fetch(projectUrl+'/rest/v1/'+relation.relation.slice(7)+'?select=*&limit=0',{headers})
      assert.ok(!response.ok);assert.equal((await response.json()).code,'42501');checks++
    }
    const privateRead=await fetch(projectUrl+'/rest/v1/community_account_requests?select=*',{headers:{...headers,'Accept-Profile':'app_private'}})
    assert.equal(privateRead.status,406);checks++
    const schemaResponse=await fetch(projectUrl+'/rest/v1/',{headers:{...headers,Accept:'application/openapi+json'}})
    // Hosted gateway reserves OpenAPI metadata for service_role; its metadata
    // mode lists relations independently of effective DML grants checked above.
    if(key===serviceKey){
      assert.equal(schemaResponse.status,200)
      const schema=await schemaResponse.json()
      assert.deepEqual(Object.keys(schema.paths).sort(),['/',...catalog.relations.filter(r=>r.relation.startsWith('public.')).map(r=>'/'+r.relation.slice(7))].sort())
    }else assert.equal(schemaResponse.status,401)
    checks++
  }
  const graphql=await fetch(projectUrl+'/graphql/v1',{method:'POST',headers:{apikey:anonKey,Authorization:'Bearer '+owner.token,'Content-Type':'application/json'},body:JSON.stringify({query:'{user_accountsCollection{edges{node{__typename}}}}'})})
  assert.ok((await graphql.json()).errors?.length);checks++
  const graphqlProbe=await fetch(projectUrl+'/graphql/v1',{method:'POST',headers:{apikey:anonKey,Authorization:'Bearer '+owner.token,'Content-Type':'application/json'},body:JSON.stringify({query:'{__typename}'})})
  assert.deepEqual(await graphqlProbe.json(),{errors:[{message:'pg_graphql extension is not enabled.'}]})
  assert.deepEqual(query("select extname from pg_extension where extname='pg_graphql'"),[]);checks++
  const before=query("select count(*)::int as accounts from public.community_accounts where tenant_id not in ('"+tenants.join("','")+"')")[0]
  assert.equal(before.accounts,1)
  console.log('PASS hosted runtime manifest, verified TLS/session pooler, real Auth/local HTTP operations, projections, isolation, blocks/archive and REST/OpenAPI/GraphQL denials ('+checks+' checks)')
} finally {
  try {
    if(users.length){
      const ids=users.map(id=>{assert.match(id,/^[0-9a-f-]{36}$/);return "'"+id+"'"}).join(',')
      const tenantIds=tenants.length?tenants.map(id=>"'"+id+"'").join(','):"'00000000-0000-0000-0000-000000000000'"
      query(`begin;set local session_replication_role=replica;
        delete from app_private.tenant_admin_action_categories where action_id in(select id from public.tenant_admin_actions where tenant_id in (${tenantIds}));
        delete from app_private.community_account_requests where tenant_id in (${tenantIds});
        ${['community_account_permissions','community_account_preferences','tenant_admin_actions','tenant_website_content_overrides','community_account_profiles','community_accounts','tenant_staff_assignments','tenant_settings'].map(t=>`delete from public.${t} where tenant_id in (${tenantIds});`).join('\n')}
        delete from public.tenants where id in (${tenantIds});
        delete from public.user_account_blocks where blocker_user_id in (${ids}) or blocked_user_id in (${ids});
        delete from public.user_accounts where user_id in (${ids});commit;select true as cleaned`,false)
      for(const id of users)assert.ifError((await authAdmin.deleteUser(id)).error)
      assert.equal(query(`select count(*)::int as remaining from auth.users where id in (${ids})`)[0].remaining,0)
    }
  } finally {await app.close()}
}
const final=await capture()
writeFileSync(new URL('hosted-catalog.json',evidence),JSON.stringify(final,null,2)+'\n')
writeFileSync(new URL('verification.json',evidence),JSON.stringify({captured_at:new Date().toISOString(),checks,project:projectRef,api:'loopback',frontend:'loopback',fixtures_cleaned:true},null,2)+'\n')
console.log('PASS fixture cleanup and final metadata capture')
