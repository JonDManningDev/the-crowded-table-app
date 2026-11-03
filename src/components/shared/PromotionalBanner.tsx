import type { ReactElement, ReactNode } from 'react'
import styles from './PromotionalBanner.module.css'

type PromotionalBannerProps = {
  heading: string
  description?: string
  icon?: ReactNode
  action: ReactElement
  headingLevel?: 2 | 3 | 4
}

export function PromotionalBanner({ heading, description, icon, action, headingLevel = 3 }: PromotionalBannerProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className={styles.banner}>
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      <div className={styles.copy}>
        <Heading className={styles.heading}>{heading}</Heading>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.action}>{action}</div>
    </div>
  )
}
