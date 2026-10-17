import { Button } from '../components/primitives/Controls'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import './CreateCommunity.css'

type Tenant = Pick<Database['public']['Tables']['tenants']['Row'], 'id' | 'name' | 'slug' | 'country_code' | 'state_province' | 'city' | 'timezone' | 'operational_status'>
export function OwnedCommunities({ userId, sample }: { userId: string; sample?: ReactNode }) {
  const [rows, setRows] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    // Owner-only RLS is the access boundary; never derive ownership from created_by.
    if (!supabase) { return }
    void (async () => {
      try {
        const { data, error: failure } = await supabase.from('tenants').select('id,name,slug,country_code,state_province,city,timezone,operational_status').order('created_at', { ascending: false })
        if (!active) return
        if (failure) { setError('We couldn’t load your communities. Please try again.'); return }
        setRows(data || [])
      } catch { if (active) setError('We couldn’t load your communities. Please try again.') }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [userId, attempt])
  return <>
    {!supabase ? <p role="alert">Community services are not configured.</p> : loading ? <p role="status">Loading your communities…</p> : error ? <><p role="alert" className="auth-error">{error}</p><Button appearance="unstyled" onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Try again</Button></> : !rows.length && <p>You haven’t created a community yet.</p>}
    <ul className="owned-communities community-list">{rows.map(row => <li key={row.id}><div><span className="eyebrow">YOUR COMMUNITY</span><h2>{row.name}</h2><p>{row.slug} · Owner · {row.operational_status === 'archived' ? 'Archived' : 'Active'}</p><p>{[row.city, row.state_province, row.country_code].filter(Boolean).join(', ')} · {row.timezone}</p></div></li>)}{sample}</ul>
  </>
}
