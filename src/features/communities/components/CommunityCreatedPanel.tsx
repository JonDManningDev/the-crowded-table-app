import { ActionLink, Link } from '../../../components/primitives/Controls'
import { pagePaths } from '../../../app/navigation'
import type { CommunityCreationSummary } from '../types'
import styles from './CommunityCreatedPanel.module.css'

export function CommunityCreatedPanel({ savedCommunity }: { savedCommunity: CommunityCreationSummary }) {
  return <>
    <h1>Your community is ready.</h1>
    <p role="status"><strong>{savedCommunity.name}</strong> has been created. You’re its owner.</p>
    <dl className={styles.summary}>
      <dt>Community handle</dt><dd>{savedCommunity.slug}</dd>
      <dt>Location</dt><dd>{savedCommunity.locationLabel}</dd>
      <dt>Time zone</dt><dd>{savedCommunity.timezone}</dd>
    </dl>
    <p>{savedCommunity.join ? 'You’ve also joined as an approved participant.' : 'You can manage this community without joining as a participant.'}</p>
    <p>Other people will need approval to join. Profile setup and community management are coming next.</p>
    <div className="actions">
      <ActionLink to={pagePaths['my-communities']}>View your communities</ActionLink>
      <Link to={pagePaths['my-home']}>Back to My Home</Link>
    </div>
  </>
}
