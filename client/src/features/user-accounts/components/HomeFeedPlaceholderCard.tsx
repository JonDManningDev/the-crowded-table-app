import { Icon } from '../../../components/ui'
import styles from './HomeFeedPlaceholderCard.module.css'

type HomeFeedPlaceholderCardProps = {
  iconName: string
  title: string
  description: string
  placeholderHeading: string
  placeholderDescription: string
}

export function HomeFeedPlaceholderCard({
  iconName, title, description, placeholderHeading, placeholderDescription,
}: HomeFeedPlaceholderCardProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>
        <span className={styles.icon}>
          <Icon name={iconName} size={22}/>
        </span>
        <span className={styles.soon}>Coming soon</span>
      </div>
      <h2 data-heading="card">{title}</h2>
      <p>{description}</p>
      <div className={styles.placeholder}>
        <h3 data-heading="subsection">{placeholderHeading}</h3>
        <p>{placeholderDescription}</p>
      </div>
    </section>
  )
}
