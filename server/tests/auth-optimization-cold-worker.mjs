import assert from 'node:assert/strict'
import pg from 'pg'
import {Kysely,PostgresDialect,sql} from 'kysely'
process.once('message',async input=>{
  const endpoint=new URL(input.database)
  assert.equal(endpoint.username,'ct_api');assert.ok(['localhost','127.0.0.1'].includes(endpoint.hostname))
  let measurement=null,completedMeasurement=null,requestStarted=null
  const rawFetch=globalThis.fetch
  globalThis.fetch=async(...args)=>{if(measurement&&String(args[0]?.url??args[0]).startsWith(input.api+'/auth/'))measurement.authRequests++;return rawFetch(...args)}
  class Pool extends pg.Pool {
    async connect(){
      const start=performance.now(),client=await super.connect()
      if(measurement)measurement.acquire+=performance.now()-start
      if(!client.measured){client.measured=true;const query=client.query.bind(client);client.query=async(...args)=>{
        const text=typeof args[0]==='string'?args[0]:args[0].text,start=performance.now()
        if(measurement&&text==='begin')measurement.txStart=start
        try{return await query(...args)}finally{if(measurement){measurement.commands++;if(text==='commit'||text==='rollback')measurement.transaction+=performance.now()-measurement.txStart}}
      }}
      return client
    }
  }
  const pool=new Pool({connectionString:input.database,max:4,connectionTimeoutMillis:4000,statement_timeout:5000,lock_timeout:2000,idle_in_transaction_session_timeout:8000,options:'-c default_transaction_isolation=read\\ committed'})
  const db=new Kysely({dialect:new PostgresDialect({pool})})
  const src=input.src
  assert.ok(['../test-results/auth-optimization/baseline-src','../test-results/auth-optimization/a-src','../test-results/auth-optimization/b-src','../src'].includes(src))
  const [{buildApi},{verifyBearer},{directoryCursors}]=await Promise.all(['app','token-verifier','directory-cursors'].map(name=>import(new URL(src+'/'+name+'.ts',import.meta.url))))
  const rawVerify=verifyBearer(input.api,input.key,input.issuer)
  const verify=async header=>{const start=performance.now();try{return await rawVerify(header)}finally{if(measurement)measurement.verify+=performance.now()-start}}
  const app=buildApi({db,verify,cursors:directoryCursors('ab'.repeat(32)),cleanup:()=>db.destroy()})
  try {
    if(input.poolWarm){const clients=await Promise.all(Array.from({length:4},()=>pool.connect()));for(const client of clients){await client.query('select 1');client.release()}}
    if(input.verifierWarm)assert.equal(await rawVerify('Bearer '+input.token),input.actor)
    const base=await app.listen({host:'127.0.0.1',port:0})
    measurement={acquire:0,transaction:0,verify:0,commands:0,authRequests:0}
    requestStarted=performance.now()
    const response=await fetch(base+`/api/communities/${input.tenant}/details`,{headers:{authorization:'Bearer '+input.token}})
    measurement.status=response.status
    const body=await response.json();measurement.ms=performance.now()-requestStarted
    assert.equal(response.status,200);assert.equal(body.id,input.tenant)
    assert.equal(measurement.commands,input.expectedCommands)
    const result=measurement;completedMeasurement=result;measurement=null
    const role=(await sql`select current_user,session_user,current_setting('transaction_isolation') as isolation`.execute(db)).rows[0]
    assert.equal(role.current_user,'ct_api');assert.equal(role.session_user,'ct_api');assert.equal(role.isolation,'read committed')
    process.send({ok:true,result})
  }catch(error){
    if(measurement && requestStarted!==null)measurement.ms=performance.now()-requestStarted
    process.send({ok:false,error:error.code??error.name,result:measurement??completedMeasurement})
  }
  finally{await app.close();process.disconnect()}
})
