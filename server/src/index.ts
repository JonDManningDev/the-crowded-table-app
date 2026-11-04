import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildApi } from './app.ts'
import { verifyBearer } from './token-verifier.ts'
import { directoryCursors } from './directory-cursors.ts'
import { checkRuntime, connectDatabase, type AppDatabase } from './database.ts'

export interface ApiConfig {
  databaseUrl: string
  projectUrl: string
  publishableKey: string
  issuer?: string
  cursorKey: string
  host: string
  port: number
}

const invalidPortMessage = 'PORT must be a decimal integer between 0 and 65535.'

function validatePort(port: number): number {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(invalidPortMessage)
  return port
}

function readPort(value = '3001'): number {
  if (!value || /[^0-9]/.test(value)) throw new Error(invalidPortMessage)
  return validatePort(Number(value))
}

export function readApiConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  function required(name: string) {
    const value = environment[name]
    if (!value) throw new Error(`Missing ${name}.`)
    return value
  }
  return {
    databaseUrl: required('DATABASE_URL'), projectUrl: required('SUPABASE_URL'),
    publishableKey: required('SUPABASE_PUBLISHABLE_KEY'), issuer: environment.SUPABASE_JWT_ISSUER,
    cursorKey: required('DIRECTORY_CURSOR_KEY'), host: environment.HOST ?? '127.0.0.1',
    port: readPort(environment.PORT),
  }
}

export interface StartupDependencies {
  verifyBearer: typeof verifyBearer
  directoryCursors: typeof directoryCursors
  connectDatabase: typeof connectDatabase
  buildApi: typeof buildApi
  checkRuntime: typeof checkRuntime
}

const startupDependencies: StartupDependencies = { verifyBearer, directoryCursors, connectDatabase, buildApi, checkRuntime }

export async function startApi(config = readApiConfig(), dependencies: StartupDependencies = startupDependencies) {
  validatePort(config.port)
  // Validate the identity/cursor configuration before allocating the pool.
  const verify = dependencies.verifyBearer(config.projectUrl, config.publishableKey, config.issuer)
  const cursors = dependencies.directoryCursors(config.cursorKey)
  let db: AppDatabase | undefined
  let api: ReturnType<typeof buildApi> | undefined
  let cleanupPromise: Promise<void> | undefined
  let closePromise: Promise<void> | undefined
  const cleanup = () => {
    const allocated = db
    if (!allocated) return Promise.resolve()
    return cleanupPromise ??= Promise.resolve().then(() => allocated.destroy())
  }
  const removeSignals = () => {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
  }
  const close = () => closePromise ??= Promise.resolve().then(() => api!.close()).finally(removeSignals)
  const onSignal = () => {
    if (closePromise) return
    void close().catch(() => {
      console.error('API shutdown failed.')
      process.exitCode = 1
    })
  }
  try {
    db = dependencies.connectDatabase(config.databaseUrl)
    api = dependencies.buildApi({ db, verify, cursors, cleanup })
    // A returned app now owns cleanup, including asynchronous boot failures.
    api.addHook('onClose', async () => { removeSignals() })
    await dependencies.checkRuntime(db)
    await api.listen({ host: config.host, port: config.port })
    process.once('SIGINT', onSignal)
    process.once('SIGTERM', onSignal)
    return api
  } catch (error) {
    try {
      if (api) await close()
      else if (db) await cleanup()
    } catch {
      // Preserve the original failure and CLI nonzero status if cleanup rejects.
      // Do not expose resource errors, credentials or SQL in startup diagnostics.
    }
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await startApi()
    console.info('Crowded Table API listening')
  } catch {
    console.error('API startup failed. Check the runtime credentials, migrations and listener configuration.')
    process.exitCode = 1
  }
}
