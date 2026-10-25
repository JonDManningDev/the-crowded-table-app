import type { ChampionshipContent } from '../types'
import styles from './ChampionshipStats.module.css'

export function ChampionshipStats({ stats, className }: {
  stats: ChampionshipContent['stats']
  className: string
}) {
  return (
    <div className={`${styles.strip} ${className}`}>
      {stats.map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
    </div>
  )
}
