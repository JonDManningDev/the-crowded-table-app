import { useState } from 'react'
import { Button } from '../../../components/primitives/Controls'
import { Heading, Icon, Tabs } from '../../../components/ui'
import type { CommunityProfileActivity, CommunityProfileContent, CommunityProfileDetails, CommunityProfilePreferences } from '../types'
import { CommunityProfileSidebar } from '../components/CommunityProfileSidebar'
import { CommunityProfileOverview } from '../components/CommunityProfileOverview'
import { CommunityActivityPanel } from '../components/CommunityActivityPanel'
import { CommunityMembershipPanel } from '../components/CommunityMembershipPanel'
import { CommunityPreferencesPanel } from '../components/CommunityPreferencesPanel'
import { CommunityProfileEditModal } from '../components/CommunityProfileEditModal'
import { CommunityProfilePreviewModal } from '../components/CommunityProfilePreviewModal'
import { CommunitySupportModal } from '../components/CommunitySupportModal'
import styles from './CommunityProfilePage.module.css'

export function CommunityProfilePage({ content, profile, preferences, activity, isMemberPreview,
  onSaveProfile, onPreferenceChange, onSavePreferences, onSaveSupportNote, onOpenActivity, onOpenMembership }: {
  content: CommunityProfileContent; profile: CommunityProfileDetails; preferences: CommunityProfilePreferences
  activity: CommunityProfileActivity[]; isMemberPreview: boolean
  onSaveProfile: (draft: CommunityProfileDetails) => boolean
  onPreferenceChange: (key: keyof CommunityProfilePreferences, value: boolean) => void
  onSavePreferences: () => boolean; onSaveSupportNote: (note: string) => boolean
  onOpenActivity: (id: string) => void; onOpenMembership: () => void
}) {
  const [selectedView, setSelectedView] = useState('Overview')
  const [selectedActivityView, setSelectedActivityView] = useState('Upcoming')
  const [activeModal, setActiveModal] = useState<'edit' | 'preview' | 'support' | null>(null)
  const [profileDraft, setProfileDraft] = useState(() => ({ ...profile, interests: [...profile.interests] }))
  const [supportNoteDraft, setSupportNoteDraft] = useState('')
  const [isPreferencesSaved, setIsPreferencesSaved] = useState(false)
  function openEdit() {
    setProfileDraft({ ...profile, interests: [...profile.interests] })
    setActiveModal('edit')
  }
  const closeModal = () => setActiveModal(null)
  return (
    <>
      <Heading eyebrow="REAL PEOPLE. REAL GAMES." title="Your seat at the table." action={(
        <Button appearance="outline" className="button secondary" onClick={openEdit}><Icon name="user" size={17}/> Edit Profile</Button>
      )}>A little about you. A whole lot of good memories ahead.</Heading>
      <div className={styles['profile-layout']}>
        <CommunityProfileSidebar profile={profile} content={content.sidebar} isMemberPreview={isMemberPreview}
          onOpenMembership={onOpenMembership} onOpenPreview={() => setActiveModal('preview')}/>
        <div>
          <Tabs items={['Overview', 'My Activity', 'Membership & Settings']} value={selectedView} onChange={value => {
            if (value !== selectedView) setIsPreferencesSaved(false)
            setSelectedView(value)
          }}/>
          {selectedView === 'Overview' && <CommunityProfileOverview profile={profile} favorites={content.favorites} insight={content.insight} onEdit={openEdit}/>}
          {selectedView === 'My Activity' && <CommunityActivityPanel upcoming={activity} content={content} selectedActivityView={selectedActivityView}
            onActivityViewChange={setSelectedActivityView} onOpenActivity={onOpenActivity}/>}
          {selectedView === 'Membership & Settings' && <>
            <CommunityMembershipPanel benefits={content.benefits} isMemberPreview={isMemberPreview} onOpenMembership={onOpenMembership}/>
            <CommunityPreferencesPanel preferences={preferences} choices={content.preferenceChoices} isPreferencesSaved={isPreferencesSaved}
              onPreferenceChange={(key, value) => { onPreferenceChange(key, value); setIsPreferencesSaved(false) }}
              onSavePreferences={() => setIsPreferencesSaved(onSavePreferences())}
              onOpenSupport={() => { setSupportNoteDraft(''); setActiveModal('support') }}/>
          </>}
        </div>
      </div>
      {activeModal === 'edit' && <CommunityProfileEditModal draft={profileDraft} options={content.editor} onDraftChange={setProfileDraft}
        onClose={closeModal} onSubmit={() => { if (onSaveProfile(profileDraft)) closeModal() }}/>}
      {activeModal === 'preview' && <CommunityProfilePreviewModal profile={{ name: profile.name, location: profile.location, bio: profile.bio, interests: profile.interests }}
        shareHistory={preferences.history} historyDisclosure={content.historyDisclosure} onClose={closeModal}/>}
      {activeModal === 'support' && <CommunitySupportModal note={supportNoteDraft} maxLength={content.supportMaxLength} onNoteChange={setSupportNoteDraft}
        onClose={closeModal} onSubmit={() => { if (onSaveSupportNote(supportNoteDraft)) closeModal() }}/>}
    </>
  )
}
