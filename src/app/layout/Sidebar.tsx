import { Avatar, Botanical, Icon } from '../../components/ui'
import { useAccount } from '../../features/auth/accountContext'
import { communityNavigation, personalNavigation } from '../navigation'
import type { Page } from '../navigation'
import styles from './Sidebar.module.css'

type CommunityIdentity = { name: string; subtitle: string; location: string; motto: string }

export function Sidebar({ page, member, community }: { page: Page; member: boolean; community: CommunityIdentity }) {
  const account = useAccount()
  return <aside className={`sidebar ${styles.sidebar}`} aria-label="Community and account">
    <a className={`brand ${styles.brand}`} href="#community-home"><span>{community.name}</span><small>{community.subtitle}</small></a>
    <div className="community-location"><Icon name="pin" size={15}/>{community.location}</div>
    <nav aria-label="Community navigation">{communityNavigation.map(item => <a key={item.id} href={`#${item.id}`} className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined}>
      <Icon name={item.icon}/>{item.label}{!member && (item.id === 'meet-play' || item.id === 'discussion') && <Icon name="lock" size={14}/>}
    </a>)}</nav>
    <div className="sidebar-bottom">
      <div className={`sidebar-quote ${styles.quote}`}><Botanical/><p>{community.motto}</p></div>
      <section className={styles.userArea} aria-label="Your space">
        <div className={styles.account}>
          {account.email ? <Avatar name={account.email}/> : <Icon name="user"/>}
          <div><strong>{account.status === 'loading' ? 'Checking your account…' : account.email || 'Your space'}</strong><small>{account.status === 'signed-in' ? 'Your Crowded Table account' : 'Sign in to make yourself at home'}</small></div>
        </div>
        <nav aria-label="Personal navigation">{personalNavigation.map(item => <a key={item.id} href={`#${item.id}`} className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} size={18}/>{item.label}</a>)}</nav>
      </section>
    </div>
  </aside>
}

export function MobilePersonalNavigation({ page }: { page: Page }) {
  return <nav className={styles.mobileNavigation} aria-label="Personal navigation">{personalNavigation.map(item => <a key={item.id} href={`#${item.id}`} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} size={17}/>{item.label}</a>)}</nav>
}
