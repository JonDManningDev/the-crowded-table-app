import { ActionLink } from '../../../components/primitives/Controls'
import { Icon } from '../../../components/ui'
import panelStyles from './AccountPanel.module.css'
import styles from './HomeWelcomePanel.module.css'

type HomeWelcomePanelProps = {
  communitiesTo: string
}

export function HomeWelcomePanel({ communitiesTo }: HomeWelcomePanelProps) {
  return (
    <section className={styles.welcome} aria-labelledby="welcome-title">
      <div>
        <span className={styles.label}>WELCOME HOME</span>
        <h2 id="welcome-title" data-heading="hero">
          All your tables,<br/><em>in one place.</em>
        </h2>
        <p>
          Your personal feed is taking shape. Soon, you’ll find updates from
          your communities, your next games, and a little inspiration for what
          to play next.
        </p>
        <div className={panelStyles.actions}>
          <ActionLink className="button" to={communitiesTo}>
            My Communities <Icon name="arrow" size={18}/>
          </ActionLink>
        </div>
      </div>
      <div className={styles.illustration} aria-hidden="true">
        <Icon name="people" size={76}/>
        <span>Games · People · Belonging</span>
      </div>
    </section>
  )
}
