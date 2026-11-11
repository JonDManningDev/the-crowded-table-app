// Explicit opt-in and fixed project guard for development database operations.
// CLI output and SQL may contain secrets; never include child-process errors.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const projectRef = 'fsnipgsrlclbnfepcbvz'
export function hostedTools() {
  assert.ok(process.argv.includes('--allow-hosted-testing'), 'Explicit hosted opt-in required')
  assert.equal(readFileSync(new URL('../.temp/project-ref',import.meta.url),'utf8').trim(),projectRef)
  const executable=process.env.CT_SUPABASE_CLI
  assert.ok(executable,'Set CT_SUPABASE_CLI to the installed Supabase CLI executable')
  function cli(args) {
    let output
    try {
      output=execFileSync(executable,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024})
    } catch(error) { throw new Error('Hosted CLI operation failed: '+args.slice(0,2).join(' ')+'. Exit status '+error.status+'; code '+error.code+'. Child output suppressed.') }
    try { return JSON.parse(output) }
    catch { throw new Error('Hosted CLI response was not JSON: '+args.slice(0,2).join(' ')+'. Output suppressed.') }
  }
  function query(statement,readOnly=true) {
    const directory=mkdtempSync(join(tmpdir(),'ct-hosted-query-'))
    const file=join(directory,'query.sql')
    try {
      writeFileSync(file,statement,{mode:0o600})
      return cli(['db','query','--remote='+projectRef,'--file',file,readOnly?'--read-only':'--yes']).rows
    } finally {rmSync(file,{force:true});rmdirSync(directory)}
  }
  return {cli,query}
}
