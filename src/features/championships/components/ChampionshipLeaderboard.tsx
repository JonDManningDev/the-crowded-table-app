import { Avatar, Icon, Tag } from '../../../components/ui'
import type { ChampionshipStanding } from '../types'
import styles from './ChampionshipLeaderboard.module.css'

export function ChampionshipLeaderboard({ rankings }: {
  rankings: ChampionshipStanding[]
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">OCTOBER · TICKET TO RIDE</span>
          <h2>A little friendly rivalry</h2>
        </div>
        <Tag>Confirmed results only</Tag>
      </div>
      <div className={styles.scroll}>
        <table className={styles.leaderboard}>
          <thead>
            <tr><th>Rank</th><th>Player</th><th>Games</th><th>Points</th></tr>
          </thead>
          <tbody>
            {rankings.map((row, index) => (
              <tr key={row.name} className={row.isCurrentPlayer ? styles.you : ''}>
                <td>
                  <span className={`${styles.rank} ${styles[`rank-${index}`] || ''}`}>
                    {index < 3 ? <Icon name="trophy" size={20}/> : String(index + 1).padStart(2, '0')}
                  </span>
                </td>
                <td>
                  <div className="host">
                    <Avatar name={row.name}/>
                    <strong>{row.name}</strong>
                    {row.isCurrentPlayer && <Tag>You</Tag>}
                  </div>
                </td>
                <td>{row.games}</td>
                <td><strong>{row.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">
        Preview scoring: first place 5 points, second 3. Ties are held for review. The first six
        qualify; final selection closes October 24.
      </p>
    </section>
  )
}
