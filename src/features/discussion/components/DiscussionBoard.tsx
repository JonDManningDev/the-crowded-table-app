import { Button } from '../../../components/primitives/Controls'
import { Avatar, Empty, Icon, Tag } from '../../../components/ui'
import type { DiscussionPost } from '../types'
import styles from './DiscussionBoard.module.css'

export function DiscussionBoard({ posts, searchQuery, onSearchChange, onOpenDiscussion }: {
  posts: DiscussionPost[]; searchQuery: string; onSearchChange: (value: string) => void; onOpenDiscussion: (id: string) => void
}) {
  return (
    <section>
      <label className="search">
        <Icon name="search" />
        <input
          value={searchQuery}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="Find a conversation…"
          aria-label="Search discussions"
        />
      </label>
      <div className={styles['post-list']}>
        {posts.map(item => (
          <Button
            appearance="unstyled"
            className={styles['post-card']}
            key={item.id}
            onClick={() => onOpenDiscussion(item.id)}
          >
            <div className="host">
              <Avatar name={item.author} />
              <div>
                <strong>{item.author}</strong>
                <small>Community member</small>
              </div>
              <Tag>{item.topic}</Tag>
            </div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <div className={styles['post-footer']}>
              <span>
                <Icon name="chat" size={16} /> {item.replies.length}{' '}
                {item.replies.length === 1 ? 'reply' : 'replies'}
              </span>
              <span>Join the conversation <Icon name="arrow" size={16} /></span>
            </div>
          </Button>
        ))}
      </div>
      {!posts.length && (
        <Empty title="Be the first to pull up a chair">
          Start a conversation in this topic, or try another search.
        </Empty>
      )}
    </section>
  )
}
