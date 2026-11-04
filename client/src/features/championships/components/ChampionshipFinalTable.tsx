import { Notice } from '../../../components/primitives/Notice'
import { Avatar, Icon, Tag } from '../../../components/ui'
import type { ChampionshipContent } from '../types'
import type { ChampionshipStanding } from '../types'
import styles from './ChampionshipFinalTable.module.css'

export function ChampionshipFinalTable({ content, rankings }: {
  content: ChampionshipContent['final']
  rankings: ChampionshipStanding[]
}) {
  return (
    <div className={styles.layout}>
      <section className={`panel ${styles.final}`}>
        <span className={styles.trophy}><Icon name="trophy" size={66}/></span>
        <span className="eyebrow">ONE TABLE. A MONTH OF MEMORIES.</span>
        <h2>{content.title}</h2>
        <p>{content.dateTime}</p>
        <p>{content.location}</p>
        <div className="tags"><Tag>{content.game}</Tag><Tag tone="gold">{content.qualifierLabel}</Tag></div>
        <p>One last game, a small surprise for our champion, and a celebration of everyone who pulled up a chair.</p>
        <Notice icon="lock"> Private address shared with confirmed finalists.</Notice>
      </section>
      <section className="panel">
        <h2>The road to the final</h2>
        <p className="muted">
          These players currently lead the way. Finalists are confirmed after qualifying closes
          on October 24.
        </p>
        {rankings.map((row, index) => (
          <div className={styles.row} key={row.name}>
            <span className="meta">0{index + 1}</span>
            <Avatar name={row.name}/>
            <strong>{row.name}</strong>
            <span className={styles.points}>{row.points} pts</span>
          </div>
        ))}
        <Tag tone="gold">Provisional · not final qualification</Tag>
      </section>
    </div>
  )
}
