import styles from './AccountPanel.module.css'
import { ActionLink } from '../../../components/primitives/Controls'
import { Icon } from '../../../components/ui'
import { pagePaths } from '../../../app/navigation'
import { useAccount } from '../../auth/accountContext'

const features = [
  {
    id: 'community-ownership',
    name: 'Community ownership',
    detail: 'Sample subscription row · Billing is not connected',
  },
]

export function PremiumFeaturesPanel() {
  const account = useAccount()
  return (
    <section className="panel">
      <h2>My Premium Features</h2>
      <p className="muted">
        Your subscriptions will appear here, each with a Manage link to its feature settings.
      </p>
      <div className="notice">
        Subscription data is not connected yet. Community ownership and future pro hosting and
        organizer features will be listed here.
      </div>
      <ul
        className={`premium-feature-list ${styles.premiumList}`}
        aria-label="Premium feature placeholders"
      >
        {features.map(feature => (
          <li key={feature.id}>
            <div>
              <strong>{feature.name}</strong>
              <small>{feature.detail}</small>
            </div>
            {account.status === 'signed-in' ? (
              <ActionLink appearance="outline" to={pagePaths['my-communities']}>Manage</ActionLink>
            ) : (
              <span className="muted">Sign in to manage</span>
            )}
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <ActionLink className="button" to={pagePaths['premium-features']}>
          Explore Premium Features <Icon name="arrow" size={17}/>
        </ActionLink>
      </div>
    </section>
  )
}
