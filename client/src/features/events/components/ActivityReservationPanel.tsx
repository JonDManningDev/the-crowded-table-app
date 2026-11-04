import { Icon } from '../../../components/ui'
import { Button } from '../../../components/primitives/Controls'
import { Notice } from '../../../components/primitives/Notice'
import { formatDate, formatTime } from '../../../lib/dateTime'
import type { ActivityDetails } from '../types'
import styles from './ActivityReservationPanel.module.css'

export function ActivityReservationPanel({ activity, className = '', isCheckoutOpen, onReserve, onCancelReservation, onConfirmCheckout, onCloseCheckout }: {
  activity: ActivityDetails; className?: string; isCheckoutOpen: boolean
  onReserve: () => void; onCancelReservation: () => void; onConfirmCheckout: () => void; onCloseCheckout: () => void
}) {
  const { status, cost } = activity
  const placeDetail = activity.private
    ? activity.canViewAddress
      ? activity.address || 'Demo address: 12 Garden Lane (fictional)'
      : 'Exact address shared after confirmation'
    : 'Meet us at the main entrance'
  const reserveLabel = activity.filled >= activity.capacity
    ? 'Join Waitlist'
    : cost
      ? `Reserve for L${cost}`
      : activity.joinMode === 'request'
        ? 'Request a Seat'
        : 'Take a Seat'
  return (
    <aside className={`${styles.reservation} ${className}`}>
      <div className={styles['detail-fact']}>
        <Icon name="calendar"/>
        <div>
          <strong>{formatDate(activity.date)}</strong>
          <span>{new Date(activity.date + 'T12:00:00').getFullYear()}</span>
        </div>
      </div>
      <div className={styles['detail-fact']}>
        <Icon name="clock"/>
        <div>
          <strong>{formatTime(activity.time)} – {formatTime(activity.end)}</strong>
          <span>Tegucigalpa time</span>
        </div>
      </div>
      <div className={styles['detail-fact']}>
        <Icon name={activity.private ? 'lock' : 'pin'}/>
        <div>
          <strong>{activity.location}</strong>
          <span>{placeDetail}</span>
        </div>
      </div>
      <div className={styles['detail-fact']}>
        <Icon name="people"/>
        <div>
          <strong>{activity.filled} of {activity.capacity} seats filled</strong>
          <span>
            {activity.capacity > activity.filled
              ? 'A little room for you'
              : 'Join the waitlist for the next opening'}
          </span>
        </div>
      </div>
      <div className={styles['seat-bar']}>
        <span style={{ width: `${activity.filled / activity.capacity * 100}%` }}/>
      </div>
      {activity.isHosting ? (
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
          <p className={styles['meta']}>
            {status === 'requested'
              ? 'We’ll let you know when your host responds.'
              : status === 'waitlisted'
                ? 'We’ll notify you when a seat opens.'
                : 'We can’t wait to see you.'}
          </p>
          <Button appearance="ghost" className="text-button" onClick={onCancelReservation}>
            Cancel {status === 'requested' ? 'request' : status === 'waitlisted' ? 'waitlist spot' : 'reservation'}
          </Button>
        </>
      ) : isCheckoutOpen ? (
        <div className={styles['demo-checkout']}>
          <h3>Your evening awaits</h3>
          <p>One seat · <strong>L{cost}</strong></p>
          <p className={styles['meta']}>Preview checkout. No payment details are collected or charged.</p>
          <Button
            appearance="primary"
            full
            className="button full"
            onClick={onConfirmCheckout}
          >
            Simulate payment & reserve
          </Button>
          <Button appearance="ghost" className="text-button" onClick={onCloseCheckout}>
            Go back
          </Button>
        </div>
      ) : (
        <>
          <div className={styles['price']}>
            {cost ? `L${cost}` : 'Included'}
            <small>{cost ? 'per person' : 'with your membership'}</small>
          </div>
          <Button appearance="primary" full className="button full" onClick={onReserve}>
            {reserveLabel}
            <Icon name="arrow" size={17}/>
          </Button>
        </>
      )}
      <div className={styles['privacy-note']}>
        <Icon name="lock" size={15}/>
        <span>Private by design.<br/>Good company by choice.</span>
      </div>
    </aside>
  )
}
