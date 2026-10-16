import { Icon } from '../../../components/ui'
import { useAccount } from '../../auth/accountContext'
import { OwnedCommunities } from '../../OwnedCommunities'
import styles from './MyCommunitiesPage.module.css'

export function MyCommunitiesPage({ previewName, previewLocation, embedded = false }: { previewName: string; previewLocation: string; embedded?: boolean }) {
  const account = useAccount()
  const sample = <li className={styles.preview}><div><span className="eyebrow">SAMPLE COMMUNITY</span><h2>{previewName}</h2><p><Icon name="pin" size={15}/>{previewLocation}</p><p>A preview community to explore.</p></div><a className="button" href="#community-home">Explore community <Icon name="arrow" size={18}/></a></li>
  return <div className={styles.page}>
    {!embedded && <header><span className="eyebrow">MORE PLACES TO BELONG</span><h1>My Communities</h1></header>}
    <div className={styles.toolbar}><p>The communities you own, plus a sample community to explore.</p>{account.status === 'signed-in' && <button className="button" disabled={account.busy} onClick={account.createCommunity}>Start New Community <Icon name="plus" size={18}/></button>}</div>
    {account.status === 'signed-in' && account.userId ? <OwnedCommunities key={account.userId} userId={account.userId} sample={sample}/> : <>{account.status === 'loading' ? <p role="status">Loading your account…</p> : <p>Sign in to see your communities.</p>}<ul className="community-list">{sample}</ul></>}
  </div>
}
