import { createContext } from 'react'
import type { AccountSummary } from './types'

export const AccountContext = createContext<AccountSummary>({ status: 'signed-out', email: null })
