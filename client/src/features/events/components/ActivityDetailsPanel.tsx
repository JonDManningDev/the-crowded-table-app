import type { ReactNode } from 'react'
import { Avatar, Tag } from '../../../components/ui'
import type { ActivityDetails } from '../types'
import styles from './ActivityDetailsPanel.module.css'

export function ActivityDetailsPanel({ activity, children }: { activity: ActivityDetails; children?: ReactNode }) {
  return <div className={styles.details}>
    <div className={styles['eyebrow']}>{activity.category}</div>
    <h2 className={styles['detail-title']}>{activity.title}</h2>
    <div className={styles['host']}>
      <Avatar name={activity.host}/>
      <span>Hosted by <strong>{activity.host}</strong></span>
    </div>
    <p className={styles['description']}>{activity.description}</p>
    <div className={styles['tags']}>{activity.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
    <h3 className={styles['section-label']}>A few things to know</h3>
    <p className={styles['muted']}>
      Bring your curiosity and a little kindness. If your plans change, please release your
      seat so someone else can join.
    </p>
    {children}
  </div>
}
