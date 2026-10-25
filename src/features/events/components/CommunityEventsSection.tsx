import { FilterChip, FilterChipGroup } from '../../../components/primitives/FilterChip'
import { ActivityCard } from '../../../components/Activity'
import { Tabs } from '../../../components/ui'
import { EventCalendar } from './EventCalendar'
import type { CommunityHomeEvent, EventCalendarData } from '../types'
import styles from './CommunityEventsSection.module.css'

export function CommunityEventsSection({
  selectedView, selectedCategory, categories, timezoneLabel, events, calendar,
  onViewChange, onCategoryChange, onMonthChange, onOpenEvent,
}: {
  selectedView: string
  selectedCategory: string
  categories: string[]
  timezoneLabel: string
  events: CommunityHomeEvent[]
  calendar: EventCalendarData
  onViewChange: (view: string) => void
  onCategoryChange: (category: string) => void
  onMonthChange: (month: number) => void
  onOpenEvent: (id: string) => void
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">A REASON TO GET TOGETHER</span>
          <h2>Upcoming at our table</h2>
        </div>
        <Tabs items={['Upcoming', 'Calendar']} value={selectedView} onChange={onViewChange}/>
      </div>
      <div className={styles['filter-row']}>
        <FilterChipGroup label="Filter events by category">
          {categories.map(name => (
            <FilterChip
              key={name}
              selected={selectedCategory === name}
              onClick={() => onCategoryChange(name)}
            >
              {name}
            </FilterChip>
          ))}
        </FilterChipGroup>
        <span className="meta">{timezoneLabel}</span>
      </div>
      {selectedView === 'Upcoming' ? (
        <div className="card-grid">
          {events.map(item => (
            <ActivityCard
              key={item.id}
              item={item}
              status={item.status}
              onOpen={() => onOpenEvent(item.id)}
            />
          ))}
        </div>
      ) : (
        <EventCalendar calendar={calendar} onMonthChange={onMonthChange} onOpenEvent={onOpenEvent}/>
      )}
    </>
  )
}
