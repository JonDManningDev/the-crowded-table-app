import { useState } from 'react'
import { FeaturedActivityCard } from '../../components/shared/FeaturedActivityCard'
import { PromotionalBanner } from '../../components/shared/PromotionalBanner'
import { Button } from '../../components/primitives/Controls'
import { GameArt } from '../../components/GameArt'
import { Heading, Icon, Tag } from '../../components/ui'
import { formatDate } from '../../lib/dateTime'
import type { CommunityHomeContent } from '../../features/communities/types'
import type { CommunityHomeEvent } from '../../features/events/types'
import { selectCommunityEvents } from '../../features/events/api'
import { CommunityEventsSection } from '../../features/events/components/CommunityEventsSection'
import { CommunityHomeHero } from './components/CommunityHomeHero'
import { CommunityWeeklySchedule } from './components/CommunityWeeklySchedule'
import styles from './CommunityHomePage.module.css'

export function CommunityHomePage({ content, events: source, isMemberPreview, onOpenEvent, onOpenMembership }: {
  content: CommunityHomeContent
  events: CommunityHomeEvent[]
  isMemberPreview: boolean
  onOpenEvent: (id: string) => void
  onOpenMembership: () => void
}) {
  const [selectedView, setSelectedView] = useState('Upcoming')
  const [visibleMonth, setVisibleMonth] = useState(content.initialMonth)
  const [selectedCategory, setSelectedCategory] = useState('All evenings')
  const { events, calendar } = selectCommunityEvents(source, selectedCategory, content.year, visibleMonth)
  const { highlight, promotion } = content
  return (
    <>
      <Heading
        eyebrow="YOUR LOCAL GAMING COMMUNITY"
        title={isMemberPreview ? 'Good games. Even better company.' : 'There’s always room for one more.'}
      >
        Pull up a chair. Find your people. Make a little room for play.
      </Heading>
      <div className={styles.hero}>
        <CommunityHomeHero content={content.hero} onOpenEvent={onOpenEvent}/>
      </div>
      <div className={styles.schedule}>
        <CommunityWeeklySchedule rows={content.weeklySchedule}/>
      </div>
      <CommunityEventsSection
        selectedView={selectedView} selectedCategory={selectedCategory}
        categories={content.categories} timezoneLabel={content.timezoneLabel}
        events={events} calendar={calendar}
        onViewChange={setSelectedView} onCategoryChange={setSelectedCategory}
        onMonthChange={setVisibleMonth} onOpenEvent={onOpenEvent}
      />
      <div className={styles.featuredActivity}>
        <FeaturedActivityCard
          tag={<Tag tone="peach">SOMETHING SPECIAL</Tag>}
          heading={highlight.heading} description={highlight.description}
          date={formatDate(highlight.date)} specialCallouts={highlight.specialCallouts}
          actionLabel={highlight.actionLabel} onOpen={() => onOpenEvent(highlight.eventId)}
          image={<GameArt type={highlight.art}/>}
        />
      </div>
      {!isMemberPreview && (
        <div className={styles.promotion}>
          <PromotionalBanner
            icon={<Icon name="leaf" size={32}/>}
            heading={promotion.heading} description={promotion.description}
            action={<Button appearance="primary" onClick={onOpenMembership}>{promotion.actionLabel}</Button>}
          />
        </div>
      )}
    </>
  )
}
