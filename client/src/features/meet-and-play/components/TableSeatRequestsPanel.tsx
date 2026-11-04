import { Avatar } from '../../../components/ui'
import { Button } from '../../../components/primitives/Controls'
import type { TableSeatRequest } from '../types'
import styles from './TableSeatRequestsPanel.module.css'

export function TableSeatRequestsPanel({ requests, isFull, onDecideRequest }: {
  requests: TableSeatRequest[]; isFull: boolean; onDecideRequest: (id: string, accept: boolean) => void
}) {
  return (
    <div className={styles['request-list']}>
      <h3>Seat requests</h3>
      {requests.length === 0 && (
        <p className={styles['muted']}>No requests yet. Your table is ready for company.</p>
      )}
      {requests.map(request => (
        <div className={styles['request']} key={request.id}>
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
                disabled={isFull}
                onClick={() => onDecideRequest(request.id, true)}
              >
                Accept
              </Button>
              <Button
                appearance="ghost"
                className="text-button"
                onClick={() => onDecideRequest(request.id, false)}
              >
                Decline
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
