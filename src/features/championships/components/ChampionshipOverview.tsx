import { Button } from '../../../components/primitives/Controls'
import { Notice } from '../../../components/primitives/Notice'
import { Botanical, Icon } from '../../../components/ui'
import type { ChampionshipContent } from '../types'
import styles from './ChampionshipOverview.module.css'

export function ChampionshipOverview({ steps, onOpenRules }: {
  steps: ChampionshipContent['steps']
  onOpenRules: () => void
}) {
  return (
    <div className={styles.layout}>
      <section className="panel">
        <div className="section-heading">
          <h2>A month of possibility</h2>
          <Icon name="trophy"/>
        </div>
        {steps.map(([title, body], index) => (
          <div className={styles.step} key={title}>
            <span>{index + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </div>
        ))}
        <Button appearance="ghost" className="text-button" onClick={onOpenRules}>
          Read the October rules <Icon name="arrow" size={17}/>
        </Button>
      </section>
      <aside className={`panel ${styles.warm}`}>
        <span className="eyebrow">THE SPIRIT OF OUR CHAMPIONSHIP</span>
        <h2>For the love<br/>of the game.</h2>
        <p>
          You don’t have to be the best player in the room. Just bring your curiosity, be a good
          sport, and enjoy the people across the table.
        </p>
        <Botanical/>
        <Notice icon="star" className={styles.note}>
           Bragging rights. A little prize. A lot of belonging.
        </Notice>
      </aside>
    </div>
  )
}
