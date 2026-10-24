import { useEffect, useState } from 'react'
import { ActionLink, Button } from '../../../components/primitives/Controls'
import { FilterChip, FilterChipGroup } from '../../../components/primitives/FilterChip'
import { authPaths } from '../../../app/navigation'
import { Icon } from '../../../components/ui'
import { useAccount } from '../../auth/accountContext'
import { readMyCommunities, toCommunityCards, type CommunityCardData, type CommunityFilter } from '../communities'
import { CommunitiesList } from './CommunitiesList'
import styles from './MyCommunitiesTab.module.css'

const filters = { all: 'All', managed: 'Managed', owned: 'Owned' } as const
const empty = {
  all: 'You haven’t joined or created a community yet.',
  managed: 'You don’t manage any communities yet.',
  owned: 'You haven’t created a community yet.',
}

export function MyCommunitiesTab({ previewName, previewLocation }: { previewName: string; previewLocation: string }) {
  const account = useAccount()
  const userId = account.status === 'signed-in' ? account.userId : undefined
  const [selection, setSelection] = useState<{ userId?: string; filter: CommunityFilter }>({ filter: 'all' })
  const filter = selection.userId === userId ? selection.filter : 'all'
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${userId || ''}:${filter}:${attempt}`
  const [result, setResult] = useState<{ key: string; rows: CommunityCardData[]; error: string }>()
  const [previousUserId, setPreviousUserId] = useState(userId)
  if (previousUserId !== userId) {
    setPreviousUserId(userId)
    setResult(undefined)
    setSelection({ userId, filter: 'all' })
  }
  useEffect(() => {
    if (!userId) return
    let active = true
    void readMyCommunities(filter).then(rows => {
      if (active) setResult({ key: requestKey, rows: toCommunityCards(rows), error: '' })
    }).catch((error: unknown) => {
      if (active) setResult({ key: requestKey, rows: [], error: error instanceof Error ? error.message : 'We couldn’t load your communities. Please try again.' })
    })
    return () => { active = false }
  }, [userId, filter, requestKey])
  if (account.status === 'loading') return <p role="status">Loading your account…</p>
  if (!userId) return <p>Sign in to see your communities.</p>
  const current = result?.key === requestKey ? result : undefined
  const rows = current?.rows || []
  const sample: CommunityCardData = { id: 'sample', name: previewName, place: previewLocation, status: 'Active', participation: 'Member', sample: true }
  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <FilterChipGroup label="Filter communities">
          {(Object.keys(filters) as CommunityFilter[]).map(value => <FilterChip key={value} selected={filter === value}
            onClick={() => { setSelection({ userId, filter: value }); setAttempt(previous => previous + 1) }}>{filters[value]}</FilterChip>)}
        </FilterChipGroup>
        <ActionLink to={authPaths['create-community']}>Start New Community <Icon name="plus" size={18}/></ActionLink>
      </div>
      {!current ? <p role="status">Loading your communities…</p>
        : current.error ? <><p role="alert">{current.error}</p><Button appearance="outline" onClick={() => setAttempt(previous => previous + 1)}>Try again</Button></>
          : !rows.length ? <p>{empty[filter]}</p> : null}
      <CommunitiesList communities={filter === 'all' ? [...rows, sample] : rows}/>
    </div>
  )
}
