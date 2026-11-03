import { useOutletContext } from 'react-router'
import type { MockModel } from '../mock/useMockState'

export type AppRouteContext = { model: MockModel; open: (id: string) => void; membership: () => void }
export function useAppRouteContext() { return useOutletContext<AppRouteContext>() }
