import panelStyles from './AccountPanel.module.css'
import styles from './PremiumFeaturesPanel.module.css'
import { ActionLink } from '../../../components/primitives/Controls'
import { Icon } from '../../../components/ui'
import type { PremiumFeaturePlaceholder } from '../types'

type PremiumFeaturesPanelProps = {
  features: readonly PremiumFeaturePlaceholder[]
  canManage: boolean
  manageTo: string
  exploreTo: string
}

export function PremiumFeaturesPanel({ features, canManage, manageTo, exploreTo }: PremiumFeaturesPanelProps) {
  return (
    <section className={`panel ${styles.panel}`}>
      <h2 data-heading="card">My Premium Features</h2>
      <p className="muted">
        Your subscriptions will appear here, each with a Manage link to its feature settings.
      </p>
      <ul className={styles.list} aria-label="Premium feature placeholders">
        {features.map(feature => (
          <li className="setting-row" key={feature.id}>
            <div>
              <strong>{feature.name}</strong>
              <small>{feature.detail}</small>
            </div>
            {canManage ? (
              <ActionLink appearance="outline" to={manageTo}>Manage</ActionLink>
            ) : (
              <span className="muted">Sign in to manage</span>
            )}
          </li>
        ))}
      </ul>
      <div className={panelStyles.actions}>
        <ActionLink className="button" to={exploreTo}>
          Explore Premium Features <Icon name="arrow" size={17}/>
        </ActionLink>
      </div>
    </section>
  )
}
