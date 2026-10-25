import { Button } from '../../../components/primitives/Controls'
import { Botanical, Icon } from '../../../components/ui'
import { GameArt } from '../../../components/GameArt'
import type { CommunityHomeContent } from '../../../features/communities/types'
import styles from './CommunityHomeHero.module.css'

export function CommunityHomeHero({ content, onOpenEvent }: {
  content: CommunityHomeContent['hero']
  onOpenEvent: (id: string) => void
}) {
  return (
    <section className={styles.hero}>
      <div className={styles['hero-copy']}>
        <span className="eyebrow">{content.eyebrow}</span>
        <h2 data-heading="hero">A small table.<br/>A world of connection.</h2>
        <p>
          New games, familiar smiles, and friends you haven’t met yet. Your next good evening
          starts here.
        </p>
        <Button appearance="primary" className="button" onClick={() => onOpenEvent(content.eventId)}>
          Find your next game night <Icon name="arrow" size={18}/>
        </Button>
        <div className={styles['hero-note']}>
          <span className={styles['avatar-stack']}>{content.initials.map((initials, index) => <span key={index}>{initials}</span>)}</span>
          <span>Good people. A growing community.</span>
        </div>
      </div>
      <div className={styles['hero-scene']}>
        <GameArt type={content.art}/>
        <div className={styles['hero-art-card']}>
          <Icon name="dice" size={25}/>
          <span>
            {content.dateLabel}
            <strong>{content.title}</strong>
            <small>{content.note}</small>
          </span>
        </div>
        <Botanical/>
      </div>
    </section>
  )
}
