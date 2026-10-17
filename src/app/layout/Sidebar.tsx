import { Link } from 'react-router'
import { NavItem } from '../../components/primitives/Controls'
import { pagePaths } from '../navigation'
import { Avatar, Botanical, Icon } from '../../components/ui'
import { useAccount } from '../../features/auth/accountContext'
import { communityNavigation } from '../navigation'
import styles from './Sidebar.module.css'

type CommunityIdentity = { name: string; subtitle: string; location: string; motto: string }

export function Sidebar({ member, community }: { member: boolean; community: CommunityIdentity }) {
  const account = useAccount()
  return <aside className={`sidebar ${styles.sidebar}`} aria-label="Community and account">
    <Link className={`brand ${styles.brand}`} to={pagePaths['community-home']}><span>{community.name}</span><small>{community.subtitle}</small></Link>
    <div className="community-location"><Icon name="pin" size={15}/>{community.location}</div>
    <nav aria-label="Community navigation">{communityNavigation.map(item => <NavItem end key={item.id} to={pagePaths[item.id]}>
      <Icon name={item.icon}/>{item.label}{!member && (item.id === 'meet-play' || item.id === 'discussion') && <Icon name="lock" size={14}/>}
    </NavItem>)}</nav>
    <div className="sidebar-bottom">
      <div className={`sidebar-quote ${styles.quote}`}><Botanical/><p>{community.motto}</p></div>
      <section className={styles.userArea} aria-label="Your space">
        <NavItem to={pagePaths['account']} className={styles.account}>
          <Avatar name={(account.displayName || 'Your account').slice(0, 1)}/>
          <div><strong title={account.displayName || 'Your account'}>{account.status === 'loading' ? 'Checking your account…' : account.displayName || 'Your account'}</strong></div>
        </NavItem>
      </section>
    </div>
  </aside>
}

export function MobilePersonalNavigation() {
  return <nav className={styles.mobileNavigation} aria-label="Personal navigation"><NavItem to={pagePaths['account']}><Icon name="user" size={17}/>My Account</NavItem></nav>
}
