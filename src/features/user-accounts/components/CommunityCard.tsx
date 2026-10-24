import { ActionLink, Button } from '../../../components/primitives/Controls'
import { Icon } from '../../../components/ui'
import { pagePaths } from '../../../app/navigation'
import type { CommunityCardData } from '../communities'
import styles from './CommunityCard.module.css'

export function CommunityCard({ community }: { community: CommunityCardData }) {
  const eyebrow = community.sample ? 'Sample Community'
    : community.participation === 'Owner' ? 'Owned Community'
      : community.participation === 'Staff' ? 'Managed Community' : 'Joined Community'
  const action = <>Explore community <Icon name="arrow" size={18}/></>
  return (
    <li className={styles.card}>
      <div className={styles.content}>
        <span className="eyebrow">{eyebrow}</span>
        <h2 data-heading="card">{community.name}</h2>
        <p className={`account-metadata ${styles.location}`}><Icon name="pin" size={15}/>{community.place}</p>
        <p className="account-metadata">{community.status} · {community.participation}</p>
      </div>
      {community.sample
        ? <ActionLink to={pagePaths['community-home']}>{action}</ActionLink>
        : <Button disabled>{action}</Button>}
    </li>
  )
}
