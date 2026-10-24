import type { CommunityCardData } from '../communities'
import { CommunityCard } from './CommunityCard'
import styles from './CommunitiesList.module.css'

export function CommunitiesList({ communities }: { communities: CommunityCardData[] }) {
  return <ul className={styles.list}>{communities.map(community => (
    <CommunityCard key={community.id} community={community}/>
  ))}</ul>
}
