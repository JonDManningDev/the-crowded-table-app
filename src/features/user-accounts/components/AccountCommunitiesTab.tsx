import { Button } from '../../../components/primitives/Controls'
import { authPaths } from '../../../app/navigation'
import { useAccount, useAccountCommunities } from '../hooks'
import { readAccountSampleCommunity } from '../api'
import { CommunitiesToolbar } from './CommunitiesToolbar'
import { CommunitiesList } from './CommunitiesList'
import styles from './AccountCommunitiesTab.module.css'

const empty = {
  all: 'You haven’t joined or created a community yet.',
  managed: 'You don’t manage any communities yet.',
  owned: 'You haven’t created a community yet.',
}

export function AccountCommunitiesTab() {
  const account = useAccount()
  const userId = account.status === 'signed-in' ? account.userId : undefined
  const { filter, communities, isLoading, loadError, changeFilter, retry } = useAccountCommunities(userId)
  if (account.status === 'loading') return <p role="status">Loading your account…</p>
  if (!userId) return <p>Sign in to see your communities.</p>
  const sample = readAccountSampleCommunity()
  return (
    <div className={styles.page}>
      <CommunitiesToolbar filter={filter} onFilterChange={changeFilter} createCommunityTo={authPaths['create-community']}/>
      {isLoading ? <p role="status">Loading your communities…</p>
        : loadError ? <><p role="alert">{loadError}</p><Button appearance="outline" onClick={retry}>Try again</Button></>
          : !communities.length ? <p>{empty[filter]}</p> : null}
      <CommunitiesList communities={filter === 'all' ? [...communities, sample] : communities}/>
    </div>
  )
}
