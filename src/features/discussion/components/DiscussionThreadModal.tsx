import { Button } from '../../../components/primitives/Controls'
import { Avatar, Icon, Modal, Tag } from '../../../components/ui'
import type { DiscussionPost } from '../types'
import styles from './DiscussionThreadModal.module.css'

export function DiscussionThreadModal({ post, replyDraft, replyMaxLength, onReplyChange, onSubmitReply, onClose }: {
  post: DiscussionPost; replyDraft: string; replyMaxLength: number; onReplyChange: (value: string) => void
  onSubmitReply: () => void; onClose: () => void
}) {
  return (
    <Modal title="Around the community board" onClose={onClose}>
      <Tag>{post.topic}</Tag>
      <h2 className={styles['detail-title']}>{post.title}</h2>
      <div className="host">
        <Avatar name={post.author} />
        <strong>{post.author}</strong>
      </div>
      <p className="description">{post.body}</p>
      <h3>{post.replies.length} replies</h3>
      {post.replies.map((item, index) => (
        <div className={styles['chat-message']} key={index}>
          <Avatar name={item.author} />
          <div>
            <strong>{item.author}</strong>
            <p>{item.body}</p>
          </div>
        </div>
      ))}
      <form className={`form ${styles.form}`} onSubmit={event => { event.preventDefault(); onSubmitReply() }}>
        <label>
          Join the conversation
          <textarea
            required
            value={replyDraft}
            onChange={event => onReplyChange(event.target.value)}
            placeholder="A kind word goes a long way…"
            maxLength={replyMaxLength}
          />
        </label>
        <Button appearance="primary" className="button" type="submit">
          Post reply <Icon name="arrow" size={17} />
        </Button>
      </form>
    </Modal>
  )
}
