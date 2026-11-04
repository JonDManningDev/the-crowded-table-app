import { Button } from '../../../components/primitives/Controls'
import { Icon } from '../../../components/ui'
import type { DiscussionTopicOption } from '../types'
import styles from './DiscussionTopics.module.css'

export function DiscussionTopics({ topics, selectedTopic, onTopicChange, onOpenGuidelines }: {
  topics: DiscussionTopicOption[]; selectedTopic: string
  onTopicChange: (topic: string) => void; onOpenGuidelines: () => void
}) {
  return (
    <aside className={styles['topic-panel']}>
      <span className="eyebrow">AROUND THE COMMUNITY</span>
      {topics.map(({ name, icon, count }) => (
        <Button
          appearance="unstyled"
          key={name}
          className={selectedTopic === name ? styles.selected : ''}
          onClick={() => onTopicChange(name)}
        >
          <Icon name={icon} size={18} />
          {name}
          <span>
            {count}
          </span>
        </Button>
      ))}
      <div className={styles['guideline']}>
        <Icon name="heart" />
        <h3>A kinder kind of community</h3>
        <p>Welcome every experience level. Listen with curiosity. Keep people at the heart of play.</p>
        <Button appearance="ghost" className="text-button" onClick={() => onOpenGuidelines()}>
          Our table manners <Icon name="arrow" size={15} />
        </Button>
      </div>
    </aside>
  )
}
