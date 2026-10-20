import { ActionLink } from '../../../components/primitives/Controls'
import { authPaths, pagePaths } from '../../../app/navigation'
import { Icon } from '../../../components/ui'
import { useAccount } from '../../auth/accountContext'
import { OwnedCommunities } from './OwnedCommunities'
import styles from './MyCommunitiesTab.module.css'

export function MyCommunitiesTab({ previewName, previewLocation }: { previewName: string; previewLocation: string }) {
  const account = useAccount()
  if (account.status === 'loading') return <p role="status">Loading your account…</p>
  if (account.status !== 'signed-in') return <p>Sign in to see your communities.</p>
  const sample = <li className={styles.preview}><div><span className="eyebrow">SAMPLE COMMUNITY</span><h2>{previewName}</h2><p className="account-metadata"><Icon name="pin" size={15}/>{previewLocation}</p><p>A preview community to explore.</p></div><ActionLink className="button" to={pagePaths['community-home']}>Explore community <Icon name="arrow" size={18}/></ActionLink></li>
  return <div className={styles.page}>
    <div className={styles.toolbar}>{account.status === 'signed-in' && <ActionLink to={authPaths['create-community']}>Start New Community <Icon name="plus" size={18}/></ActionLink>}</div>
    {account.userId ? <OwnedCommunities key={account.userId} userId={account.userId} sample={sample}/> : <ul className="community-list">{sample}</ul>}
  </div>
}
