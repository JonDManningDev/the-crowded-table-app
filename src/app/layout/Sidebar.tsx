import { Link } from 'react-router'
import { pagePaths } from '../navigation'
import { Avatar, Botanical, Icon } from '../../components/ui'
import { useAccount } from '../../features/auth/accountContext'
import { communityNavigation, personalNavigation } from '../navigation'
import type { Page } from '../navigation'
import styles from './Sidebar.module.css'

type CommunityIdentity = { name: string; subtitle: string; location: string; motto: string }

export function Sidebar({ page, member, community }: { page: Page | undefined; member: boolean; community: CommunityIdentity }) {
  const account = useAccount()
  return <aside className={`sidebar ${styles.sidebar}`} aria-label="Community and account">
    <Link className={`brand ${styles.brand}`} to={pagePaths['community-home']}><span>{community.name}</span><small>{community.subtitle}</small></Link>
    <div className="community-location"><Icon name="pin" size={15}/>{community.location}</div>
    <nav aria-label="Community navigation">{communityNavigation.map(item => <Link key={item.id} to={pagePaths[item.id]} className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined}>
      <Icon name={item.icon}/>{item.label}{!member && (item.id === 'meet-play' || item.id === 'discussion') && <Icon name="lock" size={14}/>}
    </Link>)}</nav>
    <div className="sidebar-bottom">
      <div className={`sidebar-quote ${styles.quote}`}><Botanical/><p>{community.motto}</p></div>
      <section className={styles.userArea} aria-label="Your space">
        <Link to={pagePaths['account']} className={styles.account} aria-current={page === 'account' || page === 'account-settings' ? 'page' : undefined}>
          <Avatar name={(account.displayName || 'Your account').slice(0, 1)}/>
          <div><strong title={account.displayName || 'Your account'}>{account.status === 'loading' ? 'Checking your account…' : account.displayName || 'Your account'}</strong></div>
        </Link>
        <nav aria-label="Personal navigation">{personalNavigation.map(item => <Link key={item.id} to={pagePaths[item.id]} className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} size={18}/>{item.label}</Link>)}</nav>
      </section>
    </div>
  </aside>
}

export function MobilePersonalNavigation({ page }: { page: Page | undefined }) {
  return <nav className={styles.mobileNavigation} aria-label="Personal navigation"><Link to={pagePaths['account']} aria-current={page === 'account' || page === 'account-settings' ? 'page' : undefined}><Icon name="user" size={17}/>My Account</Link>{personalNavigation.map(item => <Link key={item.id} to={pagePaths[item.id]} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} size={17}/>{item.label}</Link>)}</nav>
}
