import { Notice } from './primitives/Notice'
import { Button } from './primitives/Controls'
import { formatDate, formatTime } from '../mock/format'
import { useState } from 'react'
import type { Activity } from '../mock/data'
import type { MockModel } from '../mock/useMockState'
import { Avatar, Icon, Modal, Tag } from './ui'
import { GameArt } from './GameArt'
import styles from './ActivityCard.module.css'
import dialogStyles from './ActivityDialog.module.css'

export function ActivityCard({
  item,
  onOpen,
  status,
}: {
  item: Activity
  onOpen: () => void
  status?: string
}) {
  const left = item.capacity - item.filled
  const stamp = new Date(item.date + 'T12:00:00')
  const seatLabel = status
    ? status === 'confirmed'
      ? 'You’re going'
      : status === 'requested'
        ? 'Request sent'
        : 'On the waitlist'
    : left
      ? `${left} seats open`
      : 'This table is crowded'
  return (
    <Button appearance="unstyled" className={styles.card} onClick={onOpen}>
      <div className={styles.art}>
        <GameArt type={item.art}/>
        <span className={`${styles.artLabel} ${item.special ? styles.special : ''}`}>{item.category}</span>
        <span className={styles.dateStamp}>
          <b>{stamp.getDate()}</b>
          <span>{stamp.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          {formatDate(item.date, true)} <span>·</span> {formatTime(item.time)}
        </div>
        <h3>{item.title}</h3>
        <p className={styles.location}>
          <Icon name={item.private ? 'lock' : 'pin'} size={14}/>
          {item.location}
        </p>
        {item.kind === 'table' && (
          <div className={styles.host}>
            <Avatar name={item.host}/>
            <span>Hosted by <strong>{item.host}</strong></span>
          </div>
        )}
        <div className={styles.bottom}>
          <span className={left === 0 ? styles.full : styles.availability}>
            <span className={`dot ${left === 0 ? 'rust' : ''}`}/>
            {seatLabel}
          </span>
          <Icon name="arrow" size={19}/>
        </div>
      </div>
    </Button>
  )
}

export function ActivityDialog({
  id,
  model,
  onClose,
}: {
  id: string
  model: MockModel
  onClose: () => void
}) {
  const [pay, setPay] = useState(false)
  const [message, setMessage] = useState('')
  const item = model.items.find(row => row.id === id)
  if (!item) return null
  const status = model.seats[id]
  const hosting = item.host === 'You'
  const access = hosting || status === 'confirmed'
  const cost = item.special ? item.price : !model.member && item.kind === 'official' ? 125 : 0
  const canChat = model.member && item.kind === 'table' && access
  const requests = model.requests.filter(request => request.activity === id)
  function reserve() {
    if (cost && item!.filled < item!.capacity) setPay(true)
    else model.join(item!)
  }
  const placeDetail = item.private
    ? access
      ? item.address || 'Demo address: 12 Garden Lane (fictional)'
      : 'Exact address shared after confirmation'
    : 'Meet us at the main entrance'
  const reserveLabel = item.filled >= item.capacity
    ? 'Join Waitlist'
    : cost
      ? `Reserve for L${cost}`
      : item.joinMode === 'request'
        ? 'Request a Seat'
        : 'Take a Seat'
  return (
    <Modal
      title={item.kind === 'official' ? 'Around our table' : 'A table for good company'}
      onClose={onClose}
      wide
    >
      <GameArt type={item.art} className={dialogStyles['detail-art']}/>
      <div className={dialogStyles['detail-grid']}>
        <div>
          <div className={dialogStyles['eyebrow']}>{item.category}</div>
          <h2 className={dialogStyles['detail-title']}>{item.title}</h2>
          <div className={dialogStyles['host']}>
            <Avatar name={item.host}/>
            <span>Hosted by <strong>{item.host}</strong></span>
          </div>
          <p className={dialogStyles['description']}>{item.description}</p>
          <div className={dialogStyles['tags']}>{item.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
          <h3 className={dialogStyles['section-label']}>A few things to know</h3>
          <p className={dialogStyles['muted']}>
            Bring your curiosity and a little kindness. If your plans change, please release your
            seat so someone else can join.
          </p>
          {hosting && (
            <div className={dialogStyles['request-list']}>
              <h3>Seat requests</h3>
              {requests.length === 0 && (
                <p className={dialogStyles['muted']}>No requests yet. Your table is ready for company.</p>
              )}
              {requests.map(request => (
                <div className={dialogStyles['request']} key={request.id}>
                  <Avatar name={request.name}/>
                  <div>
                    <strong>{request.name}</strong>
                    <small>
                      {request.status === 'pending' ? 'Would love to join your table' : request.status}
                    </small>
                  </div>
                  {request.status === 'pending' && (
                    <>
                      <Button
                        appearance="primary"
                        small
                        className="button small"
                        disabled={item.filled >= item.capacity}
                        onClick={() => model.decideRequest(request.id, true)}
                      >
                        Accept
                      </Button>
                      <Button
                        appearance="ghost"
                        className="text-button"
                        onClick={() => model.decideRequest(request.id, false)}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {canChat && (
            <div className={dialogStyles['chat-box']}>
              <h3><Icon name="chat"/> Table conversation</h3>
              <p className={dialogStyles['meta']}>Only your confirmed table · available until 48 hours after play</p>
              <div className={dialogStyles['chat-message']}>
                <Avatar name={item.host}/>
                <div>
                  <strong>{item.host}</strong>
                  <p>Looking forward to playing together! Feel free to ask about the rules.</p>
                </div>
              </div>
              {(model.messages[id] || []).map((entry, index) => (
                <div className={dialogStyles['chat-message']} key={index}>
                  <Avatar name={entry.author}/>
                  <div>
                    <strong>{entry.author}</strong>
                    <p>{entry.text}</p>
                  </div>
                </div>
              ))}
              <form className={dialogStyles['chat-form']} onSubmit={event => {
                event.preventDefault()
                if (!message.trim()) return
                model.setMessages(previous => ({
                  ...previous,
                  [id]: [...(previous[id] || []), { author: model.profile.name, text: message.trim() }],
                }))
                setMessage('')
              }}>
                <input
                  aria-label="Message your table"
                  placeholder="Say hello to your table…"
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  maxLength={1000}
                  required
                />
                <Button appearance="primary" className="button" type="submit">
                  Send <Icon name="arrow" size={16}/>
                </Button>
              </form>
            </div>
          )}
        </div>
        <aside className={dialogStyles['reservation']}>
          <div className={dialogStyles['detail-fact']}>
            <Icon name="calendar"/>
            <div>
              <strong>{formatDate(item.date)}</strong>
              <span>{new Date(item.date + 'T12:00:00').getFullYear()}</span>
            </div>
          </div>
          <div className={dialogStyles['detail-fact']}>
            <Icon name="clock"/>
            <div>
              <strong>{formatTime(item.time)} – {formatTime(item.end)}</strong>
              <span>Tegucigalpa time</span>
            </div>
          </div>
          <div className={dialogStyles['detail-fact']}>
            <Icon name={item.private ? 'lock' : 'pin'}/>
            <div>
              <strong>{item.location}</strong>
              <span>{placeDetail}</span>
            </div>
          </div>
          <div className={dialogStyles['detail-fact']}>
            <Icon name="people"/>
            <div>
              <strong>{item.filled} of {item.capacity} seats filled</strong>
              <span>
                {item.capacity > item.filled
                  ? 'A little room for you'
                  : 'Join the waitlist for the next opening'}
              </span>
            </div>
          </div>
          <div className={dialogStyles['seat-bar']}>
            <span style={{ width: `${item.filled / item.capacity * 100}%` }}/>
          </div>
          {hosting ? (
            <Notice variant="positive"> You’re hosting this table</Notice>
          ) : status ? (
            <>
              <Notice variant={status === 'confirmed' ? 'positive' : 'pending'}>

                {status === 'confirmed'
                  ? 'Your seat is confirmed'
                  : status === 'requested'
                    ? 'Waiting for host approval'
                    : 'You’re on the waitlist'}
              </Notice>
              <p className={dialogStyles['meta']}>
                {status === 'requested'
                  ? 'We’ll let you know when your host responds.'
                  : status === 'waitlisted'
                    ? 'We’ll notify you when a seat opens.'
                    : 'We can’t wait to see you.'}
              </p>
              <Button appearance="ghost" className="text-button" onClick={() => model.cancel(id)}>
                Cancel {status === 'requested' ? 'request' : status === 'waitlisted' ? 'waitlist spot' : 'reservation'}
              </Button>
            </>
          ) : pay ? (
            <div className={dialogStyles['demo-checkout']}>
              <h3>Your evening awaits</h3>
              <p>One seat · <strong>L{cost}</strong></p>
              <p className={dialogStyles['meta']}>Preview checkout. No payment details are collected or charged.</p>
              <Button
                appearance="primary"
                full
                className="button full"
                onClick={() => {
                  model.join(item)
                  setPay(false)
                }}
              >
                Simulate payment & reserve
              </Button>
              <Button appearance="ghost" className="text-button" onClick={() => setPay(false)}>
                Go back
              </Button>
            </div>
          ) : (
            <>
              <div className={dialogStyles['price']}>
                {cost ? `L${cost}` : 'Included'}
                <small>{cost ? 'per person' : 'with your membership'}</small>
              </div>
              <Button appearance="primary" full className="button full" onClick={reserve}>
                {reserveLabel}
                <Icon name="arrow" size={17}/>
              </Button>
            </>
          )}
          <div className={dialogStyles['privacy-note']}>
            <Icon name="lock" size={15}/>
            <span>Private by design.<br/>Good company by choice.</span>
          </div>
        </aside>
      </div>
    </Modal>
  )
}
