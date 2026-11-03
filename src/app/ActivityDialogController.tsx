import { useState } from 'react'
import type { MockModel } from '../mock/useMockState'
import { readActivityDetails } from '../features/events/api'
import { readTableConversation, readTableSeatRequests } from '../features/meet-and-play/api'
import { ActivityDialog } from '../features/events/components/ActivityDialog'
import { TableSeatRequestsPanel } from '../features/meet-and-play/components/TableSeatRequestsPanel'
import { TableConversationPanel } from '../features/meet-and-play/components/TableConversationPanel'

export function ActivityDialogController({ id, model, onClose }: { id: string; model: MockModel; onClose: () => void }) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [messageDraft, setMessageDraft] = useState('')
  const activity = readActivityDetails(model.items, model.seats, model.member, id)
  if (!activity) return null
  const { cost, filled, capacity } = activity
  function join() {
    const item = model.items.find(row => row.id === id)
    if (item) model.join(item)
  }
  function reserve() {
    if (cost && filled < capacity) setIsCheckoutOpen(true)
    else join()
  }
  return <ActivityDialog activity={activity} isCheckoutOpen={isCheckoutOpen} onClose={onClose}
    onReserve={reserve} onCancelReservation={() => model.cancel(id)}
    onConfirmCheckout={() => { join(); setIsCheckoutOpen(false) }} onCloseCheckout={() => setIsCheckoutOpen(false)}>
    {activity.isHosting && <TableSeatRequestsPanel requests={readTableSeatRequests(model.requests, id)}
      isFull={activity.filled >= activity.capacity} onDecideRequest={model.decideRequest}/>}
    {activity.canChat && <TableConversationPanel hostName={activity.host} messages={readTableConversation(model.messages, id)}
      messageDraft={messageDraft} onMessageChange={setMessageDraft}
      onSendMessage={() => { if (model.sendMessage(id, messageDraft)) setMessageDraft('') }}/>}
  </ActivityDialog>
}
