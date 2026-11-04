import { useEffect, useRef } from 'react'
import { useCommunityCreation } from '../hooks'
import { CommunityCreationForm } from '../components/CommunityCreationForm'
import { CommunityCreatedPanel } from '../components/CommunityCreatedPanel'
import styles from './CreateCommunityPage.module.css'

export function CreateCommunityPage({ userId, onBusyChange }: { userId: string; onBusyChange: (busy: boolean) => void }) {
  const creation = useCommunityCreation(userId, onBusyChange)
  const errorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (creation.error) errorRef.current?.focus()
  }, [creation.error, creation.submissionAttempt])
  return <main className={styles.page}><section className={`panel ${styles.card}`}>
    <span className="eyebrow">MAKE ROOM FOR YOUR PEOPLE</span>
    {creation.savedCommunity ? <CommunityCreatedPanel savedCommunity={creation.savedCommunity}/>
      : <CommunityCreationForm draft={creation.draft} options={creation.options} isCreating={creation.isCreating}
        error={creation.error} errorRef={errorRef} onDraftChange={creation.changeDraft}
        onSubmit={event => { event.preventDefault(); void creation.submitCommunity() }}/>}
  </section></main>
}
