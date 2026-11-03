import { Button } from '../../../components/primitives/Controls'
import { Botanical, Icon, Tag } from '../../../components/ui'
import { GameArt } from '../../../components/GameArt'
import type { ChampionshipContent } from '../types'
import styles from './ChampionshipHero.module.css'

export function ChampionshipHero({ content, isRegistered, isMemberPreview, onOpenResult }: {
  content: ChampionshipContent['hero']
  isRegistered: boolean
  isMemberPreview: boolean
  onOpenResult: () => void
}) {
  return (
    <section className={styles.hero}>
      <div>
        <Tag tone="gold">{content.badge}</Tag>
        <h2 data-heading="hero">All aboard<br/>for good company.</h2>
        <p>Build routes. Explore new cities. Meet your next favorite opponent.</p>
        <div className={styles.game}>{content.game} <span>{content.qualifyingLabel}</span></div>
        <Button appearance="secondary" className="button light" onClick={onOpenResult}>
          {isRegistered ? 'Submit a match result' : 'Join the Championship'}
          <Icon name="arrow" size={18}/>
        </Button>
        <small>
          {isRegistered
            ? 'You’re registered. Let the friendly competition begin.'
            : isMemberPreview
              ? 'Included with your membership'
              : 'L200 competition-only entry · preview price'}
        </small>
      </div>
      <GameArt type={content.art}/>
      <Botanical/>
    </section>
  )
}
