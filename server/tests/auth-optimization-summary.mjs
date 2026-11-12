import {readFileSync,writeFileSync} from 'node:fs'
const path=process.argv[2]??'server/test-results/auth-optimization/compare.json'
const data=JSON.parse(readFileSync(path)),groups=new Map()
const baselineName=process.argv[3]??'baseline',candidateName=process.argv[4]??'candidate'
if(baselineName===candidateName)throw new Error('Choose two distinct variants')
for(const name of [baselineName,candidateName])if(!data.rows.some(row=>row.variant===name))throw new Error('Missing variant: '+name)
let seed=1776
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
const mean=a=>a.reduce((a,b)=>a+b,0)/a.length
for(const row of data.rows){const key=[row.transport,row.endpoint,row.scenario??'owner',row.concurrency].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
const results=[]
const excluded=[]
for(const [cell,rows] of groups){
  const base=rows.filter(r=>r.variant===baselineName),candidate=rows.filter(r=>r.variant===candidateName)
  const pairs=[]
  for(const repeat of new Set(rows.map(r=>r.repeat))) {
    const b=base.filter(r=>r.repeat===repeat),c=candidate.filter(r=>r.repeat===repeat)
    const valid=r=>r.n===2000 && r.errors===0 && (r.invalidSamples??0)===0 && r.samples.length===r.n
    if(b.length===1&&c.length===1&&valid(b[0])&&valid(c[0]))pairs.push([b[0],c[0]])
    else excluded.push({cell,repeat,reason:'Incomplete, duplicate or failed pair',rows:[...b,...c].map(({variant,n,errors,invalidSamples,outcomes})=>({variant,n,errors,invalidSamples,outcomes}))})
  }
  if(!pairs.length)continue
  const logRatios=pairs.map(([b,c])=>Math.log(c.latency.p95/b.latency.p95))
  const boot=Array.from({length:10000},()=>Math.expm1(mean(Array.from({length:pairs.length},()=>logRatios[Math.floor(random()*pairs.length)])))*100).sort((a,b)=>a-b)
  results.push({cell,repeats:pairs.length,evidence:pairs.length===5?'Repeated comparison':'Outcome probe or incomplete comparison; no confidence interval',baselineP50:mean(pairs.map(([b])=>b.latency.p50)),candidateP50:mean(pairs.map(([,c])=>c.latency.p50)),baselineP95:mean(pairs.map(([b])=>b.latency.p95)),candidateP95:mean(pairs.map(([,c])=>c.latency.p95)),p95ChangePercent:Math.expm1(mean(logRatios))*100,pairedRunBootstrap95CI:pairs.length===5?[boot[250],boot[9750]]:null,baselineThroughput:mean(pairs.map(([b])=>b.throughput)),candidateThroughput:mean(pairs.map(([,c])=>c.throughput)),errors:pairs.flat().reduce((s,r)=>s+r.errors,0),retries:pairs.flat().reduce((s,r)=>s+r.retries,0)})
}
const report={baselineName,candidateName,completedCells:data.rows.length,measuredRequests:data.rows.reduce((s,r)=>s+r.n,0),metadata:data.metadata,method:'Paired run log p95 ratio; deterministic bootstrap only for five valid paired repeats (10,000 resamples); descriptive 95% percentile interval, no multiple-comparison correction. Failed/incomplete pairs are listed separately.',excluded,results}
writeFileSync(path.replace(/\.json$/,process.argv[3]?`.${baselineName}-${candidateName}.summary.json`:'.summary.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
