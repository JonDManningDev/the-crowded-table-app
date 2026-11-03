// Read-only anonymous metadata/zero-row probes. Never signs in or creates fixtures.
// Uses the existing browser-safe key in memory; stores no keys or user content.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const dir = new URL('./', import.meta.url);
const root = new URL('../../../', dir);
const env = Object.fromEntries(readFileSync(new URL('.env.local', root), 'utf8')
  .split(/\r?\n/).filter(line => /^VITE_SUPABASE_(URL|PUBLISHABLE_KEY)=/.test(line))
  .map(line => { const i = line.indexOf('='); return [line.slice(0,i),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]; }));
const url = env.VITE_SUPABASE_URL.replace(/\/$/,'');
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.equal(url, 'https://fsnipgsrlclbnfepcbvz.supabase.co');
assert.ok(key.startsWith('sb_publishable_') || JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role === 'anon');
const headers = { apikey: key };
if (!key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${key}`;
const catalog = JSON.parse(readFileSync(new URL('hosted-catalog.json', dir),'utf8'));
const results = [];
for (const relation of catalog.relations) {
  const res = await fetch(`${url}/rest/v1/${relation.name}?select=*&limit=0`, { headers });
  const body = await res.json();
  results.push({relation: relation.name, method:'GET',limit:0,status:res.status,code:body.code ?? null,
                returned_rows:Array.isArray(body)?body.length:null});
}
const lookup = await fetch(`${url}/rest/v1/rpc/lookup_tenant?p_slug=baseline-probe-${randomUUID()}`, {headers});
const lookupBody = await lookup.json();
results.push({function:'lookup_tenant',method:'GET',status:lookup.status,code:lookupBody.code ?? null,
              returned_rows:Array.isArray(lookupBody)?lookupBody.length:null});
const profile = await fetch(`${url}/rest/v1/user_accounts?select=*&limit=0`, {headers:{...headers,'Accept-Profile':'app_private'}});
const profileBody = await profile.json();
results.push({requested_schema:'app_private',status:profile.status,code:profileBody.code,
              allowed_schema_message:profileBody.code==='PGRST106'?profileBody.message:null});
const evidence = {captured_at:new Date().toISOString(),project:'fsnipgsrlclbnfepcbvz',authentication:'anonymous browser-safe key; no user session',results};
writeFileSync(new URL('rest-probes.json',dir),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
