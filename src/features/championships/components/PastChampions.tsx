import { GameArt } from '../../../components/GameArt'
import { Icon, Tag } from '../../../components/ui'
import type { ChampionshipContent } from '../types'
import styles from './PastChampions.module.css'

export function PastChampions({ champions }: {
  champions: ChampionshipContent['champions']
}) {
  return (
    <div className="card-grid">
      {champions.map(row => (
        <article className={`panel ${styles.card}`} key={row.month}>
          <GameArt type={row.art}/>
          <Tag tone="gold"><Icon name="trophy" size={14}/> {row.month} {row.year}</Tag>
          <h2>{row.name}</h2>
          <p>{row.game} champion</p>
          <span className="meta">A permanent place in our table’s story.</span>
        </article>
      ))}
    </div>
  )
}
