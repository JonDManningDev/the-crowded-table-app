import type { ReactElement, ReactNode } from 'react'
import styles from './HeroFeaturePanel.module.css'

type HeroFeaturePanelProps = {
  icon?: ReactNode
  heading: string
  description?: ReactNode
  action: ReactElement
  headingLevel?: 2 | 3 | 4
}

export function HeroFeaturePanel({ icon, heading, description, action, headingLevel = 3 }: HeroFeaturePanelProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className={styles.panel}>
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      <Heading className={styles.heading}>{heading}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.action}>{action}</div>
    </div>
  )
}
