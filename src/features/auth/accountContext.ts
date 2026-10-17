import { createContext, useContext } from 'react'

type AccountSummary = { status: 'loading' | 'signed-in' | 'signed-out'; email: string | null; userId?: string; busy?: boolean; signOut?: () => void; displayName?: string; bio?: string; profileLoading?: boolean; profileError?: string; saveProfile?: (name: string, bio: string) => Promise<void> }

export const AccountContext = createContext<AccountSummary>({ status: 'signed-out', email: null })
export function useAccount() { return useContext(AccountContext) }
