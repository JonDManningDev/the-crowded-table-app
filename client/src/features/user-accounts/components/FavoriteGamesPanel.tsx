import { GameArt } from '../../../components/GameArt'
import { Icon } from '../../../components/ui'
import type { AccountProfilePlaceholders } from '../types'
import styles from './FavoriteGamesPanel.module.css'

export function FavoriteGamesPanel({ games }: { games: AccountProfilePlaceholders['favoriteGames'] }) {
  return (
    <section className={`panel ${styles.panel}`}>
      <div className="section-heading">
        <h2 data-heading="card">A few favorite games</h2><Icon name="dice"/>
      </div>
      <div className={styles.games}>
        {games.map(game => <div key={game.name}>
          <GameArt type={game.art} className={styles.art}/>
          <h3 data-heading="item">{game.name}</h3>
        </div>)}
      </div>
    </section>
  )
}
