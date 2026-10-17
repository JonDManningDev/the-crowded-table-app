import { useEffect, useState, type ReactNode } from 'react'
import { readOwnProfile, saveOwnProfile } from '../user-accounts/api'
import { AccountContext, useAccount } from './accountContext'

export function AccountProfileProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  return <ProfileProvider key={userId || 'guest'} userId={userId}>{children}</ProfileProvider>
}

function ProfileProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const account = useAccount()
  const [profile, setProfile] = useState({ display_name: '', bio: '' })
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')
  useEffect(() => {
    if (!userId) return
    let active = true
    void (async () => {
      try {
        const result = await readOwnProfile(userId)
        if (active && result) setProfile({ display_name: result.display_name, bio: result.bio || '' })
      } catch { if (active) setError('Your account profile could not be loaded. Please reload to try again.') }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [userId])
  async function saveProfile(name: string, bio: string) {
    if (!userId) throw new Error('Sign in to save your account profile.')
    await saveOwnProfile(name, bio)
    setProfile({ display_name: name.trim(), bio: bio.trim() }); setError('')
  }
  return <AccountContext.Provider value={{ ...account, displayName: profile.display_name, bio: profile.bio, profileLoading: loading, profileError: error, saveProfile }}>{children}</AccountContext.Provider>
}
