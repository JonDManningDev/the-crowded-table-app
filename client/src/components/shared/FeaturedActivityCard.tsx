import type { ReactElement, ReactNode } from 'react'
import { Button } from '../primitives/Controls'
import { Icon } from '../ui'
import styles from './FeaturedActivityCard.module.css'

type FeaturedActivityCardProps = {
  tag: ReactElement
  heading: string
  description?: string
  date: string
  specialCallouts?: string
  image?: ReactNode
  actionLabel: string
  onOpen: () => void
  headingLevel?: 2 | 3 | 4
}

export function FeaturedActivityCard({
  tag, heading, description, date, specialCallouts, image, actionLabel, onOpen, headingLevel = 2,
}: FeaturedActivityCardProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <section className={styles.card}>
      <div className={styles.content}>
        {tag}
        <Heading className={styles.heading}>{heading}</Heading>
        {description && <p className={styles.description}>{description}</p>}
        <p className={styles.date}>{date}</p>
        {specialCallouts && <p className={styles.callouts}>{specialCallouts}</p>}
        <div className={styles.action}>
          <Button appearance="ghost" onClick={onOpen}>
            {actionLabel} <Icon name="arrow" size={18}/>
          </Button>
        </div>
      </div>
      {image && <div className={styles.image}>{image}</div>}
    </section>
  )
}
