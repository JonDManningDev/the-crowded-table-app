import { useState } from 'react'
import { Button } from '../../../components/primitives/Controls'
import { Heading, Icon, Tabs } from '../../../components/ui'
import { readDiscussionTopics, selectDiscussionPosts, selectDiscussionMembers, selectLocalSpots } from '../api'
import type { DiscussionContent, DiscussionPost, NewDiscussionDraft } from '../types'
import { DiscussionHero } from '../components/DiscussionHero'
import { DiscussionTopics } from '../components/DiscussionTopics'
import { DiscussionBoard } from '../components/DiscussionBoard'
import { MemberDirectory } from '../components/MemberDirectory'
import { GameRecommendations } from '../components/GameRecommendations'
import { LocalSpots } from '../components/LocalSpots'
import { NewDiscussionModal } from '../components/NewDiscussionModal'
import { DiscussionThreadModal } from '../components/DiscussionThreadModal'
import { MemberPreviewModal } from '../components/MemberPreviewModal'
import { DiscussionGuidelinesModal } from '../components/DiscussionGuidelinesModal'
import { LocalSpotModal } from '../components/LocalSpotModal'
import styles from './DiscussionPage.module.css'

type ActiveModal = { kind: 'newDiscussion' } | { kind: 'thread'; postId: string }
  | { kind: 'member'; memberName: string } | { kind: 'guidelines' } | { kind: 'spot'; spotName: string } | null

export function DiscussionPage({ content, posts, savedGames, onCreateDiscussion, onReplyToDiscussion, onToggleSavedGame }: {
  content: DiscussionContent; posts: DiscussionPost[]; savedGames: string[]
  onCreateDiscussion: (draft: NewDiscussionDraft) => boolean
  onReplyToDiscussion: (id: string, body: string) => boolean
  onToggleSavedGame: (game: string) => void
}) {
  const [selectedView, setSelectedView] = useState('Discussions')
  const [selectedTopic, setSelectedTopic] = useState('All discussions')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpotType, setSelectedSpotType] = useState('All spots')
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [newDiscussionDraft, setNewDiscussionDraft] = useState<NewDiscussionDraft>(() => ({ topic: content.newDiscussionForm.defaultTopic, title: '', body: '' }))
  const [replyDraft, setReplyDraft] = useState('')
  const post = activeModal?.kind === 'thread' ? posts.find(item => item.id === activeModal.postId) : undefined
  const member = activeModal?.kind === 'member' ? content.members.find(item => item.name === activeModal.memberName) : undefined
  const spot = activeModal?.kind === 'spot' ? content.spots.find(item => item.name === activeModal.spotName) : undefined
  const closeModal = () => setActiveModal(null)
  function openNewDiscussion() {
    setNewDiscussionDraft({ topic: selectedTopic === 'All discussions' ? content.newDiscussionForm.defaultTopic : selectedTopic, title: '', body: '' })
    setActiveModal({ kind: 'newDiscussion' })
  }
  return (
    <>
      <Heading eyebrow="PEOPLE MAKE THE BEST GAMES" title="A place to belong." action={(
        <Button appearance="primary" className="button" onClick={openNewDiscussion}>
          <Icon name="plus" size={18}/> Start a conversation
        </Button>
      )}>Same table. More friends. Make yourself at home.</Heading>
      <DiscussionHero className={styles.heroSpacing}/>
      <Tabs items={['Discussions', 'Members', 'Game Recommendations', 'Local Spots']} value={selectedView}
        onChange={value => { setSelectedView(value); setSearchQuery('') }}/>
      {selectedView === 'Discussions' && <div className={styles['discussion-layout']}>
        <DiscussionTopics topics={readDiscussionTopics(posts, content.topics)} selectedTopic={selectedTopic} onTopicChange={setSelectedTopic}
          onOpenGuidelines={() => setActiveModal({ kind: 'guidelines' })}/>
        <DiscussionBoard posts={selectDiscussionPosts(posts, selectedTopic, searchQuery)} searchQuery={searchQuery} onSearchChange={setSearchQuery}
          onOpenDiscussion={postId => { setReplyDraft(''); setActiveModal({ kind: 'thread', postId }) }}/>
      </div>}
      {selectedView === 'Members' && <MemberDirectory members={selectDiscussionMembers(content.members, searchQuery)} searchQuery={searchQuery}
        onSearchChange={setSearchQuery} onOpenMember={memberName => setActiveModal({ kind: 'member', memberName })}/>}
      {selectedView === 'Game Recommendations' && <GameRecommendations recommendations={content.recommendations} savedGames={savedGames}
        onToggleSavedGame={onToggleSavedGame} onDiscussGames={() => { setSelectedTopic('Game recommendations'); setSelectedView('Discussions') }}/>}
      {selectedView === 'Local Spots' && <LocalSpots spots={selectLocalSpots(content.spots, selectedSpotType)} mapSpots={content.spots}
        spotTypes={content.spotTypes} mapArea={content.mapArea} selectedSpotType={selectedSpotType} onSpotTypeChange={setSelectedSpotType}
        onOpenSpot={spotName => setActiveModal({ kind: 'spot', spotName })}/>}
      {activeModal?.kind === 'newDiscussion' && <NewDiscussionModal draft={newDiscussionDraft} options={content.newDiscussionForm}
        onDraftChange={setNewDiscussionDraft} onClose={closeModal} onSubmit={() => {
          if (!onCreateDiscussion(newDiscussionDraft)) return
          closeModal(); setSelectedView('Discussions'); setSelectedTopic('All discussions'); setSearchQuery('')
        }}/>}
      {post && <DiscussionThreadModal post={post} replyDraft={replyDraft} replyMaxLength={content.replyMaxLength} onReplyChange={setReplyDraft}
        onClose={closeModal} onSubmitReply={() => { if (onReplyToDiscussion(post.id, replyDraft)) setReplyDraft('') }}/>}
      {member && <MemberPreviewModal member={member} onClose={closeModal}/>}
      {activeModal?.kind === 'guidelines' && <DiscussionGuidelinesModal guidelines={content.guidelines} onClose={closeModal}/>}
      {spot && <LocalSpotModal spot={spot} onClose={closeModal}/>}
    </>
  )
}
