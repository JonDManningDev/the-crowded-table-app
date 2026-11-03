import { useState } from 'react'
import { Heading, Tabs } from '../../../components/ui'
import type { ChampionshipContent, ChampionshipMatchSummary, ChampionshipStanding, MatchResultDraft } from '../types'
import { ChampionshipHero } from '../components/ChampionshipHero'
import { ChampionshipStats } from '../components/ChampionshipStats'
import { ChampionshipOverview } from '../components/ChampionshipOverview'
import { ChampionshipLeaderboard } from '../components/ChampionshipLeaderboard'
import { ChampionshipMatches } from '../components/ChampionshipMatches'
import { ChampionshipFinalTable } from '../components/ChampionshipFinalTable'
import { PastChampions } from '../components/PastChampions'
import { ChampionshipEntryModal } from '../components/ChampionshipEntryModal'
import { MatchResultModal } from '../components/MatchResultModal'
import { ChampionshipRulesModal } from '../components/ChampionshipRulesModal'
import styles from './ChampionshipPage.module.css'

export function ChampionshipPage({ content, standings, matches, isRegistered, isMemberPreview,
  onRegister, onSubmitResult, onConfirmResult, onDisputeResult }: {
  content: ChampionshipContent
  standings: ChampionshipStanding[]
  matches: ChampionshipMatchSummary[]
  isRegistered: boolean
  isMemberPreview: boolean
  onRegister: () => void
  onSubmitResult: (draft: MatchResultDraft) => string
  onConfirmResult: (id: string) => string
  onDisputeResult: (id: string) => string
}) {
  const [selectedView, setSelectedView] = useState('Overview')
  const [activeModal, setActiveModal] = useState<'join' | 'result' | 'rules' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [matchResultDraft, setMatchResultDraft] = useState(() => ({ ...content.resultForm.initialDraft }))
  function openResult() {
    if (!isRegistered) { setActiveModal('join'); return }
    setMatchResultDraft({ ...content.resultForm.initialDraft })
    setActiveModal('result')
  }
  return (
    <>
      <Heading eyebrow="A LITTLE FRIENDLY COMPETITION" title="Play. Connect. Compete.">
        Different game each month. The same wonderful reason to gather.
      </Heading>
      <ChampionshipHero content={content.hero} isRegistered={isRegistered} isMemberPreview={isMemberPreview} onOpenResult={openResult}/>
      <ChampionshipStats stats={content.stats} className={styles.stats}/>
      <Tabs items={['Overview', 'Leaderboard', 'My Matches', 'The Final Table', 'Past Champions']} value={selectedView} onChange={setSelectedView}/>
      {selectedView === 'Overview' && <ChampionshipOverview steps={content.steps} onOpenRules={() => setActiveModal('rules')}/>}
      {selectedView === 'Leaderboard' && <ChampionshipLeaderboard rankings={standings}/>}
      {selectedView === 'My Matches' && <ChampionshipMatches isRegistered={isRegistered} matches={matches} feedback={feedback}
        onOpenResult={openResult} onConfirmResult={id => setFeedback(onConfirmResult(id))} onDisputeResult={id => setFeedback(onDisputeResult(id))}/>}
      {selectedView === 'The Final Table' && <ChampionshipFinalTable content={content.final} rankings={standings}/>}
      {selectedView === 'Past Champions' && <PastChampions champions={content.champions}/>}
      {activeModal === 'join' && <ChampionshipEntryModal content={content.entry} isMemberPreview={isMemberPreview}
        onRegister={() => { onRegister(); setActiveModal(null) }} onClose={() => setActiveModal(null)}/>}
      {activeModal === 'result' && <MatchResultModal draft={matchResultDraft} options={content.resultForm}
        onDraftChange={setMatchResultDraft} onClose={() => setActiveModal(null)} onSubmit={() => {
          setFeedback(onSubmitResult(matchResultDraft)); setActiveModal(null); setSelectedView('My Matches')
        }}/>}
      {activeModal === 'rules' && <ChampionshipRulesModal rules={content.rules} onClose={() => setActiveModal(null)}/>}
    </>
  )
}
