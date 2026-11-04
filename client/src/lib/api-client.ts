import { supabase } from './supabase'

export async function currentApiUser() {
  if (!supabase) throw new Error('Account services are not configured.')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('Account session changed.')
  return data.session
}

export async function selfServiceRequest<T>(userId: string, path: string, method = 'GET', body?: object): Promise<T> {
  // Bind every operation, including every list page, to the initiating identity.
  const session = await currentApiUser()
  if (session.user.id !== userId) throw new Error('Account session changed.')
  const response = await fetch(path, { method, redirect: 'error', cache: 'no-store',
    headers: { Authorization: 'Bearer ' + session.access_token, ...(body && { 'Content-Type': 'application/json' }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  if (!response.ok) throw new Error('Account operation failed.')
  return response.json() as Promise<T>
}
