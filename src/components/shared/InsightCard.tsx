import type { ReactElement } from 'react'
import styles from './InsightCard.module.css'

type InsightCardProps = {
  icon: ReactElement
  eyebrow: string
  heading: string
  description: string
  headingLevel?: 2 | 3 | 4
}

export function InsightCard({ icon, eyebrow, heading, description, headingLevel = 2 }: InsightCardProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <section className={styles.card}>
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <div className={styles.content}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <Heading className={styles.heading}>{heading}</Heading>
        <p className={styles.description}>{description}</p>
      </div>
    </section>
  )
}
