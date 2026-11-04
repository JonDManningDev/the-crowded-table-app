import { Icon } from '../../../components/ui'
import { GameArt } from '../../../components/GameArt'
import type { CommunityProfileContent } from '../types'
import styles from './CommunityFavoriteGamesPanel.module.css'

export function CommunityFavoriteGamesPanel({ favorites }: { favorites: CommunityProfileContent['favorites'] }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2 data-heading="card">A few favorite games</h2>
        <Icon name="dice" />
      </div>
      <div className={styles['favorites']}>
        {favorites.map(game => (
          <div key={game.name}>
            <GameArt type={game.art} />
            <h3 data-heading="item">{game.name}</h3>
          </div>
        ))}
      </div>
    </section>
  )
}
