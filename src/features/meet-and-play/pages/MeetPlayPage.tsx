import { useState } from 'react'
import { GuidanceNote } from '../../../components/shared/GuidanceNote'
import { Notice } from '../../../components/primitives/Notice'
import { Button } from '../../../components/primitives/Controls'
import { ActivityCard } from '../../../components/shared/ActivityCard'
import { Empty, Heading, Icon, Tabs } from '../../../components/ui'
import { selectMeetPlayTables } from '../api'
import type { CreateTableDraft, MatchingPreferencesDraft, MeetPlayContent, MeetPlayTableSummary } from '../types'
import { MeetPlayHero } from '../components/MeetPlayHero'
import { TableFilters } from '../components/TableFilters'
import { CreateTableModal } from '../components/CreateTableModal'
import { MatchingPreferencesModal } from '../components/MatchingPreferencesModal'
import styles from './MeetPlayPage.module.css'

export function MeetPlayPage({ content, tables: source, matching, matchingPreferences, onOpenTable, onCreateTable, onSaveMatchingPreferences }: {
  content: MeetPlayContent
  tables: MeetPlayTableSummary[]
  matching: boolean
  matchingPreferences: MatchingPreferencesDraft
  onOpenTable: (id: string) => void
  onCreateTable: (draft: CreateTableDraft) => string | null
  onSaveMatchingPreferences: (draft: MatchingPreferencesDraft) => void
}) {
  const [selectedView, setSelectedView] = useState('Find a Table')
  const [tableFilters, setTableFilters] = useState(() => ({ ...content.initialFilters }))
  const [activeModal, setActiveModal] = useState<'create' | 'match' | null>(null)
  const [createTableDraft, setCreateTableDraft] = useState(() => ({ ...content.createTableDefaults }))
  const [createTableError, setCreateTableError] = useState('')
  const [matchingPreferencesDraft, setMatchingPreferencesDraft] = useState(() => ({ ...matchingPreferences }))
  const tables = selectMeetPlayTables(source, selectedView, tableFilters)

  function openCreateTable() {
    setCreateTableDraft({ ...content.createTableDefaults })
    setCreateTableError('')
    setActiveModal('create')
  }
  function submitCreateTable() {
    const error = onCreateTable(createTableDraft)
    if (error) { setCreateTableError(error); return }
    setActiveModal(null)
    setSelectedView('My Tables')
    setTableFilters({ ...content.initialFilters })
  }
  function openMatchingPreferences() {
    setMatchingPreferencesDraft({ ...matchingPreferences })
    setActiveModal('match')
  }
  return (
    <>
      <Heading
        eyebrow="DIFFERENT GAMES. SAME TABLE."
        title="Meet & Play"
        action={<Button appearance="primary" className="button" onClick={openCreateTable}>
          <Icon name="plus" size={18}/> Create a Table
        </Button>}
      >
        You bring the games. We’ll help you find the people.
      </Heading>
      <MeetPlayHero matching={matching} onOpenMatching={openMatchingPreferences}/>
      <div className="section-heading">
        <Tabs items={['Find a Table', 'My Tables']} value={selectedView} onChange={setSelectedView}/>
        <span className="meta">Made by members, for members</span>
      </div>
      <TableFilters filters={tableFilters} gameTypes={content.gameTypes} locations={content.locations} onFiltersChange={setTableFilters}/>
      {selectedView === 'My Tables' && (
        <Notice icon="leaf">
          Your hosted tables, reservations, requests, and waitlist spots — all in one place.
        </Notice>
      )}
      <div className="card-grid">
        {tables.map(item => (
          <ActivityCard key={item.id} item={item} onOpen={() => onOpenTable(item.id)} status={item.status}/>
        ))}
      </div>
      {!tables.length && (
        <Empty title="Let’s make room for something new">
          Try another filter, or create the table you’d love to join.
        </Empty>
      )}
      <div className={styles.guidance}>
        <GuidanceNote icon={<Icon name="heart"/>}>
          A good table starts with kindness. Welcome new players, respect each other’s time, and leave room for one more.
        </GuidanceNote>
      </div>
      {activeModal === 'create' && (
        <CreateTableModal draft={createTableDraft} tableTypes={content.tableTypes} error={createTableError}
          onDraftChange={setCreateTableDraft} onSubmit={submitCreateTable} onClose={() => setActiveModal(null)}/>
      )}
      {activeModal === 'match' && (
        <MatchingPreferencesModal draft={matchingPreferencesDraft} options={content.matchingOptions}
          onDraftChange={setMatchingPreferencesDraft} onClose={() => setActiveModal(null)}
          onSubmit={() => { onSaveMatchingPreferences(matchingPreferencesDraft); setActiveModal(null) }}/>
      )}
    </>
  )
}
