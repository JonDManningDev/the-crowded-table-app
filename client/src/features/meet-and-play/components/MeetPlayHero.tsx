import { HeroFeaturePanel } from '../../../components/shared/HeroFeaturePanel'
import { Button } from '../../../components/primitives/Controls'
import { Botanical, Icon } from '../../../components/ui'
import styles from './MeetPlayHero.module.css'

export function MeetPlayHero({ matching, onOpenMatching }: { matching: boolean; onOpenMatching: () => void }) {
  return (
    <section className={styles.hero}>
      <div>
        <span className="eyebrow">GOOD PEOPLE FIND GREAT GAMES HERE</span>
        <h2 data-heading="hero">Your next favorite group<br/>starts with a hello.</h2>
        <p>Homes, cafés, a sunny afternoon. There’s more than one way to gather.</p>
      </div>
      <div className={styles.feature}>
        <HeroFeaturePanel
          icon={<Icon name="people" size={26}/>}
          heading="Meet someone new"
          description="A familiar game. A few unfamiliar faces. Let us help you find your next table."
          action={(
            <Button appearance="secondary" onClick={() => onOpenMatching()}>
              {matching ? 'Update your preferences' : 'Find my people'}
              <Icon name="arrow" size={17}/>
            </Button>
          )}
        />
      </div>
      <Botanical/>
    </section>
  )
}
