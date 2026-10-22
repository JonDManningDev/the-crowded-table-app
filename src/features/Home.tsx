import styles from './Home.module.css'
import { FeaturedActivityCard } from '../components/shared/FeaturedActivityCard'
import { PromotionalBanner } from '../components/shared/PromotionalBanner'
import { FilterChip, FilterChipGroup } from '../components/primitives/FilterChip'
import { Button } from '../components/primitives/Controls'
import { formatDate, formatTime } from '../mock/format'
import { useState } from 'react'
import type { MockModel } from '../mock/useMockState'
import { ActivityCard } from '../components/Activity'
import { Botanical, Empty, Heading, Icon, Tabs, Tag } from '../components/ui'
import { GameArt } from '../components/GameArt'

const filters = ['All evenings', 'Learn & Play', 'Special Game Night', 'Seasonal gathering']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function Home({
  model,
  open,
  membership,
}: {
  model: MockModel
  open: (id: string) => void
  membership: () => void
}) {
  const [view, setView] = useState('Upcoming')
  const [month, setMonth] = useState(9)
  const [filter, setFilter] = useState('All evenings')
  const events = model.items.filter(row => (
    row.kind === 'official' && (filter === 'All evenings' || filter === row.category)
  ))
  const shown = events.filter(row => new Date(row.date + 'T12:00:00').getMonth() === month)
  const monthLabel = new Date(2026, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return (
    <>
      <Heading
        eyebrow="YOUR LOCAL GAMING COMMUNITY"
        title={model.member ? 'Good games. Even better company.' : 'There’s always room for one more.'}
      >
        Pull up a chair. Find your people. Make a little room for play.
      </Heading>
      <section className={styles['home-hero']}>
        <div className={styles['hero-copy']}>
          <span className="eyebrow">OCTOBER AT THE CROWDED TABLE</span>
          <h2 data-heading="hero">A small table.<br/>A world of connection.</h2>
          <p>
            New games, familiar smiles, and friends you haven’t met yet. Your next good evening
            starts here.
          </p>
          <Button appearance="primary" className="button" onClick={() => open('azul')}>
            Find your next game night <Icon name="arrow" size={18}/>
          </Button>
          <div className={styles['hero-note']}>
            <span className={styles['avatar-stack']}><span>LM</span><span>CR</span><span>VG</span></span>
            <span>Good people. A growing community.</span>
          </div>
        </div>
        <div className={styles['hero-scene']}>
          <GameArt type="azul"/>
          <div className={styles['hero-art-card']}>
            <Icon name="dice" size={25}/>
            <span>
              TUESDAY, OCTOBER 6
              <strong>Learn & Play: Azul</strong>
              <small>Never played? Perfect. We’ll teach you.</small>
            </span>
          </div>
          <Botanical/>
        </div>
      </section>
      <div className={styles['rhythm-row']}>
        <div>
          <span className="round-icon"><Icon name="dice" size={23}/></span>
          <div>
            <span className="eyebrow">TUESDAYS</span>
            <h3>Learn something new.</h3>
            <p>One featured game. All experience levels.</p>
          </div>
          <span className={styles['rhythm-time']}>7:30 – 10:30 PM</span>
        </div>
        <div>
          <span className="round-icon peach"><Icon name="star" size={23}/></span>
          <div>
            <span className="eyebrow">THURSDAYS</span>
            <h3>Expect a little different.</h3>
            <p>RPGs, social games, and themed evenings.</p>
          </div>
          <span className={styles['rhythm-time']}>7:30 – 10:30 PM</span>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">A REASON TO GET TOGETHER</span>
          <h2>Upcoming at our table</h2>
        </div>
        <Tabs items={['Upcoming', 'Calendar']} value={view} onChange={setView}/>
      </div>
      <div className={styles['filter-row']}>
        <FilterChipGroup label="Filter events by category">
          {filters.map(name => (
            <FilterChip
              key={name}
              selected={filter === name}
              onClick={() => setFilter(name)}
            >
              {name}
            </FilterChip>
          ))}
        </FilterChipGroup>
        <span className="meta">All times in Tegucigalpa</span>
      </div>
      {view === 'Upcoming' ? (
        <div className="card-grid">
          {events.map(item => (
            <ActivityCard
              key={item.id}
              item={item}
              status={model.seats[item.id]}
              onOpen={() => open(item.id)}
            />
          ))}
        </div>
      ) : (
        <section className={styles['calendar-panel']}>
          <div className={styles['calendar-heading']}>
            <Button
              appearance="unstyled"
              className="icon-button"
              aria-label="Previous month"
              onClick={() => setMonth(current => Math.max(0, current - 1))}
              disabled={month === 0}
            >
              <span className={styles['rotate']}><Icon name="chevron"/></span>
            </Button>
            <h3>{monthLabel}</h3>
            <Button
              appearance="unstyled"
              className="icon-button"
              aria-label="Next month"
              onClick={() => setMonth(current => Math.min(11, current + 1))}
              disabled={month === 11}
            >
              <Icon name="chevron"/>
            </Button>
          </div>
          <div className={styles['calendar-grid']}>
            {weekdays.map(day => <div className={styles['weekday']} key={day}>{day}</div>)}
            {Array.from({ length: new Date(2026, month, 1).getDay() }, (_, index) => (
              <div key={`blank${index}`} className={`${styles['calendar-day']} ${styles.blank}`}/>
            ))}
            {Array.from({ length: new Date(2026, month + 1, 0).getDate() }, (_, index) => (
              <div className={styles['calendar-day']} key={index}>
                <span>{index + 1}</span>
                {shown.filter(row => new Date(row.date + 'T12:00:00').getDate() === index + 1).map(row => (
                  <Button
                    appearance="unstyled"
                    key={row.id}
                    className={`${styles['calendar-event']} ${row.special ? 'lavender' : row.category === 'Learn & Play' ? 'sage' : 'peach'}`}
                    onClick={() => open(row.id)}
                  >
                    <b>{row.title}</b>
                    <small>{formatTime(row.time)}</small>
                  </Button>
                ))}
              </div>
            ))}
          </div>
          {shown.length === 0 && (
            <Empty title="A little space for what’s next">
              Our {new Date(2026, month).toLocaleDateString('en-US', { month: 'long' })} evenings
              haven’t been announced. Browse October for our current gatherings.
            </Empty>
          )}
        </section>
      )}
      <div className={styles.featuredActivity}>
        <FeaturedActivityCard
          tag={<Tag tone="peach">SOMETHING SPECIAL</Tag>}
          heading="An evening with a twist."
          description="Costumes, curious clues, and a table full of suspects."
          date={formatDate('2026-10-31')}
          specialCallouts="Separate ticket required"
          actionLabel="Discover our Halloween gathering"
          onOpen={() => open('halloween')}
          image={<GameArt type="mystery"/>}
        />
      </div>
      {!model.member && (
        <div className={styles.promotion}>
          <PromotionalBanner
            icon={<Icon name="leaf" size={32}/>}
            heading="More tables. More friends."
            description="Unlock member-hosted games, our private community, and more for L300/month."
            action={<Button appearance="primary" onClick={membership}>Become a Member</Button>}
          />
        </div>
      )}
    </>
  )
}
