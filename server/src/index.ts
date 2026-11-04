import { buildApi } from './app.ts'
import { verifyBearer } from './auth.ts'
import { checkRuntime, connectDatabase } from './database.ts'

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}.`)
  return value
}
const db = connectDatabase(required('DATABASE_URL'))
const api = buildApi(db, verifyBearer(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'), process.env.SUPABASE_JWT_ISSUER), required('DIRECTORY_CURSOR_KEY'))
try {
  await checkRuntime(db)
  await api.listen({ host: process.env.HOST ?? '127.0.0.1', port: Number(process.env.PORT ?? 3001) })
  console.info('Crowded Table API listening')
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void api.close() })
} catch {
  await api.close()
  console.error('API startup failed. Check the runtime credentials, migrations and listener configuration.')
  process.exitCode = 1
}
