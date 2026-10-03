import { createContext, useContext } from 'react'

type AccountSummary = { status: 'loading' | 'signed-in' | 'signed-out'; email: string | null }

export const AccountContext = createContext<AccountSummary>({ status: 'signed-out', email: null })
export function useAccount() { return useContext(AccountContext) }
