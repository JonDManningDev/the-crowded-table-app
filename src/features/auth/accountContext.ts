import { createContext, useContext } from 'react'

type AccountSummary = { status: 'loading' | 'signed-in' | 'signed-out'; email: string | null; userId?: string; busy?: boolean; signIn?: () => void; signUp?: () => void; signOut?: () => void; createCommunity?: () => void; displayName?: string; bio?: string; profileLoading?: boolean; profileError?: string; saveProfile?: (name: string, bio: string) => Promise<void>; manageCommunities?: () => void }

export const AccountContext = createContext<AccountSummary>({ status: 'signed-out', email: null })
export function useAccount() { return useContext(AccountContext) }
