import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root=new URL('../../client/src/',import.meta.url)
let files=0
const violations=[]
function inspect(directory) {
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
    const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory)
    if(entry.isDirectory()) {inspect(url);continue}
    if(!/\.tsx?$/.test(entry.name)||/\.test\.tsx?$/.test(entry.name)) continue
    files++
    const source=ts.createSourceFile(fileURLToPath(url),readFileSync(url,'utf8'),ts.ScriptTarget.Latest,true)
    function visit(node) {
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)) {
        const method=node.expression.name.text,receiver=node.expression.expression.getText(source)
        if(['rpc','channel'].includes(method)||(method==='from'&&receiver!=='Array')) violations.push(source.fileName+': '+node.expression.getText(source))
      }
      if(ts.isPropertyAccessExpression(node)&&['storage','realtime'].includes(node.name.text)) violations.push(source.fileName+': '+node.getText(source))
      if(ts.isStringLiteral(node)&&/\/(rest|graphql|storage|realtime)\/v1\b/.test(node.text)) violations.push(source.fileName+': direct data URL')
      if(ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='@supabase/supabase-js') {
        const bindings=node.importClause?.namedBindings
        if(bindings&&ts.isNamedImports(bindings)&&bindings.elements.some(e=>(e.propertyName??e.name).text==='createClient')) {
          assert.equal(fileURLToPath(url),fileURLToPath(new URL('lib/supabase.ts',root)),'Supabase construction belongs in the Auth client')
        }
      }
      ts.forEachChild(node,visit)
    }
    visit(source)
  }
}
inspect(root)
assert.deepEqual(violations,[],'Production client has an unreviewed direct data surface')
console.log(`PASS Auth-only Supabase client boundary across ${files} production TypeScript files`)
