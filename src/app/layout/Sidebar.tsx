import { Link } from 'react-router'
import { NavItem } from '../../components/primitives/Controls'
import { accountRootPath, pagePaths } from '../navigation'
import { Avatar, Botanical, Icon } from '../../components/ui'
import { useAccount } from '../../features/auth/accountContext'
import { communityNavigation } from '../navigation'
import styles from './Sidebar.module.css'

type CommunityIdentity = { name: string; subtitle: string; location: string; motto: string }

export function Sidebar({ member, community }: { member: boolean; community: CommunityIdentity }) {
  const account = useAccount()
  const accountName = account.displayName || 'Your account'
  return (
    <aside className={styles.sidebar} aria-label="Community and account">
      <Link className={styles.brand} to={pagePaths['community-home']}>
        <span>{community.name}</span>
        <small>{community.subtitle}</small>
      </Link>
      <div className={styles.location}>
        <Icon name="pin" size={15}/>
        {community.location}
      </div>
      <nav aria-label="Community navigation">
        {communityNavigation.map(item => (
          <NavItem end key={item.id} to={pagePaths[item.id]}>
            <Icon name={item.icon}/>
            {item.label}
            {!member && (item.id === 'meet-play' || item.id === 'discussion') && (
              <Icon name="lock" size={14}/>
            )}
          </NavItem>
        ))}
      </nav>
      <div className={styles.bottom}>
        <div className={styles.quote}>
          <Botanical/>
          <p>{community.motto}</p>
        </div>
        <section className={styles.userArea} aria-label="Your space">
          <NavItem to={accountRootPath} className={styles.account}>
            <Avatar name={accountName.slice(0, 1)}/>
            <div>
              <strong title={accountName}>
                {account.status === 'loading' ? 'Checking your account…' : accountName}
              </strong>
            </div>
          </NavItem>
        </section>
      </div>
    </aside>
  )
}

export function MobilePersonalNavigation() {
  return (
    <nav className={styles.mobileNavigation} aria-label="Personal navigation">
      <NavItem to={accountRootPath}>
        <Icon name="user" size={17}/>
        My Account
      </NavItem>
    </nav>
  )
}
