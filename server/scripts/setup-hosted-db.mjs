// Configure only the LOCAL app against the authorized hosted development DB.
import assert from 'node:assert/strict'
import { randomBytes, X509Certificate } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hostedTools, projectRef } from '../../supabase/tests/hosted-tools.mjs'

const {cli,query}=hostedTools()
const root=new URL('../../',import.meta.url)
const env=new URL('server/.env.hosted-db.local',root)
assert.ok(!existsSync(env),'Hosted credentials already configured; do not rotate implicitly')
const versions=query('select version from supabase_migrations.schema_migrations order by version')
assert.equal(versions.at(-1).version,'20261103001700')
const role=query("select rolcanlogin,rolsuper,rolbypassrls from pg_roles where rolname='ct_api'")[0]
assert.deepEqual(role,{rolcanlogin:true,rolsuper:false,rolbypassrls:false})
const url=new URL(readFileSync(new URL('supabase/.temp/pooler-url',root),'utf8').trim())
assert.equal(url.username,'postgres.'+projectRef)
assert.equal(url.port,'5432')
assert.ok(url.hostname.endsWith('.pooler.supabase.com'))
url.username='ct_api.'+projectRef
const password=randomBytes(32).toString('hex')
url.password=password
url.searchParams.set('sslmode','verify-full')
const certificate=await fetch('https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt')
assert.ok(certificate.ok,'Supabase CA download failed')
const pem=await certificate.text(),ca=new X509Certificate(pem)
assert.ok(ca.ca && Date.parse(ca.validTo)>Date.now(),'Invalid Supabase CA')
assert.equal(ca.fingerprint256,'80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA','Review a changed CA before trusting it')
const caFile=new URL('supabase/.temp/hosted-ca.crt',root)
writeFileSync(caFile,pem)
url.searchParams.set('sslrootcert',fileURLToPath(caFile))
const keys=cli(['projects','api-keys','--project-ref',projectRef,'--output','json'])
const key=keys.find(k=>k.name==='anon').api_key
assert.ok(key)
// Persist privately first so an interrupted setup cannot lose the new credential.
writeFileSync(env,`DATABASE_URL=${url.href}\nSUPABASE_URL=https://${projectRef}.supabase.co\nSUPABASE_PUBLISHABLE_KEY=${key}\nDIRECTORY_CURSOR_KEY=${randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600})
query("alter role ct_api password '"+password+"'; select true as configured",false)
writeFileSync(new URL('.env.hosted-db.local',root),`VITE_SUPABASE_URL=https://${projectRef}.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=${key}\n`,{flag:'wx',mode:0o600})
console.log('Hosted development database credentials configured for local app processes; no secrets printed.')
