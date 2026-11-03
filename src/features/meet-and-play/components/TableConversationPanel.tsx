import { Avatar, Icon } from '../../../components/ui'
import { Button } from '../../../components/primitives/Controls'
import type { TableMessage } from '../types'
import styles from './TableConversationPanel.module.css'

export function TableConversationPanel({ hostName, messages, messageDraft, onMessageChange, onSendMessage }: {
  hostName: string; messages: TableMessage[]; messageDraft: string
  onMessageChange: (value: string) => void; onSendMessage: () => void
}) {
  return (
    <div className={styles['chat-box']}>
      <h3><Icon name="chat"/> Table conversation</h3>
      <p className={styles['meta']}>Only your confirmed table · available until 48 hours after play</p>
      <div className={styles['chat-message']}>
        <Avatar name={hostName}/>
        <div>
          <strong>{hostName}</strong>
          <p>Looking forward to playing together! Feel free to ask about the rules.</p>
        </div>
      </div>
      {messages.map((entry, index) => (
        <div className={styles['chat-message']} key={index}>
          <Avatar name={entry.author}/>
          <div>
            <strong>{entry.author}</strong>
            <p>{entry.text}</p>
          </div>
        </div>
      ))}
      <form className={styles['chat-form']} onSubmit={event => {
        event.preventDefault()
        onSendMessage()
      }}>
        <input
          aria-label="Message your table"
          placeholder="Say hello to your table…"
          value={messageDraft}
          onChange={event => onMessageChange(event.target.value)}
          maxLength={1000}
          required
        />
        <Button appearance="primary" className="button" type="submit">
          Send <Icon name="arrow" size={16}/>
        </Button>
      </form>
    </div>
  )
}
