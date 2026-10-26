import { Button } from '../../../components/primitives/Controls'
import { Icon, Modal } from '../../../components/ui'
import type { DiscussionContent, NewDiscussionDraft } from '../types'
import styles from './NewDiscussionModal.module.css'

export function NewDiscussionModal({ draft, options, onDraftChange, onSubmit, onClose }: {
  draft: NewDiscussionDraft; options: DiscussionContent['newDiscussionForm']; onDraftChange: (draft: NewDiscussionDraft) => void
  onSubmit: () => void; onClose: () => void
}) {
  return (
    <Modal title="Start a good conversation" onClose={onClose}>
      <form className={`form ${styles.form}`} onSubmit={event => { event.preventDefault(); onSubmit() }}>
        <label>
          Topic
          <select name="topic" value={draft.topic} onChange={event => onDraftChange({ ...draft, topic: event.target.value })}>
            {options.topics.map(name => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label>
          A little headline
          <input name="title" value={draft.title} onChange={event => onDraftChange({ ...draft, title: event.target.value })} required maxLength={options.titleMaxLength} placeholder="What’s on your mind?" />
        </label>
        <label>
          Pull up a chair
          <textarea
            name="body"
            value={draft.body}
            onChange={event => onDraftChange({ ...draft, body: event.target.value })}
            required
            maxLength={options.bodyMaxLength}
            placeholder="A question, a recommendation, a little hello…"
          />
        </label>
        <Button appearance="primary" className="button" type="submit">
          Share with the community <Icon name="arrow" size={17} />
        </Button>
      </form>
    </Modal>
  )
}
